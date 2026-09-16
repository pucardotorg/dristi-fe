# Bulk reschedule — the hearing-dates range picker
Updated: 2026-09-16
Status: verified

Sibling records on the same screen: [the hearing-dates range picker](./bulk-reschedule-range-picker.md) (the filter row), [the act overlay](./bulk-reschedule-act-overlay.md) and [the Scheduled record](./bulk-reschedule-scheduled-record.md).

## Current outcome

**The prototype's board now covers every sitting day.** Today's cause list, then two or
three matters on each of the next forty sittings — 115 listings across 41 days — so a range
drawn anywhere in the next eight weeks lands on something. **Nothing is listed on a
Saturday or a Sunday**, and the overlay's calendar will not offer one as a new hearing
date.

**The screen opens on today, and cannot be emptied below it.** The range field arrives
reading the day the court is standing on — "16 Sept 2026" on the 16th — and the board shows
that day's listings only (23, the same number the rail's *Today's hearings* badge carries).
The field's `×` is **absent at rest**: it appears only once a span has been drawn away from
today, and it is labelled for what it does — *Back to 16 Sept 2026*. The two tabs are
**All hearings** and **Recently scheduled**.

The **Hearing dates** picker holds a *draft* span and applies
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
2026-09-16 | **Dummy listings on every sitting day** (*"cases for all dates"*), two or three per day where the hand-written fixtures do not reach, drawn deterministically so the board is the same twice and can be pointed at. | owner | implemented
2026-09-16 | **A day the court is closed carries nothing, and the new-date calendar refuses to offer one.** The owner's instruction named Sunday; this closes **Saturday as well**, on the product's own evidence rather than an assumption — `nextSittingDay` in `order-demo.ts` has rolled an order's next listing off `[0, 6]` since before this screen existed, so listing matters on a Saturday here would have put the board at odds with every order the same court issues. The rule now lives once, as `isSittingDay` in `lib/employee/hearings.ts`. **One line reverses it** if Saturdays are meant to sit. | owner (Sunday), coordinator extended to Saturday and disclosed | implemented
2026-09-16 | **`UPCOMING`'s offsets are sitting days, not calendar days.** As calendar days, an offset of 5 from a Monday was a Saturday — so that fixture vanished under the rule above, and *which* fixtures vanished changed with the weekday the screen was opened. A board whose contents depend on when you look at it cannot be tested or pointed at. | coordinator | implemented
2026-09-16 | **Court holidays are not modelled** — Onam, a declared bandh, a day the Chief Justice closes. A prototype that invented them would be asserting a calendar nobody has given it. | coordinator | open
2026-09-16 | **The board opens on today, and only today** (*"if today is the 16th, then I will see the 16th"*). This reverses 2026-09-13, and the reversal is safe because the reason for that change is gone: writing today into both ends used to make the control read as already answered — the calendar opened with a day lit and the next click was taken as the far end of a span starting there, so a different single day could not be asked for. That was a defect in what a click meant, fixed earlier today in `nextRangeFromPick` (a finished span is finished). Measured on the render: with 16 Sept applied, clicking the 20th gives *20 Sept 2026*, not *16 – 20 Sept*. | owner | implemented
2026-09-16 | **The tabs are renamed: *Unscheduled* → *All cases*, *Scheduled* → *Recently scheduled***. Nothing on the left tab was ever unscheduled — every matter there is listed on the day being shown, and what makes it the working list is that none of it has been moved yet. | owner | implemented
2026-09-16 | **Today cannot be crossed out** (*"they cannot cross that out, they can only cross it out when they do date range selection"*). The court's own day is where the board starts, not a filter the bench applied, so the field's `×` only appears once the applied span differs from it and returns to it rather than emptying the field. *Clear filters* in the empty state means the same thing. | owner | implemented
2026-09-16 | **The left tab is *All hearings*, not *Today's hearings***. The owner suggested the latter; it is wrong twice. The rail already owns that phrase for a different screen, and the label would be false the moment the range is anything but today — the field above already says which days these are, so the tab does not have to. *All cases* was wrong for a related reason: the rail owns that phrase too, and what the tab counts is hearings, not cases (two listings can belong to one case, which is why the signing card states both). | owner asked, coordinator recommended against and explained | implemented
2026-09-16 | ~~Clearing is not reopening~~ — superseded the same day by the row above. | coordinator | superseded The screen opens on today; the field's `×` and *Clear filters* asked for no filter at all, which was the whole board. | coordinator | superseded
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

Verified after the floor (2026-09-16): on arrival the field reads "16 Sept 2026" with no
`×` offered; applying 17–23 Sept offers one labelled *Back to 16 Sept 2026*; pressing it
returns to today, 23 rows, and the `×` disappears; a single day that is not today still
offers it; picking today explicitly offers nothing to give back.

Verified after the fixture change (2026-09-16): the whole board is 115 rows across 41
days; no listed day falls on a weekend (18 Sept is followed by 21 Sept); a 17–23 Sept range
shows 14 rows on the five sitting days inside it; the overlay offered 17 days in its first
month with no weekend among them. Four new tests cover the rule, the coverage, the
determinism and unique case numbers.

Re-verified after the today default (2026-09-16): field reads "16 Sept 2026" on arrival
with 23 rows all listed that day; one click on the 20th draws *20 Sept 2026* rather than a
span from today; a second on the 25th closes it to 20 – 25 and Apply narrows to 6 rows; the
`×` gives back the whole 44-row board and the field reads *Select date range*; finishing an
act returns the field to today with *Recently scheduled* active.

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
