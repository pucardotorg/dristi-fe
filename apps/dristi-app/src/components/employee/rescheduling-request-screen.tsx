"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { ReschedulingRequestDialog } from "@/components/employee/rescheduling-request-dialog";
import { ReschedulingRequestTable } from "@/components/employee/rescheduling-request-table";
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
  formatListingDate,
  COURT_HEARING_PURPOSES,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  EMPTY_RESCHEDULING_FILTERS,
  RESCHEDULING_QUEUE,
  filterReschedulingRequests,
  formatRequestLongDate,
  type ReschedulingFilters,
  type ReschedulingRequest,
} from "@/lib/employee/rescheduling-request";
import { Identifier } from "@/components/chrome/identifier";
import {
  CourtFilters,
  CourtSortSelect,
  type CourtFilterField,
} from "@/components/employee/court-filters";
import {
  compareCaseNumbers,
  compareDays,
  daySorts,
  sortOptions,
  sortRows,
  type CourtSortSpec,
} from "@/lib/employee/court-sort";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import {
  applyColumnFilters,
  columnFilterFields,
  emptyColumnFilters,
  hasColumnFilters,
  type ColumnFilter,
} from "@/lib/employee/court-column-filters";

const RESCHEDULING_COLUMN_FILTERS: ColumnFilter<ReschedulingRequest>[] = [
  {
    id: "rescheduling-purpose",
    label: "Hearing purpose",
    allLabel: "Any purpose",
    options: COURT_HEARING_PURPOSES.map((purpose) => ({
      value: purpose.id,
      label: purpose.label,
    })),
    test: (row, value) => row.purpose === value,
  },
  {
    id: "rescheduling-consent",
    label: "Other side",
    allLabel: "Agreed or not",
    options: [
      { value: "agreed", label: "Agreed" },
      { value: "not-agreed", label: "Not agreed" },
    ],
    test: (row, value) => row.partiesAgreed === (value === "agreed"),
  },
  {
    id: "rescheduling-side",
    label: "Applied for",
    allLabel: "Either side",
    options: [
      { value: "complainant", label: "Complainant" },
      { value: "accused", label: "Accused" },
    ],
    test: (row, value) => row.filedFor === value,
  },
];

type ReschedulingSort = "hearing" | "oldest" | "newest";

/**
 * The hearing that would be missed comes first — Date of next hearing, soonest — because
 * a request decided after its date is moot.
 */
const RESCHEDULING_SORTS: CourtSortSpec<ReschedulingRequest, ReschedulingSort>[] = [
  {
    id: "hearing",
    label: "Next hearing soonest",
    compare: (a, b) =>
      compareDays(a.listedOn, b.listedOn) || compareCaseNumbers(a.caseNumber, b.caseNumber),
  },
  ...daySorts<ReschedulingRequest, ReschedulingSort>(
    (row) => row.appliedOn,
    { id: "oldest", label: "Oldest application first", latest: false },
    { id: "newest", label: "Newest application first" },
  ),
];

/**
 * Rescheduling request — applications asking this court to move a listed date.
 *
 * Deliberately the same screen as `RegisterCasesScreen`, one group over in
 * the rail: the page title stands on the page, and **one** lifted panel holds
 * the filters, the table and the pagination footer together. Same panel
 * recipe, same `gap-6` / `p-6`, same table treatment, same footer. A bench
 * moving from "Register cases" to "Rescheduling request" is looking at one
 * court's work at two moments, and should not have to re-learn the furniture
 * in between.
 *
 * What differs is the click. Register cases left the cause title as plain
 * text because there was no registration flow. Here the review dialog is the
 * destination — the advocate generated-application overlay (document-first)
 * plus the comments pane and Approve / Reject the bench needs — so the name
 * opens it. Approve and Reject only drop the row from this demo queue; they
 * do not write an order or move the listing.
 */
export function ReschedulingRequestScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used, so there is never a moment where what the bench has asked for and what
     the table is showing disagree. Every change resets to page one — the old Search
     button did that, and a keystroke that narrows the list to four rows must not leave
     the reader on page three of nothing. */
  const [filters, setFilters] = React.useState<ReschedulingFilters>(
    EMPTY_RESCHEDULING_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [decidedIds, setDecidedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<ReschedulingRequest | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const remaining = RESCHEDULING_QUEUE.filter(
    (request) => !decidedIds.has(request.id),
  );
  const [columns, setColumns] = React.useState(() =>
    emptyColumnFilters(RESCHEDULING_COLUMN_FILTERS),
  );
  const [sort, setSort] = React.useState<ReschedulingSort>("hearing");

  const rows = sortRows(
    applyColumnFilters(filterReschedulingRequests(remaining, filters), RESCHEDULING_COLUMN_FILTERS, columns),
    RESCHEDULING_SORTS,
    sort,
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "" || hasColumnFilters(columns);

  function changeFilters(next: ReschedulingFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_RESCHEDULING_FILTERS);
    setColumns(emptyColumnFilters(RESCHEDULING_COLUMN_FILTERS));
  }

  function decide(request: ReschedulingRequest) {
    setDecidedIds((current) => new Set(current).add(request.id));
    setOpen(null);
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Rescheduling request
        </h1>
        <p className="text-body text-muted-foreground">
          {remaining.length === 1
            ? "1 application is waiting for review."
            : `${remaining.length} applications are waiting for review.`}
        </p>
      </header>

      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <ReschedulingFiltersRow
          filters={filters}
          searchRef={searchRef}
          onChange={changeFilters}
          onClear={clearFilters}
          fields={columnFilterFields(RESCHEDULING_COLUMN_FILTERS, columns, (id, value) => {
            setColumns((current) => ({ ...current, [id]: value }));
            setPage(1);
          })}
          trailing={
            <CourtSortSelect
              id="rescheduling-sort"
              value={sort}
              options={sortOptions(RESCHEDULING_SORTS)}
              onChange={(next) => {
                setSort(next);
                setPage(1);
              }}
            />
          }
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <ReschedulingEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0 overflow-x-auto">
              <div className="hidden md:block">
                <ReschedulingRequestTable rows={pageRows} onOpen={setOpen} />
              </div>
              <div className="md:hidden">
                <ReschedulingRequestItemList
                  rows={pageRows}
                  onOpen={setOpen}
                />
              </div>
            </div>

            <ListFooter
              id="rescheduling-request-page-size"
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

      <ReschedulingRequestDialog
        request={open}
        onOpenChange={setOpen}
        onApprove={decide}
        onReject={decide}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * The search box, the filters a rescheduling request is triaged by — the hearing it
 * would move, whether the other side agreed, and who asked — and the order on the end of
 * the row: the court-side filter row (`CourtFilters`).
 */
function ReschedulingFiltersRow({
  filters,
  searchRef,
  onChange,
  onClear,
  fields,
  trailing,
}: {
  filters: ReschedulingFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: ReschedulingFilters) => void;
  onClear: () => void;
  fields: CourtFilterField[];
  /** The list's sort control (`CourtSortSelect`). */
  trailing: React.ReactNode;
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
      fields={fields}
      trailing={trailing}
      onClearAll={onClear}
    />
  );
}

function ReschedulingEmpty({
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
          {isFiltered ? "No matters match this search" : "Nothing waiting"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No rescheduling request matches the search you asked for."
            : "Every rescheduling request before this court has been reviewed."}
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
 * A queue read on a phone is still the cause, its number and the two dates —
 * spelled with the long form because there is no column header to name them.
 * The whole item is the opener, so the 40px target is the card rather than a
 * text link inside it.
 */
function ReschedulingRequestItemList({
  rows,
  onOpen,
}: {
  rows: ReschedulingRequest[];
  onOpen: (request: ReschedulingRequest) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((request) => (
        /* The row is the target (`rowActivation`) and the title its one opener, so the
           copyable case number sits beside the opener rather than inside a button — a
           button in a button is invalid HTML and broke hydration. */
        <li
          key={request.id}
          {...rowActivation(
            "flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
          )}
        >
          <button
            type="button"
            onClick={() => onOpen(request)}
            {...rowOpener}
            className={rowOpenerClass}
          >
            <span className="sr-only">Review </span>
            {causeTitle(request)}
          </button>
          <p className="text-caption text-muted-foreground">
            <Identifier value={request.caseNumber} label="case number" />
            {" · Applied "}
            <span className="tabular-nums">
              {formatRequestLongDate(request.appliedOn)}
            </span>
            {" · Listed "}
            <span className="tabular-nums">
              {formatListingDate(request.listedOn)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
