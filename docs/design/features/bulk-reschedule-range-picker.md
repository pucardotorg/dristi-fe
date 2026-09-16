# Bulk reschedule — the hearing-dates range picker
Updated: 2026-09-16
Status: verified

Sibling records on the same screen: [the hearing-dates range picker](./bulk-reschedule-range-picker.md) (the filter row), [the act overlay](./bulk-reschedule-act-overlay.md) and [the Scheduled record](./bulk-reschedule-scheduled-record.md).

## Current outcome

The **Hearing dates** picker on Bulk reschedule hearings holds a *draft* span and applies
it on a press. Clicking days draws the span and paints it on the calendar; the board is
not narrowed until the bench presses **Apply** in a footer inside the calendar, which
states the drawn span in the words the rows use ("16 Sept 2026 – 22 Sept 2026") and
dismisses the surface on the press. Escape, an outside click and the trigger abandon the
draft; reopening starts from whatever the board is showing. The field's `×` still clears
the applied span, and the search box beside it still filters as it is typed.

Built in `RangeField`, `apps/dristi-app/src/components/employee/bulk-reschedule-screen.tsx`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-16 | Put a confirmation button inside the date-range picker. Read as *the span does not apply until it is pressed*, not as a button that only closes the surface: a range takes two clicks, and applied as it is drawn the first click narrows the board to a single day and the second widens it back, while closing the span dismissed the calendar in the same motion — so the finished span was never seen. | owner | implemented
2026-09-16 | **Apply**, no **Cancel**. Escape, the trigger and the rest of the page already abandon a draft that costs nothing to abandon. | coordinator | implemented
2026-09-16 | **Apply** is disabled only while the calendar is empty, not while the draft equals the applied span. Gating on *different from the board* is what a Search button does, but this button is also the way out of the surface: reopen on 14–20, click 14, click 20, and the press the footer asks for would be refused for re-drawing what was wanted. | coordinator, after review | implemented
2026-09-16 | The picker's **Apply** does not reopen the question of a Search button on the filter row. The row's Apply was removed on 2026-09-13 as "two acts, a worksheet between them"; this one ends the act the bench opened, on the surface it opened, and exists only while that surface is open. | coordinator | implemented

## Changes and tradeoffs

- **Teal.** A page at rest still paints one strong fill — *Reschedule hearings* in the
  commit bar. The picker's **Apply** is the primary of its own overlay, the reading this
  screen's dialogs already take. Unlike those dialogs the popover has no scrim, so with
  rows ticked two enabled teal fills can be on screen at once; accepted, because the
  popover is the focused layer and its button dies with it.
- **Height ceiling.** The footer put **Apply** at 834px down an 820px viewport — off the
  bottom of a `position: fixed` surface, which no page scroll reaches. `PopoverContent`
  now stops at `--radix-popover-content-available-height`, the calendar scrolls inside it,
  and the footer is `shrink-0`. Known cost: the calendar's month chevrons are positioned
  inside that scroll area, so on a short viewport they scroll out of view with September
  (measured at 375×667: 183px above the visible area at full scroll). Reachable by
  scrolling back; keyboard users cross months with the arrow keys. Not fixable from the
  call site without hand-writing the primitive's internals — see `ds-requests` §19.
- **Rejected:** a footer **Cancel**; gating **Apply** on draft-differs-from-applied;
  showing the draft in the trigger while the popover is open (the trigger says what the
  board is showing, the footer says what is drawn).
- `ds-requests` §19(f) corrected: the surface no longer dismisses on the second click, and
  the new footer is the slot §19(e) asks for, holding an action rather than a **Clear**.

## Verification and open work

Driven on the owner's dev server at
`http://localhost:3000/employee/hearings/bulk-reschedule` with headless Chromium over CDP
(`curl` cannot reach a popover): drawing a span leaves the board at 45 rows; **Apply**
narrows it to 37, closes the surface and returns focus to the trigger; Escape after
redrawing leaves the board on the applied span and reopening shows that span again; the
`×` returns the board to 45 with the calendar untouched. Keyboard: the surface opens on a
day, Enter draws and closes the span, one Tab reaches **Apply**, Enter applies. At 375×820
and 375×667 **Apply** is fully on screen with no horizontal page scroll. Light and dark
both checked. `npm run lint` (five DS gates), 791 tests, and `check:ds-fresh`
(pin e0cadea6b9d4) pass.

Independent `ui-reviewer` pass run 2026-09-16. Required fix applied: the popover is
`role="dialog"` by Radix and carried no accessible name, so it is now
`aria-labelledby` the field's own label and announces as "Hearing dates" (confirmed on the
render).

Open for the owner:

- On the **Scheduled** tab, **Apply** changes only the Unscheduled tab's count; the live
  region on that pane reports the record, so a screen-reader user hears nothing. Whether
  Apply should announce the new Unscheduled count is undecided.
- The commit bar's empty sentence, "Nothing listed in this range.", also fires when no
  range is applied and the board was emptied by the search, where `NothingToMove` says
  "No matters match this search". Pre-existing, adjacent, not addressed here.
- The month chevrons scrolling away on short viewports (above) — pinning them needs a DS
  change to `Calendar`.
