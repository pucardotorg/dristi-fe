"use client";

import * as React from "react";
import { FolderCheckIcon, SearchXIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
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

  const rows = filterRegisterCases(REGISTER_QUEUE, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query !== "";

  function changeFilters(next: RegisterFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_REGISTER_FILTERS);
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
        <RegisterCasesFilters filters={filters} onChange={changeFilters} />

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
 * Free text, filtering as it is typed — the reference's one control.
 *
 * The reference put a Search button beside it and this screen used to as well. It is
 * gone: with one text box there is nothing to compose before asking, so the button only
 * ever stood between the clerk and the answer. The way back to the whole queue is the
 * `×` inside the box (`QueueSearchField`), which is why there is no "Clear" beside it
 * either — on this screen the search *is* the filters, and two controls for one undo is
 * one too many.
 *
 * **The page now has no teal at all, and that is right.** Search was its only
 * `bg-primary`, and the Ration Teal Law rations a strong action to the page's own act —
 * which this page does not have. Registering a case happens inside a row's overlay, not
 * on the list. The same argument the advocate register's brief makes at D9. Nothing was
 * promoted to fill the gap; the openers stay quiet `text-foreground`.
 *
 * The form element stays so Enter in the box is swallowed rather than reloading the page:
 * a lone text input inside a `<form>` submits implicitly, and there is no submit handler
 * left to catch it.
 */
function RegisterCasesFilters({
  filters,
  onChange,
}: {
  filters: RegisterFilters;
  onChange: (filters: RegisterFilters) => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <QueueSearchField
        label="Search cases"
        className="sm:w-80"
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Case name, number or advocate"
      />
    </form>
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
            <Identifier value={matter.caseNumber} label="case number" />
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
