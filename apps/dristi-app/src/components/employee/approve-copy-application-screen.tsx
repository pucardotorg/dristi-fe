"use client";

import * as React from "react";
import { FileCheck2Icon, SearchXIcon } from "lucide-react";

import { ChromeAlertDialogContent } from "@/components/chrome/app-chrome";

import { ApproveCopyApplicationDialog } from "@/components/employee/approve-copy-application-dialog";
import { ApproveCopyApplicationTable } from "@/components/employee/approve-copy-application-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  COPY_APPLICATION_QUEUE,
  EMPTY_COPY_APPLICATION_FILTERS,
  filterCopyApplications,
  formatCopyApplicationDate,
  type CopyApplication,
  type CopyApplicationFilters,
} from "@/lib/employee/approve-copy-application";
import { PAGE_SIZE, type HearingsPageSize } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Approve copy application — the applications for certified copies waiting on this bench.
 *
 * Deliberately the same screen as its six siblings in the rail: the page title stands on
 * the page, and **one** lifted panel holds the filter, the table and the pagination
 * footer together. Same panel recipe, same `gap-6` / `p-6`, same table treatment, same
 * empty states, literally the same footer component. A bench moving from "Sign forms" to
 * this row is looking at one court's work through another window and should not have to
 * re-learn the furniture in between.
 *
 * What this screen adds is the pair of decisions. Accepting is done in bulk — a counter
 * queue is cleared by checking rows, not by opening thirty overlays — so selection lives
 * in the table and the commit lives in a sticky bar, the recipe `SignFormsScreen`
 * established. Rejecting is not: refusing a party the copy they asked for is a decision
 * about one application, so it lives only inside the overlay, after the bench has read
 * what it is refusing. The application number opens that overlay.
 *
 * **Nothing here is allowed or refused.** Both paths drop their rows from the demo queue
 * and nothing else — see `lib/employee/approve-copy-application.ts`. No copy is ordered,
 * no fee is assessed, nobody is told, and nothing persists past a reload.
 */
export function ApproveCopyApplicationScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used, so there is never a moment where what the bench has asked for and what
     the table is showing disagree. Every change resets to page one — the old Search
     button did that, and a keystroke that narrows the list to four rows must not leave
     the reader on page three of nothing. */
  const [filters, setFilters] = React.useState<CopyApplicationFilters>(
    EMPTY_COPY_APPLICATION_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [decidedIds, setDecidedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<CopyApplication | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  /* Radix restores focus to whatever opened the confirmation, and accepting consumes the
     selection that kept that button enabled — so on the one close that empties the bar,
     focus would land on a disabled control and fall to the body. This flag says which
     close it was; the search box catches focus instead, the way the review overlay
     already hands it back. */
  const acceptedFromBar = React.useRef(false);

  const remaining = COPY_APPLICATION_QUEUE.filter(
    (application) => !decidedIds.has(application.id),
  );
  const rows = filterCopyApplications(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "";

  /**
   * What is selected *and* still in the list.
   *
   * Selection survives paging — a bench clearing a queue works down it page by page — but
   * never reaches past a filter. A stored id whose row the current filter excludes is held
   * rather than dropped (clearing the filter brings the selection back) and is excluded
   * from every count and from the act itself, so the bar can never offer to accept an
   * application that is not on screen to be checked.
   */
  const selected = rows.filter((application) => picked.has(application.id));
  const selectedIds = new Set(selected.map((application) => application.id));

  function changeFilters(next: CopyApplicationFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_COPY_APPLICATION_FILTERS);
  }

  function toggle(application: CopyApplication) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(application.id)) next.delete(application.id);
      else next.add(application.id);
      return next;
    });
  }

  /** The header checkbox: every row on the page in view, not the whole queue. */
  function toggleAll(select: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      for (const application of pageRows) {
        if (select) next.add(application.id);
        else next.delete(application.id);
      }
      return next;
    });
  }

  /** Both decisions end here: the rows leave the demo queue, and nothing else happens. */
  function removeFromQueue(ids: string[], spoken: string) {
    setDecidedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    setAnnouncement(spoken);
  }

  function acceptSelected() {
    const ids = selected.map((application) => application.id);
    if (ids.length === 0) return;
    acceptedFromBar.current = true;
    removeFromQueue(
      ids,
      `${ids.length} ${plural(ids.length, "application", "applications")} accepted on this screen and removed from the queue. Nothing was ordered or sent.`,
    );
  }

  function acceptOne(application: CopyApplication) {
    setOpen(null);
    removeFromQueue(
      [application.id],
      `${application.applicationNumber} accepted on this screen and removed from the queue. Nothing was ordered or sent.`,
    );
  }

  function rejectOne(application: CopyApplication) {
    setOpen(null);
    removeFromQueue(
      [application.id],
      `${application.applicationNumber} rejected on this screen and removed from the queue. Nothing was refused or sent.`,
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
            Approve copy application
          </h1>
          {/* The count is the whole point of the queue, so the supporting line carries it
              rather than restating the title. Singular is spelled out because
              "1 applications" is the kind of thing a court notices. */}
          <p className="text-body text-muted-foreground">
            {remaining.length === 1
              ? "1 application is waiting for approval."
              : `${remaining.length} applications are waiting for approval.`}
          </p>
        </header>

        {/* One panel: filter, list and footer are one unit of work, so they share one
            lifted sheet — the same recipe every other court-side list uses. Nothing inside
            draws a second frame. */}
        <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
          <CopyApplicationFilters
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
            <CopyApplicationsEmpty
              isFiltered={isFiltered}
              onClear={clearFilters}
            />
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              {/* min-w-0 lets this flex item shrink below the table's content width, so a
                  wide table scrolls inside the panel instead of pushing the page
                  sideways. */}
              <div className="min-w-0 overflow-x-auto">
                {/* Six columns do not survive a phone. Below `md` the same rows stack as
                    items, each keeping its own checkbox. */}
                <div className="hidden md:block">
                  <ApproveCopyApplicationTable
                    rows={pageRows}
                    selectedIds={selectedIds}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                    onOpen={setOpen}
                  />
                </div>
                <div className="md:hidden">
                  <CopyApplicationItemList
                    rows={pageRows}
                    selectedIds={selectedIds}
                    onToggle={toggle}
                    onOpen={setOpen}
                  />
                </div>
              </div>

              <ListFooter
                id="approve-copy-page-size"
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
      </div>

      {/* What is selected, and the one bulk act. The court side's own chrome for a screen
          whose act lives at the bottom.

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
              ? "Select applications to accept them together."
              : `${selectedIds.size} ${plural(selectedIds.size, "application", "applications")} selected.`}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  className="w-full sm:w-fit"
                  disabled={selectedIds.size === 0}
                >
                  Accept applications
                </Button>
              </AlertDialogTrigger>
              <ChromeAlertDialogContent
                onCloseAutoFocus={(event) => {
                  if (!acceptedFromBar.current) return;
                  acceptedFromBar.current = false;
                  event.preventDefault();
                  searchRef.current?.focus();
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {selectedIds.size === 1
                      ? "Accept this copy application?"
                      : `Accept ${selectedIds.size} copy applications?`}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-body">
                    {selectedIds.size === 1
                      ? "The copying section is told to prepare the copy asked for, and the applicant is told it was allowed."
                      : "The copying section is told to prepare every copy asked for, and each applicant is told their application was allowed."}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction onClick={acceptSelected}>
                    Accept
                  </AlertDialogAction>
                </AlertDialogFooter>
              </ChromeAlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </footer>

      {/* What actually changed, for anyone not watching the list. The count line in the
          bar is polite too, but it reports a selection rather than an act. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ApproveCopyApplicationDialog
        application={open}
        onOpenChange={setOpen}
        onAccept={acceptOne}
        onReject={rejectOne}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * One text box, filtering as it is typed — the reference's whole filter row.
 *
 * The reference labels this box "Case number", and a bench at a copying counter is handed
 * an application number at least as often, and a party's name more often than either. So
 * the box reaches the application number, the case number, the petitioner, the rest of the
 * cause and counsel on record, the placeholder names the three a bench would actually
 * type, and the visible label becomes "Search applications" — a label that promised only
 * the case number would be a label the control does not keep (deviation from the
 * reference, logged in the build report).
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
function CopyApplicationFilters({
  filters,
  searchRef,
  onChange,
}: {
  filters: CopyApplicationFilters;
  searchRef: React.Ref<HTMLInputElement>;
  onChange: (filters: CopyApplicationFilters) => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <QueueSearchField
        label="Search applications"
        className="sm:w-96"
        ref={searchRef}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Application number, case number or petitioner"
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
function CopyApplicationsEmpty({
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
            <FileCheck2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered
            ? "No applications match this search"
            : "No copy applications waiting"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No application waiting for approval matches the number or name you searched for."
            : "Every copy application in front of this court has been dealt with."}
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
 * A counter queue read on a phone is still what was asked for and by whom, so the checkbox
 * stays — accepting in bulk is the point of the screen, and dropping it on small screens
 * would make the phone a read-only view of a queue that cannot be worked. The column
 * headers are gone, so each fact is spelled out where the label would have been.
 */
function CopyApplicationItemList({
  rows,
  selectedIds,
  onToggle,
  onOpen,
}: {
  rows: CopyApplication[];
  selectedIds: ReadonlySet<string>;
  onToggle: (application: CopyApplication) => void;
  onOpen: (application: CopyApplication) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((application) => (
        <QueueItemRow
          key={application.id}
          className="flex items-start gap-3"
        >
          {/* The DS box expands its own hit area to 40×40; the name it carries is the
              application and who asked for it, not the column, because a row read aloud
              has no column header. */}
          <Checkbox
            checked={selectedIds.has(application.id)}
            onCheckedChange={() => onToggle(application)}
            aria-label={`Select ${application.applicationNumber}, ${application.applicant.name}`}
            className="mt-1"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <button
              type="button"
              onClick={() => onOpen(application)}
              {...rowOpener}
                className={cn(rowOpenerClass, "tabular-nums")}
            >
              <span className="sr-only">Review </span>
              {application.applicationNumber}
            </button>
            <p className="min-w-0 text-body-compact">
              {application.applicant.name}
            </p>
            <p className="min-w-0 text-caption text-muted-foreground">
              {application.record.description}
            </p>
            <p className="text-caption text-muted-foreground">
              <span className="tabular-nums">{application.caseNumber}</span>
              {" · Raised "}
              <span className="tabular-nums">
                {formatCopyApplicationDate(application.raisedOn)}
              </span>
            </p>
          </div>
        </QueueItemRow>
      ))}
    </ul>
  );
}
