---
name: design-review
description: "Start an in-app Dristi annotation session or apply the owner's design feedback. For explicit Pencil requests, import and compare editable artboards before applying authorized changes."
---

# Design review — point, edit, comment, then implement the agreed changes

The overlay is `apps/dristi-app/public/design-mode.js` (invoke-only review
tooling, zero deps, never bundled); `src/components/design-mode-loader.tsx`
loads it in dev when the URL carries `?design=1`. Full usage:
`docs/design-mode.md` (repository root).

## Starting a session

1. **Server**: check `http://localhost:3000` responds. If not, ask the user to
   run `npm run dev` in their own terminal (never start it yourself — see
   `.agents/policies/dev-server.md`).
2. **Tool present on this branch?** Check the design-mode script and loader wiring.
   Do not overwrite files from another branch to start a review. If missing, use the
   documented console fallback where available, or propose a scoped tooling change in
   this checkout. Confirm the running server serves this checkout before relying on it.
3. **Hand over the link**: `http://localhost:3000/<route>?design=1` — the route
   the user named, else the screen under discussion, else `/advocate`. Tell
   them: annotate (Select to tweak/delete/duplicate/auto-layout, double-click
   to edit copy, Comment to pin notes), then **Copy for Claude** and paste the
   report here. Off = the panel's Close button or `?design=0`.

## Implementing a pasted DESIGN MODE REPORT

The report is owner intent, not literal CSS. Apply only changes the user authorized. Before editing, load
`pull-ui-from-ds` and `ui-craft` (mandatory), and run `npm run check:ds-fresh`.

- **Style edits** (`[font-size] 24px → 18px`, `[padding] …`): map the target
  value to the nearest DS type role / spacing-ladder step / token — never copy
  raw pixel values or hex into the code. If the mapped value differs from the
  asked one, say so when reporting.
- **`{ds:<slot>}` tags — the design-system guardrail.** An entry tagged with a
  data-slot targets a synced DS primitive. NEVER restyle the primitive locally
  or hand-edit it: either an existing variant/size already expresses the ask
  (use it), or this is an upstream design-system change — record it as a DS
  proposal (token, measured value, where it shows), put it to the owner, and
  only change the DS via its own repo + `ds:bump` flow. Local screen overrides
  of primitive internals are the defect this tag exists to stop.
- **One instance edited = the owning layer changes.** An edit on one card,
  row, or name is a request against whatever owns it — the shared component,
  the content file, or the seed data — so the change lands once at the source
  and every instance updates. Never fork a single instance to match the
  report; find the owner (component prop/class, `content.ts` copy, fixture
  data) and change it there.
- **`[text]` edits**: new copy, verbatim — but bilingual: update both `en` and
  `ml` in the content file, flagging drafted Malayalam for review.
- **`[delete]`**: the element did not earn its place — remove it from the
  composition (not `display:none`), and take dependent logic/copy with it.
- **`[duplicate]`**: the owner wants another of these in the stack — usually a
  data question (one more item, one more action), not a copy-paste of JSX.
  Read what the element renders and extend the source accordingly.
- **Auto-layout edits** (`[display] flex`, `[flex-direction]`, `[gap]`,
  `[align-items]`): restructure with the codebase's layout idioms (flex + gap
  on the ladder), not inline styles.
- **Comments**: feedback to evaluate against the active task agreement and relevant
  design reasoning. If a comment conflicts with a DS law, do what the law allows
  and flag the tension rather than silently ignoring the note.
- **Box comments** (`[box W×H at x,y] region near …`): the note is about a
  region, not one element — read the area's composition, not just the selector
  hint. **Reference images** (`dm-ref-N.jpg`) were auto-downloaded on the
  user's machine when they copied the report; if the paste mentions one that
  is not attached, ask for it before acting on that comment — it is the visual
  spec for that note.
- The selector in each entry locates the element; the quoted label confirms
  you have the right one. Selectors are brittle across edits — resolve them
  against source components, don't grep for the selector string.

After implementing: follow `.agents/policies/verification.md` for UI checks,
relevant behavior tests and live-render verification, and summarise what was applied
as-asked, what was translated (and to which token), and what was declined and
why. Offer another round.

## Pencil work

For an explicit Pencil import or review request, read the skill-relative
[Pencil workflow](references/pencil.md). Do not load it for an ordinary overlay session.
