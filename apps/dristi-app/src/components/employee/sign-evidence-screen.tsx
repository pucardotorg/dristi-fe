"use client";

import * as React from "react";
import { SearchXIcon, StampIcon } from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { SignEvidenceDialog } from "@/components/employee/sign-evidence-dialog";
import { SignEvidenceTable } from "@/components/employee/sign-evidence-table";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { ConfirmDialog } from "@/components/shell/confirm-dialog";
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
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  EMPTY_SIGN_EVIDENCE_FILTERS,
  SIGN_EVIDENCE_QUEUE,
  applyBusinessOfTheDay,
  applyEvidenceMarking,
  evidenceDocumentLabel,
  evidenceNumber,
  filterSignEvidence,
  signEvidence,
  type SignEvidence,
  type SignEvidenceFilters,
} from "@/lib/employee/sign-evidence";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Sign evidence — the documents this court has marked as exhibits and not yet signed.
 *
 * Deliberately the same screen as the two signing queues above it in the rail, and as the
 * review queues before them: the page title stands on the page, and **one** lifted panel
 * holds the filters, the table and the pagination footer together. Same panel recipe,
 * same `gap-6` / `p-6`, same table treatment, same empty states, literally the same
 * footer component. A bench moving between the rail's rows is looking at one court's work
 * through several windows, and should not have to re-learn the furniture in between.
 *
 * One filter, because the reference has one: an exhibit marking carries no status to
 * filter on (every row here is waiting for the same signature) and no date the reference
 * shows. A control that can only ever return the whole list is furniture, so the row is
 * the search box and the two buttons that work it.
 *
 * Signing is worked in bulk — selection in the table, the act in a sticky bar — and one
 * at a time through the dialog the cause title opens, which is also where the marking
 * itself can be corrected before the signature goes on it.
 *
 * **Nothing on this screen signs anything.** Both paths drop their rows from the demo
 * queue and nothing else; editing a marking changes it in that same demo queue. See
 * `lib/employee/sign-evidence.ts`.
 */
export function SignEvidenceScreen() {
  /* The queue is state because signing empties it and Edit details rewrites rows in it.
     One list, so the table, the bar and the dialog can never disagree about what a
     marking says or whether it is still waiting. */
  const [rows, setRows] = React.useState<SignEvidence[]>(SIGN_EVIDENCE_QUEUE);
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used, so there is never a moment where what the bench has asked for and what
     the table is showing disagree. Every change resets to page one — the old Search
     button did that, and a keystroke that narrows the list to four rows must not leave
     the reader on page three of nothing. */
  const [filters, setFilters] = React.useState<SignEvidenceFilters>(
    EMPTY_SIGN_EVIDENCE_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  /* The open marking is held by id, not by row: Edit details replaces the row object, and
     a dialog holding the old one would go on showing the number it used to have. */
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  const visible = filterSignEvidence(rows, filters);
  const openRow = rows.find((row) => row.id === openId) ?? null;

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const isFiltered = filters.query !== "";

  /**
   * What is selected *and* still in the list.
   *
   * Selection survives paging — a bench clearing a queue works down it page by page — but
   * never reaches past a filter. A stored id whose row the current search excludes is
   * held rather than dropped (clearing the search brings the selection back) and is
   * excluded from every count and from the act itself, so the bar can never offer to sign
   * a marking that is not on screen to be checked.
   */
  const visibleIds = new Set(visible.map((row) => row.id));
  const selectedIds = new Set([...picked].filter((id) => visibleIds.has(id)));

  function changeFilters(next: SignEvidenceFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_SIGN_EVIDENCE_FILTERS);
  }

  function toggle(row: SignEvidence) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }

  /** The header checkbox: every row on the page in view, not the whole queue. */
  function toggleAll(select: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      for (const row of pageRows) {
        if (select) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  /** Both signing paths end here: the rows leave the demo queue, and nothing else. */
  function sign(ids: ReadonlySet<string>, spoken: string) {
    setRows((current) => signEvidence(current, ids));
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    setAnnouncement(spoken);
  }

  function signSelected() {
    const count = selectedIds.size;
    setConfirmOpen(false);
    sign(
      selectedIds,
      `${count} ${plural(count, "document", "documents")} left the signing queue.`,
    );
  }

  function signOne(row: SignEvidence) {
    setOpenId(null);
    sign(
      new Set([row.id]),
      `${evidenceDocumentLabel(row.document)}, ${evidenceNumber(row)}, left the signing queue.`,
    );
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 pb-0 md:p-8 md:pb-0">
        <header className="flex flex-col gap-2">
          <h1 className="text-title text-balance font-semibold">
            Sign evidence
          </h1>
          {/* The count is the whole point of the queue, so the supporting line carries it
              rather than restating the title. Singular is spelled out because "1
              documents" is the kind of thing a court notices. */}
          <p className="text-body text-muted-foreground">
            {rows.length === 1
              ? "1 document marked as evidence is waiting for your signature."
              : `${rows.length} documents marked as evidence are waiting for your signature.`}
          </p>
        </header>

        {/* One panel: filters, list and footer are one unit of work, so they share one
            lifted sheet — the same recipe every other court-side list uses. Nothing
            inside draws a second frame. */}
        <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
          <SignEvidenceFilters
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
            <SignEvidenceEmpty isFiltered={isFiltered} onClear={clearFilters} />
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              {/* min-w-0 lets this flex item shrink below the table's content width, so a
                  wide table scrolls inside the panel instead of pushing the page
                  sideways. */}
              <div className="min-w-0 overflow-x-auto">
                {/* Five columns do not survive a phone. Below `md` the same rows stack as
                    items, each keeping its own checkbox. */}
                <div className="hidden md:block">
                  <SignEvidenceTable
                    rows={pageRows}
                    selectedIds={selectedIds}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                    onOpen={(row) => setOpenId(row.id)}
                  />
                </div>
                <div className="md:hidden">
                  <SignEvidenceItemList
                    rows={pageRows}
                    selectedIds={selectedIds}
                    onToggle={toggle}
                    onOpen={(row) => setOpenId(row.id)}
                  />
                </div>
              </div>

              <ListFooter
                id="sign-evidence-page-size"
                from={start + 1}
                to={start + pageRows.length}
                total={visible.length}
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
      </div>

      {/* What is selected, and the one act. The order composer's footer recipe — the court
          side's own chrome for a screen whose act lives at the bottom.

          Persistent rather than appearing on the first tick: a bar that materialises under
          the cursor shifts the row the bench just clicked. Empty-handed it holds a
          disabled button and says what to do instead. */}
      <footer className="sticky bottom-0 z-30 mt-8 border-t border-hairline bg-card px-6 py-3 md:px-8 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p
            className="text-body-compact text-muted-foreground tabular-nums sm:mr-auto"
            aria-live="polite"
          >
            {selectedIds.size === 0
              ? "Select documents to sign them together."
              : `${selectedIds.size} ${plural(selectedIds.size, "document", "documents")} selected.`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {selectedIds.size > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-fit"
                onClick={() => setPicked(new Set())}
              >
                Clear selection
              </Button>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-fit"
              disabled={selectedIds.size === 0}
              onClick={() => setConfirmOpen(true)}
            >
              Sign selected evidence
            </Button>
          </div>
        </div>
      </footer>

      {/* What actually changed, for anyone not watching the list. The count line in the
          bar is polite too, but it reports a total rather than an act. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* The reference draws this as a plain modal with an X. `AlertDialog` — which is
          what `ConfirmDialog` is — is the DS's primitive for a confirmation that cannot be
          undone: it traps focus on the decision and offers no dismiss beyond the two
          answers. Escape and Back both still leave. */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive={false}
        title={
          selectedIds.size === 1
            ? "E-sign this exhibit?"
            : `E-sign ${selectedIds.size} exhibits?`
        }
        description={
          selectedIds.size === 1
            ? "Your signature endorses the marking and cannot be reversed."
            : `Your signature endorses all ${selectedIds.size} markings selected and cannot be reversed.`
        }
        cancelLabel="Cancel"
        confirmLabel="Proceed to e-sign"
        onConfirm={signSelected}
      />

      <SignEvidenceDialog
        row={openRow}
        rows={rows}
        onOpenChange={(row) => setOpenId(row?.id ?? null)}
        onMarkingChange={(id, marking) =>
          setRows((current) => applyEvidenceMarking(current, id, marking))
        }
        onBusinessOfTheDayChange={(id, botd) =>
          setRows((current) => applyBusinessOfTheDay(current, id, botd))
        }
        onSign={signOne}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * One box, filtering as it is typed — the reference's whole filter row.
 *
 * The control carries a visible label. The reference labels the box with the things it
 * searches ("Case Name or Number"), which is a hint rather than a name; ACCESSIBILITY §12
 * wants a permanent label, so "Search cases" is the deviation, and the smallest one
 * available. The placeholder keeps the reference's reach and adds the two columns the
 * search also covers.
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
function SignEvidenceFilters({
  filters,
  searchRef,
  onChange,
}: {
  filters: SignEvidenceFilters;
  searchRef: React.Ref<HTMLInputElement>;
  onChange: (filters: SignEvidenceFilters) => void;
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
        placeholder="Case name, number, document or exhibit"
      />
    </form>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a search that matched nothing is a dead
 * end with an action worth offering, while an empty queue is the bench being up to date —
 * the same good-empty the sibling queues use. Borderless and unpadded; the panel is
 * already the frame.
 */
function SignEvidenceEmpty({
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
          {isFiltered ? <SearchXIcon aria-hidden /> : <StampIcon aria-hidden />}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No evidence matches this search" : "Nothing left to sign"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No document waiting for signature matches the case, document or exhibit number you asked for."
            : "Every document this court has marked as evidence has been signed."}
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
 * A signing queue read on a phone is still what to sign and what it is about, so the
 * checkbox stays — bulk signing is the point of the screen, and dropping it on small
 * screens would make the phone a read-only view of a queue that cannot be worked.
 *
 * The document leads here, not the cause. In the table the cause title is the opener
 * because the reference puts it there and the Document column sits beside it; stacked,
 * there is no column beside anything, and five items reading the same cause title with the
 * document buried underneath would be five identical-looking rows.
 */
function SignEvidenceItemList({
  rows,
  selectedIds,
  onToggle,
  onOpen,
}: {
  rows: SignEvidence[];
  selectedIds: ReadonlySet<string>;
  onToggle: (row: SignEvidence) => void;
  onOpen: (row: SignEvidence) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const document = evidenceDocumentLabel(row.document);
        const exhibit = evidenceNumber(row);
        return (
          <QueueItemRow
            key={row.id}
            className="flex items-start gap-3"
          >
            {/* The DS box expands its own hit area to 40×40; the name it carries is the
                marking and its case, not the column, because a row read aloud has no
                column header. */}
            <Checkbox
              checked={selectedIds.has(row.id)}
              onCheckedChange={() => onToggle(row)}
              aria-label={`Select ${document}, ${exhibit}, in ${row.caseNumber}`}
              className="mt-1"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpen(row)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Read and sign </span>
                {document}
                {", "}
                <span className="tabular-nums">{exhibit}</span>
              </button>
              <p className="min-w-0 text-body-compact">{causeTitle(row)}</p>
              <p className="text-caption text-muted-foreground tabular-nums">
                {row.caseNumber}
              </p>
            </div>
          </QueueItemRow>
        );
      })}
    </ul>
  );
}
