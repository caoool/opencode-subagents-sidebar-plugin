import assert from "node:assert/strict"
import test from "node:test"

import { placePopover } from "../dist/popover.js"

test("prefers immediate left attachment with the card top aligned", () => {
  assert.deepEqual(
    placePopover({ x: 70, y: 3, width: 20, height: 2 }, { width: 100, height: 40 }, { width: 30, height: 10 }),
    { left: 40, top: 3, width: 30, height: 10 },
  )
})

test("uses immediate right attachment only when the left side cannot fit", () => {
  assert.deepEqual(
    placePopover({ x: 10, y: 3, width: 20, height: 2 }, { width: 100, height: 40 }, { width: 30, height: 10 }),
    { left: 30, top: 3, width: 30, height: 10 },
  )
})

test("shifts bottom-card popovers upward while retaining side contact", () => {
  assert.deepEqual(
    placePopover({ x: 70, y: 35, width: 20, height: 2 }, { width: 100, height: 40 }, { width: 30, height: 10 }),
    { left: 40, top: 30, width: 30, height: 10 },
  )
})

test("falls below and then above only when neither side can fit", () => {
  assert.deepEqual(
    placePopover({ x: 10, y: 3, width: 30, height: 2 }, { width: 50, height: 40 }, { width: 20, height: 10 }),
    { left: 10, top: 5, width: 20, height: 10 },
  )
  assert.deepEqual(
    placePopover({ x: 10, y: 31, width: 30, height: 2 }, { width: 50, height: 40 }, { width: 20, height: 10 }),
    { left: 10, top: 21, width: 20, height: 10 },
  )
})

test("clamps oversized popovers to the terminal viewport", () => {
  assert.deepEqual(
    placePopover({ x: 4, y: 4, width: 2, height: 2 }, { width: 20, height: 8 }, { width: 30, height: 10 }),
    { left: 0, top: 0, width: 20, height: 8 },
  )
})

test("keeps the fallback fully bounded when an anchor is outside the viewport", () => {
  assert.deepEqual(
    placePopover({ x: 120, y: -4, width: 20, height: 2 }, { width: 100, height: 40 }, { width: 30, height: 10 }),
    { left: 70, top: 0, width: 30, height: 10 },
  )
})
