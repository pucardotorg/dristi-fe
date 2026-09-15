---
name: review-ui-ds
description: "Independently review Dristi UI against agreed behavior, the pinned DS, accessibility, responsive usability, and affected sibling patterns. Report evidence and fixes without modifying the implementation."
---

# Review behavior and UI quality

Inputs: current task agreement, stable diff, relevant current product sources, and
verification evidence. Never require an archived proposal or its attributes table.

1. Follow `.agents/policies/pucar-design-system.md`. Establish the DS version and read
   applicable rules and affected primitives. Reuse material already read for this state.
2. Map acceptance criteria to the actual implementation. Look for missing behavior,
   incorrect action scope, unsupported system claims, and relevant failure/recovery states.
3. Review semantic tokens, typography, composition, labels, focus, keyboard access, touch,
   language/long-label behavior, and affected sibling consistency. Load the compact
   `ui-craft` checklist; select detailed references only when their subject applies.
4. Follow `.agents/policies/verification.md` for check evidence and render coverage.
   Reuse valid checks for the exact state, but inspect independently. If read-only
   browser/screenshot tools are available, capture the assigned screens yourself from
   the checked checkout. Otherwise inspect the coordinator's labeled screenshot
   packet; request a missing state once and mark it pending. Do not sync, edit,
   install, start a server, or change fixtures during review.

For a structural UX concern, selectively consult
`.agents/skills/design-ui/references/staff-ux-thinking.md`; do not impose a full redesign
audit on a small correction.

## Findings and decision

- **Required fix:** unmet acceptance criterion, DS requirement, accessibility floor,
  behavior regression, or misleading product claim. Explain consequence and evidence.
- **Suggestion:** supported improvement that does not block the agreed outcome. Label
  visual judgment as judgment; subjective flatness is not automatically critical.
- **Unverified:** missing evidence or unavailable environment. State what is needed.

Each finding includes file/location, observed issue, affected criterion or sourced rule,
consequence, and concrete correction. Group repeated causes; do not invent findings or
require removing a decoration. Return **ready**, **needs fixes**, or **verification
pending**. Missing required render evidence prevents a ready verdict.

Send required findings to the coordinator for the builder, then recheck affected criteria
after changes. Do not reopen settled choices without a demonstrated conflict.
