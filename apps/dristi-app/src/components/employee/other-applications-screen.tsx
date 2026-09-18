"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { CourtFilters } from "@/components/employee/court-filters";
import { OtherApplicationDialog } from "@/components/employee/other-application-dialog";
import { OtherApplicationsTable } from "@/components/employee/other-applications-table";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { Button } from "@/components/ui/button";
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
  EMPTY_OTHER_APPLICATION_FILTERS,
  OTHER_APPLICATIONS_QUEUE,
  OTHER_APPLICATION_STAGES,
  OTHER_APPLICATION_TYPES,
  filterOtherApplications,
  formatOtherApplicationLongDate,
  otherApplicationStageLabel,
  otherApplicationTypeLabel,
  type OtherApplication,
  type OtherApplicationFilters,
} from "@/lib/employee/other-applications";
import { Identifier } from "@/components/chrome/identifier";

/**
 * Others — every application in front of this court, whatever it asks for.
 *
 * Deliberately the same screen as `DelayCondonationScreen`, one row down in the same
 * rail group: the page title stands on the page, and **one** lifted panel holds the
 * filters, the table and the pagination footer together. Same panel recipe, same
 * `gap-6` / `p-6`, same table treatment, same empty states, literally the same footer
 * component. A bench moving between the three Review-applications rows is looking at one
 * body of work through three different windows, and should not have to re-learn the
 * furniture in between.
 *
 * What differs is one control and one column: the application type. It is the whole
 * reason this queue is wider than its two siblings, so it is the filter added on the end
 * of the row and the column added on the end of the table — everything else stays where a
 * clerk already knows to look for it.
 *
 * The cause title opens the review overlay — the same one the rescheduling and
 * delay-condonation queues open, because fourteen heads of application are still one job:
 * somebody asked this court for something and the bench has to answer. Approve and Reject
 * only drop the row from this demo queue; they decide nothing and write no order.
 */
export function OtherApplicationsScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used — every one of them, so the screen has a single rule rather than a live
     one and a deferred one. Every change resets to page one; the old Search button did
     that, and a keystroke that narrows the list to four rows must not leave the reader
     on page three of nothing. */
  const [filters, setFilters] = React.useState<OtherApplicationFilters>(
    EMPTY_OTHER_APPLICATION_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [decidedIds, setDecidedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<OtherApplication | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  /* Answered rows leave the queue, so the list, the count above it and the pagination all
     shrink together. Nothing is written — see the dialog. */
  const remaining = OTHER_APPLICATIONS_QUEUE.filter(
    (application) => !decidedIds.has(application.id),
  );
  const rows = filterOtherApplications(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered =
    filters.stage !== "all" || filters.query !== "" || filters.type !== "all";

  function changeFilters(next: OtherApplicationFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_OTHER_APPLICATION_FILTERS);
  }

  function decide(application: OtherApplication) {
    setDecidedIds((current) => new Set(current).add(application.id));
    setOpen(null);
  }

  /* The row that opened the overlay is gone by the time it closes, so focus goes to the
     search box rather than to a button that no longer exists. */
  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Others
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries it
            rather than restating the title. Singular is spelled out because "1
            applications" is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {remaining.length === 1
            ? "1 application is waiting for review."
            : `${remaining.length} applications are waiting for review.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe the cause list and the other review queues use.
          Nothing inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <OtherApplicationFiltersForm
          filters={filters}
          searchRef={searchRef}
          onChange={changeFilters}
          onClear={clearFilters}
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <OtherApplicationsEmpty
            isFiltered={isFiltered}
            onClear={clearFilters}
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Five columns do not survive a phone. Below `md` the same rows stack as
                  items — the answer the rest of the court side already gives. */}
              <div className="hidden md:block">
                <OtherApplicationsTable rows={pageRows} onOpen={setOpen} />
              </div>
              <div className="md:hidden">
                <OtherApplicationsItemList rows={pageRows} onOpen={setOpen} />
              </div>
            </div>

            <ListFooter
              id="other-applications-page-size"
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

      <OtherApplicationDialog
        application={open}
        onOpenChange={setOpen}
        onApprove={decide}
        onReject={decide}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * Stage, free text and application type, then apply — the reference's three controls, in
 * the reference's order, laid out the way the sibling queues lay out the first two.
 *
 * Every control carries a visible label. The reference labels the search box with the
 * things it searches, which is a hint rather than a name; ACCESSIBILITY §12 wants a
 * permanent label, so "Search cases" is the deviation, and the smallest one available.
 * The placeholder keeps the reference's reach (name, number, advocate).
 *
 * "Search" is the teal one here. The Ration Teal Law allows one strong action per view
 * and it is spent on the loudest thing present: there is nothing above the filters, and
 * the reference paints Search as the primary.
 */
function OtherApplicationFiltersForm({
  filters,
  searchRef,
  onChange,
  onClear,
}: {
  filters: OtherApplicationFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: OtherApplicationFilters) => void;
  onClear: () => void;
}) {
  return (
    <CourtFilters
      search={{
        label: "Search cases",
        value: filters.query,
        onChange: (query) => onChange({ ...filters, query }),
        placeholder: "Case name, number or advocate",
      }}
      searchRef={searchRef}
      fields={[
        {
          id: "other-applications-stage",
          label: "Stage",
          value: filters.stage,
          all: "all",
          allLabel: "All stages",
          options: OTHER_APPLICATION_STAGES.map((stage) => ({
            value: stage.id,
            label: stage.label,
          })),
          onApply: (value) =>
            onChange({
              ...filters,
              stage: value as OtherApplicationFilters["stage"],
            }),
        },
        {
          id: "other-applications-type",
          label: "Application type",
          value: filters.type,
          all: "all",
          allLabel: "All application types",
          options: OTHER_APPLICATION_TYPES.map((type) => ({
            value: type.id,
            label: type.label,
          })),
          onApply: (value) =>
            onChange({
              ...filters,
              type: value as OtherApplicationFilters["type"],
            }),
        },
      ]}
      onClearAll={onClear}
    />
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a filter that matched nothing is a dead
 * end with an action worth offering, while an empty queue is the court being up to date —
 * the same good-empty the sibling queues use. Borderless and unpadded; the panel is
 * already the frame.
 */
function OtherApplicationsEmpty({
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
            <FolderCheckIcon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No matters match these filters" : "Nothing waiting"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No application matches the stage, type or search you asked for."
            : "There are no applications waiting for this court."}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * A queue read on a phone is still the cause, its number and where the case
 * has reached — the advocates drop to their own line rather than forcing a
 * five-column table through a 375px screen.
 *
 * The cause title is the opener, not the whole card: the advocates line owns a
 * `+N` popover trigger of its own, and a button inside a button is neither
 * valid nor operable. So the name carries the same treatment it has in the
 * table, at a 40px height here.
 */
function OtherApplicationsItemList({
  rows,
  onOpen,
}: {
  rows: OtherApplication[];
  onOpen: (application: OtherApplication) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((application) => (
        <QueueItemRow
          key={application.id}
          className="flex flex-col gap-2"
        >
            <button
              type="button"
              onClick={() => onOpen(application)}
              {...rowOpener}
                className={rowOpenerClass}
            >
              <span className="sr-only">Review </span>
              {causeTitle(application)}
            </button>
          <p className="min-w-0 text-body-compact">
            {otherApplicationTypeLabel(application.type)}
          </p>
          <p className="text-caption text-muted-foreground">
            <Identifier value={application.caseNumber} label="case number" />
            {" · "}
            {otherApplicationStageLabel(application.stage)}
            {" · Applied "}
            <span className="tabular-nums">
              {formatOtherApplicationLongDate(application.appliedOn)}
            </span>
          </p>
          <CounselCell
            complainant={counselFor(application, "complainant").map(
              (counsel) => counsel.name,
            )}
            accused={counselFor(application, "accused").map(
              (counsel) => counsel.name,
            )}
          />
        </QueueItemRow>
      ))}
    </ul>
  );
}
