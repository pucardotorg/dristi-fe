# Historical craft research — optional diagnostic context

These are past measurements and design influences, not current requirements. Read only
when explicitly investigating this history. Re-measure against the pinned DS and current
theme before using any number or rule in a decision.

## Measured ground truth

WCAG relative-luminance contrast vs `--card` (`#fcfcfd`):

| Token | Value | Contrast | Note |
| --- | --- | --- | --- |
| `--border` (neutral-8) | `#b9bbc6` | 1.86:1 | Radix's "strong border" step; darkest non-text mark on screen |
| neutral-7 | `#cdced6` | 1.53:1 | Radix "UI element border" step |
| `--sidebar-border` (neutral-6) | `#d9d9e0` | 1.37:1 | Radix "subtle border" step — DS already uses it for the chrome seam |
| `--border-hairline` (10% neutral-12) | ≈`#e6e6e7` | 1.22:1 | The DS's named faintest divider |
| `--surface-sunken` | `#f4f4f7` | 1.07:1 | Tuned 2.5-step well |
| `--muted` / `--surface-raised` (neutral-2) | `#f9f9fb` | 1.03:1 | Invisible without an edge — hence the panel-border Law |
| `--muted-foreground` (neutral-11) | `#60646c` | 5.79:1 | Comfortably AA on card and on sunken (5.41:1) |
| `--input` (neutral-9) | `#8b8d98` | 3.22:1 | The enforced control-edge minimum |

Shadows are already premium-shaped: dual-layer ambient+key at 4–18% black alpha
(`shadow-raised` 0 1 2 / 0 1 3; `overlay` 4 8 −2 / 2 4 −2; `modal` 16 32 −8 /
6 12 −6), theme-bound. Misuse (nesting, decorating flat Cards) is the risk, not the
values.

Gate behavior (verified by running `check:tokens` / `check:typography` on a probe
file): opacity modifiers on semantic tokens — `border-border/50`,
`text-muted-foreground/70`, `bg-card/80`, `divide-border/40` — all pass mechanically.
They are still the wrong move: AGENTS.md rule 10 ("use the token the role names") and
the alpha-discipline Law mean the faint-stroke role is spelled `hairline`, not an
ad-hoc modifier.

## Source canon, condensed

**Refactoring UI** (Wathan/Schoger): borders are one of many separators and the most
expensive — prefer spacing, background contrast, or shadow; de-emphasize competitors
instead of emphasizing the focal element; hierarchy via weight and color before size;
labels are a last resort — let format and position identify data; don't use grey text
on colored backgrounds, derive the muted color from the background's own hue (the DS's
`*-muted-foreground` pairs encode exactly this); shadows as two parts, ambient + key.

**Practical Typography** (Butterick): line-height inversely proportional to size (the
DS scale encodes 1.17 at display down to 1.33 at caption); tracking tightens as size
grows and never tightens at small sizes; "tabular figures are essential for …
vertically aligned columns"; point size / line spacing / line length / font are the
four body-text levers.

**Elevation practice** (Material, Apple HIG, Stripe/Linear-style SaaS): 2–3 layered
shadows at 10–25% alpha; pure black at high alpha reads synthetic; never border +
shadow both at full strength; shadow tint toward the surface's hue reads organic.

**Concentric radius** (Cloud Four et al.): inner radius = outer radius − padding;
equal nested radii make inner corners bulge. Mapped to the DS ladder
(4/6/8/10/14/18/22/26), round the result down; inner < outer always.

**Reference render** (Google Calendar day view, the quality bar this skill was
calibrated against): zero visible borders — surfaces separate by background value;
exactly one saturated focal card; one solid pill action; radii ~16–24px; two text
colors and barely two weights; whitespace dominates. Every mechanic has a direct DS
vocabulary equivalent: value separation = surface ladder, focal card = `brand-muted`
hero, pill action = rationed `bg-primary`, quiet metadata = `muted-foreground`.

**Anthropic frontend-design skill**: restraint concentrated in one signature element;
critique on the render, not the source; the Chanel pass — remove one accessory before
leaving the house; copy is design material (sentence case, active voice, exact verbs).

## How this coexists with the DS Laws

The Laws that look like they conflict with the border canon do not:

- "Grouped content gets a border" exists because `bg-card` equals the page background
  (1.00:1) — the border is the only thing making a panel a panel on a flat stage. The
  craft rule therefore protects the *panel edge* and spends its skepticism on every
  other stroke: internal dividers, row rules, seams between differently-filled
  regions.
- "Depth is fill, not borders" (elevation page) is the same instinct as "borders
  last": nested wells are borderless sunken fills, and the box-in-box ban forbids
  border+fill double-signaling.
- "No alpha status fills" bans faking status tints with `/10` modifiers; it does not
  ban the DS's own alpha hairline, which exists precisely so faint neutral strokes
  don't require inventing one.

When the tension is real — e.g. `--border` at neutral-8 makes even the sanctioned
panel edge the loudest mark on a quiet screen — the resolution is upstream retuning
(the current DS policy), never a local workaround.
