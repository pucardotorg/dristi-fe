# Order delivery-channel confirmation
Updated: 2026-09-26
Status: implemented

## Current outcome

Choosing **Issue of summons** or **Issue of notice** from the hearing composer's
catalogue (`order-screen.tsx`) no longer inserts the template text straight into the
box with `[Party Type]`/`[Party Name]` standing in brackets. It opens a confirmation
dialog first — **Send to** (the accused's name and address, pre-checked) and
**Delivery channels** (RPAD and SMS pre-checked, Police available but not) — and only
on **Confirm** is the resolved sentence written into the order. The item's row under
*Pulled into this order* then shows a delivery-channel summary and a pencil button that
reopens the same dialog to change the confirmation; the passage is rewritten in place,
not duplicated.

The cognizance composite (`cognizance-order-screen.tsx`) already resolves
`[Party Type]`/`[Party Name]`/`[Notice Type]` unconditionally when it composes a
summons or notice item — at cognizance those are not a choice, only the law's own
assignment (accused served, complainant takes steps). The same dialog is used there
only to collect and confirm the delivery channels; **Send to sign order** is blocked
until that confirmation exists, alongside the existing next-hearing-date blocker.

Built in `apps/dristi-app/src/components/employee/order-variable-dialog.tsx` (the
shared dialog), `apps/dristi-app/src/lib/employee/process-variables.ts` (channel and
addressee types, defaults, the synthetic per-name address fallback), and the
`fillPartyVariables`/`needsProcessVariables` additions to `order-templates.ts`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-26 | Build the confirmation as one popup, shown when the catalogue item is selected: accused name + address pre-selected, channels RPAD and SMS pre-selected, Police available but not, and the order text is written only after Confirm. Same behaviour for notices. | owner (chat) | implemented
2026-09-26 | The popup must also appear in the take-cognizance flow. | owner (chat) | implemented, as a delivery-channel-only confirmation (see Current outcome — party resolution there was already unconditional and is not a choice) |
2026-09-26 | After adding, the drafter must be able to reopen the same item and edit the confirmation. | owner (chat) | implemented via `replaceOrderItemText` — the marked passage is rewritten in place, not removed and re-appended |
2026-09-26 | Only three delivery channels are offered — RPAD, SMS, Police — not the six named in `handovers/process-handover.md` §6.1 (SMS, WhatsApp, physical post, e-post, police via post, police via digital system). The owner named RPAD, SMS and Police specifically; the fuller channel taxonomy is not built out. | owner (chat) | implemented as scoped; recorded as an open gap below |

## Changes and tradeoffs

**One shared dialog, not two.** The hearing composer's catalogue and the cognizance
composite already risked "two answers to what an order says" once (the suggestion
corpus's own stated reasoning for `order-suggest.ts`); a second confirmation UI would
have repeated that. `fillPartyVariables` was moved out of `cognizance-order.ts` into
`order-templates.ts` so both doors run the identical substitution.

**Party choice vs. delivery choice are different questions, and the two screens differ
in which one they still have open.** The hearing composer never resolved
`[Party Type]`/`[Party Name]` for these two templates before this change (no general
variable covers them); cognizance already resolved them unconditionally, since who is
served in a §138 case is fixed by law rather than chosen per instance. So the dialog
does two different jobs depending on where it opens from: at the hearing composer,
confirming also triggers the first-time resolution of the sentence; at cognizance, the
sentence is already resolved and confirming only records the channels. Rejected:
forcing the hearing composer to treat the addressee as a real per-instance choice among
several parties — today's case model carries exactly one accused, so there is nothing
to choose among yet (see the open gap below).

**Reopening rewrites the passage in place rather than removing and re-appending it.**
The existing `ORDER_ITEM_ATTRIBUTE` mark already lets an item's passage be found
exactly, so `replaceOrderItemText` (new, in `order-items.ts`, mirroring
`upsertRichTextFact`'s pattern) swaps the marked block's contents without moving it to
the end of the order — the sentence a drafter has already read around does not jump.

**Channel selection is stored as data on the order item, not printed into the
sentence.** `order-generation.md`'s own `VAR-08` and `ITM-11` treat the delivery
channels as input the order item's workflow needs, separate from the template's BOTD
line; inventing order prose that lists channels would have gone beyond what either the
template catalogue or the owner's instruction asked for. The channel summary is shown
only in the composer's own "Pulled into this order" / "In this order" rows.

## Verification and open work

`npm test` (1048 tests) and `npm run lint` (tokens, typography, ui-sync, spacing,
table-rows) pass on this checkout, plus `npm run check:rails` at the repo root.
Verified live against the owner's running dev server (this checkout, DS pin
e0cadea6b9d4) on `/employee/hearings/h-241/order` — opening the popup, confirming,
seeing the resolved sentence land once, reopening via the pencil button, changing a
channel, and confirming again without duplicating the passage — and on
`/employee/cognizance/c-2041/order`, where confirming cleared the new
"needs its delivery channels confirmed" blocker. Checked at 375px width; dark mode was
not verified live (the app's dark mode is a class-based toggle, not
`prefers-color-scheme`, and the dialog uses only DS semantic tokens already paired in
both modes).

**Open gaps, not resolved here:**
- Today's case model (`CourtHearing.parties` / `CognizanceCase.parties`) carries a
  single accused name and no address field. The dialog's addressee list is written to
  show more than one row when that data exists, but always shows exactly one today,
  with a synthetic per-name address (`demoAccusedAddress`, the same stand-in pattern as
  `components/cases/edit-litigant-dialog.tsx`'s `demoAddress`). Extending the party
  model to a real multi-accused list with addresses is a separate decision.
- Only summons and notice are gated behind this confirmation. Warrants, proclamation,
  attachment and miscellaneous process carry the same `[Party Type]`/`[Party Name]`
  shape (`order-templates.ts`) and would plausibly want the same confirmation; not
  wired in, per the owner's own instruction to start with summons and notice.
- The "/" inline order-suggestion path in the hearing composer (accepting a template
  by typing, `order-suggest.ts`) still inserts summons/notice with unresolved brackets
  — it does not route through this confirmation. The "Pulled into this order" row
  still flags this ("Delivery channels not confirmed") if it happens, but the insertion
  itself is not gated.
- The receiving court's acceptance of the RPAD/SMS/Police channel set specifically (as
  opposed to the fuller six-channel taxonomy in `process-handover.md`) was not asked;
  this was built to the owner's own naming.
