---
name: pull-ui-from-ds
description: "Build or change Dristi UI using the pinned Pucar DS: inspect relevant primitives, sync missing or drifting components, compose behavior, and verify the result."
---

# Build from the Pucar DS

1. Read the current task agreement and relevant implementation. Follow
   `.agents/policies/pucar-design-system.md`: verify the DS pin before relying on it,
   read applicable DS rules and affected primitive source, and preserve the pin.
2. Load `ui-craft`. Reuse unchanged guidance already read in this task; read detailed
   references only for the surfaces or interactions being changed.
3. Sync only missing or drifting controls with `npm run sync:ui -- <component>`.
   Coordinate shared sync operations. Never hand-write or modify a synced primitive.
4. Compose the agreed behavior in assigned app files. Include relevant loading, empty,
   errors, partial data, language/long-label, responsive, keyboard, and recovery states.
   Trace displayed facts to current product sources or real fields; do not invent
   system actions or user roles. Historical proposals are not required inputs.
5. Verify using `.agents/policies/verification.md` and the craft render checklist.
   Return changed files, acceptance results, commands/evidence, necessary deviations,
   and remaining issues. The coordinator routes independent review when appropriate
   and records decisions/results through `document-ui-feature`.

If a DS capability is missing, first inspect supported variants and composition. Report
a genuine gap and recommend a supported approach; continue unaffected work. Do not
silently change behavior or introduce a local primitive copy to avoid the issue.
