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

**D45 · Attendance and the next listing are edited in the page, not in the panel.**
*(owner wireframe, 2026-09-14)* They are two sentences the order itself says, so they are
set down where they appear: an eyebrow on the page names each, and under it the form that
writes it. **Both open on arrival** — a typist lands here to record a sitting that has
just happened, and the two facts they always have are who appeared and when it is next
listed; opening closed would make the first two acts of every order a press that reveals
a form. Each holds its entries and commits on **Apply to order**, so the page does not
change under someone working down a roll of four, and abandoning a half-marked roll
leaves the order saying what it said before. This is D17's principle finishing its job:
the order was already the editing surface for the directions, and these were the last two
facts still being typed somewhere else and mirrored in.

**D46 · One control per person, and problem 1 is finally gone.** The roll is a single
three-state control per appearance — Not marked / Present / Absent — which is the owner's
wireframe and which makes "present and absent at once" *unrepresentable* rather than
merely discouraged. Two independent checkbox grids over the same four roles have been
problem 1 since the first revision of this brief; every previous pass moved them, folded
them or re-labelled them. **Every choice is on the page, and the two sides are split**
*(owner, 2026-09-14)*: a `SegmentedControl` per person — the DS primitive written for
exactly this, "a small, fixed set of mutually exclusive options shown side by side" —
under a `fieldset` per side of the cause. A dropdown hid two of three answers behind a
press and made four rows of identical closed boxes; marking a roll is now four presses
rather than eight, and the roll's whole content is legible without opening anything.
Grouping reads a new `side` field on `Appearance` rather than matching words in `role`:
the label is copy, it will be translated, and a second accused would break a parse
silently. With the side as the heading, the party's row needs no role caption at all and
only counsel carry one. *(A `NativeSelect` stood here for part of one day, chosen because
Radix's `Select` ships an empty trigger until hydration — true, and moot once every
option is rendered.)* Same pass makes **"List it again"** a positive
checkbox rather than the reference's "Skip scheduling next hearing" (problem 3), with the
two fields *removed* when it is unticked rather than sitting disabled.

**D47 · The composer's document is `bg-card`; `paper` goes back to being the facsimile.**
*(forced by D45, and it restores D21)* `foundations/colors` fixes the `paper` family in
both modes because a printed page does not invert — which is exactly why a themed form
control cannot sit on it. D21 said so ("a `Textarea` on it breaks in dark") and D33/D43
drifted from it when the page moved into the composer. With selects, checkboxes, a date
picker and an editor now on that surface, the drift had to end. In light nothing changes:
`card` is white. In dark the document column themes with the product instead of showing
dark controls on a white sheet. Preview and the signing queue keep the true `paper`
facsimile, which is what the token is for.

**D48 · The left panel is two tabs again: Orders, then Applications with its count.**
*(owner, 2026-09-14)* With attendance and the next listing gone into the page, what is
left are the only two things on this screen that are *not* the order's own text — and
they are genuine alternatives, which is what a tab is for. Orders is the default because
it is the work. Applications carries a figure because a party is waiting on it and a tab
you are not looking at has to be able to say so. *This supersedes D42's four-section
accordion, which was carrying a sequence and a pair of alternatives in one instrument;
its summaries-in-the-closed-row argument stays true and is why the count is on the tab.*

**D49 · The page prints what it holds as the order sheet prints it.** *(owner
screenshots, 2026-09-14)* Four things, all of them the same move — a fact the page holds
is set as a *fact*, not as a sentence the reader has to parse.

**Attendance is two rolls**, `Present:` and `Absent:`, listing offices rather than names:
the roll of parties two inches above already maps one to the other, and that is how an
order sheet writes it. A side with nobody on it prints no line — "Absent: —" is a
sentence about nothing. The running sentence survives in `opening` for the unmarked case.

**The next listing is two named facts**, purpose and date, and the prose form survives
only for the one case that is not two facts — a matter not being listed again. An unset
value prints "Not set" in the muted voice rather than as a blank nobody notices.

**The order ends with a signature block**, not a sentence saying one is pending.
`PRESIDING_MAGISTRATE` and never `CURRENT_STAFF`: the seat at the keyboard is a bench
clerk or a typist, and the order is not theirs to sign. Its name comes from the owner's
reference; its designation is written against `CURRENT_STAFF.court` rather than copied
from that reference, because the reference names a differently-worded Kollam court and
one page must not give itself two. **"Signature" is a caption over an empty space**,
which is honest — nothing here signs anything (D10).

**Deviation, logged rather than buried:** the two next-hearing values take the brand ink.
That is against rationing brand colour to the one primary action per view. The owner's
reference marks them this way and they are the two things a bench looks for first; taken
on the owner's instruction, and it is the one place on this page colour carries emphasis
rather than status. **Reversible in a line** if the page starts to read as decorated.

**~~And a fix the DS should probably own~~ — withdrawn the same day.** The
`SegmentedControl`'s well was overridden to `bg-card`, reasoning that a sunken control on
a sunken card has no edge of its own. True, and the wrong trade: **the DS selection cue
*is* a white lifted pill**, so a white well left the marked answer reading only by weight
and a faint shadow (owner: "I don't think the rounded filters be white"). The well is the
ground the pill lifts off, and the group is already delineated by the hairline the
primitive draws around it. Reverted to the DS default, and the lesson is the general one:
a control whose surface looks redundant against its parent is usually telling you
something about the parent, not the control.

**D50 · "Likely at this hearing" is read off the sitting, not off the purpose alone.**
*(owner ask, 2026-09-14; grounded on `public/case-file/09-orders.pdf`)* D41 mapped the
purpose to the orders the source's table lists against it, and that was all the shortcut
knew. **Item 1 of the cause list is where that failed**: an evidence listing with a bail
application standing in it (`listing-applications.ts`) was offered Witness batta and a
witness summons, and never the one order the bench was about to pass.

**The court's own order pack is what settled the model.** Nine orders, cognizance to
sentence. Read end to end they say a day-order is a substantive direction plus the next
date — the next date is already its own control after D45 — and *what the direction is*
turns on four things this screen already held and threw away:

| Ground | What says so | The row's caption |
|---|---|---|
| An application the bench **allowed** | DOC-ORD-003: *"Bail application considered… bail is granted on execution of bond"* | "Follows CMP/312/2026, allowed at this hearing" |
| A party the sitting needs is **absent** | The same order's *"Accused… appears with counsel"* — the branch that decided it | "The accused is marked absent" |
| The **chain inside one order** | DOC-ORD-001: *"Cognizance is taken. Issue summons to the accused"* — one order, two items | "Follows cognizance at item 1" |
| An application still **pending** | The same pairing, not yet ruled on — so the sentence is conditional | "If CMP/312/2026 is allowed" |
| What it was **listed for** | The source's purpose table, unchanged | *(none — see below)* |

**Grounds are ranked, never weighted.** A ground is a reason and a reason either applies or
does not; summing weights would produce an order nobody could explain to a bench. The list
above *is* the explanation, and an order the bench has allowed an application for outranks
one the purpose table merely mentions, always.

**The ordinary row keeps its silence and its workflow line.** A section headed "Likely at
this hearing" has already said why a baseline row is there, so captioning it "usual at this
hearing" would buy a line of type and no information. Only a signal the reader cannot see
from the heading earns a sentence — which is also why the list became an `ol`: position is
now the answer to how likely, so a `ul` would throw away the thing that was computed.

**It suggests and never restricts** — the law D41 set, kept literally. No signal removes a
row: an order the bench has just contradicted (process against an absence, when the accused
has been marked present) *sinks* and stays listed, and an order already written drops to the
foot of the list saying **"Already item 2"** rather than vanishing, because a second summons
to a second witness is a real second item. Availability is still `unavailableReason`'s to
decide and the ranking cannot overrule it. The cap of five is honest for the same reason the
gated rows are shown: the whole catalogue is a search field directly underneath.

**What it refuses to guess, and this is the load-bearing restraint.** An order is a judicial
act, so a consequence the source does not tie to the situation is not one a ranking function
will infer. The accused's absence promotes Issue of warrants **only where the source's own
purpose row already lists it** — rows 5, 6 and 9. At a plea hearing the source names no
warrant, so neither do we; and a *complainant's* absence is not answered by borrowing the
accused's remedy at all. Both gaps are real and are asked of product in §12 rather than
filled in by a sort comparator.

**D50a · And one conflict in the source, which the order pack decides.** `issue-of-summons`
is gated *"once the case is on file"*, while the hearing-purpose table lists Issue of
summons against **Admission** and **Cognizance** — purposes at which the case is by
definition not on file yet. The two halves of the spec contradict each other. DOC-ORD-001 is
what the court actually does: *"Cognizance is taken. Issue summons to the accused on payment
of process fee."* One order, both directions. So **cognizance taken as an item of this draft
puts the case on file for the rest of the order** (`cognizanceDueFor`) — the only reading
under which the register's own first order can be written on this screen at all. It shuts
the right doors too: a case taken on file at item 1 cannot be dismissed at item 2, and
Cognizance and Dismiss case both correctly leave the list once item 1 is down. The rule
lives in `order-suggestions.ts` beside its justification, not inline in the render, because
it is a reading of the source and not a detail of a component.

**D51 · The auto-fill pass exists, and D40's reason for not having one was a
miscount.** *(owner ask, 2026-09-14; the spec's resolution order, step 3)* D40 concluded
that nothing could be auto-filled because "none of the twenty-seven references a general
variable", and built `fillGeneralVariables`, `OrderTemplateFacts` and `openSlots` — then
wired none of them. **All three were dead code for a day.** The conclusion came from
reading the six *name* rows of the spec's general-variables table. **That table has
thirteen rows.**

The five it missed are `[Party Type]`, `[Party Name]`, `[Document Type]`,
`[Hearing Purpose]` and `[Current Hearing Date]`, and the census tells the story:

| Token | Times used in the 27 | Decided as |
|---|---|---|
| `[Party Type]` | **15** | the judge's choice — D31's selector |
| `[Application Number]` | **6** | **auto-filled** (context) |
| `[Party Name]` | 5 | the judge's choice, and it follows the type |
| `[Document Type]` · `[Document Name]` | 3 · 3 | the judge's choice (master data · free text) |
| `[Hearing Purpose]` · `[Application Type]` | 2 · 2 | **auto-filled** (context) |
| `[Amount]` · `[Date]` · `[Mode of ADR]` | 2 · 2 · 2 | the judge's choice |
| `[Hearing Date]` · `[Original Hearing Date]` | 1 · 1 | **auto-filled** (context) |
| the discretionary deadlines, `[Notice Type]`, `[Plea]` | 1 each | the judge's choice |
| the six name variables | **0** | auto-filled, and used by no template today |

**The reconciliation is the decision, not the field list.** The spec says two things that
look contradictory — those variables are "auto-populated, the judge never types these",
*and* "the system cannot fill a variable that requires a **choice among options**". It
resolves on what kind of value each one is:

- **A single-valued fact resolves.** One court, one cause title, one case number, one
  presiding magistrate, one today. These fill always.
- **A choice does not** — and this is D40's real lesson, kept. `[Party Type]` is
  complainant *or* accused *or* witness; the spec's own rule is that with several
  candidates the system offers a selector. Filling those fifteen with a guess would put
  "Issue summons to the accused" in an order nobody had chosen, which is the exact bug
  D40 was written to kill.
- **A choice already made elsewhere on this screen is context, not a guess.** The spec
  names this separately: *"Application context — the Application Number and Application
  Type are already known, because the judge arrived at this order from the application
  itself"*, and *"Workflow context — variables the workflow already collected are
  pre-filled."* The bench answers applications and sets the next date **on this screen**,
  so those values are collected.

**And the application context is where D50 pays off twice.** A suggestion row already
says which application it came from — "Follows CMP/341/2026, allowed at this hearing" —
so the row carries that application to the click and the order opens on the number.

**D51b · The rule is "the order arrived from it", never "there is only one" — and the
first build got that wrong.** It filled `[Application Number]` from *the only application
standing on the listing*, reading the spec's "with one, it fills automatically" as
covering the application context. It does not: that sentence is about **parties**, and the
application rule is *"the Application Number and Application Type are already known,
because the judge arrived at this order from the application itself."* The difference is
not academic. **On the board's own h-245 the only application standing is one for
production of documents, so browsing a *withdrawal* order there opened it on that
number** — a wrong application named in an order, reading as perfectly finished text.
That is the single worst thing this pass can do.

So the candidate is type-matched through `APPLICATION_CONSEQUENCE` — the same grounded
pairing map D50 uses, which *is* the arrival written down (`applicationForOrder`). A
withdrawal order can only ever take a withdrawal application's number; two of one head
standing at once is ambiguous again and fills nothing; and with nothing to name one the
token stays open. **Naming the wrong application is far worse than naming none.**

**The honest other half: the composer now says what is still a hole.** Auto-fill's whole
justification is that an unresolved slot *keeps its name and stays visible*, so an order
that arrives part-written has to be legible as part-written. Each row in **In this order**
carries "3 details still to fill", and the live-region announcement names them, because
"its text is written" would tell a screen-reader user an order was finished with three
brackets standing in it. *(This is D32, finally built — it was an attribute row in §5a
with nothing behind it.)*

**D51a · A third date register, and the court's own pages set it.** A date inside the
operative words of an order takes neither of the two registers this app had. The order
pack writes *"Accused to appear on 12 August 2025"* and *"Call on 15 September 2025 for
Evidence of Complainant"* — no weekday. `Summons_Kollam_v14.pdf` makes the split on a
single page, printing "18 September 2026" in the sentence requiring the appearance and
"Friday, 10:30 AM" in the facts block above it. So `formatOrderDate` is for order text,
`formatCourtDay` stays for a named fact, and the split is the court's rather than a
preference. *Noted and not changed:* the next-listing block on the page still writes its
date with the weekday, which is correct for a named fact under D49 — but it means one page
carries two registers, which is right only for as long as that reasoning holds.

**What this does *not* do, stated plainly because it is most of the catalogue.** Fifteen
`[Party Type]` slots and five `[Party Name]` slots are untouched, which is every process
order and both payment orders. They need **D31's party selector**, and the census makes it
smaller than it looked: our model holds exactly one complainant and one accused, so the
spec's "with one, it fills automatically" means the selector only ever has to ask for the
*type* — the name follows it. On today's twenty-seven the visible effect of this pass is
`withdrawal-of-case` opening complete, and the two hearing templates when they become
reachable — template 6 is gated while a sitting is on and template 7 is application-only.

**A fixture had to be added for that one reachable path to exist at all.** No listing on
the board carried an application to withdraw the complaint, and `withdrawal-of-case` is
the only order in the dropdown whose template takes `[Application Number]` as a locked
variable — so the pass was correct and *invisible*. `h-258` now carries CMP/341/2026, a
§138 complainant who has been paid and does not wish to prosecute. It was a listing with
nothing pending, so no other screen's counts move.

**D51c · And one value it must not supply: `[Original Hearing Date]`.** The first build
filled it with today, reasoning that the listing being moved is the one in front of the
bench. Template 7 says otherwise — *"Next hearing scheduled on [Original Hearing Date] for
[Hearing Purpose] **has been rescheduled to** [New Hearing Date]"* — so the date being
moved is a **future** hearing's and today is merely the day the order moving it is passed.
Nothing on this screen holds it (a `ListingApplication` carries its number, filer, filing
date and reason, and no hearing date). It stays open, and when template 7 becomes
reachable all three of its values come from the rescheduling request.

**D52 · The catalogue is two tabs under the search: system orders and custom orders.**
Owner's ask, and the split it asks for already exists in the source rather than needing
to be curated into it. Twenty-five of the twenty-seven carry a BOTD line, arrive
part-written, and leave the judge filling what auto-fill could not. Two carry none —
**Order under section 202 CrPC** and **Judgement** — and the source says what that means:
"If an order type has **no template** ... the judge writes the order text from scratch —
or a dedicated screen handles it (e.g. Judgement)." Those two are the custom tab, together
with `others`, which is the one order that is not the court's at all and which is where
the quiet **Something else** button under the groups went. So the predicate is
`hasTemplateText`, read off the text and not kept as a list of two ids: a template the
court later fills in stops being a write-it-yourself order without anyone remembering to
move it.

Three things follow, and each is the reason to prefer this line over a nicer-sounding one.
**Each type is listed in exactly one place** — the group counts drop to 5 / 5 / 10 / 5,
because a row in both tabs would make the tabs mean nothing. **Both tabs answer the search
above them**, which is what the tab counts are for: a typist searching "202" reads
*System orders 0 / Custom orders 1* and clicks, rather than reading an empty list and
concluding the catalogue does not have it. The counts are match counts while a query
stands and the catalogue's own size at rest, and on the system tab the number is the sum of
the four group counts below it, so the tab carries the total and each group carries its
share — the same fact at two grains, not twice. **And the rows are one component**
(`CatalogueRow`), so the two tabs cannot drift into two row designs; a ruled-out type keeps
its words and loses its button in both.

*Treatment:* the DS `Tabs` `line` variant — underline and teal, no well, no second white
pill. The panel's own Orders / Applications pair is the default pill-in-a-well directly
above, and a second identical switch inside it would read as its sibling rather than as
something under it. No band rule beneath the list: the variant's accent bar sits 4px clear
of it, so a rule would draw the second parallel line ui-craft §2 names rather than the one
the bar lands on.

**D53 · An answered application keeps its row. Reverses "the answer is in the order, so
the row can go."** Owner, 2026-09-14: *"why did the pending applications got removed from
the application tab, please add it back."* Nothing had removed them — **answering them
had**. The panel listed only what was still pending, on the reasoning that the order
beside it is where the bench reads what it has done. That is true of the *sentence* and
false of the *panel*: the row vanished, the count dropped off the tab, and
"No application is standing in this matter." stood on a matter where two had been standing
a second earlier. A panel that erases the thing you just acted on cannot be told apart
from one that lost it.

Reachable two ways, which is why it reads as a disappearance rather than as a
consequence. A press of Accept or Reject empties the strip one row at a time; and
`initialOrderDraft` answers **all** of them the moment a listing is completed (D23), so a
completed listing opened the tab already empty, having never shown the applications it had
decided. The second path is the one with no press behind it at all.

*Shape:* the pending list keeps the owner's heading and its cards unchanged, and an
**Answered in this sitting** group follows it under a caption eyebrow — subordinate,
because the group above it is the work. The row keeps the title, the number and View, and
gives up the two marks that meant *this needs you*: the amber leading bar and Accept /
Reject. The Pending chip is replaced by the outcome as a word in its own ink — the
treatment this screen already uses for Absent, which is how the panel keeps **one** chip
and it is the one that means somebody is waiting. **Allowed / Dismissed**, not Accepted /
Rejected: the split `ListingApplicationDecision` already documents, controls in the
reference's words and outcomes in the court's. The leading edge keeps a transparent
`border-s-4` so both groups' titles start on the same pixel. The empty line now splits in
two, because a matter that never had an application and a matter whose applications have
all been answered are not the same empty.

*Open, for the owner:* there is no way back. An answered row cannot be un-answered, so a
mis-press is corrected by editing the sentence in the order rather than by the control
that wrote it.

## 5a. Attributes (value → source → type → slot)

Pass 9's census, and the record that makes the template system auditable: a row with no
source is an invented attribute; a fact typed `product copy` is a sentence doing a field's
job.

**(a) The spec's thirteen general variables, plus context — and which side of the
auto-fill pass each one falls on (D51).** **Slot: none for the filled ones** — they
resolve into the generated text and take **no** `prefilled` treatment (D31). *The
"absent today" notes are gone: all nine single-valued facts are supplied by
`orderTemplateFacts`.*

| Value | Source | Type | Auto-filled? |
|---|---|---|---|
| `[Court Name]` | `CURRENT_STAFF.court` | data | **yes** — used by no template today |
| `[Case Name]` · `[Case Number]` | `causeTitle` · `hearing.caseNumber` | data | **yes** — used by no template today |
| `[Current Date]` · `[Current Hearing Date]` | the sitting's day, in the order register | data | **yes** — used by no template today |
| `[Judge Name]` · `[Judge Designation]` | `PRESIDING_MAGISTRATE` | data | **yes** — never `CURRENT_STAFF`, which is the seat at the keyboard |
| `[Complainant Name]` · `[Accused Name]` | `hearing.parties` | data | **yes** — used by no template today |
| `[Application Number]` · `[Application Type]` | the application the order **arrived from** — the suggestion row's, or type-matched via `applicationForOrder`. **Never "the only one on the listing"** (D51b) | data · closed enum | **yes, context** — 6 uses · 2 uses |
| `[Hearing Purpose]` | `draft.nextPurpose`, set in Next hearing | closed enum | **yes, context** — only once the bench has set it |
| `[Hearing Date]` | `draft.nextDate`, set in Next hearing | data (date) | **yes, context** |
| `[Original Hearing Date]` | the **future** hearing being moved — not this sitting | data (date) | **mapped, never supplied here** (D51c) |
| `[Party Type]` | case data | closed enum — complainant · accused · witness | **no — a choice.** 15 uses; D31's selector |
| `[Party Name]` | *"any person in the case — complainant, accused, witness, or PoA holder"* | data | **no — follows the type.** Our model holds one of each, so the selector need only ask the type |
| `[Document Type]` | master data | closed enum — **values not enumerated in the spec (§12)** | **no — a choice** |

**The census is a test, not a table** (`order-autofill.test.ts`). Every token any of the
twenty-seven uses must be either in the pass or on the test's declared list of judge's
choices; a template that introduces an unclassified one fails the suite rather than
shipping a bracket nobody fills.

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
| Unfilled-slot count, per order | `openSlots` over the item's own words | data | the item row's caption — "3 details still to fill" (D32, built by D51) |
| Honesty and empty-state copy, disabled reasons | this brief | **product copy** | support lines — *guidance, deliberately not in (a) or (b)* |
| **Suggestion rank, per order** | **derived: purpose table + `listing-applications.ts` + `OrderDraft.marks` + `OrderDraft.items`** | **data (ordinal)** | **position in the `ol` (D50)** |
| **Suggestion ground** | derived — the same four signals | closed enum — allowed application · party absent · order chain · pending application · purpose table | the row's caption, one fixed sentence per ground (D50) |
| Items already of this type | `OrderDraft.items` position | data | the same caption — "Already item 2" (D50) |

**Four rows are the finding.** *Suggestion ground* is the row that has to be read
carefully: it is a **closed enum of five, each with one fixed sentence and at most one
slot** — an application number, a party, an item number — and that is what keeps D50 on the
right side of §1.6 of `ui-craft`. A caption composed per case would be a machine result
rendered as prose, which is the thing that cannot be filtered, sorted, or reused; five
sentences from a closed enum is a status rendered through one slot. **The rank beneath it is
data and not copy**, which is why it is spent on position rather than on a word like
"strongly".

**Three rows are the older finding.** *Business line* and *full order paragraph* start identical
and diverge — one generated and frozen, one free — which is the whole of D33, and why they
are two rows and not one. And *"In dropdown" availability* has a source that exists in the
app but not on this screen's model, which is why D29 fails open and D29(c) is a build
requirement.

---

**D40 · The catalogue is built, and it is the court's.** *(problem 15; D27 executed)*
`lib/employee/order-templates.ts` carries all twenty-seven types from
`docs/product/order-templates.md` — BOTD text, locked and optional variables, the
"In dropdown" gate, and the workflow each one sets in motion. `order-items.ts` is now a
thin layer over it and no longer holds a sentence this app wrote. ~~**Nothing is
auto-filled on arrival, and that is the source's design, not a shortfall:** none of the
twenty-seven references a general variable~~ **— wrong, and corrected by D51 on
2026-09-14. That was read off the six *name* rows of the spec's general-variables table,
which has thirteen.** An order still opens with its *choices* standing —
`[Party Name]`, `[Amount]`, `[Date]`. The old build wrote
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
were showing. **(Superseded in its first limb by D50, 2026-09-14: the shortcut is now
ranked off the sitting rather than off the purpose alone, and the workflow caption survives
only on the rows no signal moved.)** Then **the whole catalogue**: a search field over four standing groups —
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

**Hierarchy.** One page title. Section headings `text-body-compact font-semibold`. **One
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
| Page title / matter facts | `h1` `text-title font-semibold` · facts row `text-body-compact` throughout (labels `font-medium text-muted-foreground`) |
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

**Raised by D51, 2026-09-14 — the auto-fill pass.**

- **D31's party selector is now the blocking gap, and it is the largest one left.** Fifteen
  `[Party Type]` slots and five `[Party Name]` slots stay bracketed — every process order
  and both payment orders. **The census makes it smaller than it looked:** our model holds
  exactly one complainant and one accused, so the spec's *"with one, it fills
  automatically"* means the control only ever has to ask for the **type**, and the name
  follows. One `Select` per positional `[Party Type]`, three at most in any one template.
  Worth confirming before it is built, because it turns on the claim that a §138 listing's
  party set is (complainant, accused, witnesses) and nothing else.
- **Does `[Application Type]` want the head or the head without its prefix?** The two
  templates that use it read "Application [Application Number] for [Application Type] is
  accepted", and our heads are phrased "Application for case withdrawal" — which would
  render "Application CMP/330/2026 for Application for case withdrawal". Both are
  application-only templates and therefore unreachable on this screen today, so nothing is
  broken; the pass maps the head verbatim rather than inventing a de-prefixing rule.
- **Template 7's `[Hearing Purpose]` is not template 6's.** Template 6 means the *next*
  listing's purpose, which this screen sets and fills; template 7 means the purpose of the
  hearing being *moved*. A single token-to-value map cannot tell them apart, and template
  7 is application-only so nothing renders wrong today. If the rescheduling order ever
  becomes reachable from this screen, the pass needs to be per-template — worth knowing
  before someone ungates it.
- **Should one page carry two date registers?** D51a takes the split from the court's own
  summons — "18 September 2026" in the operative sentence, "Friday, 10:30 AM" in the facts
  block. The next-listing block on this page therefore keeps its weekday while order text
  drops it. Correct under D49's reading that the next listing is a *named fact*, and the
  first thing to revisit if the page starts to look inconsistent rather than conventional.

**Raised by D50, 2026-09-14 — the suggestion's own refusals to guess.**

- **What answers an absence the purpose table has no row for?** The accused absent from a
  **plea** hearing is the sharp case: rows 5, 6 and 9 answer absence with Issue of warrants
  and row 7 names nothing, which is probably a gap in the table rather than a rule about
  pleas. The ranking therefore stays silent there. **One line from product settles it**, and
  `WARRANT_ON_ABSENCE` in `order-suggestions.ts` is a list precisely so that adding a purpose
  to it is a decision somebody makes on purpose.
- **And a *complainant's* absence?** Not answered at all, because a warrant is process
  against the person the court required to attend and is not the complainant's remedy to
  borrow. `dismiss-case` is the obvious candidate and the catalogue gates it to *before*
  cognizance, so post-cognizance there is nothing in the twenty-seven to reach for. Either
  the catalogue is short a type or the consequence is not an order — we are not guessing
  which.
- **Does an allowed application draw its consequential order automatically?** Today the
  bench allows the application and then chooses the order, with the suggestion putting it
  first and saying why. Six pairings are mapped, each off the template's own words or the
  source's table (`APPLICATION_CONSEQUENCE`). If product wants the order *pre-added* rather
  than suggested, that is a different decision and a bigger one — it writes a judicial act
  from a click on a different control.
- **Does the order pack's reading of the summons gate hold generally?** D50a resolves a
  flat contradiction between the spec's gate and its own purpose table using DOC-ORD-001.
  **We think it is plainly right and it is still our reading, not the spec's** — worth
  confirming, because it is the difference between the register's first order being writable
  on this screen and not.

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
| 2026-09-15 | **D65: the page, the card and the catalogue come back into the flat shell — and the page takes two thirds of it.** Owner, on the reverted screen: the right side as it was right before the revamp, the application cards yellow on the left edge only rather than the whole card, and the Order items section as it was. All three existed at `973a485`, so this is restoration: the page (`OrderPaper` with the masthead facts, the party roll, the appearance rolls, the single ruled body, the next-listing lines and the signature block), the card at `border-s-4 border-warning bg-surface-sunken` instead of a full `bg-warning-muted` fill, and the catalogue with its System/Custom tabs, counts, search and the likely-at-this-hearing strip. Built by taking `973a485` as the base and dropping D64's flat shell into it rather than patching D64's file, and restoring the seven order libs wholesale — so the open column now carries the newer components. **Kept from D64 deliberately, because a wholesale restore would have undone them:** the four role grids, the next-hearing block, the header colon, the focus recovery on the row's own Reject/Accept, and the catalogue copy that no longer promises finished text. `AnsweredApplications` returns with the card, which is what puts an answered application back on the panel. **The one real trade-off, and the owner chose it: the page wins the width.** `973a485` gave the page two thirds; D64's shell gave it half. They cannot both hold, because a third of the canvas is ~336px inside, which makes a four-column track ~72px and the label ~48px against ~90px for "Complainant" unbroken — it would break mid-word on every listing. So the page is back at two thirds and **the roll is a 2x2 block at any width**. Recorded in `MarkGroup` itself so nobody restores four-across from the reference picture: four across was never the shape most screens got, since even at `2xl` it cleared the overlap only to take the advocate labels to three lines until ~1700. **And "The order records it." is true again** — the restored page renders each answered application as its own paragraph off `buildOrderDocument`, proven against the fixtures, so D64's honesty defect is fixed at the root rather than by softening the sentence. The sign warning stays D64's wording: the page returning changes what is *shown*, not what is *done*, and Submit still only records how the order is to be signed. Gates pass, 764 tests pass, and the served DOM verified at thirds with the page spanning two, the card carrying the left edge and no amber fill, the tabs at System 25 / Custom 3, and the roll at two columns; render checked at 1536. **Unverified:** dark theme, still unreachable from a headless capture; and the answered-application row and its sentence need a click, since every fixture that carries an application is `scheduled`. **One thing that is not ours:** a teammate's uncommitted bulk-reschedule work landed in this checkout mid-task (+~300 lines and the 764th test). Left untouched. | owner (direction), ui-designer (build), coordinator (split) |
| 2026-09-15 | **D64: the whole order screen goes back to the flat two panels.** Owner, on a screenshot of the pre-accordion screen: *"we will be going back to this design layout."* Offered as left-panel-only or the whole screen with the costs listed; the owner chose the whole screen. **The screenshot was `7a80293`, not `origin/design`** — the visible copy is identical between them, and the only tells are markup: the roll's `xl:grid-cols-4` and the editor's `min-h-64`. Worth recording, because matching the wrong one of two neighbouring commits is invisible in a diff of strings. Out: the accordion, the inline page, the likely-at-this-hearing strip, the System/Custom tabs, the answered rows. In: one open column with hairline rules, the four role grids, the next-hearing block, and an Order text panel of read-only attendance, per-item wells and read-only next hearing. **Three deliberate departures from a literal revert.** The court's 27 templates and their product doc were kept and the catalogue driven off them rather than resurrecting the 17 this app invented — deleting real product data to restore a layout is a product regression, not a visual change. The header's `Order : ` lost its stray space, the same fault D62 had just fixed in the other direction. And the footer kept *Send to sign order* rather than the reference's Save as draft / Preview PDF, because removing the only signing entry point is an action-scope change nobody asked for. Cost, stated and accepted: 763 tests to 735, the 25 lost with `order-suggestions.ts`, which nothing imported once the strip left. **Independent review found five things, three of them honesty rather than polish.** `assembleApplications` was called nowhere, so *"The order records it."* was a claim about a legal act with nothing behind it — and worse on a completed listing, where every application arrives pre-answered and the typist sees no trace any existed. The sign button warned that signing publishes the order and then announced that nothing had been published, on the one screen in `/employee` where the signer sees no document. The catalogue promised text for three templates that have none. Answering from a row dropped focus to `<body>` on *every* answer, not just the last. **And the four-across roll did not wrap, it overflowed** — at 1280 with the rail expanded, the default state, "Complainant" painted over the next column's checkbox on both rolls. Caught on a render after both the build and my own framing had it as a three-line wrap; `grid-cols-4` is `minmax(0,1fr)` and cannot grow. Moved to `2xl`, and `wrap-break-word` added as the guard rather than the fit, because this app ships per state and a Malayalam or Hindi role label is longer than the English one. Superseded in part the same day by D65. | owner (direction), ui-designer (build), ui-reviewer (findings) |
| 2026-09-15 | **D63: the panel opens on the roll, always.** Owner's ask. It opened on the applications whenever one was standing, on the reasoning that a party waiting for an answer outranks everything else — true about the *matter*, wrong about the *work*: a typist arrives to record a sitting that has just happened and the first thing in hand is who answered the call, so the common case (a roll to mark, no application to decide) started with a press. Nothing is hidden: the Applications row states its own count while closed, which is what the section summaries are for, and answering the last application still walks the panel on to the roll (D59). Not seat-conditional — the composer does not read the seat, and a branch for this would be more machinery than the change. Gates pass, 763 tests pass (a teammate added 21), and both a listing with two pending applications and one with none verified opening on Attendance. | owner (direction), ui-designer (build) |
| 2026-09-15 | **D62: the facts line is label:value, and *"Today for"* becomes *Purpose*.** Owner: it read *"Case ST/241/2026"* where it should read *"Case: ST/241/2026"* — two loose words that make the reader work out that the first is a heading for the second. The colon lives in the markup rather than in the label string, because the label is the name of a fact and the punctuation is how this line chooses to show it: the same split the next-listing block on the page already makes, and the same `gap-x-2` with `gap-x-6` between pairs, so a 3:1 ratio is what binds a label to its own value. **The colons are what forced the relabel**: "Today for: Evidence of complainant" is a preposition wearing a label's punctuation, and the row cannot carry three label:value pairs and one sentence fragment. Nothing is lost with "today" — the composer only opens on a listing from today's board and the page beside it prints the date in its own masthead. Two smaller things in the same breath: the `h1` read *"Order : …"* with a space before the colon, the same fault in the other direction; and the label is emitted as one template string so the DOM carries "Item:" rather than React's `<!-- -->` separator between the expression and the punctuation. Gates pass, 742 tests pass, all four labels verified on the served DOM. | owner (report), ui-designer (build) |
| 2026-09-15 | **D60b: the draft glyph is a page with a pen on it.** Owner, on seeing the red plate. I had reverted `FilePenLineIcon` an hour earlier on the reading that *"the icon is correct"* meant leave the glyph alone; it meant the placement. Restored, and it makes the column better than the plate alone did: **three glyphs, one per state** — plain page not started, page-and-pen being written, page-and-check recorded — so the state reads without the colour, and the plate becomes emphasis on the one state that wants it instead of the only thing carrying the meaning. A mark that needs its colour to be read is a mark that fails the reader who cannot see the colour (ACCESSIBILITY §3), and this column now passes that on the glyph alone. Gates pass, 742 tests pass. | owner (direction), ui-designer (build) |
| 2026-09-15 | **D61: opening an order marks nothing. Reverses the typist's entry-marking, and with it the pre-written composer.** Owner: *"whenever I click on an order icon and land in the order page, on default the order is already typed out. That shouldn't happen."* Traced to one line in `hearings-screen.tsx`'s `openOrder`, which called `markHearingEnded` on the way in — and whose own comment said it was for exactly this effect: *"it opens already knowing the sitting is over, so the order it opens on is the finished one rather than an empty composer."* `initialOrderDraft` reads the **live** status, so the trip made every listing `completed` at the instant of arrival and D23 wrote the whole order — roll called, applications allowed, a paragraph per purpose — before the typist had touched anything. **D23 itself is untouched and right**: a listing the fixture ships as completed still opens on its written order (verified: h-254 prints *Present: Complainant, Advocate for the complainant, …*, h-241 prints *Not marked*). The second fault was quieter and worse: Completed is a claim about a sitting and opening a screen is not one — a status set by navigation breaks this area's own rule that nothing may quietly imply a fact nobody entered. **Nothing replaces it, because nothing needs to:** D60a's draft mark already shows every listing the typist has actually dictated on, so the trail is drawn by work that exists rather than by a trip that happened, and a listing opened and left shows no mark — which is the truth about it. That is also why this only surfaced now. Cost, stated: the row no longer flips to Completed when the order screen is opened. Gates pass, 742 tests pass, `onOpenOrder` left on the table and the button as the optional hook it always was. | owner (report), ui-designer (build) |
| 2026-09-15 | **D60a: the Draft column is out; the draft is a red plate on the icon that was always there.** Owner: *"we don't need a draft column … the icon has a square, roundish background with a red colour to show that this is in draft state."* The column was the wrong instrument twice: it put the answer in *which* of two adjacent 72px cells an icon sat in — a single channel, and the one that makes a reader track a row back to a header — and it cost 72px of a table measured to the pixel, which is why only the typist's seat could have it. **Marking the glyph costs nothing, so both seats get it**, which closes the open question D60 had to raise. The plate is the DS `destructive` button's own pair, `destructive-muted` under `destructive-muted-foreground` at `rounded-lg` on the existing `size-icon` control: the glyph measures **4.54:1** on its own fill in light and 7.75:1 in dark, and `hover:bg-destructive-muted-hover` is the class the DS button itself uses. Applied as classes rather than by switching to `variant="destructive"`, so the control stays a quiet `ghost` in every other state and the focus ring does not become the destructive one — that ring says "this press destroys something" about a press that opens a draft. `FilePenLineIcon` reverted: the glyph was called correct, so the plate is the only thing the draft state adds. Recorded keeps `success-ink` and no plate; two plates in one column would stop either meaning anything. *Noted once and not re-litigated:* red is the destructive family here and a draft is unfinished rather than wrong — the mark is unmistakable, which is what was asked for. Gates pass, 742 tests pass, and the served DOM is back to seven and eight columns with no Draft header and a matching `colSpan`. **Still unverified and still open:** the plate needs a draft to render, which needs a click; and the store dies on a reload, so the mark is true for a sitting and gone after a refresh. | owner (direction), ui-designer (build) |
| 2026-09-15 | **D60: the cause list gains a Draft column, and a started order moves into it.** Owner's ask, off the typist's own loop — into the order, mark the roll, post the matter on, out, next item — where coming back to the board the question is not "which of these can I write an order on" (all of them) but **"which have I already started"**. Two narrow adjacent columns answer that as a step pattern down the table, legible without tracking each row back to a header. **The state is in the glyph and the name too, not only in the column**: `FilePenLineIcon` and "Resume draft order for item N, …" — position is a single channel, and the phone row has no columns at all, so there "Open order" becomes "Resume draft". The draft keeps `foreground` rather than a third ink; `success-ink` is earned by *recorded*, which reports an outcome, and a row already carries a status chip (ui-craft §1.4). **The test is a key in `order-drafts.ts`, which means the typist actually entered something** — `useOrderDraft` writes only through `setDraft` and never on mount, so opening a composer and leaving records nothing; and it is *not* "would this listing open with text", since a completed listing opens on a written order out of `order-demo.ts` with no key (D23). A draft outranks recorded in the glyph: unsaved editing is the more urgent of the two. **Typist's seat only, and the reason is the measured width**: the bench's table was cut 1182px → 1086px precisely to fit this court's laptop widths, and +72px puts it back over at every one; the typist's has no Action column, so it goes 878px → 950px and still fits, rail open or folded. New `useOrderDrafts()` beside `useOrderDraft`, same store and same subscription, so the board and the composer cannot disagree. Gates pass, 742 tests pass, and the typist's table verified on the served DOM at 8 columns ending Orders / Draft with a matching `colSpan`, the bench's unchanged at Orders / Action. **Unverified:** the populated state needs a click — nothing can seed a client module from a curl. **Open for the owner:** the store dies on a reload, so the column is true for a sitting and empty after a refresh (persistence is real work); and the bench drafts too, with no marker in that seat — either give it the column and accept the scroll, or collapse both columns into one cell that carries the state inside it. | owner (direction), ui-designer (build) |
| 2026-09-15 | **Footer primary is “Send to sign order”.** Owner on the live CTA: rename *Sign order*. The overlay is still Add signature; the rail queue is still Sign orders. The new name is the honest one for D10 — this press sends the draft toward signing, it does not sign. | owner (report), coordinator (build) |
| 2026-09-15 | **Header matter facts are 14px throughout.** Owner, on the live Item / Case / Stage / Today for row: *"all the size of the text needs to be 14px and not 12px like it is now."* The values were already `text-body-compact` (14/20); the labels were `text-caption` (12/16). The whole pair now sits on `text-body-compact`; labels keep `font-medium text-muted-foreground` so they still read as labels. D58's caption-for-labels rule stays in the sitting panel — this is the header subtitle, not a panel field label. | owner (report), coordinator (build) |
| 2026-09-15 | **D58a: the four section titles drop to 14px.** Owner, on the sitting panel: the accordion headers (*Applications*, *Attendance*, *Next hearing*, *Orders*) *"seems to have 16px size, rather it should be 14px."* Amends D58's last exception — *"the only 16px left in the panel is the section row's own title"* — so the panel now has **no 16px type**: titles and content share `text-body-compact` (14/20), labels stay caption (12/16). Open/closed still differs by weight (`font-semibold` / `font-medium`), not size. Measured 14px on the served DOM at desktop and ~375px, both themes. `verify:ui` green. | owner (report), ui-designer (build) |
| 2026-09-15 | **D59: the panel walks the sequence — the last answer opens the roll, the complete roll opens the next posting.** Owner's ask, and it reverses the accordion's own standing line that it *"moves when you move, never on its own"* — which is the owner's call to reverse. Built as two **edge-triggered** hops inside the action handlers, deliberately not as an effect: "is this section finished" is a *state*, and an effect reading it would re-open the next section on every render and pin the typist out of the one they had come back to; the question an event can answer is "did this press finish it". Both hops are guarded on the current section, so they only move someone standing in the section that just finished — going back from Orders to change an answer does not march you forward again. This is **not** D16, which folded the roll *for* you once it was marked and was reversed for buying nothing on arrival: nothing here folds, and nothing fires without a press. Complete means *every* appearance answered, so one mark does not eject you, and unmarking never advances. Focus follows to the new section's heading — where before what — and the live region says the panel moved. `ListingApplicationDialog`'s `onReturnFocus` had to follow too: Radix restores focus on close, i.e. *after* the advance, so its hard-coded Applications heading would have dragged the reader straight back out of the section the answer had just opened. **Accepted:** correcting a mark on a finished roll re-completes it and advances again; a hidden "only the first time" would make the panel look broken on the second. **Not inferred:** no hop from Next hearing to Orders — a posting has two ways to be done (purpose and date set, or not being listed at all) and the owner's chain stopped at the posting. Gates pass, 742 tests pass, page renders 200 and opens on the right section for both fixtures — but **the interaction itself is unverified**: it needs a click, and this screen has no component tests. | owner (direction), ui-designer (build) |
| 2026-09-15 | **Review pass, then three fixes — and the review's own diagnosis of the first one was wrong.** `ui-reviewer` audited the accordion, then `ui-designer` fixed. **(1) The checkbox rows.** The review read the target as ~20px; `checkbox.tsx` in fact already carries `after:-inset-x-3 after:-inset-y-3`, so each 16px box claims exactly the 40px §8 asks for. The real defect was geometric: a 20px row on a 12px gap is a **32px pitch**, so eight correct 40px claims *overlapped by 8px* and the winner of an overlap is paint order, not aim — a tap near a boundary could mark the advocate present when the party was meant, which is a wrong line in a court record. Fixed by widening the rows to `min-h-10` with the label filling them, and dropping the now-redundant `gap-3`: **116px → 160px per roll, not 196px**, +88px for the section and +20px for *List it again*. Raised upstream as **ds-requests #24** — the primitive cannot see the row it was put in, `check:spacing` reads the ladder rather than geometry, and the box measures 40px to any tool that asks the control instead of its neighbours. **(2) Duplicate accessible names** — the four roles are asked twice, so *Complainant* named two controls. Each box now takes `aria-labelledby` pointing at its own label **and** its group heading ("Complainant Who is present"), which keeps the spoken name starting with the visible word (§9) rather than inventing an `aria-label`. **(3) Two false comments** — the file's top doc still said the catalogue sat "behind the second tab", and `PaperBlock` claimed its `tabIndex={-1}` headings still took focus; nothing had focused them since the editors left the paper, so the attribute went with the claim. Verified independently: `verify:ui` green, **742 tests pass** (739 + 3 a teammate added), and the eight rows, eight composite names and absent `tabindex` read off the served DOM. **Still pending:** no visual render — no browser here, so 375px, dark theme and a keyboard walk are unconfirmed. | ui-reviewer (audit), ui-designer (build) |
| 2026-09-15 | **D58: the panel is two type sizes, and every section obeys them.** Owner: the Applications and Attendance sections are consistent, *"however, for the next hearing, suddenly the text sizes differ"* — and the same in Orders. Measured, and it was labels rather than body: anything labelling a group already wore the caption voice (`text-caption` 600 muted, 12px) while anything labelling a *control* wore the DS field default (`text-body` / `text-body-compact`, medium, foreground). Right on a full-width form; in a 410px column "Search orders" at 16px was louder than "Likely at this hearing" directly above it. So the rule is now flat: **a label is caption, content is `text-body-compact`, and the only 16px left in the panel is the section row's own title.** Moved: `Purpose of hearing`, `Next date of hearing`, `Search orders`, and four empty-state notes that were sitting at `text-body`. `QueueSearchField` gained an optional `labelClassName` rather than changing for everyone — it has ten-plus callers, all page-level filter rows where 16px is correct, and `/employee/hearings` was re-checked on the DOM to confirm it still reads `text-body`. Gates + 739 tests pass; both sections' type roles listed off the served DOM. | owner (report), ui-designer (build) |
| 2026-09-15 | **D57a: the roll headings are a labelled group, not `fieldset`/`legend` — the third time that pair has cost something here, and the last.** Owner: the rolls looked *"cut off abruptly."* They were: a rendered `<legend>` is placed in its fieldset's **border** area rather than in the content flow, so it is not a flex item — `display:flex` and `gap-3` on the fieldset separated the list from nothing and the heading sat flush on the first checkbox. The same quirk had already forced the divider onto a wrapper (`border-t` on a fieldset draws the rule *under* its legend). `role="group"` + `aria-labelledby` on the div that already carried the divider keeps the semantics — the heading still names the set of boxes — and obeys the layout it is given. Taken with it: sentence case and no tracking, matching *Pending applications* and *Answered in this sitting*, so a group label inside the panel has one treatment and the uppercase eyebrow stays the paper's. Gates + 739 tests pass; no `fieldset` or `legend` left in the section, both groups labelled, `gap-3` now on the element that holds the heading. | owner (report), ui-designer (build) |
| 2026-09-15 | **D57: the roll is called by the answer — two rolls, four parts of the cause in each.** Owner's ask, with the four options given: Complainant, Complainant's advocate, Accused, Accused's advocate. Replaces the one three-state control per person (D46), which was correct and read as four identical rows of chrome — the roll's shape was invisible, and a court calls a roll the other way round: it asks who is here and hears names. **Not the 1.0 screen's two grids, and that difference is why this is safe:** there, present and absent were two independent maps and the complainant could be ticked in both. Here both groups read and write one mark per appearance — a tick under *present* leaves the *absent* box unchecked because they are the same fact asked twice, and unticking clears rather than flips. Contradiction is not validated against; it is not representable. Labels come off `side` and `kind`, never by parsing `role` — so the paper keeps the sentence register ("Advocate for the complainant is present") and the panel gets the short control label, the same split `ListingApplicationDecision` documents. A side with two counsel on record puts the name back on the label; a side with no vakalat has no row. **The trade, stated:** every part of the cause now appears twice, so the open section is roughly 48px taller than the per-person control was. Gates + 739 tests pass; both legends, eight boxes, the four labels and the single divider verified on the served DOM. | owner (direction), ui-designer (build) |
| 2026-09-15 | **D56a: the panel gets its air back between groups, not inside the cards.** Owner: *"there is not a lot of spacing between elements."* D56 took 104px out of the two cards and the tightening had landed in the wrong places as well — so this adds it back where it separates things and nowhere else. Rows `py-1`→`py-2`: 4px a side put each hairline almost against the words above and below it, four rows reading as one block of text with lines through it; 8px makes a closed row the 56px list row it is. Section body `pb-2`→`pb-4`, because asymmetric padding under `pt-4` made an open section lean into the next one. Group label→list `gap-2`→`gap-3`, matched across *Pending applications*, *Answered in this sitting*, *Likely at this hearing* and *In this order*. Card list `gap-2`→`gap-3`, while the Orders tiles keep `gap-2` — spacing between items scales with the items, and 8px between two 106px cards reads as one block rather than two decisions. **+48px in total, so the pair of changes is still 56px shorter than before D56.** Gates + 739 tests pass; every value verified on the served DOM. | owner (report), ui-designer (build) |
| 2026-09-14 | **D56: the pending card loses its status chip, and the strip loses a filled control. Amends the owner's own 2026-09-13 layout.** Owner: the cards were *"ridiculously huge"*, and the group wants the subheader **Pending applications**. The two are one change: with the status named once over the list, the chip on every row is the alarm-fatigue failure rather than a status — the section row already counts them and the amber leading bar already marks each one. Dropping it takes a line and a gap; `p-4`→`p-3`, `gap-3`→`gap-2` and `size="sm"` take the rest: **158px → 106px per card** by the class values, ~104px across the pair. Nothing is lost to colour alone (ACCESSIBILITY §3) — "Pending" is still on screen, once, over the group. The chip had its own line for a real reason ("Pending — Application to reschedule/adjournment" wrapped the title under a word that was not part of it); removing the prefix serves that reason better than giving it a row. **Reject goes `destructive` → `destructive-ghost`**: one filled control per card instead of two washes, the word still in destructive ink, and its hover is `destructive-muted` so it works on a sunken card where plain `ghost` measures 1.03:1 (ds-requests #21). Answered rows took the same metrics so the two groups agree. Gates + 739 tests pass; verified on the served DOM. | owner (report), ui-designer (build) |
| 2026-09-14 | **D55: back to the four sections. Reverses D45 and the two tabs with it.** Owner: *"we will go back to the old design we did on the left panel where all the options were there in an accordian."* Restored from 95f5bea — `SectionId`, `SECTIONS`, `sectionSummary` and the `Collapsible` rows — not rebuilt, and **only the panel**: the shared container and the sunken surround the owner removed later stay removed, so the accordion sits in the floating panel on the canvas. Everything the sections hold is the current build, not the old one: the per-person three-state roll rather than two contradictory checkbox grids, the catalogue's System / Custom tabs and ranked suggestions (D52), and the answered-application group (D53) — whose fact the closed row now carries as "All answered". **The two editors write live and lost their Apply**: the row's summary can only be true if the mark is already in the draft, and the owner had already ruled out the per-section press. The paper is output again — no `Mark attendance` / `Set next hearing`, since two entry points to one editor is what put ~400px of form on the page at arrival, which was the owner's other standing complaint. Gates + 739 tests pass; all four sections verified open on the served DOM. **Lost, and flagged:** the `Pending applications` and `Workflows & templates` headings, which are now the section rows' own titles. | owner (direction), ui-designer (build) |
| 2026-09-14 | ~~**D54: the next-hearing values take the weight and the labels step back**~~ — **built and reverted on the owner's verdict the same hour.** Owner: *"the weight of that text is very light"*, then *"No revert"*. The diagnosis stands and is worth keeping: the values are `text-primary`, which is `--brand-solid` (`#007e7e`, **4.90:1** on the page) — a fill colour carrying type — against labels at `foreground` (**17.35:1**), so at equal weight the fact reads as the faint half of its own line. What was rejected is the *remedy*: moving the mass to the value and muting the label. Read against D44's lesson, the likely reason is the same one — the change did two things at once (the value gained weight **and** the label lost it), so the block's whole balance shifted rather than the one half the report was about. D49's bold label over a teal value stands. **Still open, and now without a local answer:** the ink itself, raised upstream as **ds-requests #23** — the brand family has no `*-ink` token while destructive, warning, success and info all do, so teal type on a white surface has only a fill colour to reach for. A token there fixes this line without touching its weights. | owner (report + verdict), ui-designer (build) |
| 2026-09-14 | **D53 built: an answered application keeps its row, under *Answered in this sitting*.** Owner reported the pending applications gone from the tab. Diagnosed: nothing removed them, answering them did — and `initialOrderDraft` answers every application the moment a listing is completed (D23), so that tab opened empty with no press behind it. Reverses the "the answer is in the order, so the row can go" reading. Answered rows drop the amber bar and Accept / Reject, keep title, number and View, and carry the outcome as a word in its own ink (Allowed / Dismissed, the court's words, per `ListingApplicationDecision`) so the panel keeps one chip and it is the one that means somebody is waiting. Empty copy split in two. Gates + 739 tests pass; both groups verified rendering together on the served DOM under a temporary probe, since no fixture listing is both completed and carrying applications. | owner (report), ui-designer (build) |
| 2026-09-14 | **D52 built: the catalogue splits into System orders and Custom orders, two `line`-variant tabs under the search.** Owner's ask. The line is the source's own — `hasTemplateText`, twenty-five worded templates against the two the source gives no words for (Order under section 202 CrPC, Judgement) — so it is a reading of the catalogue rather than a curation of it, and a template the court later fills in leaves the custom tab by itself. `others` moves there too and the **Something else** button under the groups is gone: each type is listed once, so the group counts drop to 5 / 5 / 10 / 5. Tab counts are match counts while a query stands, which is how a search for "202" reads as *System 0 / Custom 1* instead of an empty list. Rows are one shared `CatalogueRow` across both tabs. Gates + 739 tests pass; tabs, counts and group counts verified on the served DOM. | owner (ask), ui-designer (build) |
| 2026-09-14 | **Masthead fold: built and reverted the same hour.** Owner: *"why did you put the case heading and parties into an accordian. That was never the ask."* Correct — the report was that the paper needed scrolling, and the answer hid content the owner had explicitly asked for two turns earlier (party roll, facts, offence line). A problem statement is not a licence to remove the thing that was requested. The gap and padding tightening from the same pass is kept; it hides nothing. **The measurement below stands and is the part worth keeping.** | ui-designer (owner report) |
| 2026-09-14 | ~~**The document masthead folds on arrival**~~ — D17's metric had regressed. Owner: *"the entire paper is barely visible on first fold and requires users to scroll."* Measured the first typing affordance at y≈845 on a 923px viewport; D17 had moved it from y≈815 to y≈450 in 2026-09-06 and D43/D45 put it back by stacking a court name, three facts, a party roll, an offence line and an ORDER heading above the writing — ~340px, none of it typed, every fact already on the page header. Folded into one 40px row that keeps the case number; page gap 6→4 and padding `p-8 md:p-12`→`p-6 md:p-8`. About 400px comes out. Preview and the signing queue still print the masthead in full. **Lesson for the log: y-of-first-affordance is a number this screen has to be re-measured against after any change to the page, because every addition to a document's furniture is invisible to the gates.** | ui-designer (owner report) |
| 2026-09-14 | **D51 corrected twice on review, both times for writing a wrong value into an order.** Asked whether it was built correctly, and it was not. **(a)** `[Application Number]` was filled from "the only application standing on the listing" — a rule read off the spec's *parties* sentence, not its application one. On h-245, whose only application is for production of documents, browsing a **withdrawal** order opened it on that number: a wrong application named in an order, reading as finished text. Now type-matched through `APPLICATION_CONSEQUENCE` (`applicationForOrder`), so a withdrawal order can only take a withdrawal application's number. **(b)** `[Original Hearing Date]` was filled with today; template 7's own sentence shows it is the date of a *future* hearing being moved, which nothing on this screen holds. Now left open. Both have regression tests naming the wrong behaviour. Also added the h-258 withdrawal application — without one there was **no reachable path on which the pass could show**, so it was correct and invisible. 743 tests, seven gates, verified on the served DOM. | ui-designer (self-review) |
| 2026-09-14 | **D51 built: the auto-fill pass, and D40's reason for not having one was a miscount.** Owner asked for the text box to be populated with the general variables on selecting a template. D40 had said there was nothing to fill and left `fillGeneralVariables`, `OrderTemplateFacts` and `openSlots` as **dead code** — the claim was read off the six *name* rows of the spec's general-variables table, which has **thirteen**. Wired properly: nine single-valued facts always, five context values when the screen has actually collected them, and the choices left standing. `orderTemplateFacts` in `order-draft.ts` (testable; a wrong value silently written into an order is not something a render test catches), `createOrderItem(type, id, facts)`, and the demo draft runs the same pass so one screen cannot have two answers to what an order opens on. **A D50 suggestion carries the application it came from**, which resolves the case a count cannot — two applications standing, and the row still knows which. **D32 built alongside it**, because auto-fill without a visible remainder is half a feature: each item row says "3 details still to fill" and the announcement names them. **D51a** adds a third date register off the court's own pages. **Stated plainly: 15 `[Party Type]` slots are untouched** and need D31 — filling them with a guess is the exact bug D40 existed to stop. 739 tests (26 new, including a census that fails if a template introduces an unclassified token), seven gates. | ui-designer (owner ask) |
| 2026-09-14 | **D50 built: the shortcut reads the sitting.** Owner asked for the most accurate suggestions in "Likely at this hearing" and pointed at the PDFs. `public/case-file/09-orders.pdf` — nine orders, cognizance to sentence — is what supplied the model: an application the bench allowed, a party marked absent, the chain inside one order, an application still pending, then the purpose table. New `order-suggestions.ts` holds the ranking, the six application→order pairings and the grounding for each; the screen only wires the signals it already had and threw away. Baseline rows keep their silence and their workflow line; the list became an `ol` because position now carries the answer. **D50a fell out of doing it** — the spec gates Issue of summons on the case being on file *and* lists it against Admission and Cognizance, and DOC-ORD-001 decides it. 703 tests (25 new, most against states the demo board cannot reach), seven gates, verified on the served DOM across eight listings. **Two refusals logged as questions rather than guessed**: an absence at a plea hearing, and a complainant's absence. | ui-designer (owner ask) |
| 2026-09-14 | **Application card relaid to the owner's spec.** "Pending" becomes a `Badge variant="warning"` on its own line; the application's name and serial follow; then every act in one row — Accept, Reject, and **View** as a `link` button beside them. Two faults fixed by the structure rather than by styling: "Pending — Application to reschedule/adjournment" was one run of text doing two jobs and wrapped under a word that was not part of the title, and View had no hover on this card. `link`'s hover is an underline, so it does not depend on a fill — which is the workaround for ds-requests #21 rather than a third bordered control. | ui-designer (owner spec) |
| 2026-09-14 | **Application cards: the amber becomes a leading-edge bar.** Owner, asked to choose between three treatments: *"instead of the whole cards being yellow, can you have yellow line on the leftside of the card only."* Card is a neutral well with `border-s-4 border-warning`; the ink override on View goes with the fill it existed for. This is the narrow move D44 should have been — status kept, the loudest object in the panel gone, and **not one press added**. The rest of D44's diagnosis is still unspent: the row says "Pending" a third time after the tab's own figure, and Reject is a filled destructive on a decision that is neither dangerous nor irreversible. Offered, not taken. | ui-designer (owner choice) |
| 2026-09-14 | **D49 built.** Owner's screenshots of the reference order sheet: Present/Absent as two rolls, purpose and date as named facts in brand ink, a signature block at the foot, and the segmented control's well white against the card it sits on. Added `role` to `AttendanceEntry` and `attendance` to `OrderDocument` so the page has the marks and not only the prose; added `PRESIDING_MAGISTRATE` to `content.ts` — the order is signed by the bench, never by the seat working the screen. The brand-ink values are a deliberate departure from the one-primary rule and are logged as such. | ui-designer (owner reference) |
| 2026-09-14 | **D46 amended on sight: the roll shows every choice and separates the sides.** Owner: *"instead of drop down, show all the shows at once… make clear distinction between complainant and accused."* Four dropdowns became four segmented controls inside two `fieldset`s, one per side. Added `side` and `kind` to `Appearance` so the grouping is data rather than a parse of the role label — the reason being translation and the multi-accused case the order catalogue already assumes. | ui-designer (owner report) |
| 2026-09-14 | **D45–D48 built.** Owner's wireframe moved attendance and the next listing into the page as inline forms, open by default, committing on Apply; the left panel went back to two tabs (Orders default, Applications with a count). Two things fell out of doing it: the roll became one three-state control per person, which **closes problem 1** after five revisions of moving it around; and the document surface had to leave `bg-paper` for `bg-card`, because themed form controls cannot sit on a family the DS fixes in both modes — **restoring D21**, which D33 and D43 had drifted from. `NativeSelect` over the DS `Select` after the served HTML showed Radix shipping four empty triggers that fill in on hydration. 678 tests, six gates, verified on the DOM. | ui-designer (owner wireframe) |
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
