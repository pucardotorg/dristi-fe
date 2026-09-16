"use client";

import * as React from "react";
import { CalendarCheck2Icon, SearchXIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { ScheduleTable } from "@/components/employee/schedule-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  causeTitle,
  counselFor,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  caseStageLabel,
  filterSchedulingCases,
  CASE_STAGES,
  EMPTY_SCHEDULE_FILTERS,
  SCHEDULING_QUEUE,
  type ScheduleFilters,
  type SchedulingCase,
} from "@/lib/employee/schedule";

/**
 * Schedule hearing — the matters this court owes a date.
 *
 * Deliberately the same screen as `HearingsScreen`, one row down the rail: the page title
 * stands on the page, and **one** lifted panel holds the filters, the table and the
 * pagination footer together. Same panel recipe, same `gap-6` / `p-6`, same table
 * treatment, same footer — literally the same footer component. A bench moving between
 * "Today's hearings" and "Schedule hearing" is looking at one court's work at two moments,
 * and should not have to re-learn the furniture in between.
 *
 * What differs is only what the two lists actually are. There is no hearing date to filter
 * by here — that is the thing these matters are missing — so the day picker is gone and
 * the stage of the case takes its place. The search is wider than the cause list's: it
 * reaches counsel as well as the cause and the number, because that is the question this
 * queue gets asked.
 */
export function ScheduleScreen() {
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used — every one of them, so the screen has a single rule rather than a live
     one and a deferred one. Every change resets to page one; the old Search button did
     that, and a keystroke that narrows the list to four rows must not leave the reader
     on page three of nothing. */
  const [filters, setFilters] = React.useState<ScheduleFilters>(
    EMPTY_SCHEDULE_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);

  const rows = filterSchedulingCases(SCHEDULING_QUEUE, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.stage !== "all" || filters.query !== "";

  function changeFilters(next: ScheduleFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_SCHEDULE_FILTERS);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          Schedule hearing
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries it
            rather than restating the title — the same header shape "Scrutinise submitted
            cases" uses, because a clerk moving between court screens should meet the same
            furniture. It counts the whole queue, not the filtered page, so it holds still
            while the filters move. Singular is spelled out because "1 matters" is the kind
            of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {SCHEDULING_QUEUE.length === 1
            ? "1 matter is waiting for a hearing date."
            : `${SCHEDULING_QUEUE.length} matters are waiting for a hearing date.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe the cause list and the cases panel use. Nothing
          inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <ScheduleFiltersRow
          filters={filters}
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
          <ScheduleEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Four columns do not survive a phone. Below `md` the same rows stack as
                  items — the cause list's own answer. */}
              <div className="hidden md:block">
                <ScheduleTable rows={pageRows} />
              </div>
              <div className="md:hidden">
                <ScheduleItemList rows={pageRows} />
              </div>
            </div>

            <ListFooter
              id="schedule-page-size"
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
 * Stage and free text, then apply — the reference's two controls, laid out the way the
 * cause list lays out its four.
 *
 * Every control carries a visible label. The reference labels none of them, leaning on
 * placeholders instead, which the accessibility floor treats as a defect rather than a
 * style (ACCESSIBILITY §12: placeholders may hint format, they are not labels) — so the
 * labels are the deviation, and the smallest one available.
 *
 * "Search" is the teal one here. The Ration Teal Law allows one strong action per view
 * and it is spent on the loudest thing present: there is nothing above the filters, and
 * the reference paints Search as the primary. Today's hearings spends the same allowance
 * the same way.
 */
function ScheduleFiltersRow({
  filters,
  onChange,
  onClear,
}: {
  filters: ScheduleFilters;
  onChange: (filters: ScheduleFilters) => void;
  onClear: () => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="schedule-stage" className="w-fit text-body">
          Stage
        </Label>
        <Select
          value={filters.stage}
          onValueChange={(value) =>
            onChange({
              ...filters,
              stage: value as ScheduleFilters["stage"],
            })
          }
        >
          <SelectTrigger id="schedule-stage" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {CASE_STAGES.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <QueueSearchField
        label="Search cases"
        className="sm:w-72"
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Case name, number or advocate"
      />

      {/* The only button left on the row. It stays because it undoes more than the
          search box's own `×` does — it returns every control here to the view the
          screen opens on — and it is labelled for that rather than for the text it
          also happens to clear. */}
      <Button type="button" variant="ghost" onClick={onClear}>
        Clear filters
      </Button>
    </form>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a filter that matched nothing is a dead
 * end with an action worth offering, while an empty queue is the court being up to date —
 * the one screen in this app where nothing to show is the good outcome, and it should read
 * that way rather than as a failure. Borderless and unpadded; the panel is already the
 * frame.
 */
function ScheduleEmpty({
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
            <CalendarCheck2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No matters match these filters" : "Everything is listed"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No matter waiting for a date matches the stage or search you asked for."
            : "Every case before this court already has a hearing date."}
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
 * A queue read on a phone is still the cause, its number and where the case has reached —
 * the columns that only support scanning drop to a caption line rather than forcing a
 * five-column table through a 375px screen.
 */
function ScheduleItemList({ rows }: { rows: SchedulingCase[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((matter) => (
        <li
          key={matter.id}
          className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4"
        >
          <p className="min-w-0 text-body-compact font-medium">
            {causeTitle(matter)}
          </p>
          <p className="text-caption text-muted-foreground">
            <span className="tabular-nums">{matter.caseNumber}</span> ·{" "}
            {caseStageLabel(matter.stage)}
          </p>
          {/* Comfortable, not dense: on a phone the +N chip gets the full 40×40 target,
              and a tap opens the same list the pointer hover does. */}
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
