import assert from "node:assert/strict"
import test from "node:test"

import {
  canOpenTaskSession,
  isVisibleTask,
  latestAssistantText,
  resolveTaskModel,
  taskDescription,
  taskModeLabel,
  taskModelLabel,
  taskStatusLabel,
  taskVariantLabel,
} from "../dist/tasks.js"

const sessionStatus = new Map()
const statusFor = (sessionID) => sessionStatus.get(sessionID)

function task(state, metadata) {
  return {
    type: "tool",
    tool: "task",
    callID: "task-1",
    state: { input: {}, metadata, ...state },
  }
}

test("tracks tasks through empty, spawned, running, background completion, and removal", () => {
  assert.equal([].filter((part) => isVisibleTask(part, statusFor)).length, 0)

  const spawned = task({ status: "pending", raw: "" }, { sessionId: "child" })
  assert.equal(isVisibleTask(spawned, statusFor), true)

  const running = task({ status: "running", time: { start: 1 } }, { sessionId: "child" })
  assert.equal(isVisibleTask(running, statusFor), true)

  sessionStatus.set("child", { type: "busy" })
  const completedInBackground = task(
    { status: "completed", output: "", title: "", time: { start: 1, end: 2 } },
    { sessionId: "child", background: true },
  )
  assert.equal(isVisibleTask(completedInBackground, statusFor), true)

  sessionStatus.delete("child")
  assert.equal(isVisibleTask(completedInBackground, statusFor), false)
  sessionStatus.set("child", { type: "busy" })

  const completedInForeground = task(
    { status: "completed", output: "", title: "", time: { start: 1, end: 2 } },
    { sessionId: "child" },
  )
  assert.equal(isVisibleTask(completedInForeground, statusFor), false)

  sessionStatus.set("child", { type: "idle" })
  assert.equal(isVisibleTask(completedInBackground, statusFor), false)
  assert.equal([].filter((part) => isVisibleTask(part, statusFor)).length, 0)
})

test("uses a normalized assigned task description before the legacy title", () => {
  assert.equal(
    taskDescription(task({ status: "running", input: { description: "  Investigate\n\n*the failure*  " }, title: "Legacy" })),
    "Investigate the failure",
  )
  assert.equal(taskDescription(task({ status: "running", input: {}, title: "## Legacy\ntask" })), "Legacy task")
  assert.equal(taskDescription(task({ status: "pending", input: {}, raw: "" })), "Working")
})

test("uses the newest visible assistant text response as a collapsed display line", () => {
  const messages = [
    { id: "assistant-old", role: "assistant" },
    { id: "assistant-empty", role: "assistant" },
    { id: "assistant-new", role: "assistant" },
    { id: "user-new", role: "user" },
  ]
  const parts = new Map([
    ["assistant-old", [{ type: "text", text: "Old response" }]],
    [
      "assistant-empty",
      [
        { type: "reasoning", text: "private reasoning" },
        { type: "text", text: "ignored response", ignored: true },
        { type: "text", text: " \n " },
      ],
    ],
    [
      "assistant-new",
      [
        { type: "text", text: "\nNewest\tresponse  " },
        { type: "reasoning", text: "reasoning is not a reply" },
        { type: "tool", tool: "read" },
        { type: "text", text: "ignored", ignored: true },
        { type: "text", text: "continues" },
      ],
    ],
    ["user-new", [{ type: "text", text: "User text must not win" }]],
  ])

  assert.equal(latestAssistantText(messages, (messageID) => parts.get(messageID) ?? []), "Newest response continues")
  assert.equal(latestAssistantText(messages.slice(0, 2), (messageID) => parts.get(messageID) ?? []), "Old response")
  assert.equal(latestAssistantText([{ id: "assistant", role: "assistant" }], () => [{ type: "text", text: "", ignored: true }]), undefined)
})

test("resolves child model variants before messages and leaves only metadata variants pending", () => {
  const part = task(
    { status: "running", input: {}, metadata: { model: { providerID: "startup", modelID: "startup-model", variant: "guessed" } } },
    undefined,
  )
  const messages = [
    { role: "user", model: { providerID: "message", modelID: "old", variant: "medium" } },
    { role: "assistant", providerID: "message", modelID: "new", variant: "high" },
  ]
  assert.deepEqual(
    resolveTaskModel(part, { model: { providerID: "child", id: "child-model", variant: "low" } }, messages),
    { providerID: "child", modelID: "child-model", variant: "low" },
  )
  assert.deepEqual(resolveTaskModel(part, undefined, messages), { providerID: "message", modelID: "new", variant: "high" })
  assert.deepEqual(resolveTaskModel(part, undefined, []), { providerID: "startup", modelID: "startup-model" })
  assert.deepEqual(
    resolveTaskModel(part, { model: { providerID: "child", id: "child-model" } }, messages),
    { providerID: "child", modelID: "child-model", variant: "default" },
  )
  assert.deepEqual(
    resolveTaskModel(part, undefined, [{ role: "assistant", providerID: "message", modelID: "new" }]),
    { providerID: "message", modelID: "new", variant: "default" },
  )
  assert.deepEqual(
    resolveTaskModel(part, undefined, [{ role: "user", model: { providerID: "message", modelID: "new" } }]),
    { providerID: "message", modelID: "new", variant: "default" },
  )
  assert.equal(taskModelLabel({ providerID: "child", modelID: "child-model", variant: "low" }, "GPT-5.6 Luna"), "GPT-5.6 Luna")
  assert.equal(taskVariantLabel({ providerID: "child", modelID: "child-model", variant: "low" }), "low")
  assert.equal(taskVariantLabel({ providerID: "startup", modelID: "startup-model" }), undefined)
  assert.equal(taskModelLabel(undefined), "starting…")
})

test("provides textual statuses, modes, and safe session action availability", () => {
  assert.equal(taskStatusLabel(task({ status: "pending", input: {}, raw: "" })), "Pending")
  assert.equal(taskStatusLabel(task({ status: "running", input: {}, time: { start: 1 } })), "Running")
  assert.equal(
    taskStatusLabel(task({ status: "completed", input: {}, output: "", title: "", time: { start: 1, end: 2 } }), { type: "busy" }),
    "Running",
  )
  assert.equal(taskModeLabel(task({ status: "running", input: {}, time: { start: 1 } }, { background: true })), "Background")
  const foreground = task({
    status: "running",
    input: {},
    time: { start: 1 },
  })
  assert.equal(taskModeLabel(foreground), "Foreground")
  assert.equal(canOpenTaskSession(undefined, "parent"), false)
  assert.equal(canOpenTaskSession("child", "child"), false)
  assert.equal(canOpenTaskSession("child", "parent"), true)
})
