# Design mode — annotate and tweak the running app

An invoke-only overlay for design review: inspect any element, tweak type /
color / spacing live, edit copy in place, delete or duplicate elements, turn a
box into an auto-layout stack, pin numbered comments — then press **Copy for
Claude** and paste the report into the chat for fixes.

It is a single static file, [`apps/dristi-app/public/design-mode.js`](../apps/dristi-app/public/design-mode.js),
with zero dependencies, **never bundled by the app**. Nothing runs until you
invoke it.

## Invoking it

**Easiest — ask the agent:** run `/design-review` (or say "start review") and
it checks the server, hands you the link, and implements your pasted report.

**By URL:** open any route with `?design=1`, e.g.
`http://localhost:3000/advocate?design=1`. That turns it on for the tab (it
survives reloads); `?design=0` or the panel's *Close* button turns it off.
Dev-only — production builds compile the loader out.

**Fallback (branch without the loader):** paste this in the DevTools console:

```js
var s=document.createElement('script');s.src='/design-mode.js?t='+Date.now();document.body.appendChild(s);
```

## Using it

- **Browse** — the app stays fully interactive; use it to navigate.
- **Select** — hover highlights, click inspects, **double-click text edits it
  in place**. The panel offers:
  - *Text*: font size, weight, color.
  - *Box*: fill, padding, margin, radius, and a free `prop: value` field.
  - *Structure*: **↑ Parent** climbs to the container, **Duplicate** clones the
    element in its stack (a static copy — its buttons are inert),
    **Delete** removes it (hides + logs), **Undo** steps back.
  - *Stack*: identifies whether the element is a flex/grid stack; **Make
    auto-layout** turns it into one; direction / gap / align / justify controls
    appear for flex stacks.
- **Comment** — click an element to pin a note on it, or **drag to draw a
  box** over a region and annotate that. Either kind can carry a **reference
  image** (the file input in the note). Numbered pins mark both.
- **Copy for Claude** — puts a structured report (every edit as
  `before → after` with its selector, every comment) on the clipboard **and
  downloads any reference images** as `dm-ref-N.jpg`. Paste the report into
  the chat and attach the downloaded images; the agent translates values to
  design-system tokens and implements.

Selecting inside a DS primitive shows a **DS primitive** badge and tags the
log entry `{ds:<slot>}` — those edits are routed to the design system (variant
or upstream proposal), never applied as local overrides. And an edit on one
instance of a repeated element is implemented at the layer that owns it
(shared component, copy file, or data), so every instance updates.

Edits and comments persist per-page in `localStorage`; **Clear all** wipes the
page's slate.

## The Pencil lane — heavier edits

The overlay is the **light lane** (comments, copy, quick tweaks). For real
redesign work — moving, restyling, adding/removing elements — say **"import
this screen to Pencil"** (or press the panel's *Import this screen to Pencil*
button and send the report). The agent extracts the rendered screen (via
[`design-export.js`](../apps/dristi-app/public/design-export.js)) and rebuilds
it in the Pencil desktop app as two artboards — **BASELINE** (reference, don't
touch) and **EDIT** (yours). Edit freely, then say **"review my pencil
changes"**: every changed value is anchored to the nearest design-system token
or ladder step (each rounding logged, e.g. `13px → 12px · gap-3`), and each
change is audited — healthy-local / use-existing-variant / upstream-DS-proposal
/ declined-with-reason — as a numbered list. You pick ("apply 1, 3, 5"); the
agent implements at the owning layer. Pencil files are **review artifacts,
never the design of record**; they live untracked in
`docs/design/explorations/pencil/`.

## SOP — the repeatable review loop

**Which lane**

| Use | For |
|---|---|
| **Design mode** (`?design=1`) | Comments, copy tweaks, "this feels wrong", reference images. No setup. |
| **Pencil** | Restructuring — regrouping, re-aligning, moving, auto-layout. |

**The Pencil loop**

1. **You:** "import `<route>` to Pencil".
2. **Agent setup — non-negotiable:** import once, then create **BASELINE**
   (locked, never touched) **and EDIT** (yours) side by side, and save
   `baseline.json` at that viewport — *before* handing over. A canvas handed
   over without its BASELINE twin cannot be diffed precisely; call that out.
3. **You edit the EDIT frame only.** Take as long as you like.
4. **You:** "review my pencil changes". No export step — the agent reads the
   live file. Partial passes are fine; just don't pick unfinished items.
5. **Agent returns a numbered audit**: every value anchored to a DS token with
   the rounding shown (`13px → 12px · gap-3`), each item verdicted
   `healthy-local` / `use-variant` / `upstream-DS` / `declined`.
6. **You:** "apply 1, 3, 5". Nothing reaches code unpicked; `upstream-DS`
   items always wait for a separate explicit call.
7. **Agent implements at the owning layer** — shared component, `content.ts`,
   or data, so one edit propagates to every instance — then runs the gates and
   tests **and verifies responsiveness and click-through on the live app**.
   That last step is the only place "did anything break" is actually answered;
   a `.pen` file has no breakpoints and no handlers.
8. **Next round:** re-import fresh. Once code changes, the old artboard is
   stale by definition.

**Rules that make it scale**

- Edit **one** instance, not five — the agent resolves it to the component.
- Notes typed onto the EDIT frame arrive in the diff as added nodes and are
  treated as comments.
- Pencil files are review artifacts, untracked, never the design of record.

## Honest limits

- Edits are inline styles on the live DOM: a React re-render can revert what
  you see (the report still records your intent), and elements reflow — this
  is not a free-drag canvas.
- Duplicated elements are static copies; their interactive parts are inert.
  The duplicate is a request ("one more of these"), which the agent implements
  properly at the source.
- The tool styles itself and touches no design-system code; the DS gates do
  not scan it (review tooling, not product UI).
