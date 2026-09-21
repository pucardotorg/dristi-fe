"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
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
  const rows = filterReschedulingRequests(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "";

  function changeFilters(next: ReschedulingFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_RESCHEDULING_FILTERS);
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
 * One text box, filtering as it is typed — the whole filter row.
 *
 * The Search button is gone: with one control there is nothing to compose before asking,
 * so it only ever stood between the clerk and the answer. The way back to the whole queue
 * is the `×` inside the box (`QueueSearchField`), which is why there is no "Clear" beside
 * it either — on this screen the search *is* the filters. The empty state keeps its own
 * Clear, where it is the invitation out of a dead end.
 *
 * The page is left with no `bg-primary` at all, and that is right: Search was the only
 * one, and this page has no page-level act for the Ration Teal Law to spend it on. A
 * request is approved or refused inside a row's overlay, where the teal already lives.
 *
 * The form element stays so Enter in the box is swallowed rather than reloading the page:
 * a lone text input inside a `<form>` submits implicitly, and there is no submit handler
 * left to catch it.
 */
function ReschedulingFiltersRow({
  filters,
  searchRef,
  onChange,
}: {
  filters: ReschedulingFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: ReschedulingFilters) => void;
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
        placeholder="Case name, number or advocate"
      />
    </form>
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
        <li key={request.id}>
          <button
            type="button"
            className="flex w-full min-h-10 flex-col gap-2 rounded-lg bg-surface-sunken p-4 text-left transition-colors hover:bg-accent-strong focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none"
            aria-label={`Review ${causeTitle(request)}`}
            onClick={() => onOpen(request)}
          >
            <p className="min-w-0 text-body-compact font-medium">
              {causeTitle(request)}
            </p>
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
          </button>
        </li>
      ))}
    </ul>
  );
}
