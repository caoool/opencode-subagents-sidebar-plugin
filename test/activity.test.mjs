import assert from "node:assert/strict"
import test from "node:test"

import { activityForPart, elapsedLabel, normalizeMeaningful } from "../dist/activity.js"

test("normalizes hard newlines in fallback task descriptions", () => {
  assert.equal(normalizeMeaningful("  Investigate\n\n*the failure*  "), "Investigate the failure")
})

test("uses meaningful newest activity labels for supported parts", () => {
  assert.equal(activityForPart({ type: "text", text: "## Reading\nlogs" }), "Reading logs")
  assert.equal(activityForPart({ type: "subtask", description: "Check\nconfig" }), "Delegating · Check config")
  assert.equal(
    activityForPart({ type: "tool", tool: "multi_tool_use.web_search", state: { status: "pending" } }),
    "Web Search…",
  )
})

test("formats bounded elapsed-time labels", () => {
  assert.equal(elapsedLabel(-1), "0s")
  assert.equal(elapsedLabel(3_661_000), "1h 1m")
  assert.equal(elapsedLabel(172_800_000), "2d 0h")
})
