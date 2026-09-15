"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import { pick } from "@/lib/onboarding/content";
import { dayKeyOf, type WeekCell } from "@/lib/advocate/home";
import { cn } from "@/lib/utils";

/**
 * Greeting and the week strip. The strip is the board's day control: brand tint
 * marks *today*, a chosen other day gets the quiet sunken cue — the two never
 * read alike. Chevrons page the strip a week at a time, and the calendar
 * popover jumps straight to a date, so the board is not fenced into one week.
 * Dots under a day: amber for a task consequence, grey for a listed hearing.
 */

function greetingCopy(hour: number) {
  if (hour < 12) return advHome.greetingMorning;
  if (hour < 17) return advHome.greetingAfternoon;
  return advHome.greetingEvening;
}

function mattersLine(locale: Locale, count: number): string {
  if (count === 0) return pick(advHome.mattersNone, locale);
  if (count === 1) return pick(advHome.mattersOne, locale);
  return fillCopy(advHome.mattersMany, locale, { n: String(count) });
}

/** The amber dot's referent, in words — "3 tasks due". */
function dueLine(locale: Locale, count: number): string {
  return count === 1
    ? pick(advHome.dueOne, locale)
    : fillCopy(advHome.dueMany, locale, { n: String(count) });
}

function dayNote(cell: WeekCell, locale: Locale): string {
  const parts: string[] = [];
  if (cell.hearings) parts.push(mattersLine(locale, cell.hearings));
  if (cell.due) parts.push(dueLine(locale, cell.due));
  return parts.length ? parts.join(" · ") : pick(advHome.mattersNone, locale);
}

export function HomeGreeting({
  locale,
  firstName,
  now,
  week,
  selectedDay,
  onSelectDay,
  onShiftWeek,
  onPickDate,
}: {
  locale: Locale;
  firstName: string;
  now: number;
  week: WeekCell[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
  /** Page the strip by whole weeks; ±1. */
  onShiftWeek: (delta: number) => void;
  onPickDate: (date: Date) => void;
}) {
  const nowDate = new Date(now);
  const intl = locale === "ml" ? "ml-IN" : "en-IN";
  const selected = week.find((c) => c.key === selectedDay);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // "Today" earns its place only when the view has left today — either another
  // day is selected, or the strip is paged to a week that does not hold today.
  const todayKey = dayKeyOf(now);
  const awayFromToday =
    selectedDay !== todayKey || !week.some((cell) => cell.today);
  const dateLine = new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selected?.at ?? new Date(`${selectedDay}T12:00:00`));
  const weekdayFmt = new Intl.DateTimeFormat(intl, { weekday: "short" });

  return (
    <div className="flex flex-col items-start justify-between gap-4 @xl:flex-row @xl:items-center @3xl:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        {/* Steps down when the board gives up width to the peek or the rail —
            a 32px greeting on a 400px board wraps to three lines. */}
        <h1 className="text-title font-semibold tracking-tight text-balance @xl:text-title-s @3xl:text-title">
          {fillCopy(greetingCopy(nowDate.getHours()), locale, { name: firstName })}
        </h1>
        {/* Just the date. The due count moved to the timeline's summary strip;
            the week strip's per-day dot still carries its own text equivalent
            through the tooltip and the sr-only line below. */}
        <p className="text-body-compact text-muted-foreground @3xl:text-body">
          {dateLine}
        </p>
      </div>

      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto">
        {/* The jump-to-date control sits with the week strip it drives, a step
            larger than the paging chevrons to match the header's scale. */}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={pick(advHome.pickDate, locale)}
              className="shrink-0 text-muted-foreground"
            >
              <CalendarDays aria-hidden="true" className="size-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selected?.at ?? new Date(`${selectedDay}T12:00:00`)}
              onSelect={(date) => {
                if (!date) return;
                setPickerOpen(false);
                onPickDate(date);
              }}
            />
          </PopoverContent>
        </Popover>

        {awayFromToday ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => onPickDate(nowDate)}
            className="mr-0.5"
          >
            {pick(advHome.today, locale)}
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pick(advHome.prevWeek, locale)}
          onClick={() => onShiftWeek(-1)}
          className="text-muted-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <ul className="flex items-center gap-0.5">
          {week.map((cell) => {
            const isSelected = cell.key === selectedDay;
            return (
              <li key={cell.key}>
                {/* The dots mean by colour. The tooltip hands a sighted reader
                    the same sentence the `sr-only` line has always carried. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectDay(cell.key)}
                      className={cn(
                        "flex w-8 flex-col items-center gap-1 rounded-lg py-2 transition-colors @3xl:w-11",
                        // Brand tint means "today", not "selected" — a chosen day
                        // elsewhere in the week gets a neutral cue instead.
                        cell.today
                          ? "bg-brand-muted text-brand-muted-foreground"
                          : isSelected
                            ? "bg-surface-sunken text-foreground"
                            : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <span className="text-caption">
                        {weekdayFmt.format(cell.at)}
                      </span>
                      <span
                        className={cn(
                          "text-body tabular-nums",
                          (cell.today || isSelected) && "font-semibold"
                        )}
                      >
                        {cell.at.getDate()}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1 rounded-full",
                          cell.due
                            ? "bg-warning-ink"
                            : cell.hearings
                              ? "bg-muted-foreground"
                              : "bg-transparent"
                        )}
                      />
                      <span className="sr-only">
                        {weekdayFmt.format(cell.at)} {cell.at.getDate()}
                        {cell.today ? ` (${pick(advHome.today, locale)})` : ""} —{" "}
                        {dayNote(cell, locale)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{dayNote(cell, locale)}</TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pick(advHome.nextWeek, locale)}
          onClick={() => onShiftWeek(1)}
          className="text-muted-foreground"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </Button>

      </div>
    </div>
  );
}
