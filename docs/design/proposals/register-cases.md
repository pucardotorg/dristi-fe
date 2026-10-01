# Register cases

Status: draft — **the complaint's screen is revised again, from the owner's review of the
built glance.** The queue stands as built. §5a-i **A** is the current design: `D23`–`D27`
(2026-09-11, late) are this revision; `D13`–`D22` (2026-09-11 night) are the glance as
built at `58285b3`, each now carrying a verdict; §5a-i **B** (`D1`–`D12`) is the full file,
which stops being a route and becomes a disclosure; §5a-ii is everything before it.
Updated: 2026-09-11
Source: docs/product/product-foundation.md (Kerala spine, L72–74) ·
docs/product/domain/journey.md (§138/§142 chain, L30–39) ·
docs/product/domain/actors.md (L38, L45, L48) · docs/product/open-questions.md ·
docs/product/domain/practice-notes.md (`ke-scrutiny-officer-2026-07`) ·
user in this conversation (2026-09-02): screenshot of the legacy Register Cases list ·
owner (Abhiram) 2026-09-10: the complaint-file critique recorded in §5a-ii and §14 ·
owner (Abhiram) 2026-09-11: the Job, quoted in full in §4 ·
owner (Abhiram) 2026-09-11 (night): the glancing framing, quoted in full in §1 ·
**owner (Abhiram) 2026-09-11 (late): the four changes to the built glance, quoted in full
in §1**
DS read: `vendor/pucar-design-system`, pin `ds.lock.json` =
`e0cadea6b9d459bd3c58eed840974c6c610ad624`, `remote: pucardotorg/dristi-design-system`
(read from `ds.lock.json`; the vendor tree is present and was opened).
**`npm run check:ds-fresh` was not run — this session has no shell.** The pin is verified as
a fact in the repo, not as the checked-out HEAD. Run it before opening a DS file.
Files opened for this revision: `AGENTS.md` (precedence, rules 1–10, 6a, rule 3's
"67 components", the token-meaning table, the grouped-content ruling), `RESPONSIVE.md`
(rule 6 and the component-pattern table — **"Tabs: allow wrap or scroll if many triggers;
don't force equal-width tabs that crush labels"**), `src/components/ui/item.tsx`
(**`variant="outline"` = `border-border bg-card hover:bg-accent`** — the measurement D24
turns on), `src/components/ui/tabs.tsx` (`TabsList` default = `border-hairline
bg-surface-sunken`; `line` = transparent with a `brand-accent` underline; `TabsTrigger` is
`whitespace-nowrap` and `flex-1`), `src/components/ui/collapsible.tsx` (an unstyled Radix
passthrough — no animation of its own), and the `src/components/ui/` catalog re-globbed —
**67 components**. Earlier revisions also read `ACCESSIBILITY.md`, foundations `laws` /
`typography` / `spacing` / `colors` / `icons` / `elevation`, and `banner` / `table` /
`button` / `empty` / `field` / `input-group` / `pagination` / `select` / `label` /
`description-list` / `accordion` / `attachment` / `document-slot` / `badge` / `timeline`.
Skills read: `propose-ui-brief` + `references/staff-ux-thinking.md` (nine passes),
`ui-craft` §0–§6 (this revision leans on **§1.1** the separation ladder, **§2** the
cheap-tell table, **§3** the type roles, and **§4** the four surfaces).

Code read for this revision, all at `58285b3` on `feature/approve-registrations`:
`components/employee/case-review-screen.tsx` (the built ledger and finding rows — the
object the owner called tacky) · `components/employee/case-review-shared.tsx` (the shell,
header, band and stages) · `components/employee/case-file-screen.tsx` (the file view, its
pane, its deep-link effect) · `lib/employee/case-review.ts` (whole file, 2131 lines — the
seven checks, `CASE_SLOTS`, `caseFileHref`, `timelineFor`) ·
`lib/employee/scrutiny/history.ts` + `scrutiny/types.ts` + `scrutiny/queue.ts` (the
scrutiny record, `HistoryEvent`, `HistoryItem`, `HISTORY_ROUND`, `HISTORY_SUMMARY`,
`Filing.who`) · `lib/filing/types.ts` (`ExtractBox`, `ExtractedField`, `DocExtract`,
`IntakeSlot.extract`) · `components/filing/source-panel.tsx` (`regionFromBox`, the
highlight, the source chips) · `components/filing/sections/cheque-section.tsx` (the
field→source interaction the owner is pointing at) · `components/filing/section-tabs.tsx`
(the app's scrolling tab strip) · `components/cases/document-preview.tsx` (the `quiet` +
`card` framed well) · `components/employee/approve-registrations-dialog.tsx` (`FactRowView`
— the sibling grammar D24 finally inherits — and the `animate-in … motion-reduce`
motion grammar D25 reuses) · `lib/employee/register-cases.ts` (the 35 rows; **five carry
`counsel: []`**) · `lib/employee/navigation.ts` (`NESTED_ROUTES` and the `leaf` added for
`/file`) · `app/employee/register-cases/[caseId]/page.tsx` and `.../file/page.tsx`.

---

## 0. Third build — `/employee/register-cases` (owner, 2026-09-11)

**It is the only build.** On 2026-09-12 the owner took the first build's row and route
away from it and gave both to this one: *"remove the older Register Cases tab that was
there. Make this the default and rename this to Register cases."* `case-review-screen`,
`case-file-screen` and `case-review-shared` are deleted, the `-v3` route is gone, and the
rail carries one **Register cases** row again. What survived of the first build is the
queue itself (`register-cases-screen`, `register-cases-table`) — it was never rebuilt.

The owner declared the complaint's screen (§5a-i A/B) foundationally broken and is
rebuilding it as a **separate rail row beside the first build**, so the two can be read
against each other. The queue is reused unchanged; only where a row opens differs. When
the rebuild is good, v1's screen and route are deleted and it takes the name and route.

A **second build** (`register-cases-v2`, commit `615c41a`) was made and then deleted the
same day. Owner, on it: *"redo the thing again, or make V3, and delete v2 — please please
please dont recreate it as it is, i want you to use it only only only as a rough wireframe
so that we can improve on v1 completely in terms of UX and UI."* v2's content — header, two
acts, two tabs, scrutiny, timeline, the six-head synopsis — is the wireframe v3 was built
from. Nothing of its composition survives.

The owner's brief for the first version, quoted: *"it should show what the case number and
case title is, of course, and then the action of either registering or sending it back to
scrutiny. But mainly there are two tabs: the summary and the case file. Let's first build
out the summary tab, which is according to the synopsis format… The idea of this is that
it's quickly scannable for a magistrate… Another key information that decides this is also
the timeline of the case: how long did they take, and how long was it stuck in scrutiny…
Information about scrutiny: who it was cleared by, how many rounds it took, and what were
the kind of errors, maybe in a very summarized format."*

**Job** (owner's words above): the magistrate's post-scrutiny read, deciding to register or
send back to scrutiny. Confirmed; not inferred.

### 0.1 What was wrong with v2 (measured on its render, 1440 × 900)

1. **Eight identical lifted cards in one 768px column** — 2,812px tall, three screens to
   read one complaint, and no surface more important than any other.
2. **Every date stated twice.** The timeline card and the synopsis heads both carried the
   cheque date, presentation, return memo, dispatch, delivery, cause of action and filing.
3. **Forty per cent of the canvas empty** at desktop while the page scrolled three screens.
4. **The timeline was a description list of dates.** The spans the owner asked about were
   caption notes under rows, not a line you could follow.
5. **Scrutiny's numbers twice.** "Took 32 days" in the scrutiny card and "32 days in
   scrutiny · 3 rounds" in the timeline card.
6. **Constant values presented as facts** — "Company" under every accused, "Complainant's
   bank branch" under every jurisdiction, "Twice the cheque amount…" under every prayer.
7. **"Cleared by — By a registry officer"** read as a stutter on the render.
8. **Send-back copy addressed the advocate** ("nobody to send it to") though the act now
   returns the complaint to scrutiny.
9. **Both acts were dead ends** — the confirm button was disabled, so the flow never reached
   an outcome.

### 0.2 Decisions (v3)

| # | Decision | Traces to | Gave up |
|---|---|---|---|
| D1 | **Two surfaces side by side from 1280px**: *Synopsis* (what the complaint says) left, *Timeline* (when, and how long) right. Stacked below 1280, synopsis first. The approved registrations review's own shape — facts left, their companion right. | Owner's wireframe; `approve-registrations-dialog.tsx` review stage; problems 1, 3 | A single reading column |
| D2 | **Each fact once.** Dates live only on the timeline; the synopsis carries the particulars. **Deviation** from the owner's synopsis format, which lists dates under each head — logged here for sign-off. | Problem 2; facts-are-attributes | The format's per-head dates |
| D3 | **The synopsis is one sheet, not six cards.** Head name in a left gutter, term and value beside it; hairline between heads only, spacing between rows. The panel is a `@container`: gutter layout at ≥36rem, head above its rows below that, term over value on a phone. | ui-craft §1.1 separation ladder; problem 1 | Per-head cards and eyebrows |
| D4 | **The timeline is the DS `Timeline`.** The seven §138 steps, each statutory window measured under the step that closes it (all three fall between adjacent steps), muted when inside, `text-warning-ink` when outside, early, or late with condonation sought. The fixed 15-day payment gap is not stated. | Owner's "how long did they take"; problem 4 | Proportional or horizontal timelines |
| D5 | **Scrutiny is one span on the timeline**, dated taken-up to cleared, carrying cleared by, rounds, took, and — only when there were send-backs — each round's defect class from the closed `SCRUTINY_ISSUES` list. Then *Waiting to be registered · Today* as the current step with days since scrutiny. | Owner's scrutiny ask; problem 5 | A separate scrutiny card |
| D6 | **Constant values dropped**: accused type, jurisdiction basis, the compensation note, the payment gap. `SCRUTINY_MODES` are nouns ("Registry officer", "Automated scrutiny"). | Facts-are-attributes; problems 6, 7 | — |
| D7 | **Three sizes on the page**: 24px title, 14px everything else, 12px only for the two eyebrows. Tabs at 14px. | Owner, 2026-09-11 ("14 is what we are using") | 16px tab labels |
| D8 | **Acts progress in place to an outcome.** The body gives way to one card; its strip names the act, and confirming resolves the same strip into *Registered* (success pair) or *Sent back to scrutiny* (warning pair). Then *Next complaint* / *Back to register cases*. Nothing is performed; the settled state says so once. Focus follows the stage and returns to the act on Back. | `beige-canvas-and-one-modal-defaults`; registrations decision card; problem 9 | Disabled confirm buttons |
| D9 | **Send back returns to scrutiny**, with a required reason. No advocate-recipient copy. | Owner's wireframe; problem 8 | — |

**Case file tab**: an empty state until it is built.

**Craft round (owner, 2026-09-11, same day).** Owner: *"the padding is off and a lot of data
is cramped together… use better ways to draw containers between data to show better
scannability… make sure it's full width and it scales… the timeline does not need to be
fully shown all the time… a collapsible interaction."* These supersede D1, D3, D4 and D5
above where they differ:

| # | Decision | Traces to | Gave up |
|---|---|---|---|
| D10 | **Full width.** The 72rem cap is gone; the page uses whatever the canvas has. | Owner | A capped reading width on very wide screens |
| D11 | **Two tiers on one column grid.** The synopsis spans the page; below it, scrutiny takes the first third and the timeline the other two, so the gap between them falls on the synopsis's first divider. Stacked below 1280px. | Owner ("scales"); ui-craft §4 | Synopsis and timeline side by side (D1) |
| D12 | **The synopsis is six compartments**, divided by 1px hairlines drawn as the grid's gap over the hairline fill — exact at every column count. Three columns from a 896px panel, two from 576px, one on a phone; six heads divide evenly into all three. Each fact is a **label over its value**; 24px cell padding, 16px between facts, 4px label to value. | Owner ("containers between data"); problem 1 | The head-gutter sheet with side-by-side rows (D3) |
| D13 | **The timeline collapses** — closed by default, it shows only the spans: the three statutory windows against their limits and the days waiting since scrutiny, amber where the file is outside a limit, so a time-barred complaint cannot hide behind the disclosure. **Show dates** adds the dated steps in place below, in two columns (Before filing / In court); the measures are not repeated beside the dates. The toggle stays at the panel's foot in both states. | Owner ("does not need to be fully shown"); ui-craft "expand in place" | The always-open vertical timeline (D4) |
| D14 | **Scrutiny is its own panel again** — cleared by, rounds, took, what each round was sent back for — because the timeline now collapses and these must stay visible. Two columns in its third; one row of four, defects double width, when it spans the page. | Owner's scrutiny ask | Scrutiny as a timeline step (D5) |

**Case file tab (owner, 2026-09-11).** Owner: *"now build the case file. Remember how we
built the annotation module in e-filing? Try to stay faithful to that… I think I have enough
context of what a case file means by this point of the product. So just build it out."* The
annotation module is the scrutiny workbench (`components/employee/scrutiny/case-workbench.tsx`,
brief `scrutiny-workbench.md`) — the officer's three-pane reader where marks are drawn.

| # | Decision | Traces to | Gave up |
|---|---|---|---|
| D15 | **The workbench's frame, read-only.** On the Case file tab the page stops at the viewport (`100svh` less the chrome bar, the workbench's own coupling); header and tab row hold still; three resizable panes fill the rest, full bleed, each scrolling on its own — **particulars 34% · bundle 49% · index 17%**, floors 18 / 22 / 11rem. | Owner; `case-workbench.tsx` | A scrolling document page |
| D16 | **Particulars = the workbench's fields panel.** A white 56px bar with the four sections as a strip that follows the scroll and keeps its current label in view; one scroll over the sunken ground; each section a quiet caption with a rule; each group a lifted `Card size="sm"` with its icon and title; records named once inside their group; rows label-and-value at `minmax(5.5rem,9rem)`, hairline-ruled, stacking below a 20rem card. A group's documents close its card as rows with a page thumbnail and their number. | `fields-panel.tsx`, `field-row.tsx` | — |
| D17 | **No annotating.** No Mark tool, no flag per row, no composer, no raised items — the magistrate acts on the whole complaint from the header. A value read from a document keeps the workbench's source glyph, made a control: it opens that page in the bundle; the row takes the workbench's leading selection bar and the page a quiet ring while it is shown. | Owner's two-act rule; `field-row.tsx` glyph | Per-field actions |
| D18 | **Bundle = the workbench's viewer.** A 56px bar with the count (and how many were not filed) and zoom — 50–200%, digital, persisted per reader, ⌘/Ctrl-wheel about the pointer; pages in the file's order, each labelled "N · name". | `bundle-view.tsx` | Select / Mark tools and panning |
| D19 | **Pages are drawings at reading size** (`PageSheet`, new, in `page-facsimile.tsx`): margins, headings, hairline paragraphs, the cheque slip with its MICR band, the bank's stamp, the ruled form — still illegible. The thumbnail drawing scaled to a full column read as grey slabs. `PageFacsimile` stays for thumbnails, and moved out of the first build's shared file so v3 does not depend on it. | Render (2026-09-11); no fabricated records | Scans (none exist for these files) |
| D20 | **Index = the workbench's rail**, with a 56px bar so the three panes' tops align: numbered rows, the page in view marked (a picked page holds the mark while its scroll settles, and the foot of the scroll marks the last page), then **Not filed** — the slots left empty — so a missing document is visible without hunting. | `index-rail.tsx` | — |
| D21 | **Folding on the file's own width**, in rem: below 52rem (the three floors) one pane at a time behind a Particulars / Bundle switch, index in a sheet. The workbench's viewport measure squeezed all three panes below their floors at a 1024px window beside the court rail (measured). | `useRoomInRem` logic; render | — |
| D22 | **Bundle model** `caseBundleFor(review)`: filed documents numbered in file order (a record's before its group's), the empty slots listed, duplicate names told apart by whose they are ("ID proof — Complainant"). Tested: nothing dropped, numbering sequential, every particular's source resolves. | `case-review.ts` | — |

**Case file, simplified (owner, 2026-09-11, same day) — supersedes D15–D21.** Owner, on the
three-pane build: *"it's almost like a scrutiny officer view. I don't think it's inherently
wrong. It just needs a little more simplification, like it shouldn't look like another
workspace… the nearest version had attempted to solve for this by sort of showing that
floating preview versus, like, a scrolling section… the magistrate is not gonna really go
and scrutinize things here. He just wants to quickly verify something, if at all. So maybe
even giving something like a search bar might make sense if he wants to quickly search up
something and then see it against the preview."* With two reference images: a rail of short
ticks at a page's edge, and the same rail opened on hover into a card of section names.
Being faithful to the workbench turned out to mean its *conventions* (sections, lifted
groups, label beside value, the source of a value one click away) — not its *frame*, which
is shaped for an officer who works the file rather than a magistrate who checks it.

| # | Decision | Traces to | Gave up |
|---|---|---|---|
| D23 | **The file is a page that scrolls**, in the summary's grammar: a section eyebrow over one lifted panel, the section's groups inside it separated by hairlines, each group's particulars label beside value, its documents as chips under them. No fixed frame, no panes, no resizing. | Owner ("not another workspace") | The workbench frame (D15), panes (D16), zoomable bundle (D18) |
| D24 | **Search the file**, the queues' own field (`QueueSearchField`), filtering as you type: a match on a group's or a record's name keeps all of it, otherwise a particular stays when its label or value matches and a document when its name does; the match is marked; a count is announced; no match is an empty state with Clear. | Owner ("a search bar"); app-wide search rule | — |
| D25 | **Contents as ticks** (owner's reference): one short rule per group in the gutter beside the file, the group being read in foreground ink; hover or tab in and the names open over the rail in a card, the current one in primary; picking one scrolls there. The card is the real navigation — transparent, not hidden, so the keyboard reaches it and a screen reader hears a list. Hidden when a search leaves fewer than two groups. | Owner's reference images | The section strip (D16) |
| D26 | **The page, on request, beside the file** — the first build's "floating preview", owner's note. A sticky panel that at rest is the list of documents (numbered, *Not filed* below, narrowed by the search) and, when a document or a particular read from one is picked, is that page in the product's framed preview (`DocumentPreview`, quiet/card, with full view) and under it **Read from this page** — the values taken from it, the one you came from marked — so a value is checked against its source. Back, and previous/next through the bundle. Its height is fitted to the window from wherever it sits, so its foot is never under the fold (measured: 105px was, before). Below 1280px the same panel is a sheet, opened by a Documents button or by picking something. | Owner ("floating preview", "see it against the preview") | A persistent viewer |
| D27 | **One quiet affordance per row.** A particular read from a document ends in an eye that comes up with the row's hover fill, on focus, and always on touch; the row itself answers a click; the row on show keeps a light fill. Fourteen eyes in a column were the loudest thing on the page. | ui-craft §2, repeated rows | Always-visible glyphs (D17) |

Kept from the workbench build: the bundle model (D22), `PageSheet` (D19) as the page in the
preview, and the tab row fix below.

**Design review (owner, 2026-09-11, 1728×996), eight comments.** Three were confirmed with the
owner before building — the first reading of comments 6 and 7 was wrong and was reverted
unbuilt.

| # | Comment (owner) | Decision |
|---|---|---|
| D28 | *"complainant, accused, then complainant advocate… all reading like one lump"* | Each particular in a synopsis compartment is its own row, ruled from the next with a hairline, 12px above and below. Drawn from the list with a child selector: `divide-y`'s zero-specificity rule lost to the DS row's own border reset on the render. |
| D29 | *"Drawn on and Chinnakada are exactly the same hierarchy… the typographic hierarchy is very broken"* (and across the screen) | **Confirmed: 12px labels, 16px titles.** Labels take the 12px caption role (not key information); values 14px at medium weight; second lines 14px muted; card and compartment titles 16px semibold, the DS card-title role. Applied to the synopsis, scrutiny, the timeline's spans, the case file's rows and the document panel's values. |
| D30 | *"sections are feeling too crammed with each other"* | **Confirmed: more room, same layout.** Page margin 48px on large screens; 32px between header, tabs and content; 48px between the synopsis and the scrutiny/timeline row; compartment and panel padding 32px from tablet width (24px on a phone). |
| D31 | *"Is it really necessary to show this here now?"* — the document chips | Removed from the case file's groups. |
| D32 | *"a fixed section, not a cutout section… a clean border for the index"*; clarified: *"the earlier documents panel… will become a full section in itself, and it will still list the list of documents… when I click on it, it'll just become a whole section and not like a rounded off section… the index will still index on the left panel"* | **Confirmed: docked panel.** The documents panel docks to the window's right edge from the tab row's rule to the window's foot, sticky, a straight hairline down its left and no radius or shadow. At rest the list; opened, a bar (back, n of N, arrows) and one scroll holding the name with its full view, the page, and the values read from it ruled apart — so a long value wraps and the panel scrolls. The contents ticks still index the case file, now against the dock's clean edge. |
| D33 | *"these icons… too small… maybe giving it a container"* | Each group's mark sits in a 32px sunken tile beside its 16px title. |

**Case file, chunked and reordered (owner, 2026-09-11).** Owner: *"check details can be one
independent card by itself, and within that you can chunk… the payees together or payers
together, similar to how we do the e-filing… those micro headers of check and notice, it's
not really helping… might as well have independent cards that are grouped and spaced out
properly… follow a logical order… wouldn't it make sense to see the complaint and details
first?"*

| # | Decision | Traces to |
|---|---|---|
| D34 | **The e-filing's order**, complainant first: Complainant, Advocate, Accused, Cheque, Debt, Legal demand notice, Delay condonation, Complaint, Witnesses, Payment — `CASE_FILE_ORDER`, from `lib/filing/steps.ts`. The documents are numbered in the same order, so "Doc 1" is the complainant's ID proof. `review.sections` keeps its order for the first build. | Owner; e-filing step order |
| D35 | **One lifted card per group**, 24px apart; the four section eyebrows are gone. A card with one record names it under its title (the cheque's number, a party's name). | Owner ("independent cards… no micro headers") |
| D36 | **Each card chunked as the e-filing's sub-cards** (`CASE_FILE_CHUNKS`): complainant — Contact, Basic details, Institution details, Address, Power of attorney; accused — Who is summoned for the entity, Contact details, Address details; cheque — On the cheque, Return memo, Payer's bank, Payee's bank (labels shortened inside a chunk that names them: "Bank", "Branch", "IFSC", "Police station"); debt — Nature of debt, Payment against the cheque. Witnesses are a chunk each. Chunks sit two abreast when the card has room; a chunk narrower than 24rem stacks label over value. Tested: every particular of a chunked group lands in a named chunk. | e-filing `*-section.tsx` sub-card titles |

**Case file cards, craft pass (owner, 2026-09-11).** Owner: *"It's still using that 12-point
font in there. I want that completely removed, optimized for… readability and scannability…
the eye icon hover in some of those are not aligned properly… This must be your best UI craft
pass."*

| # | Decision | Measured |
|---|---|---|
| D37 | **No 12px in the case file.** Card titles 16px at 600; band names 14px at 600; labels 14px muted; values 14px in the foreground; the documents panel's counts, numbers and headings 14px. | Every text node on the tab: 16px or 14px only, at 1728, 1440, 1280 and 375 |
| D38 | **Bands, not two-abreast blocks.** Each chunk is a band ruled from the next; on a wide card its name sits in an 11rem gutter, so a card reads in three straight columns — band, field, value — and the eye runs down each. Every band's labels share one 12rem column, so values start on one vertical across the card; an untitled band keeps the gutter empty to hold it. Narrow cards put the name above the rows; phones stack label over value. The two-abreast chunks this replaces stacked label over value at half width and made the eye zig-zag. | One label column per card; list values and the comparison's first column start at the same x (761px at 1728, 553px at 1440) |
| D39 | **What is compared is a grid.** The payer's and payee's banks are one band — Payer's bank and Payee's bank as columns, Bank / Branch / IFSC / Police station as rows, a hairline between rows (`CASE_FILE_CHUNKS` `columns`). The witnesses are the same grid transposed: Name, Speaks to, Mobile, names read as values. On a narrow card each row stacks with its column's name before each value; the names are in the markup either way, so a screen reader never hears a value without its column. | Every bank value on one line at 1440 and 1728 |
| D40 | **The eye is pinned to its row**, centred on the row (or on a comparison cell) whatever its height, with the value kept clear of it; it was inside the value and hung low in rows whose label sat above. The lit row takes the tables' lighter tone on hover and `accent` while its page is on show. | 26 of 26 eyes within 1px of their row's centre at all four widths |
| D41 | **The documents panel is 24rem up to 1536px, 28rem above**, so the file keeps room for its comparisons on a laptop. | — |
| D42 | **The band gutter is per card, not per band.** A card reserves the 11rem name column only when one of its bands has a name. Complaint, witnesses, notice and payment have none, so their labels start at the card's edge and leave no empty column. | Owner: "this awkward gap that is coming because of the layout decision" |
| D43 | **Every Summary fact is two lines: the label, then the value with its note inline** ("Federal Bank · Thevally", "26 days · within 3 months"). Labels are 14px muted and values are 14px medium, so the rows line up across the compartments. | Owner: "It doesn't have to go to the third line… make the labels 14 pixel size and not 12" |
| D44 | **The timeline states dates, not spans.** The three measured windows are gone; the panel shows the §138 chain and the court's steps as dated events, and each statutory limit is written under the step that closes it — *within 3 months of the cheque date*, *beyond 1 month of the cause of action · condonation sought*. Warning ink only where the file is outside a window, and nothing behind a disclosure. **The phases stack, one chain under the other**, and each row is three aligned parts — the step, what it means, the day it closed — with the date column fixed at 6.5rem so every date shares one edge. Side by side the phases had 278px each: ragged dates, every limit wrapped, and a third of the card blank under the shorter phase. | Owner: "I'm not understanding what the 84 days means. Like was it 84 days ago?… we just show the timeline directly" |
| D45 | **Scrutiny keeps three figures and opens its rounds.** Cleared by, rounds, took; the send-backs move into a disclosure that reads as a timeline — taken up, each round with the day it went back and what for, then cleared. A file that went round four times costs the card no room at rest. The model gains a derived send-back day per round (§11.2 demo data, §12.22 unanswered). | Owner: "round 1, 2, 3, 4 and all can be shown like a timeline… hidden away in normal view" |
| D46 | **A group card's icon sits in the far corner**, not before its title. In front, it pushed the title and the record's name 44px in while every row below started at the card's own edge — one card with two left margins. | Owner: "this icon here is breaking the alignment of the title along with the copy following below" |
| D47 | **The acts ride in the sticky tab bar** once the header's pair has scrolled under it, **at the size they are in the header**. The bar is 64px whether or not they are in it, so their arrival moves nothing — a button that shrank as it crossed into the bar read as a glitch, not a transition. On a phone they take a line **above** the tabs, so the active tab's underline still sits on the bar's own rule. The header's pair stays mounted so nothing reflows, but goes `inert` — one Register in the tab order, never two. | Owner: "I have to scroll all the way back up again to find it" |
| D48 | **The header stacks below 1024px, not 768px**, and the title column grows. Under a maximal cause title — two Malayalam names and a company's full style — the title column was squeezed to 141px at 768px wide while the acts kept theirs, and the heading came down the page one word at a time. | Measured 2026-09-12; no horizontal overflow at 1440, 1032, 768 or 375 after the fix |
| D49 | **Who a record is belongs in the body, not under the card's title.** The name and the litigant type were printed as a subtitle — two values with no labels, and a reader had to infer which field each came from. They are rows now, in a first band of their own ("The complainant", "The accused"), and the cheque number joins *On the cheque*. Four of the six carry their source, so the name opens the ID proof like any other sourced row. | Owner: "it should be a part of the main body with, like, a proper heading… accused name, accused type" |
| D50 | **A card's title sits on a `surface-sunken` band**, ruled off from the body, with the icon in the far corner in the card's own white and a hairline round it. The band is the DS's warm well (#f5f4f1) against the card's white and the canvas's #f9f8f6 — a heading that reads as one, rather than a first row in a bigger font. The icon grew to 20px in a 40px chip at the DS's control radius, one step inside the card's own. | Owner: "give the header like a slight beige… this is white with a small hairline… the icon is also too small" |
| D51 | **"Who is summoned for the entity" is "Who signs for the company."** The old title claimed a summons that has not issued and named the accused an *entity*; what the file states is who signed for the company — the person S.141 makes answerable with it. | Owner: "what are you trying to say by this?" |
| D52 | **Switching tabs winds back to the tab row** when the reader is below it. The two tabs are documents of different lengths, and keeping the scroll offset landed the reader half way into the case file — or at the foot of a summary they had never scrolled. | Owner: "something about the scroll here is broken" |
| D53 | **The docked documents panel is sized by CSS, once.** It used to re-measure and resize itself on every scroll frame, so it visibly grew through the first 200px of the page (755 → 896px, measured). It is `100svh` less the stuck offset now, and constant while the page moves. | Owner, on the case file: "here also something is wrong with the scroll" |
| D54 | **A timeline row lights under the pointer**, tying its date to its step across the panel's width, and the rows have room to breathe (54px pitch, from 38). The fill is the tables' `surface-sunken`; the spacing stays inside the item so the DS rail still runs between the dots. | Owner: "give a light hover… so I can quickly associate the date along with the check detail" |
| D55 | **The addresses in the fixture are real Kerala addresses.** House name, door and ward, locality, post office, district, state, PIN — three lines in a card's value column, where the old "171, Mundakkal, Kollam – 691010" was one. A layout tested against a short line is tested against nothing. | Owner, asking three times: "the address will never be just three, four lines… make at least like three lines" |
| D56 | **The dot centres on the row's first line** (within 1px, all nine steps), the scrutiny card's facts sit in ruled bands rather than floating in one box, and the card's heading band has no rule under it — the fill change separates it, and a hairline on top of that read as a drop shadow. | Owner: "the dot and the text should be center aligned"; "everything is floating"; "looks like there is a deep drop shadow" |
| D57 | **The acts centre in the sticky band; only the tabs sit on its rule**, because the underline is the rule. The 32px hole between the cause title and the tabs was an anchor element of mine taking a share of the stack's gap; the ref moved onto the Tabs root and the gap is one step again. | Owner: "the button should be center aligned"; "why is there so much space here in between?" |
| D58 | **The documents panel's contents stop at the page's own right margin.** Its fill still runs to the window's edge, but "18 filed" and every document number now line up with the Register button above them — measured 48px from the edge, all three. | Owner: "push these in as the same margin as the register button" |
| D59 | **One build, one row, one route.** The third build is `/employee/register-cases`; the first build's complaint screen and its two helpers are deleted along with the `-v3` route and the second rail row. The queue is untouched — it was never part of the rebuild. Eight synopsis date names went with the screen that printed them (this synopsis states no dates), and the queue's `basePath` prop went with the second route it existed for. | Owner: "remove the older Register Cases tab… make this the default and rename this to Register cases" |
| D60 | **The act is an overlay over the page, not a page that replaces it** — the registrations queue's grammar, on a screen. Send back asks for the reason (the one gate), Register states the consequence; confirming resolves the same card in place, its strip taking the outcome's tone, and the footer changes to *Back to register cases* / *Next complaint*. Whichever tab the magistrate decided on stays behind it, and no second modal ever opens over it (`ui-craft` §7). | Owner: "similar to how we had done the flow in approve registration, a modal should just come up on the current screen" |
| D60a | **The overlay is one surface.** The first cut put a white card on a tinted stage inside a white dialog — three boxes for one question. The dialog is the panel: the question is its header, the answer its body, and the only fill is the outcome's. Settled, the **header itself** takes the outcome's muted pair with an icon, instead of a chip and a band repeating the title underneath it — the state is said once, in colour, with the words. | Owner: "this card in a card design looks odd to me" |
| D62 | **The state is one tag, in one place, from question to outcome.** It sits above the title on a line of its own, and on the act it *becomes* the outcome — the fill crossing to the outcome's muted pair over half a second, a round mark appearing (a tick for registered, a left arrow in a ring for sent back), the words changing under them. The header is the same height in both states (137px, measured), so nothing around it moves. The tinted header band and the second copy of the outcome that a settled overlay used to carry are gone. | Owner: "the tag should be on top or below the heading"; "can we just turn that into sent back or registered with a tick icon… so that it doesn't disrupt the current layout" |
| D65 | **The check ledger is deleted.** Seven machine-decidable checks, their header cells and 36 tests, none of which any screen had rendered since the third build replaced the first. The three statutory windows they encoded survive where a reader actually meets them — as the limit written under the step that closes it on the timeline — and the other four (a required slot empty, no advocate on record, a part payment) are already facts on the file. Recoverable from git if a summary of exceptions is ever wanted. | Owner: "I don't understand what it does… Is it important to keep or not? You tell me" |
| D66 | **The first build's timeline model goes with it**, and so does the `/employee/register-cases/<id>/file` redirect: the route the file used to be a page at, kept for one release after the file became a tab. Nothing links to it, there is no backend and no external reader, so the release it was waiting for is this one. | — |
| D67 | **One motion vocabulary, in `components/chrome/motion.ts`**, and the rules that govern it in `ui-craft` §8: forward arrivals rise, back comes from the left, an overlay rises shorter, an outcome resolves in place. Both overlays in the court area now open the same way (measured: both 11.5px into a 16px rise at 90ms, 300ms). | Owner: "I want, like, certain consistency to be there for all the animation… few rules, guardrails" |
| D68 | **The beige canvas belongs to the area, not to each screen.** It is set once on `/employee`'s own column, so every queue and every page carries it; the two screens that asked for it themselves no longer do. Audited on nine routes: no `surface-sunken` sits directly on the canvas anywhere (it measures 1.01:1 there and would dissolve). | Owner: "can you add it to all other pages also" |
| D63 | **Every "Not part of this build" caveat is gone** — fourteen of them, across the register, the registrations overlay, the copy applications, the bulk reschedule, four signing dialogs, the rail and the nav. Where the string was the only explanation on a disabled control, it reads "Not available yet" instead; where it trailed a real warning, the warning stayed and the caveat went. | Owner: "can you remove this note part of this build text from everywhere?" |
| D64 | **Arrivals have a direction.** Opening a complaint — from the queue or from *Next complaint* — rises from below over 500ms, the gesture of a file being laid down; *Back to register cases* brings the queue in from the left over 300ms. The control that navigates marks the direction and the screen that mounts takes it, so nothing animates on a reload, a typed URL or a bookmark. | Owner: "it should convey to the user that something new has come up"; "it should feel like I went back" |
| D61 | **The documents panel sticks to the tab bar's foot.** At `top-25` it stuck 13px under the bar, so its own heading sat behind the bar on every scroll and its foot hung below the fold. `top-28` with a height of `100svh` less that lands its foot on the fold when stuck. | Owner: "it cuts off randomly when I scroll up, and it moves slightly up" |

**Deferred (owner, 2026-09-11):** the lighter hover stays on tables only. Making it the
default hover everywhere is a design-system token change (`--accent`), measured and parked:
on the beige canvas the lighter tone is 1.04:1 against the ground, against 1.07:1 for today's.

**Tab row fix.** The active underline rendered 3px below the rule (rule 211px, mark 214–216px):
the primitive hangs its mark at `bottom: -5px` under a selector scoped to the horizontal group,
and a plain `after:-bottom-px` lost on specificity. The override now carries the same scope
(as every other tab row in the app does), the trigger's side padding is off so the mark is the
label's width, and the rule moved to the band so it runs full width above the case file's
panes. Measured after: rule 212–213px, mark 211–213px, on both tabs.

### 0.3 What I cut
Documents on the summary (the case file's job — open question below); the attention
alert; the timeline side sheet; any header meta line; per-row rules; the registry's
pickup delay as its own row (visible as the gap between filing and the span's start).

### 0.4 Open questions
- Does the magistrate need document presence (cheque, memo, notice, service proof,
  affidavit) on the summary, or is that settled by scrutiny having cleared it?
- Does a send-back go to the officer who cleared it, or back into the scrutiny queue?
- The defect classes in `SCRUTINY_ISSUES` are the prototype's; which the registry keeps is
  §12.22.
- Should the moved dates (D2) come back under their heads if the owner's format is
  binding?

### 0.5 Upstream DS feedback (restated in §13)
- `TabsTrigger` `line` variant: the mark's `bottom: -5px` assumes the padded default track
  and is scoped so only an equally scoped override can move it; a line list that carries its
  own rule wants the mark on that rule by default.
- `Timeline`: the rail stretches only to the item's content box, so the `pb-6` between
  items is unlined and the line reads as stubs. v3 moves the same 24px inside the item's
  content via the item's `className`; the primitive should span its own padding.
- `TimelineItem.title` is typed `string & ReactNode` (it collides with the HTML `title`
  attribute), so a title cannot carry a `<time>`. v3 composes steps as children.
- The rail is `bg-border` (neutral-8), the loudest stroke on the screen; `hairline` would
  read as a line rather than a rule.

## 1. Context

**Where this sits.** Register cases is a row in the rail's **Actions** group, beside
Scrutinise submitted cases and Approve copy application. It carries a queue of complaints
(`/employee/register-cases`) and, behind each cause title, that complaint's own screen
(`/employee/register-cases/<id>`). The queue is settled and unchanged by this revision.
**After this revision there is exactly one route per complaint** (D25).

**Where it sits in the case's life.** `product-foundation.md` L72–74 gives the Kerala
spine: 1 filing → **2 scrutiny & defect check (Registry; before numbering / cognizance)**
→ 3 cognizance & issue of process. This screen is the seam between 2 and 3.
`domain/actors.md` L38 and L45 name the actor at that seam: the **Judicial Magistrate of
the First Class** — "it takes cognizance of the complaint". `journey.md` L34 gives the act:
"The Magistrate takes cognizance of the offence on the complaint" (BNSS §210, §223,
NI Act §145).

**Who this is for — confirmed by the owner, 2026-09-11.** *"this is the screen a
magistrate sees after it passes through scrutiny."* This resolves who logs in **for this
screen**, and it agrees with `actors.md` L38 independently. It does **not** resolve
`docs/product/open-questions.md` L9–12 product-wide, and this brief does not claim it does.

### The framing that decides the shape — owner (Abhiram), 2026-09-11 (night)

Kept in full, because every decision is still measured against it:

> "the judge or the magistrate does not have a lot of time to sit and verify a lot of
> these kind of things. So the design should be very friendly and not cognitively taxing.
> It shouldn't look overwhelming. It should be very simple to navigate, very to the
> point… He already has a lot of other things to manage. So this shouldn't become an
> overhead on him. This is just a final check, almost like how in GitHub and everything,
> the people who do pull requests, they do all the work. The reviewer will just glance
> through something. So this is that equivalent of the glancing experience that you need
> to design for."

### The four changes to the built glance — owner (Abhiram), 2026-09-11 (late)

He has now seen the screen that framing produced (`58285b3`, live at
`/employee/register-cases/r-1840`). Quoted in full, because §5a-i A's new decisions are
answers to these four sentences and nothing else:

> **1.** "The preview thing of saying there are only seven checks that ran on this, or like
> if a manual scrutiny was done, it needs to clearly say the kind of scrutiny that was
> done, like whether it passed everything and how many rounds it took. Like it's like a
> report, basically, like a very quick report of how the scrutiny happened and if
> everything was good."

> **2.** "And then if something needs the attention, then the way that one strip was
> showing, it feels too tacky to me. I feel like it should be shown in a better manner."

> **3.** "When you open the full file, I feel like we can better leverage the fact that we
> can preload the document per section that is being read. For example, in the first
> section it's all about the cheque and maybe the receipts associated with the cheque and
> the notice and all of that. So the relevant three documents can be in three tabs inside
> the document viewer itself. And just like how we had it for e-filing, where when you
> click on a relevant field, it'll show the annotation. We can do the same interaction
> here."

> **4.** "There is no way to go back to the report if you open the full file. So I think
> opening the full file should be like an accordion sort of viewing more details sort of
> interaction. It shouldn't open up a new page. With good motion design, it should just
> show like, oh, it's loading, the entire file below the summary that you have designed.
> So that contextually it doesn't throw the user off."

**What they change, in one sentence each.** (1) The ledger was a report of *this screen's
own seven checks* standing in for a report of *how the complaint was scrutinised* — D23.
(2) The finding was built as a bordered `Item`, which is the DS's row-as-a-control wearing
the loudest stroke in the system, for what is really a sentence — D24. (3) The pane is a
slot with one document in it and eighteen to choose from, while the group being read
already names its own two-to-four — D26, and the field→source interaction he is pointing at
is D27. (4) The file is a second page with no way back to the report — D25.

**What this supersedes, and what survives.** D14/D15 are superseded *as the whole report*
and **the seven checks themselves survive intact** — every derivation, the two-value
severity, the no-eighth-check rule, and the limit caption. What was too thin was the
framing: seven machine comparisons of entered data were being asked to stand for the whole
of "has this been checked". D16's presentation is superseded; its rule ("a finding opens
where it is stated") stands. D17's separate `/file` route is superseded; the two-pane file
it leads to is not — it is the same view, one page up.

**What makes all four buildable today, in the product's own model.**

1. **The scrutiny record exists as a first-class thing.** `lib/employee/scrutiny/types.ts`
   models the advocate↔registry exchange as `HistoryEvent { status, title, meta, items }`
   with `HistoryItem { ref, what, was, status, open }`; `scrutiny/history.ts` holds real
   events — `"Sent back with 3 items"`, `"Sent back with 1 item · round 2"`,
   `"Resubmitted"`, `"Scrutiny started · Biju B"` — and the product's own one-line summary,
   `HISTORY_SUMMARY = "3 rounds · 1 item open since 7 Jul"`, plus `HISTORY_ROUND = 3`.
   `scrutiny/queue.ts` holds `Filing.who` (the officer) and `Filing.days`. **That is the
   shape of the report the owner is asking for**, and it restores what he said in his very
   first framing — *"the main thing that he checks is how many times or how long did the
   advocate take to get through the scrutiny"* — which the previous revision dropped when
   it cut the history. The distinction that decides D23: he does **not** want the
   annotations and defect items; he **does** want the summary of how it went.
   **The honest gap, stated up front:** `HISTORY` is one fixture for one filing
   (`F/AHM/2026/00341`, `CASE` at L75) and **nothing links a complaint in this queue to a
   scrutiny record.** D23 says what to do about that without inventing an attribute.
2. **The annotation interaction is built.** `lib/filing/types.ts` carries
   `ExtractBox {x0,y0,x1,y1}`, `ExtractedField {value, confidence, box?}` and
   `DocExtract {engine, confidence, page, fields, extractedAt}` on `IntakeSlot.extract`;
   `components/filing/source-panel.tsx` turns a box into a highlight
   (`regionFromBox(box, page, pad)` → an absolutely-positioned ring with a scrim cut-out),
   and `cheque-section.tsx` is the field→source click. It is real, and D27 says exactly how
   much of it can honestly cross to the court side today.
3. **The documents are already grouped.** `CASE_SLOTS` in `case-review.ts` declares every
   slot with its `group` and `head`, and `caseSlotFor(key)` resolves one. The owner's
   example — the cheque with its deposit proof and return memo — **is** the `cheque` group,
   exactly three slots. D26 turns that grouping into the pane's tab set.
4. **The checks are built and closed.** `caseChecksFor(id, today)` returns `CaseCheck[]`
   with `finding`, `values`, `documents` and `link`; `CASE_CHECK_COUNT = 7`;
   `caseFileHref(id, link)` already builds a deep link. D25 changes only where that link
   points.

**A second owner statement, relayed and still deliberately unresolved.** Separately from
all of the above, the owner has said *"we should guide him to either dismiss or accept the
case."* That may be loose phrasing for the send-back this brief builds, or it may mean
**Dismiss is a real third outcome**. **§12.9 is not resolved here** and it is still the
first thing in §12: it is the one open question that would add a control to the screen.

**Ownership.** The complaint screen is Neer's (court-side owner). This revision is made on
`feature/approve-registrations` at `58285b3` at the product owner's instruction. Neer's
reasoning is kept wherever it survives; every change is attributed in §14.

**In scope:** the queue list (settled); the complaint's **report** (the landing); the
complaint's **full file** (now a disclosure on the same page); the document pane and its
tabs; the fact→source interaction; the two outcomes and their capture; the header; the case
timeline. One feature, one brief; nothing is spun off.

**Out of scope:** the scrutiny workbench (`/employee/scrutiny`, a different queue with a
different object); the advocate's side of a returned complaint; what a registered complaint
is renumbered as (§12.4); notification delivery (approve-registrations §12.1).

---

## 2. Problem

Numbered so decisions and reviewers can cite them. 1–12 are the early rounds', kept with
their resolution; 13–19 are the evening revision's; 20–23 are the night revision's;
**24–29 are this revision's**, found by re-running the nine passes against the built screen
and the owner's four sentences.

1. **The row is a dead end.** *(Resolved 2026-09-09.)*
2. **The reference is a flat white page.** *(Resolved — one lifted panel.)*
3. **The reference leans on placeholders and colour.** *(Resolved by §5.4, §5.6.)*
4. **The file's structure is hidden behind a control nobody sees.** *(Resolved 2026-09-10 —
   the accordion is gone; §5a-ii.2a. **Read D25 for why that ruling does not forbid the
   file disclosing as a whole.**)*
5. **The value column is 14 pixels wide at 1280.** *(Resolved 2026-09-10; §5a-ii.4/4a.)*
6. **Nineteen of the file's facts are not attributes.** *(Resolved — the census returns
   zero invented attributes, §5a-iii.)*
7. **Two facts are prose standing in for a field.** *(Resolved.)*
8. **Six type levels down one reading column.** *(Resolved — four sizes; §7.)*
9. **The document tile is the wrong component.** *(Resolved 2026-09-11 — `DocumentSlot` +
   `ThumbnailButton`, on the owner's ruling.)*
10. **The reading column is the narrowest of three.** *(Resolved; closed by D17/D25 — the
    file has two columns.)*
11. **The tint marks the norm.** *(Resolved.)*
12. **One off-ladder size.** *(Resolved — `size-9` → `size-8`.)*

**The file's problems as a magistrate's instrument (2026-09-11 evening; passes 1, 2, 5, 7,
9).** The owner's diagnosis was the frame: *"It became a data dump where neither can he
cross-verify anything nor can he just quickly approve because so much data is thrown on his
face."*

13. **The one act the screen exists for cannot be performed on it** — a document opened in
    a `Dialog` and covered the values it was meant to be read against. *(Fixed by D1.)*
14. **Nothing tells him whether this file has anything wrong with it.** *(Fixed by D14/D15,
    and **widened by D23**: the file also never said whether a *person* had checked it.)*
15. **The statutory chain is the second section; the first screenful is a phone number.**
    *(Fixed by D4.)*
16. **Both decisions are dead, and one of them is the wrong act.** *(Fixed by D9; §12.9
    open.)*
17. **Fifteen of the forty-seven values on this file have no source document.** 29
    checkable, 3 computed, **15 declared-only**. *(Pass 9. Now load-bearing for D27: it is
    the reason a fact→source interaction cannot be offered on every row.)*
18. **Two of three columns serve reading, neither serves verification.** *(Fixed by
    D7/D8/D21.)*
19. **The norm is marked in three places while the one exception is at row 14.** *(Fixed by
    D3/D6.)*

**The glance's problems (2026-09-11 night).**

20. **The screen proposed an hour earlier was a better instrument for the job the
    magistrate delegated.** *(My defect; fixed by D13.)*
21. **A clean file said nothing, and nothing cannot be told from "not checked".** *(Fixed by
    D14.)*
22. **The machine already decides seven of the magistrate's questions and the screen
    surfaced one.** *(Fixed by D15.)*
23. **Nothing said what could not be checked.** *(Fixed by D14's caption; **extended by
    D23**, which adds the one thing that *can* say a document was read: a person.)*

**The built glance's problems (found 2026-09-11 late; all nine passes re-run against
`58285b3` and the owner's four sentences).**

24. **The report reports the wrong thing.** The ledger's subject is *this screen's own seven
    machine comparisons*, run a second ago, over entered data, reading no document. The
    magistrate's question is "how was this complaint scrutinised" — by a person or by a
    machine, did it pass, how many rounds did it take, how long did it sit. **The product
    models every one of those facts** (`HistoryEvent`, `HISTORY_ROUND`, `HistoryItem.open`,
    `Filing.who`) and the screen states none of them. Worse: `timelineFor` in
    `case-review.ts` fabricates two steps — *Taken up for scrutiny*, *Scrutiny completed* —
    from a modulo on the wait, and buries them in a `Sheet`. So the screen does make a claim
    about scrutiny; it makes it invented, and out of sight. *(Passes 1, 9. The owner's
    change 1.)*
25. **The finding is built as a control and reads as one.** Measured against the source at
    `58285b3`, three causes, each independently sufficient:
    (a) `Item variant="outline"` is `border-border bg-card` (DS `item.tsx` L42) — a
    card-white box on a card-white panel, separated by the **darkest non-text mark in the
    system** (`border` = neutral-8, 1.86:1 on card). That is the first row of `ui-craft`'s
    cheap-tell table verbatim, and it skips the separation ladder (§1.1: spacing → fill →
    shadow → hairline → border) straight to its last rung.
    (b) `Item` is the DS's **row-as-a-control**: `rounded-lg`, control padding
    `px-3 py-2.5`, `hover:bg-accent`, focus ring on the box. The build had to cancel the
    hover (`hover:bg-card`) on *both* branches — a component telling you it is the wrong
    one.
    (c) One row and three rows are the same component doing different jobs: check 6's
    finding renders as the identical box with the trigger, the chevron and the hover taken
    out — a control costume with no control in it. *(Passes 5, 6, 7. The owner's change 2,
    and the diagnosis he asked for before the redesign.)*
26. **The pane is a slot machine with eighteen levers.** `CaseDocumentPane` holds exactly
    one document, starts empty, and is filled only by a thumbnail press or a deep link —
    while the group under the reader's eye already declares its own documents
    (`CaseGroup.documents` / `CaseRecord.documents`, and `CASE_SLOTS[key].group`). The
    reader does the routing the model could do. *(Passes 1, 2. The owner's change 3.)*
27. **A fact's source document is guessed from order, not stored.** D6 paired facts to
    documents by *position* — "the cheque group's facts run cheque → deposit → return, and
    its three documents are the cheque, the proof of deposit and the return memo, in that
    order" — and named the fix in the same breath. Order is not a mapping, and an
    interaction needs a mapping to bind to. Meanwhile the mapping **has** been written, row
    by row, in this brief's own `Checked against` column. *(Pass 9. The precondition for the
    owner's change 3.)*
28. **The file is a second page and the report is not on it.** `/file` is a route; the only
    way back to the report is the browser or the crumb, and neither is on the screen. A
    magistrate who opens the file to settle one question loses the statement that sent him
    there. *(Pass 1. The owner's change 4.)*
29. **This brief's own observable was counted wrong.** §3 claimed "32 of 35 complaints show
    exactly one line". Counted against the code: findings fire on `r-1333`, `r-1588`,
    `r-1490`, `r-330`, `r-1654` **and on the five complaints with `counsel: []`** — `r-1490`
    (already counted), `r-165`, `r-441`, `r-341`, `r-648`. Nine complaints carry at least
    one row; **26 of 35 are clean**, not 32. The derivation was right and nobody counted.
    `case-review-screen.tsx`'s own docstring already says twenty-six. *(Corrected in §3, §5,
    §10 and §14.)*

---

## 3. Objective

Not provisional — the Job is confirmed (§4) and the posture is stated (§1).

- **The common visit is one screenful and one act.** Observable: on `r-1840` at 1280×800 —
  identity, the scrutiny report, the check line, the way in, and both controls, **without
  scrolling**. §7 carries the arithmetic (≈616px against 800) and §11.1 hands it to the
  render.
- **The screen says how the complaint was checked, by whom, and how hard it was** — on
  every file, in four values and one line. Observable: on all 35 complaints the report
  states the kind of scrutiny, the number of rounds, how long it took and when it cleared;
  and on **26 of 35** (problem 29) nothing else appears under it.
- **The screen states its own limit.** Observable: one caption on every file saying the
  machine checks read entered data and no document — and, once D23 lands, a report in which
  the one statement that *can* claim a document was read is the one attributed to a person.
- **A finding reads as a sentence, not as a button.** Observable: no full-strength stroke
  anywhere in the report region; the same row shape whether there are one, three or seven of
  them; a non-openable finding is visibly not a control.
- **Reading the whole file never costs the report.** Observable: opening the file leaves the
  report where it is, the act reachable throughout, and Back closes the file.
- **The document beside the claims is the one the reader is already reading about.**
  Observable: scrolling into the cheque group puts the cheque, the proof of deposit and the
  return memo in the pane's tabs without a click; clicking `Deposited on` selects that fact
  and shows the proof of deposit.
- **Both outcomes are the two the owner named**, and the third is an open question rather
  than a dimmed control (§12.9).

---

## 4. Job

**Confirmed — owner (Abhiram), 2026-09-11. Unchanged by this revision. Quoted, not
paraphrased, and not re-opened.**

> "this is the screen a magistrate sees after it passes through scrutiny. So sometimes a
> magistrate might spot something and send it back for correction again. A lot of the
> times he'll just register the case directly only."

> "The annotation and history and everything, I don't think the magistrate needs to see,
> which is why he delegated that work in the first place in manual scrutiny. In automated
> scrutiny, that process will anyway not happen. So in case of both, it's almost like a
> situation of if he wants to dig in, then he can see the entered information against the
> original source."

> "This round is almost like a light scrutiny, scrutiny light in a way… he becomes a
> scrutinizer… we should make it fast and easy, not as exhaustive as how the scrutiny
> officer's flow is. It's almost like a quick verification of does this information match
> with another, and he'll quickly check and then register the case or send it back for
> correction again. That sending it back will go to the advocate."

**In the terms the product already uses.** The complaint has passed scrutiny
(`product-foundation.md` L73) and stands before the magistrate for cognizance
(`journey.md` L34, BNSS §210). The act is a **confirmation that the entered data matches its
source document**, with two outcomes: **register** (the common one, taken directly) and
**send back for correction**, which goes to **the advocate**.

**What this Job is not**, stated by the owner rather than inferred: not the scrutiny
workbench (no annotation, no defect log, **no scrutiny history**); not a file to be read end
to end; not a place to dismiss a complaint (§12.9).

**The line D23 has to hold.** "The annotation and history and everything, I don't think the
magistrate needs to see" forbids the *events and items*. It does not forbid **the fact that
scrutiny happened, how it went, and how long it took** — which is what he asked for in
change 1 and what he asked for in his first framing. The report states the summary; the
history stays the workbench's. Anything that lists events, items or corrections on this
screen has crossed the line.

**Who logs in product-wide is still open** (`open-questions.md` L9–12). This brief resolves
it for this screen only, on the owner's word, and says so.

---

## 5. Decisions

### 5.1 — The queue (unchanged by this revision)

1. **Same screen as Schedule hearing.** Title on the page, one lifted panel, search then
   table then `ListFooter`. Rejected: a second filter card; a table drawing its own frame
   inside the panel (box-in-box, `ui-craft` §4).
2. **Search only — no stage filter.** A complaint waiting to be registered is in one state.
   *Judgment.*
3. **Search is the teal action.** One primary per view. Clear is ghost. *Law.*
4. **Visible field label** (`Field` + `FieldLabel`). Forced by ACCESSIBILITY §12.
5. **Four columns: case name, case number, advocates, days since submitted.**
6. **Days are a number, right-aligned, `tabular-nums`, `text-warning-ink`.** *Reopened by
   the sibling sweep — D12, D22; still open queue-wide.*
7. **No actions column.** The decision lives at the foot of the complaint's screen.
8. **Demo data is 35 CMP complaints, longest wait first.**
9. **Phone: stacked items, not a four-column table.** *RESPONSIVE.*

---

## 5a. The complaint's screen

**What is current, in one map** (code comments cite `§5a.N` and `D-n`, so nothing is
renumbered):

| Part | Decisions | Status |
|---|---|---|
| **5a-i A** — the landing, now **the report** | `D13`…`D22` (built at `58285b3`) + **`D23`…`D27`** (this revision) | current; D14/D15's framing, D16's presentation and D17's route are superseded **in place**, with verdicts |
| **5a-i B** — the full file | `D1`…`D12` | current **as a disclosure on the same page** (D25), not as a route |
| **5a-ii** — everything before | §5a.1…§5a.10 | each with a verdict; nothing deleted |
| **5a-iii** — Attributes | the census | updated: the report's rows added, `CaseFact.source` added, `Surfaced` re-valued |

**Passes run (2026-09-11, late):** all nine of
`.claude/skills/propose-ui-brief/references/staff-ux-thinking.md`, in the skill's order —
Tuesday, domain layout, **attribute census (third)**, control vocabulary, real weather,
exception vs. norm, pattern census, sibling sweep, render judgment. Findings are problems
24–29 and the sweep in D28's table. **Pass 8 is not discharged and is not claimed:** this
session has no shell — nothing was curled, no screenshot was taken, and
`npm run check:ds-fresh` was not run. Every width and height below is arithmetic from the
known chrome (256px rail, `p-6 md:p-8` page padding) or read off the source. **What the
builder must measure is §11's list, and the render can veto any of it.**

---

### 5a-i A — the report (the landing)

#### D13 — Push back first: the landing is not a verification surface

> **STANDS, and this revision widens it.** The landing does not let him check; it tells him
> what has been checked and what could not be. What D13 got wrong is *how much* it told
> him: it reported the screen's own seven machine comparisons and called that the answer
> (problem 24). The region is still one region, still one line tall on a clean file, and it
> now reports **two** checkings — the registry's, and the screen's.

Four things in this order, unchanged in order and extended in content:

1. **Who and how much** — the header (D18).
2. **How this complaint was checked** — the report: the registry's scrutiny (D23), then the
   seven checks (D14/D15), then a row per finding (D24).
3. **The way in** — one control, now a disclosure rather than a route (D25).
4. **The act** — Register, or send back for correction (D9, D19).

*Rule:* the owner's glancing framing (§1); §4's "not as exhaustive as how the scrutiny
officer's flow is".
*Given up:* unchanged — a magistrate who wants to read the whole complaint pays one
interaction for it. D25 makes that interaction cheaper than D17 did.

#### D14 — The check ledger: one line on every complaint, rows only for findings

> **The line STANDS verbatim. Its framing is SUPERSEDED by D23**, which makes it the
> *second* of two statements rather than the whole report. Nothing about the words, the
> caption or the three copy rules changes. **The checks themselves are untouched.**

On every complaint, in the same place, in the same words:

> **Seven checks ran on the entered data. Nothing flagged.**
> *(caption)* Checks compare entered values with each other. No document was read.

…and when something fires, the same line counts it — *"Seven checks ran on the entered
data. Two need a look."* Three rules the copy obeys, all still load-bearing: **it is the
system's finding, never the court's claim** (it never says the complaint is in order, never
recommends an outcome); **it states its own limit** (the caption, and it is why the line can
be trusted at all); **a pass is never a mark** (no tick per check, no `success` tint, no
per-group cleared state — twelve green ticks on twenty-six clean files is the norm marked,
which §5a-ii.10 already killed once).

**What D23 changes about this line, and only this:** it is now explicitly *the machine's*
half of the report, sitting under a hairline below the registry's half, so that neither can
be read as the other. The caption's "No document was read" is true of the checks and **not**
of a manual scrutiny — which is precisely why the two statements cannot be merged into one
count (D23).

*Rule:* pass 5 (proportion, not deletion); AGENTS rule 6; ACCESSIBILITY §3.
*Fixes problems 14, 21, 23.*

#### D15 — What a check is: seven, closed, machine-decidable, two-valued in severity

> **STANDS in full, unchanged, and built** — `case-review.ts` L1667–2089 at `58285b3`. The
> owner's change 1 is not an argument against the checks; it is an argument that seven
> machine comparisons are not the whole of "was this scrutinised".

| # | The check, as a question | Derivation | Class | Fires on |
|---|---|---|---|---|
| 1 | Cheque deposited within three months of its date? | `daysBetween(chequeOn, depositedOn) ≤ PRESENTATION_WINDOW_DAYS` (90) | flag | **`r-1333`** |
| 2 | Notice sent within thirty days of the return? | `daysBetween(returnedOn, noticeSentOn) ≤ NOTICE_WINDOW_DAYS` (30) | flag | none in the demo data |
| 3 | Complaint filed after the fifteen days ran? | `daysBetween(accruedOn, submittedOn) > 0` | flag | none in the demo data |
| 4 | Filed within the month, or is an application to condone on the file? | `sinceAccrual ≤ FILING_WINDOW_DAYS` \|\| `applicationOnFile` | flag | **`r-1588`** |
| 5 | Every document the form required on the file? | `IntakeSlot.file === null` over required slots (§12.16) | flag | **`r-1490`** |
| 6 | An advocate on record? | `counselFor(complaint,"complainant").length > 0` | **note** | **`r-1490`, `r-165`, `r-441`, `r-341`, `r-648`** *(corrected — five rows carry `counsel: []`; problem 29)* |
| 7 | Anything paid against the cheque? | `DemandNotice.paymentStatus === "part"` | **note** | **`r-330`, `r-1654`** |

**Severity is two-valued and derived, never authored** (`flag` | `note`); flags take
`warning-ink`, notes take plain ink — appearing in person is lawful and must never be inked
as a defect. **Order:** flags in statutory order, then notes. **No check says the same thing
twice** (check 4 names the delay application; check 5 does not count it again). **No eighth
check**, and specifically not the cheque's return reason (§12.7) or jurisdiction (nothing
maps a branch to a court).

*Given up:* checks 2 and 3 never fire on the demo, and the fixtures must not be bent to make
them. Named in §10.

#### D16 — The exception row: the finding, then the values, then the document

> **The rule STANDS; the presentation is SUPERSEDED by D24.** "A finding opens where it is
> stated", inherited from `approve-registrations` **D23**, is right and stays: the row states
> the finding in words, the disclosure holds the entered values the check read and the
> documents that would settle it, and the conclusion is never hidden — only the working.
> What was wrong is what the row was made of (problem 25) and where a document went when
> you pressed it: under D25 it no longer leaves the page, because there is no longer
> anywhere to leave to.

#### D17 — The full file is one control and one route

> **SUPERSEDED by D25.** The reasoning that chose a route — *an expansion makes the landing
> a mode; a mode needs a second control to leave and a memory of which mode you are in; an
> overlay re-introduces the scrim; a route gives Back for free and is linkable* — was sound
> and is **answered rather than dismissed** by D25: the mode's memory and its linkability
> both move into the URL as a query parameter, which keeps Back and keeps the deep link
> while removing the second page. The control, its honest name and its counts survive
> verbatim. So does the rule that **the decision band is reachable wherever the reader ends
> up** — trivially, now that there is one page.

#### D18 — The header identifies the complaint and carries the money

> **STANDS, built, and unchallenged by the owner's review.** Case number on its own identity
> line, cause title as `h1`, four label-over-value cells under a hairline:
> **Court · Amount · Submitted · Waiting**. No eyebrow, no separators, no status `Badge`
> (`CASE_REVIEW_STATUS` is a one-member enum). `Amount` remains **my** addition, flagged in
> §11; the owner has now seen the built header twice without objecting to it, which is not
> the same as approving it.

**D23 inherits this cell grammar rather than inventing a second one** — see pass 7 in D28.

#### D19 — The act, unchanged — and the third outcome is the owner's question

> **STANDS.** Send back for correction (soft `destructive`, left) and Register case (teal,
> right), sticky at the foot, both `aria-disabled` until §12.4; Register takes a
> confirmation **stage of the page**; send-back takes the required free-text reason of D10.
> The owner's separate *"we should guide him to either dismiss or accept"* remains **§12.9**
> and `Dismiss` is **not** quietly reinstated.

#### D20 — Nothing on the landing opens an overlay

> **STANDS, and D25 makes it stricter rather than looser.** With the file on the same page,
> the membership rule becomes: **on this screen an overlay is only ever the document
> `Sheet`/`Drawer` below `xl`.** Everything else — the report's findings, the file itself,
> the register confirmation, the send-back composer — is a region or a stage of the page.
> Anything that wants a `Dialog` here is a finding that this brief got the shape wrong.

#### D21 — The reading index stays cut; the timeline stays behind a control

> **STANDS, corrected twice.** (1) D7's deletion of the sections' `scroll-mt-(--chrome-
> sticky-top)` was wrong and they stay — deep links land under sticky chrome (already
> corrected, already built as `SCROLL_REST`). (2) **The reading observer comes back, and
> D26 is what it comes back for** — not as an index rail, but as the thing that tells the
> pane which group is being read. D7's preserved rule is reused rather than rebuilt: *a
> click claims the marked target until the reader scrolls; under that, the last heading to
> cross a line a third down the viewport; under both, the end of the scroll is its own
> answer* (verified over CDP — 40/40 clicks, 60/60 scroll positions, three viewports).
> (3) **The timeline loses two steps to D23** — *Taken up for scrutiny* and *Scrutiny
> completed*, both fabricated from a modulo on the wait, are replaced by the report's real
> attributes. The `Sheet` stays, attached to the file region.

#### D23 — The scrutiny report: one region, two sourced statements

**This is the answer to the owner's change 1**, and the largest addition in this revision.

**One report, not two panels; two statements inside it, not one count.**

The reader has one question — *how was this complaint checked?* — so there is one region,
in the same place, on every complaint. But two different things did the checking, with
different authority, and fusing them produces a claim neither made:

- **A registry officer (or an automated pass) read the complaint before it got here.** That
  is the Kerala spine's step 2 and the thing the magistrate is actually trusting when he
  registers without opening a document.
- **Seven machine comparisons ran a second ago, over entered values, reading no page.**

A single merged count — *"eight checks passed"* — would credit the machine with the
officer's reading and the officer with the machine's arithmetic, and it would make D14's
caption ("No document was read") a lie about the officer. So: **two statements, each
naming its own actor, a hairline between them, the registry's first** — because it happened
first and because it is the stronger basis.

**Statement 1 — the registry's scrutiny, as four values in the header's own cell grammar:**

| Term | Value | Type |
|---|---|---|
| **Scrutiny** | "By a registry officer" / "Automated" | closed enum, two members |
| **Rounds** | `3` | derived count, `tabular-nums` |
| **Took** | "34 days" | derived, `tabular-nums` |
| **Cleared** | "12 Mar 2025" | data (a day) |

Four cells, `grid-cols-2 sm:grid-cols-4`, `text-caption` term over `text-body-compact`
value — **the same component the header already uses** (`CaseHeaderCell`), because one
label-over-value grammar on one screen is the whole of pass 7 (D28).

Three things about these four cells are deliberate:

- **The kind of scrutiny is a value, not a tone.** "By a registry officer" and "Automated"
  are two members of one enum, rendered identically. The magistrate draws the inference
  (a person can read a page; a machine here cannot); the screen does not draw it for him.
  This is D14's "never the court's claim" applied to a second source.
- **"Cleared" carries the outcome in the term and the date in the value.** `Submitted`
  already works this way in the header two panels up. It is safe because a complaint is in
  this queue *because* scrutiny cleared it — and if the product ever routes one here
  uncleared, that is a **finding**, not a cell that quietly says otherwise (§10, §11).
- **Rounds and Took are the varying facts and carry no ink.** They are what the owner asked
  for in his very first framing — *"how many times or how long did the advocate take to get
  through the scrutiny"* — and they are where a reader's eye should land, because 1 round in
  4 days and 3 rounds over 34 are different objects. **No tone, no escalation, no
  threshold**: the machine does not tell a magistrate that three rounds is bad. §12.19 is
  his to answer.

**Statement 2 — the seven checks**, D14's line and caption, verbatim, under a hairline.

**Then the findings** (D24), under a second hairline, zero to seven of them.

**Where the values come from, and the gap stated plainly.** Every attribute above is real
and already modelled in `lib/employee/scrutiny/`: rounds are the count of `"Sent back…"`
`HistoryEvent`s (the model even numbers them — `"· round 2"` — and exports `HISTORY_ROUND`);
the officer is `Filing.who` / the event's `meta`; the elapsed is the span between the first
scrutiny event and the one that cleared it; `HISTORY_SUMMARY = "3 rounds · 1 item open
since 7 Jul"` is the product's own one-line form of exactly this report. **What does not
exist is the link**: `HISTORY` is a single fixture for one filing in the scrutiny prototype,
and no complaint in this queue points at a scrutiny record. Two consequences, and they are
the whole of the honesty here:

1. **The values are derived the way the §138 chain is derived, and for the same reason**
   (§5a-ii.8: *a derived value is legitimate demo data; a derived attribute is not*). A
   `scrutinyFor(id, today)` sits beside `caseChainFor`, keyed off the queue row, with its
   dates inside the wait and its rounds marked per complaint in `CASE_FILE_MARKS` — the
   same mechanism that already decides whether a file was late or a slot was left empty.
   **This is not new fiction: it replaces fiction.** `timelineFor` already invents *Taken up
   for scrutiny* and *Scrutiny completed* from `wait >= 3` and `wait >= 7`; those two steps
   go (D21), and what replaces them is a modelled record with real attribute names.
2. **§12.10 is upgraded from "do not build on a guess" to "confirm what is stored".** The
   owner has now asked for this report, so the question is no longer whether to surface a
   scrutiny outcome but which fields the registry keeps (§12.22). Until he answers, the
   design is right and the values are demo data — and §11 says so where a reader will see
   it.

*Rule:* owner, 2026-09-11 late, change 1, quoted in §1; owner's first framing (rounds and
duration); `lib/employee/scrutiny/types.ts` + `history.ts` + `queue.ts` for every attribute;
`product-foundation.md` L73 for the step itself; pass 9 (a report whose values are not
fields is a fabricated report); §5a-ii.8 for the derivation rule.
*Rejected — one composed sentence* ("Scrutiny cleared this complaint in three rounds over
34 days"). Prose doing a field's job: three outcomes need three sentences, a fourth needs a
fourth, and nothing can be sorted, counted or translated. It is the defect this brief
already caught in the synopsis, the grounds and the reply row (`ui-craft` §1.6, pass 9).
*Rejected — a `success` chip, a tick, or the word "Passed" in a tint.* §5a-ii.10 is the
precedent and it is the strongest one in this file: the `Alert` that spoke on all 35
complaints was cut for exactly this.
*Rejected — the history itself* (the events, the items, the corrections, `HISTORY_SUMMARY`'s
"1 item open since 7 Jul" as a list). §4 forbids it in the owner's own words. The report is
the summary; the workbench keeps the record.
*Rejected — a fifth cell for the officer's name.* See §6, and §12.18 for his call.
*Given up:* a magistrate who wants to know *what* was raised in those three rounds cannot
find out here. That is the line §4 draws, and the send-back reason is where the court's own
words live.
*Fixes problems 24, and half of 23 — the report now contains one statement that can honestly
imply a page was read, and it is the one attributed to a person.*

#### D24 — A finding is a statement, not a strip

**This is the answer to the owner's change 2**, and the diagnosis comes before the fix
because the fix is only defensible if the diagnosis is right. Problem 25 carries the three
measured causes: a full-strength `border-border` box on a white panel; a control-shaped
primitive around a sentence; and one component doing two jobs depending on whether the
finding happens to have working to show.

**What replaces it.** The findings are **rows of the report**, not objects on it:

- Separated from statement 2, and from each other, by `border-t border-hairline`. No fill,
  no box, no radius. This is `ui-craft` §1.1's ladder taken from the top instead of the
  bottom: spacing does the grouping, a hairline does the separation, and the darkest mark in
  the system is not spent on a list of two.
- **Icon + sentence + chevron.** `size-4` `CircleAlertIcon` in `text-warning-ink` for a
  flag, `InfoIcon` in `text-muted-foreground` for a note (ACCESSIBILITY §3 — never colour
  alone; the words carry the finding either way).
- **The sentence steps up to `text-body`** from `text-body-compact`. `ui-craft` §3 reserves
  body-compact for "dense staff tables/rows — opt-in only", and a finding is not a table
  row: it is the one piece of prose on the screen that a magistrate must actually read. This
  single change does more than the border removal to stop the row reading as furniture.
- **The chevron appears only where there is working to show**, and a finding with none
  (check 6) is simply a row without one. Because the row is no longer a bordered control,
  a row that is not a control no longer looks like a dead button — which is cause (c) of
  problem 25 fixed at its root rather than patched.
- **The detail opens beneath, in the sentence's own column** (`pl` to clear the icon), `pt-3
  gap-3`: the `DescriptionList` of values the check read, then the document rows. No second
  frame and no well — the panel is the frame and depth on this screen stops there
  (`ui-craft` §4).

**This is `approve-registrations`' own grammar, finally inherited.** `FactRowView` in
`approve-registrations-dialog.tsx` L906–947 is a `Collapsible` wrapping a **hairline-separated
list row**, chevron beside the words, detail spanning the row — no `Item`, no outline, no
box. D22 claimed the glance had taken that grammar "verbatim"; the build took the mechanism
and not the shape. Pass 7, closed for real.

*Rule:* `ui-craft` §1.1 (the separation ladder) and §2 (the cheap-tell table's first row);
`ui-craft` §3 (type roles); DS `item.tsx` L42 (the measurement); `approve-registrations` D23
and its `FactRowView`; ACCESSIBILITY §3 and §8 (`min-h-10` on the trigger).
*Rejected — `warning-muted` behind the findings block.* It would be legal: AGENTS rule 6
gives three treatments per status, and a tint that appears on 9 of 35 complaints marks a
deviation rather than the norm. It is still wrong here for two reasons — the detail holds
sunken document wells, and a well on a tint is AGENTS **6a**'s problem arriving by the back
door; and a tint turns statements a magistrate must *read* into a callout he can skim.
**Reversible in one class if the owner wants urgency — §12.19.**
*Rejected — keeping the box and softening it to `border-hairline`.* A hairline box is still
a box, and the box was never the root: the row was shaped like a control.
*Rejected — `Banner`.* Unchanged from §8's standing answer: `banner.tsx` binds an icon to
each variant and fills the row; a megaphone reporting a completed check is wrong and every
tinted variant is the `Alert` §5a-ii.10 cut.
*Given up:* the crisp per-finding hit area a bordered row gave. The trigger keeps `min-h-10`
and its own focus ring, and the hairlines above and below state the row's bounds — but this
is the first thing to look at on the render (§11.3).
*Fixes problem 25.*

#### D25 — The full file discloses below the report, on the same page

**This is the answer to the owner's change 4.** The `/file` route goes.

**Why this is not the accordion the owner cut on 2026-09-10 — stated first, because the
brief must not read as contradicting itself.** That ruling (§5a-ii.2a, problem 4) was about
**the five sections of the file folded against each other**: five headings whose disclosure
affordance was invisible — *"it wasn't very apparent to me that litigant details,
case-specific details, etc. are collapsible accordions until I saw it"* — each hiding the
thing the reader had come to read. This is a different object in every respect that mattered
to him: **one** disclosure, not five; the affordance is a **button with a verb and a count
on it** ("Open the full file · 41 entered values · 18 documents"), not a heading; it hides
the **optional** path rather than the reader's destination; and **nothing inside it folds** —
the four sections stay open exactly as §5a-ii.2a requires. The 09-10 ruling stands
untouched and governs the file's interior; this governs the file's own door.

**The mechanics.**

- **One control, in the same row it already occupies, toggling its label** — "Open the full
  file" ⇄ "Close the full file", counts unchanged beside it. `aria-expanded`, `aria-controls`
  pointing at the file region. Not a second control anywhere (pass 6).
- **The report is not pinned.** It stays where it is and the file grows beneath it. Pinning
  ~190px of already-read statement over a 41-row file would spend a quarter of every
  screenful restating it. What must stay reachable is **the act**, and it already does: the
  decision band is `sticky bottom-0` on the shell and is untouched by this decision.
- **The way out stays reachable from the bottom of a long file.** Once the file is open, the
  control's row becomes a slim sticky strip under the chrome — `sticky top-(--chrome-sticky-
  top)`, `bg-card border-b border-hairline`, `h-12`, carrying *Full file · 41 entered values
  · 18 documents* and the Close control. It is the **same control in the same row**, which
  has become sticky; `ui-craft` §2's own rule for this shape — *"a toggleable panel that
  fully disappears when closed → persistent surfaces collapse to a slim strip and expand in
  place"* — and the reason it is not a pattern fork.
- **The state lives in the URL, which is what the route was really for.** `?file=1`, pushed
  with `router.push` so **Back closes the file** (the one thing D17 correctly said a route
  gives for free), a link still opens it, and the check findings' deep links keep working
  unchanged in meaning: `caseFileHref` becomes
  `/employee/register-cases/<id>?file=1&doc=<slot>#case-group-<group>`. They now scroll
  within the page instead of loading another one. `/file/page.tsx` becomes a redirect to the
  query form for one release and then goes; `NESTED_ROUTES`' `leaf` in
  `lib/employee/navigation.ts` goes with it — it was added for this one route, its own
  comment says *"a leaf is added when a route earns one"*, and the crumb ends at the case
  number again.
- **Motion, and the honest version of "it's loading".** The region enters with
  `animate-in fade-in-0 slide-in-from-top-2 duration-300 fill-mode-both
  motion-reduce:animate-none` — **the app's own motion grammar**, lifted from
  `approve-registrations-dialog.tsx` (`SLIDE`, and the settled well's `fade-in-0 duration-500`)
  rather than invented, including its `motion-reduce` escape. No stagger across the four
  sections: they are all already in memory, and a cascade would be decoration claiming work
  that is not happening.
- **There is no skeleton, and this is deliberate.** The file is derived in the browser —
  nothing loads. `case-file-screen.tsx` already refuses a skeleton in the pane's empty state
  for exactly this reason: *"a skeleton promises something is loading; nothing is."* What the
  owner is asking for — *"so that contextually it doesn't throw the user off"* — is
  **continuity**, and continuity here is the report not moving, the control staying under
  the reader's cursor, and the file arriving rather than snapping. **When a document store
  arrives** (§12.8) the *pane* gets `DocumentPreview`'s own loading states; the values never
  will. Staging a fake wait for data we already hold would be the one lie this screen cannot
  afford.
- **Focus.** Opening moves focus to the file region's first heading (`tabIndex={-1}`), so a
  keyboard reader is not stranded on a button whose page just grew 41 rows; closing returns
  it to the control. Arriving on `?file=1#case-group-…` opens the region before the hash
  resolves, then scrolls and focuses the head — the existing `useDeepLink` effect, one page
  up.

*Rule:* owner, 2026-09-11 late, change 4, quoted in §1; `ui-craft` §2 (collapse to a strip,
expand in place); the app's own `animate-in … motion-reduce:animate-none` grammar; D17's own
reasoning, answered rather than discarded.
*Rejected — an overlay or a `Sheet` for the file.* Re-introduces the scrim D1 removed, on
the screen whose founding defect was a document covering its own claims.
*Rejected — `Tabs` (report | file).* Tabs say "two equal views of one thing"; these are a
statement and its evidence, and the ratio is 26:9.
*Rejected — keeping the route and adding a "Back to the report" link.* It answers the
owner's sentence and not his point: two pages for one complaint is the thing that "throws
the user off", and a link back is a patch on the split.
*Given up:* a distinct page title (`metadata.title = "Full file"`) and a distinct crumb; and
the page is now long — 41 rows and up to 22 document slots under a report. The sticky strip
is what pays for that, and §11 hands both to the render.
*Fixes problem 28; supersedes D17.*

#### D26 — The pane carries the documents of the group being read

**This is the first half of the owner's change 3.**

**Group, not section — and the file's own model is why.** He said "section", and his example
was *"the first section… all about the cheque and maybe the receipts associated with the
cheque and the notice"* → *"the relevant three documents can be in three tabs"*. Three is
the **cheque group** exactly (dishonoured cheque · proof of deposit · return memo). Section 1
as the file actually nests it is four groups and **nine or ten slots**, which is not three
tabs, it is a document index. The model already states the containment — every entry in
`CASE_SLOTS` carries its `group`, and the group panel is what a finding deep-links to
(`caseGroupAnchor`) — so the tab set is the group's. *(Pass 2, and pass 4 the moment you
count. Flagged for him: §12.20.)*

- **The tab set is the group's filed documents, in the file's order.** Absent slots are not
  tabs — there is nothing to open, and the slot's absence is already stated in the claims
  column where the form's question belongs.
- **Which group is "being read": the reading observer returns** (D21), attached to the pane
  rather than to an index rail. D7's preserved rule is reused verbatim — a click claims the
  pane until the reader scrolls into another group; under that, the last group heading to
  cross a line a third down the viewport; under both, the end of the scroll answers for
  itself. **The claim rule matters more here than it did for the index**, because the thing
  that changes is content rather than a highlight.
- **Component:** DS `Tabs variant="line"` inside the pane's own frame, the active underline
  sitting **on** the frame's rule (`ui-craft` §2: never two parallel horizontal lines). That
  requires `components/cases/document-preview.tsx` to accept a `header` slot in place of the
  `quiet`+`card` variant's `h3` title strip — an **app-level** change in Dristi's own
  component (§13.5, and §13.4's precedent), not a DS change. Without it the tab and the title
  strip name the same document twice, eight pixels apart, which is the pass-7 defect this
  brief has now caught five times.
- **Below `xl`** the same strip lives inside the `Sheet` / `Drawer`. No third mechanism
  (D20).

*Rule:* owner, change 3; `CASE_SLOTS[key].group` (the domain's own containment, pass 2);
RESPONSIVE's component table — *"Tabs: allow wrap or scroll if many triggers; don't force
equal-width tabs that crush labels"*; `components/filing/section-tabs.tsx` for the scrolling
strip the app already ships; `filing/sections/cheque-section.tsx`'s two source documents as
the interaction's precedent.
*Rejected — tabs for all 18 documents on the file, or a document index rail.* That is
`scrutiny/bundle-view.tsx`, which is the officer's tool and explicitly not this screen (§4).
*Rejected — tabs per section.* Nine tabs in a 320–416px pane, in Malayalam. See §10.
*Given up:* reading a document from group 2 while looking at group 1. The pane follows the
reader; a finding's deep link still opens any document by key, and scrolling to the group is
one gesture.
*Fixes problem 26.*

#### D27 — A fact points at the document it would be read from; the highlight waits for a page that can carry one

**This is the second half of the owner's change 3, and the place where this brief has to be
honest rather than impressive.**

**What is built now.**

- **`CaseFact` gains `source?: CaseSlotKey`** — the key of a slot in the fact's own group.
  Clicking a fact row selects it (one quiet persistent cue: a `bg-accent` row fill, never
  ring + border + fill stacked — `ui-craft`'s loudness ladder) and the pane switches to that
  document's tab. The pane names what it is being read against on its own sub-line
  (*Reading: Deposited on*).
- **Why `source` and not order.** D6 paired facts to documents by position and said so, and
  named this as the fix in the same paragraph: *"a per-fact `CaseFact.source` link (the
  scrutiny model's `FlatField.doc`) — still the first thing to add if the render says a
  fourteen-row group is too coarse."* The owner has now asked for the interaction that needs
  it, so the condition is met. **The data already exists in this brief**: §5a-iii's
  `Checked against` column is that mapping, written row by row. This decision moves it out
  of the document and into the model, where `case-review.test.ts` can assert that every
  `source` resolves to a slot in the same group — the same way it already asserts
  `CASE_SLOTS[...].head` against its group's title.
- **A fact with no source is not a control.** Fifteen of the 47 values on `r-1840` have no
  document at all (problem 17) and two more are weak pairs. Those rows take no pointer, no
  hover and no selected state. One membership rule, written down so the next round does not
  make every row look clickable (pass 6) — and it is the same honesty as the check line's
  caption, one level down.

**The annotation — the limit, stated three ways, because the owner is pointing at something
real and it cannot fully cross yet.**

1. **The box lives on the filer's side.** `ExtractedField.box` hangs off
   `IntakeSlot.extract: DocExtract`, produced by OCR at upload (`lib/filing/ocr/`). The court
   side has **no document store at all** (§12.8), and `CaseDocument` carries
   `label | state | kind` and nothing else.
2. **The pane shows a drawing, not a scan.** `PageFacsimile` is an SVG of *a page of this
   kind*, deliberately illegible, because readable text would fabricate a court record. A
   highlight box drawn on it would point at a place that does not exist — the same rule,
   one layer up.
3. **Even with a store, `box` is optional and sparse.** Only fields a parser read carry one
   — the cheque and memo fields, the ID proofs — and most of this file's values were typed
   by the filer and never read off anything. A design implying every value is
   machine-located would teach a magistrate to trust a link that is not there.

**So the promise is staged, and the screen says which stage it is in.** Today: the fact names
its document and the pane opens it. When a store arrives **and** the filing's `DocExtract`
travels with the complaint: the same click draws `regionFromBox(box, page)` — reused verbatim
from `source-panel.tsx`, never re-derived — for the values that carry a box; values that do
not keep today's behaviour and the pane says so in one line (*"This value was entered;
nothing on the page was read for it"*).

*Rule:* owner, change 3 ("just like how we had it for e-filing"); `lib/filing/types.ts` and
`source-panel.tsx` for the mechanism; D6's own named fix; pass 9 (order is not a source);
pass 6 (one membership rule for what is a control).
*Rejected — drawing a plausible highlight on the facsimile now.* It is the most demo-able
thing in this brief and it is fabrication.
*Rejected — inferring the source from the term's name.* A string match standing in for a
field is the defect `FACT_TERMS` was declared to end.
*Given up:* on most rows, for now, the reader gets the right document rather than the right
line of it. Named in §11 and conditional on §12.8.
*Fixes problem 27.*

#### D28 — Sibling sweep for the revised region (pass 7)

| Fact / act | The report (here) | Approve registrations (`ReviewStage`) | Scrutiny workbench | Verdict |
|---|---|---|---|---|
| A machine finding about a submitted record | hairline-separated row, words first, `text-body`, ink not fill, detail behind a disclosure | **`FactRowView`: hairline-separated row, chevron beside the words, detail spanning the row** | `Banner` + per-field flag composer | **Closed — this time by actually inheriting it** (D24). D22 claimed this and the build forked it. |
| Label-over-value facts | `CaseHeaderCell` — `text-caption` term over `text-body-compact` value, 2/4 column grid | same shape in the dialog's identity block | — | **Closed by reuse:** D23's four cells are the header's cells, not a second grammar. |
| "Nothing is wrong with this record" | one counted line, neutral ink | nothing rendered | — | **Divergent, deliberately.** Eight values on one screen make absence self-evident; 47 behind a control do not. |
| How a record got here | four cells: kind, rounds, elapsed, cleared | `REG-23` rejection rounds, newest first, older ones collapsed | `HISTORY` sheet + `HISTORY_SUMMARY` | **Divergent by role, and now consistent in vocabulary:** all three count *rounds* and name an *open* item the same way. The workbench keeps the events; this keeps the summary; the advocate queue keeps the rounds it must show in full because the reader is deciding on them. |
| A document on a court file | `DocumentSlot` + `ThumbnailButton` in the claims column; `DocumentPreview` in the pane, now tabbed | `DocumentPreview variant="quiet" surface="card"` | `bundle-view.tsx` reader | **Not a defect — three roles** (index / reading / annotating). `submission-record-dialog.tsx`'s `Item variant="outline"` is the fourth rendering and is still the one that should go — **and it is the same misuse of `Item` that D24 has just removed here.** |
| Days waiting | uncoloured (owner, 2026-09-11) | escalating `waitTone` | flat `warning-ink` on the queue | **Three treatments of one fact.** Still open, still logged in `approve-registrations` §11. A queue-wide pass. |
| Sending work back to an advocate | free text, required, one box | free text, required, one box (`REG-22`) | field-scoped `DOC_REASONS` | **Closed.** |

---

### 5a-i B — the full file

**Nothing here is deleted.** D1–D12 were written as the landing, demoted to a destination by
D13, and are now **a disclosed region of the same page** (D25). Most are unaffected by the
move; each carries a verdict.

#### D1 — A document opens beside its claims, never over them
> **STANDS, and D26/D27 are what it was always for.** Two panes from `xl`: claims left, one
> document right; the claims column does not move when a document opens. The shape exists
> twice on the court side already (`approve-registrations-dialog.tsx` `ReviewStage`;
> `scrutiny/case-workbench.tsx`, where selecting a field scrolls the bundle to the document
> it was read from — **which is D27's ancestor**). *Rejected:* a stepped review; all
> eighteen documents inline; `ResizablePanelGroup`. *Given up:* below `xl` the two panes
> cannot coexist (D11).

#### D2 — The check region: the exceptions speak, the norm is silent
> **SUPERSEDED by D14/D15 (silence), and its subject widened by D23.** Its four checks
> survive as checks 1, 2, 4 and 5. Its three "deliberately nots" — no cleared state, no
> verdict, no tint on every file — bind D14, D23 and D24 alike.

#### D3 — The header carries nothing true of every complaint
> **STANDS, extended by D18.** Status `Badge` cut; `Court` stays on the owner's 2026-09-10
> ruling with the argument for cutting it recorded in §11; `Amount` joins.

#### D4 — The order is the statute's, not the form's
> **STANDS.** 1 The cheque and the notice *(rename still proposed, not ruled)* · 2 Litigant
> details · 3 Additional details · 4 Payment details. *Rejected:* a "cognizance chain"
> summary above the sections — it would restate rows. **What D23 adds to that reasoning: a
> summary is a duplicate only when the rows are beside it. The report states what no row
> states — seven booleans, and a scrutiny nobody recorded on this screen before.**
> *Fixes problem 15.*

#### D5 — Every fact stays on the surface of the file. Nothing is folded away
> **STANDS, and D25 is bound by it.** All 41 rows stay unfolded in one scrolling column. The
> file's *interior* never folds; only its door does. *Rejected:* progressive disclosure of
> the fifteen declared-only facts. *Given up:* a shorter file — it is exactly as long as it
> was, now behind a disclosure rather than a route.

#### D6 — The document rows stay in the claims column, lose the norm, and load the pane
> **STANDS, and its named future arrives in D27.** `DocumentSlot` + `ThumbnailButton`; an
> absent slot keeps the geometry and reads "Not on file"; `meta="Filed"` and the `Documents`
> caption stay cut. **Its pairing-by-order is superseded by `CaseFact.source`** (D27) —
> which D6 itself nominated as the first thing to add.

#### D7 — The reading index goes
> **STANDS as an index; its machinery returns for D26.** `useReadingSection` / `readingLine`
> / `READING_LINE` / `SCROLL_KEYS` come back **to drive the pane's tab set**, not a rail.
> The rule preserved in the 09-11 revision is reused rather than rebuilt (D21, D26). The
> section `id`s and `scroll-mt-(--chrome-sticky-top)` stay, as already corrected.

#### D8 — The case timeline leaves the standing layout for a control
> **STANDS, narrowed twice:** the `Sheet` hangs off the **file region** (so it appears only
> when the file is open), and **two of its steps go to D23** — *Taken up for scrutiny* and
> *Scrutiny completed* were derived from `wait >= 3` / `wait >= 7` and are now real
> attributes in the report, or nothing.

#### D9 — Two outcomes: Register, and Send back for correction
> **STANDS — see D19.** Register is irreversible and takes a confirmation **stage of the
> page**; send back is reversible, soft `destructive`, never `destructive-solid`; both
> `aria-disabled` until §12.4; no helper line.

#### D10 — The send-back reason is one required free-text box, and it does not name an attribute
> **STANDS.** `Field` + `FieldLabel` + `Textarea` + `FieldError` — `approve-registrations`
> `RejectStage` verbatim. A reason is required; no exposition. Whether it should name the
> attribute at fault is **§12.11**; the no-advocate case is **§12.12**.

#### D11 — Below `xl` the pane becomes a Sheet, and no third mechanism appears
> **STANDS.** At 1280 the content box is 1280 − 256 − 64 = 960; less a 32px gap, a
> `minmax(20rem,26rem)` pane leaves the claims 512–608px. At 1024 the same sum leaves 272px,
> so the split starts at `xl`. Below it: one column, `Sheet` (a `Drawer` on phone) — **now
> carrying D26's tab strip.**

#### D12 — Sibling sweep (evening)
> **STANDS, extended by D22 and D28.** Its rule worth keeping: **show the slot when the form
> asked the question, omit it when the flow never collects it.**

---

### 5a-ii — the prior decisions, and what became of each

**Nothing here is deleted.** Code comments cite these by number. Each is stated with its
reasoning's load-bearing sentence and its verdict; the full prose of every round is in git
(`58285b3` and its ancestors).

1. **Three columns at `lg`: reading index · the file · the case timeline.**
   > **SUPERSEDED by D1, D7, D8, D21.** Both rails go. The tracks-rebalancing argument was
   > correct against its own problem — at 1280 the old split gave 512px of rail against
   > 368px of file — and is what made problem 10 resolvable. Retired because the problem
   > changed, not because it was wrong.

2. **Five numbered sections, sentence case.**
   > **PARTLY SUPERSEDED.** Section 4 (submissions from the accused) was cut by the owner
   > 2026-09-11 — the accused cannot file before registration — leaving four. Sentence case
   > and the ban on two sections numbered "4" stand.

   **2a. Not collapsible (owner, 2026-09-10).** Every section was open by default and the
   sticky index already navigated, so the fold hid what the reader came for while its own
   affordance stayed invisible (problem 4). Removing it removed three workarounds: the
   `not-last:border-b-0` variant reset, the `h-auto` cancellation of Radix's non-remeasured
   `--radix-accordion-content-height`, and the `flushSync` before a scroll.
   > **STANDS, load-bearing for D5 — and D25 states explicitly why disclosing the file as a
   > whole is not this.**

3. **One lifted panel per group, one block inside it per record**; reading column `gap-8`,
   section `gap-4`, groups `gap-6`; icon tile `size-8`.
   > **STANDS.**

4. **Fact rows use the DS `DescriptionList` at its own default column**, the two-column grid
   applied at `@xs` on the **container** rather than `sm:` on the window, row stroke dropped
   to `border-hairline`.
   > **STANDS, and matters more now** — the claims column narrows to 512px, and a rule that
   > switches on the block's width is what makes that survivable. *"`sm:` asks how wide the
   > window is, and the window was never the constraint."*

   **4a. A term is the attribute's name, not the form's question (owner, 2026-09-10.)**
   > **STANDS; D4 extends it to section headings.**

5. **Identity facts at the top are one caption line, not a grid.**
   > **SUPERSEDED by the owner (2026-09-11), then D3 and D18.**

   **4b. The header's constants go (owner, 2026-09-10)** — "Criminal" and "S.138…" are
   identical on every complaint; `FilingDraft.caseType` is the one-value union `"s138"`.
   > **STANDS; D3 applied it to the status badge. It is also the rule D23 had to argue
   > against for `Cleared`, and the argument is in D23.**

6. **Documents use the app's `DocumentPreview`** (owner, 2026-09-10) — facsimile as
   `composed` content, bounded and deliberately illegible; derived filename, page count and
   file size cut.
   > **PARTLY SUPERSEDED twice** (`DocumentSlot`/`ThumbnailButton`; the pane instead of a
   > dialog). What survives untouched is the best part of it, and **D27 depends on it**: a
   > facsimile says "a page of this kind is on the file" and is deliberately not legible,
   > because readable text would fabricate a court record; an absence is never dressed as a
   > blank sheet; the six shapes stay so a reader tells a cheque from a notice without
   > reading.

7. **Register / Dismiss are pinned, real, and honestly dead.** "Admit" goes.
   > **PARTLY SUPERSEDED by D9/D19.** "Register" stands; **Dismiss is cut**; §12.9 open.

8. **Particulars are derived from the queue row, not transcribed** — the §138 chain worked
   backwards, asserted by `case-review.test.ts`. **A derived *value* is legitimate demo data;
   a derived *attribute* is not.**
   > **STANDS, and it is the rule D23 builds the scrutiny record on** as well as the rule
   > D15 was the dividend of.

9. **The right-hand timeline carries traceable events only.** *Placed before the magistrate*
   and *Letter from the accused received* deleted (owner, 2026-09-10).
   > **PARTLY SUPERSEDED by D8/D21/D23.** The two 09-10 cuts stay cut; **two more steps are
   > cut now** — the fabricated scrutiny pair, replaced by D23's attributes.

   **9a. The accused's invented submission goes with it**, and section 4 with it.
   > **STANDS — owner, 2026-09-11.**

10. **The complainant's confirmations become fact rows, not a tinted alert.** The
    `Alert variant="info"` appeared on **every** complaint.
    > **STANDS, and it is still the precedent every status decision on this screen is
    > measured against** — D14's line, D23's refusal of a "Passed" chip, and D24's refusal
    > of a `warning-muted` block.

**Deviations from the legacy reference, logged:**

| Reference | Here | Why |
|---|---|---|
| `‹ Back` link | none | The trail is the way back on the court side |
| `Download`, "View on map" | cut | Promise things that do not exist |
| Breadcrumb ends in "View" | ends at the case identifier | Owner 2026-09-11; **"Full file" leaf removed with the route (D25)** |
| Timeline newest-first, placeholder steps | oldest-first, traceable steps, behind a control, **two fewer** | D8, D21, D23 |
| Title Case, two sections numbered "4" | sentence case, 1–4 | Laws |
| Collapsible sections | plain regions | §5a-ii.2a |
| Sections in the filing form's order | the statute's order | D4 |
| Documents open over the file | documents open beside it, **in the group's own tabs** | D1, D26 |
| The whole file on arrival | a report, and the file disclosed beneath it | D13, **D25** |
| `Dismiss` | `Send back for correction` | D9 — §12.9 open |
| Placeholder filings (`asdf`) | Kollam parties, CMP numbers, real §138 vocabulary | §6 |

---

### 5a-iii — Attributes (value → source → type → checked against → surfaced → slot)

**How to read this.** *Source* is the field a real backend would hold (`lib/filing/types.ts`
is the e-filing contract, `lib/employee/scrutiny/types.ts` the scrutiny contract), a
`docs/product/` citation, or a `REG-nn` requirement. *Type* is `data` · `closed enum` ·
`derived check` · `user free text` · `product copy` · `presentation`. **`Checked against`**
is the document *on this file* a magistrate could read the value off; `—` means
**declared-only**. As of D27 this column is no longer only a note in a brief: it is the
value of **`CaseFact.source`** in the model, and a test asserts each one resolves to a slot
in the same group.

**`Surfaced`** — re-valued by D25, since there is now one page:

| Value | Meaning |
|---|---|
| `report` | on the landing, before any control is touched |
| `report·fired` | on the landing **only when a check fires** — a finding's row or its detail |
| `file` | in the disclosed file region, one control away on the same page |
| `pane` | in the document pane, as a tab or a highlight |
| `sheet` | behind the timeline `Sheet`, on the file region |
| `stage` | on the send-back or confirmation stage |
| `cut` | not rendered anywhere |

**Counted on `r-1840`** (delayed, a reply on record, two witnesses, one advocate, nothing
missing), because a table counted over every branch counts nothing.

| | Count |
|---|---|
| Values in the body (41 fact rows + 6 record headings) | **47** |
| Header values | 5 (+1 cut) |
| **Scrutiny report values (D23)** | **4** |
| Machine checks (D15) | **7** |
| Document rows | **18** |
| Timeline steps behind a control | **5** *(was 7 — D23 takes two)* |
| **Rows with no source at all** | **0** |
| Rows whose source is a product doc but **no store holds them** | **0** *(was 2 — the fabricated scrutiny pair is cut)* |
| Body values **checkable** against a document (= carry a `CaseFact.source`) | **29** |
| Body values **computed** from two checkable dates | **3** |
| Body values **declared-only** (no `source`, not a control — D27) | **15** |
| **Values a magistrate sees before he can act, on a clean complaint** | **5 header + 4 report + 1 check line + 2 counts = 12** |

The last row is the design in one number: **47 body values become 12 before the act** — four
more than the previous revision, and the four are the answer to "how was this scrutinised".
The 15 declared-only values are why the check caption exists (problem 23) and why 15 rows on
the file are deliberately not clickable (D27).

#### Header

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| `CMP/1840/2025` | `RegisterCase.caseNumber`; issued at filing as `SignState.caseFileNumber` | data | — | report · file | identity line, `tabular-nums` |
| `Rajan Krishnan v. Quilon Cashew Exports` | `causeTitle()` over `Complainant.name` / `Accused.name` | data (derived value, real attributes) | complainant's ID proof · accused's company documents | report · file | `h1` |
| `Kollam JMFC-II` | `CURRENT_STAFF.court` (session) | data — constant within this queue | — | report | cell "Court" |
| Cheque amount | `ChequeDetails.amount` | data | the cheque | report · file | cell "Amount", `tabular-nums` (D18) |
| `4 Dec 2024` | `FilingDraft.submittedAt` | data | — | report | cell "Submitted" |
| `281 days` | derived: today − `submittedAt` | data (derived) | — | report | cell "Waiting" |
| ~~`Waiting to be registered`~~ | `CASE_REVIEW_STATUS` — one member | closed enum, single-valued | — | **cut** (D3) | — |

#### The scrutiny report — statement 1 (D23) — **new**

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| `By a registry officer` / `Automated` | the scrutiny model's own distinction — an officer's `HistoryEvent` stream with `Filing.who`, vs. an automated pass (`journey`: "In automated scrutiny, that process will anyway not happen", owner §4); **owner 2026-09-11 late, change 1** | **closed enum, two members** | — | **report, always** | cell "Scrutiny" |
| `3` | count of `HistoryEvent` with a send-back title, +1; the model numbers them (`"· round 2"`) and exports `HISTORY_ROUND` | derived count | — | **report, always** | cell "Rounds", `tabular-nums` |
| `34 days` | `daysBetween(first scrutiny event, the clearing event)` | derived | — | **report, always** | cell "Took", `tabular-nums` |
| `12 Mar 2025` | the clearing `HistoryEvent`'s day | data | — | **report, always** | cell "Cleared" — the term carries the outcome (D23) |
| *(the officer's name)* | `Filing.who` / `HistoryEvent.meta` | data | — | **cut** — §6, §12.18 | — |
| *(items still open at clearing)* | `HistoryItem.open` | derived count | — | **not built** — §12.21 | would be a finding row, not a cell |
| ~~`Taken up for scrutiny`~~ · ~~`Scrutiny completed`~~ | `timelineFor`'s `wait >= 3` / `wait >= 7` — **no store holds either** | data (unbacked) | — | **cut** (D21, D23) | were timeline steps |

#### The check ledger — statement 2 (D14, D15)

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| "Seven checks ran on the entered data." | `CASE_CHECK_COUNT` | product copy over a derived count | — | **report, always** | the ledger's line |
| "Nothing flagged." / "Two need a look." | count of fired checks | derived count | — | **report, always** | same line |
| "Checks compare entered values with each other. No document was read." | product copy — the limit (problem 23) | product copy | — | **report, always** | `text-caption` under the line |
| Deposited outside the three months | `daysBetween(chequeOn, depositedOn) > 90`; §138(a) | derived check, `flag` | the cheque + proof of deposit | report·fired | finding row → detail |
| Notice sent more than thirty days after the return | `daysBetween(returnedOn, noticeSentOn) > 30`; §138(b) | derived check, `flag` | return memo + proof of dispatch | report·fired | finding row → detail |
| Complaint filed before the fifteen days ran | `daysBetween(accruedOn, submittedOn) ≤ 0`; §138(c) | derived check, `flag` | proof of service | report·fired | finding row → detail |
| Filed outside the month with no application to condone | `sinceAccrual > 30 && !applicationOnFile`; §142(b) | derived check, `flag` | — (the absence *is* the finding) | report·fired | finding row → detail |
| *N* required documents not on file | count of `IntakeSlot.file === null` (§12.16) | derived count, `flag` | — | report·fired | finding row → detail |
| No advocate on record | `counselFor(...).length === 0` | derived check, **`note`** | the vakalatnama slot's absence | report·fired | finding row; plain ink |
| Part payment made against the cheque | `DemandNotice.paymentStatus === "part"` + `partAmount` | derived check, **`note`** | — | report·fired | finding row → detail |
| The values a fired check read | the rows below | data | as their own rows | report·fired | the detail's `DescriptionList` |
| The documents that would settle a finding | `CaseCheckDocument` over the group's slots | data | — | report·fired | `DocumentSlot` rows → open the pane **on the same page** (D25) |

#### The way in (D25)

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| "Open the full file" / "Close the full file" | product copy — the control's two states | product copy | — | report | `Button variant="outline"`, `aria-expanded` |
| `41 entered values · 18 documents` | `caseFileCounts(review)` | derived counts | — | report · sticky strip | `text-caption` beside the control |

#### 1 · The cheque and the notice

**Cheque details** — documents: Dishonoured cheque · Proof of deposit · Cheque return memo

| Value | Source | Type | Checked against (= `CaseFact.source`) | Surfaced | Slot |
|---|---|---|---|---|---|
| `Cheque no. 483920` | `ChequeDetails.chequeNumber` | data | `dishonoured-cheque` | file | record heading |
| Cheque amount | `ChequeDetails.amount` | data | `dishonoured-cheque` | report · file | `Amount` |
| Date of the cheque | `dateOnCheque` | data | `dishonoured-cheque` | file · report·fired (check 1) | `Cheque dated` |
| Payee bank / branch / IFSC | `Jurisdiction.payeeBankName` / `payeeBankBranch` / `ifsc` | data | `deposit-proof` | file | three rows — **branch is the §142(2) jurisdiction fact** |
| Payer bank / branch / IFSC | `ChequeDetails.bankName` / `bankBranch` / `ifsc` | data | `dishonoured-cheque` | file | three rows |
| Date deposited | `presentDate` | data | `deposit-proof` | file · report·fired | `Deposited on` |
| Date of return | `returnDate` | data | `return-memo` | file · report·fired | `Returned on` |
| `Funds insufficient` | `ChequeDetails.returnReason` (3-value enum on screen; a `string` in the registry) | closed enum — **§12.7** | `return-memo` | file | `Return reason` |
| Police station (payee bank) / (drawer bank) | `Jurisdiction.payeePolice` / `drawerPolice` | data | **—** | file | two rows, **not controls** (D27) |
| `Yes` / `No` | derived: the two dates vs. `PRESENTATION_WINDOW_DAYS` | derived check | the two dates, each on a document | file (**check 1 is its report form**) | `Deposited within three months`; `exception` ink when No |

**Debt or liability details** — document: Proof of the debt or liability

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Nature of the debt | `DemandNotice.natureDebt` (closed list) | closed enum | `debt-proof` *(weak pair)* | file | `Nature of the debt` |
| `No payment made` / `Part payment made` | `DemandNotice.paymentStatus` | closed enum | **—** | file · report·fired (check 7) | `Payment against the cheque` |
| Part payment amount | `DemandNotice.partAmount` | data | **—** | file · report·fired | `Part payment amount` |
| Why the cheque was issued | `DemandNotice.whyIssued` (closed list) | closed enum | `debt-proof` *(weak pair)* | file | `Why the cheque was issued` |

**Legal demand notice** — documents: Legal demand notice · Proof of dispatch · Proof of service · Reply to the notice

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Date dispatched | `DemandNotice.dispatchDate` | data | `dispatch-proof` | file · report·fired (check 2) | `Notice dispatched` — §138(b) starts here |
| Date of service | `DemandNotice.deliveryDate` | data | `service-proof` | file · report·fired (check 3) | `Notice served` — §138(c) starts here |
| `Yes` / `No` | `DemandNotice.replied` (`YesNo`) | closed enum | `notice-reply`'s own filled/absent state | file | `Reply received` |
| Notice period ended | `Jurisdiction.causeDate` = served + 15; §138(c) | data (derived) | `service-proof` | file · report·fired (checks 3, 4) | `Notice period ended` — the cause of action |

**Delay condonation application** *(only on a late file)* — document: Delay condonation application

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Days beyond the month | derived: `sinceAccrual − 30`; §142(b) | data (derived) | the two dates | file · report·fired (check 4) | `Days beyond the month` |
| Grounds stated | `Jurisdiction.condonationReason` | user free text | `delay-application` | file | `Grounds`; no value when the application is not on file |

#### 2 · Litigant details

**Complainant** — documents: ID proof · Affidavit u/s 225 BNSS

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Complainant's name | `Complainant.name` | data | `complainant-id-proof` | report (cause title) · file | record heading |
| `Individual` / `Company` | `Complainant.type` (`LITIGANT_TYPES`) | closed enum | `complainant-id-proof` / company documents | file | record `Badge` |
| Authorised signatory *(entity)* | `Complainant.reps[].name` | data | company documents | file | `Authorised signatory` |
| Mobile · Email | `Complainant.mobile` / `.email` | data | **—** | file | two rows, **not controls** |
| Age · Permanent address *(individual)* | `Complainant.age` / `.perm` | data | `complainant-id-proof` *(§12.13)* | file | two rows |
| Current address *(individual)* | `Complainant.res` when `permSame === "no"` | data | **—** | file | `Current address` |
| Registered office *(entity)* | `Complainant.perm` | data | company documents | file | `Registered office` |
| `Yes` / `No` | `Complainant.poa` (`YesNo`) | closed enum | **— and there is no PoA slot on the form** | file | `Power of attorney` — **§12.14** |

**Accused** — documents: ID proof · Company documents

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Accused's name | `Accused.name` | data | `company-documents` | report (cause title) · file | record heading |
| `Company` | `Accused.type` | closed enum | `company-documents` | file | record `Badge` |
| Authorised signatory | `Accused.reps[].name` (array, S-141) | data | `company-documents` | file | `Authorised signatory` |
| Mobile · Email | `Accused.contacts[]` (arrays) | data | **—** | file | two rows, not controls |
| Registered office | `Accused.addresses[]` (array) | data | `company-documents` | file | `Registered office` |

#### 3 · Additional details

**Witness details** — **no documents on this group, in the model** (`CaseRecord.documents` unset)

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Witness's name (×2 on `r-1840`) | `Witness.fullName` | data | **—** | file | record heading |
| Speaks to (×2) | `Witness.prove` (`WITNESS_PROVES`, 4 values) | closed enum | **—** | file | `Speaks to` |
| Mobile (×2) | `Witness.contacts[].mobile` | data | **—** | file | `Mobile` |
| *(the pane, on this group)* | — | product copy | — | **pane** | "No documents were filed under Witness details" (D26, §10) |

**Complaint** — documents: Complaint · Affidavit u/s 223 BNSS

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Additional details | `AdrPrayer.otherDetails` | user free text | `complaint` | file | `Other details`; absent on most files |

**Advocate details** — documents: Bar ID card · Vakalatnama *(per record)*

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Advocate's name | `Advocate.name` | data | `advocate-N-vakalatnama` | file | record heading |
| Bar registration | `Advocate.barNumber`; `REG-13` | data | `advocate-N-bar-id-card` — the pair `approve-registrations` verifies | file | `Bar registration` |
| *(the absence of any advocate)* | `counselFor(...)` empty → `CaseAbsence "none-on-record"` | closed enum | — | **report·fired (check 6)** · file | finding row; group absence |

#### 4 · Payment details — document: Payment receipt

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| Court fee paid | `SignState.paidAmount` | data | `payment-receipt` | file | `Court fee paid` |
| Receipt number | `SignState.paymentRef` | data | `payment-receipt` | file | `Receipt number` |

#### Every document row (18 on `r-1840`), and the pane

| Value | Source | Type | Checked against | Surfaced | Slot |
|---|---|---|---|---|---|
| The court's label for the document | `IntakeSlot.label` via `CASE_SLOTS` | closed enum (the form's slot list) | — | file · pane (tab label) · report·fired | `DocumentSlot` label / `TabsTrigger` |
| Which head it was filed under | `CASE_SLOTS[key].head` | closed enum | — | pane (sub-line) · report·fired (`meta`) | names which "ID proof" this is |
| Which page shape to draw | derived from `docType` (11 members → 6 shapes) | **presentation, not a fact** | — | file · pane | `ThumbnailButton` / `PaneFacsimile` |
| `Not on file` | `IntakeSlot.file === null` | closed enum | — | file · **report·fired (check 5)** | absent row; **never a tab** (D26) |
| *(the read region on a page)* | `IntakeSlot.extract.fields[...].box` — **filer-side only, optional, sparse** | data | — | **not built** — D27, §12.8 | would be `regionFromBox` over a real scan |
| ~~`Filed`~~ · ~~`Documents`~~ | true of every row / a caption on ten lists | closed enum, single-valued / product copy | — | **cut** (D6) | — |

#### Timeline (behind a control, on the file region — D8, D21, D23)

| Value | Source | Type | Surfaced |
|---|---|---|---|
| Complaint submitted | `FilingDraft.submittedAt` | data | sheet — **duplicates the header cell** |
| Court fee received | `SignState.paid` / `paidAt` | data | sheet |
| Delay condonation application filed | `Jurisdiction.condonationReason` + the slot | data (conditional) | sheet |
| Waiting to be registered · "281 days so far" | derived from `daysSinceSubmitted` | closed enum + derived detail | sheet — **duplicates the header cell** |
| Registration decision · "Not made" | the unbuilt act (§12.4) | product copy | sheet |
| ~~Taken up for scrutiny~~ · ~~Scrutiny completed~~ | `wait >= 3` / `wait >= 7` — **nothing records either** | data (unbacked) | **cut — replaced by D23's four cells** |

#### The send-back stage (D10)

| Value | Source | Type | Surfaced | Slot |
|---|---|---|---|---|
| The magistrate's reason | the officer's own words in a required slot; `REG-22`'s shape | **user free text** | stage | `Textarea` |
| "Why are you sending this back?" | product copy — the question, and nothing after it | product copy | stage | `FieldLabel` |
| "Write a reason first." | product copy — the gate, only once tripped | product copy | stage | `FieldError` |
| ~~the attribute at fault~~ | **not built** — §12.11 | — | **cut** | owner's call |

#### Real attributes the file still does not show

`DemandNotice.modeService`, `tracking`, `delivered`, `nonDeliveryReason`;
`Jurisdiction.otherPending` + `otherCases`; `AdrPrayer.adr` and `interimRelief`;
`Witness.designation`, `age`, `addresses`; **`Complainant.poaHolder`** (§12.14);
`Accused.jurisdiction`; `SignState.paidAt`. **And, newly in view:** `HistoryEvent.items`,
`HistoryItem.was` / `.status` / `.open`, `Filing.who` — the scrutiny record's detail, which
§4 keeps off this screen and §12.21 asks one question about.

---

## 6. What I cut (and why)

**Cut in this revision (2026-09-11, late):**

- **The bordered finding strip** — `Item variant="outline"`, its box, its `border-border`,
  its cancelled hover and its two-jobs-one-component branch (D24). The single most visible
  cut, and the owner's own word for it was *tacky*.
- **The `/file` route** — one `page.tsx`, one IA node, one crumb leaf, one page title, and
  the "the band exists on both views" clause it forced (D25). What is *not* cut is the file:
  every row of it, one control away, on the same page.
- **The scrutiny officer's name** from the report. The magistrate's decision turns on
  *whether a person read it*, not on which person; nothing in the product links a
  register-cases complaint to an officer today; and a fifth cell is a fact the reader must
  decide is not for him (§5a-ii.4b's own logic). **§12.18 is his to reverse.**
- **A "Passed" chip, a tick, a score, a percentage, and any tint on the report.** §5a-ii.10
  is the precedent; D23 and D24 each re-argue it against a new temptation.
- **The two fabricated timeline steps** — *Taken up for scrutiny*, *Scrutiny completed*,
  derived from a modulo on the wait. They are the first thing this revision deletes and the
  reason D23 is not adding fiction but replacing it.
- **A tab per document across the whole file** (18 tabs), and a document index rail. Both are
  the bundle reader, which belongs to the officer (§4).
- **A highlight box drawn on the facsimile.** The most demo-able idea in this revision, cut
  because the page underneath is a drawing (D27).
- **A skeleton for the disclosing file.** Nothing loads; the screen will not pretend
  otherwise (D25).
- **A stagger across the four sections on open.** Decoration claiming work.

**Cut in the night round, kept cut:** the twenty-nine-row claim surface as the landing; a
green tick per passing check; any word saying the complaint is in order; a document strip on
the landing; the case timeline from the landing; the reading index *as an index* (its
observer returns for the pane, D26); a third severity and a "cleared" state; any overlay on
the landing; an eighth check.

**Cut in the evening round, kept cut:** the modal document dialog and its two focus
workarounds; `Dismiss case` (pending §12.9); the `Waiting to be registered` badge;
`meta="Filed"` on eighteen rows and the `Documents` caption on ten lists; a "cognizance
chain" summary region; reason chips on the send-back; `ResizablePanelGroup`; progressive
disclosure of the fifteen declared-only facts.

**Cut in earlier rounds, kept cut:** nineteen invented attributes, four duplicates, two
constants, the filename / page count / file size on every document tile, the tinted
confirmations `Alert`, the accordion and its three workarounds, `IdentityFact`, a "collapse
all" control, a per-group document grid, section 4, `Prayer`, `Filed within one month`, and
the advocate's constant record tag.

**Not cut, deliberately:** every one of the 41 fact rows (D5); the eighteen document rows;
`Court` in the header (an owner ruling); the caption stating the checks' limit; and **the
seven checks**, which this revision reframes and does not touch.

**The long-label / other-language case.** Terms are attribute names, which is what makes
translation survivable. Three exposures, in order of risk:
1. **The finding sentence** — the longest string on the landing ("Cheque deposited 99 days
   after its date — outside the three months §138(a) allows"), growing by half again in
   Malayalam. It must wrap to three lines in a row that keeps its `min-h-10` target without
   displacing the chevron — and **D24 makes this easier**, because a wrapping sentence in a
   hairline-separated row is just a taller row, where a wrapping sentence in a bordered box
   was a box that changed shape.
2. **The pane's tab labels** — "Delay condonation application" in Malayalam, four of them,
   in a 320px pane. `TabsTrigger` ships `whitespace-nowrap` and `flex-1`; the strip
   therefore scrolls on one line (RESPONSIVE; `SectionTabs`' own behaviour) and never wraps.
3. **The report's four cells** — `grid-cols-2` on a phone; "By a registry officer" is the
   longest value and wraps inside its cell like every other header cell already does.

---

## 7. Layout & hierarchy

**The queue** (unchanged): page `p-6 md:p-8`, `gap-8`; one lifted panel
(`rounded-xl border border-hairline bg-card p-6 shadow-raised`); primary is Search.

### The complaint — `/employee/register-cases/<id>` (one route, two states)

- **Canvas:** `bg-muted dark:bg-background` — `FilingMain`'s recipe, on the owner's
  2026-09-11 overrule of `ui-craft` §1.0. Panels are the only white.
- **Page:** `p-6 md:p-8 pb-0`, `gap-6` between regions.
- **One column at every width** for the report; the file region below it is the two-column
  grid from `xl` (D11).
- **Header panel:** identity line → `h1` → hairline → four cells
  (`grid-cols-2 sm:grid-cols-4`): Court · Amount · Submitted · Waiting.
- **Report panel** (D23, D14, D24) — one panel, `p-6`, `gap-4`, three tiers separated by
  hairlines and nothing else:
  1. **The registry's scrutiny** — four `CaseHeaderCell`s, `grid-cols-2 sm:grid-cols-4`,
     `gap-4`.
  2. `border-t border-hairline pt-4` — **the checks**: `size-4` `ListChecksIcon` in
     `text-muted-foreground` + the counted sentence at `text-body-compact`, and the limit
     caption at `text-caption text-muted-foreground` beneath it. Neutral ink, no tint, on
     every file.
  3. `border-t border-hairline` — **the findings**, zero to seven, each
     `border-t border-hairline first:border-t-0`, `py-3`, `min-h-10`: icon (`size-4`,
     `mt-0.5`, `warning-ink` / `muted-foreground`) + the finding at **`text-body`**
     (`warning-ink` on a flag) + a chevron at the end when openable. The detail opens
     beneath at `pt-3 gap-3`, indented to the sentence's column (`pl-6`): the
     `DescriptionList`, then the document rows at `gap-2`.
  **No fill and no full-strength stroke anywhere in this panel.**
- **The way in / the strip** (D25): a row under the report — `Button variant="outline"`
  (`h-10`, `FileSearchIcon`) with `41 entered values · 18 documents` in `text-caption`
  beside it, wrapping under it below `sm`. **When the file is open** this row becomes
  `sticky top-(--chrome-sticky-top) z-20 h-12 bg-card border-b border-hairline
  -mx-6 px-6 md:-mx-8 md:px-8`, carrying the same counts and the Close control.
- **The file region** (`id="case-file"`, `aria-labelledby`, `tabIndex={-1}`): enters with
  `animate-in fade-in-0 slide-in-from-top-2 duration-300 fill-mode-both
  motion-reduce:animate-none`; inside it, everything below is unchanged from the evening
  round — body grid `gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:gap-8`, the
  pane `xl:sticky xl:top-(--chrome-sticky-top) xl:self-start`, claims column
  `flex flex-col gap-8`, `<section>` `gap-4` with an `h2` and `scroll-mt-(--chrome-sticky-
  top)`, group panels `gap-6`, group panel `p-6 gap-4` with a `size-8` sunken icon tile,
  records stacked with `border-t border-hairline pt-4`, `@container` on the record block.
  The timeline `Sheet` trigger sits at the head of this region, not in the page header.
- **The pane** (D26, D27): `DocumentPreview variant="quiet" surface="card"`, whose title
  strip is replaced by a `header` slot holding `Tabs variant="line"` — the active
  underline on the strip's own `border-b border-hairline`, never a second parallel line. The
  strip scrolls horizontally on one line when it overflows. The pane's sub-line names the
  fact being read against, when one is selected.
- **Decision band:** unchanged — `sticky bottom-0 z-30`, `border-t border-hairline bg-card`,
  `px-6 py-3 md:px-8 md:py-4`, `flex-col-reverse … sm:flex-row sm:justify-end`.

**Arithmetic for "no scrolling" at 1280×800 on a clean `r-1840`** (owed a render check,
§11.1): chrome top bar 64 + breadcrumb ≈40 + page top padding 32 + header panel ≈150 + gap
24 + report panel ≈170 (cells 56 + rule 17 + line 20 + caption 16 + `p-6` 48 + gaps) + gap 24
+ the way-in row 40 + sticky band 72 = **≈616px** against 800. Two findings at ≈48 each →
≈712. **This is the objective's one measurable claim and the first thing to verify.**

**Type hierarchy — four sizes, one addition:**

| Role | Token | Weight | Colour |
|---|---|---|---|
| Page title | `text-title sm:text-title-l` | 600 | foreground |
| Section heading (`h2`, file region) · group heading (`h3`) | `text-body` | 600 | foreground *(owner, 2026-09-11)* |
| **A finding** | **`text-body`** | **400** | foreground; `warning-ink` on a flag *(D24 — up one step; it is prose, not a table row)* |
| Record name · check line · term · value | `text-body-compact` | 500 / 400 | foreground / muted; `tabular-nums` when numeric |
| Header and report cell labels · counts · the limit caption · tab labels | `text-caption` | 500 / 400 | `text-muted-foreground` |

**Hierarchy, stated once.** The cause title, then the report, then the act. A finding, when
there is one, is the only coloured thing on the screen. The way in is deliberately quiet — it
is the rare path. Inside the file, the loudest thing is whatever the reader navigated to;
the pane is never loud, because it is the thing the claims are read *against*.

---

## 8. Components (DS name → region)

**The queue** (unchanged): `text-title` / `text-title-l` · composed panel `section` ·
`Field` + `FieldLabel` + `InputGroup` · `Button` primary / ghost · `Table` · `CounselCell` ·
`Empty` + `EmptyMedia` · `ListFooter` (`Pagination` + `Select`).

**The report:**

| Region | DS / app component |
|---|---|
| Header, report panels | composed `section` with the court-side panel classes (not a nested `Card`) |
| Header cells **and the scrutiny report's four cells** | `dl` / `div` / `dt` / `dd` — the HTML5 grouping form, via the existing `CaseHeaderCell` |
| Check line + limit caption | plain `p` at `text-body-compact` / `text-caption` + one `size-4` allowlisted lucide icon |
| **Finding rows** | **plain `div` rows separated by `border-t border-hairline`** — **not `Item`** (D24) |
| A finding's disclosure | `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` — `approve-registrations` `FactRowView`'s mechanism *and* its shape |
| A finding's values | `DescriptionList` / `DescriptionRow` / `DescriptionTerm` / `DescriptionDetails` |
| A finding's documents | `DocumentSlot` (DS) + `ThumbnailButton` (`filing/upload/thumbnail.tsx`) |
| The way in / the sticky strip | `Button variant="outline"` |
| Decision band | `Button` primary + soft `destructive` |
| **Not used on the report** | `Dialog`, `Sheet`, `Drawer`, `Banner`, `Alert`, `Badge`, `Timeline`, `Tabs`, `Accordion`, **`Item`** |

**The file region:** composed panels, `DescriptionList`, `Badge variant="secondary"` for
litigant type, `DocumentSlot` + `ThumbnailButton`, `PageFacsimile` in DS `paper` tokens,
`DocumentPreview variant="quiet" surface="card"` for the pane, **`Tabs` + `TabsList
variant="line"` + `TabsTrigger` inside the pane's frame** (D26), `Sheet` (`Drawer` on phone)
below `xl`, `Sheet` + `Timeline` / `TimelineItem` for the history, `Field` + `FieldLabel` +
`Textarea` + `FieldError` for the send-back stage.

**Why not `Item` for a finding — the honest answer, because it is what was built.**
`item.tsx`'s `outline` variant is `border-border bg-card hover:bg-accent`: a control's edge,
a control's fill, a control's hover. It is right for a row you press and wrong for a sentence
you read, and the build had to cancel the hover on both branches to use it. The DS's own
composition for "a list of statements, one of which opens" is `Collapsible` +
`DescriptionList` + hairlines, which is what `approve-registrations` already does. **This is a
usage correction, not a DS gap** (§13).

**Why not `Banner` for the check line** — unchanged: `banner.tsx` binds an icon to each
variant (`neutral` → `MegaphoneIcon`) and fills the row. A megaphone announcing a completed
check is wrong and every other variant is a tint on 35 of 35 files. §13.1 keeps it as a DS
observation.

Every DS name above exists in `vendor/pucar-design-system/src/components/ui/` (catalog
re-globbed — 67 components). **Nothing new is proposed.**

---

## 9. Spacing

Ladder only (`0.5 · 1 · 1.5 · 2 · 2.5 · 3 · 4 · 6 · 8 · 12 · 16`), micro steps inside
controls only.

**The report:** page `p-6 md:p-8 pb-0` · page stack `gap-6` · panels `p-6` · header and
report cells `gap-4`, `gap-1` inside a cell · report tiers separated by `border-t
border-hairline` with `pt-4` above the next · finding rows `py-3` with `min-h-10`, icon-to-
text `gap-2.5`, detail `pt-3 gap-3` indented `pl-6`, its document rows `gap-2` · the way-in
row `gap-3`, its sticky form `h-12` · decision band `px-6 py-3 md:px-8 md:py-4`, `gap-3`
between controls · controls `h-10`.

**The file region:** body grid `gap-6 xl:gap-8` · claims column `gap-8` · section `gap-4` ·
groups `gap-6` · panel `p-6 gap-4` · record block `gap-3` separated by `border-t
border-hairline pt-4` · fact rows `py-3`, `gap-4` term-to-value (`gap-1` stacked) · document
rows `gap-2`, each `DocumentSlot` at `p-4` · the pane's tab strip at the DS's own
`TabsList` metric (`p-0.5`, `h-8`) — a micro step inside a control, which is where micro
steps live.

Radius nesting: panels `rounded-xl` → rows, wells and controls `rounded-lg` → the
facsimile's own frame and the tab triggers `rounded-md` (`ui-craft` §4). **The finding row
has no radius, because it has no box** (D24).

**One thing to watch:** the pane's `minmax(20rem,26rem)` is a *width* on the grid, not a
spacing value, and is correctly on the rem scale (`RESPONSIVE.md` rule 2 asks for `minmax`
and `min-w-0` over fixed pixels).

---

## 10. States (empty / loading / error / partial / long-label)

**The queue** (unchanged): empty "Nothing waiting"; filtered empty + Clear search; a side
with no vakalat omitted; cause title wraps.

**The complaint's screen:**

| State | What the screen does |
|---|---|
| **Unknown id** | `CaseReviewMissing` — `Empty` + "Back to register cases", as built |
| **The common complaint (26 of 35 — problem 29)** | Header, four scrutiny cells, one check line, one caption, the way in, the band. **No finding rows, no scrolling, no colour** |
| **`r-1333`** | One flag: deposited outside §138(a)'s three months. Opens onto `Cheque dated` · `Deposited on` and the cheque + proof of deposit |
| **`r-1588`** | One flag: filed beyond the month with no application to condone. Check 5 does not also count that slot |
| **`r-1490`** | One flag (the accused's ID proof absent) **and one note** (no advocate — appears in person). The note is plain ink; the send-back states it has no recipient (§12.12) |
| **`r-165`, `r-441`, `r-341`, `r-648`** | One note each: no advocate on record. **These four were missed by the previous revision's count** (problem 29) |
| **`r-330`, `r-1654`** | One note: a part payment; the detail carries the amount and the balance |
| **Checks 2 and 3 never fire** | True of all 35; the fixtures must not be bent to demonstrate them (D15) |
| **A finding whose detail has no document** | Checks 4 and 6 are *absences*. The detail states it in words and offers no control; **check 6 has no detail at all and therefore no chevron** (D24) |
| **Scrutiny not recorded** | The four cells must be able to say **"Not recorded"** and that must never render as cleared. It cannot happen on demo data and it is the state a real backend will produce first (§11) |
| **Scrutiny took one round** | `Rounds: 1`, `Took: 4 days` — plain values, no tone, no "clean first time" praise (D23) |
| **The file, opening** | The region enters over 300ms; the report does not move; no skeleton, because nothing loads (D25). `motion-reduce` gets a plain swap |
| **The file, deep-linked** | `?file=1&doc=…#case-group-…` opens the region, scrolls to the head, focuses it, and loads the named document into its tab |
| **Empty group** *(file)* | Panel keeps its heading and states the absence through `CaseAbsence.reason` + optional explanation copy, no well |
| **Empty fact** *(file)* | "Not stated" in `text-muted-foreground`, never a blank cell; **never a control** (D27) |
| **Pane — group with several documents** | Tabs, in the file's order, first one selected |
| **Pane — group with one document** | **No tab strip at all.** A tab bar with one tab is chrome around nothing |
| **Pane — group with none** (witnesses) | "No documents were filed under Witness details." Names the group; never a skeleton, never an upload target |
| **Pane — duplicate labels in one group** (three advocates → three vakalatnamas) | The record's ordinal prefixes the tab: "1 · Vakalatnama" |
| **Pane — many tabs** (six slots) | One scrollable line, active tab scrolled into view; never a wrapping block (RESPONSIVE; `SectionTabs`) |
| **Pane — a fact with no source clicked** | Nothing happens, because the row is not a control (D27) |
| **Loading / error** | None — derived data, no backend. When a document store arrives, `DocumentPreview`'s own states apply **in the pane only**. **The report needs its own third state then**: "checks could not run" and "scrutiny not recorded", both of which must read as *unknown* and never as *passed* — the two states this design would be dangerous without |
| **N records (pass 4)** | `Accused.reps[]`, `contacts[]`, `addresses[]` are arrays; three advocates means 22 document slots and six tabs in the advocates group — **and still one check-6 row**. The report's length is bounded by 4 cells + 1 line + 7 findings whatever the file holds |
| **Long label / Malayalam** | §6's three exposures: the finding sentence, the pane's tab labels, the report's cells |
| **Every field at its realistic maximum** *(v3, measured 2026-09-12)* | Every value on both tabs replaced with the longest plausible real one — a Malayalam complainant with four name parts, a company's full style, a Kerala address with house, ward, post and PIN, a co-operative bank with its branch, a 62-character email, a two-clause return reason — at 1440, 1032, 768 and 375. **No horizontal overflow at any width**; values wrap to two or three lines, cards keep their grid, comparisons keep their columns. The one break it found was the header (D48). Numbers, dates, ages, IFSCs and tracking numbers were left at their real lengths — an age never wraps |
| **200% zoom** | A 1280 viewport is 40rem: the report is unchanged (one column at every width); the file falls to its single-column sheet form. The "no scrolling" claim **does not survive 200%** and is not claimed there |
| **~375px phone** | Report: one column, cells `grid-cols-2`, the way-in caption wraps under the button. File: one column, documents in a `Drawer` with the tab strip inside it |
| **Send back, no reason typed** | The send-back's own control is held and says why once the box has been touched and emptied |
| **Send back, no advocate on record** | **Undesigned — §12.12.** Interim: the control states it has no recipient rather than sending nowhere |

---

## 11. Risks accepted

1. **Pass 8 is not discharged.** No shell this session — no curl, no screenshot, no
   `check:ds-fresh`. **What the builder must measure, at 375 / 1024 / 1280 / 1440 and 200%
   zoom, before reporting done:**
   1. **The report resolves without scrolling on a clean `r-1840` at 1280×800.** §7's ≈616px
      is arithmetic. If it fails, the cut is the header's fourth cell, **never** the check
      caption and never a scrutiny cell.
   2. **A finding with a three-line Malayalam sentence** — does the row stay a `min-h-10`
      target, does the chevron stay put, does the disclosure still read as one object now
      that there is no box around it?
   3. **D24 on the render, which is the decision most likely to be wrong.** Without a
      border, do three findings read as three statements or as an undifferentiated
      paragraph? The hairlines and `py-3` are doing all the work. **If it fails, the fix is
      more space, not a box** — and if space fails, §12.19's tint is the owner's call.
   4. **`warning-ink` text and icon on `bg-card`**, both modes — the DS tunes this pair to
      4.5:1 on the white page; confirm it inside a panel.
   5. **The pane's tab strip at 320px with Malayalam labels**, and the active underline
      sitting exactly on the frame's rule (no doubled line).
   6. **The file opening**: does the report stay still? Does the page steal scroll? Is 300ms
      right at 1440, and does `motion-reduce` give a clean swap?
   7. **The sticky strip** against the sticky decision band and the chrome — three sticky
      things on one page is the composition most likely to fight.
   8. **The reading observer** driving the pane: does the tab set change under the reader in
      a way that feels like the screen moving on its own? This is D26's real risk.
   9. Focus order: scrutiny cells → check line → each finding trigger → the way in → send
      back → register; and that opening the file moves focus into it.
2. **The scrutiny report's values are derived demo data until product links a record.** A
   magistrate reading "3 rounds" is reading a number nobody recorded. Mitigated by the fact
   that every *attribute* is real (`scrutiny/types.ts`) and that it replaces two steps that
   were fabricated with no attributes at all — but it is the **first thing the backend owner
   must replace**, and §12.22 is the question.
3. **"Cleared" is true of every complaint in this queue by construction.** If the product
   ever routes an uncleared complaint here, a cell that says otherwise is the most dangerous
   string on the screen. The model must be able to say "Not recorded" (§10) and the builder
   owns that branch.
4. **A magistrate can still register without opening a single document**, and this design
   makes it easier than the last one did — it now tells him a person already looked. That is
   the pull-request posture the owner asked for and a real transfer of trust. Three things
   hold the line: the report says *what kind* of checking happened, the caption says the
   machine read no document, and no words say the complaint is in order. A real control on
   this is product's to specify, not design's to imply (`ke-scrutiny-officer-2026-07`).
5. **Every machine check still reads entered data against entered data.** A forged cheque or
   a wrong date typed consistently passes all seven.
6. **The fact→source link is a mapping a human wrote.** `CaseFact.source` is asserted by a
   test to resolve, not to be *correct*: nothing proves "Payee bank" is really read off the
   deposit proof. The two weak pairs D6 named are still weak.
7. **The annotation is promised and not delivered.** A reader who knows e-filing will expect
   the highlight; D27 says in the pane why it is not there. If that reads as a missing
   feature rather than an honest limit, the words are wrong — and they are the cheapest
   thing on this screen to change.
8. **Losing the route loses a page title and a distinct crumb**, and makes one long page out
   of two short ones. The sticky strip pays for it; §11.1.7 tests it.
9. **`Amount` in the header is my addition** (D18), seen twice by the owner and never ruled
   on. One cell.
10. **`Court` stays in the header** though it is constant within the queue — the owner kept
    it on 2026-09-10; the argument for cutting it is recorded, not applied.
11. **Days waiting has three treatments across three sibling surfaces** (D12, D22, D28). A
    real pass-7 defect, logged in `approve-registrations` §11, accepted until a queue-wide pass.
12. **The file's order and the filing side's order disagree** (D4). Accepted; named so nobody
    "fixes" one to match the other.
13. **The facsimile is a drawing** and at pane size reads more like a wireframe than a scan.
    Accepted: legible facsimile text would fabricate a court record — and it is also what
    forbids the highlight (D27).

---

## 12. Open questions for product

**The one that changes a control, and still the one to answer first:**

9. **Is there a third outcome — dismissal at the threshold?** D9 cut `Dismiss case` because
   the owner named two outcomes (§4) and the control traced to nothing. He has **separately**
   said *"we should guide him to either dismiss or accept the case"*. That is either loose
   phrasing for send-back or a real third act. **Deliberately not resolved and not quietly
   reinstated.** *If yes: D19's band takes a third control and the send-back's reason field
   almost certainly becomes shared with it.*

**Raised by this revision — the owner's to answer, and each one changes something:**

18. **Does the magistrate need the scrutiny officer's name?** Cut from D23's four cells on
    the judgment that *whether a person read it* is the decisive fact and *which person* is
    not. `Filing.who` exists. One cell to reverse.
19. **Should more than one round be marked?** The report states `Rounds: 3` in plain ink and
    refuses to editorialise (D14's rule: the machine never recommends). If he wants three
    rounds to *look* like something, the treatment is `warning-ink` on the value — and that
    same answer decides whether D24's findings get a `warning-muted` block. **One question,
    two consequences.**
20. **Section or group, for the pane's tabs?** He said "section"; the file's own model says
    group, and his own example (three documents) is a group. D26 chose group and says why.
21. **Can a complaint reach him with a scrutiny item still open?** `HistoryItem.open` is a
    real state (`HISTORY_SUMMARY`: *"1 item open since 7 Jul"*). If yes, it is a **finding**
    (a row under the report), not a cell — and it would be the first finding on this screen
    sourced from a person rather than from a machine.
22. **What does the registry actually store about a scrutiny?** Mode, rounds, start and
    clearing dates, officer, open items — which of these exist? **This is §12.10 upgraded**:
    the previous revision said "do not build a scrutiny-outcome attribute on a guess"; the
    owner has now asked for the report, so the question is no longer whether but which
    fields. Until it is answered, D23's values are derived demo data (§11.2).

**Answered, kept in the record:**

1. ~~**What is this screen's job?**~~ **Answered 2026-09-11** — §4.
2. ~~**Who does it?**~~ **Answered 2026-09-11** — the magistrate. For this screen only.
3. **When does a complaint enter this queue?** Partly answered — "after it passes through
   scrutiny". Still open: what happens to a complaint scrutiny *returned*.
10. ~~**Does scrutiny produce a recorded outcome this screen can carry?**~~ **Superseded by
    §12.22** — the owner has answered the design half ("it needs to clearly say the kind of
    scrutiny that was done"); product owes the storage half.

**Still open, with UI consequences:**

4. **What does Register do**, and what number does the complaint receive? **This is what
   keeps both controls `aria-disabled`.**
5. **When does a complaint leave this queue** — and does a returned complaint stay readable?
6. **Which of the registry's other fields does a magistrate taking cognizance read?**
7. **Is the cheque's return reason a closed list or free text?** If closed, it is an eighth
   check; if free text, no machine can make one.
8. **Does the court side get a document store — and does the filing's `DocExtract` travel
   with the complaint?** **Upgraded by D27:** the first half decides whether the pane ever
   shows a real page; the second decides whether the annotation the owner asked for can ever
   be drawn. They are two questions and the answer to the first does not give the second.
11. **Should a send-back name the attribute it is about?** Cheaper here than anywhere:
    `FACT_TERMS` is closed, the slots are keyed, the findings are seven, **and `CaseFact.
    source` now exists** (D27). Still a product change. Must be answered with
    `approve-registrations` §12.10 or the court side gets two return grammars.
12. **What happens to a send-back when there is no advocate on record?** Five complaints in
    the queue, not one (problem 29) — the state is five times more common than this brief
    thought.
13. **Which ID does "ID proof" mean?** If the slot accepts several, the checkable count drops
    from 29 to 27 — and so does the number of rows that are controls under D27.
14. **Where is the power-of-attorney instrument?** `Complainant.poa` answers Yes on two
    complaints, `poaHolder` is never shown, and there is no PoA slot on the form. §142(a)
    makes this not cosmetic.
15. **What does a magistrate use this on?** The report is one column at every width; the
    file's split starts at `xl`, so a tablet in portrait degrades to open-read-close.
16. **Which document slots are mandatory?** Check 5's interim rule is `IntakeSlot.file ===
    null` on slots the form required. A real list replaces it.
17. **Does the magistrate want the fifteen unverifiable values enumerated?** This brief
    states the limit in one caption and does not list them — and **D27 now states it a second
    way**, by leaving those fifteen rows inert. If he would rather see them named, that is
    one more report line.

Items 1, 2 and 15 additionally belong in `docs/product/open-questions.md` as role and
product-user questions; filing them there is product's call, not this brief's.

---

## 13. Gaps in the DS (if any)

**None blocking.** Everything here composes from existing primitives. Five observations for
the DS repo and for Dristi's own components — none a licence to invent (and three more from
the v3 build, listed in §0.5: the `Timeline` rail stops short of the item's padding,
`TimelineItem.title` cannot take a node, and the rail is drawn in full `border`):

1. **`Banner` binds its icon to its variant.** `neutral` is a `MegaphoneIcon`, which is an
   announcement, not a report. Worth an `icon` override or a fifth variant whose semantics
   are "a system report".
2. **`AccordionContent` fixes its height from a Radix variable measured at open** and never
   remeasured, so reflowing content is clipped when the window narrows. The workaround left
   with the accordion; the issue stands for the next caller.
3. **`AccordionItem` ships `not-last:border-b`**, which a bare `border-b-0` cannot displace
   (tailwind-merge treats a variant-prefixed utility as a different group). Drop the default
   or document the reset.
4. **`TabsList` has no overflow story.** It is `inline-flex w-fit` and `TabsTrigger` is
   `whitespace-nowrap flex-1`, so every caller that can have many or long triggers writes its
   own horizontal scroller — `SectionTabs` did, and D26's pane will. RESPONSIVE tells callers
   to "allow wrap or scroll"; the component offers neither. Worth a `scrollable` variant or a
   documented recipe.
5. **App-level, not DS** — two items in `components/cases/document-preview.tsx`, Dristi's
   own: (a) the `quiet` + `card` variant needs a **`header` slot** in place of its `h3` title
   strip, so D26's tabs can sit on the frame's rule instead of naming the document twice;
   (b) the standing request from the last round — `showFullView={false}`, since three callers
   now ship a "Full view" control inside something that already is the full view.

**Not a gap: `Item`.** The DS has no "statement row" variant and does not need one — the
composition for a list of statements, one of which opens, is `Collapsible` +
`DescriptionList` + hairlines, which `approve-registrations` already ships. `Item` was the wrong
reach, not a missing primitive (§8, D24).

---

## 14. Decision log

| 2026-09-11 (v2) | Second build as a new rail row, `register-cases-v2`; summary tab first, in the approved-registrations grammar; scrutiny record gains per-round defect class, taken-up date and queue wait | owner (Abhiram) |
| 2026-09-11 (v3) | v2 deleted; third build at `register-cases-v3` from v2 as a wireframe only — synopsis sheet + timeline side by side, each fact once, scrutiny on the timeline, acts settle in place (§0) | owner (Abhiram) |
| 2026-09-11 (v3 craft) | Full width; two tiers on one grid; synopsis as six hairline-divided compartments with labels over values; timeline collapsed to its spans with dates on demand; scrutiny its own panel again (§0 D10–D14) | owner (Abhiram) |
| 2026-09-11 (v3 case file) | Case file built as the scrutiny workbench's three-pane reader, read-only (§0 D15–D22); tab underline fixed onto the rule | owner (Abhiram) |
| 2026-09-11 (v3 case file, simplified) | Workbench frame dropped for a scrolling file with search, a tick-rail contents and a page-on-request panel with the values read from it (§0 D23–D27) | owner (Abhiram) |
| 2026-09-11 (design review) | Eight comments applied; type scale, spacing and the docked documents panel confirmed with the owner first (§0 D28–D33) | owner (Abhiram) |
| 2026-09-11 (case file chunks) | Case file in the e-filing's order, one card per group, chunked as the e-filing's sub-cards (§0 D34–D36); global hover token deferred | owner (Abhiram) |
| 2026-09-11 (case file craft) | No 12px; bands with a gutter and one label column; comparisons as grids; the eye centred on its row (§0 D37–D41) | owner (Abhiram) |
| 2026-09-11 (gaps and lines) | No name column on cards whose bands have no name; Summary facts at two lines with 14px labels and notes inline (§0 D42–D43) | owner (Abhiram) |
| 2026-09-12 (dates and rounds) | Timeline shows the dates with each limit on the step that closes it; scrutiny's rounds open as a timeline; the card icon moves to the corner; the acts stick with the tabs; header stacks below 1024px, stress-tested at four widths (§0 D44–D48) | owner (Abhiram) |
| 2026-09-12 (timeline craft) | The timeline's phases stack as one chain each, with a fixed date column and the limit in its own column; the sticky bar keeps full-size buttons at a constant 64px; every field stress-tested again including the timeline's own rows (§0 D44, D47) | owner (Abhiram) |
| 2026-09-12 (headed cards) | Identity rows move into the body; card titles take a beige band with a white icon chip; the signatory band is renamed; tab switches wind back to the tab row; the documents panel stops resizing as you scroll; timeline rows gain room and a hover (§0 D49–D54) | owner (Abhiram) |
| 2026-09-12 (alignment pass) | Real addresses in the fixture; dots centred on their line; scrutiny ruled into bands; no rule under a card's heading band; acts centred in the sticky band; the title-to-tabs gap halved; the documents panel inset to the page margin (§0 D55–D58) | owner (Abhiram) |
| 2026-09-12 (one build) | The first build deleted; the third takes the name, the route and the rail row (§0 D59). **Open:** the check ledger's model is now unrendered — see §11 | owner (Abhiram) |
| 2026-09-12 (the act as an overlay) | Send back and Register happen in one modal over the page, in the registrations queue's shape; the documents panel sticks to the tab bar's foot (§0 D60–D61) | owner (Abhiram) |
| 2026-09-12 (motion and copy) | State above the question, round outcome marks, ruled header; the build caveats removed app-wide; arrivals carry their direction (§0 D62–D64) | owner (Abhiram) |
| 2026-09-12 (the clean-up) | Check ledger, the first build's timeline model and the legacy `/file` redirect deleted; the registrations feature renamed to approve-registrations throughout (§0 D65–D66) | owner (Abhiram) |
| 2026-09-12 (one motion, one canvas) | The motion vocabulary and ui-craft §8; the beige canvas moved to the employee shell; the account pill above the name on the decision card (§0 D67–D68) | owner (Abhiram) |

| Date | Change | Who |
|---|---|---|
| 2026-09-02 | First pass from the legacy screenshot: the list in the court-side table panel; no registration act. | user asked; ux-designer |
| 2026-09-02 | Queue grown from 4 to 35 so the table and pager can be judged at volume. | user asked |
| 2026-09-09 | The complaint's file added behind the cause title; the case name becomes a link. | user asked; ui-designer |
| 2026-09-09 | A details pass built and reverted; one correctness fix kept (grounds no longer cite an application that is not on the file). | user asked; ui-designer |
| 2026-09-09 | Documents became realistic filings; absent slots carry no paper. Timeline filled along the Kerala spine. Reading index rebuilt and verified over CDP. Helper line on the band cut. | user asked; ui-designer |
| 2026-09-10 | **Sections are no longer collapsible**; **the word is "Register"**; **timeline trimmed to traceable events**; **header constants cut**; **documents move to `DocumentPreview`**; **terms become attribute names**. | **owner (Abhiram)** |
| 2026-09-10 | §5a Attributes table added (11 sourceless rows cut); the tinted confirmations `Alert` becomes one fact row; typography cut to four sizes; grid tracks rebalanced. Built; ui-reviewer audit passed after fixes. | ux-designer / ui-designer / ui-reviewer |
| 2026-09-11 | **Section 4 dropped** (the accused cannot file before registration); **breadcrumb shows the current step**; design-mode round three (labelled header cells, `text-body` 600 headings, `bg-muted` canvas **overruling `ui-craft` §1.0**, `DocumentSlot`/`ThumbnailButton`, adjacent litigant tag). | owner (Abhiram) |
| 2026-09-11 (evening) | **The Job is confirmed and the screen rebuilt from it** (§4). **D1–D12**: the document opens beside its claims; a check region; the statute's order; nothing folded; the norm goes quiet; the index and timeline leave the layout; `Dismiss` cut for Send back; §5a-iii gains `Checked against`. | **owner (Abhiram)** / ux-designer |
| 2026-09-11 (night) | **The glancing framing** (§1) and **D13–D22**: the landing stops being a verification surface; the check ledger's one counted line; seven checks; a finding opens where it is stated; one control and one route to the file; `Amount` joins the header; no overlay on the glance; §5a-iii gains `Surfaced`. | **owner (Abhiram)** / ux-designer |
| 2026-09-11 (night) | Built at `58285b3`, with three deviations logged in code: `ListChecksIcon` for `ShieldCheckIcon` (a shield with a tick vouches for the record); the `Item` as container with the strip as trigger (a trigger cannot contain its own content); `flex-nowrap` on the `Item` (measured: a wrapping column flex stretched the open disclosure 580px). | ui-designer |
| **2026-09-11 (late)** | **The owner reviews the built glance and asks for four changes** — quoted in full in §1: the report must say *how the scrutiny happened*, not just that seven checks ran; the finding strip "feels too tacky"; the pane should preload the documents of the section being read and take e-filing's field→annotation interaction; and the full file should disclose in place rather than open a page, "with good motion design". | **owner (Abhiram)** |
| **2026-09-11 (late)** | **D23 — the scrutiny report.** The ledger becomes one region with **two sourced statements**: the registry's scrutiny as four cells (**Scrutiny · Rounds · Took · Cleared**, in the header's own cell grammar), then D14's check line and caption. Every attribute traces to `lib/employee/scrutiny/` (`HistoryEvent`, `HISTORY_ROUND`, `HistoryItem`, `Filing.who`); the **values** are derived the way the §138 chain is (§5a-ii.8). Restores the owner's first framing — *how many rounds, how long*. **Rejected:** one merged count, a composed sentence, a "Passed" chip, the history itself, a fifth cell for the officer. | **owner (Abhiram)** for the ask; ux-designer for the shape |
| **2026-09-11 (late)** | **D14/D15 superseded as the whole report, and the seven checks explicitly survive** — every derivation, the two-value severity, the no-eighth-check rule and the limit caption are untouched. What was too thin was seven machine comparisons standing for the whole of "has this been checked" (problem 24). | ux-designer |
| **2026-09-11 (late)** | **D24 — a finding is a statement, not a strip.** Diagnosis before redesign (problem 25): `Item variant="outline"` is `border-border bg-card` — the darkest non-text mark in the system on a white panel (`ui-craft` §1.1 / §2's first row); `Item` is the DS's row-**as-control** and the build had to cancel its hover twice; and the non-openable finding was the same box with the control taken out. Replaced by hairline-separated rows at **`text-body`**, icon + sentence + chevron, detail in the sentence's column — **`approve-registrations`' `FactRowView` grammar, which D22 claimed and the build forked.** **Rejected:** a `warning-muted` block (legal, but a well on a tint is AGENTS 6a and a tint makes a statement skimmable) — reversible, §12.19. | **owner (Abhiram)** for the defect; ux-designer for the diagnosis and the fix |
| **2026-09-11 (late)** | **D25 — the file discloses in place; the `/file` route goes.** One control toggling, the report unpinned and unmoved, the control's row becoming a slim sticky strip once open, **the state in the URL (`?file=1`, pushed) so Back closes it and every finding deep link still works** (`?file=1&doc=…#case-group-…`). Motion is the app's own `animate-in … motion-reduce:animate-none`; **no skeleton, because nothing loads** — said plainly rather than staged. **Explicitly distinguished from the 2026-09-10 accordion ruling**, which was about the file's five sections folding against each other, not about the file disclosing as a whole; nothing inside it folds. **Supersedes D17**, whose reasoning (a mode's memory, linkability, Back) is answered by the query param rather than dismissed. | **owner (Abhiram)** for the ask; ux-designer for the mechanics |
| **2026-09-11 (late)** | **D26 — the pane carries the documents of the group being read**, as `Tabs variant="line"` on the pane frame's own rule. **Group, not section:** the owner's "three tabs" is the cheque group exactly; section 1 is nine or ten slots. **D7's reading observer returns** — for the pane, not for an index — with its claim rule intact. One document → no strip; none → the pane says so and names the group; many → one scrolling line; duplicate labels → the record's ordinal. Needs a `header` slot on `document-preview.tsx` (§13.5). | **owner (Abhiram)** for the ask; ux-designer for the scope correction |
| **2026-09-11 (late)** | **D27 — a fact points at its source document; the highlight waits.** `CaseFact.source?: CaseSlotKey` replaces D6's pairing-by-order — **the mapping already existed as §5a-iii's `Checked against` column** and moves into the model where a test can assert it. **A fact with no source is not a control** (15 of 47 on `r-1840`). The e-filing annotation cannot cross yet, for three stated reasons: `ExtractedField.box` is filer-side only; the pane shows a **drawing**, and a box over a drawing points at nothing; and `box` is optional and sparse even with a store. Staged, with the second stage reusing `regionFromBox` verbatim. **Rejected:** drawing a plausible box now. | **owner (Abhiram)** for the ask; ux-designer for the limit |
| **2026-09-11 (late)** | **D21 corrected a third time and D8 narrowed:** the timeline loses *Taken up for scrutiny* and *Scrutiny completed* — both fabricated from `wait >= 3` / `wait >= 7` — because D23 states the same thing with real attributes. The `Sheet` moves onto the file region. **Rows with a product-doc source that no store holds: 2 → 0.** | ux-designer |
| **2026-09-11 (late)** | **Count corrected: 26 of 35, not 32** (problem 29). Findings fire on five marked complaints **and on the five with `counsel: []`** — `r-1490`, `r-165`, `r-441`, `r-341`, `r-648`. §3, §5a-iii, §10 and D15 updated; §12.12's no-advocate question is five times more common than this brief thought. | ux-designer |
| **2026-09-11 (late)** | **§5a-iii re-valued** for one route (`report` / `report·fired` / `file` / **`pane`** / `sheet` / `stage` / `cut`), the scrutiny block added, and `Checked against` promoted from a note in a brief to `CaseFact.source` in the model. **47 body values become 12 before the act** — four more than before, and the four are the answer to "how was this scrutinised". | ux-designer |
| **2026-09-11 (late)** | Housekeeping, logged rather than done silently: **§5a-i B and §5a-ii are condensed to each decision's load-bearing reasoning and its verdict.** No decision, verdict or ruling is removed or changed; the full prose of every superseded round remains in git at `58285b3` and its ancestors. | ux-designer |
| **2026-09-11 (late)** | **Pass 8 not discharged:** no shell this session — nothing curled, no screenshot, `check:ds-fresh` not run. Nine render checks handed to the builder in §11.1, headed by the report's "no scrolling at 1280×800" (≈616px, arithmetic) and by **D24 on the render**, which is the decision most likely to need a second pass. | ux-designer |
