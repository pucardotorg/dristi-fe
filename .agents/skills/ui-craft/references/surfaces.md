# Surfaces and repeated content

Read when composing panels, tables, rails, or repeated cards. The owner adopted the
beige canvas and lifted panels on 2026-09-11. This is a product composition convention,
subordinate to the pinned DS and an explicitly approved task reference.

- Work canvas: `bg-muted dark:bg-background`. Chrome: `bg-card`; rails: `bg-sidebar`.
  Panels: the existing `PANEL_CLASS` recipe in
  `apps/dristi-app/src/components/filing/form-card.tsx`, using a hairline and raised shadow.
  Reuse the shared recipe rather than copying class strings.
- Wells: `bg-surface-sunken` inside panels. A sunken well directly on the muted canvas
  can disappear; preserve a panel or another appropriate boundary between them.
- Use spacing, fill, then justified elevation before adding a divider. Chrome seams and
  internal row rules use hairlines or no stroke; control edges use the DS input token.
  Do not combine a full-strength border and shadow or nest raised shadows unnecessarily.
- Shadows and radius follow DS roles. Inner corners should fit their padded container;
  check the current DS ladder rather than treating historical pixel measurements as law.
- Tables use `apps/dristi-app/src/components/chrome/table-plate.ts`. Reuse header/cell/row
  helpers; fills for rounded rows go on cells. Never create a private table treatment.
- Match the same fact and interaction across affected siblings. Different semantics may
  warrant different emphasis. Preserve consequential warnings even in dense lists.
- Status notices use the relevant Alert variant and its foreground pair. Neutral guidance
  uses neutral treatment. Avoid ad-hoc alpha and grey text on tinted status backgrounds.
- Prefer one clear primary action per meaningful region, following the DS and the task's
  action scope. Do not move or hide an action just to satisfy a screen-wide color quota.
- Hover-revealed actions also reveal on focus-within and remain discoverable on touch.
  When replacing a status slot with actions, preserve access to consequential status.
- Repeated rows should prioritize useful content and their main action; secondary actions
  can be quieter without losing accessible names. Collapse persistent rails in place when
  that is the agreed interaction, rather than silently substituting a disappearing overlay.
- Align shared horizontal rules and numeric columns; avoid doubled seams and shifted
  underlines. Decorative icons follow the text line's color/size and have no semantic role.

If a token value or primitive API prevents the agreed result, report a concrete upstream
DS gap. Do not locally adjust token values or restyle primitive internals. Re-measure any
contrast claim against the current pin and theme before using it in a finding.
