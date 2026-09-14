"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { GavelIcon } from "lucide-react";

import {
  CourtCaseItemList,
  CourtCasesTable,
} from "@/components/employee/court-cases-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { useCourtToday } from "@/components/employee/use-court-today";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COURT_CASE_COUNT,
  COURT_PRIORITIES,
  courtPriorityById,
  EMPTY_COURT_CASE_FILTERS,
  filterCourtCases,
  hasCourtCaseFilters,
  type CourtCaseFilters,
  type CourtPriorityId,
} from "@/lib/employee/cases";
import {
  COURT_CASE_STAGES,
  PAGE_SIZE,
  type CourtCaseStage,
  type HearingsPageSize,
} from "@/lib/employee/hearings";

/**
 * `/employee/cases` — this court's register, searchable.
 *
 * It was briefly the lower half of the dashboard. The owner split it out on 2026-09-14:
 * *"the dashboard is more of a health check… by mixing these two we are complicating
 * things for ourselves."* One screen answering "how is this court doing" and "where is
 * that file" had to compromise on the form of each, and it did.
 *
 * So this screen has one job and the plain shape every other court-side queue has: a
 * heading, a labelled filter row, one lifted table, a footer. **The priority categories
 * are a filter here, not cards** — a select in the row beside the search, which is what
 * a filter looks like on the other sixteen court screens. The version with pressable
 * cards above the list is what the owner rejected: a card cannot be both a summary and a
 * control, and the pressed state ended up stated twice because of it.
 *
 * The dashboard's tiles arrive here as `?priority=<id>`, already narrowed. That is the
 * same journey a card-press made, except the feedback is a whole new screen with the
 * category in its heading — which is the strongest answer a press can get, and the thing
 * the filtering version never managed.
 */
export function CourtCasesScreen() {
  const today = useCourtToday();
  const searchParams = useSearchParams();

  /* The category the dashboard sent us to, read once on arrival. It seeds the filter and
     is then the reader's to change — a URL that kept overriding the select would make the
     control fight the address bar. An unknown value is ignored rather than shown as a
     broken filter. */
  const [filters, setFilters] = React.useState<CourtCaseFilters>(() => {
    const asked = searchParams.get("priority");
    const known = COURT_PRIORITIES.some((priority) => priority.id === asked);
    return {
      ...EMPTY_COURT_CASE_FILTERS,
      /* The dashboard opens a specific case here with `?q=<case number>` and a category
         with `?priority=<id>`. Both only seed the filters — once here they are the
         reader's to change, so the address bar never fights the controls. */
      query: searchParams.get("q") ?? "",
      priority: known ? (asked as CourtPriorityId) : null,
    };
  });
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const rows = filterCourtCases(filters);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  /* Clamped rather than reset in an effect: a filter that shortens the list must not
     leave the reader on page three of nothing, and deriving it means there is no render
     where the page number and the rows disagree. */
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const active = filters.priority
    ? courtPriorityById(filters.priority)
    : undefined;
  const isFiltered = hasCourtCaseFilters(filters);

  function change(next: CourtCaseFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    change(EMPTY_COURT_CASE_FILTERS);
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          All cases
        </h1>
        {/* The count line says what is in view and what the court holds, in that order,
            because when a filter is on the first number is the one being read. */}
        <p className="text-body text-muted-foreground tabular-nums">
          {isFiltered
            ? `${rows.length} of ${COURT_CASE_COUNT} cases match.`
            : `${COURT_CASE_COUNT} cases on this court's file.`}
        </p>
      </header>

      {/* One panel: filter, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe every other court-side list uses. Nothing inside
          draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card p-6 shadow-raised">
        <form
          className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <QueueSearchField
            label="Search cases"
            className="sm:w-80"
            ref={searchRef}
            value={filters.query}
            onChange={(query) => change({ ...filters, query })}
            placeholder="Case number, complainant or accused"
          />

          <Field className="sm:w-56">
            <FieldLabel className="text-body" htmlFor="court-cases-priority">
              Priority
            </FieldLabel>
            <Select
              value={filters.priority ?? "any"}
              onValueChange={(next) =>
                change({
                  ...filters,
                  priority: next === "any" ? null : (next as CourtPriorityId),
                })
              }
            >
              <SelectTrigger id="court-cases-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any priority</SelectItem>
                {COURT_PRIORITIES.map((priority) => (
                  <SelectItem key={priority.id} value={priority.id}>
                    {priority.tile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field className="sm:w-40">
            <FieldLabel className="text-body" htmlFor="court-cases-stage">
              Stage
            </FieldLabel>
            <Select
              value={filters.stage ?? "all"}
              onValueChange={(next) =>
                change({
                  ...filters,
                  stage: next === "all" ? null : (next as CourtCaseStage),
                })
              }
            >
              <SelectTrigger id="court-cases-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {COURT_CASE_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isFiltered ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </form>

        {/* The category's own sentence, when one is chosen. The select says which
            category; this says what being in it means, which a 56px control cannot. */}
        {active ? (
          <p className="text-body-compact text-muted-foreground">
            <span className="font-semibold text-foreground">{active.title}.</span>{" "}
            {active.meaning}
          </p>
        ) : null}

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <Empty className="px-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GavelIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-body font-semibold">
                No case matches
              </EmptyTitle>
              <EmptyDescription className="text-body-compact">
                Nothing on this court&rsquo;s file answers the filters set above.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* `min-w-0` lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page
                sideways. */}
            <div className="min-w-0 overflow-x-auto">
              <div className="hidden md:block">
                <CourtCasesTable rows={pageRows} today={today} />
              </div>
              <div className="md:hidden">
                <CourtCaseItemList rows={pageRows} today={today} />
              </div>
            </div>

            <ListFooter
              id="court-cases-page-size"
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
