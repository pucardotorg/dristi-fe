# DRISTI docs map

Orientation for this repo. Docs describe the product and how we design; they are
**not** the live case-management app (that lives in [Dristi App](../apps/dristi-app)).

**Domain detail source of truth:** [DRISTI 2.0 — Domain Model](https://dristidomain.netlify.app/)
(data under its `data/` folder). Snapshot date for product prose: **2026-07-30**.

## Sections

| Section | What it holds | Start here |
|---|---|---|
| **Product** | What DRISTI is — domain, journey, standards, open questions | [product/README.md](product/README.md) |
| **Design** | How Dristi UI is built — always pull from pucar-design-system | [design/design-system.md](design/design-system.md) |
| **Design → DS product audit** | Inventory of product UI vs the pinned DS: what is native, customised, missing, or duplicated — recommendation only, no DS changes | [design/ds-product-audit.md](design/ds-product-audit.md) |
| **Design → visual inconsistencies** | Screenshot map of the same jobs solved differently (advocate vs court, queues, teal, filters) | [design/ds-inconsistencies-visual.md](design/ds-inconsistencies-visual.md) |
| **Design → research** | Research memos that feed a brief (per feature: the verbatim ask, domain findings, UX findings). Inputs, not decisions — the brief in `design/proposals/` decides | [design/research/](design/research/) |
| **Design → explorations** | Standalone interactive HTML prototypes for trying a direction before it is app code. **Untracked on purpose** — working material, not product; the decisions they settle go into the brief | [design/explorations/README.md](design/explorations/README.md) |
| **Principles** | Cross-cutting PUCAR design principles — convictions that resolve conflicts between good outcomes. Org-wide, not DRISTI-specific | [principles/](principles/) |
| **Feedback** | How reviewers comment on the running app; feedback → GitHub issues | [feedback-widget.md](feedback-widget.md) |
| **Design mode** | Invoke-only design review, two lanes: the in-app overlay (tweak live, pin comments, report to the agent) and the Pencil lane (edit screens in the Pencil app; the agent anchors every change to the DS and audits it back). Off by default | [design-mode.md](design-mode.md) |

## Repo layers (outside `docs/`)

| Path | Role |
|---|---|
| `apps/dristi-app` | Dristi App (main product) |
| `.cursor/rules/`, `.claude/rules/` | Always-on guardrails (Cursor / Claude Code) |
| `.cursor/skills/`, `.claude/skills/` | On-demand skills (add when a real workflow exists) |
| `.claude/agents/`, `.cursor/rules/role-*.mdc` | Principal-level design roles: UX Designer (proposes) → UI Designer (builds) → UI Reviewer (audits). Subagents in Claude, role rules in Cursor |
| `ds.lock.json` | The one design-system commit this repo builds against. `npm install` checks it out; `npm run ds:bump` moves it (on main only) |
| `scripts/` | Repo-level gates that aren't app code — `check-rails.mjs` (`npm run check:rails`) fails if the Claude and Cursor agent rails drift apart |

## Intentionally not here

- Full statutory text and growing datasets — pull from the domain site / its `data/`.
- The design-system **code** (tokens, components) — lives in
  [pucar-design-system](https://github.com/pucardotorg/dristi-design-system);
  this repo **consumes** it (agents always pull from there into Dristi App).
- A bespoke docs-only `agents/` folder for orchestration prose — tool-native paths
  above (`.claude/agents/`, `.claude/rules/`, `.claude/skills/`) are the agent layer;
  agent roles get a real frontmatter file there, not a description in `docs/`.

- [docs/design/ds-diagnosis.md](design/ds-diagnosis.md) — measured diagnosis of why the built UI reads dull (neutrals, type stack, surfaces) with DS token proposals and an A/B.
- [docs/design/ds-product-audit.md](design/ds-product-audit.md) — 2026-09-17 audit of product UI vs the pinned DS (inventory, customisations, backlog).
- [docs/design/ds-inconsistencies-visual.md](design/ds-inconsistencies-visual.md) — screenshot map of those inconsistencies.
