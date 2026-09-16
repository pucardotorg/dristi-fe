"use client";

import * as React from "react";
import { SearchXIcon, UserCheckIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { SignBulkConfirmDialog } from "@/components/employee/sign-bulk-confirm-dialog";
import { SignWitnessDepositionDialog } from "@/components/employee/sign-witness-deposition-dialog";
import { SignWitnessDepositionTable } from "@/components/employee/sign-witness-deposition-table";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  causeTitle,
  counselFor,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  EMPTY_WITNESS_DEPOSITION_FILTERS,
  WITNESS_DEPOSITION_QUEUE,
  filterWitnessDepositions,
  formatDepositionDate,
  witnessRoleLabel,
  witnessTag,
  type WitnessDeposition,
  type WitnessDepositionFilters,
} from "@/lib/employee/sign-witness-deposition";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Sign witness deposition — the evidence this court has recorded and not yet signed.
 *
 * Deliberately the same screen as the three signing queues around it in the rail, and
 * as the review queues before them: the page title stands on the page, and **one**
 * lifted panel holds the filter, the table and the pagination footer together. Same
 * panel recipe, same `gap-6` / `p-6`, same table treatment, same empty states, literally
 * the same footer component. A bench moving between the rail's Sign rows is looking at
 * one court's work through several windows and should not have to re-learn the
 * furniture in between.
 *
 * What this screen has that its siblings do not is a **witness**. A row here is a
 * deposition, not a case, so one cause title can appear several times over — and the
 * search reaches the witness name for that reason, which is the one thing it adds to
 * the reference's "Case Name or Number".
 *
 * The act is the shape the reference draws and the sibling queues already established:
 * selection lives in the table, and the commit lives in a sticky bar, because the list
 * it commits is longer than a screen and a button that scrolls away from its own
 * selection is a button the bench has to hunt for. The cause title opens the sheet
 * first, because a bench that cannot read the evidence should not be offered a
 * signature on it.
 *
 * **Nothing on this screen signs or publishes anything.** Both paths drop their rows
 * from the demo queue and nothing else — see `lib/employee/sign-witness-deposition.ts`.
 */
export function SignWitnessDepositionScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used, so there is never a moment where what the bench has asked for and what
     the table is showing disagree. Every change resets to page one — the old Search
     button did that, and a keystroke that narrows the list to four rows must not leave
     the reader on page three of nothing. */
  const [filters, setFilters] = React.useState<WitnessDepositionFilters>(
    EMPTY_WITNESS_DEPOSITION_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [signedIds, setSignedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<WitnessDeposition | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  /* The bulk confirmation hands focus back here on the way out — see its `triggerRef`. */
  const signRef = React.useRef<HTMLButtonElement>(null);

  const remaining = WITNESS_DEPOSITION_QUEUE.filter(
    (deposition) => !signedIds.has(deposition.id),
  );
  const rows = filterWitnessDepositions(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "";

  /**
   * What is selected *and* still in the list.
   *
   * Selection survives paging — a bench clearing a queue works down it page by page —
   * but never reaches past a filter. A stored id whose row the current filter excludes
   * is held rather than dropped (clearing the filter brings the selection back) and is
   * excluded from every count and from the act itself, so the bar can never offer to
   * sign a sheet that is not on screen to be checked.
   */
  const visibleIds = new Set(rows.map((deposition) => deposition.id));
  const selectedIds = new Set([...picked].filter((id) => visibleIds.has(id)));
  /* In list order, so the confirmation's summary reads the way the table does. */
  const selectedDepositions = rows.filter((deposition) =>
    selectedIds.has(deposition.id),
  );

  function changeFilters(next: WitnessDepositionFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_WITNESS_DEPOSITION_FILTERS);
  }

  function toggle(deposition: WitnessDeposition) {
    setNotice("");
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(deposition.id)) next.delete(deposition.id);
      else next.add(deposition.id);
      return next;
    });
  }

  /** The header checkbox: every row on the page in view, not the whole queue. */
  function toggleAllInView(select: boolean) {
    setNotice("");
    setPicked((current) => {
      const next = new Set(current);
      for (const deposition of pageRows) {
        if (select) next.add(deposition.id);
        else next.delete(deposition.id);
      }
      return next;
    });
  }

  /**
   * Both paths end here: the sheets leave the demo queue, and nothing else happens.
   * The line it leaves behind says exactly that, so the bench is not told a record was
   * made.
   */
  function sign(ids: string[]) {
    if (ids.length === 0) return;
    setSignedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    setNotice(
      `${ids.length} ${plural(ids.length, "deposition is", "depositions are")} marked signed on this screen. Nothing was published.`,
    );
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Sign witness deposition
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries it
            rather than restating the title. Singular is spelled out because
            "1 depositions" is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {remaining.length === 1
            ? "1 deposition is waiting for your signature."
            : `${remaining.length} depositions are waiting for your signature.`}
        </p>
      </header>

      {/* One panel: filter, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe every other court-side queue uses. Nothing
          inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <DepositionFiltersForm
          filters={filters}
          searchRef={searchRef}
          onChange={changeFilters}
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <DepositionsEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page
                sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Six columns do not survive a phone. Below `md` the same rows stack as
                  items — the answer the rest of the court side already gives. */}
              <div className="hidden md:block">
                <SignWitnessDepositionTable
                  rows={pageRows}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onToggleAll={toggleAllInView}
                  onOpen={setOpen}
                />
              </div>
              <div className="md:hidden">
                <DepositionItemList
                  rows={pageRows}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onOpen={setOpen}
                />
              </div>
            </div>

            <ListFooter
              id="sign-witness-deposition-page-size"
              from={start + 1}
              to={start + pageRows.length}
              total={rows.length}
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      {pageRows.length > 0 || selectedIds.size > 0 ? (
        <SignBar
          count={selectedIds.size}
          notice={notice}
          onClearSelection={() => setPicked(new Set())}
          onRequestSign={() => setBulkOpen(true)}
          signRef={signRef}
        />
      ) : null}

      {/* Confirm the count, then say what became of it — the shared bulk confirmation
          every signing queue runs. It hangs off the screen rather than off the bar,
          because signing the last rows in view takes the bar away with it. */}
      <SignBulkConfirmDialog
        noun="deposition"
        count={selectedIds.size}
        selection={{
          cases: selectedDepositions.map((deposition) => deposition.caseNumber),
        }}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        triggerRef={signRef}
        onConfirm={() => sign([...selectedIds])}
        onReturnFocus={returnFocus}
      />

      <SignWitnessDepositionDialog
        deposition={open}
        onOpenChange={setOpen}
        onSign={(deposition) => {
          setOpen(null);
          sign([deposition.id]);
        }}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * The reference's one control, filtering as it is typed.
 *
 * This screen filters on free text and nothing else, because that is all the reference
 * gives it — and it is the right call: the other signing queues cut by a process type
 * or a status their rows actually carry, and every row here is in one state. A date
 * filter would be a fourth control cutting on a column the bench does not come here to
 * narrow.
 *
 * The control carries a visible label. The reference labels the box with the things it
 * searches, which is a hint rather than a name; ACCESSIBILITY §12 wants a permanent
 * label, so "Search cases" is the deviation, and the smallest one available. The
 * placeholder keeps the reference's reach and adds the witness.
 *
 * The Search button is gone: the list answers the box as it is typed, so a button that
 * only re-asked what the control already said was a step between the bench and the
 * answer. The way back to the whole queue is the `×` inside the box
 * (`QueueSearchField`) — which is why there is no "Clear search" beside it either: on
 * this screen the search *is* the filters, and two controls for one undo is one too many.
 * The empty state keeps its own Clear, where it is the invitation out of a dead end.
 *
 * That also spends the page's teal down to one. Search carried `bg-primary` (whatever
 * the paragraph above used to claim), and it sat two regions away from the act this
 * screen exists for. With it gone the only strong fill left is the one in the action bar,
 * which is what the Ration Teal Law wanted all along.
 *
 * The form element stays so Enter in the box is swallowed rather than reloading the page:
 * a lone text input inside a `<form>` submits implicitly, and there is no submit handler
 * left to catch it.
 */
function DepositionFiltersForm({
  filters,
  searchRef,
  onChange,
}: {
  filters: WitnessDepositionFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: WitnessDepositionFilters) => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <QueueSearchField
        label="Search cases"
        className="sm:w-80"
        ref={searchRef}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Case name, number or witness"
      />
    </form>
  );
}

/**
 * What is selected, and the act itself.
 *
 * Sticky, because the list it commits is longer than a screen. Chrome, so it is
 * `bg-card` over a hairline seam and never carries the panel's full-strength edge
 * (ui-craft §4, layer 2); the negative margins let it span the page's own padding.
 * `z-30` is the chrome layer this app already uses — the top bar and the filing footer
 * both sit there.
 *
 * The line beside the button is `aria-live`, so a screen reader hears the selection
 * change, and what signing did, without going looking for either. Empty-handed the bar
 * holds a disabled button and says what to do instead, rather than materialising under
 * the cursor on the first tick and shifting the row the bench just clicked.
 */
function SignBar({
  count,
  notice,
  onClearSelection,
  onRequestSign,
  signRef,
}: {
  count: number;
  notice: string;
  onClearSelection: () => void;
  /** Opens the shared confirmation. The act itself lives on the screen. */
  onRequestSign: () => void;
  /** Handed down so the confirmation can give the keyboard back to this button. */
  signRef: React.Ref<HTMLButtonElement>;
}) {
  const summary =
    notice ||
    (count === 0
      ? "Select the depositions to sign."
      : `${count} ${plural(count, "deposition", "depositions")} selected.`);

  return (
    <div className="sticky bottom-0 z-30 -mx-6 -mb-6 border-t border-hairline bg-card px-6 py-3 md:-mx-8 md:-mb-8 md:px-8 md:py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          className="mr-auto text-body-compact text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {summary}
        </p>

        {count > 0 ? (
          <Button type="button" variant="ghost" onClick={onClearSelection}>
            Clear selection
          </Button>
        ) : null}

        <Button
          ref={signRef}
          type="button"
          disabled={count === 0}
          className="w-full sm:w-fit"
          onClick={onRequestSign}
        >
          {count > 0
            ? `Sign ${count} ${plural(count, "deposition", "depositions")}`
            : "Sign selected depositions"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a search that matched nothing is a dead
 * end with an action worth offering, while an empty queue is the bench being up to
 * date — the same good-empty the sibling queues use. Borderless and unpadded; the panel
 * is already the frame.
 */
function DepositionsEmpty({
  isFiltered,
  onClear,
}: {
  isFiltered: boolean;
  onClear: () => void;
}) {
  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltered ? (
            <SearchXIcon aria-hidden />
          ) : (
            <UserCheckIcon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered
            ? "No depositions match this search"
            : "Nothing left to sign"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No deposition waiting for signature matches the case, number or witness you asked for."
            : "Every deposition recorded by this court has been signed."}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>
            Clear search
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * The checkbox and the opener stay separate controls here too, for the same reason they
 * do in the table: one tap cannot mean both. The witness leads the caption under the
 * cause, because on a phone with no column headers the witness is what tells two sheets
 * from the same case apart.
 */
function DepositionItemList({
  rows,
  selectedIds,
  onToggle,
  onOpen,
}: {
  rows: WitnessDeposition[];
  selectedIds: ReadonlySet<string>;
  onToggle: (deposition: WitnessDeposition) => void;
  onOpen: (deposition: WitnessDeposition) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((deposition) => {
        const tag = witnessTag(deposition);
        return (
          <QueueItemRow
            key={deposition.id}
            className="flex gap-3"
          >
            {/* The DS box expands its own hit area to 40×40; the name it carries is the
                sheet and its case, not the column, because a row read aloud has no
                column header. */}
            <span className="pt-0.5">
              <Checkbox
                checked={selectedIds.has(deposition.id)}
                onCheckedChange={() => onToggle(deposition)}
                aria-label={`Select the deposition of ${deposition.witness.name}, ${tag}, in ${deposition.caseNumber}`}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpen(deposition)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Read and sign </span>
                {causeTitle(deposition)}
              </button>
              <p className="min-w-0 text-body-compact">
                {deposition.witness.name}
                <span aria-hidden className="text-muted-foreground">
                  {" "}
                  {tag}
                </span>
                <span className="sr-only">{`, ${tag}, ${witnessRoleLabel(deposition)}`}</span>
              </p>
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">{deposition.caseNumber}</span>
                {" · Recorded "}
                <span className="tabular-nums">
                  {formatDepositionDate(deposition.depositionOn)}
                </span>
              </p>
              <CounselCell
                complainant={counselFor(deposition, "complainant").map(
                  (counsel) => counsel.name,
                )}
                accused={counselFor(deposition, "accused").map(
                  (counsel) => counsel.name,
                )}
              />
            </div>
          </QueueItemRow>
        );
      })}
    </ul>
  );
}
