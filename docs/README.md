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
| **Feature history** | Owner-facing decisions, reasons, and implementation/verification status; not routine agent input | [design/features/README.md](design/features/README.md) |
| **Agent maintenance** | Canonical instructions, generated adapters, validation, rollout, and rollback | [agent-orchestration.md](agent-orchestration.md) |
| **Design → research** | Historical feature research for the owner; retrieve only on explicit request | [design/research/](design/research/) |
| **Design → explorations** | Standalone interactive HTML prototypes for trying a direction before it is app code. **Untracked on purpose** — working material, not product; accepted decisions are recorded in the owner’s feature history | [design/explorations/README.md](design/explorations/README.md) |
| **Principles** | Cross-cutting PUCAR design principles — convictions that resolve conflicts between good outcomes. Org-wide, not DRISTI-specific | [principles/](principles/) |
| **Feedback** | How reviewers comment on the running app; feedback → GitHub issues | [feedback-widget.md](feedback-widget.md) |
| **Design mode** | Invoke-only design review, two lanes: the in-app overlay (tweak live, pin comments, report to the agent) and the Pencil lane (edit screens in the Pencil app; the agent anchors every change to the DS and audits it back). Off by default | [design-mode.md](design-mode.md) |

## Repo layers (outside `docs/`)

| Path | Role |
|---|---|
| `apps/dristi-app` | Dristi App (main product) |
| `.agents/skills/` | Canonical skills, with conditional references; Codex discovers these directly |
| `.agents/roles/`, `.agents/policies/`, `.agents/rails.json` | Shared role bodies, policies, and explicit tool adapters |
| `.codex/agents/` | Generated Codex roles; model selection inherits the session |
| `.cursor/rules/`, `.claude/rules/`, `.claude/agents/` | Generated tool-native policy and role adapters |
| `.cursor/skills/`, `.claude/skills/` | Generated complete mirrors of canonical skills |
| `ds.lock.json` | Pinned DS commit; upgrades use a dedicated branch and PR into `design` |
| `scripts/` | Rails generation, consistency checks, regression tests, and verification profiles |
| `.github/workflows/agent-rails.yml` | Dependency-free agent configuration checks on PRs and long-lived branch pushes |

## Intentionally not here

- Full statutory text and growing datasets — pull from the domain site / its `data/`.
- The design-system **code** (tokens, components) — lives in
  [pucar-design-system](https://github.com/pucardotorg/dristi-design-system);
  this repo **consumes** it (agents always pull from there into Dristi App).
- A second agent policy source in docs: operational sources live in `.agents/`; native
  files are generated. The maintenance guide explains those files but does not replace them.

- [docs/design/ds-diagnosis.md](design/ds-diagnosis.md) — measured diagnosis of why the built UI reads dull (neutrals, type stack, surfaces) with DS token proposals and an A/B.
