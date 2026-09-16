# Chrome type is 14px
Updated: 2026-09-16
Status: implemented

## Current outcome

Two kinds of chrome that stand over a list now read at `text-body-compact` —
14px/20px — instead of `text-body` (16px/24px). Both came from the owner on the same
day, from screenshots of the real render, and they are one rule: type that names a
control or a destination is chrome, and chrome is 14px.

**Filter-bar labels.** The label over each filter control and the group label over a
date picker.

- Court-side queues: Status / Purpose / Hearing date on
  [hearings-screen.tsx](../../../apps/dristi-app/src/components/employee/hearings-screen.tsx#L380),
  Stage on Schedule, Delay condonation and Other applications, Type / Channel on Sign
  process, Process on Sign forms, Status on Sign orders, the date group labels on Sign
  forms / Sign orders / Sign a diary, Search filings + Claimed by on
  [scrutiny-queue.tsx](../../../apps/dristi-app/src/components/employee/scrutiny/scrutiny-queue.tsx#L251),
  Hearing dates on the bulk-reschedule board.
- Case-detail tabs: Type / Status / Submitted by on Applications, Document type /
  Submitted by on Documents, Type on Hearings.
- [queue-search-field.tsx](../../../apps/dristi-app/src/components/employee/queue-search-field.tsx#L76)
  defaults to 14px, which moves `Search cases` / `Search orders` on all 18 queues that
  compose it. The order composer's `labelClassName` override (caption voice in a ~410px
  panel) still wins through the class merge.

**Tab labels.** Every tab in the product, on both the `TabsTrigger` primitive and the
one hand-built strip.

- The eight case-file section tabs, via `STRIP_ITEM` in
  [case-section-tabs.tsx](../../../apps/dristi-app/src/components/cases/case-section-tabs.tsx#L35)
  — which also feeds the `Link` branch that draws the same row when a section cannot
  use `TabsTrigger`, so both branches moved together.
- Court-side queue stage tabs on Sign process, Sign orders, the scrutiny queue and the
  bulk-reschedule board; the filings-dashboard queue tabs; the Documents-tab switcher;
  the hearing-record dialog's Transcript tabs.
- The round-selector pills in
  [case-service-of-process.tsx](../../../apps/dristi-app/src/components/cases/case-service-of-process.tsx#L332)
  — a `role="tab"` strip built by hand rather than from the primitive.

Every other tab in the product was already 14px, inheriting `text-sm` from the DS
`TabsTrigger` or setting `text-body-compact` explicitly. Those were left alone: they
render at the target size, and the typography gate exempts the primitive's own
internals. So the product is consistent in size while two spellings of 14px remain in
the source.

Control text is untouched throughout — this was about the label above or beside a
control, not the value inside it.

## Decisions

| Date | Decision and reason | Source/person | Status |
|---|---|---|---|
| 2026-09-16 | Filter-bar labels are 14px across the product. The owner read the Stage / Search cases row against the Status / Purpose / Hearing date row and judged 16px too loud for chrome above a dense table — the labels competed with the page heading instead of naming controls. | Owner, with both renders | Implemented |
| 2026-09-16 | Tab labels are 14px across the product, same reasoning, from screenshots of Sign process (five stage tabs) and Sign orders (Pending signature / Draft orders). | Owner, with both renders | Implemented |
| 2026-09-16 | Applied as the named DS role `text-body-compact`, not a raw size. `check:typography` refuses raw Tailwind sizes in product composition, and the role's 20px line box keeps every label in a filter row on one line height. | Coordinator (implementation choice) | Implemented |
| 2026-09-16 | Scope held to chrome. Form field labels — filing forms, application-type fields, the signing dialogs, `add-*`/`edit-*` dialogs — stay at 16px. Those are the body of a form a person fills in, not chrome over a list. | Coordinator (reading of "these sections") | Implemented |
| 2026-09-16 | Reversal: `STRIP_ITEM` in `case-section-tabs.tsx` carried `text-body` on the stated reasoning that "these are screen copy rather than control chrome". That reading is set aside — a tab is chrome whichever way its label reads, and eight of them at 16px sat too close to the case heading. The old reason is preserved in the file's comment beside the new one. | Owner's rule over a prior implementation note | Implemented |

## Changes and tradeoffs

**This overrides DS typography guidance, deliberately.** The DS typography page assigns
*Body Medium* (`text-body font-medium`) to "field labels in horizontal rows", which is
exactly a filter bar's shape, and describes `text-body-compact` as "dense staff tables
— opt-in, never citizen-facing default". The court-side queues are dense staff tables
and sit squarely inside that opt-in; the case-detail tabs are advocate-facing and sit
above the same kind of table, which is the weaker half of the claim. The owner asked
for one size on both, and one rule that holds everywhere beats two that differ by who
is looking.

Worth a DS request if this should become a system rule rather than a Dristi override.
The DS has no role today for *type that names a control or a destination* as distinct
from *a label on a form field*, and that is the distinction being drawn here. Not
filed: `ds-requests.md` is a shared append-only queue and the owner has not asked.

**A latent inconsistency this did not touch.** The case-detail tabs put `text-body`
(16px) on their `SelectTrigger` and `SelectItem`s, while the court-side queues use the
DS default (14px). So the case tabs now read a 14px label over a 16px value, and the
court-side queues read 14 over 14. Pre-existing, and control text is a separate
decision, so it was left for the owner.

**Two small dimension changes, both benign.** Tab strips are fixed `h-10`, so the tabs
did not move; the `RoundTab` pills in Service of process were 42px on their own content
(24px line + 16px padding + 2px border) and are now held at 40px by their existing
`min-h-10`, which keeps ACCESSIBILITY §8 and puts them back on the control ladder.

**An alignment improvement, unplanned.** `tailwind-merge` drops the DS `Label`'s
`text-sm leading-none` and `FieldLabel`'s `leading-snug` when a `text-*` role is passed
in, so every label in a filter row — DS `Label`, DS `FieldLabel`, and the raw `span` /
`label` group labels — now resolves to one 14/20 line box. Before, the roles disagreed
(`leading-snug` at 16px gave 22px against the role's 24px), and rows mixing a `Select`
label with a date-group `span` carried two different label heights under
`sm:items-end`.

## Verification and open work

Verified against the running dev server in this checkout (`localhost:3000`, Next 16),
not by reading source alone:

- **Filter labels:** 17 court-side routes and the three case tabs with filter bars all
  serve `text-body-compact`, no 16px stragglers.
- **Tabs:** 24 top-level routes plus all ten case sections swept. Every tab and
  `role="tab"` element serves at 14px — `notice-process-status` shows 12 (eight section
  tabs plus four round pills), Documents 10, Sign process 5, Sign orders 2.
- Served CSS confirms `.text-body-compact { font-size: .875rem; line-height: 1.25rem }`,
  and the served DOM confirms no competing `leading-*` class survives the merge.
- `npm run lint` in `@pucar/dristi-app` — eslint plus `check:tokens`,
  `check:typography`, `check:ui-sync`, `check:spacing`, `check:table-rows` — passes with
  0 errors. `tsc --noEmit` reports nothing in any touched file. DS verified against the
  pin (`e0cadea6b9d4`) with `check:ds-fresh` before the work.

**A method note worth keeping.** The first source scan for tab sizes missed the eight
case-file section tabs, because their class comes from the `STRIP_ITEM` constant rather
than an inline string — a regex over `<TabsTrigger …>` cannot see it. The served DOM
found them. A source scan for a style sweep has to resolve class constants, or be
checked against the render.

**Not verified:** no pixel screenshot. There is no browser driver in this environment,
so the render was confirmed through served markup and computed CSS rather than by
looking at it. Client-only surfaces that never reach the SSR HTML — the hearing-record
dialog, `add-advocate` / `join-case` / bail dialogs, the order composer's panel tabs,
case peek — were checked in source only.

**Not independently reviewed.** No `ui-reviewer` was tagged, so the coordinator that
built this also checked it.

**Open:** whether the case-detail tabs' 16px control text should come down to match,
whether to normalise the `text-sm`-inheriting tabs onto the named role for one spelling
in the source, and whether to raise the DS request for a chrome-type role.
