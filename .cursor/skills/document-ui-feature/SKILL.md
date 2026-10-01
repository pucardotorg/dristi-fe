---
name: document-ui-feature
description: "Maintain the owner's Dristi feature history at meaningful decision or implementation milestones, or when asked to document work. Record what changed and why; historical records are not routine planning or build inputs."
---

# Record the owner's feature history

The coordinator owns this workflow. Record decisions while their reasons remain in
the current conversation; do not defer everything until shipping. A small correction
may need only a short dated entry, not a new full document or another agent.

## Inputs and boundary

- Use the current conversation's accepted decisions, active agreement, actual diff,
  and verification results. Do not invent a rationale after the fact.
- One record per feature: `docs/design/features/<slug>.md`. Resolve its name from the
  task and list filenames before creating a duplicate. Read only the target record
  to update it coherently; do not scan the archive to guide implementation.
- Historical proposals stay in place. Read or migrate one only on explicit request.
  If history conflicts with the current agreement, preserve the history and record
  the new decision; the archive does not override current instructions.
- No application edits in this workflow. Read-only UX/reviewer roles return decisions
  and evidence to the coordinator rather than writing the record themselves.

## Record what matters

Use enough structure for the owner to refer back later, scaled to the change:

```markdown
# <Feature>
Updated: <date>
Status: decided | in progress | implemented | verified

## Current outcome
What is agreed or implemented, with relevant source/file links.

## Decisions
Date | Decision and reason | Source/person | Status

## Changes and tradeoffs
What changed, significant alternatives rejected, and why.

## Verification and open work
What was actually checked, limitations, and unresolved decisions.
```

Distinguish user-confirmed decisions from implementation choices. Preserve reversals
with dates and reasons; do not silently rewrite previous decisions. If a reason is
unavailable, say so. Link evidence instead of copying large logs. “Verified” requires
applicable evidence; “implemented” does not imply merged, deployed, or visually checked.
Do not write entries for every message or file read.

A real DS gap belongs in `docs/design/ds-requests.md` with a concrete need and source;
keep it distinct from confirmed DS rules. A new permanent requirement belongs in current
policy/product sources only when explicitly established, not because it appeared in history.

Done: the owner can recover what was decided, why, what exists, and what remains. Return
the record path and a concise description of the update to the coordinator/final report.
