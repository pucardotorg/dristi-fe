"use client";

import * as React from "react";
import {
  ClockIcon,
  FileClockIcon,
  GavelIcon,
  HandIcon,
  ScaleIcon,
  SendIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import {
  CourtCaseItemList,
  CourtCasesTable,
} from "@/components/employee/court-cases-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { useCourtSession } from "@/components/employee/use-court-role";
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
  courtPriorityCount,
  EMPTY_COURT_CASE_FILTERS,
  filterCourtCases,
  type CourtCaseFilters,
  type CourtPriority,
  type CourtPriorityId,
} from "@/lib/employee/cases";
import {
  COURT_CASE_STAGES,
  formatCourtDay,
  PAGE_SIZE,
  type CourtCaseStage,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * `/employee` — the dashboard and this court's register, on one screen.
 *
 * The combination is the owner's (2026-09-14): *"I think we can combine the dashboard and
 * all cases list."* It is the right read of what the six tiles are. They are not an
 * analytic beside a list — they are **saved filters over the list**, so a tile's count and
 * the rows it opens are the same query asked twice, and the rail's two dead rows
 * (`Dashboards`, `All cases`) collapse into this one destination.
 *
 * ## What is on it, and what is deliberately not
 *
 * The tiles come from the owner's Gujarat field visit. Judges there asked for dedicated
 * status tiles for the administrative and statutory categories that need judicial action
 * now, and explicitly did **not** ask for general analytics or broad pendency numbers on
 * their landing screen. So there is no disposal rate here, no pendency chart, no
 * month-on-month anything: six counts the bench can act on, and the register under them.
 *
 * ## Pressing a tile
 *
 * One tile at a time, and pressing it again releases it — they are one question ("which
 * priority am I looking at?"), not six checkboxes. The panel below retitles itself to the
 * category's full name and prints what the category *means*, because "Time-bound" on a
 * 160px tile cannot say "a higher court has fixed a date by which this case must be
 * disposed" and the panel has room to.
 *
 * The selected fill is `accent-strong`, which is the DS's pressed-and-engaged token. It is
 * deliberately not the brand: teal means "current / now" on this product, never
 * "selected" (ui-craft §2).
 *
 * A tile with nothing behind it is not a control. It renders as a quiet block with its
 * count, because zero is a real and useful answer — no one in custody today — and a
 * button that filters to an empty table is a dead end dressed as an affordance.
 *
 * ## Signing in does not land here
 *
 * The day's cause list does (`court-sign-in-block`), on the owner's call that a dashboard
 * is not the common thing court staff open the product to see. This is a destination on
 * the rail, not the front door.
 */

/**
 * A mark per category, so six tiles of similar length are told apart before they are
 * read. Neutral, never brand-tinted: the one rationed accent on this screen is the
 * pressed tile, and six teal tiles would spend it six times over.
 */
const PRIORITY_ICON: Record<CourtPriorityId, LucideIcon> = {
  "pending-cognizance": GavelIcon,
  utp: HandIcon,
  stayed: ScaleIcon,
  "time-bound": ClockIcon,
  "appellate-pending": FileClockIcon,
  "process-pending": SendIcon,
};

export function CourtDashboardScreen() {
  const today = useCourtToday();
  /* The bench this staff member signed in to. The screen says it because every order and
     form this court produces is headed with it, and the chrome says it only in the rail's
     foot, which is `sr-only` when the rail is folded. */
  const { court } = useCourtSession();

  const [filters, setFilters] = React.useState<CourtCaseFilters>(
    EMPTY_COURT_CASE_FILTERS,
  );
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

  function change(next: CourtCaseFilters) {
    setFilters(next);
    setPage(1);
  }

  /** Pressing the pressed tile releases it — one question, not six checkboxes. */
  function toggle(id: CourtPriorityId) {
    change({ ...filters, priority: filters.priority === id ? null : id });
  }

  function clearAll() {
    change(EMPTY_COURT_CASE_FILTERS);
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          Dashboard
        </h1>
        <p className="text-body text-muted-foreground">
          {court} · {formatCourtDay(today)}
        </p>
      </header>

      <section aria-labelledby="court-priorities" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="court-priorities" className="text-title-s font-semibold">
            Needs attention
          </h2>
          <p className="text-body-compact text-muted-foreground">
            Pick one to narrow the register below.
          </p>
        </div>

        {/* Two across even at 375px. Six tiles in one column would push the register
            two screens down, and the register is the other half of this page. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {COURT_PRIORITIES.map((priority) => (
            <PriorityTile
              key={priority.id}
              priority={priority}
              count={courtPriorityCount(priority)}
              active={filters.priority === priority.id}
              onToggle={() => toggle(priority.id)}
            />
          ))}
        </div>
      </section>

      {/* One panel: the heading, the filters, the list and the footer are one unit of
          work, so they share one lifted sheet — the recipe every court-side list uses.
          Nothing inside draws a second frame. */}
      <section
        aria-labelledby="court-register"
        className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card p-6 shadow-raised"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* The heading becomes the category when a tile is pressed. The panel is the
                one place with room for the category's full name, which is why a priority
                carries a short name and a long one. */}
            <h2 id="court-register" className="text-title-s font-semibold">
              {active ? active.title : "All cases"}
            </h2>
            {active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => change({ ...filters, priority: null })}
              >
                <XIcon data-icon="inline-start" aria-hidden />
                Show all cases
              </Button>
            ) : null}
          </div>
          <p className="text-body-compact text-muted-foreground">
            {active
              ? active.meaning
              : `Every one of this court's ${COURT_CASE_COUNT} cases. Search by case number or party.`}
          </p>
        </div>

        <CourtCaseFiltersRow
          filters={filters}
          searchRef={searchRef}
          onChange={change}
          onClear={clearAll}
        />

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
              <Button type="button" variant="outline" onClick={clearAll}>
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
              id="court-register-page-size"
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
 * One category: its name, its mark, and how many cases are in it.
 *
 * Name first, because the name is what the eye uses to find the tile and the number is
 * what it came for. The name gets a **whole row** rather than sharing one with the mark:
 * at 375px two tiles across leaves about 80px beside a 32px mark, which is narrow enough
 * that "Time-bound" broke at its own hyphen. The mark pairs with the count instead, where
 * a tabular number leaves it all the room it needs.
 *
 * `tabular-nums` so six counts in a grid line up down their columns.
 *
 * A zero tile is a block, not a button — see the screen's own note.
 */
function PriorityTile({
  priority,
  count,
  active,
  onToggle,
}: {
  priority: CourtPriority;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  const Icon = PRIORITY_ICON[priority.id];
  const shell =
    "flex flex-col gap-3 rounded-xl border border-hairline bg-card p-4 text-left shadow-raised";

  const body = (
    <>
      <span className="text-body-compact font-medium">{priority.tile}</span>
      <div className="flex items-end justify-between gap-3">
        <span className="text-title-l font-semibold tabular-nums">{count}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
    </>
  );

  if (count === 0) {
    return (
      <div className={cn(shell, "text-muted-foreground")}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      /* Resolved here rather than through an `aria-pressed:` variant: the pressed fill
         and the hover fill have the same specificity, so which one wins would come down
         to the order Tailwind emits its variants in. */
      className={cn(
        shell,
        "transition-colors focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none",
        active ? "bg-accent-strong" : "hover:bg-accent",
      )}
    >
      {body}
    </button>
  );
}

/**
 * Free text and a stage, which are the two ways a clerk looks for a file that is not one
 * of the bench's priorities. The pressed tile is the third filter and lives above, where
 * it is also the thing that told you the count.
 *
 * **Each reset sits beside what it undoes, and they never overlap.** "Show all cases" is
 * up by the heading the tile changed, and releases the tile. This one clears the text and
 * the stage, and only appears when one of those is set — otherwise, with a tile pressed
 * and nothing else, the screen would carry two controls that did the same thing.
 */
function CourtCaseFiltersRow({
  filters,
  searchRef,
  onChange,
  onClear,
}: {
  filters: CourtCaseFilters;
  searchRef: React.Ref<HTMLInputElement>;
  onChange: (filters: CourtCaseFilters) => void;
  onClear: () => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <QueueSearchField
        label="Search cases"
        className="sm:w-96"
        ref={searchRef}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Case number, complainant or accused"
      />

      <Field className="sm:w-56">
        <FieldLabel className="text-body" htmlFor="court-register-stage">
          Stage
        </FieldLabel>
        <Select
          value={filters.stage ?? "all"}
          onValueChange={(value) =>
            onChange({
              ...filters,
              stage: value === "all" ? null : (value as CourtCaseStage),
            })
          }
        >
          <SelectTrigger id="court-register-stage" className="w-full">
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

      {filters.query.trim() !== "" || filters.stage !== null ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </form>
  );
}
