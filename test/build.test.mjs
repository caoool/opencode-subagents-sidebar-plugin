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

test("build wires cards to a root Portal popover and session navigation without activity/status glyphs", async () => {
  const tui = await readFile(new URL("../dist/tui.js", import.meta.url), "utf8")

  assert.match(tui, /Portal/)
  assert.match(tui, /api\.renderer\.root/)
  assert.match(tui, /wrapper\.position = "absolute"/)
  assert.match(tui, /wrapper\.zIndex = POPOVER_Z_INDEX/)
  assert.match(tui, /wrapper\.focusable = false/)
  assert.match(tui, /"live", true/)
  assert.match(tui, /"renderBefore"/)
  assert.doesNotMatch(tui, /api\.ui\.dialog\.(?:replace|clear|setSize)\s*\(/)
  assert.doesNotMatch(tui, /api\.ui\.Dialog/)
  assert.match(tui, /api\.ui\.dialog\.open/)
  assert.match(tui, /useTerminalDimensions/)
  assert.match(tui, /api\.renderer\.setFrameCallback\(dismissForHostDialogFrame\)/)
  assert.match(tui, /api\.renderer\.removeFrameCallback\(dismissForHostDialogFrame\)/)
  assert.doesNotMatch(tui, /api\.renderer\.(?:on|off)\s*\(/)
  assert.match(tui, /api\.renderer\.getSelection\(\)\?\.getSelectedText\(\)/)
  assert.match(tui, /api\.route\.navigate\("session", \{\s*sessionID\s*\}\)/)
  assert.match(tui, /"maxWidth", 28/)
  assert.match(tui, /taskVariantLabel/)
  assert.match(tui, /· pending/)
  assert.match(tui, /const allTaskParts = createMemo/)
  assert.match(tui, /new Map\(allTaskParts\(\)\.map/)
  assert.match(tui, /const taskCallIDs = createMemo\(\(\) => visibleTaskParts\(\)/)
  assert.match(tui, /const popupSessionID = createMemo/)
  assert.match(tui, /const closePopup =/)
  assert.match(tui, /const showPopup =[\s\S]*?setOpenPopup\(ownership\)/)
  assert.match(tui, /latestAssistantText/)
  assert.match(tui, /hydrateChildMessages/)
  assert.match(tui, /client\.session\.messages/)
  assert.match(tui, /lifecycle\.signal\.aborted/)
  assert.match(tui, /ownsHydration/)
  assert.doesNotMatch(tui, /name\} · \$\{model\.variant\}/)
  assert.doesNotMatch(tui, /activityForPart|latestActivity|multi_tool_use/)
  assert.doesNotMatch(tui, /state\.status === "pending" \? "…" : "●"/)
})

test("source positions the Portal wrapper while the bordered child fills it", async () => {
  const source = await readFile(new URL("../src/tui.tsx", import.meta.url), "utf8")

  assert.match(
    source,
    /wrapper\.position = "absolute"\s+wrapper\.left = next\.left\s+wrapper\.top = next\.top\s+wrapper\.width = next\.width\s+wrapper\.height = next\.height\s+wrapper\.zIndex = POPOVER_Z_INDEX/,
  )
  assert.match(source, /createEffect\(\(\) => applyPortalPlacement\(placement\(\)\)\)/)
  assert.match(source, /<Portal[\s\S]*?ref=\{\(element\) => \{[\s\S]*?portalWrapper = element as BoxRenderable/)
  assert.match(
    source,
    /<box\s+width="100%"\s+height="100%"\s+focusable=\{false\}\s+live\s+border\s+borderColor=\{props\.api\.theme\.current\.borderActive\}\s+backgroundColor=\{props\.api\.theme\.current\.backgroundPanel\}/,
  )
})

test("elapsed rail explicitly combines row direction with right justification", async () => {
  const source = await readFile(new URL("../src/tui.tsx", import.meta.url), "utf8")

  assert.match(
    source,
    /<box width=\{8\} flexShrink=\{0\} flexDirection="row" justifyContent="flex-end">/,
  )
})

test("card geometry tracking is frame-based, change-only, and preserves the owned rect on unmount", async () => {
  const source = await readFile(new URL("../src/tui.tsx", import.meta.url), "utf8")

  assert.match(source, /renderBefore=\{updateAnchor\}/)
  assert.match(
    source,
    /lastAnchor\.x === current\.x[\s\S]*?lastAnchor\.y === current\.y[\s\S]*?lastAnchor\.width === current\.width[\s\S]*?lastAnchor\.height === current\.height/,
  )
  const cleanup = source.match(/onCleanup\(\(\) => \{\s*\/\/ The popover owns its last reported rect[\s\S]*?\n  \}\)/)
  assert.ok(cleanup)
  assert.doesNotMatch(cleanup[0], /updatePopupAnchor|setOpenPopup/)
})

test("child transcript hydration is ownership-guarded and yields to live state", async () => {
  const source = await readFile(new URL("../src/tui.tsx", import.meta.url), "utf8")

  assert.match(source, /<text fg=\{props\.api\.theme\.current\.textMuted\} wrapMode="none" truncate>\s+Latest: \{responseLabel\(\)\}/)
  assert.match(source, /const ownsHydration = [\s\S]*?lifecycle\.signal\.aborted[\s\S]*?ownership\(\)\.token === token/)
  assert.match(source, /const hydrateChildMessages = async [\s\S]*?client\.session\.messages[\s\S]*?!ownsHydration/)
  assert.match(
    source,
    /const live = liveChildMessages\(\)\s+if \(live\?\.hasParts\) return latestAssistantText[\s\S]*?const hydrated = hydratedChildMessages\(\)/,
  )
  assert.match(source, /hydrated\.token !== ownership\.token \|\| hydrated\.sessionID !== sessionID/)
})
