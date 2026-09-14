# Pencil import and review


The overlay above is the light lane (comments, copy, quick tweaks). When the
owner wants to redesign — move things, restyle broadly, add/remove elements —
import the screen into the Pencil desktop app and audit the edits back.
Everything made in Pencil is a **review artifact, never the design of record**
(the `docs/design/explorations/` rule applies; artifacts live untracked in
`docs/design/explorations/pencil/<route-slug>-<date>/`).

### Import ("import this screen to pencil")

1. Discover available Pencil tools and read their current schemas before using the
   example calls below. If unavailable, report the missing capability; do not invent
   a successful import. Preconditions: the correct checkout is served; the Pencil desktop app is
   **`Pen.app`** — `open -a Pen`. The MCP additionally needs a .pen file OPEN
   in the editor ("A file needs to be open" error otherwise) and cannot create
   one: ask the owner to hit ⌘N in the app (or open an existing artifact),
   ideally saved to the artifact folder. Then, MANDATORY before any other
   pencil call: `get_app_state({include_schema:true, include_canvas_design:
   true, include_scripts_and_shaders:false})` and the relevant
   `get_guidelines`.
2. Extract the rendered screen: open the route in the Browser pane and run
   `/design-export.js` (inject the script, call `window.__dmExtract()`), which
   returns a JSON tree — bounds, flex facts, fills, borders, radius, font
   facts, text, `data-slot`, and a `cssPath` selector per node. Save it as
   `baseline.json` in the artifact folder.
3. Import natively — Pencil's integrated browser does the conversion:
   `browser({action:"load-page", url:"http://localhost:3000/<route>"})`, then
   `browser({action:"import-to-canvas", target:"query",
   querySelector:"main"})` (import `aside` separately if the rail matters).
   The result names the imported top-level frame id; each node's `context`
   carries the source tag/component. Only fall back to hand-building frames
   from `baseline.json` via `execute` if native import fails.
4. **Create the pair BEFORE handing over — this is the step that makes the
   whole lane work, and skipping it silently destroys the diff.** Duplicate the
   imported frame via `execute` into `BASELINE — <route> — <date>` (reference;
   tell the owner not to touch it) and `EDIT — <route>`, side by side.
   Screenshot the EDIT frame next to the live screen and get the owner's
   fidelity nod. **Never tell the owner to start editing until both frames
   exist and `baseline.json` is saved.** If an import has to be redone (wrong
   width, wrong selector), redo the pair too — deleting the frames leaves the
   owner editing against nothing, and the review degrades to guesswork over
   screenshots. If you find yourself with edits and no baseline, say so plainly,
   import a fresh baseline beside the edited frame, and flag every finding that
   import differences could explain as ambiguous rather than asserting it.
   `baseline.json` (step 2) stays the value ground truth for the diff: Pencil's
   import may normalise values, so BASELINE-vs-EDIT gives *what changed* and
   baseline.json + live computed styles give *from what*.
5. Hand over: the owner edits the EDIT frame only, then says
   "review my pencil changes".

### Review ("review my pencil changes")

1. Read both frames via `execute` Get-visitors; align nodes by selector-name
   (fall back to geometry for renamed nodes; report unmatched as "unmapped",
   never guess). Classify: property change / text change / deleted / added /
   moved.
2. **Anchor every value to the DS** — this is the contract: choose colors by semantic role from
   the current DS and `apps/dristi-app/src/app/globals.css`, not just channel distance;
   spacing/radius/size to the nearest ladder step or type role. Log every
   rounding in the audit line (`13px → 12px · gap-3`). Raw values never enter
   the code.
3. Audit each change with the same rules as the report lane (and ui-craft +
   relevant UX reasoning lenses), verdict per item:
   - `healthy-local` — screen-level composition change, DS-legal
   - `use-variant` — an existing DS variant/size already expresses it
   - `upstream-DS` — targets a `[ds:*]` primitive's internals or a token value:
     a proposal for the owner, never a local override
   - `declined` — conflicts with a DS law or craft rule (state which)
4. Post a numbered audit. For a review-only request, wait for the owner to select
   items ("apply 1, 3, 5"). If implementation is already authorized, apply the clear
   in-scope items and ask only about unresolved choices. Implement authorized items, at the owning layer
   (component / content file / data — one instance edited means the owner layer
   changes once and every instance follows; copy is bilingual). `upstream-DS`
   items go to `docs/design/ds-requests.md` as gaps, not into application code.
5. Finish exactly like the report lane: `check:ds-fresh` before edits, then
   verification per `.agents/policies/verification.md`, and the applied / translated /
   declined summary.
