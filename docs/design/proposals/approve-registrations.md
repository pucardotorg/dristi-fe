# Approve registrations

*(Formerly "Approve registrations". Renamed 2026-09-11 when advocate clerks joined the queue —
D31. The route and this file keep the old slug for now; §11.)*

Status: draft — **the decision overlay is being rebuilt.** The queue screen shipped
(`f453fd1`); the owner rejected what is inside the overlay on 2026-09-10 and this brief
carries the replacement. Everything not named in the 2026-09-10 (evening) log rows stands
as built.
Updated: 2026-09-10
Source: `/Users/abhiramrajilan/Desktop/account-creation-handover.md` (Account Creation
handover v3, 2026-09-07 — requirement IDs `REG-nn` cited throughout) ·
docs/product/README.md · docs/product/domain/actors.md ·
docs/product/domain/journey.md · docs/product/domain/practice-notes.md ·
docs/product/terminology.md · docs/product/open-questions.md ·
owner (Abhiram) in this conversation, 2026-09-10 — quoted inline
DS read: `vendor/pucar-design-system`, pin `ds.lock.json` =
`e0cadea6b9d459bd3c58eed840974c6c610ad624`, `remote: pucardotorg/dristi-design-system`.
**`npm run check:ds-fresh` has still not been run** — neither session had a shell; the pin
is verified as a fact in the repo, not as the checked-out HEAD. Run it before building.
Files opened for the first pass: `AGENTS.md`, `RESPONSIVE.md`, foundations `laws`,
`colors`, `src/components/ui/button.tsx`, `src/components/docs/component-registry.tsx`,
and the `src/components/ui/` catalog. Files opened for **this revision**: `AGENTS.md`
(rules 6, 6a, 7, 7a, 10 and the token-meaning table), foundations `laws`,
`src/components/ui/description-list.tsx`, `item.tsx`, `badge.tsx`, `button.tsx`,
`document-slot.tsx`, and the catalog re-globbed (68 components).

Code read for this revision: `components/employee/approve-registrations-dialog.tsx` ·
`components/employee/approve-registrations-screen.tsx` ·
`components/employee/approve-registrations-table.tsx` ·
`lib/employee/approve-registrations.ts` · `components/cases/document-preview.tsx` ·
`components/cases/filing-form-shared.tsx` (`ReviewRow`) ·
`components/chrome/app-chrome.tsx` (`ChromeDialogContent`) ·
`components/cases/case-file.tsx` (the `DocumentPreviewActions` precedent).
First pass also read: `lib/employee/navigation.ts` · `lib/employee/register-cases.ts` ·
`lib/employee/approve-copy-application.ts` · `lib/employee/scrutiny/{queue,types,history}.ts` ·
`lib/employee/content.ts` · `components/employee/approve-copy-application-{screen,dialog}.tsx` ·
`components/employee/register-cases-table.tsx` ·
`components/employee/scrutiny/{flag-composer,history-sheet}.tsx` ·
`lib/cases/party-actions.ts` · `lib/filing/registry.ts` · `lib/sign-in/content.ts`

Passes run (`.claude/skills/propose-ui-brief/references/staff-ux-thinking.md`):
1 Walk the Tuesday · 2 Domain layout · 3 Control vocabulary · 4 Real weather ·
5 Exception vs. norm · 6 Pattern census · 7 Sibling sweep — **all seven re-run for this
revision against the built code**, which is why problems 9 and 10 cite line-level evidence
instead of screenshots. Pass 8 (render) **was not re-run in this session** — no shell, no
browser. It does not need to be: the owner ran it on the built screen and his verdict is
quoted in §2. What must be re-checked on the render *after* the rebuild is listed in §11.

---

## 1. Context

**Where this sits.** The employee side, as one new row in the **Actions** group of the
court-side rail — the group that today holds *Scrutinise submitted cases*, *Register
cases*, *Approve copy application*. One entry in `COURT_NAV_GROUPS[actions].items` in
`lib/employee/navigation.ts`, with an `href` and a `count` derived from the queue behind
it, per that file's own convention ("a count of the list behind it is what keeps the rail
and the screen from disagreeing"). The sidebar component is not touched.

**Confirmed with the owner (2026-09-10, morning), in his words:**

- *"it's option 1, the approval queue"* — advocates **self-register** on the citizen
  side; their flow ends on a "Your registration is awaiting approval" screen carrying an
  application ID (`KL-ADV-000207-2026`). The FSO approves or rejects those pending
  requests. **This is not a form where the FSO keys in an advocate's details.**
- *"when an FSO rejects an application, he would need to leave a comment (similar to how
  the scrutiny comment happens) and the advocate will probably get an email about this?"*
  — the reason is required; the notification channel is his guess, not a fact (§12.1).
- *"make sure the UI and UX of this is not anchoring to the screenshots… i want you to
  build a better version of the same, based on the kind of information we are asking to
  the advocates in the registration flow."*

**Confirmed with the owner (2026-09-10, evening), on the built overlay** — the direction
this revision follows, quoted at length in §2 and not re-litigated here:

- The **shape** is kept: *"I like that it's a hover, like a modal that opens up."* D1 stands.
- The **contents** are rejected: *"the information inside this modal does not make any
  sense… it's not at all scalable. Stick to simple attributes that we can keep reusing.
  Don't invent new scenarios and attributes that we cannot trace back to. You are relying
  too much on… custom copy to do the heavy lifting."*
- The **evidence region's chrome** is rejected by name: *"I also hate how the current
  download button full view and title, photo of the bar ID, everything looks like."*

**Confirmed by the handover** (precedence: owner > PDF > prototype):

| Fact | Source |
|---|---|
| Advocates self-register; approval by the **scrutiny officer**; identity verified by **Bar ID + photo of Bar ID** | §2 |
| The flow collects: mobile (OTP-verified, primary key), Full Name, Bar Registration ID, Photo of Bar ID card, email (optional) | `REG-10`–`REG-15` |
| The Bar Registration ID is "looked up against the Bar Council database" | `REG-13` |
| The photo exists because "scrutiny officer uses it to verify" | `REG-14` |
| **Address and ID proof are not collected** | §5.1 `[OWNER]` |
| A Bar-Council-pre-created account whose holder **edits** anything at first login sends the updated request to the same approval queue | `REG-18` |
| A Bar ID already registered to a different mobile is blocked **at submission** — it never reaches this queue | `REG-19` |
| Lifecycle: Pending → Approved / Rejected; Rejected → user edits and resubmits → Pending | §5.3 |
| Rejections happen when details are incorrect, e.g. Bar ID doesn't match the photo | `REG-21` |
| The rejection reason is **free text** from the scrutiny officer | `REG-22` `[OWNER]` |
| Rejection–resubmission may repeat **without limit** | `REG-23` `[DERIVED]` |
| While Pending, the advocate has **no access** from their advocate account | `REG-24` `[OWNER]` |
| Clerks register through the same officer, with their own identifier and their own ID card | `REG-13a` / `REG-14a` |
| Notification copy is explicitly **not covered** | §12 |

**This is the whole submitted set, and the overlay now says so structurally.** Five values
(`REG-12` full name, `REG-13` Bar registration ID, `REG-10`/`REG-11` mobile,
`REG-15` email, `REG-14` the photo) and nothing else. Four are attribute rows; the fifth —
the photo — is the evidence column, rendered as itself. Any attribute an officer sees that
is not in that list is invented, and the new row model makes that visible at a glance
rather than buried in a paragraph.

**Two cross-cutting changes land before the rebuild**, being made in parallel by
`ui-designer` and adopted here rather than re-decided:

1. **Search filters as you type** — the Search button is going away app-wide. This screen's
   `draft` / `applied` two-state (`approve-registrations-screen.tsx` lines 76–110) goes with
   it. Consequence for this brief: D11 and the teal budget in D9 (both revised below).
2. **The whole table row becomes the click target**, replacing the application-number-only
   opener in `approve-registrations-table.tsx` lines 125–134 and the item-list opener in
   `approve-registrations-screen.tsx` lines 387–394. Constraint this brief keeps: the row's
   accessible name still **starts with the application number** (WCAG 2.5.3, and it is the
   string the advocate can quote), and the row is one keyboard target, not five.

**The cost of a slow queue is not a UX preference.** §138 runs on statutory clocks —
notice within 30 days of the dishonour memo, 15 days to pay, complaint within one month
of the cause of action (`docs/product/domain/journey.md` §1–3). `REG-24` says a pending
advocate has no access. So each day a request sits here is a day an advocate cannot file,
against a limitation window that does not pause. That is a property of the statute, not
an assumption about users.

**And there is a documented abuse pattern in exactly this role.**
`docs/product/domain/practice-notes.md`, note `ke-scrutiny-officer-2026-07` (Kerala,
secondhand, tagged *gatekeeping*, *delay*): "the officer often does not mark defects
properly, holding files so the advocate approaches him and may make a payment to move the
file forward." A queue in which waiting is invisible and rejection needs no stated reason
is the shape of that practice. It is provisional field observation, not a requirement —
but it is the reason two decisions below (D6, D8) are not negotiable-looking niceties.

**In scope (all of it, one feature):** the queue list, its search, sort and counts; the
per-request verification/decision overlay; the rejection-reason capture; the
approve confirmation; empty/loading/error states; the one nav registry entry; the demo
data shape.

**Out of scope:** the advocate-side registration flow and its "awaiting approval" screen;
the advocate-side rendering of a rejection; clerk registration as a shipped kind (§12.3);
notification delivery (§12.1); what an approved registration writes into the advocate
registry (`lib/cases/party-actions.ts` `ADVOCATE_LOOKUP` is presumably the destination —
not confirmed, §12.8); the Actions group's other three rows.

**Who this is for.** Who logs into DRISTI is still unanswered
(`docs/product/open-questions.md`). The owner named the FSO, and the court-side demo
already carries a `scrutiny-officer` seat (`lib/employee/content.ts`), but that is a demo
identity. This is a staff worklist worked repeatedly, so the brief designs for the
**professional repeat user** — density, keyboard reach, throughput — and says so here so
the assumption stays reversible. Note also that `docs/product/domain/actors.md` **does**
carry a *Registry / Scrutiny officer* row, but defines it as "the court office that
receives and scrutinises the filed **complaint** for defects before it goes for
cognizance". Approving an advocate's registration is not in that definition. That gap is
§12.6 — it is not filled here.

---

## 2. Problem

Numbered so decisions and reviewers can cite them. Problems 1–8 were read off the six
reference screenshots of the legacy system (owner, 2026-09-10) — used, as instructed, as a
statement of *what* must exist, never *how*. **Problems 9 and 10 are defects in our own
build**, found by the owner on the render and confirmed here line by line in the source.

1. ~~**The row does not exist.**~~ **Resolved** by the 2026-09-10 build (`f453fd1`): the
   rail carries *Approve registrations* and the screen exists at
   `/employee/approve-registrations`.
2. ~~**The reference's detail page shows fields the new flow no longer collects**~~ — ID
   Type (Aadhar), ID Proof (PDF), Permanent Address, Current Residential Address, Location
   (View on map); roughly six of nine values dead. **Resolved** by D3: those fields are
   absent from the row model and from the overlay.
3. **It never stages the comparison the officer is there to make.** `REG-14` says the
   photo exists so the officer can verify the typed claim. **Half resolved:** the built
   overlay does put the claim and the card side by side. **Still open, and now the main
   defect:** the comparison is narrated in prose rather than expressed per attribute — see
   problem 9.
4. ~~**The queue's columns carry almost no decision-relevant information.**~~ **Resolved**
   by D4: User Type and "Verify" are gone, Request type and Days waiting arrived.
5. ~~**The filters are sliced by the system, not by the officer.**~~ **Resolved** by D11:
   one box reaching name, Bar registration ID and application number.
6. ~~**Deciding one request costs six steps and ends in the wrong place.**~~ **Resolved**
   by D1 and D10: open the row, decide, the row leaves, focus comes back.
7. ~~**The decision pair is emphasised backwards.**~~ **Resolved** by D8 and D9: soft
   destructive on the reversible act, the `AlertDialog` on the irreversible one.
8. ~~**Nothing records or surfaces why a request is still here.**~~ **Resolved** by D6 and
   D7: escalating wait, request type, rejection history.

9. **Every machine result is a bespoke sentence, so the overlay does not scale and cannot
   be read at a glance.** The owner's words: *"You are relying too much on… custom copy to
   do the heavy lifting of the product conveying information, but it should have a specific
   set of attributes and show that mindfully."* One machine result — the Bar Council lookup
   — is rendered as **four different prose variants** in
   `components/employee/approve-registrations-dialog.tsx` `BarCouncilLine` (lines 561–627):

   | Lookup state | What the screen says today | Lines |
   |---|---|---|
   | agrees | "Bar Council of Kerala register: Fathima Beevi Abdul Rahman Kunju Rawther." | 572–582 |
   | unavailable | "The Bar Council register could not be reached. Decide from the card." | 584–590 |
   | not-found | "This number is not in the register / The Bar Council register has no entry against KAR/12453/2018. The register is not complete, so this is ordinary — the card is what decides it." | 592–604 |
   | disagrees | "The register has a different name against this number / Bar Council of Kerala holds KL/3312/2021 against Meera Sudhakaran. This request was made in the name Meera Suresh. Check the card before deciding." | 606–626 |

   Two more states are narrated the same way: the resubmission block writes "Round 4,
   rejected 8 July 2026. This request is round 5." under a heading "Why this was rejected
   last time" (lines 224–292), and an edited pre-created account gets the sentence "This
   account was created from the Bar Council record. The advocate changed the marked values
   at first login; the rest is the record as it stood." (lines 294–303).

   Four consequences, all of them structural:

   - **Every new case needs new copy.** A fifth lookup state, a second source, or clerk
     registrations (`REG-13a`) means writing more sentences, and each one is a place the
     product can say something the data does not support.
   - **None of it is data.** A prose variant cannot be filtered, sorted, counted, or shown
     on any other screen. The queue table consequently shows no lookup result at all
     (`approve-registrations-table.tsx` has no lookup cell), which means the brief's own D5 —
     "a mark on the row when it disagrees" — was never true of the build. Resolved in the
     revised D5.
   - **A reader parses a paragraph to learn one fact.** The `disagrees` variant is 34 words
     to say *the register holds a different name*.
   - **The register's answer sits above everything, not on the attribute it concerns.** The
     lookup line renders once, before the claim block (line 305), so a finding about the
     *name* is two elements away from the name it disagrees with.

10. **The evidence region carries a second title bar, and it competes with the dialog's
    own.** `DocumentPreview` renders a sticky header — an `h3` "Photo of Bar ID card", a
    sub-line "Uploaded 31 August 2026", and two ghost text buttons *Download* and *Full
    view* (`components/cases/document-preview.tsx` lines 141–165), fed from
    `approve-registrations-dialog.tsx` lines 399–428. In this overlay that band sits roughly
    100px under `DialogTitle` "Review registration request", so the top of the screen holds
    **two headings and two controls fighting for the same job**. Three separate faults:

    - The heading restates what the column already is; nothing else in the overlay is a
      document, and the attribute list names the card in its own rows.
    - "Uploaded 31 August 2026" is the **submitted date said twice** — the same fact the
      request metadata carries.
    - On the owner's marked screenshot, *Full view*'s focus ring (`ring-3
      ring-focus-ring`, `button.tsx` line 8) renders hard against the title band and reads
      as an error state next to a heading.

    The owner: *"This entire model sucks. I feel like it has to be completely rethought
    from a design scalability and, like, UX point of view."*

---

## 3. Objective

Observable, and not provisional — the Job is confirmed (§4).

Standing from the first pass (all met by the build, and preserved by the rebuild):

- An officer can tell, **from the row**, whether a request is routine or needs a look: how
  long it has waited, and whether it is a first registration, an edit, or a resubmission.
- The decision is taken **in one place where the typed claim and the photo of the Bar ID
  card are visible at the same time**, without leaving the queue.
- A rejection cannot leave the screen without a reason an advocate could act on.
- Deciding a request costs **two interactions** from the queue (open, decide) plus a
  confirm on the irreversible one.
- The officer's own delay is visible on every row and escalates with it.

Added by this revision, and the test the rebuild is judged on:

- **Every fact in the overlay is a value in a named slot.** Nothing the product knows is
  expressed only as a sentence the product wrote. Concretely: adding a sixth submitted
  attribute, a fifth lookup state, or clerk registrations should cost **a row of data, not
  a paragraph of copy**.
- **A finding sits on the attribute it concerns.** The officer's eye reaches "the register
  holds a different name" without leaving the name.
- **The evidence column has one heading and it is the dialog's.**

---

## 4. Job

**Confirmed — owner, 2026-09-10.** *"it's option 1, the approval queue."* **Unchanged by
the critique**, which was about the rendering of this Job, not the Job.

In full, in the terms product uses: advocates self-register on the citizen side and their
account sits at **Pending Approval** with no access (`REG-24`). This screen is the
**scrutiny officer's queue of those pending registration requests**, and the act it exists
for is the one §2 of the handover names: verify the person's identity by **Bar ID + photo
of Bar ID**, then **approve or reject** (§5.3). A rejection carries a free-text reason
(`REG-22`); the advocate may edit and resubmit without limit (`REG-23`).

Two things this Job is **not**, both stated by the owner or the handover rather than
inferred: it is not a form for keying in an advocate's details (owner: "This is NOT a
form"), and it is not the complaint-scrutiny workbench — that is a different queue with a
different object (`/employee/scrutiny`), even where the same officer works both.

No slogan is coined for this screen. The sentence above is the handover's and the
owner's.

---

## 5. Decisions

Each carries the rule or doc behind it, or the word *judgment*; the alternative rejected;
and what it gives up. **D2, D5, D7, D9 and D11 were revised on 2026-09-10 (evening)** —
what changed and why is in each one and in §14.

### D1 — Push back first: collapse the reference's six-step path into a queue and one overlay

*(Unchanged, and explicitly kept by the owner: "I like that it's a hover, like a modal that
opens up.")*

The request as screenshotted is a list that navigates to a page that opens a dialog that
opens another dialog that navigates home. Do not build that. The queue is a list screen;
deciding one request happens in an **overlay opened from the row**, and the officer never
leaves the list.

*Rule:* the court side already has exactly this shape, four times over —
`ApproveCopyApplicationDialog`, `ReschedulingRequestDialog`, `DelayCondonationDialog`,
`OtherApplicationDialog` — all "an application somebody filed, in front of staff who have
to say yes or no", all `ChromeDialogContent` at `sm:max-w-4xl md:h-[85dvh]` with the
document filling a `1fr` row.
*Rejected:* the reference's dedicated route. The only court-side screen that earns a route
is the scrutiny workbench (`/employee/scrutiny/<filingNo>`), and that is a 40-field
annotation task over a multi-page bundle — not a small-set comparison.
*Given up:* no deep-linkable URL per request, and less width than a full page for the
photo. The first is a real loss, accepted.
*Fixes problems 1, 6.*

### D2 — **Revised.** The overlay is attribute rows, not prose: one row component, three groups

*Supersedes the first pass's "claim ← → evidence, side by side", which stands as far as
the two columns go and is replaced in what fills the left one.*

The verification is **per attribute**: a submitted value set against whatever authority can
speak to it. So the overlay's left column is a small number of **identical rows**, and
every fact the screen knows is a value in one of that row's slots.

**The row.** Term, value, and up to two sub-lines, in fixed slots:

```
Full name                    Meera Suresh                    [Differs]
                             Bar Council of Kerala: Meera Sudhakaran

Mobile number                9895447120
                             OTP: verified

Email                        thomas.kurian@example.com
                             Added at first login             [Changed]
```

| Slot | What goes in it | Type |
|---|---|---|
| **term** | the attribute's label, read off `registrantKind` (D13) | fixed string |
| **value** | what the person submitted | data |
| **source line** | `{source}: {answer}` — the authority's reading of *this* attribute | data + closed enum |
| **previous line** | `Was {value}` / `Added at first login` (`REG-18`) | data |
| **marks** | zero or more `Badge`s from a **closed set of two** | closed enum |

**The status enum, closed.** No sentence is ever generated; the answer is one of six
values, and only one of them earns a mark:

| status | when | source line reads | mark |
|---|---|---|---|
| `matches` | the register holds this value | `Bar Council of Kerala: matches` | none |
| `differs` | the register holds a different value | `Bar Council of Kerala: Meera Sudhakaran` | `Badge warning` **Differs** |
| `no-entry` | the number is not in the register | `Bar Council of Kerala: no entry` | none |
| `not-checked` | the register could not be reached | `Bar Council register: not checked` | none |
| `verified` | proved by machine before submission (`REG-11`) | `OTP: verified` | none |
| `none` | nothing checks this attribute (email) | *no line rendered* | none |

The second mark is orthogonal and its own closed value: **`changed`** →
`Badge secondary` **Changed**, set on any row a pre-created account's holder altered at
first login (`REG-18`). A row can carry both; they are two short chips in one slot.

**Three groups, all built from that one row:**

1. **Request** — `Submitted` (31 August 2026) · `Waiting` (12 days, D6's escalating tone) ·
   `Request type` (see D7 and D16).
2. **Identity** — `Full name` · `Bar registration ID` · `Mobile number` · `Email` (omitted
   when absent). Name and Bar registration ID sit adjacent, because the register answers
   both and its "no entry / not checked" answer is stated once, on the ID it was looked up
   by (D5).
3. **Earlier rejections** — resubmissions only (D7).

The photo is the **fifth submitted value and the only one not rendered as a row**: it is
the evidence column (D15). That mapping is exhaustive — five collected values, four rows
and one column — which is how a reader checks that nothing was invented.

*Rule:* owner, 2026-09-10 — "Stick to simple attributes that we can keep reusing. Don't
invent new scenarios and attributes that we cannot trace back to." DS Laws, *Grouped
content gets a border*: "Description list inside Card for a single record's key-value
fields"; AGENTS rule 6 (three treatments per status, no fourth) is what keeps the mark set
closed.
*Rejected — two columns, submitted vs. source, side by side.* Three reasons, in order of
weight: (a) **it is a constant/empty column** — the register answers 2 of the 5 submitted
values, so it would be blank on mobile, email and photo, which is precisely the defect
problem 4 killed on the queue; (b) **it does not survive real weather** — the overlay's
left column is roughly 380–400px at `sm:max-w-4xl`, and halving it puts a Malayalam name
against a 40-character register name in ~190px each; (c) it would need a second row model
below `md`, where side-by-side is impossible, so the screen would own two renderings of
one fact (pass 7).
*Given up:* the strict left–right diff, which is genuinely the faster read when both values
are short and Latin. Bought back by putting the two values on consecutive lines and letting
the **Differs** badge do the finding, so the officer is never asked to spot a difference
unaided.
*Fixes problems 3, 9.*

### D3 — Only the fields the registration flow actually collects

*(Unchanged.)* Name, Bar registration ID, mobile, optional email, photo of the Bar ID card.
Nothing else. Address, ID type, Aadhaar ID proof, and Location/View-on-map are **deleted**,
not moved.

*Rule:* handover §5.1 `[OWNER]` — "Address and ID proof are **not collected** during
registration." A field the flow never captures cannot be shown, and a screen that shows
empty rows for them teaches the officer the data is missing rather than absent.
*Rejected:* keeping the rows as "—" for parity with the legacy screen.
*Given up:* an officer moving from the legacy system will notice things gone. That is the
point.
*Fixes problem 2.*

### D4 — Queue columns: application number, name, Bar registration ID, request type, days waiting

> **Amended 2026-09-11 (D31):** six columns now — Role returned beside the name, and "Bar
> registration ID" became "Registration number" because it holds clerks' numbers too.

*(Unchanged in substance. One amendment: with the whole row now the click target (§1), the
application number is no longer the row's only opener — it stays the row's first cell and
the start of the row's accessible name.)*

| Column | Why it survives |
|---|---|
| **Application number** | The one string shared with the advocate's own waiting screen — the only thing they can quote on the phone. First cell, and the start of the row's accessible name. |
| **Full name** (`REG-12`) | The emphasised cell (`font-medium`). What identifies a person. |
| **Bar registration ID** (`REG-13`) | The claim under verification, and the second thing an officer searches by. `tabular-nums`, `whitespace-nowrap`. |
| **Request type** | *Silent for a first registration.* Carries a `Badge secondary` only for the two exceptions (D7). |
| **Days waiting** | Right-aligned, `tabular-nums`, escalating tone (D6). |

**Killed:** *User Type* (constant on this screen — problem 4; it returns the day clerks
join, §12.3). *Action / "Verify"* (a link that repeated its own row).

*Rule:* pattern census + `RegisterCasesTable`'s own doc comment — "there is no status
chip: a row in this queue is in exactly one state, waiting, so a column repeating that on
every row would carry no information."
*Rejected:* a Status column; a Submitted-on date column beside Days waiting.
*Given up:* the exact submission date is only in the overlay.
*Fixes problems 4, 8.*

### D5 — **Superseded by D19.** The register's answer sits on the attribute it checks, as a closed status — never as a banner

> **2026-09-11:** the half of this that survives is *never as a banner* and *never
> `destructive`*. The half that does not is putting the answer **on the attribute** — see
> **D19**, which takes it off every attribute it agreed with, and off the ones it agreed
> with silently most of all.

*Supersedes the first pass's "stated as a machine reading… as a line above the claim
block". The reasoning survives intact; the rendering does not.*

What survives, unchanged and still the load-bearing part:

- The lookup is **a machine reading, not a verdict.** It never pre-judges and never blocks.
- A mismatch is **`warning`, never `destructive`.** A register that holds a different name
  is a finding that needs a human to look at a photograph. The repo has already learned
  this in this exact role — `flag-composer.tsx`: "pre-filling a defect assertion on the
  officer's behalf is the machine making the claim." Destructive tint would have the
  machine reject before the officer had looked at the card.
- **Never colour alone**: the mark carries the word *Differs*, and the differing value is
  on the line beneath it (DS Laws, "status never conveyed by color alone").
- **The default is silent**: `matches` gets no badge and no colour. A green *verified* chip
  would spend ink marking the norm (pass 5).

What changed:

1. **The Alert above the claim block is gone.** The register's answer is a **source line on
   the row it answers**: a name mismatch renders on the Full name row, beside the name it
   differs from. Shorter eye path, and it scales — a second source (a future court roll, a
   clerk register per `REG-13a`) is another source line on another row, not another banner.
2. **All four lookup states collapse into the enum in D2.** No variant writes a sentence.
3. **`no-entry` and `not-checked` lose their `warning` treatment** and become plain muted
   source lines. `lib/filing/registry.ts` says in its own header that "the register will
   never be complete", so an absent entry is ordinary and the officer's next action —
   look at the card — is the same as on every other row. Marking it spends warning ink on
   something that changes nothing. **This flips if product tells us the register is in fact
   complete for a given state** (§12.4).
4. **The queue row carries no lookup mark**, resolving a contradiction: the first pass's D5
   promised "a mark on the row when it disagrees" and the build never had one
   (`approve-registrations-table.tsx` has no lookup cell). Decided deliberately rather than
   patched: there is no bulk path (D9), so the officer opens every request anyway, and the
   table's own doc comment already rations the row to **one** status cue — the wait.
5. **Where the "no answer at all" case is stated.** A row never renders an empty source
   slot — no "—", no ghost line — so absence means *nothing checks this attribute*. The one
   case that could be misread (the register was silent about a person who does have a name)
   is covered by stating `no entry` / `not checked` on the **Bar registration ID** row,
   which is the key the lookup was made on, directly adjacent to the name.

*Rule:* `REG-13`; AGENTS §6 and §10; DS Laws (status never by colour alone; ration teal);
pass 5. Existing shape reused: `lib/filing/registry.ts` already models the register as
`{ barNumber, name, bar }` — the source line's `{source}` is `entry.bar`, so a
Maharashtra or Gujarat bar names itself and nothing is hardcoded to Kerala.
*Rejected:* auto-approving on a clean lookup (it would make `REG-14`'s photo pointless); a
green "verified" badge on the rows that agree; keeping the banner "because a mismatch is
important" — importance is what the badge is for, and a banner that repeats every state is
how the four prose variants happened.
*Given up:* the instruction "Check the card before deciding" is gone. Deliberately: the
officer checks the card on **every** request, so a sentence saying so on one of them is
product copy carrying no information (§6).
*Fixes problems 3, 9.*

### D6 — Days waiting escalates; it does not paint every row

*(Unchanged.)* Adopt the scrutiny queue's `waitTone` shape (`lib/employee/scrutiny/queue.ts`):
plain at rest, `warning-ink` past a threshold, `destructive-ink` past a longer one.
Thresholds for *this* queue are product's to set (§12.5); until they do, mirror scrutiny's
registry clock — 7 and 14 days — and say in the build report that the numbers are borrowed.
The same tone now also applies to the **`Waiting` row inside the overlay** (D16), so one
fact has one treatment on both surfaces (pass 7).

*Rule:* pass 5 + `REG-24` (a pending advocate has no access, so a long wait is a live harm)
+ `docs/product/domain/journey.md` §1–3.
*Sibling divergence, named:* `RegisterCasesTable` paints **every** days cell
`text-warning-ink`. **Recommendation: register-cases should move to the escalating
treatment**, as a separate change. Not done here; flagged in §11.
*Rejected:* a flat paint; a Due-since sort control (the default sort already is
longest-wait-first).
*Fixes problems 4, 8.*

### D7 — **Revised.** Three kinds of request — the classification survives; its prose rendering does not

The three kinds are real and stay: **first registration** (the norm), **edited pre-created
account** (`REG-18`), **resubmission** (`REG-23`). What changes is that each is now a
**value**, not a sentence.

- **In the queue** — silent on the norm; the two exceptions carry a chip **and a colour**
  (owner, design-mode round 2026-09-10): `info` for "Edited", `warning` for
  "Resubmitted · round 3" (`requestKindVariant`). The first build made both `secondary`
  to keep the row to one status cue — the wait — and the owner asked for the colour back.
  The trade is logged: the oldest row now carries an amber chip beside a destructive-ink
  wait. The words stay on the chip, so the kind is never colour alone.
- **In the overlay** — a `Request type` row in the Request group, whose value is one of a
  closed set: `New registration` · `Edited Bar Council account` · `Resubmitted · round 5`.
  The paragraph "This account was created from the Bar Council record. The advocate changed
  the marked values at first login…" is **deleted**: the value carries the provenance, and
  the changed rows carry the `Changed` mark plus their `Was …` line (D2).
- **Earlier rejections** — a group of rows, **newest first**, each one
  `Round 4 · 8 July 2026` with the officer's own reason under it. The most recent is always
  visible; the rest sit inside a `Collapsible` labelled "3 earlier rounds". The sentence
  "Round 4, rejected 8 July 2026. This request is round 5." dissolves entirely: the round
  is a value on the row, the date is a value on the row, and the current round is already
  in `Request type`.
- **The `decision` field is not rendered.** Product's history tuple is
  `{round, date, decision, reason}`, but every round that can appear here was a rejection —
  an approved request leaves the queue — so a per-row "Rejected" chip would mark the norm.
  The group's name carries it: **Earlier rejections**. Same argument that retired *User
  Type* in D4. The moment a second decision value can occur, the chip earns its place.

*Rule:* `REG-18`, `REG-22`, `REG-23`; pass 5; owner 2026-09-10.
*Rejected:* keeping the heading "Why this was rejected last time" (product copy doing the
work a group label does); rendering the latest rejection as a quote block and the earlier
ones as timeline items — that is **one fact with two treatments**, a pass-7 defect the
build shipped (`approve-registrations-dialog.tsx` lines 232–288). All rounds now use one row;
the `Collapsible` governs how many are visible, not how they look.
*Given up:* a timeline that runs oldest → newest, which is the conventional direction.
Newest-first wins because the officer's question on a resubmission is "did they fix what I
said last time", and that answer must not be at the bottom of five rounds.
*Fixes problems 4, 8, 9.*

### D8 — **Revised.** Reject requires a reason, and it takes the DS's *soft* destructive treatment

**2026-09-11:** the label loses its second sentence. It read *"Why are you rejecting this?
The advocate will read this."* — and of course they will; that is what a reason is, and the
officer writes one daily (owner: *"avoid unnecessary exposition in the product"*). The
description under the box stating the gate before it is tripped goes with it; the error
after a box has been typed in and emptied stays. Reject also gets its own **focused stage**
rather than a composer dropped into the review layout — D21.

Reject opens the reason field inside the same overlay — `Field` + a
**visible** `FieldLabel`, a `Textarea`, and the save gate stated in words when it is holding
the button, exactly as `FlagComposer` does. The label is written for the person who will
read it: **"Why are you rejecting this? The advocate will read this."** Placeholder models
a usable sentence.

Button treatment: **`variant="destructive"` — the soft, muted at-rest treatment** — not
`destructive-solid`.

*Rule:* DS component registry, Button: "destructive is the soft/at-rest treatment;
destructive-solid **only for a confirmed irreversible action**". A rejection here is
**reversible by design** (`REG-23`).
*Why free text and not reason chips:* `REG-22` `[OWNER]` says free text. See §6 — and note
that this is the *officer's own sentence*, which is user data in a fixed slot, not the
product narrating a machine result. The two are not the same thing, and problem 9 does not
touch this one.
*Rejected:* a second confirm dialog on top of a typed reason; a placeholder-only box (DS
Laws accessibility floor).
*Given up:* an officer in a hurry cannot reject in one click. Intended.
*Fixes problems 7, 8.*

### D9 — Approve is the guarded act, no bulk path — and the queue page has **no** teal

**Revised 2026-09-10 (design-mode round) — see D17.** Approve is the **overlay's** single
teal action. It used to open one `AlertDialog` over the overlay; it now advances the
overlay to its own confirmation stage (D17), stating what approval does: the advocate gets
access to their advocate account. Whether it is *irreversible* is **not asserted** until
product confirms (§12.2). The "next request" conveyor this decision rejected below is now
**accepted** on the owner's direction, and lives on the settled stage only — D17.

**No bulk approve, no checkbox column.** This deliberately breaks from the nearest sibling,
`ApproveCopyApplicationScreen`. On that queue the evidence is a document the court itself
composed. Here the evidence is a photograph, the whole reason it is collected is that a
human looks at it (`REG-14`), and the outcome is a **credential grant**. A bulk control
would let an officer clear the queue without opening a single photo, which defeats the only
mechanism the product has for verifying identity.

**Teal budget — revised 2026-09-10 (evening).** The first pass wrote: "on the queue page
the teal is **Search**". **That is about to be false** — search filters as you type and the
Search button is going away app-wide (§1). The correct reading, which is what D9 argued for
all along: **the queue page has no page-level act, so it gets no primary at all.** DS Laws
ration teal — they cap primaries, they do not require one, and `DocumentPreview`'s own doc
comment says exactly this ("they cap primaries, they do not require one"). Clear search
stays `ghost` or becomes an affordance inside the input; either way it acquires no teal.
The **only** teal on this feature is Approve, in the overlay.
*Consequence for the rebuild:* two code comments now assert the old rule and must change
with it — `approve-registrations-table.tsx` line ~122 ("the teal on this page is rationed for
Search") and `approve-registrations-screen.tsx` lines 250–252.

*Rejected:* bulk approve for lookup-agreeing rows; a "next request" conveyor after each
decision (a pattern no sibling has — §6); promoting Clear search to primary to "keep a teal
on the page" (that is decoration, and the Law is a cap, not a quota).
*Given up:* throughput. Clearing the queue costs one overlay per request. Accepted, and
re-openable if product tells us the real daily volume (§12.5).
*Fixes problem 7.*

### D10 — After a decision the officer stays put

**Revised 2026-09-10 (design-mode round).** The row leaves the list, an `aria-live` region
announces what happened, and the header count drops — unchanged. What changed: the overlay
no longer closes on the act. It settles on an end state (D17) and closes on **Close** or
moves to the next request; focus returns to the search box when it finally closes. "No
success dialog" below is superseded — the success state is a stage of the same overlay,
not a dialog on top of it. The rail count does **not** — it is
a module constant read at load, and every court-side sibling behaves the same way. A shared
queue store would fix all of them at once; logged in §11. No success dialog, no "Go To
Home".

*Rule:* `ApproveCopyApplicationScreen` already does exactly this — `removeFromQueue` +
`sr-only` `aria-live` + `onReturnFocus`.
*Fixes problem 6.*

### D11 — **Revised.** One search box, filtering as you type; no second filter axis at this size

A single labelled search reaching **name, Bar registration ID and application number**.
Visible label "Search requests"; placeholder "Name, Bar registration ID or application
number". Default sort: **longest wait first**.

**What changed:** the court side is moving to filter-as-you-type and the Search button is
going away app-wide (§1). So the `draft` / `applied` two-state and the disabled-until-dirty
submit go with it; `filterRegistrations` runs on the live query. The first pass's line "the
teal on the queue page is **Search**" is void — see D9.

*Rule:* pass 3 — *User Type* is a system concept and a constant here; *Application Number*
alone is the identifier the officer is least likely to hold.
*Rejected:* a "needs a look / lookup agrees" segmented slice. **This decision flips if the
queue is routinely in the hundreds** (a Gujarat-scale deployment — `open-questions.md`
contrasts exactly this); the row model already carries everything such a filter would need,
and after D2 the lookup status is a real enum value rather than a sentence, so the filter
would now be a half-day's work rather than a re-model. That is the scalability the owner
asked for, made concrete.
*Given up:* an officer who wants only the mismatches must open requests to find them —
and, per revised D5, the queue no longer marks them. Accepted while the queue is ~14 rows;
revisit with §12.5.
*Fixes problem 5.*

### D12 — The nav entry goes last in Actions, and its count is derived

*(Unchanged.)*

```
{ id: "approve-registrations", label: "Approve registrations",
  href: "/employee/approve-registrations", count: REGISTRATIONS_QUEUE_COUNT }
```

**Last in the group**, after Approve copy application: the group's internal order is a
complaint's own progression, and an advocate's registration is not part of any case's life.
*Judgment.*

### D13 — Built so clerks can be added later without restructuring

> **Tested 2026-09-11 (D31): clerks were added, and the claim held.** The overlay needed no
> new block, no new state and no new sentence — one lookup state (`none`), one row (Role)
> and one column (Role). The "no User Type column" line below is superseded.

*(Unchanged, and strengthened by D2.)* `REG-13a`/`REG-14a` put clerk registrations through
the same approval. The row model carries a `kind`, and every **term** in the attribute list
is read off it: "Bar registration ID" / "Clerk registration number"; the evidence column's
accessible name likewise. **No User Type column and no kind filter ship now.**

This is the test of whether the D2 model is actually scalable, and it passes: clerks are
**the same rows with different labels and a different source**. Nothing about the overlay's
structure changes — no new block, no new sentence, no new state. Under the old prose model
each of the six narrated variants would have needed a clerk wording.
*Judgment, on `REG-13a`/`REG-14a`; open question §12.3.*

### D14 — Keep `KL-ADV-…` as the application number

*(Unchanged.)* A registration application number has no court-side equivalent, and it is
the string the advocate is shown on their own waiting screen. Its exact format is
product's. *Judgment.*

### D15 — **New.** The evidence column loses its chrome: the well, and two quiet actions on it

The photo region becomes **the well and nothing above it**:

- **No heading.** The `h3` "Photo of Bar ID card" goes. A card photograph in a two-column
  review overlay is self-evidently the evidence; the dialog's own title is 100px above it;
  and the attribute list already names the card in its terms. Its accessible name survives
  as the `img`'s `alt` and an `sr-only` label on the region, so nothing is lost to a screen
  reader — only to the eye, which did not need it.
- **No upload date.** "Uploaded 31 August 2026" is the submitted date, and the Request
  group now carries it once (pass 7: one fact, one treatment).
- **A title strip returns, 2026-09-11 (D26).** The heading and the date stay gone; what
  came back is a rule with the document's name at caption weight on the left and the two
  icons on the right, because on a white card the icons alone read as floating over an
  empty sheet. The band this decision deleted was a *second title bar*; a strip that
  anchors the actions is not that.
- **Two icon affordances on the well, not two text buttons in a header band.** Download and
  Full view become `Button variant="ghost" size="icon"` (`size-10` = the 40×40 floor, DS
  Laws), clustered top-right **inside** the well's padding, each with an `aria-label` that
  names the document ("Download photo of Bar ID card") and a DS `Tooltip` carrying the same
  words for sighted users.
- **The well is a white sheet with a hairline on the tinted stage** (`surface="card"`,
  revised 2026-09-10 with D18). The first build kept `bg-surface-sunken`; once the
  overlay body became a `bg-muted` stage the sunken fill was the stage's own tone with no
  edge. The failure and loading states stay as built (§10).

**How it is built matters as much as what it looks like.** `DocumentPreview`
(`components/cases/document-preview.tsx`) is an **app** component, not DS, and its own doc
comment calls it "the one document preview in the product". So this is a **quiet
presentation added to that component**, not a second well composed in this screen. The
precedent already exists: `DocumentPreviewActions` is exported for exactly this reason and
`case-file.tsx` already composes it apart from a header. Whoever builds this extends
`DocumentPreview`; nobody hand-rolls a `bg-surface-sunken` box here.

*Rule:* owner, 2026-09-10, naming the region; DS Laws (nested media wells; 40×40 touch
targets; sentence case); `document-preview.tsx` lines 100–107 (the sanctioned way to place
these actions elsewhere).
*Rejected:* **keeping the text buttons and moving them below the well** — the honest
alternative, and it loses on two counts: it puts the controls furthest from the thing they
act on, and at `md` it pushes the well's bottom edge into the footer's decision pair, which
is the one region that must stay unambiguous. **Making the whole photo clickable to
enlarge** — tempting and familiar, but it would be a third click mechanism on a screen that
already has "row opens overlay" and "button acts", and no court-side sibling does it (pass
6). Restraint wins; if it turns out officers keep clicking the image, that is a measured
change, not a guess.
*Given up:* discoverability. Two icons are less legible than two words to someone who
meets this screen once a quarter — and this screen is designed for the repeat user (§1),
which is the assumption that makes the trade acceptable and the reason it is written down
here rather than assumed. Mitigated by tooltips, `aria-label`s and universally-read icons
(download arrow, expand). **Named as a pattern fork in §11**, with its reconciliation: if
this reads well, quiet mode is the shape for *every* side-by-side preview in Dristi (the
scrutiny workbench is next), and that is a follow-up, not a per-screen exception left
dangling.
*Fixes problem 10.*

### D16 — **New.** Request metadata is an attribute group, not a header paragraph — except the one fact the header owns

The request's own facts — submitted date, wait, request type — go into the **Request
group**, rendered by the same row as everything else (D2). They are not squeezed into the
dialog header, because a header holds two facts before it becomes a paragraph, and a
paragraph is what this revision is removing.

**The application number stays in the header's description** and does **not** repeat in the
group. The header description is the fixed slot every court-side overlay uses to name the
record you opened; carrying it twice would be one fact with two treatments (pass 7).

The header therefore holds exactly: title "Review registration request", `Badge
variant="warning"` "Pending approval" (the court-side convention for a pending application,
said once here rather than on every queue row), and the application number as the
description. The advocate's name leaves the header — it is an attribute **under
verification**, and a screen that prints it as the record's title has quietly asserted it
before the officer looked at the card.

*Rule:* pass 7 (sibling sweep — `ApproveCopyApplicationDialog`'s header shape);
`REG-14`/`REG-21` for why the name is not a title.
*Rejected:* metadata as a muted line under the title (that is the paragraph again, one
size smaller); a fourth group for "the wait" alone.
*Given up:* the name is no longer visible at the top of the overlay while scrolled — it is
the first row of the Identity group instead. Accepted: the left column scrolls
independently and Identity is above the fold at every width in §10.
*Fixes problems 9, 10.*

---

### D17 — **New.** One overlay, five stages: the decision progresses in place, no dialog on a dialog

Owner, design-mode round 2026-09-10: *"instead of a modal-on-modal interaction, can you do
a slide motion animation to show the modal that they were in, it's progressing to the next
state."* The overlay is one object with five stages —
**Review → Reject | Approve → Rejected | Approved** — and every stage change slides the
body in from the right (forward) or the left (Back). The header stays: title says the
stage, the `Badge` says the request's state (`Pending approval` until the act, then
`Approved` / `Rejected`), the application number stays put.

- **Reject** takes the attribute column's place with the reason composer (D8, unchanged)
  and the identity rows under it; the photograph stays, because the sentence is usually
  about the card. **Approve** is what approval grants plus the identity rows being vouched
  for, and the build caveat.
- **Settled stages** *(volume revised by D27)* say what happened in words, mark it with an icon in a tinted disc
  (`success-muted` + `UserCheck` for approved; `info-muted` + `Send` for a rejection sent
  — a message on its way, not a failure), recap the two identifying rows, echo the
  reason on a rejection, and carry the build caveat inside the card. No illustration pack
  exists; icons until one does (owner).
- **"View next application"** is the settled stage's primary — the conveyor D9 rejected,
  now accepted on the owner's direction and offered **only once the request in hand is
  settled**. `nextInQueue` reads the screen's own filtered list, so a narrowed search
  offers the next match; when the list is empty the footer says "No more requests are
  waiting." and offers Close alone.
- Focus: into Reject, the textarea; into every other stage, the header title, which has
  just changed to say what the stage is. `role="status"` on the outcome sentence gets it
  spoken. `motion-reduce:animate-none` on the slide.

*Rule:* owner 2026-09-10; DS Laws (one teal per view — Approve, then View next, never
both on one stage; soft destructive for a reversible act); ACCESSIBILITY §3, §12.
*Rejected:* a solid `bg-success` panel as the sibling `SignBulkConfirmDialog` uses — on
this overlay's tinted stage the muted disc reads calmer and keeps the card white like its
neighbours; a per-stage progress indicator — the badge changing state is the progress.
*Given up:* D10's "the overlay closes and the officer is back on the list in one click".
Close is one click; the end state is what makes the act legible.

### D18 — **New.** The overlay body is a tinted stage; every group is a white card

Owner, design-mode round 2026-09-10: *"the background is beige and all the cards with the
information is white and the image also… a very slight hairline stroke… a slight shadow
hover, just like how we treat usual cards in the design system."*

- Body: `bg-muted` in light (`neutral-2`, the warm tone the rail and the order screen's
  work canvas already use), `dark:bg-background` (in dark, `muted` sits *above* `card`
  and would invert depth). Header and footer stay `bg-card` with hairline seams, so the
  tint reads as the work surface and not as a grey dialog (ui-craft §1.0, scoped canvas).
- Groups: DS `Card size="sm"` with `border-hairline`, `hover:shadow-raised` and
  `has-focus-visible:shadow-raised` on `transition-shadow` — the product's existing card
  hover (`companion-rail.tsx`). The rows inside keep hairline rules.
- The photograph well: `DocumentPreview surface="card"` — white, `border-hairline`,
  sticky toolbar strip on the same white.

*Rule:* owner; ui-craft §1.0 (the one sanctioned tinted canvas: chrome stays white) and
§4; DS Laws "grouped content gets a border" (hairline, on a tint the fill already
separates). Not a page-level grey canvas — the dialog body is the scoped surface.
*Rejected:* `bg-surface-sunken` wells inside the cards (a well needs a white panel between
it and a tinted ground; here the card *is* on the tint).

### D19 — **New.** The register speaks only when it disagrees

Owner on the render, 2026-09-11: *"this whole Bar Council of Kerala matches, I didn't
notice it until I read it… is that relevant information in the first place?"*

It is not. **Agreement is not information.** A queue is scanned for exceptions, and a line
that appears on every ordinary request to report that nothing is wrong is a line the
officer stops reading long before the one that says something is. So:

- `matches` is **deleted**, everywhere. A silent register agreed.
- `OTP: verified` under the mobile is **deleted outright**: the number is the account's key
  and is *always* OTP-verified (`REG-10`/`REG-11`), so it distinguishes no request from any
  other — the same argument that retired the User Type column (D4).
- The three remaining answers — `differs`, `no-entry`, `not-checked` — collapse to **one
  row in the Request group**, `{register name} · {finding}`, in `warning` ink with the
  words. A lookup the court ran is a fact about the request, not an attribute of the
  person, which is also why it stops appearing beside four different values.
- **How** it differs is a comparison table (D20), because two values side by side is what
  "how" looks like.

*Rule:* owner 2026-09-11; ACCESSIBILITY §3 (never colour alone); `flag-composer`'s lesson
that a machine finding is not a verdict — still `warning`, never `destructive`.
*Rejected:* keeping a quiet "checked, agrees" row so the officer can tell a clean check
from an absent one. It is a real loss and it is logged in §11: the officer cannot
distinguish "the register agreed" from "nothing looked". The `not-checked` answer is what
covers the case that matters (the register was asked and could not answer).
*Open:* whether a Bar Council integration exists at all — **§12.11**, raised by the owner
in the same note. The design does not depend on it: with no lookup the block never renders.
*Fixes problems 9, 11.*

### D20 — **New.** Two shapes, and there is no third: a fact row, and a comparison table

The 2026-09-10 build made every fact a value — and then hung every *other* fact about that
value off the same row. One line could carry a name, a `Differs` chip, a `Changed` chip, a
muted "Bar Council of Kerala: Thomas Kurian" line and a struck-through "Was Thomas Kurian",
in a 190px column. The owner read it as *"an abomination of just information being thrown
around with no particular hierarchy… not scalable"*, and the diagnosis is right: the data
generalised, the **reading** did not.

So the overlay has exactly two shapes.

1. **`FactRow` → `DescriptionList` in a `Card`.** A term and its value. Nothing else
   attaches: no source, no mark, no previous value. Request metadata, the four submitted
   attributes, every rejection round. (DS Laws name this: "Description list inside Card for
   a single record's key-value fields".)
2. **`ComparisonBlock` → `Table`.** A column per source, a row per attribute, a heading
   naming what is being compared against what. Two today —
   *Does not match {register}* (`Submitted` · `On the register`) and *Changed at first
   login* (`Before` · `Now`) — and a third source is a third block with the same shape.

Three rules fall out of it, and they are the point:

- **No strikethrough, ever.** *"I hate this application of just striking out something that
  was previously before… it should clearly show what was before and after"* (owner). A
  strikethrough puts two values in one cell and says one of them is gone without saying
  what replaced it. Columns say both.
- **The table is the product's own** — `chrome/table-plate`, the treatment the queue behind
  the overlay wears, not a grid composed here. That answers the other half of the note:
  *"everywhere I am seeing a new unique way of this being implemented… UI should be
  scalable."* The fix for a new unique way is the shared one, not a better new one.
- ~~**The same two values are never tabled twice.**~~ **Reversed by D23** the following
  round. It was the right rule while both tables sat open in one column; once each moved
  behind the row that announces it, they answer two different questions and are never on
  screen together unless the officer opens both.

*Rule:* owner 2026-09-11; DS Laws (grouped content; description list role); `table-plate`.
*Rejected:* a third shape for "one value with an annotation" — that is the thing being
removed; a per-attribute mismatch chip (D5's) — the block's heading carries it once.
*Given up:* seeing a disagreement inline with the value it belongs to. The officer reads
the four values, then the exceptions, in that order, rather than all at once.
*Fixes problems 9, 12, 13.*

### D21 — **New.** Every stage past Review is a focused step, and it ends in green or red

Four notes from 2026-09-11, one answer.

- *"Why is it that when I reject… it's still staying in the same modal, like just how
  accept was going into the next step"* — because Reject kept the two-column review layout
  with a composer wedged into it. Reject, Approve and both settled states are now **one
  centred column**, `max-w-xl`, nothing else on the stage. Reading is done; the layout for
  reading goes with it.
- *"Someone like a scrutiny officer, they know they are going to get access to their
  account… who are you trying to explain this to?"* — the Approve stage's explanatory
  sentence is **deleted**. The stage is the identity being vouched for, and the footer.
- *"Calling out each name, is that scalable UI?"* — the settled outcome is a **heading, not
  a sentence with a name interpolated**: "Account created" / "Reason sent to the advocate",
  the same strings every time, with who it happened to in the Identity table beneath. A
  name in a labelled slot is scannable in the same place every time; a name in a sentence
  is prose.
- *"Is the next in queue contextually relevant to that same information? Why do you club
  it with that card?"* — the next request leaves the card entirely. It is the footer's
  button, and the button says what it does. **The next application number is not printed at
  all**: a serial the officer has never seen tells them nothing.

And the semantics: **approved is `success`, rejected is `destructive`** — the header badge,
the icon disc, and the outcome's ink. The 2026-09-10 build used `info` for a rejection on
the argument that it is a message on its way rather than a failure; the owner overruled it
(*"probably using red versus green"*), and the overrule is right for the reader, who needs
to know which of two decisions they just took.

*Rule:* owner 2026-09-11; DS three-treatments-per-status; ACCESSIBILITY §3.
*Rejected:* a solid `bg-success` panel as `SignBulkConfirmDialog` uses — on a tinted stage
the muted disc keeps the card white like its neighbours.

### D22 — **Adopted, and made the product default** (2026-09-11). The beige page on the queue screen

> The owner kept the iteration and made it the default for every work surface: *"the beige
> thing that we inverted, I want that to be the default."* It is now ui-craft §1.0 — see
> D35. The revert note below is historical.

Owner: *"I just want to see how it looks if you add that beige as the background here… if
I say no after seeing it, just revert it back."*

Built as asked, and flagged as the one thing on the branch arguing with a rule rather than
following it: ui-craft §1.0 keeps the page `bg-background` and gets depth from the lifted
panel, and a tinted page was owner-rejected once already (2026-08-17). What makes it worth
looking at is that `muted` is the tone the **rail** already carries, so page and rail become
one ground and the white panel is the only lifted thing on the screen — the arrangement the
overlay's own stage just adopted. Top bar stays `bg-card`; dark stays `bg-background`.

**Revert is deleting two utilities** on the screen's root element. Nothing depends on them.

### D23 — **New.** A finding opens where it is stated

Owner, 2026-09-11: *"Can you provide the information of what is not matching if I click
here? Or a drop-down interaction… so that I can actually see what is on the system records
versus what is not matching."*

The comparison tables (D20) leave the column and become the **detail of the row that
announces them**. `FactRow` gains a `detail`, and a row that has one renders its value as a
disclosure with a chevron; the table opens underneath, spanning the card rather than the
value column.

- **Bar Council check → Some details do not match** opens `Submitted | Bar Council of
  Kerala`.
- ~~**Request type → Edited Bar Council account** opens `Before | Now`.~~ **Reversed by
  D30**: the edit comparison is an open section again, and the type reads "Profile update".

Two consequences worth naming. First, the fact column on an ordinary request is now two
groups and a photograph — every exception is folded away until asked for, which is what a
queue read forty times a day should look like. Second, **D20's "never table the same pair
twice" is void**: on an edited account the pre-edit value *is* what the register still
holds, and both disclosures are legitimate answers to different questions asked from
different rows. The duplication that was a defect was two tables stacked in one column.

*Rule:* owner 2026-09-11; DS `Collapsible`; ACCESSIBILITY §8 (`min-h-10` on the trigger).
*Rejected:* a "view more" link that scrolls to a section — a link that moves you somewhere
else to answer a question asked here; keeping the tables inline and collapsing the *rows*
instead.
*Given up:* seeing an exception without a click. Accepted: the row states the exception in
warning ink, so nothing is hidden — only the detail is.

### D24 — **New.** The lookup row is named for the act, not the institution

Owner, same round: *"I don't understand what 'Bar Council of Kerala' here is trying to
convey… what does this heading mean is not very clear."* Correct: an institution's name in
a term column is a label with no verb. It does not say the court looked anything up.

The term becomes **"Bar Council check"** (`"Clerk register check"` on the clerk queue,
read off `registrantKind` like every other term). The specific register still names
itself — in the **column header of the table the row opens**, over the values it is
claiming, which is exactly where an attribution belongs and is what makes "what is on the
system records" legible.

### D25 — **New.** The focused stages carry typography, not caption labels

Three notes, one cause. *"'You are approving' is too small, and this looks like a plain
table"*; *"take a call on if we need these kind of subheadings for small sections — it's
not needed, very redundant"*; *"these kind of subheadings is making this entire rejection
and approval thing feel very cheap."*

The cause is that a `text-caption` label above a card holding two rows is scaffolding
around something too small to need it, and three of them stacked is scaffolding pretending
to be structure. So on every stage past Review:

- **No group labels at all.** Hierarchy separates the parts.
- **The person is the heading.** `IdentityCard` puts the name at `text-title-s
  font-semibold` with the registration number under it in mono, and whatever else the flow
  collected in a quiet list under a rule. `compact` drops it to `text-body` where the
  identity is context rather than subject.
- **The settled state is one card**, not three: outcome, rule, who, rule, what was
  written.
- **The reject stage is composed as a rejection** (the note that asked for it: *"it's not
  feeling like one… bring attention to the fact that you are rejecting and you're leaving a
  comment, not through text exposition"*). Identity quiet at the top; a box deep enough to
  invite a paragraph. *(The title-size question in destructive ink that this decision put
  there was **too much** — see D27. The stage keeps its shape; the red heading is gone.)*
- **The confirming button says what it confirms** — "Confirm approval" / "Confirm
  rejection", not the same word as the button that opened the stage: *"maybe the copy here
  should become confirm approval so that it doesn't look like nothing changed in terms of
  CTA."*

**Review keeps its two group labels** ("Request", "Identity"), and that is a deliberate
split rather than an oversight: there the labels distinguish two groups of four values that
would otherwise run together as eight rows in one card. The rule is *a label earns its
place by separating things that would be confused without it*, which is true on Review and
false on a stage holding one card.

### D26 — **New.** The evidence gets a frame, so its actions stop floating

Owner: *"I'm slightly concerned with how empty this section is looking… the download and
enlarge icon also looks like it's floating. Maybe it should have a slight line to separate
those as action items of the section, so that it's scalable for different kinds of
uploads."*

`DocumentPreview`'s quiet variant on a `card` surface now renders a frame: a strip with the
document's name at caption weight and the two icon actions in it, a `border-hairline`
under the strip, and the document filling everything below. The scaling half of the note is
answered by that structure — the frame is fixed, the content area is what varies, so a tall
card scan and a short one produce the same object.

Still not the default variant's header, which sits *above* the well and restates a date
(D15's objection stands). This one is inside the frame and carries no second heading.

### D27 — **New.** The act and having acted are one card, resolving in place

Owner, 2026-09-11 (late): *"the two approval screens or rejection screens feel redundant to
me. Is there any way to optimize it better, where it's not two steps but feels like one
step? Maybe masking it with motion."* And, of the same screens: *"it looks a little dull and
sad"*, and *"the rejection UI seems too alarming with the red big header, bold text and
everything. Tone it down, don't make it dramatic. Just clean, minimal, crafted."*

Three complaints, one cause: confirming and having confirmed were built as two screens, and
the second one shouted to justify its own existence.

**Five stages, three scenes.** `SCENE` maps `approve`/`approved` to one scene and
`reject`/`rejected` to another. The slide fires on a change of *scene*, so pressing Confirm
does not remount, does not translate, and does not replace anything. The card the officer
is looking at stays exactly where it is — measured on the render at 0px of movement on
approve, ~15px on reject — and **one strip across its top resolves**: a neutral "You are
approving" becomes a tinted "Account created". The footer changes with it. That is the
whole transition, and it is as close to one step as a guarded act can honestly get.

**One card holds the act on every decision stage.** Status strip · name and registration
number · the rest. On reject the "rest" is the composer, and when it settles **the box does
not leave — it fills in**: a `surface-sunken` well of the same footprint holding the words
that were typed. A control becoming a record, in place, is the argument the whole scene is
making.

**The volume came down.** The 48px status disc and the centred title-size line in
`destructive-ink` are gone; the status is a 16px mark and one line of body text on the DS's
muted tint. The reject composer's heading loses its ink and its mark too — the dialog title
already says "Reject this registration?" and the footer button is destructive, so a red
title-size question was the third telling and the loudest. **The semantics D21 asked for
survive intact**; only their volume changed. That distinction is the useful one to carry
forward: *green and red are the meaning, size and weight are the drama, and you can cut the
second without losing the first.*

**And the dullness.** What fills the card is not decoration but the fifth submitted value:
the Bar ID card photograph, at the size of a stamp, beside the name. The officer is
vouching for a person against a photograph (`REG-14`), so the photograph is still there
while they do it. It removes itself when the file will not open rather than leaving a
broken frame beside a name.

One more thing this decision buys: the settled card is no longer trimmed down to two rows.
It keeps the contact details it showed a moment earlier, because a card that loses two rows
when you press a button is a card that was replaced.

*Rule:* owner 2026-09-11; ui-craft §2 (loudness ladder; muted tints carry status, not size);
DS three treatments per status; ACCESSIBILITY §3 (`role="status"` on the strip's line).
*Rejected:* removing the approve confirmation entirely to make it literally one step —
approval grants a credential (D9) and the guard is the point; a height transition on the
dialog itself, which animates the modal's frame around content that is not moving.
*Given up:* ~15px of settle on reject, where a 128px composer becomes a 96px well. Reserving
the full height would have left a well of empty space under a two-line reason.

### D28 — **New.** Four corrections to the decision card

*(Round five, 2026-09-11 morning. Each is small; together they are the difference between
the shape being right and the screen being right.)*

**The strip reports the account, not the reason.** *"The actual action here was the account
didn't get created. So 'account rejected' should be the actual thing — 'reason sent to
advocate' is just a byproduct."* Correct, and the pair is now symmetrical: **Account
created** / **Account rejected**. The reason sits in the well below and needs no sentence
saying it was sent.

**The reject label keeps its size and gains a mark.** *"Instead of making it big, it should
remain as a normal 14-pixel token, but it should have an icon in it to bring attention."*
Three rounds have now tuned this one line: title-size in destructive ink (an alarm),
body-size with nothing (an ordinary form field), and now **body-compact with a 16px
destructive mark**. The rule the sequence establishes is worth keeping: *when a control
needs to declare its consequence, give the consequence to an icon and leave the type
alone.*

**The card lifts, and its header stops dissolving.** *"This banner is not readable against
the base background — that card top portion is just merging."* Measured: the pre-act strip
was `surface-sunken` on a `muted` stage, **1.01:1** — no boundary at all. The strip is now
white with a hairline under it, and the card carries `shadow-raised` **at rest** rather
than only on hover. A panel on a tinted stage is exactly what ui-craft §1 lifts; rationing
that lift to hover was the error, since a card on a decision screen is mostly not hovered.

**The ID card is big enough to be a likeness.** *"That image can be slightly bigger because
it's the ID card they upload — we can use it to personalise this entire modal according to
each person."* 48px → 80×128, and `object-contain` instead of `object-cover`, so the whole
card shows rather than a cropped band of it.

### D29 — **New.** "View next application" stops re-opening the dialog

*"The animation when I click on view next application is too abrupt."*

The cause was structural, not a timing value. `RequestBody` was keyed on the request, so
opening the next one **tore down `Dialog.Content` and built it again** — which replays
Radix's own open animation (a 100ms zoom) in the middle of a session that never closed. The
window appeared to slam shut and open.

The body is no longer keyed. It resets itself instead, during render, via React's
documented "adjusting state when a prop changes" — which matters over an effect because the
new request must never be painted for a frame wearing the last one's stage, or carrying a
rejection reason typed about somebody else. The dialog element survives; the record inside
it changes.

With the remount gone, the arrival gets its own motion: **not a slide**. Sideways means
"this request moved on"; a new record **rises and fades over half a second**, and the header
fades with it so the title and number do not swap instantly over a body that is animating.

One thing the remount was silently doing had to be rebuilt: focus. The button that opened
the next request is gone with the settled footer it lived in, so focus is sent to the fact
column — the same landing place the overlay uses when it opens.

*Rule:* owner 2026-09-11; React "adjusting state when a prop changes"; ACCESSIBILITY §6
(focus is never dropped to the body while a modal is open).
*Rejected:* lengthening the dialog's own open/close duration to disguise the remount — it
would have slowed every real open to hide a transition that should not have existed.

### D30 — **New.** What changed is the request; what does not match is named; the ID card is evidence

*(Round six, 2026-09-11.)*

**A profile update's changes are the content, not a footnote.** *"I like how this was
treated earlier, where this was a separate section of before and after… it should come
under request for sure… I don't think this is too important to see hidden away in a
drop-down."* The `Changed at first login` table leaves the Request type row and returns as
an **open section directly under Request**. The register's finding keeps its disclosure,
and the two now differ for a reason that can be stated: *a finding is an exception to look
into; an edit is the thing being reviewed.* D23's rule — a finding opens where it is stated
— survives; its extension to the edit does not.

**The type is "Profile update".** *"Edited Bar Council account does not make sense to me.
Update profile could be a request type."* The owner's words, turned from an instruction into
the noun a value column wants, so the three types are three answers to one question: New
registration · Profile update · Resubmitted · round 5. The queue chip says the same words.
Where the account came from is provenance, not the type of the request.

**The finding says which value is wrong.** *"'Some details do not match' is not helping me
understand what is actually not matching. Just mention full name… and then if they want to
see it they can click the dropdown."* The row now reads **Bar Council check · Full name does
not match**. The subject is computed from the attributes the register actually disagrees
with (`mismatchedTerms`), so a second comparison produces "Full name and Mobile number do not
match" without new copy.

**The disclosure opens pairs, not a one-row table.** *"It looks slightly misaligned… clunky."*
It was: a header well, an empty corner cell and three columns of its own widths, wedged into
a card whose every other row used a different grid. With the subject already in the trigger,
the table's first column and header were repeating it. The disclosure now opens **two rows in
the card's own grid** — Submitted · value, Bar Council of Kerala · value — measured aligned to
the rows above to the pixel, because they are the same rows. If a second attribute ever
disagrees, the subject is no longer single and it falls back to the table.

**The ID card leaves the name's row and takes the card's width.** *"This is too small to be
useful right now. This is like a decorative element. If we intend to show it to anchor
scrutiny officers' confirm approval or confirm rejection, it needs to be bigger."* Sized up
twice beside the name and read as decoration both times, because beside a name it can only
be a stamp — the name needs the width. It is now a **160px band across the card**, a sunken
well between two rules with the whole scan contained, and it carries real alt text: at this
size it is evidence, not ornament.

**Declined: initials beside the name.** Offered by the owner with an explicit out — *"if it
does not make sense, then don't add it."* It does not, for three reasons. The ID card is now
the likeness on this card, and a second identity mark competes with it. Initials say nothing
the name above them does not. And a Malayalam name's initials are not a convention the
product or a Kerala court uses, so the mark would be invented for half the queue.

*Rule:* owner 2026-09-11; DS Laws (description list for a record's fields; nested media
well inside a card); ui-craft §5 (the Chanel pass).

### D31 — **New.** Advocate clerks join the queue, and the section is renamed for both

Owner, 2026-09-11: *"this is not just for registering advocates. It can also be used to
register clerks… some of the things like their bar ID may not be relevant for a clerk… If
you look in the sign-up view, you will see what kind of information we are collecting for a
clerk… Register Advocates is not the right term for this section."* The filter was
explicitly deferred: a product-wide pattern for grouping filters is coming.

**What a clerk submits** — read off the sign-up (`lib/registration/content.ts`,
`verificationSteps.advocateClerk`) and the handover (§5.1): the same five values as an
advocate, in the same order, with two of them renamed. A **clerk registration number**
(`REG-13a`) instead of a Bar registration number, and a **photo of the clerk ID card**
(`REG-14a`) instead of the Bar ID card. Nothing else is collected, so nothing else is shown.

**What a clerk does not have** — a register. `REG-13`'s Bar Council lookup is an advocate
requirement and the handover names none for clerks, so a clerk's lookup is a new state,
`none`, which renders nothing. It is deliberately not `not-checked`: "could not be reached"
about a register that was never asked would put a system failure on a request that has
none. And no clerk is a *Profile update* — `REG-17`/`REG-18` pre-create accounts from the
Bar Council database, which holds advocates.

**The screen, changed at four points and no others:**

- **Role**, first in the Request group *(moved to the dialog header by D32)* and as a column
  beside the name, with the sign-up's own two values: *Advocate*, *Advocate clerk* *(now
  "Clerk", D32)*. First because it decides how everything
  after it is read — which number, which card, whether a register was ever asked. Filled on
  every row, the norm included: an empty Role cell would mean nothing in a column where both
  values are ordinary (unlike Request type, whose blank plainly means "first
  registration").
- **"Registration number"** as the column header; the overlay keeps the specific term per
  row. The advocate's term became **"Bar registration number"**, the sign-up's own word, so
  the two read as a pair.
- **The decision card** reads *Advocate clerk · CLK/1522/2016* under the name — the number
  means nothing until you know which register it belongs to, and on that stage the officer
  is about to grant exactly one of the two credentials.
- **Copy that assumed an advocate** — header count, both empty states, the search
  placeholder — now counts and names *registrations*.

**The title is "Approve registrations".** Verb and object, like every row in the Actions
group ("Register cases", "Approve copy application"), and *approve* because it is the word
the screen already speaks in — *Pending approval*, *Confirm approval*, *waiting for
approval*. The officer rejects here too, the way they refuse copies under "Approve copy
application"; the group names each queue by what it exists to grant. "Registrations" rather
than "accounts" because it is the thing waiting — an account does not exist until this
screen approves one. One constant (`APPROVE_REGISTRATIONS_TITLE`) feeds the heading, the
browser tab and the rail row, so the three cannot disagree.

*Rejected:* "Verify registrations" — names the work well but not the outcome the rest of the
screen is written around; "Approve registrations & clerks" — long, and the next registrant
type would rename it again.

**Measured:** six columns came to 935px in the 910px panel at 1280, the narrowest width the
table is shown at, and the column pushed off the edge was *Days waiting* — the one the queue
is read by. The Full name column's floor dropped from `min-w-48` to `min-w-40`; it wraps by
design and never truncates, so the cost is a line on the longest names. It now fits with
~7px to spare, which is thin — a seventh column would need the table→list swap to move to
`2xl`.

*Rule:* owner 2026-09-11; handover §5.1 `REG-13a`, `REG-14a`, §5.2 `REG-17`/`REG-18`;
`lib/registration/content.ts` for every label.

### D32 — **Superseded by D33.** Advocate and clerk look different before they are read

> **Reversed the same afternoon.** The mark below failed on the render: the owner had to
> *"literally hunt for where this information is"*, and the table's lone icon column read
> as cheap. D33 records why, and what replaced it. Kept for the reasoning, not the build.

Owner, 2026-09-11, mid-build: *"instead of saying Advocate Clerk, it should just say Clerk,
because it'll be easier to scan."* And: *"when I click into an item, I want a very visual
indicator… that I'm currently looking at the advocate registration and not the clerk
registration… not very loud, but distinct enough that it catches my attention… just a
small word of Advocate and Clerk does not do it. It needs a better signifier — especially
in the approval screen and rejection screen."*

**"Clerk".** The sign-up's "Advocate clerk" exists so an applicant can tell the role from a
court's bench clerk while choosing. An officer reading down a column of two values needs
them to differ in their first word, and "Advocate" / "Advocate clerk" did not.

**A mark, in two sizes — shape first, colour for the exception** (`role-mark.tsx`).

- *Shape.* A briefcase for an advocate (the brief is the advocate's case papers) and a
  clipboard for a clerk (who keeps the list). Both were unused in the product.
  `ScaleIcon` was the obvious advocate mark and was rejected because the advocate product
  already uses it for *cases*. Shape is what survives colour blindness, greyscale and dark.
- *Colour.* Advocates are most of the queue, so their mark takes the neutral well tone and
  recedes; clerks take `info`, which on this screen already means "not the ordinary case,
  nothing wrong" (the Profile update chip). The less common request is therefore the one
  that catches the eye. A clerk is never a profile update, so no row carries two blues.

**Where it appears.** As a **tile** beside the dialog title — the one part of the overlay
present on every stage, so the officer is shown what they are granting on Review, on
Approve and Reject, and on the settled card — with the role's word leading the header's
description, so a screen reader is told what an eye is shown. As a **glyph** on the lines
that already say the role: the table's Role cell, the phone list, and the decision card's
identity line, where the officer's eye is when they press Confirm.

**The Role row leaves the Request group.** It was a row for one round (D31); with the role
in the header on every stage, a row as well would be one fact in two places.

**And one copy defect it exposed:** the rejection placeholder said "the Bar ID card" to a
clerk. It now names the right card (`idCardName`).

*Rejected:* a coloured strip or edge on the decision card per role — it would have
competed with the settled state's green and red on the same element; a Badge per role in
the header — two chips side by side (state and role) read as two statuses, and the role is
not one.

### D33 — **New.** The role is in the title, and nowhere as an ornament

Owner, 2026-09-11, on D32 as built: *"I don't think it's evident enough… I had to
literally hunt for where this information is. I think it needs a little bit more rethinking
on how it can be shown more explicitly. I don't like the icons being used also, and how
it's getting shown in the table view. It looks very cheap because that's the only column
with an icon."*

**Why the mark failed, stated so it is not tried again.** A signal placed *beside* the
thing people read is a signal they have to go and find. The tile sat left of a generic
title and the word sat in the small line under it, so the one line every officer reads on
every stage — the title — said nothing about the role. Colour and shape did their job as
decoration and failed as information. And in the table, one column of icons among five of
plain values reads as the odd one out, not as a signal: the treatment was local to one
column, which is the "new unique way" the owner has flagged three times.

**What replaced it.** The role goes **into the title**, on every stage:

- *Review advocate registration* / *Review clerk registration*
- *Approve clerk registration?* · *Reject clerk registration?*
- *Clerk registration approved* · *Clerk registration rejected*

It is read as part of the question the officer is answering, at title size, before anything
else on the screen; a screen reader gets it as the dialog's name. No icon and no colour, so
nothing depends on either, and a third registrant type costs a noun.

**Everything else goes plain.** The Role column is text set like the registration number
beside it. The phone list's caption is text. The header description returns to the
application number alone (D16) — with the role in the title, saying it there too would be
one fact twice in one header. The decision card keeps "Clerk · CLK/2143/2018" under the name,
because there the word is doing a different job: naming which register the number belongs
to. `role-mark.tsx` is deleted.

**The DS gap filed with D32 stands** (§13) — it is still true that the system has no
categorical identity tint — but this screen no longer needs one.

*Rule:* owner 2026-09-11; ui-craft §2 (one presentation per data type across siblings);
the owner's recurring *"a new unique way of implementing"* objection.

### D34 — **New.** Account type is a pill, read first; colour means account type and nothing else

Owner, 2026-09-11: *"add the first row here as account type — clerk or advocate — with a
pill in it, and use that same pill design in the table view also. And standardise the pill
colour so that it's not too many colours going on. The status updates can have just a gray
or a beige, but this account type can have different colours… What's the first thing you
read and then you understand, okay, it's a clerk? You don't read the heading. Especially
when you become a power user, you don't read the heading of everything. You look at the
content immediately."*

That last sentence is the correction to D33 worth keeping: **a heading is read once, then
skipped; content is read every time.** D33 put the role in the one line every officer reads
— and the owner's point is that a practised officer stops reading it. The signal belongs in
the content, as a mark the eye picks up on its way to the values.

- **Account type** is the first row of the Request group, its value a pill. The queue's
  column is renamed to match ("Account type", not "Role") and shows the same pill. So does the
  decision card, beside the registration number, and the phone list. One category, one
  presentation, learned on the list and recognised in the record.
- **Request type is text, not a pill** *(owner, the same afternoon: "the two pills look a
  little odd")*. With the account type in a pill, a second pill on every exceptional row
  read as two tags competing for one glance. The account type is the row's one mark; the
  request type is a fact, set like the facts beside it, in the table and the phone list
  alike (it was already text in the record).
- **Colour answers one question per screen.** Every pill that reports a state — *Pending
  approval* (the one state pill left) — is the DS's neutral `secondary`
  (neutral-5, the warm grey the owner described). The only pills with a hue are the account
  type's. D7's coloured request-type chips (owner, round one) are reversed by the owner here.
- **The two hues.** With the states neutral, `warning` still means the wait escalation and a
  register finding and `destructive` still means an overdue wait and a rejection, so neither
  is free. `info` and `success` are: Advocate (the majority) takes the calmer `info`, Clerk
  takes `success`. The one place green means something else is the settled *Approved*
  state, where it is labelled on both sides. **This is still a borrowing** — the DS has no
  categorical tint (§13) — and the gap is now a real one on this screen.
- **The decisions keep green and red.** *Approved* / *Rejected* are the outcome the owner
  asked to read as accepted or refused (D21), not a status update.
- **D33's title stays.** It costs nothing, it is the dialog's accessible name, and it serves
  the officer who does read headings. It is no longer the signal.

*Rule:* owner 2026-09-11; ui-craft §1.4 (semantic colour is scarce — here, one meaning);
AGENTS rule 6 (no alpha fakes, so no invented tint).
*Measured:* the table still fits at 1280 — "Account type" is a wider header than "Role" but
the pills are narrower than "Advocate clerk" was.

### D35 — **New.** Two conventions this screen established, now defaults across the product

Owner, 2026-09-11, on readying this work for a pull request: the beige convention *"I want
that to be the default"*, and *"how we use motion graphics for modals to convey progressive
actions within a modal, and it will never be a modal-on-modal interaction."* Both are
written into the rails so they are followed by whatever is built next, not just remembered.

**1. The beige canvas under white panels** — ui-craft §1.0, §2, §4, §5.
The work surface is `bg-muted dark:bg-background` (warm neutral-2, the rail's own tone);
panels are white and lifted with `border-hairline shadow-raised` **at rest**; chrome — top
bar, sticky footers, a dialog's header and footer — stays `bg-card`. It inverts the rule it
replaces: the page used to stay white "always", with a tint allowed only on the e-filing
form. The difference from what was rejected on 2026-08-17 is stated in the rule itself —
that was cool grey under panels still separated by `border-border` strokes; this is warm
ground under panels that carry their own lift. Its one hard requirement, learned on this
screen (D28): nothing sunken sits directly on the canvas, because `surface-sunken` on
`muted` measures 1.01:1 and dissolves.

**2. A flow progresses inside one modal, never on top of it** — ui-craft §7 (new).
No step of a flow opens a dialog over the dialog. Stages are scenes: a change of scene
slides (right forward, left back); an act and its outcome are one scene and the card
resolves in place; a new record *arrives* in the same window rather than re-opening it —
so `Dialog.Content` is never keyed on the record. Every animation respects
`prefers-reduced-motion`, and focus follows the stage. This screen (D21, D27, D29) is the
reference implementation.

One question is left open for the owner in §7 itself: the document **Full view** is still a
dialog over a dialog. It is a viewer, not a step in a flow, which is why it was not changed
— but the rule as the owner stated it does not yet exempt a lightbox.

## 6. What I cut (and why)

**Read this first, because the critique could be misread as "add structure everywhere":**
what was rejected is *product copy narrating machine results*, not structure and not user
data. The officer's rejection reason stays **free text** — `REG-22` `[OWNER]` says so — and
that is legitimate precisely because it is a person's own words **in a consistent slot**.
A sentence the product writes to explain a lookup state is the opposite: fixed copy standing
in for a value. Structured rejection-reason chips remain cut.

- **Bulk approve** (D9) — the strongest thing a reasonable person would add, and the thing
  that would quietly void `REG-14`.
- **A "next request" conveyor** after each decision. Genuinely useful at volume; also an
  interaction pattern no court-side screen has. Revisit when §12.5 is answered.
- **Structured rejection-reason chips.** `REG-22` says free text; the gate plus a modelled
  sentence carries the lesson without minting a taxonomy nobody has validated.
- **A source *column*** (D2) — blank on three of five attributes, and unrenderable below `md`.
- **A green "matches" / "verified" badge** (D5) — marks the norm.
- **`warning` on `no-entry` and `not-checked`** (D5) — an incomplete register is ordinary,
  and the officer's next act is unchanged.
- **A lookup mark on the queue row** (D5) — the row already spends its one status cue on
  the wait, and there is no bulk path that a pre-filter would serve.
- **The sentence "Check the card before deciding."** True of every request, therefore
  information on none.
- **A "verification summary" — "2 of 3 checks passed", or a confidence mark.** The single
  most tempting thing to build once attributes are structured, and pure invention: nobody
  has said the checks are weighted, comparable, or sufficient, and `REG-14` says the human
  looks at the card regardless.
- **A per-attribute reject affordance** ("reject *this row*"). It falls out of the new model
  so naturally that it looks free — and it would change what `REG-22` stores and what the
  advocate is told. Product's call, filed as §12.10.
- **A status column / a "Pending" badge per row.** Said once, in the overlay header.
- **A "hold" / "query the advocate" third action.** The lifecycle has exactly two exits
  (§5.3); inventing a third state would be inventing product. §12.7.
- **Address, ID proof, ID type, map location** (D3).
- **The reference's success dialog and "Go To Home"** (D10).
- **A separate route for the detail view** (D1) — and with it, deep links.
- **The photo heading and its upload date** (D15) — and the temptation to replace them with
  a smaller caption, which is the same defect at a lower type size.
- **Rejecting the whole legacy visual language** — the *page* structure (title, count, one
  lifted panel, table, pager) is kept deliberately: that is the court side's own furniture
  across seven screens, and a new one is not a place to be interesting.

---

## 7. Layout & hierarchy

**Queue screen** (`/employee/approve-registrations`) — as built, with the two cross-cutting
changes from §1 applied:

- Page `p-6 md:p-8`, `gap-8` between header and panel.
- `h1` `text-title sm:text-title-l font-semibold` — "Approve registrations". Supporting line
  in `text-body text-muted-foreground` carrying the count once.
- **One** lifted panel: `rounded-xl border border-hairline bg-card shadow-raised p-6`,
  `gap-6`, holding search → table → `ListFooter`.
- Filter row: `gap-4`, wrapping, label above control. **No Search button** (§1, D9) — the
  query applies as typed. Clear search stays `ghost`. **No teal on this page.**
- Table: header well `bg-surface-sunken` with rounded end cells, `h-2` spacer row, rows
  `border-b border-hairline`, last row cleared. **The whole row is the click target** (§1);
  the application number is its first cell and the start of its accessible name.
- Table ↔ stacked items swaps at `xl` (measured: the table needs ~780px and has 656 at
  1024, and the column that clips is Days waiting).

**Decision overlay** — `ChromeDialogContent`, `flex max-h-[85dvh] flex-col gap-0
overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]`, keyed on the request id. Structure below is
the revision:

- **Header** `p-6 pr-16`, `gap-2`: `DialogTitle` "Review registration request" ·
  `Badge variant="warning"` "Pending approval" · `DialogDescription` = the application
  number, `tabular-nums`, **and nothing else** (D16).
- `Separator`.
- **Body** `grid min-h-0 flex-1 grid-rows-[auto_auto] gap-6 overflow-y-auto p-6
  md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden` — rows declared explicitly
  on both sides of the breakpoint, and the left column's `min-h-0` scoped to `md:`. (This is
  the `ApproveCopyApplicationDialog` recipe. The unconditional `min-h-0` with implicit rows
  resolved the claim row to 0px below `md` and painted its content behind the photo — a
  render defect already found and fixed once; do not reintroduce it.)

  - **Left column** `flex min-w-0 flex-col gap-6 md:min-h-0 md:overflow-y-auto`, three
    groups in this order:

    1. **Request** — group label `text-caption font-semibold text-muted-foreground`; rows:
       Submitted · Waiting (escalating tone, D6) · Request type.
    2. **Identity** — rows: Full name · Bar registration ID · Mobile number · Email
       (omitted when absent). Name and Bar registration ID adjacent (D5.5).
    3. **Earlier rejections** — resubmissions only. Newest round always visible; older
       rounds inside a `Collapsible` labelled "3 earlier rounds". Same row for all of them.

    Each group is a `DescriptionList` in a `rounded-lg bg-surface-sunken p-4` well. The
    reject-reason `Field` appears at the bottom of this column when Reject is armed.

  - **Right column** — the evidence (D15): the well alone, `height="fill"`, with Download
    and Full view as icon buttons on it. No header band.

- **`DialogFooter`**: `Button variant="destructive"` Reject · `Button` Approve (teal, the
  one on this feature). Stacked on small screens.

**Hierarchy, stated once.** Loudest thing in the overlay: the photograph (it is the
evidence). Second: the Identity group's values. Third: the `Differs` badge, which is the
only colour in the left column on a normal request. The group labels, the terms, and every
source line are `text-muted-foreground` — they are scaffolding, not findings.

---

## 8. Components (DS name → region)

| Region | DS component |
|---|---|
| Page title / count line | `text-title` · `text-title-l` · `text-body` type roles |
| List panel | composed `section` with the court-side panel classes (not a nested `Card`) |
| Search | `Field` + `FieldLabel` + `InputGroup` / `InputGroupAddon` / `InputGroupInput` |
| Clear search | `Button variant="ghost"` — **no `default` (teal) button on this page** |
| Queue table | `Table` · `TableHeader` · `TableRow` · `TableHead` · `TableCell` |
| Request-type marks on the row (Edited / Resubmitted · round n) | `Badge variant="secondary"` |
| Empty + filtered-empty | `Empty` · `EmptyHeader` · `EmptyMedia` · `EmptyTitle` · `EmptyDescription` · `EmptyContent` |
| Pagination | app-level `ListFooter` (`Pagination` + `Select`) |
| Decision overlay | `Dialog` via app-level `ChromeDialogContent`, `DialogHeader/Title/Description/Footer`, `Separator` |
| Pending state | `Badge variant="warning"` (once, in the overlay header) |
| **Attribute group** | `DescriptionList` in a `rounded-lg bg-surface-sunken p-4` well |
| **Attribute row** | `DescriptionRow` + `DescriptionTerm` + `DescriptionDetails` — i.e. the app's existing `ReviewRow` (`components/cases/filing-form-shared.tsx` lines 507–522), **extended with the source line, previous line and marks slots**. It already stacks to one column below `sm`, which is what makes one row model work at every width. |
| **Status marks** | `Badge variant="warning"` (Differs) · `Badge variant="secondary"` (Changed) — the closed set of two |
| **Source line / previous line** | `text-caption text-muted-foreground` inside `DescriptionDetails` |
| Earlier rejections | `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` around `Timeline` + `TimelineItem` |
| Evidence well + quiet actions | app-level `DocumentPreview` in its new quiet presentation (D15); actions are `Button variant="ghost" size="icon"` + `Tooltip` |
| Rejection reason | `Field` + `FieldLabel` + `Textarea` + `FieldError` / `FieldDescription` |
| Approve confirmation | `AlertDialog` via app-level `ChromeAlertDialogContent` |
| Photo loading | `Skeleton` |

**Removed from the previous composition:** `Alert` / `AlertTitle` / `AlertDescription` (the
lookup banner) and the hand-written `blockquote` + `h3` for the last rejection reason
(`approve-registrations-dialog.tsx` lines 226–244). Both go with D5 and D7.

Every DS name above exists in `vendor/pucar-design-system/src/components/ui/` (catalog
re-globbed for this revision, 68 components). **Nothing new is proposed — see §13 for why
the attribute row is not a DS request.**

---

## 9. Spacing

Ladder only (`0.5 · 1 · 1.5 · 2 · 2.5 · 3 · 4 · 6 · 8 · 12 · 16`), micro steps inside
controls only:

`p-6 md:p-8` page · `gap-8` page sections · `p-6` panel and overlay body · `gap-6` panel
stack, overlay grid, and the gap between the overlay's three attribute groups · `gap-4`
filter row and table→footer · `p-4` sunken wells and stacked phone rows · `gap-2` between a
group label and its list, and between a value and its marks · `gap-1` between a value and
its source / previous lines · `px-4 py-3` table cells and (from `DescriptionRow`) attribute
rows · `h-10` controls, including the icon buttons on the evidence well · `rounded-lg`
controls and wells · `rounded-xl` containers and the media well.

---

## 10. States (empty / loading / error / partial / long-label)

| State | What the screen does |
|---|---|
| **Empty queue** | `Empty`, good-empty voice: "No registrations waiting" / "Every advocate who has applied to this court has been dealt with." Icon `UserCheck`. No action offered. |
| **Filtered empty** | "No requests match this search" / names what was searched + `Clear search` (`outline`). |
| **Loading (list)** | No backend in this build, so none. When one arrives: the panel keeps its frame, rows become `Skeleton`. |
| **Loading (photo)** | `Skeleton` at the well's full height. Never a collapsed well. |
| **Photo fails to load** | Say it plainly in the well — "This photo could not be opened" — and **keep the Download icon reachable**. Approve is not blocked. (With D15 the actions sit on the well, so this state must not paint over them — check on the render.) |
| **`matches` row** | Value, then `Bar Council of Kerala: matches` in muted caption. No badge, no colour. This is what most rows look like, and it must be quiet. |
| **`differs` row** | Value, `Badge warning` **Differs** beside it, `Bar Council of Kerala: Meera Sudhakaran` beneath. Both names carry their own `lang` — the register's answer never borrows the claimant's tag, since the whole point is that they are different names (ACCESSIBILITY §13). |
| **`no-entry` / `not-checked` row** | Muted source line on the Bar registration ID row: `Bar Council of Kerala: no entry` / `Bar Council register: not checked`. **Never a blank slot, never "—"** — an absent source line means *nothing checks this attribute*, and that distinction has to survive. |
| **`changed` row** (`REG-18`) | `Badge secondary` **Changed** + `Was 9847051204` (struck) or `Added at first login` when the Bar Council record held nothing. |
| **A row that is both `differs` and `changed`** | Two chips in the marks slot, warning first. Must be checked on the render: two chips plus a long term must not push the value onto a fourth line. |
| **Long / Malayalam names** | `whitespace-normal` everywhere, no fixed widths, `min-w-0` on flex children. A Malayalam name is taller as well as longer. The source line wraps under the value, which is the layout's own justification (D2). |
| **A Malayalam value against a Latin register answer** | The `differs` case at its worst: two scripts, two `lang` tags, one row. Stacked (not side-by-side) is what makes it survive. |
| **Email absent** (`REG-15`) | The row is **omitted**, not shown as "—" (the `CounselCell` precedent: an absence is not a missing value). |
| **Bar ID shapes across states** | `K/0873/2009`, `MAH/2201/2010`, `G/60/1992`, `KAR/12453/2018`. `tabular-nums whitespace-nowrap`; the column is sized off the longest, not off Kerala's short form. |
| **Resubmitted five times** | `Request type` reads "Resubmitted · round 5"; the newest rejection is visible with its reason in full; four older rounds sit inside "4 earlier rounds". The group does not grow without bound. |
| **Very old item** | Escalated tone on both the queue cell and the overlay's `Waiting` row (D6); the longest-wait-first sort keeps it on page 1. |
| **200% zoom / ~375px** | Table → stacked items; overlay grid → single column (Request, Identity, Earlier rejections, then the photo); footer buttons stack. The evidence well's icon buttons stay 40×40 and inside the well. |

**Demo data** stays as built and already exercises the new model: a Malayalam-script name,
a long English name, four bar-ID shapes, an `REG-18` edit with one change and one addition,
a resubmission at round 2 and one at round 5, one `disagrees`, one `unavailable`, one
`not-found`, one 61-day wait, one photo that will not load. **One gap to add for the
rebuild:** a row that is both `edited` and `differs`, so the two-chip case in §10 exists in
the data rather than only in this table.

---

## 11. Risks accepted

- **The slug still says `approve-registrations`** (2026-09-11). The branch carrying this work
  is `feature/approve-registrations`; the route, module and brief file were not renamed with
  it. The section is "Approve
  registrations" everywhere a person reads it; the route, the component and module names,
  and this file keep the old slug. Renaming them is mechanical, but it moves a URL the owner
  reviews on and touches the rail module a parallel session works in, so it is left for a
  quiet moment rather than folded into a copy change.

- **No bulk path.** Clearing a large queue is slow by construction (D9). Accepted; the
  alternative voids the only identity check the product has.
- **Deep links lost.** No URL per request (D1). Accepted.
- **The evidence column's icon-only actions fork a pattern.** Every other Dristi preview
  labels Download and Full view in words (D15). Accepted for a repeat-user staff screen,
  mitigated by tooltips and `aria-label`s, and owed a reconciliation: if it holds, quiet
  mode becomes the shape for every side-by-side preview, starting with the scrutiny
  workbench. If it does not, the words come back — in the well, not in a header band.
- **The "no answer at all" rule depends on row order.** `no entry` / `not checked` is
  stated on the Bar registration ID row and read as covering the name above it (D5.5). A
  future reorder that separates those two rows silently breaks it. Whoever moves them owes
  the source line a second home.
- **Days-waiting has two treatments on the court side** — escalating here, flat
  `warning-ink` on `register-cases` (D6). A real pass-7 defect, accepted only until
  `register-cases` is reconciled.
- **The `differs` mark depends on a lookup contract nobody has confirmed** (§12.4). If the
  lookup returns nothing usable, every source line degrades to `not checked` and the
  officer makes all comparisons by eye. **The layout survives unchanged** — which it did
  not under the prose model, where each state was its own paragraph. That is the point of
  the enum.
- **Visible, escalating waits are a nudge, not a control.** They do not stop an officer
  sitting on requests (the Kerala practice note). A real control — an SLA, reassignment, an
  audit trail — is product's to specify.
- **Thresholds for escalation are borrowed** from the scrutiny queue (7/14 days) with no
  product basis (§12.5).
- **The rail count is static after a decision** (D10) — a codebase-wide gap, not this
  screen's.
- **Pass 8 has not been run on the rebuild** and cannot be claimed. It ran on the *previous*
  build (2026-09-10, 375 and 1280, light) and found and fixed two defects: the email value
  clipping in the claim well, and the sub-`md` claim-row collapse. **What the rebuild must
  re-check on the render, at 375 / 1024 / 1280 and 200% zoom:**
  1. The two icon buttons on the evidence well against a **pale** card scan (`PALE_CARD`) —
     ghost buttons on a near-white photograph is the exact fill-on-fill case that only the
     render answers. Measure; if it fails, the cluster gets a surface, not a darker icon.
  2. Those buttons against the **failed-photo** state, which paints its own icon and two
     lines of text into the same well.
  3. A row carrying two chips and a long Malayalam term.
  4. Whether three sunken group wells stacked in one column read as three panels or as
     stripes — if they stripe, the group label carries the separation and the wells go.
  5. That removing the preview header did not leave the right column's first pixel higher
     than the left column's, which would read as a misalignment across the grid.

---

## 12. Open questions for product

1. **Notification channel and content.** Handover §12 puts notification copy out of scope;
   the owner guessed email; the legacy advocate screen promises SMS. *Leaning, not decided:*
   the rejection reason should be readable **in the app** on the advocate's own waiting
   screen, with the notification carrying only "there is an update". Blocks nothing here.
2. **Is an approved registration actually immutable?** The legacy confirm claims it; the
   handover does not say. Until answered, the dialog states what approval *grants* and does
   not claim what it *forecloses*.
3. **Does this queue also carry clerk registrations** (`REG-13a`/`REG-14a`)? Answer decides
   whether the User Type column returns (D13).
4. **What does the Bar Council lookup return, and when?** A name? An enrolment status? Live
   per request or a periodic sync? A stale sync means the `differs` mark can be wrong, which
   changes how loudly it is allowed to speak. **Added by this revision:** *is the register
   complete for a given state deployment?* Revised D5 renders `no entry` as ordinary and
   unmarked on the strength of `lib/filing/registry.ts` saying the register never is. If
   Kerala's is, `no entry` becomes a finding and gets the `warning` mark — a one-value flip
   in the enum, not a redesign.
5. **Real daily volume, and what "too long" means here.** Decides whether the conveyor and
   the mismatch filter earn their place (D9, D11) and replaces the borrowed 7/14-day
   thresholds (D6).
6. **Who owns this queue, and is it courtroom-scoped?** `actors.md` defines the Registry /
   Scrutiny officer as the office scrutinising **filed complaints**; `REG-35`–`REG-38` put
   every employee on a **courtroom** list, while a Bar registration is not courtroom-scoped
   at all. **Whose queue does a given request land in?** Two officers seeing the same
   request need claiming; nobody seeing it is worse. The one open question that could still
   change this screen's structure.
7. **Is there a third outcome?** Officers may want to ask a question without rejecting.
   §5.3 has two exits. Deliberately not invented (§6).
8. **Where does an approved registration land, and what happens to a rejected one?**
   `ADVOCATE_LOOKUP` is presumably the destination, unconfirmed. Does a decided request
   remain visible anywhere as a record?
9. **Handover Q-1 — help-desk contact details.** An officer rejecting for a suspected
   duplicate has nowhere to point the advocate.
10. **Added by this revision — should a rejection name the attribute it is about?** Now that
    every submitted value is a first-class attribute with a status, the obvious next move is
    to attach the officer's reason to the row that failed: `{attribute, reason}` instead of
    one free-text field. It would make rejections analysable, would let the advocate's own
    screen highlight the field to fix, and would directly serve the documented failure of
    one-word remarks (`flag-composer.tsx`). **It is also a product change**, not a design
    one: it alters what `REG-22` stores and what the advocate is told. **Not built. Only the
    owner can authorise it**, and this brief deliberately stops at the door.

Items 1–5 and 7–10 have UI consequences and stay in this brief. Item 6 additionally
belongs in `docs/product/open-questions.md` as a role/product-user question — filing it
there is product's call, not this brief's.

---

### 12.11 — Is there a Bar Council integration at all? **[OWNER / PRODUCT]**

Raised by the owner on the render, 2026-09-11: *"this Bar Council of Kerala matches assumes
that we are doing an API check to Bar Council… it might be possible also, but is that
relevant information?"* The handover names the officer's verification as the **Bar
registration ID and the photograph** (`REG-14`); it does not describe a register lookup.
`lib/filing/registry.ts` models one for the filing side, which is where this screen's
`BarCouncilLookup` came from.

The screen is built so the answer does not change its shape: with no lookup, `registerAnswer`
is never anything but silent and neither the Request row nor the comparison table renders.
What product has to settle is whether the court is entitled to assert a mismatch against a
register at all — and, if so, whose register and how current.

### 12.12 — What does a clerk registration number look like, and is there a register? **[PRODUCT]**

The sign-up's clerk field gives no example ("Your clerk registration number") where the
advocate's shows "K/1234/2020", and the handover names no issuing body. The demo's
`CLK/serial/year` is shaped like the Bar numbers so the column sizes sensibly — **it is not a
claimed format.** Two answers are needed: the real format (it drives the column width and
search), and whether any register can be consulted for clerks. If one can, the `none` lookup
becomes a real one and `registerCheckTerm("clerk")` — "Clerk register check" — already
exists to name it.

## 13. Gaps in the DS (if any)

**Filed 2026-09-11: a categorical tint for identity.** *(Needed again by D34, which
borrows `info` and `success` for the two account types.)* D32 needed two roles to differ in colour, and the DS has no sanctioned family for it: `chart-1…5` are solids that AGENTS.md
scopes to data visualisation ("never status", and by implication never UI identity), with
no muted pair, so a pale tile would have to be faked with an opacity modifier — which rule
6 forbids. The build borrows `info` for clerks and leaves advocates neutral, which is
defensible on this screen and would not survive a third role. **Proposal for the DS:** a
small categorical family (two or three hues) with the same three treatments as a status —
solid, muted, ink — explicitly for "which kind of thing is this", distinct from status and
from data series.

**None filed, and the attribute row is not one.** The row is
`DescriptionRow` + `DescriptionTerm` + `DescriptionDetails` (all real, in
`vendor/pucar-design-system/src/components/ui/description-list.tsx`), with the source line
as `text-caption text-muted-foreground` inside the `dd` and the marks as `Badge` in the
existing `warning` / `secondary` variants. That is composition — the thing AGENTS rule 3
("reuse before creating") asks for — and the app already owns the wrapper it goes in
(`ReviewRow`). Filing a request for a primitive that composes in a dozen lines would be
noise in a queue that currently holds eleven real gaps.

**One thing this revision *removes* a dependency on.** The built overlay used `Alert
variant="warning"` for a standing finding, which is exactly the misuse behind open request
**#9 — "`Alert` is always `role="alert"` — no quiet standing notice"** in
`docs/design/ds-requests.md`. A register mismatch is a fact to notice, not an
interruption to announce, and a `role="alert"` region announces itself the moment the
overlay opens. Moving the finding onto a `Badge` on the row it concerns retires that
dependency here. Request #9 stands on its own merits for the screens that raised it.

**Two things to watch rather than file:**

- If a **second** Dristi screen needs the same triple-line verification row — and the
  scrutiny workbench is the obvious candidate, since it also sets filed values against an
  authority — then it stops being one screen's composition and becomes a DS proposal, with
  measurements and both callers named. Not before.
- The DS's destructive guidance is written for *irreversible* work, and this screen needed
  the inverse case: a destructive-sounding act that is reversible by design (D8). The
  existing rule already answers it correctly ("destructive is the soft/at-rest treatment"),
  so this is a note for the next reader.

---

## 14. Decision log

| Date | Change | Who |
|---|---|---|
| 2026-09-10 | Job confirmed as the approval queue for self-registered advocates — "it's option 1, the approval queue"; not a data-entry form. | owner (Abhiram) |
| 2026-09-10 | Placement confirmed: a row in the court-side **Actions** group, one entry in `COURT_NAV_GROUPS`, count derived from the queue. | owner |
| 2026-09-10 | Rejection requires a free-text reason, "similar to how the scrutiny comment happens"; notification channel explicitly a guess, not a fact. | owner |
| 2026-09-10 | Screenshots are concept reference only — "build a better version… based on the kind of information we are asking to the advocates in the registration flow". | owner |
| 2026-09-10 | First pass written: overlay instead of the reference's detail route (D1); claim-vs-evidence layout (D2); dead fields deleted (D3); User Type and "Verify" columns killed (D4); lookup stated as `warning`, never destructive (D5); escalating wait (D6); no bulk approve (D9); no reason chips (§6). | ux-designer |
| 2026-09-10 | Teal budget written down explicitly (D9) — Search on the queue, Approve in the overlay. *(Superseded the same day; see below.)* | ux-designer |
| 2026-09-10 | Recorded that `actors.md` carries a Registry / Scrutiny officer entry scoped to complaint scrutiny — the gap is the scope of the role, not its absence (§1, §12.6). | ux-designer |
| 2026-09-10 | `npm run check:ds-fresh` not run (no shell); DS origin and pin verified by reading the repo. Must be run before build. | ux-designer |
| 2026-09-10 | Built (`f453fd1`) and verified on the render at 375 and 1280. Two render defects fixed: email `dd` clipping, and the sub-`md` claim-row collapse. | ui-designer / orchestrator |
| 2026-09-10 | D10 corrected: the rail count does not drop after a decision; the sibling has the identical limitation. Accepted as a codebase-wide gap. | orchestrator |
| 2026-09-10 | ui-reviewer audit: no new criticals, gates green. S1 (table↔list swap at `xl`), S2 (`Collapsible`), S3 (focus returns to Reject), S5 ("Kind" → "Request type"), S6 (`aria-describedby`), N3 (register name carries its own `lang`) applied. | ui-reviewer / ui-designer |
| **2026-09-10 (evening)** | **Owner rejected the decision overlay's contents on the render** — *"the information inside this modal does not make any sense… it's not at all scalable… You are relying too much on custom copy to do the heavy lifting."* The overlay **shape** (D1) is explicitly kept: *"I like that it's a hover, like a modal that opens up."* | owner |
| **2026-09-10 (evening)** | **Problems 9 and 10 added** — prose-instead-of-attributes (four lookup variants + two narrated request kinds, cited to `approve-registrations-dialog.tsx`), and the evidence region's competing title band (cited to `document-preview.tsx` 141–165). Problems 1, 2, 4, 5, 6, 7, 8 marked **resolved** by the build and kept in the record; problem 3 marked half-resolved and folded into 9. | ux-designer |
| **2026-09-10 (evening)** | **D2 rewritten.** The overlay's left column becomes one repeated attribute row — `term · value · source line · previous line · marks` — in three groups (Request, Identity, Earlier rejections). Two-column submitted-vs-source **rejected**: it is blank on 3 of 5 attributes and does not survive ~190px per value with Malayalam names. The claim-vs-evidence split from the first D2 survives; its prose contents do not. | owner (direction) / ux-designer |
| **2026-09-10 (evening)** | **D5 rewritten.** The register's answer moves onto the attribute it checks as a closed status enum (`matches` / `differs` / `no-entry` / `not-checked` / `verified` / `none`); the banner `Alert` is deleted. `warning`-not-`destructive` and never-colour-alone **survive**; `no-entry` and `not-checked` **lose** their warning treatment. Also resolved a live contradiction: the first D5 promised a row-level mismatch mark the build never had — decided deliberately that the queue row carries **no** lookup mark. | ux-designer |
| **2026-09-10 (evening)** | **D7 revised.** The three-kind classification survives; its prose rendering does not. Request type becomes a closed value in the Request group; the "This account was created from the Bar Council record…" paragraph and the "Round 4, rejected 8 July 2026…" sentence are deleted. All rejection rounds now render with **one** row (newest first) instead of a quote block plus a timeline — a pass-7 defect the build shipped. The history's `decision` field is not rendered while "Rejected" is its only value. | ux-designer |
| **2026-09-10 (evening)** | **D15 added.** The evidence region loses its heading, its upload date and its two text buttons; Download and Full view become 40×40 icon buttons on the well, built as a quiet presentation of the app's `DocumentPreview` (never a second hand-rolled well). Pattern fork named and accepted in §11. | owner (direction) / ux-designer |
| **2026-09-10 (evening)** | **D16 added.** Request metadata is its own attribute group, not header prose; the application number stays in the header description and is not repeated; the advocate's name **leaves** the header, because printing a value under verification as the record's title asserts it. | ux-designer |
| **2026-09-10 (evening)** | **D9 and D11 corrected for two parallel cross-cutting changes** — search filters as you type (the Search button goes away app-wide) and the whole table row becomes the click target. The queue page therefore has **no page-level primary**, which is what D9 argued was correct all along; the "teal on the queue page is Search" line is void, and two code comments asserting it must change with the rebuild. | orchestrator / ux-designer |
| **2026-09-10 (evening)** | **§6 clarified** so the brief cannot be read as rejecting structure wholesale: the officer's rejection reason stays free text (`REG-22`) because it is *user data in a consistent slot*; what was rejected is *product copy narrating machine results*. Reason chips remain cut; a per-attribute rejection is filed as §12.10 for the owner to decide. | ux-designer |
| **2026-09-11 (conventions → defaults)** | **Two conventions made product defaults and written into the rails** (D35): the beige canvas under lifted white panels (ui-craft §1.0, inverting the white-page rule) and one-modal progression with motion, never modal-on-modal (ui-craft §7, new). D22 adopted. Full-view lightbox left as an open question in §7. Branch `feature/approve-registrations` cut for the pull request, not yet raised. | owner (direction) / orchestrator |
| **2026-09-11 (request type as text)** | Request type drops its pill in the queue and the phone list — owner: "the two pills look a little odd". Account type is the row's only pill. Owner signed off the rest of D34 as built. | owner |
| **2026-09-11 (account-type pill)** | **Account type is a pill, read first** (D34): first row of the Request group, the queue's renamed column, the decision card and the phone list, all the same pill — Advocate `info`, Clerk `success`. Every state pill (*Pending approval*, *Resubmitted*, *Profile update*) goes neutral `secondary`; colour now means account type only. D7's coloured request-type chips reversed. D33's title kept as the accessible name, no longer the signal. | owner (direction) / orchestrator |
| **2026-09-11 (role in the title)** | **D32's role mark reversed** (D33): the owner had to hunt for it, and the table's lone icon column read as cheap. The role now leads every stage title — *Review clerk registration*, *Approve clerk registration?*, *Clerk registration approved* — and every other mention is plain text. Header description back to the application number alone. `role-mark.tsx` deleted. | owner (direction) / orchestrator |
| **2026-09-11 (role mark)** | **Advocate and clerk get a signifier** (D32): "Clerk" replaces "Advocate clerk"; a role mark — briefcase / clipboard, neutral for advocates and `info` for clerks — as a tile beside the dialog title on every stage and as a glyph in the Role column, the phone list and the decision card's identity line. The Role row leaves the Request group for the header. The rejection placeholder now names the clerk ID card for clerks. DS gap filed for a categorical identity tint (§13). | owner (direction) / orchestrator |
| **2026-09-11 (clerks)** | **Advocate clerks join the queue; the section is renamed "Approve registrations"** (D31). Clerks read off the sign-up and the handover: same five values, a clerk registration number and clerk ID card, no register (new `none` lookup state) and never a profile update. Role returns as a column and as the first Request row; the number column becomes "Registration number"; the advocate term aligns to the sign-up's "Bar registration number"; the decision card shows the role before the number. Three demo clerks added. Name column floor lowered after six columns measured 25px over at 1280. Filter explicitly deferred by the owner pending the product-wide filter pattern. D4 and D13 amended; §12.12 and a slug risk opened. | owner (direction) / orchestrator |
| **2026-09-11 (design-mode round 6)** | **Three comments, one offer.** The edit comparison returns as an open section under Request; the type reads "Profile update" in the overlay and the queue chip alike; the register finding names the attribute ("Full name does not match") and opens two aligned rows instead of a one-row table; the ID card becomes a 160px band across the decision card with real alt text (D30). The owner's initials-badge idea declined, with reasons, at their invitation. D23 amended. | owner (direction) / orchestrator |
| **2026-09-11 (design-mode round 5)** | **Four corrections.** The settled strip reports the account (created / rejected), not the byproduct; the reject label returns to body-compact and takes a 16px destructive mark instead of size; the decision card lifts at rest and its header strip goes white with a rule, after the old `surface-sunken` strip measured 1.01:1 against the stage; the ID card photograph goes to 80×128 `object-contain` (D28). "View next application" stopped remounting `Dialog.Content` — the abruptness was Radix's open animation replaying — and a new record now rises and fades in its own motion, with focus sent to the fact column (D29). | owner (direction) / orchestrator |
| **2026-09-11 (design-mode round 4)** | **One note, three complaints.** Confirming and having confirmed became one card that resolves in place — five stages, three scenes, no remount and no slide between the act and its outcome (D27). The settled state lost its 48px disc and title-size ink line for a 16px mark on a muted strip; the reject composer lost its red heading; the semantics of green and red survive at lower volume. The Bar ID photograph joins the card as a thumbnail, and the settled card keeps the rows it had a moment before. D21 and D25 amended. | owner (direction) / orchestrator |
| **2026-09-11 (design-mode round 3)** | **Eight render comments.** Comparison tables moved behind the row that announces them, as disclosures spanning the card (D23) — which voids D20's no-duplicate-pairs rule; the lookup row renamed for the act, with the register naming itself in the column header (D24); caption group labels removed from every focused stage, the person made the heading, the settled state collapsed to one card, the reject stage recomposed in destructive ink at title size, and the confirming CTAs renamed to "Confirm approval" / "Confirm rejection" (D25); the evidence well given a framed title strip so its icons stop floating (D26). D15 amended. | owner (direction) / orchestrator |
| **2026-09-11 (design-mode round 2)** | **Nine render comments.** The overlay's fact model rebuilt around **two shapes** — a term/value row and a comparison table on the product's own `table-plate` (D20); strikethroughs and the `Differs`/`Changed` chips deleted; the register reduced to one Request row that speaks only when it disagrees, `matches` and `OTP: verified` deleted (D19); Reject, Approve and both settled states became focused single-column stages, the settled outcome a heading rather than a sentence with a name in it, the next request moved out of the card and its number dropped, approved/rejected now green/red (D21); explanatory copy removed from the reject label and the approve stage (D8, D21); the review split widened to 3:2 and the overlay to `max-w-5xl`; the beige page built as a reversible iteration (D22). D5 superseded; §12.11 opened on whether the Bar Council lookup exists at all. | owner (direction) / orchestrator |
| **2026-09-10 (design-mode round)** | Four render comments implemented. (1) Request-type chips colour-coded — `info` Edited, `warning` Resubmitted (D7). (2) Search placeholder sentence-cased — at the owning layer, all fourteen court-side queue placeholders. (3) Overlay body is a tinted stage with white hairline cards and a white photo well, hover-lifted (D18; `DocumentPreview surface="card"`). (4) Decision is a staged slide inside one overlay, with settled end states and "View next application" (D17; supersedes D9's `AlertDialog` and rejected conveyor, and D10's "no success dialog"). Brief D9, D10, D15 revised accordingly. | owner (direction) / orchestrator |
| **2026-09-10 (evening)** | **§13**: no DS request filed — the attribute row composes from `DescriptionList` + `Badge`. Recorded that deleting the lookup `Alert` retires this screen's dependence on open DS request #9 (no quiet standing notice). | ux-designer |
