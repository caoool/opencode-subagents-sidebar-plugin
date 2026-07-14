import assert from "node:assert/strict"
import test from "node:test"

import { activityForPart, elapsedLabel, latestAssistantActivity } from "../dist/activity.js"

test("formats bounded elapsed-time labels", () => {
  assert.equal(elapsedLabel(-1), "0s")
  assert.equal(elapsedLabel(3_661_000), "1h 1m")
  assert.equal(elapsedLabel(172_800_000), "2d 0h")
})

test("formats live assistant reasoning and tool activity as one line", () => {
  assert.equal(activityForPart({ type: "reasoning", text: "**Inspecting\nfiles**" }), "Inspecting files")
  assert.equal(activityForPart({ type: "tool", tool: "read", state: { status: "pending" } }), "Read…")
  assert.equal(
    activityForPart({ type: "tool", tool: "bash", state: { status: "completed", title: " npm test ", output: "", time: { start: 1, end: 2 } } }),
    "Bash · npm test",
  )
  assert.equal(activityForPart({ type: "text", text: "ignored", ignored: true }), undefined)
})

test("uses the newest visible assistant activity and ignores user text", () => {
  const messages = [
    { id: "assistant-old", role: "assistant" },
    { id: "assistant-new", role: "assistant" },
    { id: "user-new", role: "user" },
  ]
  const parts = new Map([
    ["assistant-old", [{ type: "text", text: "Old response" }]],
    ["assistant-new", [{ type: "text", text: "Draft" }, { type: "reasoning", text: "Current\nplan" }]],
    ["user-new", [{ type: "text", text: "User text must not win" }]],
  ])

  assert.equal(latestAssistantActivity(messages, (messageID) => parts.get(messageID) ?? []), "Current plan")
  assert.equal(latestAssistantActivity([{ id: "assistant", role: "assistant" }], () => []), undefined)
})
