# Hearing order
Updated: 2026-09-27
Status: in progress

## Current outcome

The listing header’s matter facts (Item, Case, Stage, Today for) are one size:
`text-body-compact` (14/20). Labels stay muted and medium; values stay foreground,
with lining figures on the serial and case number. The composed region on the
order sheet is ruled at the top only; the hairline under the editor is gone. The
sheet title (`ORDER`) is left-aligned with the card content.

**The footer now carries three things, not one** (owner, 2026-09-26): a Saved
indicator, **Preview**, and the primary **Add to signing list**. Preview opens
the order as paper in the same read-then-sign overlay the four signing queues
already share (`sign-method-stage.tsx`), with **Sign now** advancing to the
signature choice from there — so a bench can still sign immediately without
first adding to the list. Add to signing list is the lighter, dialog-free act;
either path settles the footer's own state (draft → added / signed) and the
button relabels itself accordingly. The identical three additions were made to
the cognizance composite (`cognizance-order-screen.tsx`), which had no
read-then-sign overlay before this and now shares the same one.

**View Case now opens the case file in place on the cognizance composite too**
(2026-09-27), matching the hearing composer's own toggle exactly — the same
right-column swap, the same `OrderCaseFile` component, reused with no new
props (it already reads a fixed case-file tree, not anything hearing-specific,
so cognizance needed no data plumbing to adopt it). Before this, the header's
only button was labelled "View case" but actually navigated away to the
complaint's own page (`subjectReturn`'s `back.href`) — the label of one act on
the behaviour of a different one, which is what read as broken (owner,
2026-09-27: "not coming up on the right side like it does when I go from the
hearing"). Both acts now exist as two buttons, each under its own name: **View
Case** (the toggle) and **Back to the complaint** (`back.label`, previously
hardcoded as "View case").

Built in `apps/dristi-app/src/components/employee/order-screen.tsx` and
`cognizance-order-screen.tsx`, sharing `order-draft-facsimile.tsx` (the paper
render) and `order-save-indicator.tsx` (the Saved indicator) between them.
The longer sitting-panel history remains in `docs/design/proposals/hearing-order.md`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-26 | Footer primary renamed again, from "Send to sign order" to **"Add to signing list"**. Owner: the old name "sounded so bad" — it read as an order already handed off somewhere, when the act is only marking the draft ready. Reverses D-2026-09-15's rename below rather than erasing it — see that row. | owner (chat) | implemented |
2026-09-26 | Add a Saved indicator to the footer, "similar to what we have done in the e-filing screen" (`components/filing/saving-indicator.tsx`). Built as a plain, always-"Saved" status rather than a copy of the filing indicator's Saving/Saved/error states: an order draft writes synchronously into `order-drafts.ts` (or the cognizance screen's own local state), so there is never an in-flight "Saving…" interval the way there is for filing's asynchronous IndexedDB write. Recorded gap: this is honest about surviving navigation within the sitting, not about surviving a reload — neither composer's draft does, before or after this change. | owner (chat) | implemented, scope note above |
2026-09-26 | Add a **Preview** button that shows the order and offers to sign it immediately. Built by adopting the four signing queues' own shared "read the paper, then choose how to sign" overlay (`SIGN_STAGES`/`SIGN_SCENES`/`SignatureStage` in `sign-method-stage.tsx`) instead of inventing a second one — the hearing composer's signature overlay was one stage before this because there was nothing separate to read (D-2026-09-15 below); Preview is exactly that separate thing. The cognizance composite had no signature-choice stage at all before this and gained the identical overlay for parity. | owner (chat) | implemented |
2026-09-27 | The cognizance composite's header gains the hearing composer's **View Case** toggle (`OrderCaseFile`, in place on the right), and the pre-existing navigate-away button is relabelled to what it already computed (`back.label`, "Back to the complaint") instead of the hardcoded "View case" it wore. Owner flagged the old single button as broken: it was named for the toggle and behaved as the navigate-away link. | owner (chat) | implemented |
2026-09-16 | Order-sheet title left-aligned. Owner on the live `h2#order-paper`: centred `ORDER` sat in the middle of the card; it should start with the rest of the sheet. Dropped `text-center` so the heading uses the default start alignment. | owner (live UI) | verified
2026-09-15 | Composed region keeps the top hairline and drops the bottom one. Owner on the live sheet: with next hearing beside attendance, nothing sits under the writing, so the lower divider was leftover decoration. The editor’s own border still closes the writable region. | owner (live UI) | implemented
2026-09-15 | Footer primary renamed from “Sign order” to “Send to sign order”. Owner on the live CTA. Matches D10: this screen records a signature choice and does not sign. The Add signature overlay and the Sign orders queue keep their names. **Superseded 2026-09-26 — see above.** | owner (live UI) | superseded
2026-09-15 | Matter-facts labels leave `text-caption` (12px) for `text-body-compact` (14px). Owner asked for the whole row at 14px; values were already that size. Hierarchy stays in colour and weight, not a second size. D58’s caption labels remain the panel rule. | owner (live UI) | implemented

## Changes and tradeoffs

Caption is the DS metadata role. The owner judged 12px too small under the 24px
page title for facts a typist needs before they can set anything down. Rejected:
keeping caption on labels only — that was the 12px the report named.

The composed region used matching hairlines above and below the editor while
next hearing still sat under the writing. With that block now beside attendance,
the lower rule was a leftover divider over empty card. Rejected: keeping both
rules as the reference drew them.

**Add to signing list does not write into the real Sign-orders queue**
(`lib/employee/sign-orders.ts`'s `SIGN_ORDER_QUEUE`), which is a static fixture
read by a separate screen, not a live store. Making this button actually queue
the order there would mean turning that fixture into a mutable, subscribable
store — a materially bigger change than a footer button, and not something this
request asked for. What is built instead matches this codebase's existing
"nothing is issued from this screen" honesty elsewhere: the footer's own state
(draft/added/signed) is local to the composer and says only what happened here.
Rejected: silently wiring the button into the fixture array, which would have
made the "signing list" claim true in this screen and meaningless in that one.

**Preview reuses `buildOrderDocument` / a hand-built equivalent, not a new
document type.** The hearing composer already had `OrderDocument`
(`order-draft.ts`) for the paper on the page; the cognizance composite had
nothing equivalent, since a complaint carries no attendance or applications.
Rather than give cognizance a full `OrderDocument`, `order-draft-facsimile.tsx`
takes the narrower structural shape both screens can actually supply (court,
case number, cause, title, one body passage, dated, signature) — the same
"read only what both have" reasoning `order-subject.ts` already uses for
everything else these two screens share.

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

**2026-09-26.** `npm test` (1049 tests), `npm run lint` (tokens, typography,
ui-sync, spacing, table-rows) and `npm run check:rails` all pass on this
checkout. Verified live against the owner's running dev server on both
`/employee/hearings/h-241/order` and `/employee/cognizance/c-2041/order`: the
footer now reads Saved · Preview · Add to signing list; Preview opens the
order as paper with Sign now disabled while blockers stand and enabled once
they clear; Sign now → Add signature → Submit closes the overlay, returns
focus to Preview, and relabels the primary button to Signed on both screens.
At 375px the footer stacks Saved above a full-width Preview above a full-width
primary, each an independent row rather than wrapping into each other. Not
verified: dark mode (not toggled live this pass).

**2026-09-27.** `npm test` (1054 tests), `npm run lint` and `npx tsc --noEmit`
pass on this checkout. Verified live on `/employee/cognizance/c-2041/order`:
View Case opens `OrderCaseFile` in the right column with the catalogue and
"In this order" list untouched on the left, relabels to "Back to order",
toggling back restores the order article with every field exactly as left
(next-hearing purpose, the unset date, the composed text) — nothing in the
draft was lost by the round trip. "Back to the complaint" still navigates to
`/employee/cognizance/{id}` as it always did. Not verified: 375px and dark
mode for this specific change (`OrderCaseFile` is desktop-only by the owner's
own earlier instruction on the hearing composer, so parity here inherits that
scope rather than extending it).
