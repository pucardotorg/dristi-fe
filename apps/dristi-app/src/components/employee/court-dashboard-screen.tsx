"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { useCourtSession } from "@/components/employee/use-court-role";
import { useCourtToday } from "@/components/employee/use-court-today";
import {
  COURT_CASE_COUNT,
  COURT_PRIORITIES,
  courtCaseAge,
  courtCaseTitle,
  courtPriorityCount,
  courtStageSpread,
  oldestCourtCase,
} from "@/lib/employee/cases";
import {
  COURT_CASES_PAGE,
  courtWaitingQueues,
} from "@/lib/employee/navigation";
import { formatCourtDay, TODAYS_HEARING_COUNT } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * `/employee` — this court's health check.
 *
 * ## What it is, after two rejected versions
 *
 * v1 was six count cards in a band over the register, each card a filter. v2 made the
 * filter a single-select list beside the register, which fixed the feedback but kept the
 * two things on one screen. The owner rejected the premise on 2026-09-14: *"a dashboard
 * is more of a health check — that is the intent of a dashboard, and it should look like
 * a dashboard also. By mixing these two we are complicating things for ourselves."*
 *
 * Which is the right call, and it dissolves the problem rather than solving it. A health
 * check answers **how is this court doing**; a register answers **where is that file**.
 * Those are different questions, they want different forms, and the screen that tried to
 * be both had to compromise on each — which is why the card could never carry its own
 * pressed state.
 *
 * So: no list on this screen, and nothing here is a filter. Every number is a link to
 * the screen that holds the work, and **navigation is the feedback** — the whole page
 * changes, which is the strongest answer a press can get and the one thing the filtering
 * versions could not produce.
 *
 * ## The three questions it answers
 *
 * 1. **Needs attention** — the six statutory and administrative categories from the
 *    owner's Gujarat field visit. Judges there asked for exactly these and explicitly did
 *    *not* want general analytics on their primary landing screen; this is not that
 *    screen (the day's cause list is), which is what makes the rest of the board fair
 *    game. Each tile opens the register already narrowed to its category.
 * 2. **Waiting on this court** — how much sits in every built queue, read straight out
 *    of the rail's own data so the two can never disagree. It earns its place because the
 *    rail's four groups are collapsed by default: every one of these counts is otherwise
 *    behind a click.
 * 3. **Where the cases stand** — the register by stage, in pipeline order, with the
 *    oldest file on it. This is the one broad number on the board, and it is the one a
 *    magistrate can actually act on: nine cases stuck at cognizance is a diagnosis.
 *
 * There is no disposal rate, no month-on-month, and no chart of anything the bench cannot
 * do something about this morning.
 */
export function CourtDashboardScreen() {
  const today = useCourtToday();
  /* The bench this staff member signed in to. The board says it because every order and
     form this court produces is headed with it, and the chrome says it only in the rail's
     foot, which is `sr-only` when the rail is folded. */
  const { court } = useCourtSession();

  const waiting = courtWaitingQueues();
  const spread = courtStageSpread();
  const oldest = oldestCourtCase();
  /* One scale for all seven bars, anchored on the busiest stage — a bar chart's whole
     claim is that its lengths are comparable. */
  const busiest = Math.max(...spread.map((entry) => entry.count), 1);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          Dashboard
        </h1>
        {/* Which bench, which day, and what is on it — one line, because the day's
            sitting is where signing in lands and where the rail opens. The board must
            not repeat that screen as a panel of its own; it owes it a way back, and the
            count is the way back. */}
        <p className="text-body text-muted-foreground">
          {court} · {formatCourtDay(today)} ·{" "}
          <Link
            href="/employee/hearings"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            {TODAYS_HEARING_COUNT} matters listed today
          </Link>
        </p>
      </header>

      <section aria-labelledby="court-attention" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="court-attention" className="text-title-s font-semibold">
            Needs attention
          </h2>
          <p className="text-body-compact text-muted-foreground">
            The matters this court must act on first. Each opens the register,
            narrowed.
          </p>
        </div>

        {/* Two across on a phone, three from `md`, all six on one band from `xl`. Never
            one per row: six full-width tiles would be a screen of its own before the
            board had said anything else. */}
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {COURT_PRIORITIES.map((priority) => {
            const count = courtPriorityCount(priority);
            return (
              <li key={priority.id} className="flex">
                <PriorityTile
                  label={priority.tile}
                  count={count}
                  href={`${COURT_CASES_PAGE.href}?priority=${priority.id}`}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section
          aria-labelledby="court-waiting"
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-hairline bg-card p-6 shadow-raised"
        >
          <div className="flex flex-col gap-1">
            <h2 id="court-waiting" className="text-title-s font-semibold">
              Waiting on this court
            </h2>
            <p className="text-body-compact text-muted-foreground">
              Every queue with work in it, and how much.
            </p>
          </div>

          {/* Two columns inside the panel from `sm`: sixteen rows in one column is a
              panel twice the height of the one beside it. */}
          <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {waiting.map((queue) => (
              <li key={queue.id} className="min-w-0">
                <Link
                  href={queue.href}
                  className="group/queue flex min-h-10 items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none"
                >
                  <span className="min-w-0 text-body-compact">
                    {queue.label}
                  </span>
                  <span className="shrink-0 text-body-compact font-semibold tabular-nums">
                    {queue.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="court-spread"
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-hairline bg-card p-6 shadow-raised"
        >
          <div className="flex flex-col gap-1">
            <h2 id="court-spread" className="text-title-s font-semibold">
              Where the cases stand
            </h2>
            <p className="text-body-compact text-muted-foreground">
              All {COURT_CASE_COUNT} cases on the file, by the stage they have
              reached.
            </p>
          </div>

          {/* One series, so no legend — the heading names it. Every row prints its own
              label and its own number, so nothing here is carried by colour alone, and
              the rows are their own table view. Pipeline order, never sorted by size:
              the order is the information. */}
          <ul className="flex flex-col gap-2">
            {spread.map((entry) => (
              <li key={entry.stage} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-body-compact text-muted-foreground">
                  {entry.label}
                </span>
                {/* The plot. Bars grow from one shared baseline, 8px thick with a 4px
                    rounded data-end and a square start, on no track — a track would
                    turn seven comparable lengths into seven separate meters. */}
                <span aria-hidden className="flex min-w-0 flex-1 items-center">
                  <span
                    className={cn(
                      "h-2 rounded-r-sm bg-brand-accent",
                      entry.count === 0 && "hidden",
                    )}
                    style={{ width: `${(entry.count / busiest) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-body-compact font-semibold tabular-nums">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>

          {oldest ? (
            <p className="text-body-compact text-muted-foreground">
              Oldest on the file:{" "}
              <span className="font-medium text-foreground">
                {oldest.caseNumber}
              </span>{" "}
              — {courtCaseTitle(oldest)}, {courtCaseAge(oldest.registeredDaysAgo)}{" "}
              old.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

/**
 * One category: what it is, how many are in it, and a way into them.
 *
 * **A link, not a toggle.** This is the whole of the redesign in one component. The
 * pressable version had to signal its own state from a card that also had to stay
 * readable as a fact, and it could not — the advocate side's Pending tasks proves it, by
 * having to draw the pressed kind a second time as a chip in the filter row. A link has
 * no state to signal: it goes somewhere, and arriving is the feedback.
 *
 * Name first, count under it, arrow bottom-right. The name is what the eye uses to find
 * the tile and the number is what it came for; the name gets a whole row because at two
 * tiles across on a phone there is not enough width to share one with anything.
 *
 * A category with nothing in it is not a link. Zero is a real and useful answer — no one
 * in custody today — and the standing six are the court's standing six whatever today
 * holds; what a zero tile must not be is a door onto an empty table.
 */
function PriorityTile({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  const shell =
    "flex w-full flex-col gap-3 rounded-xl border border-hairline bg-card p-4 shadow-raised";

  if (count === 0) {
    return (
      <div className={cn(shell, "text-muted-foreground")}>
        <span className="text-body-compact font-medium">{label}</span>
        <span className="text-title-l font-semibold tabular-nums">{count}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        shell,
        "group/tile transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none",
      )}
    >
      <span className="text-body-compact font-medium">{label}</span>
      <div className="flex items-end justify-between gap-3">
        <span className="text-title-l font-semibold tabular-nums">{count}</span>
        <ArrowRightIcon
          aria-hidden
          className="mb-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover/tile:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
