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

test("build wires cards to the host dialog and session navigation without activity/status glyphs", async () => {
  const tui = await readFile(new URL("../dist/tui.js", import.meta.url), "utf8")

  assert.match(tui, /api\.ui\.dialog\.replace/)
  assert.doesNotMatch(tui, /api\.ui\.Dialog/)
  assert.match(tui, /api\.renderer\.getSelection\(\)\?\.getSelectedText\(\)/)
  assert.match(tui, /api\.route\.navigate\("session", \{\s*sessionID\s*\}\)/)
  assert.match(tui, /api\.ui\.dialog\.clear\(\)/)
  assert.match(tui, /"justifyContent", "flex-end"/)
  assert.match(tui, /"maxWidth", 28/)
  assert.match(tui, /taskVariantLabel/)
  assert.match(tui, /· pending/)
  assert.match(tui, /const allTaskParts = createMemo/)
  assert.match(tui, /new Map\(allTaskParts\(\)\.map/)
  assert.match(tui, /const taskCallIDs = createMemo\(\(\) => visibleTaskParts\(\)/)
  assert.match(tui, /const popupSessionID = createMemo/)
  assert.match(tui, /const closePopup =/)
  assert.doesNotMatch(tui, /name\} · \$\{model\.variant\}/)
  assert.doesNotMatch(tui, /activityForPart|latestActivity|multi_tool_use/)
  assert.doesNotMatch(tui, /state\.status === "pending" \? "…" : "●"/)
})
