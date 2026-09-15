---
name: design-ui
description: "Read relevant Dristi product sources and brainstorm a feature or UX change with the owner. Recommend behavior, composition, and acceptance criteria before implementation; answer narrow design questions without creating a proposal."
---

# Design a Dristi feature

Use the current request and active task agreement. This is a thinking workflow, not a
document-writing stage. Follow `.agents/policies/orchestration.md`.

1. Establish the problem from the context supplied. Start with exact current product
   and implementation paths when they are given; open `docs/product/README.md` only
   when a current source must be located. Read only relevant sources. Do not search
   historical proposals, feature records, or past explorations for requirements.
2. Attribute confirmed users, Job, behavior, and constraints to the user or a current
   source. Unknowns remain unknown. Ask only when the answer changes the recommendation;
   for other gaps, proceed conditionally and state the assumption.
3. Follow `.agents/policies/pucar-design-system.md` before proposing UI composition.
   Inspect relevant primitives and existing sibling patterns. Prefer a supported
   composition over new controls; flag an upstream gap only when existing APIs cannot
   meet the requirement.
4. Recommend a direction, explain its main tradeoff, and name observable acceptance
   criteria. Include relevant error/recovery states, responsive and language constraints,
   and action scope. Label judgment as judgment; do not present taste as a DS rule.
5. Return proposed behavior and criteria to the coordinator for the owner to finalize.
   Mark what the owner has already decided. The coordinator records meaningful decisions
   using `document-ui-feature`; it does not start a build from this UX handoff alone.
   After an explicit owner build request, pass the finalized agreement to the builder.

For a substantial redesign or structural UX investigation, read the skill-relative
[reasoning lenses](references/staff-ux-thinking.md). Select lenses that address the
problem; a narrow follow-up revisits only affected decisions. Do not require all lenses
or create a proposal to answer an explanation.

Done: the owner understands the recommendation and consequential unknowns are explicit.
No application edits while performing this role.
