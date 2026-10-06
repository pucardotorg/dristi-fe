"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/employee/bulk-reschedule";
import { isoDay, parseIsoDay } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export type PlannerCell = {
  /** What the cell says under the date — a count, or a before → after. */
  body?: React.ReactNode;
  /** A short mark in the cell's corner, e.g. "Suggested". */
  tag?: string;
  /** The day's whole accessible name: date, count, tag, state. */
  label: string;
};

function monthStart(day: string) {
  return `${day.slice(0, 7)}-01`;
}

function shiftMonth(month: string, by: number) {
  const date = parseIsoDay(month);
  date.setMonth(date.getMonth() + by, 1);
  return isoDay(date);
}

/** The next weekday before or after `day`, stepping over Saturday and Sunday. */
function stepWeekday(day: string, by: 1 | -1) {
  let next = addDays(day, by);
  while ([0, 6].includes(parseIsoDay(next).getDay())) next = addDays(next, by);
  return next;
}

/**
 * A month of sitting days, laid out for planning rather than for picking a date.
 *
 * The design system's calendar is a date picker — 28 to 48px cells built to be scanned
 * for a date, with room for nothing else. Rescheduling reads each day's load before it
 * chooses one, so this draws weekdays only (the court does not sit on the others) as
 * large cells that carry the count and a mark — the suggested day says so inside its own
 * cell (owner, 2026-10-06). Recorded as a design-system request: a planner variant of
 * Calendar (`docs/design/ds-requests.md`).
 *
 * One tab stop for the grid: the selected day, or the first open one. Arrow keys walk the
 * days — left and right a sitting day, up and down a week — and Home / End the week.
 */
export function PlannerCalendar({
  month,
  onMonthChange,
  firstMonth,
  selected,
  onSelect,
  isDisabled,
  cell,
  label,
}: {
  /** Any day in the month shown. */
  month: string;
  onMonthChange: (month: string) => void;
  /** The earliest month that can be paged back to. */
  firstMonth?: string;
  selected: string | null;
  onSelect: (day: string) => void;
  isDisabled: (day: string) => boolean;
  cell: (day: string) => PlannerCell;
  /** Names the grid of days. */
  label: string;
}) {
  const shown = monthStart(month);
  const first = parseIsoDay(shown);
  const titleId = React.useId();
  const gridRef = React.useRef<HTMLDivElement>(null);

  /* Mondays from the one on or before the 1st, while the week still touches the month. */
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const inMonth = (day: string) => day.slice(0, 7) === shown.slice(0, 7);
  const weeks: string[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days = WEEKDAYS.map((_, index) => addDays(isoDay(start), week * 7 + index));
    if (days.some(inMonth)) weeks.push(days);
  }
  const open = weeks.flat().filter((day) => inMonth(day) && !isDisabled(day));
  const tabStop =
    selected && open.includes(selected) ? selected : (open[0] ?? null);

  function focusDay(day: string) {
    if (!inMonth(day)) {
      onMonthChange(day);
      requestAnimationFrame(() =>
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus(),
      );
      return;
    }
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, day: string) {
    const move: Record<string, () => string> = {
      ArrowLeft: () => stepWeekday(day, -1),
      ArrowRight: () => stepWeekday(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -((parseIsoDay(day).getDay() + 6) % 7)),
      End: () => addDays(day, 4 - ((parseIsoDay(day).getDay() + 6) % 7)),
    };
    const next = move[event.key]?.();
    if (!next) return;
    event.preventDefault();
    if (firstMonth && monthStart(next) < monthStart(firstMonth)) return;
    focusDay(next);
  }

  const canGoBack = !firstMonth || shiftMonth(shown, -1) >= monthStart(firstMonth);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 id={titleId} aria-live="polite" className="flex-1 text-body font-semibold">
          {MONTH.format(first)}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => onMonthChange(shiftMonth(shown, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(shown, 1))}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
      <div
        ref={gridRef}
        role="group"
        aria-label={label}
        aria-describedby={titleId}
        className="grid grid-cols-5 gap-1.5"
      >
        {WEEKDAYS.map((name) => (
          <span
            key={name}
            aria-hidden
            className="px-2 pb-1 text-body-compact text-muted-foreground"
          >
            {name}
          </span>
        ))}
        {weeks.flat().map((day) => {
          if (!inMonth(day)) return <span key={day} aria-hidden />;
          const disabled = isDisabled(day);
          const facts = cell(day);
          const isSelected = selected === day;
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              disabled={disabled}
              aria-pressed={disabled ? undefined : isSelected}
              aria-label={facts.label}
              tabIndex={day === tabStop ? 0 : -1}
              onClick={() => onSelect(day)}
              onKeyDown={(event) => onKeyDown(event, day)}
              className={cn(
                "relative flex min-h-16 flex-col items-start gap-0.5 rounded-lg border border-hairline bg-card p-2 text-left outline-none transition-colors sm:min-h-20",
                "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-muted-foreground disabled:hover:bg-transparent",
                isSelected && "border-primary bg-brand-muted ring-1 ring-primary hover:bg-brand-muted",
              )}
            >
              <span className="text-body font-semibold tabular-nums">
                {parseIsoDay(day).getDate()}
              </span>
              {disabled ? null : (
                <span className="text-body-compact tabular-nums text-muted-foreground">
                  {facts.body}
                </span>
              )}
              {facts.tag && !disabled ? (
                <>
                  <span
                    aria-hidden
                    className="absolute top-2 right-2 hidden rounded-full bg-brand-muted px-2 text-caption font-medium text-brand-muted-foreground lg:inline"
                  >
                    {facts.tag}
                  </span>
                  <span
                    aria-hidden
                    className="absolute top-2.5 right-2.5 size-2 rounded-full bg-brand-accent lg:hidden"
                  />
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
