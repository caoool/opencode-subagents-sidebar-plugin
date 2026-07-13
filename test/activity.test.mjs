import assert from "node:assert/strict"
import test from "node:test"

import { elapsedLabel } from "../dist/activity.js"

test("formats bounded elapsed-time labels", () => {
  assert.equal(elapsedLabel(-1), "0s")
  assert.equal(elapsedLabel(3_661_000), "1h 1m")
  assert.equal(elapsedLabel(172_800_000), "2d 0h")
})
