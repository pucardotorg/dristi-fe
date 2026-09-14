"use client";

import Link from "next/link";
import {
  CalendarClockIcon,
  ChevronRightIcon,
  GavelIcon,
  LandmarkIcon,
  LockIcon,
  PauseIcon,
  SendIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react";

import { useCourtSession } from "@/components/employee/use-court-role";
import { useCourtToday } from "@/components/employee/use-court-today";
import { PANEL_CLASS } from "@/components/shell/panel";
import {
  COURT_CASE_COUNT,
  COURT_PRIORITIES,
  courtCaseAge,
  courtCaseTitle,
  courtPriorityCount,
  courtStageSpread,
  oldestCourtCase,
  type CourtPriorityId,
} from "@/lib/employee/cases";
import { formatCourtDay, TODAYS_HEARING_COUNT } from "@/lib/employee/hearings";
import { COURT_CASES_PAGE, courtWaitingGroups } from "@/lib/employee/navigation";
import { cn } from "@/lib/utils";

/**
 * `/employee` — this court's health check.
 *
 * ## Craft brief (owner, 2026-09-14, third pass)
 *
 * The information and the intent were right; the composition was not — *"it looks badly
 * crafted, no UI sensibility, I want better chunking, layering, use of space and
 * typography."* Fair. v2 was eight equal boxes on the canvas at one elevation, a flat
 * two-column list of sixteen queues, and a bar chart with an orphan paragraph under it.
 * Every block had the same weight, so nothing led.
 *
 * This pass composes rather than lists, on four moves:
 *
 * 1. **Three depths, not one.** Canvas (beige) → panels (white, raised) → wells
 *    (`surface-sunken`) for the one highlighted stat. The six priority tiles are the only
 *    things that lift on hover, because they are the only things you act on; the two
 *    reference panels sit still.
 * 2. **A hero number per priority.** Each tile is a stat, not a box: a `display-s` count
 *    is the loudest thing on the card, an identity mark sits above it, the label names it
 *    below, and the numbers align across the row because the mark row is a fixed height.
 * 3. **The workload keeps the rail's four groups.** v2 flattened sixteen queues into two
 *    columns of `label … number`, which is a spreadsheet. Here they stay Hearings /
 *    Actions / Review / Sign — four columns, each under its own mark and sub-total, the
 *    way the bench already files the work.
 * 4. **The pipeline is a figure, not a list with a tail.** Bars left, the oldest case as
 *    a proper sunken stat well to their right, on one baseline.
 *
 * ## What is on it, and what is deliberately not
 *
 * The six categories come from the owner's Gujarat field visit; judges there asked for
 * these and explicitly did not want general analytics on their landing screen. This is not
 * that screen — the day's cause list is — so the pipeline and the workload are fair, but
 * there is still no disposal rate and no month-on-month: only numbers the bench can act on
 * this morning. Every number is a link to the work behind it, and navigating there is the
 * feedback — the whole screen changes, which no in-place filter could match.
 */

const PRIORITY_ICON: Record<CourtPriorityId, LucideIcon> = {
  "pending-cognizance": GavelIcon,
  utp: LockIcon,
  stayed: PauseIcon,
  "time-bound": TimerIcon,
  "appellate-pending": LandmarkIcon,
  "process-pending": SendIcon,
};

export function CourtDashboardScreen() {
  const today = useCourtToday();
  /* The bench this staff member signed in to. The board says it because every order and
     form this court produces is headed with it, and the chrome says it only in the rail's
     foot, which is `sr-only` when the rail is folded. */
  const { court } = useCourtSession();

  const groups = courtWaitingGroups();
  const spread = courtStageSpread();
  const oldest = oldestCourtCase();
  /* One scale for all seven bars, anchored on the busiest stage — a bar chart's whole
     claim is that its lengths are comparable. */
  const busiest = Math.max(...spread.map((entry) => entry.count), 1);

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-title text-balance font-semibold sm:text-title-l">
            Dashboard
          </h1>
          <p className="text-body text-muted-foreground">
            {court} · {formatCourtDay(today)}
          </p>
        </div>

        {/* The one time-bound thing on the board, and the screen signing in lands on, so
            it is a way back to it rather than a panel repeating it. Given its own small
            lifted card in the header so "today" reads before the standing counts do. */}
        <Link
          href="/employee/hearings"
          className={cn(
            PANEL_CLASS,
            "group flex shrink-0 items-center gap-3 rounded-xl bg-card p-3 pr-4 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground">
            <CalendarClockIcon aria-hidden className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
              Today&rsquo;s sitting
            </span>
            <span className="text-body font-semibold tabular-nums">
              {TODAYS_HEARING_COUNT} matters listed
            </span>
          </span>
          <ChevronRightIcon
            aria-hidden
            className="ml-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </header>

      <section aria-labelledby="court-attention" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="court-attention" className="text-title-s font-semibold">
            Needs attention
          </h2>
          <p className="text-body-compact text-muted-foreground">
            The matters this court must act on first. Each opens the register,
            narrowed to it.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {COURT_PRIORITIES.map((priority) => (
            <li key={priority.id} className="flex">
              <PriorityTile
                icon={PRIORITY_ICON[priority.id]}
                label={priority.tile}
                count={courtPriorityCount(priority)}
                href={`${COURT_CASES_PAGE.href}?priority=${priority.id}`}
              />
            </li>
          ))}
        </ul>
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

        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="flex min-w-0 flex-col gap-1">
                {/* The group's mark and its sub-total, over a hairline that chunks the
                    column without a box around it. */}
                <div className="flex items-center gap-2 border-b border-hairline pb-2">
                  <GroupIcon aria-hidden className="size-4 text-muted-foreground" />
                  <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </span>
                  <span className="ml-auto text-caption font-semibold text-muted-foreground tabular-nums">
                    {group.total}
                  </span>
                </div>

                <ul className="flex flex-col">
                  {group.items.map((queue) => (
                    <li key={queue.id}>
                      <Link
                        href={queue.href}
                        className="group/row -mx-2 flex min-h-9 items-center justify-between gap-3 rounded-md px-2 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none"
                      >
                        <span className="min-w-0 truncate text-body-compact">
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
            );
          })}
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

        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          {/* One series, so one hue and no legend — the heading names it. Every row
              prints its own label and count, so the rows are their own table view and
              nothing is carried by colour alone. Pipeline order, never sorted by size:
              the order is the diagnosis. */}
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {spread.map((entry) => (
              <li key={entry.stage} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-body-compact text-muted-foreground">
                  {entry.label}
                </span>
                <span aria-hidden className="flex min-w-0 flex-1 items-center">
                  {entry.count > 0 ? (
                    <span
                      className="h-2.5 rounded-r-sm bg-brand-accent"
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
            <div className="flex flex-col gap-1 rounded-lg border border-hairline bg-surface-sunken p-4 lg:w-64 lg:shrink-0">
              <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                Oldest on file
              </span>
              <span className="text-title-s font-semibold tabular-nums">
                {courtCaseAge(oldest.registeredDaysAgo)}
              </span>
              <span className="text-body-compact font-medium tabular-nums">
                {oldest.caseNumber}
              </span>
              <span className="text-body-compact text-muted-foreground">
                {courtCaseTitle(oldest)}
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * One priority category as a stat: an identity mark, the count as the hero, the name
 * below it.
 *
 * **A link, not a toggle** — the whole of the redesign that got here. A pressable card had
 * to signal its own state from a surface that also had to stay readable as a fact, and it
 * could not; a link has no state to signal, so arriving is the feedback.
 *
 * The mark sits in its own row so the numbers line up across all six tiles whatever the
 * label length, and the label wraps downward under a number that never moves. A category
 * with nothing in it is not a link and not a hero: the count goes muted, the chevron and
 * the lift are gone, and it recedes to context — which is the honest weight of "no one in
 * custody today".
 */
function PriorityTile({
  icon: Icon,
  label,
  count,
  href,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  href: string;
}) {
  const empty = count === 0;
  const shell = cn(
    PANEL_CLASS,
    "flex h-full w-full flex-col gap-3 rounded-xl bg-card p-4",
  );
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg bg-surface-sunken",
            empty ? "text-muted-foreground/70" : "text-muted-foreground",
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        {empty ? null : (
          <ChevronRightIcon
            aria-hidden
            className="size-4 text-muted-foreground opacity-0 transition-all group-hover/tile:translate-x-0.5 group-hover/tile:opacity-100"
          />
        )}
      </span>
      <span className="flex flex-col gap-1">
        <span
          className={cn(
            "text-display-s font-semibold tracking-tight tabular-nums",
            empty && "text-muted-foreground",
          )}
        >
          {count}
        </span>
        {/* Two lines reserved: most labels wrap to two at tile width and a few
            ("Stayed", "Time-bound") do not, and without the reserve the short ones
            leave the stretched card empty at the foot. */}
        <span className="min-h-10 text-body-compact font-medium text-muted-foreground">
          {label}
        </span>
      </span>
    </>
  );

  if (empty) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={href}
      aria-label={`${label}: ${count} ${count === 1 ? "case" : "cases"}`}
      className={cn(
        shell,
        "group/tile transition-all hover:bg-accent hover:shadow-overlay focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  );
}
