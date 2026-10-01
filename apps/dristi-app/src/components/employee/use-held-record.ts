"use client";

import * as React from "react";

/**
 * The record an overlay is showing — and which opening of the overlay this is.
 *
 * Two answers, because they are one question. A court-side overlay is driven by the
 * record the screen hands it, and that record is cleared the moment the act completes:
 *
 * 1. **Held.** The panel is still on screen for the length of its exit animation, and a
 *    dialog whose content went `null` a frame before it left flashes empty on the way
 *    out. The last record stays until a new one replaces it.
 * 2. **Opening.** Radix stops *rendering* a closed dialog, but the React subtree keeps
 *    its state, so an overlay closed on its signature stage would come back on the
 *    signature stage. Counting the openings gives the body a `key`, and mounting is what
 *    resets a stage, a typed field and a half-chosen signature method — the same thing a
 *    fresh window does, without three separate effects doing it by hand.
 *
 * Both are adjusted during render, which is React's documented way to react to a changed
 * prop: the new record must never be painted for a frame wearing the last one's stage.
 */
export function useHeldRecord<T>(record: T | null): {
  held: T | null;
  opening: number;
} {
  const [held, setHeld] = React.useState(record);
  if (record !== null && record !== held) setHeld(record);

  const open = record !== null;
  const [wasOpen, setWasOpen] = React.useState(open);
  const [opening, setOpening] = React.useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    /* Counted on the way in only. Closing keeps the key it had, so the stage the reader
       left is the stage that plays the exit. */
    if (open) setOpening((count) => count + 1);
  }

  return { held: record ?? held, opening };
}
