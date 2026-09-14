# Product team workflow

The coordinator stays accountable for the whole request. Specialists own bounded
decisions or implementation; the user does not relay messages between them.

## Choose the route

- Explanation: answer from relevant evidence; no artifact or team by default.
- Clear correction: build directly, verify the affected behavior and UI, then record
  a meaningful change in the feature history. File count does not determine risk:
  copy affecting deadlines, permissions, or irreversible actions merits review.
- New feature or ambiguous redesign: UX resolves the relevant decisions, UI builds,
  reviewer independently audits the agreed behavior and DS. The coordinator delegates
  these stages when supported; this is authorization to use the three project roles
  for their applicable work, not a requirement to launch all three for every task.
- Bug: reproduce and trace the cause before fixing. Use focused exploration if it can
  run independently alongside useful work; do not turn every bug into UX planning.
- Documentation-only: use `document-ui-feature`, without a build or design review.

## Active agreement — task context, not a proposal file

For substantial work, maintain this compact handoff in the task and pass it directly
to each specialist. For a small correction, the user's request may already suffice.

1. Objective and agreed behavior, including scope boundaries.
2. Confirmed decisions, their source, and relevant product/DS paths.
3. Observable acceptance criteria, including consequential states.
4. Owned files, dependencies, and anything another worker is changing.
5. Required verification and current unresolved issues.

Do not forward the full transcript or historical proposals when the agreement suffices.
The builder may recommend a necessary adjustment; the coordinator resolves it against
the current request and sources. Ask the user only when missing intent materially
changes the result and cannot be resolved from available evidence. Continue independent
work while an answer is pending.

## Ownership and changes of direction

One writer per shared area. Tell each worker it is not alone and must preserve others'
edits. Parallelize only independent responsibilities; serialize shared components,
token sync, dependency changes, and integration. Do not run a reviewer against files
that are still changing. The coordinator owns shared mutations and the final diff.

When the user changes a decision, update the agreement, notify affected workers, and
stop superseded dependent work before it causes rework. Record the superseded decision
in the owner's history at the next meaningful checkpoint. On interruption or compaction,
preserve objective, current agreement, changed files, evidence, and next action in task
state. A fresh task must verify current code and requirements rather than infer intent
from the archive; retrieve history only if the user requests it.

## Review, repair, and completion

Give the reviewer the current agreement, a stable diff, relevant sources, and validation
evidence tied to the checked state. Request independent inspection, not agreement with
the builder's conclusions. Reports contain required fixes, suggestions, and unverified
items, each with evidence. The coordinator sends required fixes to the builder and
rechecks affected criteria after changes; clean findings need not be re-investigated.

Do not repeat an unchanged failed approach or review loop. Identify the missing fact,
environment problem, or genuine rule conflict. Escalate that specific issue with a
recommendation; optional polish does not hold completion hostage.

The coordinator owns integration, verification, the feature-history update, and the final
reply. Run checks once per relevant state; use `.agents/policies/verification.md` to
decide when earlier evidence has become stale. Never call an unverified criterion passed.
