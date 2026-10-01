---
name: pull-ui-from-ds
description: "Build or change Dristi UI using the pinned Pucar DS: inspect relevant primitives, sync missing or drifting components, compose behavior, and verify the result."
---

# Build from the Pucar DS

1. Confirm the owner explicitly requested implementation. Read the finalized UX
   agreement when a UX stage occurred; an explicit direct correction can use the
   current request as its agreement. Read relevant implementation. If a governing
   decision is missing, request it from the coordinator instead of reconstructing it
   from feature history. Follow
   `.agents/policies/pucar-design-system.md`: verify the DS pin before relying on it.
   Every build reads the full DS `ACCESSIBILITY.md`, Laws, design principles,
   applicable rules, and affected primitive source; preserve the pin.
2. Load `ui-craft`. Reuse unchanged guidance already read in this task; read detailed
   references only for the surfaces or interactions being changed.
3. Sync only missing or drifting controls with `npm run sync:ui -- <component>`.
   Coordinate shared sync operations. Never hand-write or modify a synced primitive.
4. Compose the agreed behavior in assigned app files. Include relevant loading, empty,
   errors, partial data, language/long-label, responsive, keyboard, and recovery states.
   Trace displayed facts to current product sources or real fields; do not invent
   system actions or user roles. Historical proposals are not required inputs.
   Match each important region's DS text role to the finalized design or direct
   request, including rendered size and line-height; token validity alone does not
   establish correct hierarchy. Explain a choice when the DS role is ambiguous.
5. Verify using `.agents/policies/verification.md` and the craft render checklist.
   Return changed files, acceptance results, commands/evidence, necessary deviations,
   and remaining issues. The coordinator performs a separate review pass or invokes a
   tagged reviewer, then records decisions/results through `document-ui-feature`.

If a DS capability is missing, first inspect supported variants and composition. Report
a genuine gap and recommend a supported approach; continue unaffected work. Do not
silently change behavior or introduce a local primitive copy to avoid the issue.
