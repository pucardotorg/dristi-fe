"use client";

import Link from "next/link";

import { useCourtToday } from "@/components/employee/use-court-today";
import { Button } from "@/components/ui/button";
import { PANEL_CLASS } from "@/components/shell/panel";
import {
  COURT_CASE_COUNT,
  COURT_PRIORITIES,
  courtCaseAge,
  courtCaseTitle,
  courtPriorityCount,
  courtStageSpread,
  oldestCourtCase,
} from "@/lib/employee/cases";
import { formatCourtDay, TODAYS_HEARING_COUNT } from "@/lib/employee/hearings";
import { COURT_CASES_PAGE, courtWaitingGroups } from "@/lib/employee/navigation";
import { cn } from "@/lib/utils";

/**
 * `/employee` — the bench's morning brief.
 *
 * ## The brief (owner, three rejected passes)
 *
 * The information was right from the first; the composition was a generic admin panel —
 * ten identical rounded cards at one elevation, grey icon chips, tracked all-caps
 * eyebrows, dot-joined meta. Every block weighed the same, so nothing led, and none of it
 * belonged to a court.
 *
 * This pass throws that out for a quieter, more deliberate screen, on a few rules:
 *
 * - **The numbers are the design.** Each priority is a big tabular count and a plain
 *   label — no icon, no card, no chevron. They sit in one hairline grid, not six floating
 *   boxes, so the row reads as a single instrument.
 * - **Colour means one thing at a time.** Red is spent once, on the accused-in-custody
 *   count, because that is the only line here about a person's liberty. Teal is spent
 *   once, on the caseload bars, because that is the shape of the court's work. Everything
 *   else is ink on paper.
 * - **No template chrome.** Sentence case throughout, no all-caps eyebrows, no `A · B · C`
 *   meta, no arrows glued to links. Case numbers are set in mono — the one motif this
 *   world actually has.
 * - **Boldness in one place.** The attention row is loud; the two panels under it are
 *   quiet reference, distinguished by form (a bar figure, four counted columns) rather
 *   than by more colour.
 *
 * The six categories are the owner's Gujarat field visit, and the judges there did not
 * want general analytics on their landing screen — this is not that screen (the cause
 * list is), so a caseload figure is fair, but there is still no disposal rate and no
 * trend line. Every number links to the work behind it; arriving there is the feedback.
 */
export function CourtDashboardScreen() {
  const today = useCourtToday();
  const groups = courtWaitingGroups();
  const spread = courtStageSpread();
  const oldest = oldestCourtCase();
  /* One scale for all seven bars, anchored on the busiest stage — a bar chart's whole
     claim is that its lengths are comparable. */
  const busiest = Math.max(...spread.map((entry) => entry.count), 1);

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold sm:text-title-l">Dashboard</h1>
          <p className="text-body text-muted-foreground">{formatCourtDay(today)}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-body-compact text-muted-foreground tabular-nums">
            {TODAYS_HEARING_COUNT} matters listed for today
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/hearings">Open today&rsquo;s hearings</Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="court-attention" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="court-attention" className="text-title-s font-semibold">
            Needs attention
          </h2>
          <p className="text-body-compact text-muted-foreground">
            The matters this court must act on first. Each opens the register.
          </p>
        </div>

        {/* One instrument, not six cards: cells sit on a hairline ground and the `gap-px`
            lets it through as the rule between them, so the row reads as a single divided
            panel at every column count. */}
        <div className="overflow-hidden rounded-xl border border-hairline bg-hairline shadow-raised">
          <div className="grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-6">
            {COURT_PRIORITIES.map((priority) => {
              const count = courtPriorityCount(priority);
              const alarm = priority.id === "utp" && count > 0;
              const number = (
                <span
                  className={cn(
                    "text-display-s font-semibold tracking-tight tabular-nums",
                    count === 0 && "text-muted-foreground",
                    alarm && "text-destructive-ink",
                  )}
                >
                  {count}
                </span>
              );
              const label = (
                /* Two lines reserved: most labels wrap to two at cell width and a few
                   ("Stayed", "Time-bound") do not — without the reserve the short ones
                   leave the cell ragged against its neighbours in the grid. */
                <span className="min-h-10 text-body-compact font-medium text-muted-foreground">
                  {priority.tile}
                </span>
              );
              if (count === 0) {
                return (
                  <div
                    key={priority.id}
                    className="flex flex-col gap-1 bg-card p-4 md:p-6"
                  >
                    {number}
                    {label}
                  </div>
                );
              }
              return (
                <Link
                  key={priority.id}
                  href={`${COURT_CASES_PAGE.href}?priority=${priority.id}`}
                  aria-label={`${priority.title}: ${count} ${count === 1 ? "case" : "cases"}`}
                  className="flex flex-col gap-1 bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none focus-visible:ring-inset md:p-6"
                >
                  {number}
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="court-spread"
        className={cn(PANEL_CLASS, "flex flex-col gap-6 rounded-xl bg-card p-6")}
      >
        <div className="flex flex-col gap-1">
          <h2 id="court-spread" className="text-title-s font-semibold">
            Where the cases stand
          </h2>
          <p className="text-body-compact text-muted-foreground">
            All {COURT_CASE_COUNT} cases on the file, by the stage they have reached.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* One series, one hue, no legend — the heading names it. Every row carries its
              own label and count, so the figure is its own table and nothing rests on
              colour. Trial order, never sorted by size: the order is the diagnosis. */}
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {spread.map((entry) => (
              <li key={entry.stage} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-body-compact text-muted-foreground">
                  {entry.label}
                </span>
                <span aria-hidden className="flex min-w-0 flex-1 items-center">
                  {entry.count > 0 ? (
                    <span
                      className="h-2 rounded-r-full bg-brand-accent"
                      style={{ width: `${(entry.count / busiest) * 100}%` }}
                    />
                  ) : null}
                </span>
                <span className="w-6 shrink-0 text-right text-body-compact font-semibold tabular-nums">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>

          {oldest ? (
            <div className="border-t border-hairline pt-6 lg:w-60 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <p className="text-body-compact text-muted-foreground">
                Oldest case on the file
              </p>
              <p className="mt-1 text-title-s font-semibold tabular-nums">
                {courtCaseAge(oldest.registeredDaysAgo)}
              </p>
              <p className="mt-3 font-mono text-body-compact tabular-nums">
                {oldest.caseNumber}
              </p>
              <p className="text-body-compact text-muted-foreground">
                {courtCaseTitle(oldest)}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="court-waiting"
        className={cn(PANEL_CLASS, "flex flex-col gap-6 rounded-xl bg-card p-6")}
      >
        <div className="flex flex-col gap-1">
          <h2 id="court-waiting" className="text-title-s font-semibold">
            Waiting on this court
          </h2>
          <p className="text-body-compact text-muted-foreground">
            Every queue with work in it, in the four kinds the rail groups them by.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => (
            <div key={group.id} className="flex min-w-0 flex-col">
              {/* The group's total is the headline; its queues are the detail under it. */}
              <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-3">
                <h3 className="text-body font-semibold">{group.label}</h3>
                <span className="text-title-s font-semibold tabular-nums">
                  {group.total}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-0.5">
                {group.items.map((queue) => (
                  <li key={queue.id}>
                    <Link
                      href={queue.href}
                      className="-mx-2 flex min-h-9 items-center justify-between gap-3 rounded-md px-2 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                    >
                      <span className="min-w-0 truncate text-body-compact text-muted-foreground">
                        {queue.label}
                      </span>
                      <span className="shrink-0 text-body-compact font-semibold tabular-nums">
                        {queue.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
