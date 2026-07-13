import assert from "node:assert/strict"
import test from "node:test"

import { isVisibleTask } from "../dist/tasks.js"

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
