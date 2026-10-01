# Order templates

Source: owner-supplied **Order Template Catalogue** PDF (from `Untitled
spreadsheet.xlsx`, Sheet2), handed over 2026-09-13, dated **2026-09-07**.
Transcribed here verbatim so the composer has one source of truth rather than
seventeen English sentences invented in `lib/employee/order-items.ts`.

This is the answer to the open question §12 of
[../design/proposals/hearing-order.md](../design/proposals/hearing-order.md) —
*"Where do the standing words for each item come from?"* — and to the one after
it, *"Does an item need parameters of its own?"* (yes: locked variables).

**Still to add, per the source:** case stages where each order is most likely
issued; grouping for the order-issuance screen.

**Known gap in the transcription:** the source PDF's rightmost **Workflow**
column is clipped on every page. What is legible is recorded below and marked
`[clipped]`. Treat those cells as unconfirmed.

---

## Notes from the source

**Case stage changes are not workflows.** A listener monitors all order events.
When it sees specific order types (case transfer, settlement, dismissal,
abatement, moving to/from LP register, etc.), it updates the case stage
accordingly. The Workflow column only lists workflows the order itself triggers.

**Application workflows belong to the application, not the order.** When an
application is accepted, any workflow associated with that application type is
triggered. These are not listed in the Workflow column because the workflow is a
property of the application type, not of the "accept application" order.

**"In dropdown" vs application orders.** Orders marked **Yes** can be manually
selected by the judge from the order generation screen. Orders marked **No** are
not in the dropdown — they appear only in context (e.g. when the judge is acting
on an application).

**BOTD text vs full order text.** The template text below is the **Business of
the Day (BOTD)** text — the short operative line that appears on the day's cause
list and business record. The magistrate can separately define the longer,
detailed order text when composing the full order.

---

## General variables

Available to every template. Auto-populated — the judge never types these.

| Variable | Source | Description |
|---|---|---|
| `[Court Name]` | Court data | Name of the court |
| `[Case Name]` | Case data | e.g. "X vs Y" |
| `[Case Number]` | Case data | Case number |
| `[Current Date]` | System | Today's date |
| `[Judge Name]` | Court data | Presiding judge |
| `[Judge Designation]` | Court data | e.g. JMFC |
| `[Complainant Name]` | Case data | Name of the complainant |
| `[Accused Name]` | Case data | Name of the accused |
| `[Party Type]` | Case data | Complainant, Accused, or Witness |
| `[Party Name]` | Case data | Any person in the case — complainant, accused, witness, or PoA holder |
| `[Document Type]` | Master data | Type of document (e.g. complaint, affidavit, vakalat) |
| `[Hearing Purpose]` | Master data | Purpose of hearing (e.g. Appearance, Evidence, Arguments) |
| `[Current Hearing Date]` | Case data | Date of the current/most recent hearing |

---

## Order types

**Locked variables** are needed by the workflow and cannot be removed.
**Optional variables** can be added or removed freely.

| # | Order type | In dropdown | BOTD template | Locked variables | Optional variables | Workflow |
|---|---|---|---|---|---|---|
| 1 | Order under section 202 CrPC | Yes | *(no template)* | — | — | — |
| 2 | Mandatory submissions and responses | Yes | It is directed that the [Party Type] files a [Document Type] for [Document Name] before the court by [Deadline for Submission]. Additionally, the [Party Type] must submit a response by [Deadline for Response]. | `[Party Type]` · `[Document Type]` · `[Document Name]` · `[Deadline for Submission]` · `[Deadline for Response]` (conditional) | — | Create … task; … response … response … `[clipped]` |
| 3 | Accept extension for submission deadline | No | Application [Application Number] for extension of deadline of submission of [Document Type] for [Document Name] is accepted. The [Party Type] is required to submit the same by [New Submission Date]. | `[Application Number]` · `[Document Type]` · `[Document Name]` · `[Party Type]` · `[New Submission Date]` | — | Update … deadline `[clipped]` |
| 4 | Reject extension for submission deadline | No | Application [Application Number] for extension of deadline of submission of [Document Type] for [Document Name] is rejected. | `[Application Number]` · `[Document Type]` · `[Document Name]` | — | — |
| 5 | Referral of case to ADR | Yes | Both the Parties have voluntarily agreed to seek resolution through [Mode of ADR]. The parties are hereby referred to [Mode of ADR] to resolve their dispute by [Date of End of ADR]. | — | `[Mode of ADR]` — mediation/arbitration/etc. · `[Date of End of ADR]` — deadline | — |
| 6 | Scheduling of hearing date | Yes (when hearing not ongoing) | Next hearing is scheduled on [Hearing Date] for [Hearing Purpose]. | `[Hearing Date]` · `[Hearing Purpose]` | — | Schedule hearing `[clipped]` |
| 7 | Rescheduling of hearing date | No | Next hearing scheduled on [Original Hearing Date] for [Hearing Purpose] has been rescheduled to [New Hearing Date]. | `[Original Hearing Date]` · `[Hearing Purpose]` · `[New Hearing Date]` | — | Reschedule `[clipped]` |
| 8 | Accept application | No | Application [Application Number] for [Application Type] is accepted. | `[Application Number]` · `[Application Type]` | — | *(See note — the application's own workflow is triggered, not this order's)* |
| 9 | Reject application | No | Application [Application Number] for [Application Type] is rejected. | `[Application Number]` · `[Application Type]` | — | — |
| 10 | Case transfer | Yes | The case is transferred to another court for further proceedings. | — | — | — |
| 11 | Case settlement | Yes | The settlement records have been accepted by the court. Case closed. | — | — | — |
| 12 | Issue of summons | Yes (ST/LP) | Issue summons to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps to issue summons. | `[Party Type]` — person summoned · `[Party Name]` · `[Party Type]` — party taking steps | — | Trigger summons … `[clipped]` |
| 13 | Issue of warrants | Yes (ST/LP) | Issue warrant to the [Party Type] [Party Name]. The [Party Type] is directed to take steps to issue warrant. | `[Party Type]` · `[Party Name]` · `[Party Type]` — party taking steps | — | Trigger … workflow `[clipped]` |
| 14 | Withdrawal of case | Yes | As per application [Application Number] complainant has sought to withdraw the complaint. Permission under Section 280 of the BNSS is granted and the Accused is acquitted. | `[Application Number]` | — | — |
| 15 | Issue of notice | Yes | Issue [Notice Type] notice to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps. | `[Notice Type]` — type of notice · `[Party Type]` · `[Party Name]` · `[Party Type]` — party taking steps | — | Trigger … workflow `[clipped]` |
| 16 | Acceptance of bail | No | Application [Application Number] is accepted. | `[Application Number]` | — | Optional bail bond workflow (specific to bail) `[clipped]` |
| 17 | Cognizance | Yes (when cognizance is due) | Considering the materials produced before the Court, I am prima facie satisfied that the offence punishable under S. 138 of NI Act is made out. Accordingly cognizance of the offence is taken and the case is taken on file. | — | — | — |
| 18 | Judgement | Yes | *(dedicated judgement screen)* | — | — | — |
| 19 | Dismiss case | Yes (when cognizance is due) | The case is dismissed. | — | — | — |
| 20 | Bail | Yes (ST/LP) | Accused is released on bail. Particulars of offences u/s.138 of NI Act were read over and explained to the Accused to which he pleaded [Plea] and claimed to be tried. | — | `[Plea]` — guilty/not guilty | Trigger … workflow `[clipped]` |
| 21 | Cost | Yes | The [Party Type] is directed to pay [Amount] to the [Party Type] as costs by [Date]. | `[Party Type]` — paying party · `[Amount]` — ₹ · `[Party Type]` — receiving party · `[Date]` — deadline | — | Create … task `[clipped]` |
| 22 | Witness batta | Yes | The [Party Type] is directed to pay [Amount] to the [Party Type] as witness batta by [Date]. | `[Party Type]` — paying party · `[Amount]` — ₹ · `[Party Type]` — receiving party · `[Date]` — deadline | — | Create … task `[clipped]` |
| 23 | Issue of proclamation | Yes (ST/LP) | Issue proclamation to the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps. | `[Party Type]` · `[Party Name]` | — | Trigger proclamation workflow `[clipped]` |
| 24 | Issue of attachment | Yes (ST/LP) | Issue attachment against the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps. | `[Party Type]` · `[Party Name]` | — | Trigger attachment … `[clipped]` |
| 25 | Moving case to long pending register | Yes (when case is ST) | As per sanction given by Honourable CJM the case is moved to the Long Pending Register and is marked as LP. | — | — | — |
| 26 | Moving case out of long pending register | Yes (when case is LP) | The case is moved out of the Long Pending Register and is to be considered and renumbered as a ST case. | — | — | — |
| 27 | Abate case | Yes | The case is abated following the death of the Accused party. | — | — | — |

### Application types covered by generic accept/reject

The generic **Accept application** (#8) and **Reject application** (#9) replace
what were previously separate order types. These application types all use the
same template and have no order-level workflow — any workflow triggered belongs
to the application type itself.

| Application type | Notes |
|---|---|
| Voluntary submission | |
| Delay condonation (DCA) | |
| Bail (rejection only) | Bail acceptance is a separate order (#16) because it optionally triggers the bail bond submission workflow |
| Changes in litigant details | |
| Advocate replacement | Currently a task, not an application — has no application number |
| Change in power of attorney | "No such order" noted in source spreadsheet |

---

## Section workflows

Not order types. Dedicated screens for recording specific procedural steps
during a hearing. Each opens its own form for the magistrate to enter structured
details, and produces a record that becomes part of the case file. Surfaced as
**buttons alongside the order type dropdown**, not as entries in it.

| Section workflow | Statutory basis | Records |
|---|---|---|
| Recording of plea | Plea under S. 274 of the Sanhita | The accused's plea (guilty / not guilty) and the particulars of the offence as read and explained |
| Examination of the accused | Examination under S. 351 BNSS | The statement of the accused when examined by the court |
| Evidence of the complainant | Complainant evidence | The complainant's evidence — documents, testimony, affidavit evidence |
| Examination of the witness | Witness examination | Witness testimony — examination-in-chief, cross-examination, re-examination |

---

## Hearing purpose → actions

**Available at any hearing** (generic, never repeated in the rows below):
Scheduling of hearing date, Cost, Mandatory submissions, Withdrawal of case,
Case transfer, Moving to/from LP register, Abate case.

⚙ marks a section workflow rather than an order type.

| # | Hearing purpose | People required | Likely order types and section workflows |
|---|---|---|---|
| 1 | Condonation of delay | Complainant Advocate, Accused Advocate | Dismiss case, Order under section 202 CrPC |
| 2 | Admission | Complainant Advocate, Accused Advocate | Cognizance, Dismiss case, Issue of summons, Order under section 202 CrPC |
| 3 | Delay condonation and admission | Complainant Advocate, Accused Advocate | Cognizance, Dismiss case, Issue of summons |
| 4 | Cognizance | Complainant Advocate, Accused Advocate | Cognizance, Dismiss case, Issue of summons, Order under section 202 CrPC |
| 5 | Appearance | Accused, Accused Advocate | Issue of summons, Issue of warrants, Bail, Issue of notice |
| 6 | Bail | Accused, Accused Advocate | Bail, Acceptance of bail, Issue of warrants |
| 7 | Plea | Accused, Accused Advocate | Bail, Referral to ADR, Issue of notice · ⚙ Recording of plea |
| 8 | Evidence of the complainant | Complainant, Complainant Advocate, Accused Advocate | Witness batta, Issue of summons (for witnesses) · ⚙ Evidence of the complainant, ⚙ Examination of the witness |
| 9 | Examination of the accused under S. 351 BNSS | Accused, Accused Advocate | Issue of warrants · ⚙ Examination of the accused |
| 10 | Evidence of the accused | Complainant Advocate, Accused, Accused Advocate | Witness batta, Issue of summons (for witnesses) · ⚙ Examination of the witness |
| 11 | Arguments | Complainant Advocate, Accused Advocate | Referral to ADR, Case settlement |
| 12 | Judgement | Accused Advocate | Judgement |
| 13 | For reports (forensics, ADR, etc.) | — | Referral to ADR |
| 14 | ADR | — | Referral to ADR, Case settlement |
| 15 | Mediation | — | Referral to ADR, Case settlement |
| 16 | Warrant | — | Issue of warrants, Issue of proclamation, Issue of attachment, Bail |
| 17 | Execution | — | Issue of attachment, Issue of warrants |
| 18 | Review application | — | — |
| 19 | To issue order | — | *(any order — generic hearing for issuing pending orders)* |
| 20 | Review application | — | — |

**Notes from the source:**

- "Delay condonation and admission" (#3) is a combined hearing covering two
  purposes in one sitting.
- "People required" is blank where attendance rules are not yet defined.
- #18 and #20 both cover application review — separate entries in the two
  codebases, the same hearing purpose.

---

## How the template system works

Every order is generated from a **template** — text with variables in square
brackets. The system fills in the variables and produces the final order text.

### What the system fills automatically

- **General variables** (above) — always resolved from case and court data.
- **Application context** — when acting on an application (accept/reject), the
  Application Number and Application Type are already known, because the judge
  arrived at this order from the application itself.
- **Workflow context** — when an order is the output of a workflow (e.g. a
  rescheduling order following a rescheduling request), variables the workflow
  already collected are pre-filled.

### What the judge must specify

The system cannot fill a variable that requires a **choice among options**:

- **Which party**, when the case has more than one person of a given type. A
  §138 case typically has one complainant and one accused, but there can be
  multiple accused (e.g. the drawer and the company director). With multiple
  candidates the system presents a selector; **with one, it fills automatically.**
- **Dates** set by the judge's discretion — a submission deadline, a new hearing
  date, the end date for ADR.
- **Amounts** — cost and witness batta.
- **Selections from master data** — hearing purpose, document type, mode of ADR,
  notice type. Dropdowns drawn from master data, not free text.

### Locked vs optional

**Locked** variables are required by the workflow the order triggers and cannot
be removed from the template — the summons workflow needs to know which party is
summoned (`[Party Type]`, `[Party Name]`) and which party must take steps, or it
cannot create the correct task.

**Optional** variables can be added or removed by a system administrator. They
enrich the order text but no workflow depends on them — `[Plea]` in the bail
order is optional; the bail workflow does not need it, but the record is better
for having it.

**General** variables are always available to any template, which is why they
appear in neither column.

### What the judge can customise

The judge works with the **generated text**, not the template: edit it freely
(add sentences, remove paragraphs, correct wording) and add additional comments
in a free-text area. The judge **cannot** change the template itself — templates
are system configuration managed by an administrator. What the judge produces is
an order, not a new template.

### Resolution order at generation time

1. The judge selects an order type (from the dropdown, or by acting on an application).
2. The system loads the template for that order type.
3. **Auto-fill pass** — general variables and context variables are filled in.
4. **Judge input pass** — remaining unfilled variables are presented as form
   fields: dropdowns for master data, date pickers for dates, party selectors
   for party references, text inputs for free values.
5. The judge fills the remaining fields and confirms.
6. The system generates the complete order text.
7. The judge reviews, optionally edits, and signs.

If an order type has **no template** (e.g. Order under section 202 CrPC), the
judge writes the order text from scratch — or a dedicated screen handles it
(e.g. Judgement).
