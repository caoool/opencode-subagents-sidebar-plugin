export type PopoverAnchor = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type PopoverBounds = {
    width: number;
    height: number;
};
export type PopoverPlacement = {
    left: number;
    top: number;
    width: number;
    height: number;
};
/**
 * Positions a root-level popover against one edge of its anchor. Sidebar cards
 * prefer horizontal attachment so cards near the bottom can shift the popover
 * upward without losing contact with the card.
 */
export declare function placePopover(anchor: PopoverAnchor, terminal: PopoverBounds, requestedSize: PopoverBounds): PopoverPlacement;
//# sourceMappingURL=popover.d.ts.map