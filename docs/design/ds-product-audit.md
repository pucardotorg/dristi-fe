# Dristi × Design System — product audit

**Date:** 2026-09-17
**DS pin:** `e0cadea6b9d4` ([`ds.lock.json`](../../ds.lock.json) → [pucardotorg/dristi-design-system](https://github.com/pucardotorg/dristi-design-system))
**Scope:** every major screen and flow in `apps/dristi-app` — advocate/citizen shell, e-filing, cases, tasks, vakalatnama, onboarding/registration/join, court/employee queues, scrutiny workbench, access.
**Not in scope:** modifying the DS, inventing new primitives, or promoting anything on frequency-of-one.

This is a decision surface. It does not enlarge the system. It says what is already complete, what is being worked around, and what should stay product-owned.

Existing queue (do not duplicate work against it): [ds-requests.md](ds-requests.md). That file is the request log; this file is the product-wide inventory and priority.

---

## How to read this

Classification of every pattern:

| Code | Meaning |
|---|---|
| **A** | DS Native — exists in the DS and is used correctly |
| **B** | DS component with customisation — primitive exists; product overrides it |
| **C** | Missing DS component — reusable in product, no DS home |
| **D** | Missing variant or state — base exists; a legitimate extra is missing |
| **E** | Product-specific — should not become a global DS component |
| **F** | Duplicate / inconsistent — same job solved more than once |

Recommendations use: *Add to DS · Add DS variant · Add DS state · Extend existing component · Create reusable pattern · Merge duplicate components · Replace custom with existing DS · Keep product-specific · Needs design review*.

Frequency: **once · occasionally · across several features · product-wide**.

Priority in the inventory matches the backlog: **P0** system inconsistency, **P1** high-value DS addition, **P2** useful extension, **P3** keep product-specific.

---

## 1. Executive summary

Dristi is not inventing a second design system at the primitive layer.

On this pin, `check:ds-fresh`, `check:ui-sync`, `check:tokens`, and `check:typography` all pass. The 57 synced files in `apps/dristi-app/src/components/ui/` match the DS byte-for-byte. There is **no live primitive fork**. The 2026 merge-era `/ds-audit` page (`apps/dristi-app/src/app/ds-audit/`) is stale: the orphans it listed (`compact-segmented-control`, `vertical-stepper`) are gone, and the diverged `DocumentSlot` / `Stepper` extras have already landed upstream.

The actual problem is one layer up:

1. **A handful of primitive APIs are incomplete**, so every consumer rediscovers the same four-line patch (`Alert` always `role="alert"`, `Button` ignores `aria-disabled`, `BreadcrumbLink` has no focus ring, `SelectContent` defaults to covering its own field, `Card` clips sticky descendants, `Sidebar` drops `className` on mobile).
2. **Composition patterns are undocumented**, so features independently rebuild the same product objects: lifted panel, court data table, filter+search bar, sticky action footer, confirm dialog, standing notice.
3. **Chrome has forked by area** (advocate `AppShell` vs court `ChromeShell`) and several wrappers were copied when filing split from shell (`confirm-dialog`, `notices`, `PANEL_CLASS`).
4. **The DS catalog is larger than its documented surface.** `Item`, `Marker`, `Attachment`, `Resizable`, and `NativeSelect` ship in `src/components/ui/` with no `componentRegistry` entry. Product already uses `Item` heavily and `Attachment` in five places; `Marker` is unused.

Do **not** respond by adding twenty new components. Extract the repeated product patterns in Dristi first (court table, filter bar, sticky footer, confirm/notice). Upstream only the primitive API gaps and the two or three compositions that will otherwise be rebuilt in every PUCAR product.

The highest-leverage DS work is closing those API holes so the product can stop patching primitives. The highest-leverage Dristi work is deleting duplicate wrappers and giving court lists one table primitive of their own — in the app, not in the DS.

---

## 2. Current DS coverage assessment

### Mechanical gates (this pin)

| Gate | Result |
|---|---|
| `npm run check:ds-fresh` | Pass — vendor is `e0cadea6b9d4` |
| `npm run check:ui-sync` | Pass — 57 components + `globals.css` match DS |
| `npm run check:tokens` | Pass — no hardcoded colour / raw grey / off-ladder arbitrary |
| `npm run check:typography` | Pass — named type roles outside primitives |

### Catalog vs product

The DS ships **68** primitives. Dristi syncs **57**. The 11 unsynced files are unused here, not gaps:

`bubble` · `button-group` · `carousel` · `chart` · `context-menu` · `direction` · `menubar` · `message` · `message-scroller` · `navigation-menu` · `session-timeout`

Do not sync them until a screen needs them. `ButtonGroup` is the only one that might earn a seat later (action clusters in table rows currently use loose `Button`s).

### What the DS already covers well

Atomic controls (button, input, select, combobox, checkbox, radio, switch, textarea, OTP, slider), overlays (dialog, alert-dialog, sheet, drawer, popover, dropdown, tooltip, hover-card), status (badge, alert, banner, spinner, skeleton, progress, sonner), structure (card, accordion, tabs, table, pagination, breadcrumb, sidebar, separator, empty, field, description-list, item, timeline, stepper, segmented-control, document-slot, attachment, date-picker).

Product uses this catalog heavily and correctly for atoms. Empty states, loading skeletons, toasts, and most form controls are A.

### What coverage looks like from the product's side

| Layer | Coverage | Evidence |
|---|---|---|
| Tokens | Strong, with known elevation/dark-mode limits already filed | `globals.css` matches DS, including `brand-canvas*` |
| Atoms | Strong | 57/57 synced files identical |
| Variants/states | Thin | `aria-disabled`, quiet Alert, wrapping Badge, Select `popper`, Combobox free-text, DocumentSlot actions |
| Composition / blocks | Weak | Panel recipe, data table, filter bar, sticky footer, confirm, standing notice all hand-rolled |
| App chrome | Product-owned, forked | Two shells, two top bars, three breadcrumb architectures |
| Domain objects | Correctly product-owned | Court paper, source panel, scrutiny workbench, case peek |

### Already landed in the DS (do not re-request)

These were open when earlier briefs were written and are **on this pin**:

- `SegmentedControl` with `default` + `compact` (40px hit / 32px well) — replaces the deleted `compact-segmented-control` fork. Request 11's selected-on-track conflict is owned by this primitive.
- `DocumentSlot` `copy`, `quality`, `disabled`.
- `Stepper` `onActivate` / `activateLabel`.
- `brand-canvas*` tokens.
- Registry entries for `field`, `empty`, `input-group`, `toggle-group`, `description-list`, `segmented-control`.

Request 3 is therefore half-closed. `Item` and `Marker` still have no registry page; `Attachment` never did.

---

## 3. Full component inventory

Grouped by job. Same columns throughout.

### 3.1 Actions and form controls

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Button | Product-wide | `Button` | A | Used correctly for primary/ghost/destructive | product-wide | — | — |
| Button `aria-disabled` (connected-later) | `employee/hearing-overview-screen.tsx` (View case); `employee/hearings-screen.tsx` (Join VC) | `Button` | D / B | `buttonVariants` keys off `:disabled` only. Product patches `aria-disabled:opacity-50 aria-disabled:hover:bg-primary aria-disabled:active:translate-y-0` so a Tooltip remains reachable ([ds-requests.md](ds-requests.md) #18) | occasionally | Add DS state | P0 |
| Search as primary teal | Most court queue screens (`register-cases-screen`, `schedule-screen`, sign-* filters) | `Button` | B | Filter submit is the page's only `default` button — legal under one-teal, but Hearings keeps Search secondary and puts Join VC in the header. Inconsistent primary placement | across several features | Needs design review (product, not DS) | P0 |
| Input / Textarea / Checkbox / Radio / Switch / OTP | Filing, registration, join, access | matching primitives | A | — | product-wide | — | — |
| `FormField` kit | `filing/form-field.tsx`; vakalatnama; address/repeat lists | `Field` + `Tooltip` | E / B | Correction/scrutiny posture, defect border, required mark, label tip. ~18 import sites, all filing-adjacent | across several features | Keep product-specific; extract to `components/forms/` if a second flow needs it | P3 |
| `TextField` / `PrefixInput` / `OptionSelect` | `filing/inputs.tsx` | `Input`, `InputGroup`, `Select` | B | Prefill amber + `onViewSource`; `SelectContent position="popper"` | product-wide (filing) | Extend Select default (see 3.2); keep prefill in product | P1 / P3 |
| `ComboField` free-text | `filing/inputs.tsx`; jurisdiction, advocate, repeat-lists, vakalatnama | `Combobox` | D | Typed value kept when no item matches. Dual-controlled `inputValue` ([ds-requests](ds-requests.md) #13) | across several features | Add DS variant (`freeSolo` / `allowCustomValue`) | P1 |
| `DateField` | Filing sections | `DatePicker` | B | ISO binding; prefilled dashed warning button opens source | across several features | Keep product-specific | P3 |
| `IfscField` / pincode lookup | `filing/ifsc-field.tsx`, `address-fields.tsx` | `FormField` + `Spinner` | E | Domain registry lookup | occasionally | Keep product-specific | P3 |
| `Segmented` / `YesNoSegmented` | `filing/segmented.tsx` | `SegmentedControl` | A / B | Thin posture wrapper (lock → `ReadOnlyValue`) | across several features | Keep product-specific wrapper | P3 |
| Direct `SegmentedControl` | Bond signing header; advocate home; top-bar locale | `SegmentedControl` | A | Compact size used as intended | across several features | — | — |
| `YesNoChoice` | `filing/yes-no-choice.tsx` | `RadioGroup` | E | Optional unanswered yes/no — different job from segmented | once | Keep product-specific | P3 |
| `ReadOnlyValue` | `filing/inputs.tsx` | `Input` readOnly | E | Controls without a native read-only state | across several features | Keep product-specific | P3 |
| Label / Field | Registration, join, access (no `FormField`) | `Field` | A | Intentional — flows outside filing kit | across several features | — | — |

### 3.2 Selects, menus, search

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Select (form recipe) | `filing/inputs.tsx` `OptionSelect`; court filters often omit it | `Select` | D / B | DS default `position="item-aligned"` covers the field. Filing forces `popper` + trigger width ([ds-requests](ds-requests.md) #12). Court filters do not always | across several features | Make `popper` the default, or document the form recipe | P0 |
| Dropdown menu | Hearings pass-over; cases column/stage filter; advocate home | `DropdownMenu` | A | — | across several features | — | — |
| Command palette search | `shell/app-search.tsx` | `Command` | A | — | once | — | — |
| Combobox filters | Case documents/applications/orders registers | `Combobox` | A | Select-from-list, not free-text | across several features | — | — |
| Native select | Synced, unused in product screens | `NativeSelect` | A (unused) | No registry guidance | once (none) | Add registry entry; do not force adoption | P2 |

### 3.3 Navigation, chrome, layout

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Advocate `AppShell` | `shell/app-shell.tsx`; layouts for home, tasks, filings, cases, portal, join | `SidebarProvider` | E / F | Planned to migrate onto `ChromeShell`; still a second frame | product-wide (non-court) | Merge onto `ChromeShell` in product | P0 |
| Court `ChromeShell` | `chrome/app-chrome.tsx`; `employee/employee-area.tsx` | `Sidebar` + custom mobile sheet | B / E | Always `collapsible="none"` + private `ChromeRailSheet` because DS mobile branch drops `className`/`style` and loses width ([ds-requests](ds-requests.md) #17, #10) | product-wide (court) | Extend Sidebar (top offset, mobile forwarding, md size, selected token, i18n). Then delete `ChromeRailSheet` | P0 |
| `AppSidebar` vs `EmployeeNav` | `shell/app-sidebar.tsx`, `employee/employee-nav.tsx` | `Sidebar` | F | Two rail row CSS sets (`ROW` vs `RAIL_ROW`); two plate systems (`rail-theme.tsx` vs `rail-plate.ts`) | product-wide | Merge duplicate components (product chrome) | P0 |
| `SectionsRail` | `filing/sections-rail.tsx` | `Button` + `Sheet` + `Progress` — not Sidebar | E | Filing step list; 40px rows, own active tokens | across several features (filing) | Keep product-specific | P3 |
| `IndexRail` | `employee/scrutiny/index-rail.tsx` | `Button` + `Sheet` | E | Bundle index, explicitly not nav styling | once | Keep product-specific | P3 |
| Top bar | `shell/top-bar.tsx` vs `ChromeTopBar` + `EmployeeTopBar` | none (raw `<header>`) | F | Same `h-14 sticky … border-hairline bg-card` recipe, two components. `TOP_BAR_HEIGHT` duplicated in `shell/chrome.tsx` and `filing/chrome.tsx` | product-wide | Merge in product onto `ChromeTopBar` | P0 |
| Bond signing header | `filing/bond-signing-screen.tsx` | — | E | Standalone `h-14` outside AppShell | once | Keep product-specific | P3 |
| Breadcrumb (advocate) | `shell/chrome.tsx` publisher → `TopBar` | `Breadcrumb` | A / B | Context-driven trail; last crumb emphasised | product-wide (non-court) | — | — |
| Breadcrumb (court) | `employee/employee-top-bar.tsx` `courtTrail()` | `Breadcrumb` | B / F | All crumbs muted; `CRUMB_LINK` adds focus ring the primitive lacks ([ds-requests](ds-requests.md) #16) | product-wide (court) | Add focus to `BreadcrumbLink`; then drop `CRUMB_LINK` | P0 |
| Breadcrumb (filing) | `filing/filing-breadcrumbs.tsx` | publisher | F | Third architecture (route math) | across several features | Merge onto chrome publisher | P0 |
| `FilingPageHeader` vs employee `<header gap-2>` vs `CaseHeader` | filing sections; `employee/*-screen.tsx`; `cases/case-header.tsx` | none | F / E | No shared page-title primitive. Titles are type roles, not a component — that is correct. The *layout* of title + subtitle + count repeats | product-wide | Create reusable pattern in product chrome (not DS) | P1 (product) |
| Tabs (line, stage/ownership) | `sign-process-screen.tsx`, `scrutiny-queue.tsx`, `case-section-tabs.tsx`, `tasks-screen.tsx` | `Tabs` `variant="line"` | A / B | Shared `h-10 … after:-bottom-px` alignment tweak on court stage strips | across several features | Document Tabs line recipe; do not add a variant until a third distinct look appears | P2 |
| Pagination | `employee/list-footer.tsx`; cases registers; filings queue | `Pagination` + `Select` | E | Court `ListFooter` is the right product extraction (count + page size + pager) | across several features (court + cases) | Keep product-specific; consider sharing with cases registers | P3 |
| `Resizable` workbench | scrutiny `case-workbench.tsx`, `correction-screen.tsx`, `access/people-page.tsx` | `Resizable` | A | No registry entry | occasionally | Add registry guidance | P2 |

### 3.4 Surfaces: cards, panels, wells

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `PANEL_CLASS` | `shell/panel.tsx` **and** `filing/form-card.tsx` (identical `"border-hairline shadow-raised"`); tasks overview cards; vakalatnama; filings dashboard | `Card` | B / F / D | Card default is `border-border` + `overflow-hidden`, no raised shadow. Every lifted panel opts in by class. Dark mode: shadow is invisible, so the class is a no-op there ([ds-requests](ds-requests.md) #5; [ds-diagnosis.md](ds-diagnosis.md)) | product-wide | Add `Card` raised recipe (or document PANEL as the sanctioned class on Card). Merge the two `PANEL_CLASS` exports now | P0 (merge) / P1 (DS) |
| Court “lifted panel” queue frame | ~17 `employee/*-screen.tsx` | utilities, not `Card` | F | `rounded-xl border-hairline bg-card p-6 shadow-raised` copy-pasted; comments say “collapse onto chrome later” | across several features | Create reusable pattern in product (`QueuePanel`). Do not add a DS layout component | P0 (product) |
| `FormCard` | `filing/form-card.tsx` | `Card` | E | Grouped fields + `FormRow` / `HalfWidth` | across several features (filing) | Keep product-specific | P3 |
| Card `overflow-hidden` vs sticky | `filing/dashboard/filings-queue.tsx` (`overflow-visible`); hearing cards (`overflow-visible`) | `Card` | D | Sticky descendants die inside Card ([ds-requests](ds-requests.md) Card clip) | occasionally | Extend Card (drop overflow or add opt-out) | P1 |
| `Item` rows | Cases lists, peek, overview, timeline, documents, hearings, application picker | `Item` | A | Heavy correct use. **No registry page** | product-wide (cases) | Add registry guidance (close request 3 remainder) | P1 |
| Folder tiles | `cases/cases-bucket-folders.tsx` | `Item` outline | E | PNG stack in sunken well; no `tag-1…5` so colour is withheld | once | Keep product-specific; tags blocked on request 1 | P3 |
| Advocate “now” card | `advocate/hearing-cards.tsx` | `Card` | B | `rounded-2xl border-transparent bg-brand-muted … shadow-raised` — the one focal saturated surface (Laws / ui-craft) | once | Keep product-specific | P3 |
| Onboarding `bg-muted` stage | `onboarding/onboarding-modal.tsx` | `Dialog` custom content | B | Documented in [design-system.md](design-system.md); not `ChromeDialogContent` | once | Keep product-specific | P3 |

### 3.5 Tables and data display

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Court docket table | 16 `employee/*-table.tsx` | `Table` | B / F / D | Identical `headClass` / `cellClass` (`h-10 bg-surface-sunken … text-caption`, hairline rows, header well, hover killed). No shared import. Sticky thead not used; sticky **column** only on bulk-reschedule | product-wide (court) | Merge into one product `DataTable`. DS: sticky-header + density guidance ([ds-requests](ds-requests.md) #4) | P0 (product) / P1 (DS) |
| Cases / tasks / register tables | `cases-table.tsx`, `tasks-table.tsx`, `case-documents/applications/orders.tsx` | `Table` | B / F | **Same `headClass`/`cellClass` strings** as court, independently copied. Cases comments cite tasks as the reference | across several features | Same product `DataTable` | P0 |
| Table vs stacked list | ~15 employee screens + cases | `Table` / `Item` | E | `hidden md:block` table + `md:hidden` `*ItemList` per screen | across several features | Create reusable pattern in product (responsive results). Not a DS primitive | P1 (product) |
| Description list | Overview, field rows, record dialogs, hearing overview | `DescriptionList` | A | — | product-wide | — | — |
| Timeline | Case peek/overview/timeline; task detail; hearing overview; scrutiny history | `Timeline` | A | — | across several features | — | — |
| Marker | Synced, **zero product imports** | `Marker` | A (unused) | No registry. Due/selection use Badge, ink, or `SELECTED_BAR` instead — often the right call (repeating rows must not spend the destructive budget) | once (none) | Add registry so authors know when *not* to use it | P2 |
| `DueStatusLine` vs `DueCell` / `DueCue` | `case-overview-card.tsx` (Badge) vs `tasks-table.tsx` / `advocate/home-bits.tsx` (ink) | `Badge` / typography | E | Intentional loudness split, documented in comments | across several features | Keep product-specific; do not unify into a DS status chip | P3 |
| `SELECTED_BAR` | `advocate/home-bits.tsx` | CSS before-bar | E | Neutral selection mark, not brand | occasionally | Keep product-specific | P3 |
| Stacked / multi-segment progress | `filing/dashboard/bulk-import-card.tsx` `BatchProgress` | `Progress` (single value) | C / D | Flex of token-filled spans; bar `aria-hidden`, legend carries counts ([ds-requests](ds-requests.md) stacked progress) | once | Needs design review — do not add until a second caller | P2 |
| Case peek overlay | `cases/case-peek.tsx` | `Card`+`Tabs`+`Timeline` — **not Sheet** | E | No scrim, no trap; another row stays the switcher | occasionally (cases + advocate home) | Keep product-specific | P3 |

### 3.6 Filters, search, chips

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| Apply-on-submit filter bar | ~14 court queues | `Field` + `InputGroup` + `Select` + `DatePicker` + `Button` | F / E | Draft vs applied; Search disabled until dirty. Field mix varies; structure does not | across several features | Create reusable pattern in product (`FilterBar`). Not a DS component until a second product needs it | P1 (product) |
| Live filter bar | `scrutiny/scrutiny-queue.tsx` only | same atoms | F | Explicitly “this screen's own behaviour” | once | Keep the exception; document it | P3 |
| Tasks filter row | `tasks/filter-row.tsx` | `InputGroup`, `Select`, `Sheet`, `Kbd` | E | Debounced search, `/` focus, mobile sheet, `AppliedChip` | once | Keep product-specific | P3 |
| Cases search | `cases-screen.tsx` + `cases-list-screen.tsx` | `InputGroup` | F | Same control, two screens | occasionally | Merge in product | P0 (product) |
| `AppliedChip` | `tasks/filter-row.tsx` | custom span, not `Badge` | C / E | `h-10 rounded-full bg-surface-sunken` dismissible chip. Badge is `h-6 nowrap` — wrong size and no dismiss | once | Keep product-specific until a second filter chip appears; then a Badge/chip dismiss variant | P2 |
| Stage column filter | `cases-stage-column-filter.tsx` | `DropdownMenu` + `Checkbox` | E | Excel-style header filter | once | Keep product-specific | P3 |
| User-assigned case tags | Brief only ([cases.md](proposals/cases.md)); **not shipped** | none | D | No `tag-1…5` family; chart/status tokens forbidden for this role ([ds-requests](ds-requests.md) #1) | — (blocked) | Add to DS (token family) | P1 |
| Badge (status) | Hearings, sign-orders, case stage/flags, home join status | `Badge` | A | Status mapped through `filingStatusVariant` / `documentStatusVariant` / `courtHearingStatusVariant` | product-wide | — | — |
| Badge (long localized label) | Case stage names | `Badge` | D | `h-6 whitespace-nowrap` overflows court-language labels ([ds-requests](ds-requests.md) #2). Cases D3 rendered stage as text to avoid it | across several features | Add wrapping variant **or** document “long status is text”. Do not let every screen invent an override | P1 |

### 3.7 Overlays: dialogs, sheets, drawers

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `ChromeDialogContent` | ~20 case record dialogs; sign/application dialogs; join | `Dialog` | E | Offsets dialog to the page column so it centres in the content pane, not under the rail | product-wide | Keep product-specific (chrome contract) | P3 |
| `ConfirmDialog` | `filing/confirm-dialog.tsx` **and** `shell/confirm-dialog.tsx` (byte-identical) | `AlertDialog` | F | Two files, split imports (filing vs tasks/sidebar) | product-wide | Merge duplicate components in product | P0 |
| Sign / application review dialogs | `employee/sign-*-dialog.tsx`, `*-application-dialog.tsx` | `Dialog` + `ChromeDialogContent` | E / F | Shared two-step review → `SignMethodDialog`; not extracted | across several features | Merge in product | P1 (product) |
| `JoinCaseDialog` | `advocate/join-case-dialog.tsx` (~1466 lines) **and** `join/join-case-dialog.tsx` (~773) | `Dialog`, `Combobox`, `InputOTP`, `DocumentSlot` | F / E | Largest remaining duplication of one job | occasionally | Merge in product; keep product-specific | P0 |
| Onboarding modal | `onboarding/onboarding-modal.tsx` | custom `DialogPrimitive.Content` + `Stepper` | E | Accused summons wizard | once | Keep product-specific | P3 |
| Sheet (source, sections, filters, task detail, history, index) | filing, tasks, scrutiny | `Sheet` | A | — | across several features | — | — |
| Drawer | `scrutiny/correction-screen.tsx` only | `Drawer` | A | — | once | — | — |
| Lightbox / document zoom | `filing/lightbox.tsx` vs `document-preview.tsx` | `Dialog` | F / E | Two image-enlarge dialogs | across several features | Merge in product | P1 (product) |

### 3.8 Status, notices, empty, loading, error

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `SectionNotice` / `InfoWell` | `filing/notices.tsx` **and** `shell/notices.tsx` (~2 lines apart) | `Alert` | B / F / D | Overrides `role` because DS hardcodes `alert` ([ds-requests](ds-requests.md) #9). ~15 standing-guidance call sites | product-wide | Add DS state (`announce`); merge the two product files now | P0 |
| Direct `Alert` | Onboarding, registration, share, case registers, home | `Alert` | B | Standing copy announced assertively | across several features | Replace with `SectionNotice` once merged; then DS `announce` | P0 |
| `Banner` | Cases hint, tasks error, join, bail, workbench | `Banner` | A | — | across several features | — | — |
| `PrefillNotice` | Filing cheque/complainant/demand-notice | `SectionNotice` | E | One sentence when any field was machine-read | occasionally | Keep product-specific | P3 |
| Empty (filtered vs idle) | ~15 court queues; cases tabs; tasks; advocate board | `Empty` | A / F | Same `Empty` + `SearchXIcon` + clear CTA, copy-pasted per screen | product-wide | Create reusable pattern in product (`FilteredEmpty`) | P1 (product) |
| Skeleton / Spinner | Cases, tasks, filings queue, draft frame, source panel | `Skeleton`, `Spinner` | A | — | product-wide | — | — |
| `SavingIndicator` | `filing/saving-indicator.tsx` via `FilingFooter` | `Spinner` | E | Draft persist | across several features (filing) | Keep product-specific | P3 |
| Toast | Layouts | `Sonner` | A | — | product-wide | — | — |

### 3.9 Documents, media, annotation

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `DocumentSlot` | Join, settings, bail, `filing/upload/slot-row.tsx` | `DocumentSlot` | D | No `description` / `actions` / `progress` / drop-target. Intake composes around it and overrides media size (`size-16` → `h-12`). Bail comments still wait on an `actions` slot ([ds-requests](ds-requests.md) #8) | across several features | Extend existing component | P1 |
| `Attachment` | `cases/uploaded-doc-field.tsx`, `filing-form-shared.tsx`, `add-signature-dialog.tsx`, `edit-litigant-dialog.tsx`, `employee/sign-signature-fields.tsx` | `Attachment` | A | Overlaps DocumentSlot's job (a file row with actions). **No registry page**, so authors pick by accident | across several features | Add registry: when Attachment vs DocumentSlot. Do not merge the primitives | P1 |
| `IntakeSlotRow` | `filing/upload/slot-row.tsx` | `DocumentSlot` + `Button` + `Progress` | E | Real upload row the DS slot cannot own | occasionally | Keep until DocumentSlot grows slots; then delete the fork | P3 → P1 |
| `IdUpload` | `vakalatnama/id-upload.tsx` | `Button` only | E | Prototype filename-only — weaker than DocumentSlot | once | Replace custom with existing DS (`DocumentSlot`) when the flow hardens | P2 |
| `SourcePanel` | `filing/source-panel.tsx`; 4 filing sections | `Sheet` + `Empty` + `Field` | C / E | Docked column vs sheet; OCR highlight; corrective value ([ds-requests](ds-requests.md) #6) | occasionally (one flow) | Needs design review. Recurs in any OCR intake, but today one flow | P2 |
| Annotation-over-document | `source-panel.tsx` `regionFromBox()` + `scrutiny/annotation.tsx` + `filing/lightbox.tsx` | none | C | Same geometry, two authors, shared helper ([ds-requests](ds-requests.md) #15) | occasionally | Create reusable pattern (helper + docs). Not a component | P2 |
| `RichTextEditor` | `filing/rich-text-editor.tsx`; affidavit, prayer, other-details | `Button` + `contentEditable` | C | `document.execCommand`, deprecated ([ds-requests](ds-requests.md) #7) | occasionally (one flow) | Needs design review — real gap, one flow, high cost. Do not hand-roll a second | P2 |
| `VoiceNoteRow` | `scrutiny/voice-note.tsx` | `Button` + `Slider` + `Collapsible` (+ Attachment-shaped row) | C / E | One caller. A11y contract (transcript, 40×40, not colour-only) is why it should be decided once ([ds-requests](ds-requests.md) #14) | once | Keep product-specific until a second channel; then Add to DS | P3 |
| Court / vakalatnama / bond paper | `filing/sections/preview/court-document.tsx`, `vakalatnama/document.tsx`, `filing/bond-document.tsx` | `Card` + paper tokens | E | Legal instruments | occasionally | Keep product-specific | P3 |

### 3.10 Wizards, steppers, action bands

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `Stepper` | Vakalatnama, registration, resubmission, onboarding, `cases/flow-stepper.tsx` | `Stepper` | A | `onActivate` now in DS | across several features | — | — |
| `FilingFooter` | 13 filing sections | `Button` | E | Sticky back / continue / saving | across several features (filing) | Keep product-specific | P3 |
| Court sticky action band | sign-* screens, bulk-reschedule, case-workbench, order-screen, hearing-overview | utilities | F | Same `sticky bottom-0 z-30 border-t border-hairline bg-card` as `FilingFooter`, two margin variants, not shared | across several features | Create reusable pattern in product (`StickyActionBar`) | P1 (product) |
| Vakalatnama / registration / onboarding footers | respective wizards | `Button` | F | Parallel to FilingFooter, not shared | occasionally | Merge onto `StickyActionBar` if it lands; else leave | P2 |
| `AdvocateStack` | `advocate/home-bits.tsx` **and** `tasks/advocate-stack.tsx` | `Avatar` | F | Same UX, two domain types | occasionally | Merge in product | P1 (product) |

### 3.11 Unused or under-documented DS primitives

| Component / Pattern | Location | Current DS Component | Class. | Customisation / Gap | Frequency | Recommendation | Priority |
|---|---|---|---|---|---|---|---|
| `Item` | Cases (heavy) | `Item` | A | No `whenToUse` | product-wide | Add registry | P1 |
| `Attachment` | 5 case/sign files | `Attachment` | A | No `whenToUse`; overlaps DocumentSlot | across several features | Add registry | P1 |
| `Marker` | unused | `Marker` | A | No `whenToUse` | once (none) | Add registry | P2 |
| `Resizable` / `AspectRatio` / `NativeSelect` | workbenches / rare | matching | A | No registry | occasionally | Add registry | P2 |
| `ButtonGroup` / `SessionTimeout` / `Chart` / chat (`Message`, `Bubble`) | unsynced | matching | A | Product does not need them yet | once (none) | Do not add to Dristi | — |
| Hover card | synced, unused | `HoverCard` | A | — | once (none) | — | — |

---

## 4. Customisation audit

Primitive source files are **not** customised. Every item below is a `className` / wrapper / duplicate around a synced primitive.

### 4.1 Patches that should become DS states (legitimate missing capability)

| Origin | Where customised | What changed | Why | Elsewhere? | Verdict |
|---|---|---|---|---|---|
| `Alert` | `filing/notices.tsx`, `shell/notices.tsx` | `role` overwritten (`none` / `status` / `alert`) | Standing guidance must not interrupt | ~15 call sites + every raw `Alert` | **Official DS state.** Product merge of the two files is the local fix today |
| `Button` | `hearing-overview-screen.tsx` | `aria-disabled:*` utilities | Tooltip on an unwired primary; real `disabled` kills hover and tab | Hearings Join VC is the same state without the CSS — so it looks live | **Official DS state.** The unpatched Join VC is the defect |
| `BreadcrumbLink` | `employee-top-bar.tsx` `CRUMB_LINK` | Focus ring + outline | Primitive has hover only; default outline fails 3:1 | Court bar; advocate bar does not add it | **Official DS state.** Add to primitive; delete `CRUMB_LINK` |
| `SelectContent` | `filing/inputs.tsx` `OptionSelect` | `position="popper"` + width | Default `item-aligned` covers the field | Filing only; court filters often unfixed | **Official default or documented form variant** |
| `Combobox` | `filing/inputs.tsx` `ComboField` | Dual-controlled input; keep typed value | Incomplete directories (stations, bar numbers) | Several filing fields | **Official variant** (`allowCustomValue`) |
| `DocumentSlot` | `filing/upload/slot-row.tsx`; bail dialog comment | External actions, CSS media override, drop target | Slot models states, not the row | Join/settings use the bare slot and omit Change/Remove | **Extend the primitive** (actions, description, progress, `data-dragging`) |
| `Card` | `PANEL_CLASS` everywhere; `overflow-visible` on filings-queue | Hairline + raised shadow; overflow opt-out | Default Card is not the lifted panel; overflow clips sticky | Product-wide / two screens | **Document or variant.** Do not keep two `PANEL_CLASS` strings |
| `Sidebar` | `chrome/app-chrome.tsx` | Private mobile sheet, plate vars, `collapsible="none"` | Mobile branch drops class/style; 32px rows; hover=selected; English chrome; no top offset | Court shell; advocate still on stock Sidebar | **Extend Sidebar.** Workaround has no exit until then |
| `Progress` | `bulk-import-card.tsx` | Segmented flex bar | Batch is multi-state | **Once** | Do **not** add yet. File the recipe; wait for a second caller |
| `Badge` | Cases avoided it for long stages | — | nowrap + h-6 | Would appear on every localised stage | **Variant or guidance** before anyone overrides |

### 4.2 Patches that should be brought back into alignment (one-off / product debt)

| Origin | Where | What changed | Verdict |
|---|---|---|---|
| `Alert` used raw for standing copy | onboarding, registration, case registers | No `announce` override | Replace with the shared notice once merged |
| Join VC primary with `aria-disabled` and no opacity | `hearings-screen.tsx` | Looks fully live | Align with the overview patch **after** DS owns the state — do not spread the className |
| `IdUpload` filename-only | vakalatnama | Bypasses DocumentSlot | Replace with DocumentSlot |
| Onboarding custom `DialogPrimitive.Content` | `onboarding-modal.tsx` | Avoids ChromeDialogContent | Acceptable (full-screen wizard). Do not copy this for ordinary dialogs |
| Hearings sticky columns removed after overlap bugs | `hearings-table.tsx` comment | — | Wait for a DS/product table that owns sticky; do not re-invent per column |

### 4.3 Elevation and tokens (system, not a local className)

`PANEL_CLASS` exists because Card fill equals page fill (`#ffffff` / `#111113`). In light, `shadow-raised` carries the panel. In dark, that shadow is invisible (request 5). This is not a Dristi taste preference; it is why every screen repeats the same two utilities. A `Card` raised recipe plus a dark-mode shadow (or a one-step card fill) is the DS fix. Until then, **one** `PANEL_CLASS` export is the product fix.

`brand-canvas*` is already in the DS. Rail plates still embed `#ffffff` in comments mapped to that token (`chrome/rail-plate.ts`) — the values are tokenised; the comments are the smell.

---

## 5. Missing components and variants

### Add to DS (real gaps, more than one consumer or a blocking token)

| Gap | Why it is a system gap | Not because |
|---|---|---|
| `tag-1…5` categorical marks | Confirmed product requirement; no legal token today. Blocks shipping tags | A designer wanted coloured folders |
| `DocumentSlot` actions / description / progress / drop | Five+ call sites compose around the slot | One upload screen is fancy |
| Quiet `Alert` (`announce`) | Standing notice is the common case | Filing likes a different look |
| `Button` `aria-disabled` treatment | Accessibility contract; two court actions already hit it | A tooltip preference |
| `BreadcrumbLink` focus | Only interactive primitive without a focus recipe | Court bar polish |
| `Select` form positioning | Every form Select will hit this | Filing is picky |
| `Combobox` keep-typed-value | Government directories are incomplete | One combo in jurisdiction |
| Sidebar: `--sidebar-top`, mobile forwarding, 40px default / md size, selected token, i18n props | Two product shells plus any future app bar | Court charcoal plate |
| `Card` overflow opt-out + raised recipe | Sticky-in-card and panel-on-page are generic | E-filing queue |

### Add DS variant / state (base exists)

- Badge: wrapping **or** written rule that long localised status is text.
- Progress: segmented — **only if** a second caller appears (currently bulk import only).
- Card: `raised` (or documented `className` recipe that `sync:ui` will not fight).

### Do not add (exist once, or are domain objects)

| Thing | Why not |
|---|---|
| `SourcePanel` as a primitive | One flow (e-filing OCR). Document the pattern; promote when a second intake needs it |
| `RichTextEditor` | One flow, high cost. Needs a maintained editor core — design review, not a quick primitive |
| `VoiceNoteRow` | One caller. Keep in scrutiny until judge/party feedback needs the same contract |
| `CasePeek` | Interaction model is cases-specific (no scrim on purpose) |
| `FormField` / posture | Scrutiny correction contract |
| Court paper / vakalatnama / bond | Legal instruments |
| IFSC / pincode lookup | Domain |
| `JoinCaseDialog` | Product flow; merge the two copies, do not DS-ify |
| Filter bar / queue panel / sticky footer | Product chrome. Extract in Dristi. Promote later if another PUCAR app copies them |
| Audio player | Same as voice note — wait for the second channel |
| Annotation box component | A mapping helper + a written decision is enough |

---

## 6. Duplicate / overlapping patterns

Call these out as **one job, many authors**.

### 6.1 Same object, multiple files

| Job | Copies | Relationship | Action |
|---|---|---|---|
| Confirm dialog | `filing/confirm-dialog.tsx`, `shell/confirm-dialog.tsx` | Byte-identical | Delete one; re-point imports |
| Standing notice | `filing/notices.tsx`, `shell/notices.tsx` | 2 lines apart | Same |
| Panel elevation | `shell/panel.tsx`, `filing/form-card.tsx` | Identical `PANEL_CLASS` | One export |
| App shell | `shell/app-shell.tsx`, `chrome/app-chrome.tsx` `ChromeShell` | Comments say migrate | Finish the migration |
| Top bar | `shell/top-bar.tsx`, `ChromeTopBar` | Same visual recipe | Finish the migration |
| Rail plates | `shell/rail-theme.tsx`, `chrome/rail-plate.ts` | Parallel palettes | One plate module |
| Join-a-case | `advocate/join-case-dialog.tsx`, `join/join-case-dialog.tsx` | 2,200+ lines for one job | Replace, do not merge line-by-line |
| AdvocateStack | `advocate/home-bits.tsx`, `tasks/advocate-stack.tsx` | Same UX, two types | One component, adapter types |
| Image lightbox | `filing/lightbox.tsx`, `document-preview.tsx` | Same enlarge job | One preview dialog |
| Cases search UI | `cases-screen.tsx`, `cases-list-screen.tsx` | Copy | Share the control |
| Stale DS audit bench | `app/ds-audit/*` | Inventory from a previous merge, now wrong | Delete after this doc is accepted |

The live `/ds-audit` page still lists `compact-segmented-control` and `vertical-stepper` (gone) and treats `DocumentSlot`/`Stepper` as diverged (they match the pin). Do not use it as a decision surface.

### 6.2 Same pattern, independently designed

These are the “Custom Filter A / Advanced Filter / Table Filter / Search+Filter Bar” cases.

**Work queue = lifted panel + filters + table/list + footer**

Independent implementations:

- Court: 17 screens, apply-on-submit filters, 16 table modules, `ListFooter`, mobile `*ItemList`
- Cases landing / folder: URL search, table+item list, pagination, column picker
- Tasks: overview cards + filter row + table + push detail
- Filings dashboard: `filings-queue.tsx` (Card, overflow-visible, tabs, empty)

They are one pattern: **a filtered collection in a lifted panel**. Differences that are real (live vs apply-on-submit; URL vs local draft; column picker) should be options of one product kit, not reasons to keep 17 copies.

**Sticky action band**

`FilingFooter`, vakalatnama footer, registration `Actions`, onboarding footer, ~10 court sticky bars, scrutiny workbench footer. Same z-index, seam, and primary-on-the-right rule. Two margin variants (flush vs padded). One `StickyActionBar` in product chrome.

**Data table treatment**

`headClass` / `cellClass` appear in 16 court tables **and** cases/tasks/register tables — the comments even name each other as the reference. This is one visual contract with no owner.

**Document row**

`DocumentSlot` (empty/processing/filled), `Attachment` (idle/uploading/error/done + actions), `IntakeSlotRow` (slot + overlay actions), `IdUpload` (filename button). Four answers to “a file the user has given us.”

**Status of a date**

Badge on case overview (`DueStatusLine`); ink on task rows and advocate rail (`DueCell`, `DueCue`). This split is **intentional** (repeating rows vs a single summary). Do not consolidate.

**Primary teal on list screens**

Court queues often make **Search** the primary. Hearings puts **Join VC** in the header and keeps Search quiet. Register-cases comments treat Search as the page action. One-teal is held; *which* action earns it is not. Product decision, not a DS variant.

---

## 7. Recommended DS additions

Only what earns a place in the system. Product extractions are listed so they are not mistaken for DS work.

### Upstream (pucar-design-system)

1. **Primitive API holes (small diffs, unblock every consumer)**  
   Alert `announce` · Button `aria-disabled` · BreadcrumbLink focus · Select `popper` default · Card overflow opt-out · Sidebar mobile forwarding + `--sidebar-top` + selected token + i18n + 40px/md size.

2. **Token / variant holes with product blockers**  
   `tag-1…5` · Badge wrapping-or-guidance · Card raised recipe / dark elevation · DocumentSlot slots · Combobox `allowCustomValue`.

3. **Documentation holes (no new code)**  
   Registry for `Item`, `Attachment`, `Marker`, `Resizable`, `NativeSelect`, `AspectRatio`. When-to-use that distinguishes Attachment vs DocumentSlot, Marker vs Badge vs ink, SegmentedControl vs Tabs vs ToggleGroup.

4. **Not yet**  
   SourcePanel, rich text, audio, segmented Progress, annotation component, filter bar, app shell, data table layout, sticky footer.

### In Dristi (do this regardless of DS)

1. Merge byte-identical wrappers (`confirm-dialog`, `notices`, `PANEL_CLASS`).
2. One `DataTable` + `QueuePanel` + `FilterBar` + `StickyActionBar` in `components/chrome` (or `components/patterns`).
3. Finish `AppShell` → `ChromeShell`.
4. Collapse join-case dialogs; collapse AdvocateStack; collapse lightboxes.
5. Delete `/ds-audit` once this document is the record.
6. Do not add more `headClass` copies.

---

## 8. Prioritised DS backlog

### P0 — System inconsistencies

Existing DS components implemented incorrectly, or product copies that make the same DS object look like two systems.

| Item | Create / change | Consolidate | Why P0 | Who benefits |
|---|---|---|---|---|
| Merge `ConfirmDialog` | One module wrapping `AlertDialog` | `filing/` + `shell/` copies | Identical files are unforced error | Filing, tasks, sidebar, cases |
| Merge `SectionNotice` | One module; keep `announce` until DS ships it | `filing/notices` + `shell/notices`; migrate raw `Alert`s | Same a11y defect, two patches | Every standing notice |
| Single `PANEL_CLASS` | One export | `shell/panel.tsx` + `filing/form-card.tsx` | Two sources of the most-used recipe | Every panel |
| `Alert` live role | DS: `announce` prop; default no role | Product notices | Primitive forces assertive interrupt | All guidance |
| `Button` `aria-disabled` | DS: mirror `:disabled` look, keep pointer events | Overview patch; then Join VC | Unwired primaries currently look live | Court hearings |
| `BreadcrumbLink` focus | DS: standard focus recipe | Delete `CRUMB_LINK` | Only control without a focus style | Court (and any) trail |
| `Select` form default | DS: `popper` default or documented variant | Filing `OptionSelect`; court filters | Default reads as a rendering bug | Every form |
| Sidebar mobile + selected + size + i18n | DS request 10 + 17 | Then delete `ChromeRailSheet` | Workaround has no exit; mobile rail is unthemed | Court now; advocate after migration |
| Shell / top bar / breadcrumb architectures | Product: `AppShell` onto `ChromeShell`; one trail publisher | Advocate vs court vs filing | Users cross areas; chrome should not re-teach | Whole app |
| Court/cases `headClass` table | Product `DataTable` | 16 employee tables + cases + tasks + registers | Same contract, 20+ authors | Every list |
| Join-case dialogs | Product: one flow | `advocate/` vs `join/` | Largest duplicate block | Portal + advocate |
| Stale `/ds-audit` | Delete or replace with a link here | `app/ds-audit/*` | It currently lies about orphans and forks | Anyone auditing |

### P1 — High-value DS additions

Repeated across the product; designers will otherwise keep creating custom UI.

| Item | Create / change | Consolidate | Why P1 | Who benefits |
|---|---|---|---|---|
| `tag-1…5` | Token family, both modes, never-status docs | Unblocks cases tags | Blocking requirement, no legal workaround | Cases, any future labels |
| `DocumentSlot` slots | `description`, `actions`, `progress`, `data-dragging` | `IntakeSlotRow`, bail, join, settings | Every upload reinvents the row | Filing, join, profile, case filings |
| Attachment vs DocumentSlot guidance | Registry only | Authors currently pick by import path | Two file-row primitives | Cases + filing |
| `Item` registry | `whenToUse` | — | Heavy product use, no guidance | Cases |
| Combobox `allowCustomValue` | Prop + empty copy | `ComboField` | Directory fields are common in government forms | Filing, vakalatnama |
| Card raised + overflow | Variant or documented recipe + overflow opt-out | `PANEL_CLASS` consumers; filings-queue | Panel-on-page is every screen; sticky-in-card is several | Whole app |
| Badge long-label rule | Wrapping variant **or** “render as text” | Case stage (already text) | Localisation will otherwise fork Badge | Every stage/status chip |
| Sidebar `--sidebar-top` / md size / `sidebar-accent-strong` | Tokens + sizes | Chrome rail row hacks | Every app-bar product hits this | Court + advocate |
| **Product (not DS):** `DataTable` + `FilterBar` + `QueuePanel` + `StickyActionBar` | App chrome kit | 17 court screens, cases, tasks, filings | Highest repeat custom UI in the repo | Court, cases, tasks |
| **Product:** responsive table/list | One results component | 15 `*ItemList` forks | Same RESPONSIVE.md answer, copy-pasted | Court + cases |

### P2 — Useful extensions

Improve coverage; not blocking consistency.

| Item | Create / change | Why P2 | Benefits |
|---|---|---|---|
| Registry: Marker, Resizable, NativeSelect, AspectRatio | Docs | Authors cannot know they exist | Future screens |
| Tabs line alignment | Document the `after:-bottom-px` recipe | Two court strips; not a new variant yet | Sign-process, scrutiny |
| Segmented Progress | Variant if a second caller appears | One bulk-import bar today | Filings dashboard, maybe tasks |
| SourcePanel / provenance | Pattern docs now; primitive later | One OCR flow; shape is stable | E-filing; future intake |
| Annotation mapping helper | Promote `regionFromBox` + write the a11y decision | Two callers, no third yet | Filing + scrutiny |
| Rich-text editor | Maintained core behind Input chrome | Real gap, high cost, one flow | Affidavit/prayer; later orders |
| Select `popper` already listed in P0 as default — if DS refuses a default, ship a documented `SelectContent variant="form"` | — | — | — |
| `ButtonGroup` | Sync when table row action clusters need it | Unused today | Hearings actions |
| Dark-mode `shadow-raised` / card fill | Request 5 remainder | Elevation invert is real but a token change, not a component | Every panel in dark |
| Replace vakalatnama `IdUpload` with DocumentSlot | Product | Prototype quality | Vakalatnama |

### P3 — Product-specific patterns

Stay out of the core DS.

| Item | Why it stays out | Notes |
|---|---|---|
| `FormField` + posture | Scrutiny/correction contract | May become an app `forms/` kit |
| `SourcePanel` implementation | E-filing OCR | See P2 for the pattern write-up |
| `FilingShell` / `SectionsRail` / `FilingFooter` | Filing wizard chrome | Sticky bar may share a product `StickyActionBar` |
| Court paper, vakalatnama paper, bond paper | Legal documents | — |
| Case peek (no-scrim overlay) | Cases interaction model | — |
| Companion rail | Advocate home | — |
| Scrutiny workbench (3-pane, flags, bundle) | Registry officer workflow | — |
| Voice note row | One caller | Promote with the second feedback channel |
| IFSC / pincode / police-station directory fields | Domain | Combobox free-text is the DS piece |
| `YesNoChoice` vs segmented | One UX decision in complainant | — |
| Due as Badge vs due as ink | Intentional loudness | Document, do not unify |
| Onboarding full-screen dialog | One wizard | — |
| Bond signing standalone header | One route outside the shell | — |
| `ChromeDialogContent` page-column centring | App chrome | — |
| Rail charcoal plate / advocate theme picker | Product theming | Depends on Sidebar className forwarding |
| Filter live-vs-submit exception on scrutiny queue | Deliberate | — |

---

## 9. Systemic issues discovered

**Designers are not bypassing DS atoms.** The gate is doing its job: no hex, no primitive forks, named type roles. The `/ds-audit` story of diverged `ui/*.tsx` files is historical.

**They are bypassing DS *composition*.** When the primitive's API cannot express the job (quiet alert, form select, upload row, raised card, sticky in a card, sidebar under an app bar), the workaround is a product wrapper — and then a second team copies the wrapper instead of the primitive.

**Missing variants are the main cause of custom UI**, not missing components. DocumentSlot, Alert, Button, Select, Combobox, Card, Sidebar, Badge, Breadcrumb — the bases exist. The missing *state* is what gets forked.

**Tokens are used correctly in product TSX** (gates pass). The remaining token problems are upstream: no categorical tag family; card=page fill; dark raised shadow; `accent-strong` on track (mitigated by SegmentedControl). Rail plate files still *comment* raw hex next to token names.

**Duplicated components are a product-architecture problem**, not a DS catalog problem. Filing vs shell copies, two join dialogs, two shells, twenty table files. `check:ui-sync` cannot see this layer.

**Feature-specific components leaking into shared UI:** `FilingFooter` z-index comments are copied into court screens; `TOP_BAR_HEIGHT` lives in filing chrome and shell chrome; `ConfirmDialog` imported across the tree from whichever copy was nearby. Scrutiny `regionFromBox` is the healthy version of this (reused, not copied).

**Inconsistent naming:** “Rail” means app nav, filing sections, scrutiny index, and advocate companion. “Chrome” means three modules. `headClass` is an unofficial contract. `PANEL_CLASS` is the unofficial Card variant.

**Inconsistent spacing/typography:** Gates catch off-ladder and unnamed type. Remaining drift is structural: court page headers vs `FilingPageHeader` vs `CaseHeader`; filter control widths `sm:w-44` vs `sm:w-52`; sticky footer padding `px-6 py-3` vs `md:px-8 md:py-4`.

**Components recreated instead of reused:** table shell, empty-filtered, filter apply, mobile item list, sticky footer, notice, confirm. `ListFooter` is the counterexample — one court pagination, many screens. That is the model.

**Gaps in DS component API design:** several primitives assume a single context (Alert always interrupts; Select always item-aligned; Sidebar always viewport-tall; Card always clips; DocumentSlot always a closed row; Button unavailable = `disabled`). Court and filing are the second context.

**Missing composition patterns:** the DS documents components, not “filtered collection in a lifted panel” or “sticky primary band under a list.” ui-craft describes layering (canvas → chrome → panel → well) but that lives in an agent skill, not in the DS site. Designers working in Figma do not get the product kit.

**Insufficient DS documentation:** `Item` / `Attachment` / `Marker` used or unused without `whenToUse`. Request 3 was right and is only half-closed. Attachment vs DocumentSlot is the live example of two primitives competing because neither page says when.

**Stale decision surfaces:** `/ds-audit` and parts of [ds-requests.md](ds-requests.md) still describe forks that have already landed (`SegmentedControl` compact, DocumentSlot `copy`, Stepper `onActivate`, `brand-canvas`). The queue should be reaped against this pin.

**Two-product chrome:** Advocate and court were built as separate apps that share primitives. They do not yet share a frame. Until `AppShell` dies, every chrome improvement is done twice.

---

## 10. Recommended next steps

### Immediate (Dristi, no DS release required)

1. Merge `confirm-dialog`, `notices`, and `PANEL_CLASS`.
2. Extract `DataTable` (the `headClass`/`cellClass` contract) and put new court/cases/tasks tables on it. Do not wait for a DS table variant.
3. Extract `FilterBar` + `QueuePanel` + `StickyActionBar` as product chrome. Migrate one court queue as the proof, then the rest.
4. Point `AppShell` at `ChromeShell` or delete the migration comment and accept two frames as a dated decision.
5. Delete or redirect `/ds-audit`.
6. Reap [ds-requests.md](ds-requests.md): mark landed items (SegmentedControl, DocumentSlot copy/quality, Stepper onActivate, brand-canvas, several registry entries) and keep this audit as the priority order.

### Next DS release (small, high leverage)

Ship the API holes in one pass: Alert `announce`, Button `aria-disabled`, BreadcrumbLink focus, Select `popper` default, Card overflow opt-out, Sidebar mobile forwarding. Add registry pages for Item, Attachment, Marker.

### Next DS release (deliberate)

`tag-1…5`, DocumentSlot slots, Combobox free-text, Card raised / dark elevation, Badge long-label rule, Sidebar selected + size + top offset + i18n.

### Explicitly later / not DS

SourcePanel, rich text, audio, segmented Progress, annotation component, app shell, filter bar, data-table layout, sticky footer — unless a second PUCAR product asks for them.

### Operating rule

A customisation earns a DS variant when a **second product area** would otherwise copy it, **and** the change is expressible as a state/variant of an existing primitive. A customisation that is a screen layout earns a **product pattern**, not a DS component. Frequency-of-one stays in the feature.

---

## Appendix A — Product surface reviewed

| Area | Routes / screens | Primary UI |
|---|---|---|
| Shell | `(app)`, `(portal)`, `home`, `tasks`, `join-case`, `filings` layouts | `AppShell` |
| Court | `/employee/*` (~20 pages) | `EmployeeArea` → `ChromeShell` |
| E-filing | `/filings`, draft form steps, upload, sign, bulk | `FilingShell`, sections, dashboard |
| Cases | `/cases`, folders, `[caseId]` tabs | `CasesScreen`, case file |
| Tasks | `/tasks`, act routes | `TasksScreen` |
| Advocate | `/advocate` | `AdvocateHome` |
| Vakalatnama | `/vakalatnama` | Wizard |
| Access | `/people`, share | `PeoplePage`, dialogs |
| Join / onboarding / registration | `/join`, `/welcome`, registration | Dialogs and steppers |
| Citizen | `/citizen` | Redirect only — no UI |
| Scrutiny | Employee workbench + advocate correction | `CaseWorkbench`, `correction-screen` |
| Sign-in | `/` | `sign-in-block` |

## Appendix B — Method

- Read DS `AGENTS.md`, registry slugs, primitive sources on pin `e0cadea6`.
- Ran `check:ds-fresh`, `check:ui-sync`, `check:tokens`, `check:typography`.
- Inventoried `apps/dristi-app/src/components/{ui,chrome,shell,filing,employee,cases,advocate,tasks,scrutiny,home,join,onboarding,registration,access,vakalatnama}` and `src/app/**/page.tsx`.
- Cross-checked [ds-requests.md](ds-requests.md), [ds-diagnosis.md](ds-diagnosis.md), [design-system.md](design-system.md), and the stale `app/ds-audit` bench.
- Counted imports and duplicate string contracts (`headClass`, `PANEL_CLASS`, sticky footer classes) rather than recommending from screenshots.

No DS source was modified.
