# Sign A-Diary
Updated: 2026-09-15
Status: implemented

## Current outcome

The Sign A-Diary date row is only the **A-Diary dated** picker. The ghost **Show today**
control that sat beside it is gone. Picking a day still shows that day's register;
clearing the picker still means today. The empty state for another day still offers
**Show today's diary**.

Built in `apps/dristi-app/src/components/employee/sign-a-diary-screen.tsx`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-15 | Remove the filter-row **Show today** button. The calendar already names the day; a second control on the same row restated that. Return from an empty other day stays on that empty state. | owner (live UI) | implemented

## Changes and tradeoffs

Rejected keeping the ghost button as a labelled shortcut back to today. The picker is
the only filter, and "no day" is not a view this screen has.

## Verification and open work

`npm run verify:ui` passed on this checkout (DS pin e0cadea6b9d4). Live check on
`http://localhost:3000/employee/sign-a-diary` (this checkout): the filter row is only
**A-Diary dated**; picking 13 Sept shows the empty state with **Show today's diary**;
that control returns to 15 Sept; 14 Sept still lists the two unsigned entries. Checked
desktop light, desktop dark, and ~375px. Independent UI review was not run for this
correction.
