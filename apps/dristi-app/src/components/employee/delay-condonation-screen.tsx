"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { DelayCondonationDialog } from "@/components/employee/delay-condonation-dialog";
import { DelayCondonationTable } from "@/components/employee/delay-condonation-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { CourtFilters } from "@/components/employee/court-filters";
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
  DELAY_CONDONATION_QUEUE,
  DELAY_CONDONATION_STAGES,
  EMPTY_DELAY_CONDONATION_FILTERS,
  delayCondonationStageLabel,
  filterDelayCondonationCases,
  formatDelayCondonationLongDate,
  type DelayCondonationCase,
  type DelayCondonationFilters,
} from "@/lib/employee/delay-condonation";
import {
  causeTitle,
  counselFor,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";

/**
 * Delay condonation — applications asking this court to condone delay.
 *
 * Deliberately the same screen as `ScheduleScreen`, one group over in the
 * rail: the page title stands on the page, and **one** lifted panel holds the
 * filters, the table and the pagination footer together. Same panel recipe,
 * same `gap-6` / `p-6`, same table treatment, same footer — literally the
 * same footer component. A bench moving from "Schedule hearing" to "Delay
 * condonation" is looking at one court's work at two moments, and should not
 * have to re-learn the furniture in between.
 *
 * What differs is only what the list actually is. Stage stays — the
 * reference had it, and unlike Register cases this queue is not one state.
 * The search reaches counsel as well as the cause and the number, because
 * that is the question the reference labelled.
 *
 * The cause title opens the review overlay — the same one the rescheduling
 * queue opens, because it is the same job: an application in front of a bench
 * that has to say yes or no. Approve and Reject only drop the row from this
 * demo queue; they condone nothing and write no order.
 */
export function DelayCondonationScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used — every one of them, so the screen has a single rule rather than a live
     one and a deferred one. Every change resets to page one; the old Search button did
     that, and a keystroke that narrows the list to four rows must not leave the reader
     on page three of nothing. */
  const [filters, setFilters] = React.useState<DelayCondonationFilters>(
    EMPTY_DELAY_CONDONATION_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [decidedIds, setDecidedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<DelayCondonationCase | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  /* Answered rows leave the queue, so the list, the count above it and the
     pagination all shrink together. Nothing is written — see the dialog. */
  const remaining = DELAY_CONDONATION_QUEUE.filter(
    (matter) => !decidedIds.has(matter.id),
  );
  const rows = filterDelayCondonationCases(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.stage !== "all" || filters.query !== "";

  function changeFilters(next: DelayCondonationFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_DELAY_CONDONATION_FILTERS);
  }

  function decide(matter: DelayCondonationCase) {
    setDecidedIds((current) => new Set(current).add(matter.id));
    setOpen(null);
  }

  /* The row that opened the overlay is gone by the time it closes, so focus
     goes to the search box rather than to a button that no longer exists. */
  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Delay condonation
        </h1>
        {/* The count is the whole point of the queue, so the supporting line
            carries it rather than restating the title. Singular is spelled
            out because "1 applications" is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {remaining.length === 1
            ? "1 application is waiting for review."
            : `${remaining.length} applications are waiting for review.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they
          share one lifted sheet — the same recipe the cause list and the
          scheduling queue use. Nothing inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <DelayCondonationFilters
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
          <DelayCondonationEmpty
            isFiltered={isFiltered}
            onClear={clearFilters}
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content
                width, so a wide table scrolls inside the panel instead of
                pushing the page sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Four columns do not survive a phone. Below `md` the same
                  rows stack as items — the scheduling queue's own answer. */}
              <div className="hidden md:block">
                <DelayCondonationTable rows={pageRows} onOpen={setOpen} />
              </div>
              <div className="md:hidden">
                <DelayCondonationItemList rows={pageRows} onOpen={setOpen} />
              </div>
            </div>

            <ListFooter
              id="delay-condonation-page-size"
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

      <DelayCondonationDialog
        matter={open}
        onOpenChange={setOpen}
        onApprove={decide}
        onReject={decide}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * Stage and free text, then apply — the reference's two controls, laid out
 * the way the scheduling queue lays out the same pair.
 *
 * Every control carries a visible label. The reference labels the search box
 * with the things it searches, which is a hint rather than a name;
 * ACCESSIBILITY §12 wants a permanent label, so "Search cases" is the
 * deviation, and the smallest one available. The placeholder keeps the
 * reference's reach (name, number, advocate).
 *
 * "Search" is the teal one here. The Ration Teal Law allows one strong action
 * per view and it is spent on the loudest thing present: there is nothing
 * above the filters, and the reference paints Search as the primary.
 */
function DelayCondonationFilters({
  filters,
  searchRef,
  onChange,
  onClear,
}: {
  filters: DelayCondonationFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: DelayCondonationFilters) => void;
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
          id: "delay-condonation-stage",
          label: "Stage",
          value: filters.stage,
          all: "all",
          allLabel: "All stages",
          options: DELAY_CONDONATION_STAGES.map((stage) => ({
            value: stage.id,
            label: stage.label,
          })),
          onApply: (value) =>
            onChange({
              ...filters,
              stage: value as DelayCondonationFilters["stage"],
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
 * Two different facts, so two different states: a filter that matched nothing
 * is a dead end with an action worth offering, while an empty queue is the
 * court being up to date — the same good-empty Register cases already uses.
 * Borderless and unpadded; the panel is already the frame.
 */
function DelayCondonationEmpty({
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
            ? "No delay condonation application matches the stage or search you asked for."
            : "There are no delay condonation applications waiting for this court."}
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
 * four-column table through a 375px screen.
 *
 * The cause title is the opener, not the whole card: the advocates line owns a
 * `+N` popover trigger of its own, and a button inside a button is neither
 * valid nor operable. So the name carries the same treatment it has in the
 * table, at a 40px height here.
 */
function DelayCondonationItemList({
  rows,
  onOpen,
}: {
  rows: DelayCondonationCase[];
  onOpen: (matter: DelayCondonationCase) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((matter) => (
        <QueueItemRow
          key={matter.id}
          className="flex flex-col gap-2"
        >
            <button
              type="button"
              onClick={() => onOpen(matter)}
              {...rowOpener}
                className={rowOpenerClass}
            >
              <span className="sr-only">Review </span>
              {causeTitle(matter)}
            </button>
          <p className="text-caption text-muted-foreground">
            <span className="tabular-nums">{matter.caseNumber}</span>
            {" · "}
            {delayCondonationStageLabel(matter.stage)}
            {" · Applied "}
            <span className="tabular-nums">
              {formatDelayCondonationLongDate(matter.appliedOn)}
            </span>
          </p>
          <CounselCell
            complainant={counselFor(matter, "complainant").map(
              (counsel) => counsel.name,
            )}
            accused={counselFor(matter, "accused").map(
              (counsel) => counsel.name,
            )}
          />
        </QueueItemRow>
      ))}
    </ul>
  );
}
