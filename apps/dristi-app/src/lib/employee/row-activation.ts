import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Making a whole queue row open the thing it names.
 *
 * Every court-side list is the same shape: a row of facts with one opener in it — the
 * application number, the cause title — and everything else inert. The row highlights
 * under the pointer, so it *looks* like the target, but only the opener answered a click.
 * An officer aiming at a row and landing two columns to the right got nothing, which is
 * the defect this fixes.
 *
 * **The opener stays a real control.** It keeps the accessible name ("Review
 * KL-ADV-000118-2026"), the tab stop and the Enter key; the row is a pointer shortcut on
 * top of it, not a replacement for it. Nothing here makes the `<tr>` focusable — that
 * would put two tab stops on every row and give the outer one no name to announce.
 * Instead the row click finds the opener and presses it, so the two paths can never
 * describe different behaviour: there is one handler, on one control, and the row borrows
 * it.
 *
 * Sixteen tables and their stacked item lists share this rather than sixteen copies of a
 * `closest()` guard — two of which had already been hand-copied and were missing the
 * text-selection case.
 *
 * It lives in `lib/employee` rather than beside the tables so the *decision* —
 * `shouldActivateRow` — is a plain function this repo's test runner can reach. What is
 * left in the DOM layer below is only the two lookups that feed it.
 *
 * The DS `TableRow` needs no change to carry this: it spreads `React.ComponentProps<"tr">`,
 * so `onClick` and `className` arrive intact. No local override, nothing to send upstream.
 */

/**
 * Controls that own their own click. A press that starts inside one of these is that
 * control's press, not the row's — the checkbox on a signing queue is the case this
 * matters most for, since selecting fifteen orders must not open fifteen overlays.
 *
 * `label` is here because a label forwards its click to the control it names, and the
 * `role` entries because Radix renders its checkbox and its menu triggers as divs with a
 * role rather than as native elements. Anything added to a row that answers a click has
 * to be named here, which is why the list is a tested constant and not a literal buried
 * in a handler.
 */
export const ROW_INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="checkbox"], [role="button"], [role="menuitem"], [role="radio"], [role="switch"], [contenteditable="true"]';

/** What a row click delegates to. One per row; the first one wins. */
export const ROW_OPENER_SELECTOR = "[data-row-opener]";

/**
 * Whether a click that landed on a row should open it.
 *
 * Three refusals, and each of them is a real click somebody makes:
 *
 * - **Already handled.** Anything that called `preventDefault` has said what the click
 *   meant.
 * - **A control's own click.** Checkbox, link, menu trigger — and the opener itself,
 *   which matters twice over: pressing the opener below dispatches a real click that
 *   bubbles back to the row, and this is what stops that from looping.
 * - **A text selection.** Dragging across a case number is copying it, not opening it,
 *   and an overlay that swallows the selection on mouse-up is the reason people stop
 *   trusting a list. Safe to read at click time because a plain click has already
 *   collapsed any earlier selection by the time `click` fires — only a drag that ends
 *   here still holds one.
 */
export function shouldActivateRow(click: {
  defaultPrevented: boolean;
  /** Whether the click landed inside something from `ROW_INTERACTIVE_SELECTOR`. */
  insideControl: boolean;
  /** Text the reader has selected right now, if any. */
  selection: string;
}): boolean {
  if (click.defaultPrevented) return false;
  if (click.insideControl) return false;
  if (click.selection.trim() !== "") return false;
  return true;
}

/**
 * Marks the control the row hands its clicks to. Spread onto the opener that is already
 * there — it adds no behaviour of its own, it only makes the opener findable.
 */
export const rowOpener = { "data-row-opener": "" } as const;

/**
 * The opener's own look, shared so fourteen columns cannot drift apart.
 *
 * `group-hover/row:underline` rather than `hover:underline` is the whole point of the
 * change: the underline used to appear only under the pointer, which taught officers that
 * the underline *was* the target and everything else was dead. Now it arrives whenever
 * the row is hovered, wherever the pointer sits — it says "this row opens that", which is
 * true, instead of "click exactly here", which no longer is. It stays rather than being
 * deleted because the row tint alone says a row is live without saying *what* it opens;
 * on a five-column row that is the difference between a target and a guess. On focus it
 * still underlines on its own, since a keyboard user never hovers the row.
 *
 * `min-h-10` keeps the 40×40 target of ACCESSIBILITY §8 on a cell whose text is one line.
 */
export const rowOpenerClass =
  "min-h-10 w-full cursor-pointer rounded-sm p-0 text-left text-body-compact font-medium text-foreground underline-offset-4 outline-none group-hover/row:underline focus-visible:underline focus-visible:ring-3 focus-visible:ring-focus-ring";

/**
 * Everything a clickable row needs: the pointer, the hover group the opener's underline
 * hangs off, and the guarded handler.
 *
 * Spread it onto the `<tr>` or the `<li>`; pass any row classes of your own through the
 * argument so they land in the same `cn`.
 *
 *     <TableRow key={row.id} {...rowActivation("bg-card")}>
 *
 * Rows with nothing to open simply do not call it — no cursor, no handler, no promise the
 * row cannot keep.
 */
export function rowActivation(className?: string) {
  return {
    className: cn("group/row cursor-pointer", className),
    onClick: activateRow,
  };
}

/** The two DOM lookups `shouldActivateRow` needs, then the delegation itself. */
function activateRow(event: React.MouseEvent<HTMLElement>) {
  const target = event.target as HTMLElement | null;
  const allowed = shouldActivateRow({
    defaultPrevented: event.defaultPrevented,
    insideControl: Boolean(target?.closest(ROW_INTERACTIVE_SELECTOR)),
    selection: window.getSelection()?.toString() ?? "",
  });
  if (!allowed) return;

  event.currentTarget
    .querySelector<HTMLElement>(ROW_OPENER_SELECTOR)
    ?.click();
}
