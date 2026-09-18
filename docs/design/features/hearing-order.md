# Hearing order
Updated: 2026-09-16
Status: in progress

## Current outcome

The listing header’s matter facts (Item, Case, Stage, Today for) are one size:
`text-body-compact` (14/20). Labels stay muted and medium; values stay foreground,
with lining figures on the serial and case number. The footer primary is
**Send to sign order**. The composed region on the order sheet is ruled at the
top only; the hairline under the editor is gone. The sheet title (`ORDER`) is
left-aligned with the card content.

Built in `apps/dristi-app/src/components/employee/order-screen.tsx`.
The longer sitting-panel history remains in `docs/design/proposals/hearing-order.md`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-16 | Order-sheet title left-aligned. Owner on the live `h2#order-paper`: centred `ORDER` sat in the middle of the card; it should start with the rest of the sheet. Dropped `text-center` so the heading uses the default start alignment. | owner (live UI) | verified
2026-09-15 | Composed region keeps the top hairline and drops the bottom one. Owner on the live sheet: with next hearing beside attendance, nothing sits under the writing, so the lower divider was leftover decoration. The editor’s own border still closes the writable region. | owner (live UI) | implemented
2026-09-15 | Footer primary renamed from “Sign order” to “Send to sign order”. Owner on the live CTA. Matches D10: this screen records a signature choice and does not sign. The Add signature overlay and the Sign orders queue keep their names. | owner (live UI) | implemented
2026-09-15 | Matter-facts labels leave `text-caption` (12px) for `text-body-compact` (14px). Owner asked for the whole row at 14px; values were already that size. Hierarchy stays in colour and weight, not a second size. D58’s caption labels remain the panel rule. | owner (live UI) | implemented

## Changes and tradeoffs

Caption is the DS metadata role. The owner judged 12px too small under the 24px
page title for facts a typist needs before they can set anything down. Rejected:
keeping caption on labels only — that was the 12px the report named.

The composed region used matching hairlines above and below the editor while
next hearing still sat under the writing. With that block now beside attendance,
the lower rule was a leftover divider over empty card. Rejected: keeping both
rules as the reference drew them.

## Verification and open work

`npm run verify:ui` passed on this checkout (DS pin e0cadea6b9d4) after the
title alignment change. On `/employee/hearings/h-241/order` (this checkout,
owner server), `#order-paper` computed `text-align: start` with 0px offset
from the card content inset: desktop light (~1433px), 375px light, and a
synthetic dark class. Desktop light render shows `ORDER` flush left with
Attendance / Next hearing.

Earlier (2026-09-15): matter facts were measured 14px; footer CTA reads
“Send to sign order” (153×40 desktop, 327×40 at 375px); composed-region
hairline `border-top` 1px, `border-bottom` 0px. Those checks were not
re-run for this alignment-only change.
