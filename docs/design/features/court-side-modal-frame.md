# Court-side modals — one interaction, one frame
Updated: 2026-09-16
Status: implemented (verified on the render; see limits below)

Sibling records: [the bulk reschedule act overlay](./bulk-reschedule-act-overlay.md) and
[the hearing-dates range picker](./bulk-reschedule-range-picker.md).

## Current outcome

Every modal on the court side is now the same object. Fifteen overlays compose one shared
frame, `apps/dristi-app/src/components/chrome/staged-overlay.tsx`, which supplies:

- the panel's rise on open (`OVERLAY_RISE`),
- a white bordered header that **stays on every stage, including the settled one**,
- a tinted `bg-muted dark:bg-background` stage that is the only thing in the window that
  moves, keyed on the *scene* so a guarded act and its outcome remain one beat,
- directional travel between stages (`STAGE_SLIDE`: forward from the right, back from the
  left; a different record arriving rises instead),
- an optional height floor so a shorter stage does not shrink the panel and re-centre it,
- a `bg-card` footer that is chrome and does not move,
- focus that follows the stage to the line that just changed, and lands on the question
  rather than on whatever control happens to be first.

`useStagedFlow` in the same file owns the stage, its direction and that focus. Direction
is derived from the act's declared `order` rather than chosen at each call site, and a
stage that shares a scene with the one before it gets no direction change at all — which
is what stops a settled outcome replaying an entrance it should never have had.

**The single-record signing path is now one overlay.** `use-sign-step-handoff.ts` is
deleted and `sign-method-dialog.tsx` is now `sign-method-stage.tsx`, stage content rather
than a second `Dialog` root.

## Decisions

| Date | Decision and reason | Source | Status |
|---|---|---|---|
| 2026-09-16 | Apply the registrations overlay's interaction to **all** court-side modals, "the same level of consistency across the product and across all the modals". | Owner (Neer) | accepted |
| 2026-09-16 | Scope explicitly includes collapsing the two-overlay single-record signing path, the one place the product opened a second window on purpose. | Owner, answering a scoping question | accepted |
| 2026-09-16 | Extract the frame rather than hand-write it sixteen times. Two overlays already hand-wrote it with measured details (the flex-column canvas, the two-step floor, `my-auto`); a third through sixteenth copy is how they drift. The same argument `motion.ts` makes for its class strings. | Coordinator | implemented |
| 2026-09-16 | Reverse the 2026-09-12 reasoning behind `use-sign-step-handoff.ts`. That reasoning was right about the symptom (the box jumped `max-w-4xl`/`85dvh` → `max-w-lg` with no entrance) and wrong about the cure: a definite height plus held chrome fixes it inside one window. | Coordinator, on the owner's scope decision | implemented |
| 2026-09-16 | `OVERLAY_RISE` gains a reduced-motion guard, stacked on the same state variants. `motion.ts` had claimed since it was written that every movement in it was `motion-reduce`-guarded; for this one that was false. | Coordinator, from a worker's flag | implemented |
| 2026-09-16 | The frame lands open-focus on the title by default. Three overlays were measured opening with a ring on their *Download* button. Callers with a better answer override and win. | Coordinator | implemented |
| 2026-09-16 | A record change that is really an *opening* enters forward, not `arrive`: a stage rising inside a panel that is itself rising is one gesture played twice. Added `arrival` to `useStagedFlow`. | Coordinator, measured | implemented |
| 2026-09-16 | `hearing-overview-dialog.tsx` normalised off `bg-surface-sunken` and onto the frame's `bg-muted`, and gains the header rule it deliberately omitted. Both were reasoned choices; both were one sheet reading differently from fourteen siblings. | Coordinator | implemented — **owner may want to reverse** |
| 2026-09-16 | `register-case-screen.tsx` **not** converted. Its overlay was deliberately made a plain panel on 2026-09-12 — "a white card on a tinted stage inside a white dialog… a box in a box in a box". Converting it would re-introduce exactly that. | Coordinator | **open — needs the owner** |

## Changes and tradeoffs

Fifteen overlays on the frame: the registrations overlay and the bulk reschedule act (the
two references, migrated last as the proof the frame is faithful), the four review queues
via `application-review-dialog.tsx`, the five bulk signing queues via
`sign-bulk-confirm-dialog.tsx`, the four single-record signing queues plus the order
composer, `sign-evidence`, `sign-a-diary`, `sign-witness-deposition`,
`approve-copy-application`, `scrutiny/review-dialog` and `hearing-overview`.

Notable rejected alternatives and costs:

- **A documented convention instead of a component.** Rejected: the drift being fixed
  happened *with* the convention already written down in `ui-craft` and `motion.ts`.
- **Defaulting `OVERLAY_RISE` inside `ChromeDialogContent`.** Rejected: that wrapper is
  shared with the advocate and citizen areas, and `/citizen` belongs to a teammate.
- **`sign-bulk-confirm` gained a fact card on its question stage.** An outcome cannot
  settle in the card it was signed in if that card does not exist beforehand. This is the
  one addition of content in the pass; the figures are the same captured ones the outcome
  reports, so the card cannot disagree with itself across the act.
- **Three document overlays moved their preview to a framed well**, which turns Download
  and Full view into 40×40 icon buttons with accessible names rather than labelled
  buttons. A visible affordance change, prop-level only; no viewer was rewritten.
- **`scrutiny`'s acknowledgement gate moved into the footer.** The frame has two regions
  (stage, footer), not three; the gate sits beside the button it gates.

## Verification and open work

Verified on the owner's running dev server at `http://localhost:3000` with a headless
CDP driver (no server was started, stopped or rebuilt). Measured, not reasoned from source:

- **Registrations** (the reference) is byte-identical before and after migration: panel
  1024×765 at (336, 68), header 105, footer y=744 on all three stages; forward/back/arrive
  directions correct; Reject lands on the textarea; a new request lands on the fact column.
- **Single-record signing**: `dialogCount: 1` on every stage — the second overlay is gone.
  Panel 896×765 unchanged between document and signature.
- **Bulk signing**: Δpanel/header/canvas/footer = 0,0,0,0 across the act, on all five
  queues, including a single-row selection.
- **sign-evidence, scrutiny, hearing-overview, approve-copy-application, the four review
  queues**: one dialog, header rule, `bg-muted` stage, `bg-card` footer, panel rise, focus
  on the title, correct travel direction.
- **Reduced motion**: with `prefers-reduced-motion: reduce` emulated, the panel reported
  `enter 0.3s` before the fix and `none` after; the rise still plays at 0.3s without it.
- Gates: `check:tokens`, `check:typography`, `check:spacing`, `check:table-rows`,
  `check:ui-sync` all pass. `eslint` and `tsc` clean. 806 unit tests pass.

Open and unverified:

1. **`register-case-screen.tsx`** — the conflict above. The owner decides.
2. **`hearing-overview`'s two normalisations** — reversible in one line each if the owner
   prefers the sheet's old treatment.
3. **No real screen-reader pass** (NVDA / JAWS / VoiceOver) and no Indic-script or
   long-label data exercised; the demo data is short English.
4. **200% zoom** checked only as a reduced-viewport equivalent on the bulk confirmation.
5. Small residual panel movement where a header line is conditional: sign-evidence 18px
   between its two stages, scrutiny 20px, bulk reschedule 28px. Caused by the description
   appearing on one stage only, not by the frame; far below the 382px it replaced.
6. `check:spacing` reports 4 baselined values gone; `--update` was deliberately not run
   because the baseline file is shared and a teammate was editing concurrently.
7. Three overlays still unmount their body on close, so the frame's exit animation does
   not play there (`sign-bulk-confirm`, `scrutiny/review-dialog`). Pre-existing shape.
