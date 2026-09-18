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
  const stripRef = React.useRef<HTMLUListElement>(null);
  const shiftWeek = (delta: number, pointer: boolean) => {
    onShiftWeek(delta);
    if (pointer && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stripRef.current?.getAnimations().forEach(animation => animation.cancel());
      stripRef.current?.animate(
        [{ transform: `translateX(${delta * 24}%)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: 280, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }
  };
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

  // The greeting never gives up width to the strip: it keeps its natural size, and
  // if the two cannot share a line (the Today button appearing on a narrower board)
  // the strip drops below it whole, as on a phone, rather than squeezing the
  // greeting into three lines.
  return (
    <div className="flex flex-col items-start justify-between gap-6 lg:gap-4 @xl:flex-row @xl:flex-wrap @xl:items-center @4xl:gap-6">
      <div className="flex max-w-full min-w-0 flex-col gap-1 @xl:shrink-0">
        {/* Steps down when the board gives up width to the peek or the rail —
            a 32px greeting on a 400px board wraps to three lines. */}
        <h1 className="text-title font-semibold tracking-tight text-balance lg:text-title @xl:text-title-s @4xl:text-title">
          {fillCopy(greetingCopy(nowDate.getHours()), locale, { name: firstName })}
        </h1>
        {/* Just the date. The due count moved to the timeline's summary strip;
            the week strip's per-day dot still carries its own text equivalent
            through the tooltip and the sr-only line below. */}
        <p className="text-body text-muted-foreground lg:text-body-compact @4xl:text-body">
          {dateLine}
        </p>
      </div>

      <div className="-mx-4 grid self-stretch grid-cols-[auto_auto_1fr_auto] items-center gap-x-0 gap-y-1 min-[360px]:grid-cols-9 lg:mx-0 lg:flex lg:w-auto lg:max-w-full lg:self-auto lg:gap-1 @4xl:lg:gap-1.5">
        {/* The jump-to-date control sits with the week strip it drives, a step
            larger than the paging chevrons to match the header's scale. */}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={pick(advHome.pickDate, locale)}
              // Drawn at 32px on a phone; the ::after keeps the 40px touch target.
              className="relative col-start-4 row-start-2 mr-4 size-8 justify-self-end after:absolute after:-inset-1 lg:size-8 lg:after:hidden @4xl:lg:size-10 border border-border text-muted-foreground min-[360px]:col-start-9 lg:mr-0 lg:shrink-0 lg:border-0"
            >
              <CalendarDays aria-hidden="true" className="size-4.5 lg:size-5 @4xl:lg:size-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" collisionPadding={16} className="w-auto p-0">
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

        {/* The rule and Today run the full width and stop a fixed 8px short of the
            calendar button, so the pair sits together whatever the column width (a
            tablet's ninth column is far wider than a phone's). The band passes
            clicks through to the calendar beneath its right padding. */}
        <div className="pointer-events-none col-start-3 row-start-2 flex min-w-0 items-center gap-2 px-4 min-[360px]:col-span-9 min-[360px]:col-start-1 min-[360px]:pr-12 lg:hidden">
          <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-hairline" />
          {/* Drawn to the calendar button's height and stroke so the row keeps its
              height when this appears; the ::after keeps the 40px touch target. */}
          {awayFromToday ? (
            <Button variant="outline" size="sm" className="pointer-events-auto relative h-8 shrink-0 border-border after:absolute after:-inset-1 min-[360px]:mr-2" onClick={() => onPickDate(nowDate)}>
              {pick(advHome.today, locale)}
            </Button>
          ) : null}
        </div>

        {awayFromToday ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => onPickDate(nowDate)}
            className="hidden lg:mr-0.5 lg:inline-flex"
          >
            {pick(advHome.today, locale)}
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pick(advHome.prevWeek, locale)}
          onClick={(event) => shiftWeek(-1, event.detail > 0)}
          // Centred in its column, as the next-week arrow is, so both sit the same
          // distance from the day beside them.
          className="col-start-1 row-start-2 size-10 text-muted-foreground min-[360px]:row-start-1 min-[360px]:justify-self-center lg:size-8 @4xl:lg:size-9"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <ul ref={stripRef} className="col-span-4 col-start-1 row-start-1 flex min-w-0 gap-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[360px]:col-span-7 min-[360px]:col-start-2 lg:overflow-visible lg:w-auto lg:items-center lg:gap-0.5">
          {week.map((cell) => {
            const isSelected = cell.key === selectedDay;
            return (
              <li key={cell.key} className="min-w-0 flex-1 lg:grow-0 lg:shrink lg:basis-auto">
                {/* The dots mean by colour. The tooltip hands a sighted reader
                    the same sentence the `sr-only` line has always carried. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectDay(cell.key)}
                      className={cn(
                        "flex min-h-12 w-full min-w-10 flex-col items-center gap-0 rounded-lg py-1 lg:min-h-14 lg:gap-1 lg:py-2 transition-colors active:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-8 lg:min-w-0 @4xl:w-11",
                        // Brand tint means "today", not "selected" — a chosen day
                        // elsewhere in the week gets a neutral cue instead.
                        cell.today
                          ? "bg-brand-muted text-brand-muted-foreground"
                          : isSelected
                            ? "bg-accent-strong text-foreground"
                            : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <span className="text-caption">
                        {weekdayFmt.format(cell.at)}
                      </span>
                      <span
                        className={cn(
                          "text-body-compact tabular-nums lg:text-body",
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
          onClick={(event) => shiftWeek(1, event.detail > 0)}
          className="col-start-2 row-start-2 size-10 text-muted-foreground min-[360px]:col-start-9 min-[360px]:row-start-1 min-[360px]:justify-self-center lg:size-8 @4xl:lg:size-9"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </Button>

        {selected ? <p className="sr-only" aria-live="polite">{dayNote(selected, locale)}</p> : null}
      </div>
    </div>
  );
}
