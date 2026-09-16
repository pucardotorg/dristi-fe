# Design-system requests

Open requests against
[pucardotorg/dristi-design-system](https://github.com/pucardotorg/dristi-design-system),
raised while designing Dristi screens.

**This file is a queue, not a licence.** Nothing here may be worked around locally: an
invented token, a hand-written primitive, or a per-screen override is a defect under the
DS gate (`.cursor/rules/pucar-design-system.mdc`), whatever the deadline. A request that
blocks a feature blocks the feature.

Each entry says what is missing, why the product hit it, and what would close it.

| # | Request | Raised by | Status |
|---|---|---|---|
| 1 | Token family for user-assigned categorical marks | [cases.md](proposals/cases.md) | open — **blocking** |
| 2 | `Badge` cannot hold a long localized label | [cases.md](proposals/cases.md) | open |
| 3 | Five shipped components have no registry guidance | [cases.md](proposals/cases.md) | open |
| 4 | No sanctioned sticky table header or row-density guidance | [cases.md](proposals/cases.md) | open |
| 5 | Panel fill equals page fill in both themes; raised shadow invisible in dark | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 6 | No provenance / source-document panel | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 7 | No rich-text editor | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 8 | `DocumentSlot` cannot own a real upload row | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 9 | `Alert` is always `role="alert"` — no quiet standing notice | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 10 | `Sidebar`: no top offset, 32px nav, hover/selected share a token, hardcoded English chrome | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |
| 11 | No selected-on-track pair: `accent-strong` is 1.08:1 on `track` | [e-filing.md](proposals/e-filing.md) | open — **owner auditing** |

---

## 1. No token family for user-assigned categorical marks — blocking

A confirmed product requirement, not a speculative one: users create their own case tags
and choose a colour from provided defaults ([cases.md](proposals/cases.md)).

Tags are **categorical, not status**. Status is closed at exactly three treatments per
family (`AGENTS.md` rule 6), and `chart-1…5` is documented as "series identity only —
never status" and scoped to data visualisation. So there is no sanctioned home for a
user-chosen mark.

**Request:** a **`tag-1…5`** family aliasing the chart ramp — contrast-checked ≥3:1 as
non-text marks, defined in both `:root` and `.dark`, documented as "never status, never a
row fill, always paired with a name."

System-level rather than a one-off: any future case type or workspace feature will need
user labels.

**Until it exists, tags cannot ship.** A local hex, or a colour picker that emits one, is
a defect under rules 1 (never hardcode a colour), 4 (must exist in light and dark), and 9
(every pair computed, never asserted).

## 2. `Badge` cannot hold a long localized label

`badge.tsx` is `h-6` with `whitespace-nowrap`. One core deploys per state with local
languages over identical national law, and court languages make three-word §138 stage
names much longer — "Bail & recording of plea", "Proclamation & attachment" — with taller
glyphs (`foundations/typography`, `ACCESSIBILITY.md` §13). A non-wrapping fixed-height
chip overflows its cell, and truncating a critical label with no alternative is itself a
defect (a11y §10).

**Request:** either a wrapping / multi-line badge variant, or explicit guidance that long
localized status values render as text. Without one of the two, every screen invents its
own override — [cases.md](proposals/cases.md) D3 avoided that by rendering stage
as plain text.

## 3. Five shipped components have no registry guidance

`item`, `description-list`, `toggle-group`, `input-group`, and `marker` exist in
`src/components/ui/` but have no `componentRegistry` entry, so they carry no `whenToUse`,
usage notes, or do/don't — while [cases.md](proposals/cases.md) depends on all
five.

Per `AGENTS.md`'s own standard, "a component with no reviewed guidance is a component the
system has not actually decided on."

**Request:** registry entries for at least these five.

## 4. No sanctioned sticky table header or row-density guidance

`RESPONSIVE.md` calls a sticky header "optional in product layouts", which means every
product hand-rolls it. A 55-row docket wants one, and if users turn out to be professional
repeat users, it wants a density answer too.

**Request:** a documented `Table` behaviour for sticky headers, with a row-density note,
rather than five screens inventing five versions.

---

↑ Design guidance: [design-system.md](design-system.md) · Briefs:
[proposals/](proposals/)


---

## 5. Panel fill equals page fill in both themes; the raised shadow is invisible in dark

Measured on the running e-filing app (2026-08-17), computed values, both themes:

| pair | light | dark |
|---|---|---|
| `--card` vs `--background` | `#fcfcfd` vs `#fcfcfd` — **1.00:1** | `#111113` vs `#111113` — **1.00:1** |
| `--sidebar` vs `--background` | 1.03:1 | 1.07:1 |
| `--surface-sunken` vs `--card` | 1.07:1 | 1.13:1 |

A panel therefore never differs from the page by *fill*; it exists only through
`shadow-raised` plus a hairline. In light that works — the shadow carries it. **In dark
the shadow is `rgba(0,0,0,.3)`/`rgba(0,0,0,.4)` on `#111113`: invisible.** Nothing
separates panel from page but a 10 %-alpha hairline, so the page renders as one flat
sheet — and because `surface-sunken` (`#1d1e21`) is *lighter* than `card` (`#111113`),
a well reads as the most raised surface and the layering model inverts.

The light half of this is analysed at length in [ds-diagnosis.md](../design/ds-diagnosis.md);
the dark-mode consequence is new.

**Request (one of):**
- give `--card` its own value a step off `--background` in both themes (the ladder already
  has `neutral-2` at 1.03/1.07 and `surface-sunken` at 1.07/1.13), **or**
- define a dark-mode `shadow-raised` that reads on a near-black ground — a light-toned
  top edge (`inset 0 1px 0 rgb(255 255 255 / .04)`) plus a deeper ambient shadow, which is
  how most dark UIs express elevation, **or**
- both, and add a `Card variant="raised"` so the product stops expressing panels as a
  per-use `className` (this repeats request-adjacent note in `ui-craft` §6).

Until then every Dristi screen carries `PANEL_CLASS = "border-hairline shadow-raised"` by
hand and dark mode has no layering.

## 6. No provenance / source-document panel

The e-filing flow reads uploaded documents and pre-fills the form, so every machine-read
value needs an answer to "where did this come from?". Dristi ships `source-panel.tsx`:
a right-docked panel that **pushes** the form (not an overlay) above `xl` and degrades to
a `Sheet` below, showing the uploaded page with the extracted region highlighted and an
editable "value used in this field" box that clears the machine-read marker.

Nothing in the DS covers it, and it is not §138-specific — any intake that machine-reads a
document needs it.

**Request:** a `SourcePanel` (or `Provenance`) primitive owning the docked/sheet
behaviour, the highlight geometry (percentage box over an image), and the corrective
value field. Note the current local implementation masks the page with
`shadow-[0_0_0_9999px_var(--color-scrim)]` — it passes the token gate but is a hack a real
primitive should absorb.

## 7. No rich-text editor

Party-in-person affidavits and the prayer/relief blocks are formatted long-form text.
Dristi ships `rich-text-editor.tsx` on `document.execCommand`, which is deprecated.

**Request:** an editor primitive with `Textarea`-parity chrome (`border-input`, focus
ring), a toolbar of toggle controls at ≥40 px, DS type roles inside the content area, a
real placeholder (the local one is an absolutely-positioned `<span>`), and proper
`role="textbox"` semantics — wrapping a maintained editor core rather than `execCommand`.

## 8. `DocumentSlot` cannot own a real upload row

`DocumentSlot` models the states (empty · empty-optional · processing · filled ·
filled-poor) but not the row: it has no slot for a description, no row actions
(preview / re-upload / delete), no progress element, and no drop-target behaviour. Every
consumer therefore composes around it — Dristi renders the description as a separate
paragraph below the row and overlays an absolutely-positioned action cluster, which is
brittle and reads as two objects rather than one.

**Request:** `description`, `actions` and `progress` slots, plus a documented
drag-and-drop state (`data-dragging`) so the row can be a drop target without a fork.

## 9. `Alert` is always `role="alert"` — no quiet standing notice

`{DS}/src/components/ui/alert.tsx` hardcodes `role="alert"`. Dristi renders ~15 pieces of
standing guidance through it, so screen-reader users are interrupted assertively on mount
for text that is not an alert; one case nests a `role="alert"` inside a `role="status"`
container, which overrides an intentionally polite region.

**Request:** make the live semantics a prop — no role for standing guidance (the common
case), `status`/polite for async results, `alert` reserved for errors that interrupt.


## 10. `Sidebar` — four things a product shell cannot express

Raised while adopting the DS sidebar for the e-filing rail (which was previously a private
fork). Adoption was the right call — collapse persistence, ⌘B, roving focus, the mobile
sheet and `SidebarInset` all came for free — but four things had to be worked around or
accepted, and every product with an app bar will hit the same ones.

1. **No top-offset hook.** `sidebar-container` hardcodes `fixed inset-y-0 … h-svh` and
   `SidebarProvider` hardcodes `min-h-svh`. A shell with a global header must override both
   with inline styles (class overrides of `inset-y-0`/`h-svh` are cascade-order dependent).
   **Request:** a `--sidebar-top` variable alongside `--sidebar-width` / `--sidebar-width-icon`.

2. **Navigation rows are 32px, and 32×32 when collapsed — under the DS's own 40×40 floor**
   (`ACCESSIBILITY.md` §8). `size="lg"` is 48px, which is too tall for a 12-item rail. The
   collapsed size is forced with `!`, so it cannot be raised without a specificity fight.
   Dristi meets the floor by expanding the hit area (`after:-inset-1`) and widening the menu
   gap to `gap-2` so neighbouring targets meet without overlapping — the remedy
   `ACCESSIBILITY.md` prescribes, but every consumer will have to rediscover it.
   **Request:** a `default` size that meets the floor, or a documented `md` between 32 and 48.

3. **Hover and selected share one token.** `SidebarMenuButton` uses `hover:bg-sidebar-accent`
   *and* `data-active:bg-sidebar-accent`, so the current step is indistinguishable from a
   hovered one. `AGENTS.md` rule 10 reserves `accent-strong` for "pressed, engaged and
   selected", but there is no `sidebar-accent-strong` token, so no DS-legal local fix exists.
   Dristi falls back to a teal icon plus `data-active:font-medium`.
   **Request:** a `sidebar-accent-strong` token, bound to `data-active`.

4. **Hardcoded, untranslatable English chrome.** The mobile sheet's accessible name is
   `<SheetTitle>Sidebar</SheetTitle>` with description "Displays the mobile sidebar", and
   `SidebarTrigger`'s sr-only text is "Toggle Sidebar" — Title Case, against the sentence-case
   Law, and none of it is overridable through props. On a court product that must ship in
   Malayalam and Hindi (`ACCESSIBILITY.md` §13), the navigation dialog announces itself in
   English as "Sidebar" — which is also implementation jargon, not what the user sees.
   **Request:** props for the sheet title/description and the trigger's label.


## 11. No selected-on-track pair — `accent-strong` is invisible on `track`

`AGENTS.md` rule 10 names `accent-strong` as "the pressed, engaged and selected fill", and
`Toggle` uses it for `data-[state=on]`. That is correct on a page or card ground. It is not
usable on a **track**, which is where a segmented control lives:

| pair | measured |
|---|---|
| `accent-strong` `#e0e1e6` on `track` `#d9d9e0` | **1.08:1** |
| `accent` `#e8e8ec` on `track` (hover) | 1.15:1 |
| `background` `#fcfcfd` on `track` | 1.37:1 |

At 1.08:1 the selected segment is indistinguishable from the groove — the control reads as
one grey slab (owner, 2026-08-18: "the tokens of the toggle button have got fucked up").

The system already answers this elsewhere and disagrees with itself: **`Tabs` puts
`bg-track` on its list and styles the active trigger `data-active:bg-background` plus a
shadow** (`tabs.tsx:68`), i.e. a raised light chip, not `accent-strong`. Dristi's segmented
control now follows `Tabs` for that reason.

**Request:** either a named selected-on-track pair (`track-selected` / `track-selected-foreground`,
or simply blessing `background` + `shadow-raised` as the documented recipe), or a `Segmented`
primitive that owns it — so consumers do not have to discover the conflict by measuring.
A hover pair for the same ground is needed too: `accent` at 1.15:1 has the same problem.

---

## 12. `Select` opens over its own field by default

`SelectContent` defaults to `position="item-aligned"` (`select.tsx:63`), which pins the
open list so the selected row sits on top of the trigger. On a menu bar that is the
familiar macOS behaviour. In a form card it is not: the list covers the field's own label
and the field below it, and every screenshot of it reads as a rendering bug rather than an
open menu (owner, 2026-08-19: "the drop downs were glitching in a few places").

Dristi now passes `position="popper" align="start" sideOffset={4}` plus
`w-(--radix-select-trigger-width)` at its single wrapper (`inputs.tsx`, `OptionSelect`),
so a form menu opens under its control at the control's width.

**Request:** make `popper` the default for `SelectContent`, or ship the form recipe as a
documented variant. Every consumer putting a Select in a form will otherwise hit this and
fix it privately, and the fix is four props they have to know to write.

---

## 13. `Combobox` has no free-text mode

`Combobox` selects from `items`; there is no sanctioned way to keep a typed value that no
item matches. Several Dristi fields need exactly that — a police station or a bar
registration number is searched against a directory that is *usefully* incomplete, and
refusing an address because our copy of the station list is missing one is worse than
taking the person's word for it.

Dristi drives `inputValue` + `onInputValueChange` back into its own state to get this
(`inputs.tsx`, `ComboField`). It works, but it means the component is controlled two ways
at once and the semantics of "what is the value" live in the consumer.

**Request:** a `freeSolo` (or `allowCustomValue`) prop on `Combobox` that makes the typed
string the value when nothing matches, and lets `ComboboxEmpty` say so. Related: the DS
guidance for `Combobox` should name this case, since a searchable field over a registry is
the most common reason to reach for it in a government form.

---

## 14. No audio primitive — every feedback channel will compose its own

`src/components/ui/` has 68 components and none of them plays media: no `audio`, no
`media`, no `player`. The scrutiny return needs one, because a registry officer's remark
arrives as a voice note as often as it arrives as text
(`docs/product/domain/practice-notes.md`, `ke-scrutiny-officer-2026-07`), and any judge-,
party- or officer-feedback channel in a court product will want spoken context.

Dristi composes one at `components/scrutiny/voice-note.tsx`: `Attachment` as the row, a
`Button size="icon"` transport, `Slider` as the scrub track, `font-mono tabular-nums`
times, and a `Collapsible` transcript. It is deliberately not generalised.

The reason this should be decided once rather than per screen is the accessibility
contract around it, which is easy to get wrong and invisible when you do: WCAG 2.1 AA
**1.2.1** requires a text alternative for prerecorded audio-only content, so a voice note
may never be the sole carrier of a message and the component needs somewhere to put a
transcript; the transport must be keyboard-operable and ≥ 40×40; and progress cannot be
carried by colour alone.

**Request:** `Audio` / `AudioNote` — transport button, `Slider` track, `tabular-nums`
elapsed/duration, optional transcript disclosure, and the `idle | loading | error` states
`Attachment` already models. Until it lands, a second team will build a second audio row.

---

## 15. "Annotation over a document" is a pattern with two callers and no home

Dristi hand-rolls a highlight over an uploaded page twice now, with the same geometry and
two different authors of the box: the OCR read region (`filing/source-panel.tsx`,
`regionFromBox()`) and the scrutiny officer's mark (`scrutiny/annotation.tsx`, which
reuses that function rather than growing a second one).

The shape is stable — a pixel box plus the page dimensions it was measured in, mapped to
percentages so it survives any render width — and the decisions around it are not obvious:
the box is `aria-hidden` and the meaning lives in adjacent text, the image needs a real
alt naming *why* it is marked, and the enlarge control has to be a button rather than a
hover affordance.

**Request:** document the pattern (and ideally ship the mapping helper) before a third
caller appears. It does not need to be a component; it needs to be a decision.

---

## Stacked (multi-segment) progress bar

Raised: 2026-08-30, from the e-filing "File a case" screen (`BatchProgress` in
`components/filing/dashboard/bulk-import-card.tsx`).

`Progress` is single-valued. A batch of filings is not: its cases sit across registered /
in scrutiny / defect / not filed at once, and the useful picture is the proportions in one
bar. Composed here from a flex row of token-filled spans, with the bar `aria-hidden` and a
legend carrying every count as text, so colour never carries the meaning alone.

**Request:** a `Progress` variant (or a `SegmentedProgress`) that takes ordered segments
with a value and a semantic token each, and owns the accessible summary. Three things are
easy to get wrong per-composition and worth deciding once: rounding when segments do not
sum to the total, the minimum visible width of a non-zero segment, and whether the
remainder renders as `track` or as an explicit segment.

---

## Circular progress — a ring for "how much of this is done"

Raised: 2026-09-09, from the File a case queue's Drafts tab
(`components/filing/dashboard/completion-ring.tsx`).

`Progress` is a linear bar. A table cell wants the same fact at 20px beside a number —
"62% complete" with a ring that reads at a glance, the way a mail client shows setup
progress — and a 1px-tall bar in a cell is invisible. Composed locally as a two-circle
SVG drawn only in tokens (`stroke-track` for the groove, `stroke-primary` for the fill),
`aria-hidden` because the number beside it is the value. It is a screen-level file, not a
primitive, and it is the one custom drawing in this round.

**Request:** a `Progress` variant (`shape="ring"` / `size`) or a `ProgressRing` primitive
that owns the geometry, the stroke tokens, the reduced-motion rule for the fill
transition, and the accessible summary — so the app's ring and any future one come from
one place. Delete `completion-ring.tsx` when it lands.

---

## `Card` clips its children, so a panel cannot hold sticky content

Raised: 2026-08-30, from the e-filing "File a case" work queue
(`components/filing/dashboard/filings-queue.tsx`).

The `Card` master carries `overflow-hidden`. A clipping ancestor makes `position: sticky`
inert for every descendant, so a panel cannot keep its own header, tab strip or table
head pinned while its content scrolls — a normal pattern for any long list inside a card.
Worked around here with `overflow-visible` on the one Card, which gives up the corner
clip the master was buying.

**Request:** either drop `overflow-hidden` from the master (rounding already clips
backgrounds; it is mainly there for images bleeding to the edge) or add a variant that
opts out, so composition does not have to fight the primitive to pin a header.

---

## 16. `BreadcrumbLink` ships no focus indicator

`src/components/ui/breadcrumb.tsx` gives its link `transition-colors
hover:text-foreground` and nothing for focus — no `focus-visible:` rule of any kind. It is
the only interactive primitive in the system without one.

Nothing was stripped, so no gate catches it, and it is invisible with a mouse. What a
keyboard user gets is whatever the browser draws by default, recoloured by the blanket
`* { … outline-ring/50 }` in the app's `globals.css`: a colour, with no `outline-style`
and no `outline-width` behind it. At 50% over `card` that colour is roughly **2.1:1**,
under the 3:1 that `ACCESSIBILITY.md` §6 and WCAG 2.1 **1.4.11** ask of a focus
indicator — and the width and style are the browser's opinion rather than the system's,
so it differs per engine.

Every other control settles both: `Badge` uses `focus-visible:border-ring
focus-visible:ring-3 focus-visible:ring-focus-ring`, `TabsTrigger` adds
`focus-visible:outline-1 focus-visible:outline-ring` for the same reason a crumb needs
it — there is no border of its own to tint.

Dristi hits this in the court's top bar, where the trail is the only route back to the
area's origin, on fifteen screens (`components/employee/employee-top-bar.tsx`,
`CRUMB_LINK`). The composition there is the two DS recipes above put together, applied
through `className` rather than into the primitive — a synced file loses local edits at
the next `sync:ui` and fails `check:ui-sync` in the meantime.

**Request:** put the focus recipe on `BreadcrumbLink` itself —
`focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-1
focus-visible:outline-ring`, with a corner for the ring to follow. It is one line in one
primitive, and it is currently owed by every caller that renders a crumb. Worth checking
the same question of the other text-only links in the registry while the file is open.

---

## 17. `Sidebar`'s mobile branch drops `className` and `style` — and its own width

`Sidebar` renders three ways. Two of them apply what the caller passed; the mobile one
applies neither, and it fails by three routes that have to be fixed together.

**`className` is dropped by the signature, not by a spread.** It is destructured at
`sidebar.tsx:155` and the `isMobile` branch (`181–205`) never mentions it again. Nothing
forwards it and nothing warns.

**`style` is spread onto a component that renders no DOM.** `{...props}` — which is where
`style` ends up — goes to `<Sheet>` at `sidebar.tsx:183`. `Sheet` is
`SheetPrimitive.Root` (`sheet.tsx:10`), which is Radix `Dialog.Root`: a context provider
with no host element. It forwards nothing. React says nothing either, because an unknown
prop on a *component* is a legal prop; the warning it would give on a host element never
fires. The desktop branch puts both on `sidebar-container` (`231–239`) and works, so the
two paths disagree silently.

**There is no second chance, because `SheetContent` is handed literals.** `className` at
`sidebar.tsx:189` and `style` at `190–194` are written inline, so even a caller who found
another way in would be overwritten.

**And the width it does set never applies.** `SheetContent` writes its own width as
`data-[side=left]:w-3/4` with a `sm:max-w-sm` cap. The mobile branch's
`w-(--sidebar-width)` carries no modifier, so tailwind-merge keeps both — different
modifier, different key — and the cascade then settles it the other way: `.class[attr]`
is (0,2,0) against a bare `.class` at (0,1,0). Measured in Dristi's served stylesheet.
So `SIDEBAR_WIDTH_MOBILE` is declared, is correct, and does nothing: the DS's off-canvas
rail is 75% of the viewport capped at 24rem, which on a 320px phone is 240px. This one is
independent of the two above — fixing the forwarding alone will not surface it.

**What it costs a consumer.** Dristi paints its rails on a plate — a set of custom
properties for the ground, seam, ink, hover and ring, held constant under the app's dark
mode. The plate is exactly `className` plus `style`, so below `md` the whole thing lands
on nothing: the charcoal rail comes back in the app's default light ink, seams and all.
That is not a themeable rail failing to theme; it is a rail that looks broken on a phone.

So `components/chrome/app-chrome.tsx` never lets the DS choose the mobile branch. It
renders `collapsible="none"` at every width, hand-builds the desktop fold that mode does
not provide (`group` + `data-collapsible` on the container, a width the variant
overrides), and owns a private `ChromeRailSheet` for phones — including a second copy of
the 18rem the DS already named, applied with the side modifier so it survives the same
cascade the DS loses.

That composition is legal — a public mode used to its documented contract, no DS source
copied — but **the workaround has no exit.** Fix this upstream and every Dristi gate stays
green, the screens keep working, and nothing tells the next author that
`ChromeRailSheet` has become a private fork that no longer receives sheet improvements
and no longer needs to exist. This file's own preamble says nothing may be worked around
locally; that rule is currently owed on this entry, which is why it is filed rather than
left as a comment in the frame. Request 10 raises four `Sidebar` problems and none of them
is this one.

**Request:** in the `isMobile` branch —

- move `{...props}` off `Sheet` and onto `SheetContent`, where a host element receives it;
- merge rather than replace: `className={cn("bg-sidebar p-0 text-sidebar-foreground
  [&>button]:hidden", className)}` and `style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
  ...style }}`;
- give the width a modifier that can win — `data-[side=left]:w-(--sidebar-width)` and its
  right-hand twin — or stop `SheetContent` scoping width by side at all, which would fix
  it for every sheet in the system rather than for this caller.

The pay-off is larger than the diff. With it, both Dristi areas drop to a plain
`collapsible="icon"` `Sidebar` and most of `ChromeRail`'s fold machinery — the hand-set
`data-collapsible`, the width override, the private sheet — is deleted rather than
maintained. Worth checking the same question of any other primitive that branches on
`isMobile` and re-enters through a portal: the failure is invisible in React, in the class
list, and in every gate.

---

## 18. `Button` gives `aria-disabled` no treatment at all

`buttonVariants` hangs its unavailable look off the DOM property — `disabled:pointer-events-none
disabled:opacity-50` (`button.tsx`). Nothing keys off `[aria-disabled]`.

That leaves no way to render the state the product actually has. A control that is
*present but not yet connected* has to stay focusable and hoverable, because the only
thing explaining why it is inert is a `Tooltip` — and `ACCESSIBILITY.md` §7 forbids
putting the sole explanation behind hover, so keyboard users must reach it too. Real
`disabled` removes the button from the tab order and, with `pointer-events-none`, kills
the hover that opens the tooltip. So `aria-disabled` is the correct attribute, and the DS
dresses it as a fully live button: full-strength `bg-primary`, a working
`hover:bg-primary-hover`, and the `active:not-aria-[haspopup]:translate-y-px` press. It
lights up, goes down under the finger, and does nothing.

Two court-side screens are on it today, both deliberately unwired pending a court-side
case file: **View case** (`employee/hearing-overview-screen.tsx`) and **Join VC**
(`employee/hearings-screen.tsx`). It got worse when View case moved into a pinned action
band, where the surrounding pattern means *the act on this page lives here* — a
full-strength primary that depresses and does nothing is a promise the control cannot
keep.

Dristi patches it at one call site with three utilities —
`aria-disabled:opacity-50 aria-disabled:hover:bg-primary aria-disabled:active:translate-y-0`
— which is a per-screen override of a state the system should own, and it has to be
rewritten per variant, since the hover fill to cancel differs for every one of the ten.

**Request:** put an `aria-disabled` treatment in the `buttonVariants` base and per-variant
hover, mirroring the `:disabled` look (`opacity-50`) and cancelling the hover fill and the
press translate. Explicitly **not** `pointer-events-none` on this branch — the tooltip is
the entire reason the control is `aria-disabled` rather than `disabled`, so the pointer
must keep reaching it. A documented name for the state would help as much as the CSS: the
distinction between "you may not" (`disabled`) and "this is not connected yet"
(`aria-disabled` + explanation) is a real one, and right now every consumer meets it by
discovering that nothing happened.

---

## 19. `DatePicker` / `DateRangePicker`: what a screen cannot reach past

The date controls came up again and again while building **Bulk reschedule hearings**
(`employee/bulk-reschedule-screen.tsx`), which asks for a span of days and then the single
day to move that span to. None of them has a local answer: `DateRangePicker` renders
its own `Popover` and its own `Calendar`, its `className` lands on the trigger `Button`,
and the popover is portalled to `document.body` — so nothing a screen can pass, in props
or in CSS, reaches the calendar inside it.

**a. A two-month range calendar draws the overlap twice, and selects it twice.**

`DateRangePicker` is the only place the system ships `numberOfMonths={2}`
(`date-picker.tsx:123`), and `Calendar` defaults `showOutsideDays = true`
(`calendar.tsx:18`). Side by side, September's trailing days and October's leading days
are the same days, drawn in both panels. Measured on the render with the span
Sep 13 – Oct 2: nine outside cells, six of them carrying `data-selected="true"`, and
`2026-10-02` present twice — once as `data-outside="true"` in September, once as October's
own cell, both painted as the end of the range. The owner read it as exactly that on the
render (2026-09-13): the same date lit twice, in two places, in one control.

**Request:** `showOutsideDays={false}` on the calendar inside `DateRangePicker`. One line,
and since that is the system's only multi-month calendar, nothing else moves. Better still
if `Calendar` owns the rule — outside days off whenever `numberOfMonths > 1`, since two
adjacent months can never want them.

**One loose end for whoever implements it.** Bulk reschedule now sets it (§19f) and it
does fix the defect — re-measured with the same 13 Sept – 2 Oct span, no date appears in
both panels. But `react-day-picker` still emits the outside `<td>` and still marks it
`data-selected` / `range_end`, and `Calendar` paints the range fill on the **cell** rather
than on the day button inside it (`calendar.tsx:112-120`), so September's grid holds a
selected, `bg-accent` cell with no day in it. It does not currently show — measured at
the cell's centre it resolves to the panel white, because `range_end` is `isolate z-0` and
something above it wins — so this is a latent artifact, not a live one, and Dristi carries
no override for it. Worth fixing at the same time, since it is the same wrong assumption:
a cell is not the day.

**b. `value={undefined}` means "uncontrolled", so a range cannot be cleared.**

`const selected = value === undefined ? internalValue : value`. A consumer holding the
range in its own state has no way to say *there is no range*: `undefined` hands the control
back to whatever it last kept internally, so the trigger goes on reading a span the product
has already given up. Dristi's **Clear filters** did exactly that — board reset, field
still reading `Sep 16, 2026 – Sep 16, 2026` — until it was worked around by passing an
empty `DateRange` (`{ from: undefined }`), a value object that keeps the control controlled
and falls the label through to the placeholder. It works, but it is a trick the next reader
has to reverse-engineer, and `defaultValue` already covers the uncontrolled case.

**Request:** accept `null` as "controlled and empty", or document the empty-`DateRange`
idiom in the component's guidance so it is a contract rather than a discovery.

**c. Neither picker dismisses when a date is chosen.**

`handleSelect` sets the value and nothing else; the `Popover` is uncontrolled. On a single
date that leaves the calendar standing over the page after the one decision it exists for
has been made — and inside a dialog it covers the next control, so the bench picks a date
and then has to dismiss the thing that answered it. Any consumer wanting the ordinary
behaviour has to own the open state, which means owning the `Popover`, which means not
using the component.

**Request:** close on select for `DatePicker`, and on the *second* date for
`DateRangePicker` (the first click is mid-range and must stay open). An `open` /
`onOpenChange` pass-through would cover whatever genuinely wants to stay open.

**d. 28px day cells, against the system's own 40×40 floor.**

`Calendar` sets `[--cell-size:--spacing(7)]` (`calendar.tsx:34`). `ACCESSIBILITY.md` §8
puts the floor at 40×40 and names `h-10` as the control metric, with no carve-out for a day
button. Under a picker trigger 28px is defensible — the calendar is a detail inside a
field. Where the calendar *is* the control it is not: Bulk reschedule composes `Calendar`
directly as the one question its overlay asks, and overrides the variable to
`--spacing(10)` to reach the height every other control on the screen has.

**Request:** settle the floor deliberately — 40px cells, or a documented note that the
calendar is exempt and why. As it stands a screen is guessing at a rule the system states
elsewhere.

**e. There is nowhere to put a clear, so clearing costs you the calendar.**

A date field should give its span back from the control that holds it — `QueueSearchField`
does exactly that with an `InputGroupAddon align="inline-end"`, and the products' filter
rows reserve **Clear filters** for the button that resets more than one thing. But
`DateRangePicker` renders its own trigger and takes no children, so there is no addon slot;
and it renders its own `Popover`, so there is no footer to put a **Clear** beside the days
it undoes, which is where it belongs.

Dristi lays an `×` over the padding the trigger is given to hold it. That clears the span
and nothing else, which is the point — but because the button is necessarily *outside* the
portalled `PopoverContent`, Radix's dismissable layer reads the press as an outside click
and closes the calendar. So the bench clears and loses the calendar in the same gesture,
and has to reopen it to pick again (owner, 2026-09-13). Nothing a consumer can pass
prevents that: the open state belongs to the primitive.

**Request:** either a `clearable` / `onClear` prop that renders the `×` inside the
trigger and leaves the popover alone, or a footer slot on the popover for a **Clear**
beside the calendar. The second is better — a range picker's clear belongs next to the
days it is undoing — and it would also give the presets row somewhere to live.

**f. The first consumer that needed anything beyond the defaults stopped using it.**

Bulk reschedule no longer uses `DateRangePicker`. `RangeField`
(`employee/bulk-reschedule-screen.tsx`) composes `Popover` and `Calendar` directly and
reimplements the trigger, the label formatting and the controlled range.

It started as a placement problem. The owner brought a reference on 2026-09-14 whose date
filter carries named spans (`Last 7 days`, `This month`) beside the custom dates; built
first beside the trigger, they were rejected on sight — the spans belong *inside* the
picker, next to the days they light up. There is no way to put them there. The primitive
renders its own `Popover`, takes no `children`, spreads `className` onto the trigger, and
portals its content, so nothing a consumer passes reaches inside.

**The spans were then dropped** (owner, same day: the calendar is the one question that
filter asks, and it did not want a second way of answering it). The composition stayed,
because by then it was carrying (a), (c) and (e) as well — and *those* are why it cannot
go back. Fixed locally, all three unreachable through the primitive:

| | fixed by | measured |
|---|---|---|
| (a) | `showOutsideDays={false}` | 13 Sept – 2 Oct: no date appears in both panels |
| (c) | an **Apply** in the surface's own footer dismisses it | Apply closes and commits; neither click does (2026-09-16) |
| (e) | `onInteractOutside` refuses this field's own parts | `×` clears, calendar stays |

(b) went too: the empty-`DateRange` trick is gone, the value is plainly `undefined`.

**And a third thing the composition reached on 2026-09-16, which is really (e) again.**
The span is now drawn in the calendar and applied from a footer inside it, so the board is
not narrowed until the bench presses **Apply** — a range takes two clicks, and applied as
it is drawn the first of them empties the board to one day. That footer is the slot (e)
asks for, holding an action rather than a **Clear**: `DateRangePicker` renders its own
`Popover`, so a consumer using it has nowhere to put either, and cannot hold a draft
either way because the value it commits is the only value it has.

Two more the composition reached that the primitive still cannot. The trigger is named by
its label *and* its own content (`aria-labelledby`), so it announces
"Hearing dates, 14 Sept 2026 – 20 Sept 2026" — a `role="group"` wrapper was the best the
primitive allowed. And `max-w-(--radix-popover-content-available-width)`: the primitive
sets no ceiling, so at 200% text on a 375px viewport the two-month calendar wants 424px
and hangs off a `position: fixed` surface with no page scroll to recover it
(ACCESSIBILITY §10).

**What would bring us back**, in order:

1. **`open` / `onOpenChange`** — (c), and anything with a control of its own outside the
   portal. Our `×` is dismissed *as an outside click* until the consumer owns open state.
2. **`children`, or a header/footer slot** — (e), and where a presets row would have gone
   had it survived.
3. **`calendarProps`**, or `showOutsideDays={false}` as the internal default — (a).
4. **A max-width ceiling** on the content by default.

**The cost, recorded honestly:** this screen no longer tracks the primitive. A fix to
`DateRangePicker` will not reach it, and `check:ui-sync` cannot see the divergence,
because nothing under `components/ui/` changed. That is duplicated behaviour that agrees
today — the `check:table-rows` lesson — and it is why this is filed rather than quietly
absorbed. `date-picker.tsx` itself is untouched and still serves seven other screens.

---

## 20. `Tabs` and `ToggleGroup` accept `orientation` and forward it nowhere

Both components take an `orientation` prop, destructure it out of `props`, and then
never pass it to the Radix primitive underneath:

```tsx
function Tabs({ className, orientation = "horizontal", ...props }) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} {...props} />
}
```

`orientation` is consumed by the destructure, so `TabsPrimitive.Root` renders with its
own default. Two consequences, and the second is the one that matters:

**The styling never fires.** `TabsList` carries `group-data-vertical/tabs:flex-col` and
`TabsTrigger` carries `group-data-vertical/tabs:w-full`, both keyed on a
`data-orientation="vertical"` that does not survive to the DOM — Radix writes its own.
Rendered from Dristi at `/employee/hearings/[hearingId]/order`, `<Tabs
orientation="vertical">` produced a root with no `data-orientation` attribute at all and
a list that stayed `inline-flex` in a row. A vertical rail of four icons laid itself out
horizontally.

**The keyboard contract is wrong.** Radix uses `orientation` to decide whether a tablist
roves with Left/Right or Up/Down. A visually vertical tablist that answers to Left/Right
is worse than no vertical mode at all, because it looks reachable and is not — and
nothing a consumer passes can correct it.

`ToggleGroup` has the same swallow. It is less visible there because the component sets
`data-orientation` itself *and* styles off `data-vertical:flex-col` in its own class
string, so the layout works; the Radix roving-focus orientation is still wrong.

**Request:** forward the prop — `<TabsPrimitive.Root orientation={orientation} …>` — and
the same for `ToggleGroupPrimitive.Root`. The data attributes and the variant classes can
then come off Radix's own output rather than being written twice. If vertical `Tabs` is
not meant to be supported, the prop should be removed rather than accepted and dropped;
the vertical variant classes in `tabsListVariants` currently advertise a mode that cannot
be switched on.

**Meanwhile, in Dristi:** the order composer's section rail is composed from `Button` in
a `nav` with `aria-current`, not from `Tabs`. Switching a section of a panel is closer to
navigation than to tab panels, so nothing is lost — but it is a workaround, and the
moment a screen genuinely needs a vertical tablist there is no way to build one.

---

## 21. `ghost` has no hover state inside a well — `accent` and `surface-sunken` are 1.03:1

`Button variant="ghost"` carries `hover:bg-accent` and nothing at rest. That works on
`card`: `#ffffff` → `#f3f0ec` is a step you can see. It fails on any sunken surface,
which is where a lot of secondary actions end up:

| Surface | Value | Against `accent` `#f3f0ec` |
|---|---|---|
| `card` | `#ffffff` | 1.06:1 — visible |
| `surface-sunken` | `#f5f4f1` | **1.03:1 — not visible** |

`--accent` resolves to `--neutral-3` (`#f3f0ec`) and `--surface-sunken` is a tuned
2.5-step well at `#f5f4f1`. They are two steps of the same warm ramp a quarter-step
apart, so a ghost button in a well has, in practice, no hover feedback at all — the
pointer is the only thing telling the user the control is live, and a keyboard user gets
the focus ring and nothing else.

Found on the order composer's application rows (`order-screen.tsx`), where View sat as a
`ghost` on a `surface-sunken` card and the owner reported being unable to tell it was
highlighted. **This is not specific to that screen**: every well in the product is a
candidate — info wells, collapsed strips, filled document rows, the media wells in
`foundations/elevation`. Anywhere the pattern "quiet action inside a well" appears, the
quiet action is inert-looking.

**Request:** give `ghost` a hover that is defined against its *parent* rather than
against `card` — the straightforward version is a second step, e.g. `hover:bg-accent`
staying as-is on `card` and a `data-`/`group-` variant resolving to `accent-strong`
inside a sunken context. Alternatively document the constraint plainly in the `Button`
docs ("`ghost` requires a `card` ground") so a screen reaches for `outline` deliberately
rather than discovering it from a bug report.

**Meanwhile, in Dristi:** the application row's View is `outline`. It is the right answer
for that row anyway — it brings its own edge at rest — but it was chosen to route around
this, not because the row wanted a third bordered control.

---

## 22. `SegmentedControl` renders radio roles over toggle-button behaviour

The served DOM is `role="radiogroup"` with `role="radio"` / `aria-checked` on the items
(Radix `ToggleGroup type="single"`). But `Enter` on the checked segment unchecks it, and
the group is then a radiogroup with nothing checked. A radio the reader can uncheck is
not a radio (ARIA 1.2, ACCESSIBILITY §2).

**Every** segmented control in this repo guards it — seven call sites across six files
(`top-bar`, `sign-in-block` twice, `bond-signing-screen`, `filing/segmented`,
`order-screen`, `advocate-home`), each independently writing `if (!value) return` or
`value && …`. `order-screen.tsx:1527` is the one that
says why out loud: *"an empty value is dropped rather than being a fourth state that
only appears by accident."* When every consumer without exception writes the same guard,
the default is wrong — the primitive is shipping a state no screen in the product wants.

The same lie has a second half, measured on the render (during a date-presets
exploration on Bulk reschedule that did not ship — §19f — but the behaviour is the
component's, and the seven live call sites all have it): **ArrowRight moves the highlight
to the next segment without selecting it.** In a `role="radiogroup"`, arrow keys must move
focus *and* check the option (ARIA 1.2) — that is the whole reason a radio group is one
tab stop. So a keyboard user arrows onto the next segment, it looks focused, and the
value has not changed. Deselect-on-Enter and no-select-on-arrow are the same defect from
two sides: the component renders radio roles over toggle-button behaviour.

**Request:** pick one and render it whole. Either suppress deselect and select on arrow,
so `type="single"` is an honest radiogroup; or keep the toggle behaviour and render
toggle-button roles (`aria-pressed`) rather than radio roles. Exposing the choice
(`deselectable`) would work too, as long as the roles follow it.

## 23. There is no brand text ink — teal type on a white surface has only a fill colour

`destructive`, `warning`, `success` and `info` each ship an `*-ink` token for their word
on a plain surface. The brand family does not. So a screen that has to print something in
the product's teal reaches for `text-primary`, which is `--brand-solid` (`#007e7e`) — a
**fill** colour, tuned to carry white text on top of it, not to be text itself.

Measured on `/employee/hearings/[hearingId]/order`, where the owner's reference prints the
purpose and date of the next hearing in teal beside black labels:

| Role | Token | Value | On white |
|---|---|---|---|
| the label | `foreground` | `#1c1a18` | **17.35:1** |
| the value | `primary` | `#007e7e` | **4.90:1** |
| nearest alternative | `brand-muted-foreground` | `#0a6969` | 6.49:1 |
| `brand-11` | — | `#008573` | 4.56:1 |

`primary` clears AA for normal text and nothing more, so at the same weight as its own
label the teal value reads as the faint half of the line — the owner's report was *"the
weight of that text is very light"*, on type that was the same size and weight as the
words beside it.

**And the screen has no local answer.** Moving the emphasis onto the value
(`font-semibold`, label muted) was built and reverted on the owner's verdict the same
hour: it is mass compensating for ink, it only works on a line with a weight to spare, and
it shifts the balance of the whole block rather than the one thing that is wrong with it.
So the line stands at the measured 4.90:1, by the owner's choice, until there is a token
for it.

`brand-muted-foreground` (`#0a6969`, 6.49:1) is the value that would work, and using it
here would be off-role: it is documented as the ink *pair for `brand-muted` fills*, and
ui-craft's own rule is that a tint's foreground belongs on that tint.

**Request:** a `brand-ink` token, at the other families' contrast, for the brand's word on
`card` / `paper` / `muted`. Two smaller notes for whoever picks it up. `brand-11` is
*lower* contrast than `brand-solid` in light mode (4.56:1), so the ramp position that
reads as "the text one" is not the one to take. And in dark mode `--brand-solid` becomes
`--brand-10` (`#0eb39e`), so the pair has to be chosen per theme rather than by ramp index.

## 24. §8's `after:` inset remedy is silent about the row it lands in

`ACCESSIBILITY.md` §8 tells a consumer that a small control "must expand hit area
(padding / `after:` inset) to meet **40×40px**", and `checkbox.tsx` already does it:
`after:-inset-x-3 after:-inset-y-3` around a `size-4` box claims 16 + 24 = exactly 40px.
So a screen can follow the rule, pass every gate, and still mis-aim.

Found on `/employee/hearings/[hearingId]/order`: eight checkbox options at a **32px
pitch** — a 20px row (`text-body-compact`, 14/20) plus a 12px gap. Each box claimed its
40px correctly, so **consecutive claims overlapped by 8px**, and the winner of an overlap
is paint order rather than aim. A tap near a boundary could mark the complainant's
advocate present when the complainant was meant — a wrong line in a court record, which is
the expensive kind of mis-tap. Widening the rows to a 40px pitch made the claims tile
exactly.

Nothing catches this. The primitive cannot see the row it was put in; `check:spacing`
reads the ladder, not geometry; and the rendered box measures 40px under any tool that
asks the control rather than its neighbours.

**Request:** one sentence in §8 — *the row or list that holds the control must be at least
as tall as the claim, or the insets overlap.* Optionally state the corollary, since it is
the fix that is not obvious: once every row is a 40px target the gap between rows is
redundant, so meeting the floor in a dense list costs less height than it looks
(`4×20 + 3×12 = 116px` became `4×40 = 160px`, not 196px).

## 25. `Table` wraps itself in a `relative` container, so an `after:` inset anchors to the whole table

`Table` renders `<div data-slot="table-container" className="relative w-full overflow-x-auto">`
around the `<table>` (`table.tsx:8-12`). The `relative` is undocumented and load-bearing in
a way no call site can see: it is the nearest positioned ancestor of **every cell**, so any
absolutely-positioned child inside a cell positions against the table container rather than
against the thing it belongs to.

That collides with §8's own remedy. The sanctioned way to give a small control its 40×40
target is a transparent `after:` inset, and the product uses it (a field's clear, and now a
column header that opens a filter menu). Put that control in a `th` and the inset stretches
from the container's edges instead of the button's — which does not just mis-place the hit
area, it **inflates the table's scrollable area**, because a scroll container measures its
absolutely-positioned descendants.

Measured on Bulk reschedule's Scheduled record (2026-09-16), with a filter on the *New
hearing date* header carrying `after:-inset-x-2 after:inset-y-[-0.625rem]`: `scrollWidth`
918 against `clientWidth` 910, and `scrollHeight` 1462 against `clientHeight` 1452 — 8px and
10px, exactly the two insets. The table drew a scrollbar on each edge while needing neither,
and each bar then fed the other (the side bar steals 10px of width, so the content overflows
horizontally, so the bottom bar appears, so the content overflows vertically). The owner read
it as the build being broken, which is the right reading of two scrollbars on a table that
fits.

The local fix is one class — `relative` on the control, so it is its own positioning context
— but nothing points a reader at it: the symptom is scrollbars on a table, and the cause is a
pseudo-element two levels down anchoring to a container the call site never wrote.

**Request:** either drop `relative` from the container (nothing in the primitive appears to
need it — no absolutely-positioned children ship with `Table`), or state in the component's
guidance that the container is the positioning context for every cell, so anything absolute
inside a cell needs its own `relative`. A note in ACCESSIBILITY §8 beside the inset remedy
would catch it where people meet it.
