# Design-system use in Dristi

Dristi composes product behavior in `apps/dristi-app` using the pinned
[Pucar design system](https://github.com/pucardotorg/dristi-design-system).
It does not maintain a second set of primitives or tokens.

The maintained agent requirement is
[the DS policy](../../.agents/policies/pucar-design-system.md). Read that policy for
resolution, selective DS reads, sync boundaries, table helpers, and upgrade procedure.
[Verification policy](../../.agents/policies/verification.md) defines completion evidence.

## Working commands

Run from the repository root:

```bash
npm run check:ds-fresh             # verify the local DS before depending on it
npm run sync:ui -- button input    # sync missing or drifting primitives
npm run sync:ui -- --tokens-only   # token sync when needed
npm run verify:ui                 # DS freshness, existing app lint/DS gates, rails
```

`npm install` prepares the vendored DS, but do not install in another tool's active
checkout. Follow [server ownership](../../.agents/policies/dev-server.md). A server
running from another checkout cannot verify changes in your worktree.

The DS pin is upgraded with `npm run ds:bump` only in a dedicated upgrade branch from
`origin/design`, followed by a PR into `design` and design-owner approval. Never bump
inside unrelated feature work or commit straight to a long-lived branch. Read the DS
changelog and inspect the rendered consequences before merging an upgrade. Some legacy
script messages still say “on design”; the branch policy above governs their use.

## The product team

- UX designer investigates current sources and brainstorms with the owner.
- UI designer implements the current task agreement using DS primitives.
- UI reviewer checks agreed behavior, consistency, accessibility, and render evidence.
- The coordinator owns handoffs, required fixes, completion, and the owner's history.

See [orchestration](../../.agents/policies/orchestration.md) and
[maintenance](../agent-orchestration.md). Small, fully specified changes do not require
all three agents. Consequential behavior changes require independent review when available.

Historical proposals and feature records are for the owner's reference. They are not
routine build inputs or reviewer acceptance criteria. Current requests, current product
sources, the active task agreement, and the pinned DS guide the work.

## Composition and gaps

Read `ui-craft` for the compact checklist; load its surfaces, typography, or motion
references when relevant. Its product conventions remain subordinate to DS rules.
Reuse existing app composition helpers, including the shared table treatment.

If supported variants and composition cannot meet the agreed need, record a concrete
upstream request in [ds-requests.md](ds-requests.md). Do not locally modify a synced
primitive. Continue independent work while resolving the affected part.

↑ [Docs map](../README.md)
