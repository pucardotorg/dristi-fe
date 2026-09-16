# Bulk reschedule — the Scheduled record
Updated: 2026-09-16
Status: verified

Sibling records on the same screen: [the hearing-dates range picker](./bulk-reschedule-range-picker.md)
(the filter row) and [the act overlay](./bulk-reschedule-act-overlay.md) (picking a date,
signing, the receipt).

## Current outcome

The Scheduled tab is **one table** — the board's own table with a **New hearing date**
column added, ordered by the day each matter goes to. It is no longer a stack of tables
under collapsible date headings.

Where a session has moved matters to more than one day, that column's **header is the
filter**: pressing *New hearing date* opens a menu of *All dates* plus each date with its
tally, and choosing one narrows the table to it. **There is no count line and no mark on the
control.** A narrowed table shows itself: every row in the column reads one date, the
control's ink is full rather than muted, the menu shows which item is checked, and
`QueueAnnouncer` speaks "Showing 1–35 of 41". With a single date in the record there is no control
either: the header is plain text.

Below `xl` the table is wider than the panel, so the same filter is offered as a labelled
field above it; below `md` the rows stack as items carrying both dates.

Built in `RescheduledRecord` (`components/employee/bulk-reschedule-screen.tsx`),
`BulkRescheduleTable`'s `newDate` prop, `components/employee/new-date-filter.tsx`, and
`rescheduledDays` in `lib/employee/bulk-reschedule.ts`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-16 | **One table with a New hearing date column**, replacing the per-day stack of tables with collapsible headings. The stack made the *days* the subject and cost the thing a record is for: the bench could not read its own afternoon without opening it a day at a time, and the new date the rows had just been given was in the heading above them rather than in the rows. | owner | implemented
2026-09-16 | **The several dates a session may hold are answered by a filter in that column's header**, not by cutting the table up. | owner | implemented
2026-09-16 | **No tally in the column header** — the owner's own open question. A number beside a column name reads as a row count for the whole table, and would be wrong the moment a filter was applied. The tallies belong **inside the menu**, per date, where they are what decides which date to open. | coordinator recommended, answering the owner's question | implemented
2026-09-16 | **The at-rest count line is gone** ("29 hearings rescheduled to 2 dates" — owner: *"is it helping? I don't think so"*). It restated the tab strip's own total two inches below it and added a number of dates that the column shows and the menu counts. | owner | implemented
2026-09-16 | **And the narrowed one too** ("Showing 35 of 41 — Tuesday, 22 September 2026" — owner: *"don't need this, redundant"*). It had been kept as the one thing admitting rows were held back, since the tab strip still counts the whole record. | owner | implemented
2026-09-16 | **And the 6px dot that replaced it** (owner: *"why do I need the ink dot"*). It was guarding a bench that leaves the tab and returns to a filter it forgot it set — real, but weak twice over: nobody reads a row count against a tab badge, and this record is a receipt with no act on it, so the misreading costs a moment rather than a mistake. Not enough for a permanent mark in the header. What is left is the column reading one date, the control's ink going full, the menu's checked item, and the spoken count. | owner challenged, coordinator could not justify it | implemented
2026-09-16 | The header *is* the trigger, rather than a label with an icon button beside it: a second element either bloats the 40px header strip or falls under the touch floor, and a control beside the column it filters needs a second label saying which column it means. The 40×40 hit area comes through a transparent `after:` inset, the trick the range field's clear already uses. | coordinator | implemented
2026-09-16 | **The header trigger is drawn as a control, not as text with a chevron** — *"it is not prominent that I can do a drop down and see what other days are there"* (owner). It takes the DS `outline` button at `size="sm"`: a white `card` fill and an `input` border on the strip's warm `surface-sunken`, 36px inside a 40px strip. The strip is 12px muted type where nothing else is interactive and no other table header in this product opens anything, so a chevron alone asked the bench to notice a convention that does not exist here. | owner asked how to bring attention; coordinator recommended, owner chose "in the column itself" | implemented
2026-09-16 | **It stays in the column.** Two other placements were put to the owner and refused: a row of date chips under the tab strip (*"it already has 2 tabs in the table container… doesn't go well"* — it reads as a second, nested tab strip) and a labelled control at the far right of the tab row (read as a third tab on sight, which answered the question of whether it would have been). | owner | implemented
2026-09-16 | **32px, not 36px, and the cell gives it 4px either side.** The first pass put a `sm` button in a strip whose 40px leaves 16px for text, so it had 2px of air and read as wedged in (owner: *"looks off and there is no top or bottom padding"*). `xs` is the DS's own 32px step for compact chrome, and `py-1` on the cell makes 4 + 32 + 4 exactly the 40px strip every other court-side table draws — so this table does not grow to hold a control. The 40px touch floor comes back through the `after:` inset. | owner raised, coordinator sized it | implemented
2026-09-16 | **The control gives back its own padding** (`-ml-2.5`) so the label lands where the column's dates land. A header and its values share a left edge; a control in a header cell would otherwise push its words 10px in while every sibling header starts at the cell's `px-4`. Measured: label and value text now start at the same x. The DS restricts micro steps to "inside controls" (rule 7a) and this is a margin — used to cancel that control's own `px-2.5`, which is the only lever the DS offers for it. | coordinator, disclosed | implemented
2026-09-16 | **The label stays the column's name whether filtered or not.** A `th`'s text names every cell under it, so it cannot become the chosen date — the column would lose its name exactly when the table is hardest to read. What the filter is set to is carried by the line above the table, the menu's checked item, and every row in the column reading one date. | coordinator | implemented

## Changes and tradeoffs

- **`groupByNewListing` is gone**, replaced by `rescheduledDays` — the days and their
  tallies, without the rows under them, because the filter is what needs them now. Its
  tests moved across with it.
- **The record's columns were trimmed to fit.** Two nowrap date headers cost the table 36px
  it did not have at 1280 (946px of table in a 910px panel), and what overflowed was the
  far right — the filter's chevron, the one new affordance on the screen. The width came
  out of the two columns reserving more than they need *on the record only*: a receipt's
  cause title is read rather than scanned for picking (`min-w-48`), and its hearing type is
  closer to a caption (`min-w-32`). The board keeps both at full width.
- **The filter is offered twice, in one place at a time.** At `xl` the table fits and the
  header is reachable; below it the table scrolls horizontally and the header's chevron is
  the first thing off the edge, so a labelled field appears above the table instead. Below
  `md` there is no table at all and the field is the only option.
- **Finishing an act clears the date filter.** A bench narrowed to the 17th that then moves
  eight matters to 9 October would otherwise land on a record that does not contain what it
  just did — the same fault as a range left on the board after the matters in it have gone
  (owner, 2026-09-15).
- **The selected date is resolved against the days that exist, every render.** A date the
  record no longer offers is not a filter, it is an empty table. Nothing in this build takes
  a day away, which is why the guard is cheap and worth having now.
- **A correction to an earlier claim in this record:** the diagnosis first said "nothing at
  rest says there is more than one date". That was wrong — the table is sorted by new
  hearing date, so the column already shows 21 Sept … 21 Sept … 9 Oct as the reader goes
  down it. Only the *ability to isolate one* was undiscoverable, which is why drawing the
  existing trigger as a control was enough and no new chrome was needed.
- **Rejected:** dropping a column from the record to make room (the owner asked for a
  column, not for fewer); two-line date headers (they would push the header strip past 40px
  and take the filter's alignment with them); a tally on the standalone field's trigger (the
  line under it already says how many dates there are).

## The scrollbars, and what they actually were

The owner read the build as broken: a scrollbar down the side of the table and another
along the bottom, on a record that fits. Neither belonged to the table.

The filter's 40×40 hit area is a transparent `after:` inset — the remedy ACCESSIBILITY §8
sanctions and this repo already uses on a field's clear. Absolutely positioned, it anchors
to the nearest positioned ancestor, and inside a DS `Table` that is the primitive's own
`relative` container, not the button. So the inset stretched across the whole table and
**inflated its scrollable area by exactly its two insets**: `scrollWidth` 918 against
`clientWidth` 910 (8px, `inset-x-2`), `scrollHeight` 1462 against 1452 (10px,
`inset-y-[0.625rem]`). Then each bar fed the other — the side bar steals 10px of width, so
the content overflows sideways, so the bottom bar appears, so the content overflows
downward. It took a 30-row record to surface because the table's preferred width had to be
sitting near the container's for the first 8px to matter.

The fix is one class: `relative` on the trigger, so the inset is measured against the
button. Measured after: **no overflow on either axis at 1440 or 1280**, and one honest
horizontal bar at 1100, where six columns genuinely do not fit. The Unscheduled board
behaves the same way, and always did.

Two workarounds went in while this was being diagnosed and came back out once the cause was
known — neutralising the DS container's own `overflow-x-auto` and clipping the vertical
axis. Keeping them would have left the next reader maintaining a defence against a bug that
no longer exists. Filed upstream as `ds-requests` §25: the container's `relative` is
undocumented and is the positioning context for every cell.

## Verification and open work

Driven on the owner's dev server at
`http://localhost:3000/employee/hearings/bulk-reschedule` with headless Chromium over CDP,
by performing two real moves to two different dates (4 matters to 17 Sept, 3 to 25 Sept).

- **One table, six columns**, ending in *New hearing date*; the header strip stays 40px;
  the new date is the row's emphasised value and the previous one stays muted.
- **The trigger reads as a control.** 145×36px with a 1px `input` border (#908a83) and a
  white fill on the strip's #f5f4f1, at 1440 and 1280, with the strip still 40px and the
  table still overflowing by 0px on both axes. Legible in dark as well (lighter fill,
  #696e77 border on the #1d1e21 strip).
- **Fit.** 1440: 1070px of table in 1070px, filter fully visible. 1280: 910 in 910, visible.
  1100 and 900: the table scrolls and the standalone field is on screen instead.
- **No scrollbars.** 0px of overflow on both axes at 1440 and 1280; at 1100 one horizontal
  bar and 0px vertically. Same on the Unscheduled board.
- **No count line and no dot**, and the narrowed state still legible: three rows all
  reading 25 Sept, the control's ink at full, the accessible name stating "showing Friday,
  25 September 2026 only", and "Showing 1–3 of 7." still spoken. Strip still 40px.
- **The filter.** Menu reads *All dates — 7 hearings*, *Thursday, 17 September 2026 — 4
  hearings*, *Friday, 25 September 2026 — 3 hearings*. Choosing the third gives 3 rows, one
  distinct date in the column, and "Showing 3 of 7 — Friday, 25 September 2026"; at rest
  there is no line at all.
- **Keyboard.** Focus the header, Enter opens, arrows walk the dates, Enter applies, the
  menu closes and focus returns to the header — whose accessible name states what is being
  shown ("New hearing date, showing Friday, 25 September 2026 only").
- **One date.** No control, header plain, line reads "5 hearings rescheduled to Saturday,
  19 September 2026".
- **Nothing rescheduled.** The empty state, no table, no filter.
- **The board is untouched:** checkbox, title, number, stage, type, *Hearing date* — no new
  column and no filter.
- Light and dark checked at 1280. `npm run lint` (five DS gates) and 806 tests pass.

Open for the owner:

- **If a forgotten filter ever does matter**, the cure is upstream rather than another mark:
  clear `shownDay` when the tab is left, so the state cannot outlive the reader's memory of
  setting it. That reverses the earlier choice to let it survive a trip to the other tab —
  worth deciding on evidence, not pre-emptively.

- Three records now cover one screen (filter row, act overlay, this). Say the word and they
  consolidate into a single `bulk-reschedule.md`.
- The calendar in the act overlay will offer a Saturday or a Sunday as a new hearing date —
  sitting days and court holidays are not modelled in this build. Unrelated to this change,
  visible in its output ("rescheduled to Saturday, 19 September 2026").
- Independent review has not been run for this change.
