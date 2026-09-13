# Hearing order

Status: building — **D40–D43 built 2026-09-13**: the court's twenty-seven templates
replace the seventeen this app wrote, and the panel is four collapsible sections beside
the order on paper. D26–D39 remain proposed; the variable *fields* (D31) are the next
slice and are not built.
Updated: 2026-09-13 (D40–D43 built; D33 reversed earlier the same day — see §14)
Source: user screenshot (1.0 generate-order screen) · second screenshot 2026-09-03 of the
**built** composer at 1232x928 · third and fourth 2026-09-06 (shipped D16 at ~1512x923 +
the 1.0 composer; problems 11–14) · four more 2026-09-09 (the 1.0 composer as the typist
works it; problem 15) · **two more 2026-09-13 — a dark-theme two-column reference the owner
names as "the direction", and our shipped screen (problems 16–23)** ·
**`docs/product/order-templates.md` — the owner-supplied Order Template Catalogue (PDF
dated 2026-09-07, transcribed 2026-09-13). This is the spec for how order generation
works, and questions it answers are not put back to product.** ·
docs/product/product-foundation.md · docs/product/sources.md · docs/product/domain/journey.md ·
docs/product/domain/actors.md · domain/practice-notes.md · docs/product/national-vs-state.md ·
docs/product/open-questions.md ·
apps/dristi-app `lib/employee/court-role.ts` + `content.ts`, `lib/cases/orders.ts`
(`ORDER_TYPES`, `ORDER_CLASSES`, `OrderRecord.botd`), **`lib/cases/types.ts`
(`CaseRecord.longPending`) + `lib/cases/query.ts` (`statusOf` → `"long-pending"`)**,
`lib/employee/order-items.ts`, `lib/employee/order-draft.ts`,
`lib/employee/listing-applications.ts`, `lib/employee/hearings.ts`,
`components/employee/order-screen.tsx`, `components/employee/sign-order-dialog.tsx`
DS read: `vendor/pucar-design-system` — **origin verified
`https://github.com/pucardotorg/dristi-design-system.git`, HEAD = `refs/heads/main` =
`e0cadea6b9d459bd3c58eed840974c6c610ad624`, matching `ds.lock.json`. Pin `e0cadea6b9d4`
confirmed.** *(Correction 2026-09-13: this header previously recorded the origin as
`neer-ideasbeforenoon/pucar-design-system`, which is not the authoritative remote. The
checkout was always right; the brief's record of it was wrong.)* — `AGENTS.md`,
`ACCESSIBILITY.md`, `RESPONSIVE.md`, foundations `laws` (incl. **"Prefilled is amber fill
only"**) / `typography` / `spacing` / `colors` / `elevation` / `icons`; catalog
card · field (`FieldSet` · `FieldLegend` · `FieldError`) · **input-group**
(`InputGroupAddon` · `InputGroupInput`) · input (`prefilled`) · segmented-control · select ·
combobox · date-picker · textarea · checkbox · collapsible · toggle-group · button ·
dialog · empty · alert · badge · separator.

---

## 1. Context

**Ask (2026-09-02):** the generate-order screen is poorly designed. Review, redesign, build.

**Ask (2026-09-06, owner):** *"we need to fix this screen — if we have attendance in an
accordian, it still doesn't help… Today we don't have the option move to the next hearing
as well. Also the text box doesn't have the edit option…"*

**Ask (2026-09-13, owner):** *"We want to completely revamp the orders taking page for the
typist. Screenshot 1 gives you the direction… on the right side the orders page appears
depending upon whichever sort of workflow/template the typist chooses. I have given you a
PDF which will tell you exactly which other fields are required… ensure that it is
accurate, depending on whichever sort of template I select — it shows the correct stuff on
the right-hand side with the correct template."*

One shape: **choosing an order type must produce that type's real template text and that
type's required fields — no more, no fewer, in the right control for each.**

**The spec, and how this brief treats it.** `docs/product/order-templates.md` is the
**source of truth for how order generation works.** Where it answers a question, this
brief answers from it and does not put the question back to product (§12 holds only what it
genuinely leaves open). Facts, attributed and dated 2026-09-13:

- **Every order is generated from a template.** 27 order types, each with a BOTD template,
  locked and optional variables, an "In dropdown" gate, and a workflow column.
- **13 general variables** are auto-populated — *"the judge never types these."*
- **Locked** variables are required by the workflow and cannot be removed. **Optional**
  variables are added or removed **by a system administrator**, not by the composer.
- The system cannot fill a variable requiring **a choice among options**: which party
  (*"With multiple candidates the system presents a selector; with one, it fills
  automatically"*), discretionary dates, amounts, and master-data selections.
- **Parties:** *"there can be multiple accused (e.g. the drawer and the company
  director)"*; `[Party Type]` is *"Complainant, Accused, or Witness"*; `[Party Name]` is
  *"Any person in the case — complainant, accused, witness, or PoA holder."*
- **BOTD and the full order are both produced in one composing act.** The template text is
  the BOTD — *"the short operative line that appears on the day's cause list and business
  record"* — and *"the magistrate can separately define the longer, detailed order text
  **when composing the full order**."* Resolution step 6: *"The system generates the
  **complete order text**."* Step 7: *"The judge reviews, optionally edits, and signs."*
  And *"The judge works with the generated text… edit it freely (add sentences, remove
  paragraphs, correct wording) and add **additional comments in a free-text area**."*
- **A type with no template:** *"the judge writes the order text from scratch — or a
  dedicated screen handles it (e.g. Judgement)."*
- **"In dropdown: No"** types *"appear only in context (e.g. when the judge is acting on an
  application)."*
- **Four section workflows** are not order types; they are dedicated screens producing a
  case-file record, *"surfaced as **buttons alongside the order type dropdown**, not as
  entries in it."*
- **19 distinct hearing purposes** (20 rows; the source notes #18 and #20 are *"the same
  hearing purpose"*) map to people required and likely order types, over a generic
  always-available set.
- **LP is the Long Pending Register.** #25 moves a case in (*"marked as LP"*), #26 moves it
  out and it is *"considered and renumbered as a ST case."* ST and LP are two states of one
  attribute.
- **Discretion is the judge's:** amounts are the judge's, dates are *"set by the judge's
  discretion"*, and step 7 is review-and-sign.

**The source flags two gaps in itself:** case stages where each order is most likely
issued, and grouping for the order-issuance screen. Both are in §12.
**Known transcription defect:** the PDF's rightmost **Workflow** column is clipped on every
page. **No decision here rests on a clipped cell.**

**Where it sits.** `/employee/hearings/[hearingId]/order`, opened from the cause list's
Orders column. **Only ever from inside one listing's sitting** — `canDraftOrder` is
`ongoing || completed` for a seat that calls the matter; `hearing-session.ts` holds one
`ongoingId`. *D25:* the typist has no session controls, so that seat reads `canTypeOrder`
(adds `scheduled`) and **the trip in is the sitting**.

**Attributed fact (owner, 2026-09-06):** advancing to the next matter is expected of this
screen. Not a statement of the screen's Job (§4).

**Neighbours.** The advocate-side register holds `OrderRecord.botd?: string` separate from
`issuedDocument` — **both artefacts, separately modelled**, which is what D33 now matches.
The Sign orders queue is downstream; `sign-order-dialog.tsx` prints an order as numbered
paragraphs on `bg-paper`.

**In scope:** compose the order of this listing — attendance, applications answered, what
the court passed, additional comments, next listing — from the court's templates with the
fields each needs; preview; move on.
**Out of scope:** issuing, e-signing, PDF as a court record, CIS write-back, and the four
section-workflow screens (D35).

**Who logs in** is unanswered and **belongs in `docs/product/open-questions.md`, not here.**
`COURT_SEATS` is `["bench-clerk", "typist"]`; `CURRENT_STAFF.role` is `bench-clerk`; the
2026-09-13 screenshot shows Typist because the rail's seat switcher was used. The spec says
"the judge"/"the magistrate" throughout and never mentions a typist, so **it does not
resolve who operates this screen — and it does not need to** (D37).

---

## 2. Problem

1–9 from the 1.0 screenshot; 10–15 from screens we built; **16–23 from the spec and the
2026-09-13 screenshots.**

1. **Present and Absent are two independent checkbox grids for the same four roles.** One
   person can be both. *(Still true of the reference **and our shipped screen** — 23.)*
2. **The four labels are roles, not the people on this listing.** *(Fixed: `appearancesFor`.)*
3. **Next listing is a negative checkbox that leaves Purpose and Next date visible.**
   *(Still true of our shipped screen — 23.)*
4. **"Choose item" is an empty dropdown with Edit and Delete beside it.** *(Fixed by D24.)*
5. **The right column is neither a preview nor an editor.** *Re-read 2026-09-06 (D17):*
   1.0's right column is **the order, with the part you write left writable**, wrapped in
   read-only boxes because 1.0 could not assemble prose.
6. **The document is three boxes, not one order.**
7. **No case context beyond the cause title.** *(Sharpest part is 20.)*
8. **Hierarchy is flat.** The strongest action is a look.
9. **The rich-text toolbar is a local `execCommand` editor.** *(Answered by D22.)*
10. **The one region that takes typing was below the fold, and the half-page beside it was
    empty.** Directions heading at y=774, add-affordance at y=817, footer at y=856; the
    document panel ended at y=447. D14/D15/D16 each rearranged the same four boxes; none held.
11. **Half the page was a mirror, and that was the fault under 10.** On arrival it read
    *"Attendance has not been marked. / Next date has not been set."* **Resolved by D17; a
    residue returned in the 2026-09-07 rebuild — 23.**
12. **D16's fold paid out only after the work it was meant to make room for.** *Reversed.*
13. **There was no way to move to the next matter, on a 23-matter board** — five acts and
    three page loads. *Resolved by D18; the shipped label is not D18's — 23.*
14. **The composer and the signing queue disagreed about what an order looks like.**
    *Resolved by D19.*
15. **The order-items catalogue was missing, and under it a missing model** — one blank
    editor, so an order could hold one item however many the court passed. *Resolved by D24.*

16. **Our catalogue is not the court's.** 17 types shipped; the spec has **27**. Fifteen
    match; **twelve are missing**, six of them browsable orders no typist can reach today
    (case transfer, case settlement, withdrawal, moving to and out of the LP register,
    scheduling). **`miscellaneous-process` is ours only and cannot exist under a template
    system** — no template, no variables, no workflow.

17. **Our standing words are not the court's templates, and one says the opposite of the
    court's.** All seventeen sentences in `STANDING_WORDS` were written by this app.
    **`mandatory-submissions-responses`** ships *"The submissions called for by this court
    have been filed and are taken on record"* — a past event. Spec #2 is a **forward-looking
    direction with two deadlines**. A typist picking that type today sets down the opposite
    of what the court ordered, **with no deadline in it** — and §138 runs on hard clocks
    (`domain/journey.md`).

18. **The order has no fields. Twelve attributes are rendered as free text.** Every locked
    variable — amount, deadline, party, document type, notice type, mode of ADR, plea,
    application number — is absent or dissolved into prose. `cost` and `witness-batta` open
    on **`₹____`** and the typist types over four underscores inside a `contenteditable`.
    An amount in a paragraph cannot be validated and cannot reach the payment task the
    spec says Cost triggers.

19. **`[Party Type]` appears twice in one template meaning two different people.** #12: the
    party *summoned* and the party *directed to take steps*. #21/#22: the *paying* and
    *receiving* party. Keyed on bracket text, **Cost reverses who pays.** Our model cannot
    express it either: `hearing.parties.accused` is a single string, and the spec says a
    §138 case can have several accused, plus witnesses and PoA holders as party candidates.

20. **The composer never shows what the matter is listed for.** `CourtHearing.purpose` is
    on the record; the header prints only `Order : {cause title}`. D8 put it in an eyebrow
    and the 2026-09-07 rebuild dropped it — so the spec's entire purpose → likely-orders
    mapping has nothing on screen to key off.

21. **"Item" means two things.** `CourtHearing.item` is the board serial the bench calls;
    `OrderItemDraft` is a paragraph of an order. D18 refused this collision in the other
    direction. The spec, the register and the court all say **order type**.

22. **The screen does not model the two texts one composing act produces.** The spec is
    explicit that the template seeds the BOTD *and* that the magistrate defines the longer
    order text **when composing the full order**, plus an additional-comments free-text
    area. Our composer has one body, no comments area, and no vocabulary for the
    distinction — **while the register already models it** as `OrderRecord.botd` separate
    from `issuedDocument` (pass 7).

23. **The shipped screen carries problems 1, 3 and a residue of 11, and this brief read as
    if it did not.** Verified in `order-screen.tsx` on 2026-09-13: `MarkGroup` rendered
    **twice** as two `Checkbox` grids (1); **"Skip scheduling next hearing"** as a checkbox
    with its fields mounted-and-`disabled` rather than unmounted (3); the Order text column
    opening and closing with **read-only `Textarea` mirrors** of controls in the column
    beside (11's residue); the advance labelled **"Next hearing"**, which D18 rejected by
    name; and **"Save as draft"** back as a control whose `onClick` only fires an
    announcement (D20 cut it). The 2026-09-07 region-for-region rebuild was never written
    into this brief. **A brief that misreports its own screen is worse than a stale one.**

---

## 3. Objective

- Mark each person present or absent **without being able to mark them both**, and see
  those names in the order text.
- **Choosing an order type produces that type's real template text and that type's required
  fields — no more, no fewer, in the right control for each.** Observable: for each of the
  27 types, the fields on screen are exactly the spec's locked variables, and the generated
  line is the spec's BOTD template with those values in it.
- **One composing act produces both artefacts.** Observable: the structured business line
  the cause list will carry, and the full order text seeded from it and freely extended,
  are both derivable from the screen without leaving it.
- **No fact the court fixes on the day survives as prose.** No `₹____`, no free-typed
  deadline, no party named by typing where a selector exists.
- **Nothing the typist needs is silently absent.** Every one of the 27 types is in the
  browse list, reachable from the object it acts on, or visible-and-disabled with a reason.
- Numbered paragraphs matching the signing queue; a positive next-listing choice; finish
  the item and call the next from here; preview as paper with nothing claiming issuance.

Provisional while Job is unconfirmed (§4): the throughput objectives assume a repeat
court-side user working a board during a sitting.

---

## 4. Job

**Job: unconfirmed.** The spec describes how order *generation* works; it does not say what
this screen is for in our IA, and it never names the seat that operates it.

**User said (2026-09-02):** this is what appears on clicking the orders icon.
**User said (2026-09-06):** offer a way to move to the next hearing; the text box should
offer formatting.
**User said (2026-09-13):** revamp the orders taking page for the typist; the right-hand
side must show the correct template and the correct fields for the selected type.

**Candidate A (hypothesis):** compose the order of this listing so it can later be signed.

**Candidate B (hypothesis), in product's own words:** *"The judge selects an order type…
the system loads the template… the judge fills the remaining fields and confirms… the
system generates the complete order text. The judge reviews, optionally edits, and signs."*
Strong, and it is what D33 now builds to — but it names **the judge**, and the seats are
bench clerk and typist. It describes the act, not the actor. **Do not treat "this is where
the judge signs" as true:** signing stays in the existing downstream queue (D10).

Four constraints hold without a coined purpose: the entry point, the precondition (the
matter has been called), the honesty bound (draft and preview only), and **the template
contract** — the words and the fields come from the spec, not from this app's invention.

---

## 5. Decisions

**Read this before D14–D25.** The screen that shipped on 2026-09-07 was rebuilt region for
region against the reference, and **that pass was never written into this brief.** It
supersedes the *arrangement* D14–D18 argued over; their *arguments* stay on the record in
§14. Where the shipped screen and a decision disagree, problem 23 and §11 say so.

**D0 · Do not polish 1.0.** *Judgment.*

**D1 · One mark per appearance, not two lists.** *(problem 1)* A row per appearance: name +
role caption, `SegmentedControl` Present | Absent. Unmarked is valid; both is impossible.
*Rule: SegmentedControl is the DS primitive for a small exclusive set.* **Not built (23).**

**D2 · Names from this listing.** *(problem 2)* A side with no vakalat has no advocate row;
role is the caption. **Built.** *Extended by D31: the roll is also the party-selector's
candidate list, and it has to grow to carry witnesses.*

**D3 · Next listing is a positive choice.** *(problem 3)* `SegmentedControl` "List next" |
"No next date"; fields **unmounted, not disabled-in-place**. **Not built (23).** *Extended
by D34.*

**D4 · Orders are a list of named blocks, not one field.** *(problem 4)* Each a well: type
as title, an editor for the words, a visible Remove (ACCESSIBILITY §7). *Amended by D19
(numbered), D24 (chosen from a catalogue), D31 (each carries its own fields).*

**D5 · The assembled order is one document, and it is where the order is written.**
*(problems 5–6, 11)* Attendance as a **roll of sentences** (name medium, office muted,
absent in `text-destructive-ink`), then the numbered paragraphs, then the closing. Not a
`DescriptionList`, not chips. *D5's read-only half was withdrawn by D17.*

**D6 · No marks; structure yes.** *(problem 9)* Superseded in part by D22.

**D7 · Full page, not a sheet or dialog.** A document needs a page. *RESPONSIVE.*

**D8 · Page chrome names the listing.** *(problem 7)* Eyebrow, cause title, and
"Draft — nothing on this screen is issued." **The purpose half is restored by D30.**

**D9 · One primary.** *(problem 8)* Sticky footer; exactly one `bg-primary` on the view
(*Laws: ration teal*); no "API" badge. *Amended by D18 and D20; the shipped footer restored
Preview PDF as teal — §11.*

**D10 · Honesty bound.** This composer stops before a judicial act. Preview does not file,
notify or sign, and **signing stays in the existing downstream queue** even though the
spec's step 7 ends in a signature. No disabled tease. **Survives D18, D31, D33, D36.**

**D11 · Lifted panels, hairline breaks inside, no nested `shadow-raised` cards.**
*ui-craft §1.0 / §4.*

**D12 · Employee stays self-contained.** Do not import `lib/cases/orders`; restate labels
so the two halves cannot disagree. *D19 applies it in the other direction. **D28 is where
it now strains — see there.***

**D13 · The cause-list orders icon is not green until an order is passed — and even then,
colour is not the signal.** *Laws: ration teal; status never by colour alone.*

**~~D14 · Bounded facts in a band.~~ ~~D15 · Attendance a narrow panel.~~ ~~D16 · One work
container, document sticky, roll folds when marked.~~** *(2026-09-03; superseded, D16
reversed 2026-09-06.)* All three moved the same four objects; each bought thirty pixels the
next gave back. Diagnoses survive as problems 10–12. **D15's best argument — the roll
*beside* the writing, so the party count stops moving the typing — is re-adopted by D17.**
**D16's `Collapsible`-over-`Accordion` reasoning is kept** (the DS `Accordion`'s header is a
fixed `h3` and would skip a level under the page `h1`). Full arguments: §14.

**D17 · The order is the editing surface.** *(problems 5, 6, 10, 11, 12; supersedes D5's
read-only split and D16's fold)* **It removes an object rather than moving one:** three
panels to two, and two places the same sentence appears to one. Left `lg:col-span-2` — the
facts of this listing, bounded. Right `lg:col-span-3` — the order, with the writing in it.
Nothing sticky but the footer. First typing affordance y≈815 → **y≈450 on arrival**, and it
stops moving with the party count. *Rejected: shrinking attendance; pre-marking every
appearance Present (it would author a fact into a court order that nobody said); a wizard.*
**Gave up:** the controls-free read beside the work — Preview's job now (D21).

**D18 · The advance is the screen's one primary, called "Next item", and it says what it
ends.** *(problem 13)* From `hearing-session.ts` and `canDraftOrder`, the only coherent act
is **end this listing and call the next scheduled one**. Footer right. Takes the teal from
Preview. **"Next item", not "Next hearing"** — that phrase already means the next listing
*of this case* forty pixels away. Caption names the item it calls. Last item → "End item".
**No confirmation dialog** — twenty-three modals in a sitting is fatigue, and a confirm
people dismiss reflexively protects nothing. *Risk accepted (§11).* **Shipped button says
"Next hearing" — §11.**

**D19 · Order paragraphs are numbered.** *(problem 14)* `<ol list-decimal>`, the shape
`OrderFacsimile` already uses. No new primitive — numbering is list position.

**D20 · The draft is held for the sitting, so "Save draft" goes.** Same lifetime and honesty
as the session marks. An explicit save that duplicates continuous behaviour teaches distrust.
**Shipped footer restored it — §11.**

**D21 · Preview is the paper the signing queue already uses.** `DocumentPreview` + an
`OrderFacsimile`-shaped article on `bg-paper`. **Paper stays out of the composer**
(*"never app chrome"*, fixed in both modes). No download. *Extended by D33: the paper now
prints both artefacts, labelled.*

**D22 · Order text takes formatted text, through the app's existing editor.** *(owner,
2026-09-06)* Owner reaffirmed after reading D19's reasoning. **Not a new editor:**
`components/cases/rich-text-field.tsx` — DS chrome throughout, paste sanitised, read-only
`RichTextValueView` for the paper. The order numbers the paragraphs; the editor's list
controls handle (a), (b), (c) inside one. `ds-requests.md` #7 gains a caller; that queue is
shared, so the edit is the owner's. **Gave up:** the plain-text guarantee.

**D23 · A completed listing opens on a written order.** `order-demo.ts` supplies the
*opening* draft for a `completed` listing — a starting draft, not a lock.

**D24 · Choosing the type is what writes the order.** *(problem 15)* Picking one appends a
numbered paragraph opened on the template with this listing's parties in it.
`OrderDraft.itemText` → a list; position is the paragraph number. **Membership on the left,
words on the right** — the reference's own division, and neither restates the other. A
grouped, type-ahead `Combobox`, not a plain select (*reuse before creating, AGENTS §3*).
**Removing is neutral, not the reference's red Delete.** **Adding is not writing** — a
chosen-but-blank order still prints, because the court passed it. **Gave up: the guarantee
that every word was written by a person on the day** — *retired by D27.* *(D24's other
logged deviation, the 202 rename, is **withdrawn by D28**.)*

**D25 · The typist's cause list ends at Orders, and the trip in is the sitting.**
`canTypeOrder` adds `scheduled`; `openOrder` marks the matter heard on the way in.

---

**D26 · What we take from screenshot 1, and what we do not.** *(2026-09-13)*

**Taken, and load-bearing:** *the right side is the order, not a set of fields describing
it.* That is D17's column assignment, independently arrived at, and the reference is the
second piece of evidence for it. **The reference also corroborates D33**: the body of its
order document is spec #17 Cognizance followed by #12 Issue of summons, verbatim, with a
live cursor in it — the template seeding a document someone is writing in.

**Taken:** the document-style identification header (court, case number, in the matter of,
parties table, offence line, ORDER, Present/Absent) — our Preview already prints that shape.

**Taken, in substance:** the **shortcut set above the catalogue.** Four tiles for this
hearing purpose over four collapsed groups counting 5+7+10+6 = 28 is, near enough, the
spec's 27 grouped with a purpose-driven shortcut on top — which is the spec's own
purpose → likely-orders mapping. D30.

**Taken:** the applications at the head of the rail. D36 — and the spec, not the
screenshot, is what changed my mind.

**Not taken — two attendance grids.** Problem 1. One fact per appearance. D1 stands; the
reference repeating the defect is not evidence for it.
**Not taken — "Skip Scheduling Next Hearing"** as an inverted checkbox over fields that do
not recede. Problem 3. D3 stands.
**Not taken — the tiles' one-line descriptions** ("Advance to Appearance stage", "Create
payment task"). Workflow claims; this build performs no workflow (D10) and the spec's own
Workflow column is `[clipped]` on every page, so printing a consequence invents one twice.
**Not taken — the red Delete / red Reject.** D24, D36.
**Not taken — a search field over collapsed accordion groups.** Our `Combobox` searches
*and* groups in one control; two mechanisms for one act is a pattern fork (pass 6).

*Judgment.* **Gave up:** visual proximity to a reference the owner likes, in four named
places — each named separately so any one can be overruled without the others.

**D27 · The catalogue is the court's twenty-seven, and the words are the court's.**
*(problems 16, 17; supersedes D24's seventeen and retires §11's largest risk)*

| Ours | Spec | Verdict |
|---|---|---|
| `abate-case` · `bail` · `cost` · `refer-case-to-adr` · `attachment` · `notice` · `proclamation` · `summons` · `warrant` · `witness-batta` · `mandatory-submissions-responses` | #27 · #20 · #21 · #5 · #24 · #15 · #23 · #12 · #13 · #22 · #2 | **Same thing.** Template text replaced verbatim; locked variables become fields (D31). |
| `order-for-taking-cognizance` · `order-to-dismiss-case` | #17 · #19 | **Same, renamed.** Keep our labels, take their text. |
| `postponement-of-issue-of-process` | #1 Order under section 202 CrPC | **Take the spec's label — D28.** No template: *"the judge writes the order text from scratch."* Our invented sentence is cut. |
| `judgement` | #18 Judgement | **Dedicated screen** (*"or a dedicated screen handles it"*). Stays in the list, In dropdown: Yes; selecting it is a stub (D35's idiom). Our invented sentence is cut. |
| `miscellaneous-process` | — | **Cut.** Ours only; no template, no variables, no workflow. |
| `others` | — | **Survives, demoted.** Not one of the 27 — it is the escape for an order the spec has no type for, not for a type we forgot. How often it is reached is now a signal the catalogue is short. |
| — | #6 Scheduling of hearing date | **Added as a region, not a list entry — D34.** |
| — | #10 · #11 · #14 · #25 · #26 | **Added to the browse list** (#25/#26 conditional — D29). |
| — | #3 · #4 · #8 · #9 · #16 | **Added as context orders, reached from the application — D36.** No browse entry. |
| — | #7 Rescheduling | **Not on this screen.** "In dropdown: No"; it is the rescheduling workflow's output, which is Bulk reschedule's. |

**Net:** browse list 17 → **21**; six types become reachable that no typist could reach
before; **thirteen types get the court's real BOTD text and four lose invented text
entirely.** *Rule: the spec.* **Gave up:** clean id-parity with `lib/cases/orders.ts` —
twelve of the 27 have no register id, though `schedule-of-hearing-date`,
`withdrawal-accept`, `settlement-accept`, `case-transfer-accept` and the two LP moves do
exist there, so D12's reason for matching ids mostly holds. Where the register has an
accept/reject *pair* and the spec has one type plus an outcome, the register bends; that is
a note for whoever wires issuance.

**D28 · The order type is "Order under section 202 CrPC". Our rename is reverted.**
*(2026-09-13 — **settled, not provisional**; withdraws D24's logged deviation)*

`order-items.ts` renamed the reference's "Section 202 CrPC" to "Postponement of issue of
process". **The spec is the source of truth for order types and it names this one "Order
under section 202 CrPC", In dropdown: Yes, no template.** We take that label.

**Footnote, kept because a future reader should see why we once renamed it.** The Code of
Criminal Procedure was replaced by the BNSS on 1 July 2024 (`docs/product/sources.md`), and
DRISTI is point-in-time law (`product-foundation.md §3`), so a control naming §202 CrPC is
literally wrong for every cause of action after that date — which is exactly the reasoning
`lib/cases/orders.ts` records for the register's own label. **That observation is real and
it is not a blocker.** The spec is the court's own vocabulary, the court's vocabulary
governs a control a court clerk uses, and a section number in a label is a thing a court can
change when it chooses to.

**The one real consequence, named rather than hidden:** the employee side now says "Order
under section 202 CrPC" while `lib/cases/orders.ts` says "Postponement of issue of process"
for the same type. That is exactly the divergence **D12** exists to stop. **Recommendation,
not a question:** the spec is now the source of truth for order types app-wide, so the
register should follow it. That is the register's owner's change, not this brief's.

**Gave up:** a label that is correct for the whole caseload. Taken knowingly.

**D29 · Nothing is hidden. "No" types have no browse entry; conditional types are shown and
disabled with the reason.** *(2026-09-13)*

**(a) The six "In dropdown: No" types are not hidden — they have no browse entry because
they do not exist outside their context.** #8 locks `[Application Number]` and
`[Application Type]`; there is no accepting an application you have not named. The spec
says it plainly: *"they appear only in context."* They are reached from the object they act
on (D36). **Control placement, not concealment.**

**(b) The ten conditional types stay in the list, disabled in place, with the reason.**
Every condition is a case-state condition. On a screen where the wrong omission is a missed
order, silently removing an option means a typist searches "warrant", finds nothing, and
**cannot tell whether the word is wrong or the case is.** So: `aria-disabled`, a second line
in `text-muted-foreground` (*"Available when the case is in the Long Pending register"*),
**not** a tooltip (ACCESSIBILITY: not hover-only; and the app's `aria-disabled` idiom
already means *not available here*). Unavailable types sort last in their group and never
win a type-ahead match over an available one — but searching one **finds** it with its
reason rather than returning "No item found", which is the whole point.

**(c) Where each condition comes from — all four are derivable; one needs threading.**
*Cognizance is due* → `hearing.stage === "cognizance"`. *Hearing not ongoing* →
`hearing-session.ts` (and D34 is where that one lands). **ST / LP** → the spec defines the
semantics (#25 marks a case LP, #26 renumbers it ST — two states of one attribute) and
**the app already holds the flag: `CaseRecord.longPending: boolean` in `lib/cases/types.ts`,
with `statusOf()` deriving `"long-pending"` from it.** What is missing is that
`CourtHearing` does not carry it across. **That is a build requirement, not a product
question:** thread the case's `longPending` onto the listing. Until it is threaded,
ST/LP-gated types **fail open** — a risk (§11), and the reason it is written down is that
every demo case number is `ST/…`, so nothing looks wrong in the demo.

*Judgment, on consequence sizing.* **Gave up:** a shorter list — ~10 unselectable rows in a
21-row browse list is real noise, taken over a silent omission on a §138 clock.

**D30 · Today's purpose is on the screen, and it suggests — never filters.**
*(problems 20, 21; restores half of D8)*

**The free part first.** The header carries `{case number} · {today's purpose}` above the
cause title. `CourtHearing.purpose` is already on the record. Without it the composer shows
the orders without the fact that scopes them, and the spec's mapping has nothing to key off.
**A prerequisite, not a nicety.**

**The shortcut.** Above the chooser, a row of `Button variant="outline"` chips — this
purpose's likely types, **minus the seven always-available generics** (scheduling, cost,
mandatory submissions, withdrawal, case transfer, moving to/from LP, abate), because those
apply to every purpose and would mark the norm (pass 5). Typically **two chips**; **absent
entirely when the purpose maps to none** (#18/#20 Review application). Caption above:
*"Usually passed at an evidence-of-complainant hearing."*

**It suggests; it never filters.** The `Combobox` below always carries all 21 browsable
types. A typist reaching an unpredicted order does exactly what they do today. Say it in
one line in the build so nobody implements the shortcut as a filter.

**The keying trap, named.** The spec's mapping is keyed on the **current** purpose; our
`Select` sets the **next** one. So the field's label becomes **"Purpose of next hearing"** —
D18's one-phrase-two-meanings rule, third application.

**And the vocabulary grows.** Ours has 11; the spec has **19 distinct** (20 rows; the source
notes #18 and #20 are the same purpose). All 11 map; **8 are missing** — Delay condonation
and admission, Evidence of the accused, Warrant, Execution, Review application, To issue
order, ADR, Mediation. The constant's own *"a filter that returns nothing"* reasoning is
true of the cause list and **false of the composer's next-purpose Select**, where every
purpose is legitimately choosable. So the vocabulary splits: the filter keeps the board's
set, the composer offers all 19. Flagged because it touches a shared constant.

**D31 · Locked variables are fields, they live in the order's own row, and slots are
positional.** *(problems 18, 19 — the core of the ask; extends D4 and D24)*

**Where the fields live.** *Rejected — inline slots in the document:* the spec says locked
variables *"cannot be removed from the template"*, and a slot inside a `contenteditable` is
precisely a removable one; it also fails on long values and in Malayalam, and embedding
controls in `RichTextField` forks the app's one editor (D22). *Rejected — a sheet per type:*
modals on a 23-matter board (D18).

**Taken — a `FieldSet` inside that order's roster row, in the left column.** The roster
already carries a number and a name; it expands to carry its fields. **The minimum addition
that answers the ask** — no new region, no fifth panel, no splitting one order's facts
across two places — and it holds D24's division: **left is what the court decided, right is
how the order reads.** Fill a field on the left and the paragraph on the right rewrites.
That is the spec's resolution order (auto-fill → judge-input → generate) as a two-pane.

| Variable class | Control | DS |
|---|---|---|
| Party reference | `Select` of this listing's people, **only when more than one candidate**; with one, it fills automatically and **no control renders** | `Field` + `FieldLabel` + `Select` |
| Discretionary date | `DatePicker` in a labelled `role="group"` | `DatePicker` |
| Amount | `InputGroupAddon` "₹" + `InputGroupInput`, `inputMode="decimal"` | `InputGroup` |
| Master data — document type, hearing purpose, mode of ADR, notice type, plea, application type | `Select`, *"drawn from master data, not free text"* | `Select` |
| Free value — `[Document Name]` | `Input` | `Input` |
| Context, machine-read — application number and type | `Input readOnly prefilled` | `Input prefilled` |

**The `prefilled` amber is for machine-read context, and only that.** *Law: "Prefilled is
amber fill only."* The 13 general variables are **not fields** and take no treatment — they
resolve into the text, and amber on every auto-filled value would paint the norm on every
order (pass 5). Amber on the two values the application supplies marks a real exception:
*you did not type this, the file did.*

**Slots are positional and role-named, not keyed by bracket text.** *(problem 19.)* #12 has
**"Party summoned"** and **"Party to take steps"**; #21 has **"Paying party"** and
**"Receiving party"**. `[Party Type]` is the placeholder in the template, not the identity
of the field — and a map keyed on bracket text **reverses who pays in a Cost order.** Two
slots of the same class in one template are two attributes (§5a), and the labels must never
read "Party type" twice.

**Build requirement, from the spec, not a question.** *"There can be multiple accused (e.g.
the drawer and the company director)"*; `[Party Type]` is *"Complainant, Accused, or
Witness"*; `[Party Name]` is *"any person in the case — complainant, accused, witness, or
PoA holder."* **`parties: { complainant: string; accused: string }` in `hearings.ts` is
insufficient** and must become a list of parties with types, including witnesses and PoA
holders. Until it does, a selector offers one option where a real case offers several, and
#8 Evidence of the complainant — which summons witnesses — cannot name one. §11.

**Optional variables are not a control here.** The spec: they are added or removed **by a
system administrator**, and *"the judge cannot change the template itself."* Whatever the
deployed template carries, the composer fills. **A cut product handed us** (§6).

*Rule: the spec's "What the judge must specify" and "Locked vs optional"; Laws; ACCESSIBILITY.*
**Gave up:** one surface per order. There are now two places one order is composed — its
fields and its words — and the relationship must be visible rather than explained, which is
why the words rewrite live.

**D32 · A hole stays a hole.** *(the other half of D31)*

An unfilled locked variable prints as its own name — **`[Amount]`** — in the document's
muted pending voice, and the same on paper. Not `₹____`, not a plausible default, not
silently dropped. It is a gap in a court order and it must look like one; this extends the
convention the document already has.

**Nothing is blocked.** D18's *"advancing with an incomplete order is permitted"* stands: a
trap on item 4 of 23 is worse than an incomplete record.

**One summary, one in-place marker, no third.** A muted footer count (*"2 details still to
fill."*) mirrored in the live region, and the hole itself. **No `aria-invalid` on arrival,
no red fields, no "(incomplete)" roster suffix** — that would be a third treatment of one
fact (pass 5), and painting a freshly-opened order red is the fatigue ui-craft §1.4 names.
`FieldError` is held for a build that submits. **Resolves the `₹____` risk.**

**D33 · One composing act, two artefacts: the structured business line, and the full order
text it seeds.** *(problem 22 — **reversed the same day it was written; see §14**)*

**What this decision said first, and why it was wrong.** It concluded the composer produces
the BOTD line *and only that*, and renamed the right column "Business of the day". **That
reads the spec's BOTD note without its second half.** The spec says the magistrate defines
the longer order text *"**when composing the full order**"* — during this act, not on
another surface — and resolution step 6 is *"the system generates the **complete order
text**"*, step 7 *"the judge reviews, optionally edits, and signs."* Plus: *"edit it freely
— add sentences, remove paragraphs, correct wording"* and *"add additional comments in a
free-text area."* The reference corroborates it: its document body is #17 then #12,
verbatim, with a live cursor in it. **The template seeds the order; it does not replace it.**

**The corrected model — one template, one act, two artefacts:**

1. **The business line.** Short, structured, variable-driven. Generated from the template
   plus the resolved slots (D31). **What `OrderRecord.botd` holds, what the cause list and
   business record carry, what the workflows read.**
2. **The full order text.** The document on the page — **seeded** by the same generated
   line, then freely edited and extended. Plus an **additional-comments** free-text area
   for *"anything the template does not cover."*

**The relationship is one-directional, and that is the load-bearing design call.** Fields →
business line → seeds the body → free edits. **Edits to the body do not feed back.** The
reason is in the spec itself: locked variables exist so the workflow can read them and
*"cannot be removed"* — if the business line were derived from freely-edited prose, a locked
variable could be edited away and the workflow would break. So the business line is
**generated and not directly editable**; the body is **the composing surface**.

**So the right column is the order document, as D17 and D26 have it** — cause heading →
attendance roll → numbered paragraphs, each a `RichTextField` seeded from its template →
**Additional comments** → the closing next-listing sentence. The heading is **"Order"**.

**Where the business line is visible, and where it is not.** It is **not** a second editor
on the composing surface: a derived record does not get an editor, and on arrival it is
identical to the body's first sentence, so an inline copy would read as problem 11's mirror
returning. It appears **in Preview, as its own labelled block above the order** — which is
exactly where you check what the record will say, and which gives Preview a second real job
alongside D21's. One standing muted line under the column heading carries the relationship:
*"The business line for the cause list comes from the fields, not from this text."*
*Rejected: a truncated business line in each roster row* — it is what those fields produce
and it would sit with them, but it duplicates the body's opening sentence on arrival and
costs a line on every order for a fact one sentence explains.

**Additional comments** is a `Textarea`, not a second `RichTextField` — the spec calls it a
*"free-text area"*, comments are not the order's operative text, and a second editor
instance per order is markup the facsimile then has to reconcile. Optional; absent from the
document and the paper when empty (§10).

*Rule: the spec's BOTD note, "What the judge can customise", and resolution steps 6–7;
`OrderRecord.botd` (pass 7).* **Gave up:** the tidiness of one artefact per screen, and the
guarantee that the cause-list line and the order's opening sentence always agree — they
diverge the moment the body is edited, which is what the spec describes and what the
business line being frozen is *for*.

**D34 · The next-hearing region is order type #6's field set, and the two read-only mirrors
go.** *(problems 22, 23; reconciles D3 and D4 with the spec)*

The spec makes **#6 Scheduling of hearing date** an order type — *"Next hearing is scheduled
on [Hearing Date] for [Hearing Purpose]"* — with those two locked. D4 said *"scheduling
types are not in this catalogue"*; **product has contradicted that**, so the decision changes
rather than rotting.

**The region stays; it stops being a separate thing.** Posting the matter on happens on
nearly every listing — making a typist find it in a 21-item catalogue 23 times a day is
throughput spent on symmetry. The region's two controls **are** #6's two locked variables,
so it already is that order's field set, and it emits #6 into the order like any other type.

**The gate is not a bug — it is the spec agreeing with our layout, and it must be said so
the next reader does not read it as one.** #6 is **"Yes (when hearing not ongoing)"**, and
this composer is *only* reachable from inside a sitting. So during a sitting **#6 is
correctly absent from the dropdown** while the next-hearing region still sets the date. That
unifies D29(a) and D34 into one rule: **a type whose context is present is reached from its
context, not from the list.** #8/#9's context is the application; **#6's context is the
sitting itself.**

**And the two read-only mirrors go.** The Order text column's Attendance and Next hearing
`Textarea`s restate controls beside them for zero added information — problem 11 in
miniature, in the region that now holds rewriting template text, an additional-comments area
and the numbered paragraphs. Attendance renders as D5's roll; the next listing as the
order's closing paragraph.

**Gave up:** strict one-instrument-per-type symmetry — #6 is the one type whose fields do
not live in a roster row. Named so it reads as a decision, not an inconsistency.

**D35 · Section workflows are buttons alongside the order-type dropdown — and the rooms
behind them are a different brief.** *(2026-09-13)*

The spec's placement instruction is explicit: *"surfaced as **buttons alongside the order
type dropdown**, not as entries in it."* Built to that: **beside the chooser, in the same
region**, on the same row where width allows and wrapping beneath it below `sm`. **No
separate headed block** — a headed block below is not "alongside", and the instruction is
the spec's, not a preference.

The reason beyond compliance: **adding one does not add a paragraph to the order.** It
produces a case-file record. Inside the `Combobox` it would either appear to add and not, or
claim a record was taken. Both are lies.

**Shown for the section workflows this listing's purpose maps to; absent when none do**,
which is most listings. **The asymmetry with D29 is deliberate:** order types fail *open*
because a hidden one costs a missed order; section workflows fail *closed* because a
proceeding is not omitted by being off this screen — it is recorded at the hearing listed
for it, and one taken at the wrong stage is a procedural error, not a near miss.

**Scope, honestly.** Four record-taking screens are **a separate feature** —
`docs/design/proposals/section-workflows.md` — and the spec gives their statutory basis and
a one-line "Records" summary but no field lists, which is that brief's first job. **This
brief specifies the door and the return only.** In this build the buttons carry the app's
`aria-disabled` not-in-this-build idiom (D18's reserved use). When built, each opens a **full
page** (D7) and returns here; its record is **referenced** by a line, never reproduced.

**D36 · Applications stay, answering one draws the order it produces, and it is Allow /
Dismiss.** *(**reverses this brief's own position**, and corrects §12's claim that nothing
was built)*

**The correction.** §12 said since 2026-09-06 that *"nothing is built for it."* False:
`listing-applications.ts`, `PendingApplications`, `ListingApplicationDialog` and
`assembleApplications` all ship, as §7 and §11 describe. The brief disagreed with itself in
three places.

**The reversal.** My position was that the *fact* belongs here and the *disposal* does not —
that disposing is *"a separate judicial act with its own record"*. **The spec shows the
first half was wrong as a domain claim.** Disposing **is the passing of an order**, of a type
in the same catalogue (#8/#9, #3/#4, #16), at the same sitting. Not a separate act — **the
same act reached from a different door**, which is exactly why those types are "In dropdown:
No" (D29). The owner showing the reference twice was preference; this is evidence.

**So the strip gets more correct.** Answering must **add the corresponding order to the
list**, numbered in the same `<ol>`, with application number and type as `prefilled` context
(D31). Today `assembleApplications` writes its own sentence in its own block — a paragraph
that is neither an order type nor numbered, a **fourth shape for the artefact** on a screen
already caught having two (problem 14). That block collapses into the order.

**Held from the old position: the red `destructive` Reject goes.** *"Reject"* is the queue's
word — `listing-applications.ts` already documents that an order says *allowed* or
*dismissed* — and two words for one act on one screen is the collision D18 and D30 both
refuse. And `destructive` is the fill for destroying a record; a dismissed application is a
**decision, not a deletion**. **Allow** and **Dismiss**, both `outline`, equal weight: a
bench choosing between two lawful outcomes is not choosing between safe and dangerous.
*Third logged deviation from the reference.*

**Build note from the spec, not a question.** *"Advocate replacement — currently a task, not
an application — has no application number"*, and change of power of attorney has *"no such
order"*. So neither reaches #8/#9: an application-order path needs an application, and a
task is not one. Do not mint a placeholder number.

**And my own header-line proposal is cut** — with a strip at the head of the rail it would
be a second treatment of one fact (pass 7).

**D37 · The screen records decisions already taken. It never suggests one.** *(2026-09-13 —
**grounded in the spec, not seat-conditional**)*

The spec settles what matters here without settling who logs in: **amounts are the judge's
decision, discretionary dates are *"set by the judge's discretion"*, and step 7 is the judge
reviewing and signing.** So every new field in D31 holds a decision the court has already
made, and the screen's job is to record it exactly.

**Concretely forbidden:** no default or suggested amount, no pre-computed deadline, no
pre-selected party where a choice exists. **This is D17's argument against pre-marking
attendance Present, applied to money and time** — a default writes into a court order
something nobody said, and it is worse when the thing written is a figure.
`order-demo.ts` keeps its three-weeks-on seed because that is a **completed** listing's
opening draft (D23), a different claim; a live order's date field opens empty.

**And signing stays downstream** in the existing Sign orders queue, notwithstanding step 7 —
D10 is unchanged, and this build performs no judicial act.

**Who operates the screen is not asked here.** The spec says "the judge"/"the magistrate"
and never mentions a typist, so it does not resolve the seat — and this decision does not
need it to. Who-logs-in lives in `docs/product/open-questions.md`.

**D38 · "Order type", not "item".** *(problem 21)*

`CourtHearing.item` is the board serial the bench calls; `OrderItemDraft` is a paragraph of
an order; both are called "item" forty pixels apart, and D18 refused this collision in the
other direction. The spec, `lib/cases/orders.ts` and the court all say **order type**.
Region, field, roster and the employee module's `ORDER_ITEM_TYPES` / `OrderDraft.items`
rename accordingly; **"item" is reserved for the board serial**, which is what makes D18's
"Next item" correct rather than merely defensible. **Gave up:** a rename across four modules
and their tests, for a word — worth it, because "item 2" must not be ambiguous in a document
that goes to a court.

**D39 · Additional comments are part of the order, and they are optional.** *(D33's second
half, given its own row because it is a region and not a property)*

The spec gives the composer *"a free-text area for anything the template does not cover."*
It sits as the **last block of the order body, after the numbered paragraphs and before the
closing next-listing sentence** — comments are part of the order's substance, so they belong
with the paragraphs, not below the signature. `Textarea`, labelled **Additional comments**,
no placeholder-only labelling (Laws' accessibility floor).

**Optional means invisible when empty**, in the document and on the paper — not an empty
labelled block on twenty-three orders that do not need one (pass 5). In the composer the
field is always present, because a field that appears only after you want it is a field you
cannot find. **Gave up:** symmetry between the composer and the paper; named, because a
region that is always in one and sometimes in the other is the kind of thing a reviewer
flags as a bug.

---

**~~D44 · The application row identifies; the overlay decides.~~ Built and reverted the
same day (2026-09-13) — the tinted row with View / Reject / Accept stands.** The argument
below is kept because the *diagnosis* still holds and will be raised again by the next
person to look at that panel; what it proposed did not survive seeing it. *(owner on the
built version: "looks bad, revert")* **Two faults, not
one.** The cream fill said *pending* — but every row in that section is pending and the
section's own summary already says "2 pending", so the tint marked the norm rather than an
exception and was the loudest object on the panel. And View / Reject / Accept duplicated a
decision that already has a better home: `ListingApplicationDialog` carries the filer, the
date it reached the court and the reason in the filer's words, with Allow and Dismiss under
them. Deciding from the list is deciding without reading what is being decided — and
disposing of an application draws an order (D36).

So the row is plain, hairline-separated, and spends its space on what lets a typist triage
*without* opening it — type, its own `CMP/…` serial, which side filed it, when it arrived —
behind one outline **Review**. The panel goes from five saturated marks to none, and the
view is left with a single primary action.

**Gave up, and it is what killed it:** one-press disposal of a routine adjournment, which
the owner's reference screen offers. Judged worth it for an act that produces an order and
a record; the owner, seeing it, judged otherwise. **D36 stands unamended** — Allow /
Dismiss stay on the row.

**What is worth keeping from the attempt, for whoever raises this next.** The two faults
are still real: the cream fill marks the norm rather than an exception on a panel whose
own summary already says "2 pending", and the row carries three action treatments. The
mistake was fixing both at once with a change that also cost a press. A narrower move —
dropping the tint alone, or demoting Reject from a filled destructive to a quiet control,
leaving both decisions and the press count untouched — was never put in front of the
owner, and is the thing to try before proposing this again.

## 5a. Attributes (value → source → type → slot)

Pass 9's census, and the record that makes the template system auditable: a row with no
source is an invented attribute; a fact typed `product copy` is a sentence doing a field's
job.

**(a) General variables — auto-filled, never a control.** Source: the spec's General
variables table. **Slot: none** — they resolve into generated text and take **no**
`prefilled` treatment (D31).

| Value | Source | Type |
|---|---|---|
| `[Court Name]` · `[Case Name]` · `[Case Number]` · `[Current Date]` | court/case data · system | data |
| `[Judge Name]` · `[Judge Designation]` | court data | data — **absent today**; Preview says "Pending the signature of the magistrate" |
| `[Complainant Name]` · `[Accused Name]` | `hearing.parties` | data |
| `[Party Type]` | case data | closed enum — complainant · accused · witness. **A slot class, not one attribute** (D31) |
| `[Party Name]` | *"any person in the case — complainant, accused, witness, or PoA holder"* | data — **our model holds two strings; build requirement in D31** |
| `[Document Type]` · `[Hearing Purpose]` | master data | closed enum — **values not enumerated in the spec (§12)** |
| `[Current Hearing Date]` | case data | data — absent today |

**(b) Judge-input slots — the fields D31 creates.**

| Slot (role-named) | Appears in | Type | Control |
|---|---|---|---|
| Party summoned · Party to take steps | #12, #13, #15 | closed enum + data | `Select` — **only when >1 candidate** |
| Paying party · Receiving party | #21, #22 | closed enum + data | `Select` — same rule |
| Party directed | #2, #3, #23, #24 | closed enum + data | `Select` — same rule |
| Amount | #21, #22 | data (currency, ₹) | `InputGroup` + ₹ addon |
| Submission deadline · Response deadline · New submission date · ADR end date · Cost deadline | #2, #3, #5, #21, #22 | data (date) | `DatePicker` |
| Hearing date · Hearing purpose (next) | #6 | data (date) · closed enum | **the next-listing region** (D34) |
| Document type · Document name | #2, #3, #4 | closed enum · user free text | `Select` · `Input` |
| Notice type · Mode of ADR · Plea | #15 · #5 (opt) · #20 (opt) | closed enum | `Select` |
| Application number · Application type | #3, #4, #8, #9, #16 | data · closed enum | `Input readOnly prefilled` (D31, D36) |

**(c) Screen facts outside the templates.**

| Value | Source | Type | Slot |
|---|---|---|---|
| Attendance mark, per appearance | `OrderDraft.marks` | closed enum — present · absent · unmarked | `SegmentedControl` (D1) → roll (D5) |
| Appearance name + office | `appearancesFor(hearing)` | data | roll row |
| Pending application: number, head, filer, filed-on, reason | `listing-applications.ts` | data · closed enum | amber strip + dialog |
| Application decision | screen state | closed enum — allowed · dismissed | two `outline` buttons (D36) |
| Order type, per order | the spec's 27 | closed enum | `Combobox` + roster (D24, D27) |
| "In dropdown" availability | spec column + `hearing.stage` + session + **`longPending` (not yet threaded)** | closed enum — yes · conditional · no | disabled `ComboboxItem` + reason (D29) |
| Order paragraph number | list position | data | `<ol list-decimal>` (D19) |
| **Business line, per order** | **generated: template + resolved slots. Not editable** | **product copy + data** | **Preview, as a labelled block (D33)** |
| **Full order paragraph, per order** | **seeded from the business line, then edited** | **user free text** | **`RichTextField` (D22, D33)** |
| **Additional comments** | composer | user free text | `Textarea` (D39) |
| Next-listing choice | screen state | closed enum — list · none | `SegmentedControl` (D3) |
| Board item number, next unhandled item | `CAUSE_LIST` + session | data | footer caption (D18) |
| Unfilled-slot count | derived | data | footer caption (D32) |
| Honesty and empty-state copy, disabled reasons | this brief | **product copy** | support lines — *guidance, deliberately not in (a) or (b)* |

**Three rows are the finding.** *Business line* and *full order paragraph* start identical
and diverge — one generated and frozen, one free — which is the whole of D33, and why they
are two rows and not one. And *"In dropdown" availability* has a source that exists in the
app but not on this screen's model, which is why D29 fails open and D29(c) is a build
requirement.

---

**D40 · The catalogue is built, and it is the court's.** *(problem 15; D27 executed)*
`lib/employee/order-templates.ts` carries all twenty-seven types from
`docs/product/order-templates.md` — BOTD text, locked and optional variables, the
"In dropdown" gate, and the workflow each one sets in motion. `order-items.ts` is now a
thin layer over it and no longer holds a sentence this app wrote. **Nothing is
auto-filled on arrival, and that is the source's design, not a shortfall:** none of the
twenty-seven references a general variable, so an order opens on the court's line with
its own slots standing — `[Party Name]`, `[Amount]`, `[Date]`. The old build wrote
"Issue summons to Anand Traders" and read as finished while nobody had chosen a party.
A test asserts every declared variable still appears in its own template text, because a
locked variable dropped in transcription is a broken workflow behind an order that reads
perfectly. *Gave up:* `miscellaneous-process`, which had no template, no variables and no
workflow and could not survive a template system. *Kept:* `Others`, marked in the code as
**not** one of the court's twenty-seven — a day the catalogue cannot describe still has to
be recorded, and how often it is reached for is a reading on the catalogue.

**D41 · Three ways into the catalogue, in the order a typist reaches for them.**
*(the reference's Workflows & Templates region)* **Likely at this hearing** — the source's
hearing-purpose table, so an evidence listing offers Witness batta and Issue of summons
first, each captioned with the workflow it triggers, which is what the reference's tiles
were showing. Then **the whole catalogue**: a search field over four standing groups —
the reference's own browse, adopted on the owner's instruction 2026-09-13, replacing a
`Combobox`. *The trade is deliberate:* a combobox is faster for a typist who knows the
word and shows **nothing** to one who does not, because its list exists only while the
menu is open. Four rows say how much catalogue there is before anyone types; a search
opens whatever it finds and leaves the rest shut. Then **what this matter cannot take,
with the reason**, now inside the group it belongs to rather than in a list of its own —
"Only before cognizance", "Set the next date under Next hearing". *Rejected:* hiding the
gated types. On a screen where the missing
order is the one that mattered, a silently shorter list teaches a typist to distrust the
catalogue. Twenty-one of the twenty-seven are browsable here; six are application-only
and are never listed, because they are reached from the application that produces them.

**D42 · The panel is four collapsible sections, and the closed ones carry the state.**
*(owner, 2026-09-13, after an icon rail failed)* Applications, Attendance, Next hearing,
Orders — one open at a time, each closed row stating its own answer: "2 pending", "Not
marked", "Not set", "None yet". **That is what the rail could not do.** An icon rail shows
four marks and not one fact, so the panel had nothing in it, and the way on ended up at
the foot of a column as tall as the page where nobody could see it. The summaries are
facts, never ticks: "Not marked" is true about a sitting, where a green check would claim
the typist agreed to something they never touched. **Not D16's mechanism**, which was
reversed — that folded the roll *for you* once every appearance was marked and bought
nothing on arrival, because the screen opens unmarked. This moves only when you move it.
`Collapsible`, not `Accordion`, for D16's own reason: the DS `Accordion` renders a fixed
`h3` and would skip a level under the page's `h1`. **All four may be closed at once, and
that is a useful state, not an empty one** — every row carries its own answer, so a fully
collapsed panel is the whole sitting at a glance. *(Reversed the same day: the first build
refused the last close, reasoning that it would show nothing. That was true of the icon
rail it replaced and stopped being true the moment the rows carried summaries — the
refusal was carried over from the wrong instrument. Owner reported it: "I kind of want it
in a way that allows me to collapse everyone.")*

**D43 · One panel, two columns, and the page lies on a well inside it.** *(owner,
2026-09-13)* The controls and the order they write are one piece of work, so they take one
container and no gutter. The document sits on `bg-surface-sunken` **inside** that panel and
carries no lift of its own — a raised sheet inside a raised panel flattens both. The
`paper` family is the sanctioned treatment here and not a deviation: `foundations/colors`
names it "the court-document preview", and the composer's page is exactly that. It fills
the column's height with page margins, and the signature sits at the foot of the sheet.

## 6. What I cut (and why)

- **The dual present/absent grids** — problem 1; D1; declined again in D26.
- **Generic role checkboxes** — D2. **"Skip scheduling" as a checkbox** — D3, D26.
- **The read-only Order mirror** — D17. **And the two the 2026-09-07 rebuild restored** — D34.
- **The attendance fold** — D16, reversed. It fired after the work it made room for.
- **Save draft** — D20. *(Shipped anyway — §11.)*
- **A confirmation dialog on Next item** — D18. Twenty-three modals in a sitting.
- **Pre-marking every appearance Present** — D17.
- **PDF generation, issue, sign, and any disabled "Submit for signature"** — D10.
- **`bg-paper` in the composer** — D21. **A wizard** — a sitting is throughput work.
- **Hover-only remove; a third "Not marked" segment; a tinted canvas; a standing `Alert`;
  always-green orders icon; tabs or an accordion over the sections; a capped-height roll;
  dense two-up attendance rows** — each buys something and breaks something else.
- **`miscellaneous-process`** — *(D27.)* No template, no variables, no workflow.
- **Our seventeen invented standing sentences** — *(D27.)* Thirteen replaced by the court's
  BOTD text; four cut outright. **The largest cut by consequence** — it retires the standing
  risk that a typist could set down boilerplate no court approved.
- **Our rename of "Order under section 202 CrPC"** — *(D28.)* Reverted to the spec's label;
  the BNSS-repeal reasoning survives as a footnote, not as an open question.
- **An "add a variable" control** — *(D31.)* Optional variables are administrator
  configuration. Product handed us this cut; taking it is the restraint.
- **Inline editable slots in the document** — *(D31.)* A locked variable inside a
  `contenteditable` is a removable one.
- **A sheet per order type's fields** — *(D31.)* Modals on a 23-matter board.
- **A block on Preview or the advance when a slot is unfilled** — *(D32.)* The hole prints
  instead. **`aria-invalid` on arrival and an "(incomplete)" roster suffix** — third and
  fourth treatments of one fact.
- **A second editor for the business line** — *(D33.)* It is generated from the fields and
  frozen so a workflow can read it; a derived record does not get an editor.
- **An inline copy of the business line in each roster row** — *(D33.)* On arrival it
  duplicates the body's opening sentence, which is problem 11 returning in miniature. It
  lives in Preview and one standing sentence explains the relationship.
- **A second `RichTextField` for additional comments** — *(D39.)* The spec calls it a
  free-text area; comments are not operative text.
- **An always-visible Additional comments block on the paper** — *(D39.)* Absent when empty.
- **The reference's tile descriptions** — *(D26, D30.)* Workflow claims, from a Workflow
  column clipped on every page of the source.
- **Filtering the catalogue by hearing purpose** — *(D30.)* The mapping suggests; a filter
  would make an unpredicted order unreachable.
- **Hiding conditionally-unavailable order types** — *(D29.)* A silent omission is a missed
  order; ten disabled rows is the cheaper failure.
- **A "show all proceedings" escape on the section workflows** — *(D35.)* Unlike an order
  type, a proceeding at the wrong stage is a procedural error, not a near miss.
- **Accept / Reject, and the red `destructive` fill** — *(D36.)* Kept the strip, took the
  order's own words (**Allow / Dismiss**) at equal weight.
- **My own proposal to put pending applications in the identification header** — *(D36.)*
  Recorded rather than deleted: it was argued in this brief for a week.
- **Default or suggested values in discretionary fields** — *(D37.)*

---

## 7. Layout & hierarchy

**Shipped today (2026-09-13), verified in `order-screen.tsx`.** `lg:grid-cols-2` on a
`bg-muted` canvas between a sticky white header and a sticky white footer.

```
header (sticky top-14)   Order : Priya Menon v. Sabari Textiles       [Next hearing]

┌ lg:col-span-1 ───────────────┐  ┌ Order text  lg:col-span-1 ───────────────┐
│ Applications (only if any)   │  │ Attendance   [read-only Textarea]  ← cut  │
│   ▓ Pending - Bail - CMP/…   │  │                                          │
│     View  [Reject] [Accept]  │  │ Item text                                │
│ ───────── hairline ───────── │  │   1. Summons  ┌ RichTextField ────────┐  │
│ Mark who is present  ☐ ☐ ☐ ☐ │  │   2. Cost     │ …₹____ …             │  │
│ Mark who is absent   ☐ ☐ ☐ ☐ │  │               └──────────────────────┘  │
│ ───────── hairline ───────── │  │                                          │
│ Next hearing details         │  │ Next hearing [read-only Textarea]  ← cut  │
│   ☐ Skip scheduling…         │  └──────────────────────────────────────────┘
│   Purpose of hearing (Select)│
│   Next date    (DatePicker)  │     Problems 18, 20, 21, 23 are all readable
│ ───────── hairline ───────── │     off this: no fields anywhere, no purpose
│ Order items                  │     in the header, "item" used for a paragraph,
│   Choose item (Combobox)     │     two mirrors, two teals, a Save that
│   ┌ 1. Summons     Remove ┐  │     saves nothing.
│   └ 2. Cost        Remove ┘  │
└──────────────────────────────┘
sticky footer                    Save as draft (outline)  Preview PDF (teal)
```

**What D26–D39 make of it.** Same two columns, same panels, same footer. Regions change;
one is added (Additional comments, D39) and two are removed (the mirrors, D34).

```
header   Order · ST/241/2026 · Evidence of complainant          ← D30 restores the purpose
         Sunil Varghese v. Anand Traders
         Draft — nothing on this screen is issued.                        [Next item] D18

┌ The listing  lg:col-span-2 ──────┐  ┌ Order  lg:col-span-3 ────────────────────────┐
│ Applications                     │  │ "The business line for the cause list comes   │
│  ▓ Bail · CMP/312/2026    View   │  │  from the fields, not from this text."   D33  │
│    [Allow] [Dismiss]        D36  │  │                                              │
│ ──────────── hairline ────────── │  │ Sunil Varghese v. Anand Traders               │
│ Attendance                       │  │ ST/241/2026 · item 1 · Evidence                │
│  Sunil Varghese                  │  │                                              │
│  Complainant    [Pres|Abs]   D1  │  │ Attendance — the roll, as it will read   D34  │
│  … one row per appearance        │  │                                              │
│ ──────────── hairline ────────── │  │ 1. Issue of summons ┌ RichTextField ──────┐  │
│ Next listing                     │  │   seeded from #12   │ Issue summons to    │  │
│  [List next | No next date]  D3  │  │                     │ Anand Traders … The │  │
│  Purpose of next hearing (Select)│  │                     │ complainant is …    │  │
│  Next date       (DatePicker)    │  │                     └─────────────────────┘  │
│  → emits order type #6      D34  │  │ 2. Cost             ┌ RichTextField ──────┐  │
│ ──────────── hairline ────────── │  │                     │ …to pay [Amount] …  │  │
│ Order types                 D38  │  │                     └──────────────── D32 ┘  │
│  Usually passed at an evidence-  │  │                                              │
│  of-complainant hearing:    D30  │  │ Additional comments  ┌ Textarea ─────────┐   │
│   [Witness batta] [Summons]      │  │                 D39  └───────────────────┘   │
│  Choose an order type (Combobox) │  │                                              │
│   [Add]  · Record a proceeding:  │  │ Posted to Monday, 5 October 2026 for     D34  │
│   [Evidence of the complainant]  │  │ evidence of complainant.                      │
│   [Examination of the witness]   │  └──────────────────────────────────────────────┘
│        D35 — alongside the chooser, the spec's own placement
│  ┌ 1. Issue of summons  Remove ┐  │
│  │   Party summoned   (Select) │  │ ← D31: only because this matter has 2 accused
│  │   Party to take steps (Sel) │  │
│  ├ 2. Cost              Remove ┤  │
│  │   Paying party     (Select) │  │
│  │   Amount     ₹ [        ]   │  │
│  │   Receiving party  (Select) │  │
│  │   Pay by       (DatePicker) │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
sticky footer
  "Held for this sitting — a reload loses it."      Preview (outline)  Next item (teal)
  "2 details still to fill."   D32                  "Ends this hearing and calls item 2."
```

*Superseded diagrams — D17's two-panel sketch and D14/D15/D16's three arrangements — are
kept by reference only. Their arguments are in §5 and §14; four obsolete ASCII layouts in a
living brief is how a reader builds the wrong one.*

**Desktop (`lg+`).** `lg:grid-cols-5`, `items-start`, `gap-8` — the listing `lg:col-span-2`
(~438px at 1512 with the rail open), the order `lg:col-span-3` (~657px). *The shipped screen
uses `lg:grid-cols-2`; D17's 2/3 split is the one to build, because the right column now
holds rewriting prose, a comments area and the closing.* Nothing sticky but the footer.

**Field layout inside a roster row.** Fields stack `flex-col gap-4`, **never side by side**:
at ~438px a pair gets ~195px each and a `SelectTrigger` that narrow truncates "Advocate for
the complainant" before translation starts. **Paying and receiving party must never share a
line** — two same-class selects side by side is how problem 19 gets reintroduced visually
after being fixed in the model.

**Above the fold.** Desktop on arrival: the applications strip (when any), the whole
attendance roll, and the chooser with its suggestion row and the section-workflow buttons
beside it. Fields appear below only after a type is added — the moment the typist is already
looking there. Phone: cause title + the first appearance row.

**Hierarchy.** One page title. Section headings `text-body font-semibold`. **One
`bg-primary` control on the view — Next item** (D18); suggestion chips, Add, Allow, Dismiss,
the section-workflow buttons and Preview are all `outline`. `SegmentedControl` selection by
weight + lift, never teal.

**Heading order.** Page `h1` → `h2` Applications · Attendance · Next listing · Order types
in the left panel; `h2` Order in the right, `h3` per numbered paragraph, `h3` Additional
comments. No level skipped. **Field labels inside a roster row are `FieldLabel`, not
headings** — the same rank as the controls beside them.

**Focus order.** Header → applications → attendance rows → next listing → suggestion chips →
chooser → Add → section-workflow buttons → **per order: its editor in the right column is
reached by tabbing out of its own row's last field**, so one order's fields and its words are
contiguous → Additional comments → Preview → Next item. That ordering is the one non-obvious
accessibility decision in D31 and it must be built, not inferred: a tab order running all of
column one then all of column two would make a typist traverse four orders' fields before
reaching the first order's text.

---

## 8. Components (DS name → region)

| Region | DS primitive |
|---|---|
| Page title / eyebrow / support | `h1` `text-title font-semibold` · `text-caption` · `text-body text-muted-foreground` |
| Both panels | `Card` + `border-hairline shadow-raised` (`p-6`, `rounded-xl`) — two, not three |
| Internal breaks | horizontal `Separator` `role="separator"`; no vertical rule (D11) |
| Attendance mark · Next listing choice | `SegmentedControl` + `SegmentedControlItem` (D1, D3) |
| Purpose of next hearing | `Field` + `FieldLabel` + `Select` — **all 19 purposes** (D30) |
| Next date | labelled `role="group"` + `DatePicker` (the primitive owns its trigger) |
| Order body | `text-body` prose; generated blocks `text-muted-foreground` until filled |
| Numbered paragraphs | `<ol className="list-decimal">` — `OrderFacsimile`'s shape (D19) |
| One order's words | `RichTextField` (D22), keyed on the order's id so removing one does not hand its markup to the next |
| **Additional comments** *(D39)* | `Field` + `FieldLabel` + `Textarea`, `min-h-24` |
| **Order-type catalogue** | `Combobox` / `ComboboxInput` / `ComboboxContent` / `ComboboxGroup` + `ComboboxLabel` / `ComboboxCollection` / `ComboboxItem` / `ComboboxEmpty` (D24) |
| **Unavailable order type** *(D29)* | `ComboboxItem` `aria-disabled` + a second line `text-caption text-muted-foreground` with the reason. **Not** a `Tooltip` |
| **Purpose suggestions** *(D30)* | `Button variant="outline"` chips in `flex flex-wrap gap-2` under a `text-caption` line. No new component |
| **Section-workflow buttons** *(D35)* | `Button variant="outline"` `aria-disabled`, **alongside the chooser**, wrapping below `sm` |
| **Order roster row** *(D24, D31)* | `li` on `bg-surface-sunken rounded-lg`, number `tabular-nums`, ghost Remove with an `sr-only` suffix naming the type |
| **Locked-variable fields** *(D31)* | `FieldSet` + `FieldLegend` (`sr-only`) wrapping `Field` + `FieldLabel` + one of: `Select` · `DatePicker` in a `role="group"` · `Input` · `InputGroup` + `InputGroupAddon`(₹) + `InputGroupInput` |
| **Context variable** *(D31, D36)* | `Input readOnly prefilled` — `bg-prefilled` + the primitive's `sr-only` hint |
| **Applications strip** *(D36)* | `bg-warning-muted` well (the row says "Pending" as well as wearing the fill — ACCESSIBILITY §3); ghost View + two `outline` Allow / Dismiss. **No `variant="destructive"`** |
| No order added yet | `Empty` **without `EmptyMedia`** — an illustration in the middle of a court record reads as a bug |
| **Preview** *(D21, D33)* | `Dialog` + `DocumentPreview` + an `OrderFacsimile`-shaped article on `bg-paper`, with **the business line as its own labelled block above the order** |
| Footer | sticky `bg-card border-t border-hairline`; captions `text-body-compact text-muted-foreground`; `Button` outline (Preview) + default (Next item) |
| Missing listing | `Empty` with Back to today's hearings |
| Live announcements | `aria-live="polite"` visually-hidden status |

**No new primitive, and nothing hand-written.** `InputGroup` and `Input prefilled` are
already in `components/ui`. **Removed:** `Collapsible` (D16 reversed), the two read-only
`Textarea` mirrors (D34), `Button variant="destructive"` (D36).

---

## 9. Spacing

Ladder only: `0.5 · 1 · 1.5 · 2 · 2.5 · 3 · 4 · 6 · 8 · 12 · 16`.

- Page `p-6 md:p-8`; `gap-8` between header and row, and between the two panels.
- Panels `p-6`, `rounded-xl`; `gap-8` between sections, either side of the `Separator`.
- Attendance rows `py-2` on `min-h-10` content so the `h-10` segment owns the touch target
  (RESPONSIVE §3's 40px floor). ~52px per row.
- Order panel: `gap-8` between blocks, `gap-2` inside a block, `gap-3` between roll
  sentences, `gap-4` between numbered paragraphs, `gap-8` before Additional comments.
- **Roster row:** `px-3 py-2` while it is one line; `p-4` with `gap-4` once it carries
  fields, so they are not jammed against the edge.
- **Suggestion chips and section-workflow buttons:** `gap-2` between controls, `gap-2` under
  the caption, `gap-4` to the chooser.
- **Applications strip:** `gap-2` between rows, `p-4` inside a row, `gap-2` between buttons.
- Related stacks (a field + its control; Purpose above Next date): `gap-4`.
- Footer `gap-3` between buttons; captions `sm:mr-auto`, stacked `gap-1`.
- Controls `h-10`, `rounded-lg`; `DatePicker`, `SelectTrigger` and `InputGroup` are `w-full`
  in the left column so a long translated label still fits.
- Micro steps only inside the segment pill (already in the primitive).

---

## 10. States (empty / loading / error / partial / long-label)

- **Unknown `hearingId`.** `Empty`: "This listing is not on the board" + Back.
- **Attendance unmarked.** Valid, and the arrival state; the document shows one muted line.
  **Partly marked:** only marked people appear; the block stays muted until all are.
- **No order added.** Roster: "No order type has been added yet. Choose one and its text is
  written for you." Right column: "This matter has no order yet." Paper: "No order has been
  added." No illustration.
- **An order added and then emptied.** It still prints as a pending paragraph — the typist
  said the court passed it (D24).
- **A locked variable unfilled.** *(D32.)* The document and the paper print the slot's own
  name — `[Amount]` — in the muted pending voice. Preview and Next item are **not** blocked.
  Footer: "2 details still to fill." No red fields.
- **A party slot with exactly one candidate.** *(D31.)* **No control renders.** The value
  resolves silently — the spec's rule, and the reason a summons on a single-accused matter
  shows one field and not three.
- **A party slot with several candidates.** A `Select` of this listing's people, labelled by
  role, **no default selected** (D37).
- **A matter with two accused, or a witness to summon.** *(D31.)* `parties` holds two
  strings, so the selector has one option where it should have several and #8's witness
  summons cannot name anyone. **The shape is built; the model is a stated build
  requirement** (§11). Do not fabricate a second accused to demo it.
- **An order type unavailable on this listing.** *(D29.)* Visible, `aria-disabled`, sorted
  last in its group, reason on a second line. Searching it **finds** it rather than
  returning "No item found".
- **An ST/LP-gated type before `longPending` is threaded.** *(D29.)* Offered. Every demo
  case number is `ST/…`, so nothing looks wrong in the demo — which is exactly why it is
  written down.
- **#6 Scheduling during a sitting.** *(D34.)* Correctly absent from the dropdown; the
  next-hearing region sets the date and emits the order. **Not a bug.**
- **No suggestions for this purpose.** *(D30.)* The row and its caption are **absent** — not
  an empty row, not "no suggestions". The `Combobox` is unchanged.
- **A purpose our vocabulary does not have.** *(D30.)* Until the 8 missing purposes ship, a
  listing carrying one falls back to no suggestion row. Fails quiet, not wrong.
- **`Others`.** Empty editor, **no fields** — no spec entry, so no template and no slots.
- **#1 (202 CrPC) and #18 (Judgement).** *(D27.)* The spec answers both: no template → *"the
  judge writes the order text from scratch"*, so **#1 opens on an empty editor**; *"or a
  dedicated screen handles it"*, so **#18 stays in the list and its selection is a stub**
  (D35's idiom). Neither silently adds a blank paragraph.
- **Additional comments empty.** *(D39.)* The field is present in the composer and the block
  is **absent** from the document and the paper.
- **A section workflow this purpose does not map to.** *(D35.)* Absent. When none map, no
  buttons appear beside the chooser.
- **An application answered.** The row leaves the strip; **an order of the matching type
  appears in the roster and the order** (D36) with its number and type `prefilled`. Focus
  returns to the Applications heading. Last one answered → the strip goes.
- **Renumbering after a removal.** Roster, editors, document and paper renumber immediately;
  the live region says how many paragraphs moved up.
- **Advancing with an incomplete order.** Permitted (D18, D32).
- **The last unhandled item.** The advance becomes **End item**.
- **Returning to an item already drafted.** The module holds the draft for the sitting
  (D20); a reload does not.
- **Long labels.** "Moving case out of long pending register", "Order under section 202
  CrPC" and the disabled reasons wrap (`whitespace-normal`); nothing truncates. Field labels
  — "Party to take steps", "Receiving party" — wrap above their controls, which is why
  fields stack (§7).
- **Long `[Document Name]`.** User free text, mid-sentence in #2/#3/#4. In a field it wraps;
  in the generated paragraph it reflows the line. **The strongest argument for D31's
  fields-not-inline-slots, and worth checking on the render with a 60-character value.**
- **Long language.** A state deploys over identical national law with local language on top
  (`national-vs-state.md`), so **the BOTD templates are per-state translatable strings with
  positional slots** — not English sentences with values concatenated in. A template whose
  slot order differs in Malayalam must still resolve: the second reason slots are positional
  (D31). Segment labels stay two short words (Present / Absent — product translates; do not
  abbreviate to "P" / "A").
- **Many appearances.** The left panel grows; under D17 that costs the right column nothing,
  and `items-start` means it does not stretch.
- **Many orders on one listing.** Roster and right column grow together; the page scrolls.
  Nothing is sticky (D17), so the settled read is Preview.
- **200% zoom.** 1512px at 200% is a 756px viewport, below `lg`, so both columns stack — no
  fixed min-width trap. Footer wraps.
- **Loading.** No backend; first paint is the composer with empty marks. No skeleton.
- **Dark.** Panels `bg-card`; wells `bg-surface-sunken`; `bg-prefilled` defined in both modes
  by the primitive; paper only in Preview and fixed in both modes by design.

---

## 11. Risks accepted

- **Session-only draft.** Reload loses the text. Honest for a demo with no backend, and
  load-bearing for D18.
- **Next item ends a listing irreversibly, with no confirm step.** *(D18.)* Chosen over a
  modal because twenty-three modals in a sitting is fatigue. **The most consequential thing
  in the revision and the first to revisit if the build ever issues.**
- **Renumbering breaks cross-references.** *(D19.)*
- **The order panel is both the artefact and the form.** *(D17.)* The controls-free read is
  one click away in Preview.
- **A long roll pushes Next listing down its own column.** The guard on a missed date is
  printed in the order rather than implied by position.
- **Preview is not a PDF.** No download, no faked letterhead or signature.
- **The business line and the order text diverge the moment the body is edited.**
  *(new, D33.)* That is what the spec describes and what freezing the line is *for* — the
  workflows must be able to read locked variables that free prose cannot delete. The cost is
  that the cause-list line can say less than the order does, and only Preview shows both.
  **Accepted; the one standing sentence under the column heading is what makes it legible.**
- **Job unconfirmed.** If product says this surface *is* the signing step, D9, D10, D18 and
  D21 change. D33 does not — the spec settles what the composing act produces.
- **No explicit save, and the shipped screen has one anyway.** *(D20; drift.)* "Save as
  draft" ships as a control whose `onClick` only fires an announcement. Flagged so the next
  build does not treat it as decided in its favour.
- **Two teal actions on the view, and a label D18 rejected.** *(drift.)* The header's advance
  and the footer's Preview PDF are both `bg-primary`; the advance says "Next hearing", which
  D18 rejected by name and D38 makes doubly wrong. One line either way; the owner's call.
- **The shipped screen carries problems 1 and 3.** *(problem 23.)* D1 and D3 stand unbuilt.
  Accepted as a *known* gap rather than silently carried.
- **ST/LP gating fails open until `longPending` is threaded onto `CourtHearing`.**
  *(new, D29.)* **A build requirement, not a product gap** — `CaseRecord.longPending` and
  `statusOf()` already exist. Every demo case is `ST/…`, so this is the kind of gap that
  survives a demo and fails in Kerala.
- **The party model cannot hold what the templates need.** *(new, D31.)* `parties` is two
  strings; the spec's party candidates are complainant, accused (possibly several),
  witnesses and PoA holders. **A build requirement**; until it lands, selectors under-offer
  and #8's witness summons cannot name anyone.
- **We take a label that is wrong for post-2024 causes of action.** *(new, D28.)* "Order
  under section 202 CrPC" is the spec's and the court's; the CrPC was repealed 1 July 2024.
  Taken knowingly, with the reasoning kept as a footnote. **Second-order risk:** the
  employee side and `lib/cases/orders.ts` now label the same type differently — the D12
  drift, named, with the register recommended to follow.
- **The Workflow column is `[clipped]`.** *(new.)* Eight types record a workflow we cannot
  read. This build performs none (D10), so nothing depends on it — but a locked-variable
  list is justified *by* its workflow, so a clipped cell could mean a field mis-specified.
  **No decision rests on one.**
- **Master-data option lists are not enumerated.** *(new, D31.)* Document type, notice type
  and mode of ADR are `Select`s whose options the spec gives by example only. **The one
  thing that blocks building D31 as specified** (§12).
- **Two types have no BOTD text at all.** *(new, D27.)* #1 opens empty (spec-sanctioned) and
  #18 is a stub. A typist needing a business line for a judgement has none until the
  dedicated screen exists.
- ~~**The standing words are ours, not a court's.**~~ **Resolved by D27** for thirteen of
  seventeen types; the other four carry no invented text. *The largest risk this brief has
  carried is retired by the owner supplying the spec.* **Residue:** the templates are
  hand-transcribed from a PDF, so transcription error replaces invention — smaller, and
  checkable against the source.
- ~~**A blank in the standing words (`₹____`).**~~ **Resolved by D31 and D32.**
- ~~**Hearing-day type subset.**~~ **Resolved by D27** — the list is the court's 27.
- ~~**The band grows with the party count** / **the live document is not beside the typing**
  / **the composer changes shape as the roll is marked** / **the work order and the document
  order disagree** / **the next date is asked before the directions are written.**~~
  Resolved or dissolved by D15's insight, D17 and the removal of D16's fold.

---

## 12. Open questions for product

**The spec is the source of truth for how order generation works. Everything it answers has
been closed below rather than asked again.**

**Closed by the spec on 2026-09-13 — recorded, not deleted.**

- ~~**Where do the standing words come from?**~~ Templates, system configuration managed by
  an administrator. D27.
- ~~**Does an order need parameters of its own?**~~ Yes — locked variables. D31, §5a.
- ~~**Should a pending application be surfaced here?**~~ Yes, and accept/reject *produce
  orders*. D36 — **and it was already built**, which §12 had wrongly denied.
- ~~**Is the hearing-day catalogue the register's?**~~ Neither: it is the spec's 27. D27.
- ~~**Is "Order under section 202 CrPC" the right label?**~~ **Settled: yes**, the spec names
  the type and we take it. The BNSS-repeal point survives as a footnote to D28, not as a
  question.
- ~~**Who composes the full order text, and where?**~~ **Here.** *"The magistrate can
  separately define the longer, detailed order text when composing the full order"*, and
  step 6 generates *"the complete order text."* D33 — which this closed the wrong way first
  and reversed the same day (§14).
- ~~**Is ST / LP an attribute we can read?**~~ The spec defines the semantics and
  `CaseRecord.longPending` already holds the flag. **A build requirement** — thread it onto
  `CourtHearing`. D29(c), §11.
- ~~**Can a case have more than one accused; are witnesses parties?**~~ Yes and yes, plus PoA
  holders. **A build requirement.** D31, §11.
- ~~**Is the catalogue's "the judge" our typist or bench clerk?**~~ The spec does not say and
  **does not need to**: it settles that amounts and dates are the judge's decision, so the
  screen records and never suggests (D37), and signing stays downstream (D10). Who logs in
  lives in `docs/product/open-questions.md`.
- ~~**What is the BOTD line for #1 and #18?**~~ There is none, and the spec says what to do:
  no template → write from scratch, or a dedicated screen handles it. D27, §10.
- ~~**`[Application Number]` for advocate replacement?**~~ It is *"currently a task, not an
  application"*, so it does not reach #8/#9 at all. D36, build note.
- ~~**Are #18 and #20 one purpose or two?**~~ One — the source says so. D30 (19 distinct).
- ~~**Is the business record signable?**~~ Dissolved: the full order is what step 7 signs,
  and signing is downstream (D10, D33).

**Genuinely open.**

1. **What are the master-data option lists?** *(new, D31 — the one thing that blocks
   building the fields as specified.)* The spec names Document Type, Notice Type, Mode of
   ADR and Plea as *"dropdowns drawn from master data, not free text"* and gives examples
   (*"complaint, affidavit, vakalat"*; *"mediation/arbitration/etc."*) — but a `Select`
   needs its closed set. Four enumerations, and nothing else in `docs/product/` holds them.
2. **The two gaps the source flags in itself:** *"case stages where each order is most likely
   issued"* and *"grouping for the order-issuance screen."* The second bears directly on
   D27 — we group the browse list by the register's `ORDER_CLASSES`, which is our choice and
   not the spec's, and the spec's own grouping would supersede it.
3. **The clipped Workflow column.** A transcription defect, not a product gap. Non-blocking
   (no workflows in this build), but a clean export closes a §11 risk.

**Carried, non-blocking.**

- **What is this screen's job?** (§4.) Candidate B is now strong in product's own words but
  names the judge, so it describes the act, not the actor.
- **Who logs in** — in `docs/product/open-questions.md`, where it belongs. D18 and §3 assume
  a repeat court-side user during a sitting and say so.
- **Does "Next item" correctly model what a bench does between matters?** Inferred from
  `hearing-session.ts` and `canDraftOrder`; D18 proceeds on the inference and says so.
- **Does "No next date" need a reason** (judgment reserved, disposed, compounded)? Not in
  `docs/product/`; not invented here.
- **Do §138 day-orders need sub-items inside one paragraph?** D22 answers it with the
  editor's list controls; §13 if not.

---

## 13. Gaps in the DS (if any)

- **Rich-text editor** — already ds-requests #7; this screen does not block on it (D22
  reuses `rich-text-field.tsx`). **Worth sharpening #7, not duplicating it:** what a court
  order wants is narrower than a marks toolbar — a structured list of paragraphs with one
  level of nesting and no marks. **Not filed from here:** `ds-requests.md` is a shared,
  append-only queue teammates edit concurrently, so this brief records the amendment and
  leaves the edit to whoever owns the entry.
- **`Alert` always `role="alert"`** — ds-requests #9. Honesty copy is a support line.
- **Raised Card variant** — ds-requests #5. Still per-use `border-hairline shadow-raised`.
- **Observation, not a request: the `prefilled` law and the `prefilled` primitive disagree.**
  `foundations/laws` says *"the border stays `input` — never signal prefilled with border
  colour alone"* and lists *"Amber borders for prefilled"* under **don't**;
  `components/ui/input.tsx` ships `data-[prefilled=true]:border-dashed
  data-[prefilled=true]:border-warning-ink` alongside `bg-prefilled`. D31 uses the primitive
  as built, because what renders is what a user sees. Recorded for whoever owns the DS — a
  law no implementation follows stops being a law. **Not filed from this brief** (shared
  queue, same reason as #7).

**No new DS request from this feature.** Everything D26–D39 needs — `InputGroup`,
`Input prefilled`, `Select`, `DatePicker`, `Combobox`, `FieldSet`, `Textarea` — is already
in `components/ui`.

---

## 14. Decision log

| Date | What | Who |
|---|---|---|
| 2026-09-13 | **D41 amended: the browse is the reference's — a search field over four groups, not a `Combobox`.** Owner asked for the reference's structure directly. Surfaced a real conflict in doing it: the reference offers **Accept / Reject** as a browsable group of 7, and the source marks **every** accept/reject order *not in dropdown* — they are reached from the application that produces them. Built as five rows reading "Comes from an application", so the group stands where the reference puts it and nothing claims to be selectable that is not. The reference's counts (5 / 7 / 10 / 6 = 28) do not reconcile with the catalogue's 27 either; ours are 5 / 5 / 11 / 6. **Both are provisional — the source lists grouping as still to supply.** | ui-designer (owner report) |
| 2026-09-13 | **D42 amended again: the per-section "Next" is cut.** Owner: *"we don't need this button across application, attendance, next hearing, and orders because we are already expecting the user to click through it."* It was carried over from the icon-rail revision, where the rows were not visible and something had to carry the move; with four headers always in view it was a second control doing what the row beneath it already did. Nothing about gating changes — the move was never blocked and still isn't. | ui-designer (owner report) |
| 2026-09-13 | **D44 reverted, same day, on sight.** Owner: *"looks bad, revert."* The tinted card with View / Reject / Accept is restored and D36 stands. Kept in §5 rather than deleted: the diagnosis (a status tint marking the norm; three action treatments on one card) is still true and will recur. The lesson recorded with it — the proposal bundled a colour fix with a cost of one extra press, so a "no" on the whole cannot be read as a "no" on the colour. | ui-designer (owner report) |
| 2026-09-13 | **D44: applications lose the tint and the two decisions; the row keeps one Review.** Owner on the built cards: *"it looks really bad with the yellow, green, and destructive in view."* Diagnosed as two faults — a status fill marking the norm rather than an exception, and a judicial decision offered on a list row when the overlay that shows the papers already carries it. Row now states type, serial, filing side and date. **Amends D36.** Built on the owner's instruction to see it before deciding; reverting is one commit. | ui-designer (owner report) |
| 2026-09-13 | **D42 amended: every section can be closed.** The build refused to close the last open section, on the reasoning that all-four-shut showed nothing and lost your place. That reasoning belonged to the icon rail this replaced, where a closed section really did show nothing; it stopped holding the moment each row carried its own summary, and it was carried across without being re-examined. Owner reported it. Closed is now the overview state. | ui-designer (owner report) |
| 2026-09-13 | **D40–D41 built: the court's catalogue replaces this app's.** `order-templates.ts` carries all 27 from `docs/product/order-templates.md`; `order-items.ts` became a layer over it; `miscellaneous-process` cut, `Others` kept and marked as outside the catalogue. Orders section rebuilt as purpose-shortcuts → searchable groups → gated types with reasons. 678 tests pass, six DS gates pass, verified on the served DOM. **Not built: the variable fields (D31).** An order still opens with `[Amount]` standing and no control to fill it — that is the next slice and the screen is honest about it rather than guessing a value. | ui-designer (owner ask) |
| 2026-09-13 | **D42 built, after two rejected instruments.** A two-tab split (Sitting / Orders) read as a seam the work does not have — the owner: *"this still feels odd."* An icon rail replaced it and was worse: it could show four marks but not one fact, so the panel stood empty and Back/Next fell below the fold — the owner: *"the back and next buttons are not even visible in the first place."* Accordion sections with state in the closed row were the owner's proposal and answer both. Recorded because the brief had already argued against a wizard (D17) and should not be read as having argued against this. | ui-designer (owner direction) |
| 2026-09-13 | **D43 built.** Two cards with a gutter became one panel; the paper stopped being the container and became a sheet on a well inside it — the owner: *"the paper can't be the container."* Also fixed two layout faults of the same kind: the application rows and the attendance roll both switched to multi-column at `sm:`, which measures the viewport while the column is a third of the panel at every width above it. `sm:` in a column-scoped layout is now treated as a defect on this screen. | ui-designer (owner report) |
| 2026-09-13 | **DS request #20 raised.** `Tabs` and `ToggleGroup` both accept `orientation`, destructure it out, and never forward it to the Radix primitive — so a vertical tablist lays out as a row *and* keeps horizontal arrow keys. Found while building the rail; the rail was composed from `Button` + `nav` + `aria-current` instead. Appended to `docs/design/ds-requests.md` and diffed to confirm it only added lines. | ui-designer |
| 2026-09-13 | **D33 reversed, same day, on a closer reading of the spec — the substantive correction of this revision.** D33 first concluded the composer produces the BOTD line *and only that*, and renamed the right column "Business of the day". **That read the spec's BOTD note without its second half.** The spec says the magistrate defines the longer order text *"**when composing the full order**"* — during this act — and resolution step 6 is *"the system generates the **complete order text**"*, step 7 *"reviews, optionally edits, and signs"*, with free editing *"add sentences, remove paragraphs, correct wording"* plus *"additional comments in a free-text area."* The reference corroborates: its document body is #17 Cognizance then #12 Issue of summons, verbatim, with a live cursor in it. **Corrected model: one template, one composing act, two artefacts** — the business line (generated from the fields, **frozen**, what `OrderRecord.botd` holds and the workflows read) and the full order text (**seeded** by it, freely edited) plus additional comments. The relationship is one-directional and that is the load-bearing call: if the business line were derived from freely-edited prose, a locked variable could be edited away and the workflow would break — which the spec forbids. **The evidence that `orders.ts` separates `botd` from `issuedDocument` still stands; it argues for both being produced here, not for one.** Right column reverts to **"Order"**. | ux-designer (correction) |
| 2026-09-13 | **D39 added** — additional comments, the region D33's first version had no place for. Last block of the order body, after the numbered paragraphs and before the closing; `Textarea`, not a second `RichTextField`, because the spec calls it a *"free-text area"* and comments are not operative text. Present in the composer, absent from the document and paper when empty. | ux-designer |
| 2026-09-13 | **D28 off provisional, and our rename reverted.** The spec is the source of truth for order types and names this one **"Order under section 202 CrPC"**, In dropdown: Yes, no template. We take it; **D24's logged deviation is withdrawn.** The BNSS-repeal reasoning (CrPC replaced 1 July 2024, `sources.md`; point-in-time law, `product-foundation.md §3`) is kept **as a footnote to the decision** so a future reader sees why we once renamed it — it is a real point and not a blocker. **Named consequence:** the employee side and `lib/cases/orders.ts` now label the same type differently, which is the D12 drift; **recommendation, not a question** — the spec is now the source of truth for order types app-wide and the register should follow. | owner (correction), ux-designer |
| 2026-09-13 | **ST / LP reframed from a product question to a build requirement.** The spec defines the semantics (#25 marks a case LP, #26 renumbers it ST — two states of one attribute) and **`lib/cases/types.ts` already carries `longPending: boolean`, with `query.ts` `statusOf()` deriving `"long-pending"`.** What is missing is that `CourtHearing` does not carry it across. Off the blocking list; the fail-open warning stays as a §11 risk, sharpened by the fact that every demo case number is `ST/…`. | coordinator (correction), ux-designer |
| 2026-09-13 | **Parties reframed from a product question to a build requirement.** The spec answers it outright: *"there can be multiple accused (e.g. the drawer and the company director)"*; `[Party Type]` is *"Complainant, Accused, or Witness"*; `[Party Name]` is *"any person in the case — complainant, accused, witness, or PoA holder."* `parties: { complainant: string; accused: string }` is insufficient and must become a list of typed parties. Off the blocking list; §11 risk. | coordinator (correction), ux-designer |
| 2026-09-13 | **D37 off seat-conditional.** The spec does not resolve who operates the screen and does not need to: amounts are the judge's decision, discretionary dates are *"set by the judge's discretion"*, and step 7 is review-and-sign. So **the screen records decisions already taken and never suggests one** — no default amount, no pre-computed deadline, no pre-selected party — and **signing stays downstream** in the existing queue (D10). Who-logs-in returned to `docs/product/open-questions.md` and off §12's blocking list. | ux-designer |
| 2026-09-13 | **D34 gains the #6 reconciliation, explicitly.** #6 is *"Yes (when hearing not ongoing)"* and this composer is only reachable from inside a sitting — so **during a sitting #6 is correctly absent from the dropdown while the next-hearing region still sets the date. Not a bug.** Stated because the next reader would otherwise read the gate as one. It also unifies D29(a) and D34 into one rule: **a type whose context is present is reached from its context, not from the list** — #8/#9's context is the application, **#6's context is the sitting itself.** | ux-designer |
| 2026-09-13 | **D35 placement corrected to the spec's own words** — *"buttons **alongside** the order type dropdown"*. Built beside the chooser in the same region, wrapping below `sm`; **the separate "Record a proceeding" headed block is dropped**, because a headed block below is not "alongside". Purpose mapping and the fail-closed asymmetry with D29 stand, both explained. Scope unchanged: four record-taking screens are a separate brief, and the spec gives their statutory basis and a one-line "Records" summary but no field lists, which is that brief's first job. | ux-designer |
| 2026-09-13 | **Hearing purposes deduped to 19 distinct** (20 rows; the source notes #18 and #20 are the same purpose). D30 and §12 updated; the "one purpose or two?" question closed. | ux-designer |
| 2026-09-13 | **§12 rewritten to hold only what the spec leaves open.** Twelve questions closed against the document and recorded rather than deleted. **Genuinely open: (1) the four master-data option lists — the one thing blocking D31 as specified; (2) the two gaps the source flags in itself (case stages per order, and grouping for the order-issuance screen, which supersedes our use of the register's `ORDER_CLASSES`); (3) the clipped Workflow column, non-blocking.** Carried and non-blocking: Job, who-logs-in (in `open-questions.md`), "Next item" modelling, whether "No next date" needs a reason. | ux-designer |
| 2026-09-13 | **Brief compacted to fit a single write.** Maintained with `Write` (whole-file) and no `Edit`; at 1318 lines it exceeded one response. The superseded **bodies** of D14–D17 and the obsolete D17 diagram were compacted to pointers; **every id, outcome, reversal reason and argument survives** in §5 and in the rows below. Recorded because a silently shorter brief is indistinguishable from one that lost something. | ux-designer |
| 2026-09-13 | **Header corrected:** the DS origin was recorded as `neer-ideasbeforenoon/pucar-design-system`, not the authoritative remote. Verified `https://github.com/pucardotorg/dristi-design-system.git`, HEAD `refs/heads/main` = `e0cadea6b9d459bd3c58eed840974c6c610ad624` = `ds.lock.json`. **Pin `e0cadea6b9d4` confirmed.** The checkout was always right; the record of it was wrong. | ux-designer |
| 2026-09-13 | **Nine passes run** (`references/staff-ux-thinking.md`). **Pass 8 partially deferred and said so:** no browser in this session, so the render pass ran on the owner's screenshot and the source, not live pixels; the long-`[Document Name]` and Malayalam-template cases in §10 must be judged on actual pixels before sign-off. Passes that changed the brief: the census produced §5a and problems 18–19; the sibling sweep found `OrderRecord.botd` (which, read correctly, produced D33's final form); the pattern census found the two mirrors and the answered-vs-skipped fork (D34); control vocabulary produced D38. | ux-designer |
| 2026-09-13 | **New product fact: `docs/product/order-templates.md`** — owner-supplied Order Template Catalogue (PDF dated 2026-09-07), transcribed the same day, **and the source of truth for how order generation works.** 13 general variables; 27 order types with BOTD templates, locked/optional variables and an "In dropdown" gate; 6 application types under generic accept/reject; 4 section workflows; 19 distinct hearing purposes mapped to actions; the auto-fill/judge-input resolution order. Its rightmost Workflow column is clipped on every page; **no decision rests on a clipped cell.** | owner |
| 2026-09-13 | **D26: what we take from screenshot 1, and what we do not.** Take: the right side is the order, not fields describing it (D17's column assignment, independently arrived at — **and the reference's body is spec #17 then #12 verbatim with a live cursor, which is also the evidence for D33**); the document-style header; a purpose-driven shortcut over the grouped catalogue; applications at the head of the rail. **Not taken:** the two attendance grids (problem 1), the inverted skip checkbox (problem 3), the tiles' workflow descriptions (no workflow in this build, and the source's Workflow column is clipped), the red Delete/Reject, and a separate search over collapsed accordions. Each refusal named separately so one can be overruled without four. | ux-designer (owner reference) |
| 2026-09-13 | **D27: the catalogue is the court's twenty-seven, and the words are the court's.** `STANDING_WORDS` replaced by the spec's BOTD templates. Thirteen types get real text; #1 and #18 lose their invented sentences (no template — the spec says write from scratch, or a dedicated screen); `miscellaneous-process` **cut** (no template/variables/workflow); `Others` **survives, demoted** — the escape for an order the spec has no type for, not for a type we forgot. Browse list 17 → **21**; **six types become reachable that no typist could reach before.** **Retires the largest standing risk in this brief** — the words are no longer this app's. | owner (spec), ux-designer |
| 2026-09-13 | **D29: nothing is hidden.** The six "In dropdown: No" types have **no browse entry** because they do not exist outside their context — the spec's own *"they appear only in context"* — and are reached from the application (D36). The ten conditional types stay, `aria-disabled`, sorted last, **reason on a visible second line** (not a tooltip — ACCESSIBILITY, and the app's `aria-disabled` idiom already means *not available here*); searching one **finds** it. Reasoning: where a wrong omission is a missed order, a typist who searches "warrant" and finds nothing cannot tell whether the word is wrong or the case is. **Gave up ~10 rows of noise**, over a silent omission on a §138 clock. | ux-designer |
| 2026-09-13 | **D30: today's purpose is on the screen, and it suggests — never filters.** Restores the half of D8 the 2026-09-07 rebuild dropped (problem 20) — without it the spec's mapping has nothing to key off. Chips carry this purpose's likely types **minus the seven always-available generics** (they apply to every purpose and would mark the norm); typically two; **absent when the purpose maps to none.** The `Combobox` always carries all 21. **Keying trap named:** the mapping is keyed on the *current* purpose and our `Select` sets the *next* one, so the label becomes "Purpose of next hearing" — D18's rule, third application. **Vocabulary splits:** the cause-list filter keeps the board's 11, the composer offers all 19. | ux-designer |
| 2026-09-13 | **D31: locked variables are fields, in the order's own roster row, and slots are positional.** The core of the ask. Rejected inline slots (a locked variable in a `contenteditable` is a removable one — the spec forbids removal; and it fails on long values and in Malayalam) and a sheet per type (modals on a 23-matter board). Taken: a `FieldSet` in the roster row — **the minimum addition that answers the ask**, holding D24's left/right division, with the right column rewriting live as fields fill. Controls per the spec's four classes; party `Select` **only when >1 candidate** (its rule, quoted). **`prefilled` amber for machine-read context only** — never the 13 general variables, which are not fields and whose amber would paint the norm. **`[Party Type]` twice is two attributes:** slots positional and role-named ("Paying party" / "Receiving party"), because a bracket-text map **reverses who pays in a Cost order**. **Optional variables are administrator configuration, so there is no "add a variable" control** — a cut the spec handed us. | ux-designer |
| 2026-09-13 | **D32: a hole stays a hole.** An unfilled locked variable prints as its own name in the muted pending voice, on screen and on paper. **Nothing is blocked** — a trap on item 4 of 23 is worse than an incomplete record. **One summary and one in-place marker, no third:** a muted footer count and the hole itself; no `aria-invalid` on arrival, no red fields, no roster suffix. **Resolves the `₹____` risk.** | ux-designer |
| 2026-09-13 | **D36: applications stay, answering one draws the order it produces, and it is Allow / Dismiss.** **This brief's own position reversed.** §12 had said disposal is *"a separate judicial act"* belonging to the review queue, and that *"nothing is built for it"* — the second was false (the strip, the dialog and `assembleApplications` all ship) and the first wrong as a domain claim: the spec makes accept/reject **produce orders** (#8/#9, #3/#4, #16), so disposal is **the same act reached from a different door**, which is why those types are "In dropdown: No". Answering now adds the matching order to the numbered list with application number and type `prefilled`, replacing today's unnumbered fourth-shape sentence block. **Held from the old position: the red `destructive` Reject goes** — "Reject" is the queue's word (an order says *allowed* / *dismissed*) and `destructive` is for destroying a record, not deciding against a prayer. Both `outline`, equal weight. Build note: advocate replacement is *"a task, not an application"*, so it does not reach #8/#9. My header-line proposal cut. | ux-designer (reversal, on the spec) |
| 2026-09-13 | **D38: "order type", not "item".** `CourtHearing.item` is the board serial; `OrderItemDraft` is a paragraph; both were called "item" forty pixels apart, and D18 refused this collision in the other direction. Region, field, roster and `ORDER_ITEM_TYPES` / `OrderDraft.items` rename; **"item" is reserved for the board serial**, which is what makes D18's "Next item" correct rather than merely defensible. | ux-designer |
| 2026-09-13 | **§5a added** (Attributes: value → source → type → slot), per the `propose-ui-brief` template this brief predates — and it is the deliverable for the owner's ask about fields. Three rows are the finding: *business line* and *full order paragraph* start identical and diverge, which is the whole of D33; *"In dropdown" availability* has a source that exists in the app but not on this screen's model, which is D29(c). | ux-designer |
| 2026-09-13 | **Problem 23 recorded: the shipped screen carries problems 1 and 3.** Verified in `order-screen.tsx`: two `MarkGroup` checkbox grids; "Skip scheduling next hearing" as a checkbox with fields disabled-in-place rather than unmounted; two read-only mirror `Textarea`s; the advance labelled "Next hearing"; "Save as draft" back as a control whose `onClick` only fires an announcement. The 2026-09-07 rebuild took the reference verbatim and §2 still described 1 and 3 as the reference's faults. **A brief that misreports its own screen is worse than a stale one.** | ux-designer |
| 2026-09-09 | **D25: the typist's cause list ends at Orders, and the trip into the composer is the sitting.** Owner on the typist board: the Action column's typist wording (*To start* / *Hearing started* / *Hearing ended*) "is redundant. The last column would be orders only." It was — the Status chip two cells left already said where the matter stood, so that column reported and never acted, and the one press it did offer existed only to unlock the column beside it. Removed: the column, `hearingProgressLabel`, and the two-second start beat with it — **this retires the typist's one-control line (shipped in `d85fe6e`, never written into a decision row)**. That leaves `canDraftOrder` with nothing to open the orders column, so this seat reads new `canTypeOrder(status)` (adds `scheduled`) and `openOrder` marks the matter heard on the way in, as it already did. Both seats still close on a listing that was never heard (passed over, rescheduled, abandoned). Seven columns for the typist, eight for the bench; the table drops to 878px and stops scrolling at every laptop width. On a phone the lone glyph takes the words instead (**Open order**, outline) — no column header there to name it. Gates + typecheck + 386 tests pass; both seats verified against the served DOM. | owner (ask), ui build |
| 2026-09-09 | **D24: the item catalogue is the typist's instrument.** Owner sent four screenshots of the 1.0 composer "as it looks for the typist", three of them the Order items dropdown open — the one region of the reference our build did not have (problem 15). Built: `lib/employee/order-items.ts` with the reference's seventeen items in the case register's words and ids (D12; **Section 202 CrPC** renamed to the register's **Postponement of issue of process**, since the CrPC was replaced by the BNSS on 1 July 2024), each opening on standing words with this listing's parties named in them. `OrderDraft.itemText` became `OrderDraft.items` — a list, numbered by position, printed as the `<ol>` the signing queue already uses (D19). Chooser and roster on the left as the reference has them, one editor per item on the right, and the next-hearing recital restored to the Order text column. `Combobox` over the reference's plain select (grouped + type-ahead, the `case-applications.tsx` composition). Two logged deviations from the reference: the renamed item, and a neutral Remove instead of its red Delete. Gates + typecheck + 386 tests pass; verified against the served DOM. **Recorded as the largest risk: the standing words are this app's, not a court's.** *(Risk retired 2026-09-13 by D27. **The rename is withdrawn by D28** — the spec names the type "Order under section 202 CrPC".)* | owner (ask), ui build |
| 2026-09-09 | Noted, not re-litigated: the **2026-09-07 region-for-region rebuild** of this screen against the reference was never written into this brief. §5 now carries a banner saying so, and §7 leads with the shipped layout. *(Extended 2026-09-13 by problem 23, which names what the rebuild restored.)* | ui build |
| 2026-09-07 | **D23: a completed listing opens on a written order.** Owner: once a hearing is ended, clicking the orders icon should show a dummy order filled out. Until now it opened an empty composer, which said the sitting produced nothing. `lib/employee/order-demo.ts` supplies the *opening* draft for a listing whose live status is `completed`: the whole roll marked present, every application that was pending allowed, one item paragraph per hearing purpose, and the matter posted three weeks on (off weekends) for the next purpose in the §138 progression — judgement alone posts to no date. It is the listing's starting draft and not a lock: the first edit is kept over it, and a listing dictated on during the sitting keeps its own words. Threaded through `readOrderDraft` / `updateOrderDraft` / `useOrderDraft` as one `initial` value so the read path and the write path cannot disagree; a scheduled or ongoing listing is still empty, because the point of the composer is that the bench dictates while the matter is standing there. No visible "this is demo text" mark — the whole board is demo data and the sidecar behind the case overview already fabricates past orders without one. | owner (ask), ui-designer (build) |
| 2026-09-06 | **D22: directions take formatted text, through `RichTextField`. Supersedes D19's "no toolbar" and the rest of D6.** Owner asked a second time for the editor after reading D19's reasoning; reaffirmed ask, owner's call. Built by reusing the applications forms' existing `components/cases/rich-text-field.tsx` — DS chrome (`InputGroup` + `ToggleGroup`), paste sanitised, read-only `RichTextValueView` on the paper — rather than adding a court-side third editor. Numbering from D19 kept: the order numbers the directions, the toolbar's lists handle sub-items inside one. `DirectionDraft.body` becomes `{ html, text }`; "written" is measured on `text`. `ds-requests.md` #7 (no editor primitive; both existing ones use deprecated `execCommand`) gains a third caller and is otherwise unchanged — that queue is shared, so the edit is the owner's. Lost: the plain-text guarantee, and the textarea placeholder. | owner (direction) + ui build |
| 2026-09-06 | **D17: the order is the editing surface.** Owner reported the shipped D16 screen still wrong, and that the accordion "still doesn't help". Diagnosed as problem 11 — the read-only Order panel is a *mirror* of the controls beside it, blank for the first half of every sitting, so the work column has to carry four acts in one 638px band and the typing is always last. **D5's read-only split reversed; D16's fold removed.** Two panels: facts of the listing (attendance, next listing) at `lg:col-span-2`; the order, with the directions typed into it, at `lg:col-span-3`. Nothing sticky but the footer. First typing affordance moves from y≈815 to **y≈450 on arrival**, and stops moving with the party count. Resolves the work-order/document-order mismatch and dissolves the "Next listing above or below Directions" question. Cost: no controls-free read of the order on the page — that is Preview's job now. | ux-designer (owner report) |
| 2026-09-06 | **D16 reversed.** The fold fired on the transition into *all marked* while the screen's default state is unmarked, so it bought nothing on arrival — problem 12, and the owner's own observation. §6 of this brief had already rejected the same mechanism in the opposite polarity and the build shipped it anyway; that is on the brief. `Collapsible`-over-`Accordion` reasoning kept on the record for any future disclosure on this page. | ux-designer (owner report) |
| 2026-09-06 | **D18: "Next item" is the screen's one primary.** Owner: "Today we don't have the option move to the next hearing as well." Counted at five acts and three page loads to advance one item on a 23-row board (problem 13). From `hearing-session.ts` (one `ongoingId`; starting a second returns the first to scheduled) and `canDraftOrder` (`ongoing \|\| completed`), the only coherent act is **end this listing and call the next scheduled one**. Footer right, not top-right (that slot is page scope on the neighbouring screens); takes the teal from Preview, which drops to outline — **amends D9**. Named "Next item", not "Next hearing", which already means the next listing of this case forty pixels away. Caption names the item it calls, so a skip is visible. Last item → "End item", back to the cause list. No confirm dialog; logged as the revision's largest accepted risk. | ux-designer (owner report) |
| 2026-09-06 | **D19: directions are numbered paragraphs; still no toolbar. Amends D4 and D6.** Owner asked for 1.0's editor. Evidence found instead: `sign-order-dialog.tsx` → `OrderFacsimile` already prints an order as `<ol list-decimal>` on `bg-paper`, so the composer and the signing queue disagreed about the same artefact (problem 14) — the failure D12 exists to prevent. Numbering ships with no new primitive (it is already list position in the model). Bold / italic / alignment stay out: no product doc asks for emphasis in a direction and neither place this app prints an order uses one. D6's old reason ("plain paragraphs are enough") withdrawn as taste dressed as a rule. | ux-designer (owner report) |
| 2026-09-06 | **D20: the draft is held for the sitting in a module beside `hearing-session.ts`; Save draft is cut.** Precondition for D18 — an advance that discards the dictated order is a data-loss feature. Same lifetime and same honesty as the session marks (survives client-side navigation inside `/employee`, dies on reload), which that module's own doc comment already argues for. With the draft held continuously, an explicit save is a control that teaches distrust; the footer caption carries the state in `text-muted-foreground`, not `text-warning-ink` (standing state is not a caution — ui-craft §1.4, `foundations/colors`). **Amends D9.** | ux-designer |
| 2026-09-06 | **D21: Preview is the paper facsimile the signing queue already uses** — `DocumentPreview` + `bg-paper`, matching `sign-order-dialog.tsx`. Gives Preview a job now that the live mirror is gone. Paper stays *out* of the composer: `foundations/colors` documents it as "never app chrome" and fixes it in both modes, so a `Textarea` on it breaks in dark. No download — there is no court record to download (D10, D13). *(Extended 2026-09-13 by D33: the paper also prints the business line, labelled.)* | ux-designer |
| 2026-09-06 | Pending applications (1.0 shows bail / advancement inline with Accept / Reject) recorded as an **open question, not a decision** — owner did not ask. Position offered: the *fact* of a pending application may belong in the header line because §138 clocks make an advancement application time-bearing; the *disposal* belongs in the Review applications queue. Nothing built. *(Position reversed 2026-09-13 by D36, on the spec; and the "nothing built" claim was already false by the 2026-09-07 rebuild.)* | ux-designer |
| 2026-09-03 | **D16 (owner): one work container at `lg:col-span-3`, the Order document beside it at `lg:col-span-2`, sticky; attendance folds once every appearance is marked.** Superseded D15 and D14's arrangement. Composed with `Collapsible`, not `Accordion`. Flagged at the time: on first paint the roll is open, so Directions starts at ~y=734 until it folds. **Reversed 2026-09-06.** | owner (direction) + ui-designer (build) |
| 2026-09-03 | **D15 (owner): Attendance its own narrow panel; Next listing + Directions in the wide panel; the document full-width below, unsticky.** Superseded D14's arrangement, kept its diagnosis. Directions heading y≈774 → y≈414. Resolved the party-count risk D14 had accepted. Gave up the live document beside the work. **Superseded by D16; its core insight — roll beside the writing — re-adopted by D17.** | owner (direction) + ui-designer (build) |
| 2026-09-03 | Built D14: `ListingBand`, Directions and Order as siblings of a `lg:grid-cols-5` row at 3/2, attendance rows `py-3` → `py-2` on a `min-h-10` floor. Gates + typecheck pass; verified against the served DOM. | ui-designer |
| 2026-09-03 | **Problem 10 + D14: bounded facts band on top, Directions paired with the document below.** User reported having to scroll to write a direction. Diagnosed as a pairing fault. Rejected: reorder-only, tabs/accordion, dropping the live document, collapsing the roll, capping the roll with an inner scroll. **Superseded; the diagnosis stands and problem 11 is what it was missing.** | ux-designer (user report) |
| 2026-09-02 | Add direction is a button + type menu, not a Select. Empty copy says one or more; after the first, the control is **Add another direction**. *(Superseded by D24's Combobox + Add.)* | owner |
| 2026-09-02 | Absent is `text-destructive-ink` in the document and on the selected segment — word plus ink, no chip, Present stays unpainted. | owner |
| 2026-09-02 | Attendance in the document: one sentence per appearance, not a run-on paragraph. Same words; name / office / present-or-absent as hierarchy. | owner (selected the jammed paragraph) |
| 2026-09-02 | Clarified: "this build does not issue" means Dristi does not file/sign the order — not that the DS lacks a green treatment. | ux-designer (user ask) |
| 2026-09-02 | **Cause-list icon is not green until an order is passed; even then glyph + name, not colour.** Always-green rejected. Green-on-draft rejected. | ux-designer (user ask) |
| 2026-09-02 | Built: `/employee/hearings/[hearingId]/order`, cause-list icon wired, session-only draft, Preview dialog. No issue/sign/PDF. | ui-designer |
| 2026-09-02 | Brief opened from the 1.0 generate-order screenshot and the cause-list orders icon. Dual attendance grids, skip-checkbox, Choose item, and three-box Order text replaced by one-mark-per-person, named directions, positive next-listing, and one read-only document. Job unconfirmed. Issuing/signing out of scope. | ux-designer (user ask) |
