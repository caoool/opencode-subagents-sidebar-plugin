import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("builds TUI JSX with the Solid universal transform", async () => {
  const tui = await readFile(new URL("../dist/tui.js", import.meta.url), "utf8")

  assert.doesNotMatch(tui, /@opentui\/solid\/jsx-runtime/)
  assert.doesNotMatch(tui, /\b_jsx(?:s)?\(/)
  assert.match(tui, /from "@opentui\/solid"/)
  assert.match(tui, /\b(?:createComponent|insert)\(/)
})
