# Sign process

Status: stage 1 built; stages 2-3 designed, not built
Updated: 2026-09-08
Source: docs/product/domain/journey.md (§5, issue of process), docs/product/open-questions.md
DS read: vendor/pucar-design-system/src/components/ui/table.tsx, checkbox.tsx, badge.tsx,
button.tsx, dialog.tsx, input-group.tsx; foundations/laws; foundations/spacing

## 1. Context

`/employee/sign-process` already ships. It draws process the court has issued and has
still to get out of the building as a **line of five stages** — Pending RPAD collection →
Pending sign → Signed → Sent → Completed — one tab per stage, one shared table, one
filter panel, one footer (`components/employee/sign-process-screen.tsx`,
`lib/employee/sign-process.ts`). It was built without a brief; this file is the brief for
the feature going forward.

**In scope: the first three stages**, which are one continuous piece of desk work. Sent
and Completed are records of what the outside world did and do not change.

**Confirmed with product — the whole workflow, from stakeholder observation
(Anshumanth via Neer, 2026-09-07 / 2026-09-08):**

> The bench clerk has a pile of envelopes in front of them and the Pending RPAD
> collection tab open. They match every envelope physically in front of them to the right
> ones from that list, select it, and send it to sign. After this they will likely sign
> all processes in the Pending sign tab together, because there is nothing to gain from
> doing it one by one. From the Signed tab they print each process so they can put it
> inside the envelope and mark it as sent. Maybe they print all documents together and
> then place them inside envelopes by sorting through them — but I have seen them open
> each process one by one, print it one by one, and put it in the envelope one by one. I
> guess this removes the risk of accidentally putting a process inside the wrong
> envelope.

**Confirmed with product (Neer, 2026-09-08):** a cover is **one per case**, not one per
process or addressee. One envelope, one case number, however many processes that case
has waiting.

**Confirmed with product (Neer, 2026-09-08) — already built:** the Pending sign tab's
bulk confirmation ends on a success step that offers the just-signed documents for
download (`sign-bulk-confirm-dialog.tsx:163` — "take the papers away, offered on the
success step only"). So the **print-all-then-sort rhythm is already served, at the moment
of signing**, not on the Signed tab. This narrows what the Signed tab has to do; see
decision 13.

**Out of scope, confirmed (Neer, 2026-09-08):** what the court does with an envelope that
has no matching process. Ruled unrelated. No record, no new row state.

## 2. Problem

**Pending RPAD collection**

1. **What has been picked goes invisible.** Selection survives a re-search —
   `applyFilters` does not clear `selectedIds` (`sign-process-screen.tsx:191-194`) — but
   the ticked rows scroll out the moment the next case number is searched. The only
   evidence is a count in the bar. A clerk seven envelopes in cannot see whether envelope
   three was ticked, or ticked twice, and cannot un-tick one without hunting the row back
   down.
2. **The count cannot be checked against the desk.** Rows are per process, so the bar
   counts processes while the clerk counts envelopes.

**Pending sign**

3. **The stage's only job is "all of it", and the screen does not offer that.**
   Select-all takes the current page (`toggleAllInView` iterates `pageRows`,
   `sign-process-screen.tsx:213-227`), so the one gesture this tab exists for is the one
   it gets wrong.

**Signed**

4. **The record goes ahead of the world.** The bulk act marks every selected process
   sent in one commit, at a moment when no envelope has been stuffed. A clerk interrupted
   after four of seven has a record saying seven and three envelopes on the desk. The
   copy already promises this cannot be recalled from the screen.
5. **Nothing supports the pairing.** The risk at this stage is not missing a process, it
   is putting one in the wrong envelope. The clerk's own answer is to work one at a time,
   and the screen gives that rhythm no support: the row dialog has no act at this stage
   and no way to move to the next.

## 3. Objective

The clerk works the line the way they already work it — envelope by envelope at
collection, everything at once at signing, envelope by envelope again at dispatch — and
at no point holds in their head something the screen could hold for them, or records
something that has not yet happened.

Observable: at every moment in the dispatch run, what the screen says is sent equals what
is physically in an envelope.

## 4. Job

**Confirmed with product, in Anshumanth's terms (2026-09-07):** reconcile the physical
covers that arrived against the process this court has drawn up, sign it, and get it into
the envelopes and out of the building.

Not "search process" and not "manage process". Each stage is a fixed point in a loop
between a screen and a pile of paper.

## 5. Decisions

### The organising principle

1. **Density follows the direction of the match.** The three stages are the same loop
   with the paper pointing different ways, and that is what sets how dense each tab
   should be.

   | Stage | Direction | Failure mode | Design answer |
   |---|---|---|---|
   | Pending RPAD collection | paper → screen | miss one, count one twice | accumulate visibly |
   | Pending sign | no paper in play | none | one gesture |
   | Signed | screen → paper | pair the wrong two | one thing on screen at a time |

   So the three tabs read at three different densities — highest in the middle, lowest at
   the end. That is principled, not inconsistent, and it is why product's "nothing to gain
   from doing it one by one" is true at signing and false either side of it. *Judgment,
   grounded in the observation quoted in §1.*

2. **The envelope is the unit at both ends of the line; only the middle stage counts
   processes.** One cover per case, so the case is the envelope, at collection and at
   dispatch alike. The clerk's counting unit never changes except where there is nothing
   physical to count. *Confirmed with product (Neer, 2026-09-08).*

### Pending RPAD collection

3. **Fit the clerk's rhythm; do not redesign it.** They work one envelope at a time, so
   the box takes one case number at a time. *Confirmed with product (Neer, 2026-09-08).*
   Rejected alternative: a multi-value chip field taking the whole stack up front (see
   decision log). It asked the clerk to compose a query before touching an envelope.

   **And it applies as it is typed.** *Confirmed with product (Neer, 2026-09-08).* A
   clerk reading a number off a cover already knows the answer they want; every keystroke
   is a better guess at it, and holding the list still until a button is pressed wastes
   the one thing typing is good for. Partial input narrows to the near matches, and the
   row appears as soon as enough of the number has been entered to single it out.

   **The three selects stay on the Search button.** They compose a request out of parts,
   and applying each part as it is chosen moves the list under a clerk who has not
   finished asking. It is also the court-side pattern the whole employee area shares, and
   the court asked for those buttons in the primary fill
   (`lib/employee/filter-state.ts:4-12`) — not this screen's to drop.

   **One clear affordance, in the field.** A cross inside the search box empties it; the
   standalone "Clear" beside Search is gone. *Confirmed with product (Neer, 2026-09-08),
   who read the two as redundant.* Clear reset the type and the date as well as the box,
   but the box is the only one of the three a clerk touches on this tab, so beside a cross
   it read as a second way to do the same thing. The selects keep their own "All …", the
   date its "Any day", and the one place a full reset still earns a button is the empty
   state, where it is the way out of a search that found nothing. The cross is ours, not
   WebKit's — Firefox draws none, the native one is not reliably keyboard-reachable and
   cannot be given an accessible name, so it is switched off rather than left beside a
   second cross doing the same job.

   *The split is the point, not a compromise:* **the box is a lookup, the selects are a
   question**, which is the same distinction the desk work has — the cover in your hand is
   a retrieval, the filters are an enquiry. Given up: a pending select leaves the table
   showing the live query against the *applied* selects. That state announces itself (the
   Search button is live exactly when something chosen is not yet on screen), and it is
   the price of not dropping a court-requested control — see risk 5.

4. **A selection tray inside the table panel, between the filters and the column
   headers.** It holds everything picked so far, surviving search, paging and filter
   changes. **It is shown only when it holds something.** An empty box announcing that it
   is empty is chrome asking to be read. It briefly carried a placeholder to stop the box
   *appearing* on the first tick and shoving the table out from under the cursor — but
   decision 4a moved the picking gesture to the keyboard, so the clerk's hands stay in the
   search box and the table is not what they are aiming at. The tray and the restored
   table now arrive together, as one change following one act. *Placeholder removed at
   product's read (Neer, 2026-09-08) that it earned nothing.*

4a. **Enter, in the search box, puts the envelope on the pile.** *Product's own proposal
   (Neer, 2026-09-08); adopted.* The clerk's hands are on the keyboard with a cover in
   front of them, so the gesture that ends a lookup is the gesture that records it: type
   the number, press Enter, the case joins the pile, the box empties ready for the next
   cover. The checkboxes still work and still feed the same pile — this is the fast path,
   not the only one. The placeholder says "case number, then Enter", because a keyboard
   gesture nobody is told about is a keyboard gesture nobody uses.

   **It commits only when the number names one case** (`singleCaseMatch`). Two cases
   still matching is not a near miss, it is an unfinished number, and choosing between
   them — first row, closest, shortest — would put one court's process into a batch bound
   for another's envelope on a keystroke the clerk did not mean as a choice. Anything but
   exactly one case falls back to what Enter used to do and the clerk keeps typing. A case
   already on the pile is announced rather than silently ignored: a second cover for a
   case already picked is a thing that happens, and the clerk needs to know which it was.
   Locked down by tests, including that a number belonging to a case which has already
   moved past this stage resolves to nothing. *Product's own proposal (Neer,
   2026-09-08); adopted.* Placement above the column headers rather than below: below, it
   sits between the header row and the first data row, breaking the table and needing to
   be sticky. Above, it reads as the stack sitting over the list. *Judgment.*

5. **The tray groups by case; the table does not.** One envelope, one entry, carrying its
   process count: `ST/1301/2026 · 3`. This is what lets the table stay row-per-process,
   sharing its furniture with the other tabs. *Judgment.* Rejected alternative: grouping
   the whole tab by case with expandable rows — a large restructure to say what a band
   can say.

6. **The tray header carries both counts** — "4 cases · 7 processes". Cases is what the
   clerk checks against the desk; processes is what the act does. *Judgment.*

7. **Removing a tray entry removes the whole case**, because the whole case is the
   envelope.

### Pending sign

8. **Make "sign everything here" one gesture.** This tab has no physical counterpart and
   product says the clerk signs the lot. Select-all must mean the whole stage, not the
   page; the header checkbox's accessible name says how many it takes. The existing bulk
   act and its irreversibility confirmation are unchanged. *Confirmed with product
   (Anshumanth, §1).* Given up: nothing. Rejected alternative: a distinct "Sign all"
   button beside the bar — a second control for what the header checkbox plus the bar
   already do.

9. **Do not add a tray here.** Nothing physical is being reconciled, so there is nothing
   to keep visible. A tray at this stage would be furniture copied for symmetry. *This is
   decision 1 applied.*

### Signed

10. **A guided dispatch run, and it is the default path.** Select in Signed, then
    "Print and send" opens a focused view stepping through the selection one envelope at
    a time: the case number, that case's processes with print controls, and one act —
    "Placed in envelope — next".

    **The reason is record truth, not ergonomics.** Each step commits only that
    envelope, so what the screen calls Sent is always what is physically in an envelope
    (problem 4). Closing mid-run keeps what is done and leaves the rest in Signed. The
    clerk's observed one-at-a-time habit is a control against mis-pairing, and the
    software adopts it rather than optimising it away. *Confirmed with product
    (Anshumanth, §1).*

11. **The case number is the most prominent thing in the run.** It is what the clerk
    reads off the cover to confirm the pair — not the process type, not the party names.
    Everything else on the step is subordinate to it. *Judgment, from the failure mode in
    decision 1.*

12. **The run steps through envelopes; inside a step, processes are listed and printable
    individually or together.** One cover per case means a case's three processes go in
    one envelope, so the step is the case — but product watched the clerk print process
    by process, so both are offered inside the step. This survives either answer to the
    open question about one document or three.

13. **The Signed tab serves the one-at-a-time rhythm only; the batch rhythm is already
    served upstream.** Product's post-sign success step already hands over every
    just-signed document (§1). A clerk who prints the batch and sorts afterwards has what
    they need before reaching this tab, so the Signed tab need not compete for that job —
    which is the cleanest available split: **the two rhythms are served at two different
    points in the line, rather than as two buttons on one screen.** *Confirmed with
    product (Neer, 2026-09-08).* The existing bulk download stays on the bar as a
    convenience, but it no longer carries a rhythm, and the bulk mark-sent act drops to
    secondary behind the run — see risk 3.

14. **No data-model change.** `CourtProcess` stays flat; case grouping is done by
    `caseNumber` at render, in the tray and in the run. The five tabs go on sharing one
    list, so they cannot disagree about where a row is.

## 6. What I cut (and why)

- **A separate envelope-intake screen or a saved batch.** The stack exists for ten
  minutes and the court keeps no record of it.
- **Grouping the collection tab's table by case.** Cut when the tray took over the
  case-level view (decision 5).
- **A multi-value case-number field.** Cut on product's rhythm (decision 3). Noted rather
  than deleted because the DS does ship the primitive (`ComboboxChips` in
  `combobox.tsx:217-295`) — if a bulk-institutional state makes the one-at-a-time loop
  painful, this is the shape the answer takes.
- **The standalone "Clear" button.** Removed at product's read that it duplicated the
  cross in the field — see decision 3. The full reset survives in the empty state, which
  is the only place it was doing work a select's own "All …" could not.
- **A "+N more" fold on the tray.** Specced, then cut at build. Chips wrap at roughly
  seven to a row, so a twenty-envelope morning is three rows — the fold was guarding a
  case nobody has seen, at the cost of sometimes hiding the entry the clerk just added.
  If a pile ever gets big enough to matter, a capped height with scroll beats a fold,
  because the newest entry stays where the eye left it.
- **A progress bar or "4 of 7 done" tally in the run.** The step header already says
  "Envelope 3 of 7" and the pile on the desk says the rest. A second progress device is
  the screen telling the clerk something their hands already know.
- **Barcode or QR scanning of the cover.** The cover is prepared by the party, not the
  court.
- **Per-envelope data entry** — addressee, weight, article number. RPAD article numbers
  come back after posting, not at collection or dispatch.
- **A "how many covers do you have?" field.** There is no source of truth for that number
  except the clerk's hands; the design's job is to make the comparison possible, not to
  fake the check.

## 7. Layout & hierarchy

Nothing above the tab strip changes; each tab keeps its single lifted panel holding
filters → table → footer.

- **Collection tray.** A band inside the panel, above the column headers. Left: label and
  both counts. Right: "Clear selection", quiet — named in full because the filters above
  already own a bare "Clear", and the two put down different things (the question, and
  the pile). Below: case entries as removable chips, in the order they were picked, so
  the envelope just added lands where the eye that added it already is. Absent until the
  pile has something in it. No fold — see §6.
- **Search field.** Label, magnifier, input, and a cross at the inline end that shows only
  once something is typed. No Clear beside Search. Enter commits; the placeholder says so.
- **Results area.** Table and empty state share one container with a `min-h-96` floor, so
  narrowing a live search does not walk the footer up the screen. Ten rows are taller than
  the floor, so a full tab is unaffected; the floor catches the last few keystrokes, which
  are the ones the clerk is watching.
- **Pending sign.** Unchanged but for the select-all fix.
- **Dispatch run.** The existing process dialog, extended: the case number as the title at
  the largest role the overlay uses, cause title beneath it, the case's processes as a
  short list with a print control each and a print-all, and a footer carrying the single
  primary act. Step position sits in the header, not the footer — it is context, not an
  action. Closing is secondary and always available.
- **Bars.** One primary action per view, always. In Signed the primary is "Print and
  send"; the bulk mark-sent drops to secondary (risk 3).

## 8. Components (DS name → region)

| Region | Component |
|---|---|
| Filters, search | existing `InputGroup` / `Select` / `Button` composition |
| Selection tray band | section inside the existing panel; `Separator` under it |
| Tray entries | `Badge` + an icon `Button` for removal |
| "Clear selection" | `Button` (ghost) |
| Table, row and header selection | `Table`, `Checkbox` |
| Dispatch run overlay | existing `ChromeDialogContent` / `DialogHeader` / `DialogFooter` |
| The process as paper | existing `DocumentPreview` + `ProcessFacsimile` |
| Per-process print controls | `Button` (outline), inside `Item` or a plain list |
| Sticky act bars | existing `ProcessBar` composition |
| Confirmations | existing `SignBulkConfirmDialog` |
| Empty states | `Empty` |
| Footer | existing `ListFooter` |

No new primitive. No DS request.

## 9. Spacing

Unchanged from the screen it edits: container `p-6`, `rounded-xl`, section `gap-6`,
controls `h-10` / `rounded-lg`. The tray band takes `py-4` with `gap-2` between header and
entries and `gap-1.5` between entries — micro steps, since entries are controls. The run's
process list uses `gap-2` between rows inside a `p-6` region.

## 10. States (empty / loading / error / partial / long-label)

- **Nothing selected at collection.** No tray at all; the screen is what ships today.
- **Ambiguous Enter.** Two cases still match: nothing is committed, the box keeps what was
  typed, and the clerk carries on. The live count in the polite region is what tells a
  screen-reader user how far off one case they are.
- **Mid-typing.** Partial input narrows rather than emptying: "130" holds ST/1301,
  ST/1304 and ST/1307 and drops ST/1310, because a case number is matched as text and
  "1310" does not contain "130". Verified against the served DOM.
- **Live result, unseen.** The narrowing is silent to anyone not watching, so a polite
  `sr-only` region reports the count — the count only, never the query, or a region meant
  to report a result would read the number back one digit at a time (ACCESSIBILITY §5).
- **Selection with an empty result.** The clerk searches a case with nothing at this
  stage: table empty, tray stays. The existing `processesElsewhere` affordance
  (`sign-process-screen.tsx:163-167`) still says where that process went.
- **Large stack.** Chips wrap; nothing is hidden. Twenty entries is about three rows.
- **Partly-selected case.** Two of a case's three processes ticked: the entry reads
  `· 2`, not 3. It must never round up to the case's true total, or it reports a cover as
  reconciled when part of it is not.
- **Run interrupted.** Closing at envelope 4 of 7 leaves three Sent and four in Signed.
  Re-opening starts a fresh run over what remains; no partial run is persisted.
- **Run of one.** The step is the whole run; the header says "Envelope 1 of 1" and the
  act closes it. No special-casing beyond the copy.
- **Tab change.** Selection clears — the existing rule, kept.
- **Long labels.** Case numbers are short and tabular; tray entries wrap rather than
  truncate. Corporate cause titles already wrap in this table and in the overlay.
- **Loading / error.** No backend behind this screen; nothing is signed, printed, sent or
  served. When one arrives, the panel takes a skeleton, the act bars an error state, and
  a failed step in the run must not advance.

## 11. Risks accepted

1. **The tray duplicates state visible in the table** — a ticked row is also a tray entry.
   That redundancy is the feature.
2. **The tray and the bar both carry counts.** They must be derived from one source so
   they cannot disagree.
3. **Two paths out of Signed** — the guided run and the bulk mark-sent. A clerk who uses
   the bulk path still gets the record-ahead-of-world problem. Accepted because product
   observed both rhythms; mitigated by making the run the primary action and the bulk act
   secondary. If mis-pairing ever shows up in practice, removing the bulk path is the
   next move.
5. **The table can show a live query against not-yet-applied selects.** A clerk who
   changes Type and then types without pressing Search sees the new query filtered by the
   old type. Accepted as the cost of keeping the court-requested Search button while
   giving the box the rhythm product asked for; the enabled button is the signal that
   something chosen is still pending. If it confuses anyone in practice, the fix is to put
   the selects behind a disclosure rather than to slow the box down.
6. **The dispatch run has no persisted progress.** Interrupted work is safe (each step
   committed as it happened) but the run itself is not resumable as a run — the clerk
   re-selects. Accepted: persisting a run would be the saved-batch record cut in §6.

## 12. Open questions for product

- Within a case with three processes, does the clerk want one document or three? Decision
  12 survives either answer, but it changes which print control is primary.
- Does cover-per-case hold in every state deployment, or is it Kerala practice?
  `open-questions.md` contrasts Kerala with Gujarat on volume; if it varies, the tray's
  and the run's grouping unit is a per-state fact rather than a constant.
- A case with some processes at collection and some further along — does one cover in
  fact cover the ones already past this stage?
- Is the clerk who reconciles covers the same seat that signs? Does not block this work.

## 13. Gaps in the DS (if any)

None. Every region composes from primitives already in the pinned DS.

## 14. Decision log

- **2026-09-08** — Cover is one per case, not per process or addressee. Confirmed by Neer
  from the 2026-09-07 stakeholder session.
- **2026-09-08** — Unmatched-envelope handling ruled out of scope by Neer as unrelated.
- **2026-09-08** — **Reversed:** an earlier draft proposed grouping the collection table
  by case with expandable rows, and a multi-value chip field taking the whole stack of
  case numbers up front, and explicitly cut a selection tray in their favour. Neer
  corrected the premise: the clerk works **one envelope at a time**, and the accumulation
  belongs in a box inside the table container. Adopting the tray also removed the need
  for the table restructure. Cut alternatives recorded in §6 rather than deleted.
- **2026-09-08** — **Scope widened from one stage to three.** Anshumanth's observation of
  the full workflow (quoted in §1) established that Pending sign and Signed are part of
  the same piece of desk work. It also supplied the organising principle (decision 1) and
  the dispatch run (decision 10): the clerk's one-at-a-time printing is a control against
  mis-pairing, and the record-ahead-of-world defect it protects against (problem 4) is
  the strongest reason to build the run.
- **2026-09-08** — Neer: the post-sign success step already offers the signed documents
  for download, and has done since before this brief. Verified in the code. Decision 13
  rewritten — the batch-then-sort rhythm is served at signing, so the Signed tab is free
  to serve the one-at-a-time rhythm alone rather than hosting both.
- **2026-09-08** — Neer asked for the case-number box to filter as it is typed, with the
  near matches showing on partial input. Decision 3 extended: the box applies live, the
  three selects keep the Search button. The court-requested gated button
  (`filter-state.ts:4-12`) is preserved rather than dropped, which is what forced the
  lookup/question split rather than making the whole form live. Built and verified.
- **2026-09-08** — Neer: the interaction was not smooth, and the field's cross made the
  "Clear" button redundant. Three structural causes were found and fixed rather than
  patched over: the tray appeared on first tick and pushed the table out from under the
  cursor (decision 4 — it now holds its place); the results area collapsed as a live
  search narrowed, walking the footer up the screen (§7 — one container with a floor); and
  the field carried two clear affordances (decision 3 — the cross stays, the button goes).
  A fourth candidate, the large empty block flashing per keystroke, was examined and left
  alone: substring matching narrows monotonically, so a correctly typed number never
  passes through it, and where it does appear it is a settled answer worth reading.
- **2026-09-08** — Neer: the always-present empty tray earned nothing, and picking should
  happen on search-then-Enter. Both adopted — decision 4 reverted to show-when-occupied,
  decision 4a added. The two are one change: the placeholder existed only to absorb a
  layout shift that mattered while the picking gesture was a click in the table, and
  moving that gesture to the keyboard removed the shift rather than padding around it.
  The single-case commit rule (`singleCaseMatch`) is the safety property and is tested.
- **2026-09-08** — Neer: a selected row should carry the same corner radius a hovered one
  does. Adopted, reversing a documented choice in `sign-process-table.tsx` that kept
  selection square. The reason it was square still holds — rounding every selected row
  scallops a long selection into a stack of pills — so selection now rounds **as a run**:
  a row rounds its top only when the row above is unselected and its bottom only when the
  row below is, and hairlines inside a run go transparent. One pick reads as a band,
  twelve consecutive picks read as one block with two rounded ends.
- **2026-09-08** — Neer queried the rail's "31" against a two-page table. Not a defect and
  no change made: the rail counts the three stages that have an act on them
  (`PROCESS_QUEUE_COUNT` — 12 + 11 + 8, excluding Sent and Completed as records), while
  the table pages one stage at a time, so 12 rows at 10 a page is correctly two pages. The
  tab strip already carries the per-stage counts the sum is built from. Recorded because
  the question will be asked again.
- **2026-09-08** — **Stage 1 built** (tray only, at Neer's scope choice). Two deviations
  from this brief, both folded back into it above: the "+N more" fold was cut (§6), and
  "Clear all" became "Clear selection" so it would not collide with the filters' own
  Clear (§7). Stages 2 and 3 remain designed and unbuilt.
