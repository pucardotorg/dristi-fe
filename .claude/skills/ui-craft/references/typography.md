# Typography guidance

Recheck numeric values and font behavior against the current pinned DS; past measurements
are diagnostic context, not permanent overrides. Read this when choosing text hierarchy.


Prefer two weights per component where DS role requirements permit; DS weight floors win. Muted = `text-muted-foreground` (5.79:1 —
never invent a lighter grey). All headings require `font-semibold` (gate-enforced).

| Role | Size | Use | Weight | Color layer | Extras |
| --- | --- | --- | --- | --- | --- |
| `text-display` | 48/56 | Marketing/empty-shell hero only | 600 | foreground | `tracking-tight` |
| `text-display-s` | 40/48 | Rare page hero | 600 | foreground | `tracking-tight` |
| `text-title-l` | 32/40 | The page title (one per screen) | 600 | foreground | `tracking-tight` allowed |
| `text-title` | 24/32 | Focal card / section hero title | 600 | foreground | `tracking-tight` allowed |
| `text-title-s` | 20/28 | Section headings above a group of cards; sheet titles | 600 | foreground | — |
| `text-body` | 16/24 | Citizen-facing copy default; **card/panel titles at 600** (the Card master's own `text-base`) | 400; 500 for field labels; 600 for card titles | foreground; muted for support | — |
| `text-body-compact` | 14/20 | Dense staff tables/rows — opt-in only | 400; 500–600 for the row's ONE emphasized cell | foreground / muted | never citizen default |
| `text-caption` | 12/16 | Metadata, timestamps, eyebrows | 500 (weight floor); 600 only for eyebrow section labels | muted; status via `*-ink` | never tracked tighter |
| `font-mono` | at body-compact/caption | CNRs, codes | 400–500 | muted unless focal | `tabular-nums` implicit-check |

**Scale discipline (measured 2026-08-17):** the shipped stack (`"Helvetica Neue"`) has no
600 face on macOS, so every `font-semibold` renders as **Bold**; on Windows it falls to
Arial (400/700). Big semibold headings therefore read heavier than the Figma/Inter
intent. Until the DS retunes the stack (see `docs/design/ds-diagnosis.md`), keep form
screens at the demo's scale — page title `text-title` (24), card titles `text-body`
600 (16), labels 14/500 — and do **not** step titles up to compensate for weak
hierarchy; fix hierarchy with colour and spacing.

Numbers: `tabular-nums` on anything columnar or compared (item numbers, dates, counts,
amounts). Currency and counts right-align in tables. One `font-semibold` number per
card is emphasis; five is noise.
