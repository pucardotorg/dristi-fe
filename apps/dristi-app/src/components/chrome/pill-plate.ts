/**
 * The filter pill — one treatment, owned once.
 *
 * Born on the pending-tasks kind row (`tasks/kind-pills.tsx`, 2026-09-15) and lifted here
 * when the court side's process line took the same row (owner, 2026-10-06: *"align
 * screens to a recurring pattern"*). The court side does not import from the citizen
 * side or the reverse, and `chrome/` is neither side's — the arrangement `table-plate.ts`
 * already made for tables.
 *
 * Written for `ToggleGroupItem`, whose `data-state=on` marks the chosen pill.
 */

/**
 * A pill: 36px of visible shape widened to the 40px touch floor by a transparent ring,
 * the same trick the row verbs use. Chosen wears the brand *tint* by the owner's ruling
 * (2026-09-16), after a neutral fill read as disabled beside the quiet pills and a
 * near-black one read as a button — `brand-muted` is the tint pair, not the rationed
 * `primary`, so a chosen filter says "brand" without impersonating an action.
 */
export const PILL_ITEM =
  "relative rounded-full border border-border px-3 after:absolute after:-inset-0.5 data-[state=on]:border-brand-accent data-[state=on]:bg-brand-muted data-[state=on]:font-semibold data-[state=on]:text-brand-muted-foreground data-[state=on]:hover:bg-brand-muted-hover data-[state=on]:hover:text-brand-muted-foreground";

/** The count inside a pill: quiet at rest, the pill's own ink once chosen. */
export const PILL_COUNT =
  "tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-brand-muted-foreground";

/**
 * The row: one line that scrolls sideways on a phone rather than wrapping into a block.
 * The padding keeps a focus ring off the clipping edge and gives the widened touch target
 * room; the negative margin puts the pills back on the content edge.
 *
 * No scrollbar. A desktop set to always show scrollbars drew a grey track under the row
 * whenever it overflowed, which read as a broken page rather than a row that swipes; the
 * clipped last pill already says there is more, and arrow keys move along the row.
 */
export const PILL_ROW =
  "-m-1 w-full max-w-full flex-nowrap overflow-x-auto p-1 [scrollbar-width:none]";
