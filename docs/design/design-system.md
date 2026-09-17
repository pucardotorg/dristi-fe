# Design

How Dristi looks and behaves in product UI. This folder is **guidance for this repo** —
it does **not** contain design-system source code.

**Source of truth for UI:** [pucar-design-system](https://github.com/pucardotorg/dristi-design-system)

## Where the product app lives

**Dristi App** ([`apps/dristi-app`](../../apps/dristi-app)). Screens go there; look and feel
comes from the DS — not a second kit inside Dristi.

## How agents must use the design system

**DS root:** `vendor/pucar-design-system` (created by `npm install`), or
`PUCAR_DS_ROOT` if set. Must be
[pucardotorg/dristi-design-system](https://github.com/pucardotorg/dristi-design-system)
(verified by `apps/dristi-app/scripts/resolve-ds.mjs`). Never use other org forks.

**New machine:** `git clone` this repo → `npm install` → `npm run dev`. No separate DS
clone step.

**Before any UI change, read:** `AGENTS.md`, `ACCESSIBILITY.md`, `RESPONSIVE.md`, Laws
(`src/app/(docs)/foundations/laws/page.tsx`), and the real `src/components/ui/<name>.tsx`.

**Install / sync (do not hand-write):**

```bash
npm run check:ds-fresh             # am I on the pinned DS? run this first
npm run ds:bump                    # move the repo to a newer DS (on main only)
npm run sync:ui -- button input    # copy components from local DS
npm run sync:ui -- --tokens-only   # refresh token CSS
npm run check:tokens               # no hardcoded colours / invent tokens
npm run check:typography           # named DS roles in product composition
npm run check:ui-sync              # primitives + globals must match DS
npm run check:rails                # Claude and Cursor agent rails must not drift
```

`check:ds-fresh` is first for a reason. Every other gate here is *relative* — it
compares the app to whatever sits in `vendor/pucar-design-system`, so the wrong DS
version passes all of them. Four branches on three design systems, with every gate
green, is what that cost.

`ds.lock.json` at the repo root ends it: one commit id, recorded in the repo, checked
out by `npm install`. Which DS you are on stops depending on when you last installed.
Bumping is `npm run ds:bump` — run on main, it rewrites the pin, re-syncs every
primitive and the tokens, and prints the range so the change is reviewable. Never edit
the pin by hand, and never bump it on a feature branch.

Catalog: DS `public/r/registry.json` (also
https://pucar-design-system-five.vercel.app/r/registry.json). Dristi
`components.json` maps `@pucar` for discovery; **copy via `sync:ui`**.

## When the DS is missing something

Log it in [ds-requests.md](ds-requests.md) as a request against the DS repo — never work
around it locally. A brief that hits a gap states it in its own *Gaps in the DS* section
and links to the entry there, so one queue holds the full request text.

Product-wide inventory and priority (what to add, what to merge in the app, what to
leave alone): [ds-product-audit.md](ds-product-audit.md). That file does not replace
the request queue; it ranks it against what the running app actually uses.

Screenshot map of the same findings (advocate vs court, copied queues, teal, filters):
[ds-inconsistencies-visual.md](ds-inconsistencies-visual.md).

## Grouped panels in Dristi

Follow DS Laws (“Grouped content gets a border”) and `AGENTS.md`:

- Case facts → synced `Card` + `DescriptionList` (include hearing + court when known).
- Compare paths → `Accordion` inside `Card`; open the first path by default.
- Onboarding modal body uses **`bg-muted` (neutral-2)** as the stage; stroked
  panels stay default **`bg-card` (neutral-1)** so the fill reads against the stage.
  Preferred DS recipe for multi-panel dialogs/wizards going forward; flat pages stay
  neutral-1. Do not use unbordered `bg-muted` as a panel stand-in.
- Nested media wells → `bg-surface-sunken` inside the Card.

Flow-specific notes:
[`apps/dristi-app/src/components/accused-onboarding/DS-FINDINGS.md`](../../apps/dristi-app/src/components/accused-onboarding/DS-FINDINGS.md).

## Agent rails

| Kind | Cursor | Claude |
|---|---|---|
| Always-on gate | `.cursor/rules/pucar-design-system.mdc` | `.claude/rules/pucar-design-system.md` |
| Propose UI | `.cursor/skills/propose-ui-brief/` | `.claude/skills/propose-ui-brief/` |
| Build UI | `.cursor/skills/pull-ui-from-ds/` | `.claude/skills/pull-ui-from-ds/` |
| Review UI | `.cursor/skills/review-ui-ds/` | `.claude/skills/review-ui-ds/` |

**Design roles.** Three principal-level roles, mirrored across both tools. Claude Code
runs them as subagents (own context window, tool grants enforced); Cursor runs them as
manually-invoked role rules.

| Role | Job | Claude | Cursor |
|---|---|---|---|
| **UX Designer** | Decides a feature's job, layout, hierarchy, spacing, and DS components **before** code; writes one brief per feature to [design/proposals/](proposals/) | `.claude/agents/ux-designer.md` | `.cursor/rules/role-ux-designer.mdc` |
| **UI Designer** | Builds — syncs primitives, composes screens, implements a brief or a fix list | `.claude/agents/ui-designer.md` | `.cursor/rules/role-ui-designer.mdc` |
| **UI Reviewer** | Audits built UI against the DS gate, Laws, accessibility, and copy — reports, never fixes | `.claude/agents/ui-reviewer.md` | `.cursor/rules/role-ui-reviewer.mdc` |

All three pin `model: opus` on the Claude side. Each carries explicit judgment rules —
restraint over addition, cite-the-rule-or-own-the-taste, severity calibration, escalate
rather than improvise — not just procedure.

Each role wraps the skill for its stage — **the skill is the workflow, the role is the
judgment.**

**Why only three.** A role earns its place through a distinct *decision* and a distinct
*tool boundary*, not a distinct title. Two others were considered and deliberately folded
in rather than built: a **VP of Product** role, whose "don't invent scope or personas"
concern is already a repo-wide rule (`CLAUDE.md`, `open-questions.md`) enforced at every
stage; and a **Principal UX Writer**, whose copy concern became the UI Reviewer's copy
pass — sentence case, terminology, and no claimed system behaviour the product docs don't
support. Split either out when it has enough standalone work to justify a cold context of
its own. Portfolio-level questions (recurring DS gaps across briefs, cross-screen
coherence) are episodic and belong in a future sweep skill, not a standing role. Roles and skills are mirrored across both tools; `npm run check:rails` fails
if the two copies drift, and also fails if `ui-reviewer` is ever granted `Edit`/`Write`.

**What is actually enforced.** Agent frontmatter grants *tools*, not paths — so be precise
about which boundaries are real:

| Boundary | Enforced? |
|---|---|
| `ui-reviewer` cannot Edit or Write | **Yes** — both tools withheld at the harness level |
| `ux-designer` cannot Edit | **Yes** — tool withheld |
| `ux-designer` writes only to `docs/design/proposals/` | **No** — instruction only; `Write` is unrestricted |
| `ui-designer` confines changes to `apps/dristi-app` | **No** — instruction only |

`check:rails` mechanically asserts the first row, since the reviewer's read-only status is
the basis for trusting it. The path-scoped rows are convention, and the roles say so in
their own text rather than implying a guardrail that doesn't exist. Making them real would
need a `PreToolUse` hook in `.claude/settings.json`.

In Cursor **none** of it is enforced — there are no tool grants — so every boundary is
discipline, noted at the top of each role rule.

Intended loop: UX Designer proposes → UI Designer builds → UI Reviewer audits → UI
Designer fixes. Invoke each by name; there's no auto-pipeline.

Product meaning: [../product/](../product/).

↑ Docs map: [../README.md](../README.md).
