# Verification and evidence

The executable command lists live in `.agents/verification.json`. Run profiles from
the repository root; no profile starts a server or installs dependencies.

| Change | Command / evidence |
|---|---|
| Agent policies, roles, skills, generator or checker | `npm run verify:agents` |
| UI implementation | `npm run verify:ui` plus affected behavior/render checks |
| Application behavior | Relevant tests; `npm run test:app` runs the existing app suite |
| Build-sensitive changes | `npm run build` in an isolated checkout when needed |

Do not run app build/tests for instruction-only edits. Do not rerun all tests after a
successful unchanged check without a new failure or relevant change. Preserve all
existing DS checks; never alter baselines or narrow a failing check merely to pass.

## Evidence belongs to a state

Record the command, result, checkout, checked revision/diff, and relevant DS pin or
dependency state in the task. A reviewer may reuse these results when those inputs are
unchanged; it must still independently inspect acceptance criteria and the implementation.
Rerun affected checks after relevant source, configuration, dependency, or DS changes.
If state cannot be established, the evidence is stale.

Inspect changed UI at desktop and about 375px, in both themes, using relevant empty,
loading, error, partial-data, long-label/language, keyboard, and recovery cases. Select
states that apply; do not invent artificial states for static copy. Confirm the running
server serves the checked checkout, following `.agents/policies/dev-server.md`.

## Boundaries and completion

The Codex UX/reviewer adapters request a read-only sandbox; live runtime settings can
override defaults. Claude UX/reviewer adapters omit shell and write tools. Cursor role
rules are instructions, not a filesystem sandbox. Do not claim harness enforcement
without inspecting the effective environment. Skills do not authorize bypassing a role's
read-only responsibility. Checks needing writes or unavailable tools go to the coordinator
or builder, with evidence returned to the reviewer; never weaken restrictions to run them.

Report implementation, automated checks, render/behavior verification, and history
updates separately. A clean source review with no available render is **verification
pending**, not approval to ship. Label pre-existing failures and incomplete checks
honestly. Suggestions do not block a result that meets all acceptance criteria.
