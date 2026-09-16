"use client";

import * as React from "react";
import { GavelIcon, SearchXIcon } from "lucide-react";

import { ARRIVAL } from "@/components/chrome/motion";
import {
  CognizanceCaseLink,
  CognizanceTable,
  DelayCell,
} from "@/components/employee/cognizance-table";
import { CounselCell } from "@/components/employee/counsel-cell";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { CourtFilters } from "@/components/employee/court-filters";
import { useArrival } from "@/components/employee/use-arrival";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { rowActivation } from "@/lib/employee/row-activation";
import {
  COGNIZANCE_DELAY_FILTERS,
  COGNIZANCE_QUEUE,
  EMPTY_COGNIZANCE_FILTERS,
  filterCognizanceCases,
  type CognizanceCase,
  type CognizanceFilters,
} from "@/lib/employee/cognizance";
import {
  counselFor,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * Take cognizance — complaints on the register the magistrate has not yet decided to
 * proceed on.
 *
 * Deliberately the same screen as Register cases, one row down in the rail: the title
 * stands on the page, and **one** lifted panel holds the filters, the table and the
 * pagination footer together. Same recipe, same `gap-6` / `p-6`, same table treatment,
 * literally the same footer component. A magistrate moving from Register cases to Take
 * cognizance is looking at one complaint's life at two moments and should not have to
 * re-learn the furniture in between.
 *
 * **One list, not two.** The reference put *With Delay* and *Without delay* in the rail
 * as two counted rows opening two screens that differed by three lines. Whether a
 * complaint was late makes no difference to how cognizance is taken — the condonation
 * application came with it either way — so it narrows this list instead of forking it
 * (owner, 2026-09-14). Delay is a column you can read per row and a filter you can
 * apply.
 *
 * There is no teal on the page, and that is right: the Ration Teal Law spends a strong
 * action on the view's own act, and this view has none. Cognizance is taken at the foot
 * of a complaint's file, not on the list.
 */
export function CognizanceScreen() {
  /* Returning from a complaint, the queue slides in from the left — the direction it was
     left in, so coming back reads as coming back. */
  const arrival = useArrival();
  /* One state, not a draft and an applied one: the list answers as it is typed, so there
     is never a moment where what the bench has asked for and what the table shows
     disagree. Every change resets to page one. */
  const [filters, setFilters] = React.useState<CognizanceFilters>(
    EMPTY_COGNIZANCE_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);

  const rows = filterCognizanceCases(COGNIZANCE_QUEUE, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered =
    filters.query !== "" || filters.delay !== EMPTY_COGNIZANCE_FILTERS.delay;

  function changeFilters(next: CognizanceFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_COGNIZANCE_FILTERS);
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
          Take cognizance
        </h1>
        {/* The count is the point of a queue, so the supporting line carries it rather
            than restating the title. Singular is spelled out, because "1 complaints" is
            the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {COGNIZANCE_QUEUE.length === 1
            ? "1 complaint is on the register waiting for cognizance."
            : `${COGNIZANCE_QUEUE.length} complaints are on the register waiting for cognizance.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet. Nothing inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <CognizanceFiltersRow
          filters={filters}
          onChange={changeFilters}
          onClear={clearFilters}
        />

        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <CognizanceEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page sideways. */}
            <div className="min-w-0 overflow-x-auto">
              <div className="hidden md:block">
                <CognizanceTable rows={pageRows} />
              </div>
              <div className="md:hidden">
                <CognizanceItemList rows={pageRows} />
              </div>
            </div>

            <ListFooter
              id="cognizance-page-size"
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
 * Free text and the delay filter, both narrowing as they are set.
 *
 * No Search button: with nothing to compose before asking, a button only stands between
 * the bench and the answer. The way back to the whole queue is the `×` in the box and
 * the filter's own "All complaints".
 *
 * The form element stays so Enter in the box is swallowed rather than reloading the page.
 */
function CognizanceFiltersRow({
  filters,
  onChange,
  onClear,
}: {
  filters: CognizanceFilters;
  onChange: (filters: CognizanceFilters) => void;
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
      fields={[
        {
          id: "cognizance-delay",
          label: "Delay",
          value: filters.delay,
          all: "any",
          allLabel:
            COGNIZANCE_DELAY_FILTERS.find((option) => option.id === "any")
              ?.label ?? "All complaints",
          options: COGNIZANCE_DELAY_FILTERS.filter(
            (option) => option.id !== "any",
          ).map((option) => ({ value: option.id, label: option.label })),
          onApply: (value) =>
            onChange({ ...filters, delay: value as CognizanceFilters["delay"] }),
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
 * end with an action worth offering, while an empty queue is the bench being up to date.
 * Borderless and unpadded; the panel is already the frame.
 */
function CognizanceEmpty({
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
          {isFiltered ? <SearchXIcon aria-hidden /> : <GavelIcon aria-hidden />}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No complaints match these filters" : "Nothing waiting"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No complaint waiting for cognizance matches what you have asked for."
            : "Every complaint on this court's register has been taken cognizance of or dismissed."}
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
 * Four columns do not survive a 375px screen, so the cause keeps its line, the number
 * and the delay share the one under it, and the advocates drop to their own. The delay is
 * spelled out with its unit either way, because on a phone there is no column header to
 * name it.
 */
function CognizanceItemList({ rows }: { rows: CognizanceCase[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((matter) => (
        <li
          key={matter.id}
          {...rowActivation(
            "flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
          )}
        >
          <CognizanceCaseLink
            matter={matter}
            className="flex min-h-10 min-w-0 items-center"
          />
          <p className="text-caption text-muted-foreground">
            <span className="tabular-nums">{matter.caseNumber}</span>
            {" · "}
            <DelayCell matter={matter} />
          </p>
          <CounselCell
            complainant={counselFor(matter, "complainant").map(
              (counsel) => counsel.name,
            )}
            accused={counselFor(matter, "accused").map((counsel) => counsel.name)}
          />
        </li>
      ))}
    </ul>
  );
}
