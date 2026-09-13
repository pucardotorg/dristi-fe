# Overlays and motion

Read when building or reviewing dialogs, multi-stage flows, or transitions. Follow the
current pinned DS and these owner-established product conventions (2026-09-11/12).

- A flow progresses inside one modal. Confirmations, composers, and outcomes are stages,
  not stacked dialogs. Preserve a stable reading area; an outcome resolves in place.
- An existing document Full view may be a nested viewer, not a flow step. Its exemption
  is unresolved; report a relevant conflict rather than silently rewriting all viewers.
- Reuse `apps/dristi-app/src/components/chrome/motion.ts`: `ARRIVAL.next`, `ARRIVAL.back`,
  `OVERLAY_RISE`, and `RESOLVE_IN_PLACE`. Read the actual exports before use; do not copy
  their class strings into screens or introduce another motion vocabulary.
- Navigation controls declare direction through the existing arrival mechanism; reloads,
  typed URLs, and bookmarks do not imply a journey animation.
- A scene change moves; an act resolving within the same scene does not remount the scene.
  Do not key `Dialog.Content` on each record and replay the open animation mid-session.
- Reserve space for an outcome before it appears. One gesture uses one movement; do not
  animate unaffected content or reanimate a list on every keystroke.
- Follow shared constants for arrival, overlay, and outcome timing. Hover/color changes
  are approximately 150ms. Do not duplicate values that can drift from the shared source.
- Motion respects reduced-motion settings. Focus follows the changed stage, typed field,
  or new record; unmounting a focused element must not drop focus to the document body.
- Modal header/footer are chrome; the stage uses the current canvas/panel recipe. A
  focused decision stage should expose the information required to answer that decision.

Verify actual layout stability, focus, forward/back behavior, and reduced motion on the
render. A source-level class check cannot establish these outcomes.
