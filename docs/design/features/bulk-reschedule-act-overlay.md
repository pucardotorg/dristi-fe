# Bulk reschedule — the act overlay (pick a date, sign, receipt)
Updated: 2026-09-16
Status: verified

Sibling records on the same screen: [the hearing-dates range picker](./bulk-reschedule-range-picker.md) (the filter row), [the act overlay](./bulk-reschedule-act-overlay.md) and [the Scheduled record](./bulk-reschedule-scheduled-record.md).

## Current outcome

Moving a selected board to one new date happens in **one window that stays one window**.
Three stages — pick the day, sign the order, the receipt — inside a header and footer that
never leave, with the stage between them travelling sideways: forward from the right, back
from the left (`STAGE_SLIDE`, `components/chrome/motion.ts`). Signing does not travel: the
card stating what is about to be signed *is* the card that states what was signed, in the
same place and at the same size, with a solid `bg-success` band resolving across its top
and the footer changing under it.

The first question is titled **Pick a new date**, with the scale of the act in the line
under it ("35 selected hearings move to one new date."). Its CTA reads **Next**; the press that signs the
order and moves the matters reads **Sign and reschedule**; the receipt's way out is
**Done**, with "No notification has
gone to the parties yet." as a footer aside beside it.

The signing card reads as one sentence: **Preparing to move** across the band, then
*Cases — 44 cases* and *To new hearing date — Tuesday, 3 November 2026*. After the
signature the band becomes **Order signed** and the two rows do not change.

Built in `RescheduleOverlay` and `SignOrder`,
`apps/dristi-app/src/components/employee/bulk-reschedule-screen.tsx`. The interaction is
the registrations overlay's, shared from
`apps/dristi-app/src/components/employee/approve-registrations-dialog.tsx`.

## Decisions

Date | Decision and reason | Source/person | Status
---|---|---|---
2026-09-16 | The first CTA says **Confirm and sign**, not *Reschedule and sign*. It was the third thing in one journey wearing the word "Reschedule" — after the board's own button and the overlay's title. | owner | **superseded the same day**, see below
2026-09-16 | **Both halves of the act belong to the press that performs it** — not to the step before it, which was the first pass's mistake. | owner | implemented
2026-09-16 | **The signing CTA is *Sign and reschedule***, settling a question the owner asked directly. It is the shape the court side already uses where a signature does something beyond being a signature: an order says *Sign and publish* (`sign-order-dialog.tsx`), a diary entry *Sign the entry*. The four signing queues say a bare *Sign* because there the document is already drawn up and signing only clears it (`sign-bulk-confirm-dialog.tsx`, `confirm: "Sign"`); here nothing has moved until the press. *Confirm and sign* was the outlier — no other signing button on the court side opens with *Confirm*, which belongs to the registrations overlay's unsigned decisions (*Confirm approval* / *Confirm rejection*). | owner asked, coordinator recommended from the in-product convention | implemented
2026-09-16 | **The first stage's CTA is *Next*, not a verb.** Third and settled reading of this one button (*Reschedule and sign* → *Confirm and sign* → *Reschedule* → *Next*). It commits nothing: the date is not applied by it and no order is drawn by it, so a verb there would claim something the press does not do. A departure from the registrations overlay, which names its steps with verbs because each of its stages is a decision; picking a day is data collection and this flow's one decision lives at the end. | owner | implemented
2026-09-16 | **The first stage asks its question instead of repeating the button that opened it.** The title read *Reschedule 35 hearings*, which is the board's own CTA said back to a bench that had just pressed it; it is now *Pick a new date*. The count is not lost — it moved to the description line, where it still says how much this one date takes. | owner | implemented
2026-09-16 | The calendar card's visible *New hearing date* label goes with it: two lines 40px apart naming the same thing, in a card that holds nothing else. The window's title is the label, and the calendar group keeps the name for a screen reader. | coordinator, following from the row above | implemented
2026-09-16 | **The signing card's copy is the owner's, and it reads as a sentence**: *Preparing to move* over *Cases* and *To new hearing date*. The first pass stated the move as a heading over three unrelated labels. | owner | implemented
2026-09-16 | **The *Hearings* row goes.** It sat above *Cases*, and on this board the two numbers are almost always equal, so the card said one thing twice. The count of listings is carried by the first question's title going in and the receipt's title coming out; where listings do outnumber cases this card now states the cases only. | owner | implemented
2026-09-16 | Bring the registrations overlay's interaction (Abhiram, 2026-09-12) to this journey: one modal, chrome that holds still, stages that slide, nothing replaced abruptly. Three faults were measured on the render before the change: the window resized 640 → 258 → 448px and re-centred with each change (top 130 → 321 → 226); nothing moved, so nothing said a stage had changed; and the header was dropped at the end so the success panel could carry its own heading — the exact moment the overlay stopped looking like itself. | owner | implemented
2026-09-16 | The receipt settles in the scene it was signed in and does not arrive in a new one — the registrations rule (owner, 2026-09-11: approving "takes two screens that feel like one act"). Keying each stage's entrance on the *scene* rather than the stage is what enforces it. | coordinator | implemented
2026-09-16 | **Supersedes the presentation, not the ruling, of 2026-09-15.** The receipt was a detached solid-success panel carrying its own heading and tick, with facts in a sunken well — the object the advocate submission and the signing queues end on, adopted because a bulk act and a submission must not end on two different kinds of object. The object survives: solid success fill, a tick, facts directly beneath. What changed is that it is now the top band of the card those facts were already in, and the heading moved to the dialog header, because the frame stays up and two headings saying one outcome is one too many. | coordinator, on the owner's instruction | implemented
2026-09-16 | The X stays on every stage. It was pulled on the receipt only because the header went with it and the ghost mark vanished into the panel's solid fill; on white chrome it is legible throughout. | coordinator | implemented

## Changes and tradeoffs

- **One motion vocabulary.** `SLIDE` was local to the registrations overlay; it is now
  `STAGE_SLIDE` in `chrome/motion.ts` and both overlays import it. Two overlays
  hand-writing the same three class strings is how one ends up 200ms out from the other.
- **The window holds its size, where the window can afford it.** The stage canvas takes a
  floor (384px, then 448px as the viewport grows) so pressing on no longer shrinks the
  dialog. The floor is conditional: at a 620px-tall window, and below `sm` where the
  footer stacks its buttons, honouring it pushed the footer past the panel's clipped edge
  and took that stage's own CTA with it. Below those thresholds the canvas sizes itself and
  the window resizes — a smaller fault than a window with no way out of it.
- **A focus bug in this journey, pre-existing and now fixed.** The overlay was unmounted
  the instant it closed, so Radix — which hands `onCloseAutoFocus` out from inside its own
  unmount cleanup, on a `setTimeout` — never got to ask where focus should go; and the
  place it was being sent (the commit bar's selection count) does not exist after the act,
  because finishing follows the matters to the Scheduled tab and takes that bar with it.
  A bench that signed with the keyboard was left on `<body>`. The overlay now stays mounted
  and is told when a new session starts (a `session` prop, reset during render — React's
  "adjusting state when a prop changes", the pattern the registrations overlay already
  uses), and focus lands on the **Scheduled** tab: where the matters went, and a control
  that says so.
- **The card is short and the canvas is not.** Two rows in a 448px canvas leave a good
  deal of empty tint above and below the card. That is the price of the floor that keeps
  the window from resizing, and the card is centred in it so the space reads as deliberate
  rather than as something missing. Dropping the floor would buy the space back and take
  the steady window with it.
- **Rejected:** flooring the header as well, to remove the last 28px of movement. The floor
  would be an off-ladder magic number that only works where the title fits on one line, and
  it buys dead space above the card on two stages out of three.
- **Rejected:** giving the signing and receipt stages a header description line to match
  the first. The 2026-09-15 decision that the signing stage says nothing above the facts
  still holds.

## Verification and open work

Driven on the owner's dev server at
`http://localhost:3000/employee/hearings/bulk-reschedule` with headless Chromium over CDP.

- **The labels and the copy.** First question: titled *Pick a new date* over
  "44 selected hearings move to one new date.", a calendar with no second visible label
  (the group keeps the accessible name *New hearing date*), and *Cancel* / *Next* with the
  primary off until a day is picked. Signing: *Back* / *Sign and reschedule* over the band
  *Preparing to move*, with *Cases — 44 cases* and *To new hearing date — Tuesday, 3 November 2026*, both
  values on one line. Receipt: band *Order signed*, the same two rows, *Done* and the
  notification aside.
- **The frame holds.** Stage canvas 448px on all three stages at 1280×900 and 834×1112;
  dialog 642 / 614 / 614px; the header's left edge does not move through a transition.
- **The stage travels.** Forward enters at +32px and settles to 0 over ~300ms; Back enters
  at −28px. Signing measures **0px offset for the whole transition**, and the card's rect
  is identical before and after the signature (384×132 at top 378, both, at 1280×900). The
  band's transparent hairline is what makes that exact — without it the card was 1px
  shorter. On a phone the card shifts 4px across the signature, because there is no canvas
  floor at that width and the footer's own height changes between the two stages.
- **Nothing clips.** Footer fully inside the dialog, and the dialog inside the viewport, at
  1280×900, 1280×700, 1280×620, 834×1112, 375×812 and 375×667.
- **Keyboard.** Opens on the title; one Tab reaches the footer's primary on each stage;
  Enter advances; focus follows each stage change to the title, which rewrites itself; the
  receipt's band carries `role="status"` ("Order signed") so the outcome is spoken as well
  as the title; Escape and Cancel return focus to the trigger; Done lands on
  *Scheduled 44*.
- **Sessions.** Reopening after an abandoned session starts on the first question with no
  date held over and the primary disabled.
- **Rows stack below `sm`**, so the court date keeps one line on a 375px phone.
- **The sibling still works.** The registrations overlay slides ±23px after the import
  refactor.
- Light and dark both checked. `npm run lint` (five DS gates), 791 tests, and
  `check:ds-fresh` (pin e0cadea6b9d4) pass.

Open for the owner:

- **The signing queues still swap their content wholesale.** `sign-bulk-confirm-dialog.tsx`
  is the same two-step act with the same abrupt change and the same detached success panel,
  and so is the advocate side's `cases/add-signature-dialog.tsx`. Bringing them across is a
  separate pass and was not done here.
- The window still changes by 28px between the first question and the two signing stages,
  because the first question carries a header description line the others deliberately do
  not. Flooring the header would remove it; see the rejected note above.
- Independent review of this revamp has not been run.
