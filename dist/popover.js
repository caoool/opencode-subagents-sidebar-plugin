function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

/**
 * Positions a root-level popover against one edge of its anchor. Sidebar cards
 * prefer horizontal attachment so cards near the bottom can shift the popover
 * upward without losing contact with the card.
 */
export function placePopover(anchor, terminal, requestedSize) {
  const viewportWidth = Math.max(0, terminal.width);
  const viewportHeight = Math.max(0, terminal.height);
  const width = Math.min(Math.max(1, requestedSize.width), viewportWidth);
  const height = Math.min(Math.max(1, requestedSize.height), viewportHeight);
  const maxLeft = Math.max(0, viewportWidth - width);
  const maxTop = Math.max(0, viewportHeight - height);
  const sideTop = clamp(anchor.y, 0, maxTop);
  const left = anchor.x - width;
  if (left >= 0 && left <= maxLeft) return {
    left,
    top: sideTop,
    width,
    height
  };
  const right = anchor.x + anchor.width;
  if (right >= 0 && right + width <= viewportWidth) return {
    left: right,
    top: sideTop,
    width,
    height
  };
  const verticalLeft = clamp(anchor.x, 0, maxLeft);
  const below = anchor.y + anchor.height;
  if (below >= 0 && below + height <= viewportHeight) return {
    left: verticalLeft,
    top: below,
    width,
    height
  };
  const above = anchor.y - height;
  if (above >= 0 && above <= maxTop) return {
    left: verticalLeft,
    top: above,
    width,
    height
  };

  // Extremely small viewports cannot preserve attachment without covering the
  // anchor. Keep the requested box fully visible and bias toward below.
  return {
    left: verticalLeft,
    top: clamp(below, 0, maxTop),
    width,
    height
  };
}
//# sourceMappingURL=popover.js.map