"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { ARRIVAL } from "@/components/chrome/motion";
import { useArrival } from "@/components/employee/use-arrival";
import { rowActivation } from "@/lib/employee/row-activation";
import { cn } from "@/lib/utils";
import {
  RegisterCaseLink,
  RegisterCasesTable,
} from "@/components/employee/register-cases-table";
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
  counselFor,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  EMPTY_REGISTER_FILTERS,
  REGISTER_QUEUE,
  filterRegisterCases,
  type RegisterCase,
  type RegisterFilters,
} from "@/lib/employee/register-cases";
import { Identifier } from "@/components/chrome/identifier";
import {
  CourtFilters,
  CourtSortSelect,
  type CourtFilterField,
} from "@/components/employee/court-filters";
import {
  compareCaseNumbers,
  sortOptions,
  sortRows,
  type CourtSortSpec,
} from "@/lib/employee/court-sort";
import {
  applyColumnFilters,
  columnFilterFields,
  emptyColumnFilters,
  hasColumnFilters,
  type ColumnFilter,
} from "@/lib/employee/court-column-filters";

/** The wait in the scrutiny registry's own bands (7 and 14 days), so the queues agree. */
const REGISTER_COLUMN_FILTERS: ColumnFilter<RegisterCase>[] = [
  {
    id: "register-wait",
    label: "Waiting",
    allLabel: "Any wait",
    options: [
      { value: "long", label: "14 days or more" },
      { value: "mid", label: "7 to 13 days" },
      { value: "short", label: "Under 7 days" },
    ],
    test: (row, value) =>
      value === "long"
        ? row.daysSinceSubmitted >= 14
        : value === "mid"
          ? row.daysSinceSubmitted >= 7 && row.daysSinceSubmitted < 14
          : row.daysSinceSubmitted < 7,
  },
];

type RegisterSort = "longest" | "shortest" | "filing";

/** Longest waiting first, by the Days since submitted column. */
const REGISTER_SORTS: CourtSortSpec<RegisterCase, RegisterSort>[] = [
  {
    id: "longest",
    label: "Longest waiting first",
    compare: (a, b) =>
      b.daysSinceSubmitted - a.daysSinceSubmitted ||
      compareCaseNumbers(a.filingNumber, b.filingNumber),
  },
  {
    id: "shortest",
    label: "Shortest waiting first",
    compare: (a, b) =>
      a.daysSinceSubmitted - b.daysSinceSubmitted ||
      compareCaseNumbers(a.filingNumber, b.filingNumber),
  },
  {
    id: "filing",
    label: "Filing number",
    compare: (a, b) => compareCaseNumbers(a.filingNumber, b.filingNumber),
  },
];

/**
 * Register cases — complaints this court has not yet taken on the register.
 *
 * Deliberately the same screen as `ScheduleScreen`, one group over in the rail: the
 * page title stands on the page, and **one** lifted panel holds the filters, the
 * table and the pagination footer together. Same panel recipe, same `gap-6` / `p-6`,
 * same table treatment, same footer — literally the same footer component. A bench
 * moving from "Schedule hearing" to "Register cases" is looking at one court's work
 * at two moments, and should not have to re-learn the furniture in between.
 *
 * What differs is only what the list actually is. There is no stage to filter by —
 * a complaint in this queue is in one state, waiting — so the reference's single
 * search is the only control. The search reaches counsel as well as the cause and
 * the number, because that is the question the reference labelled.
 */
export function RegisterCasesScreen() {
  /* Returning from a complaint, the queue slides in from the left — the direction it was
     left in, so coming back reads as coming back (owner, 2026-09-12). */
  const arrival = useArrival();
  /* One state, not a draft and an applied one: the list answers the box as it is typed,
     so there is never a moment where what the clerk has written and what the table is
     showing disagree. Every change resets to page one — the old Search button did that,
     and a keystroke that narrows the list to four rows must not leave the reader on
     page three of nothing. */
  const [filters, setFilters] = React.useState<RegisterFilters>(
    EMPTY_REGISTER_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);

  const [columns, setColumns] = React.useState(() =>
    emptyColumnFilters(REGISTER_COLUMN_FILTERS),
  );
  const [sort, setSort] = React.useState<RegisterSort>("longest");

  const rows = sortRows(
    applyColumnFilters(filterRegisterCases(REGISTER_QUEUE, filters), REGISTER_COLUMN_FILTERS, columns),
    REGISTER_SORTS,
    sort,
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "" || hasColumnFilters(columns);

  function changeFilters(next: RegisterFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_REGISTER_FILTERS);
    setColumns(emptyColumnFilters(REGISTER_COLUMN_FILTERS));
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8",
        arrival && ARRIVAL[arrival],
      )}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Register cases
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries
            it rather than restating the title. Singular is spelled out because
            "1 complaints" is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {REGISTER_QUEUE.length === 1
            ? "1 complaint is waiting to be registered."
            : `${REGISTER_QUEUE.length} complaints are waiting to be registered.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe the cause list and the scheduling queue use.
          Nothing inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <RegisterCasesFilters
          filters={filters}
          onChange={changeFilters}
          onClear={clearFilters}
          fields={columnFilterFields(REGISTER_COLUMN_FILTERS, columns, (id, value) => {
            setColumns((current) => ({ ...current, [id]: value }));
            setPage(1);
          })}
          trailing={
            <CourtSortSelect
              id="register-cases-sort"
              value={sort}
              options={sortOptions(REGISTER_SORTS)}
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
          <RegisterCasesEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so
                a wide table scrolls inside the panel instead of pushing the page
                sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Four columns do not survive a phone. Below `md` the same rows stack
                  as items — the scheduling queue's own answer. */}
              <div className="hidden md:block">
                <RegisterCasesTable rows={pageRows} />
              </div>
              <div className="md:hidden">
                <RegisterCasesItemList rows={pageRows} />
              </div>
            </div>

            <ListFooter
              id="register-cases-page-size"
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
  );
}

/**
 * The search box, the wait filter, and the order on the end of the row — the court-side
 * filter row (`CourtFilters`).
 */
function RegisterCasesFilters({
  filters,
  onChange,
  onClear,
  fields,
  trailing,
}: {
  filters: RegisterFilters;
  onChange: (filters: RegisterFilters) => void;
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
      fields={fields}
      trailing={trailing}
      onClearAll={onClear}
    />
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a filter that matched nothing is a
 * dead end with an action worth offering, while an empty queue is the court being
 * up to date — the same good-empty Schedule hearing already uses. Borderless and
 * unpadded; the panel is already the frame.
 */
function RegisterCasesEmpty({
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
            ? "No complaint waiting to be registered matches the search you asked for."
            : "Every complaint before this court is already on the register."}
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
 * A queue read on a phone is still the cause, its number and how long it has
 * waited — the advocates drop to their own line rather than forcing a four-column
 * table through a 375px screen. Days are spelled out because there is no column
 * header to name the unit. The cause opens the complaint's file here too: a phone is
 * where a clerk is most likely to be reading a queue they cannot act on otherwise.
 */
function RegisterCasesItemList({ rows }: { rows: RegisterCase[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((matter) => (
        <li
          key={matter.id}
          {...rowActivation(
            "flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
          )}
        >
          {/* The same opener as the table's first cell, in the box a stacked row
              wants: `min-h-10` for the touch target, and the item's own line rather
              than a cell to fill. */}
          <RegisterCaseLink
            matter={matter}
            className="flex min-h-10 min-w-0 items-center"
          />
          <p className="text-caption text-muted-foreground">
            <Identifier value={matter.filingNumber} label="filing number" />
            {" · "}
            <span className="tabular-nums text-warning-ink">
              {matter.daysSinceSubmitted}
            </span>{" "}
            {matter.daysSinceSubmitted === 1
              ? "day since submitted"
              : "days since submitted"}
          </p>
          <CounselCell
            complainant={counselFor(matter, "complainant").map(
              (counsel) => counsel.name,
            )}
            accused={counselFor(matter, "accused").map(
              (counsel) => counsel.name,
            )}
          />
        </li>
      ))}
    </ul>
  );
}
