"use client";

import * as React from "react";
import {
  CalendarDaysIcon,
  CalendarX2Icon,
  CircleCheckIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { OVERLAY_RISE, RESOLVE_IN_PLACE } from "@/components/chrome/motion";

import { BulkRescheduleTable } from "@/components/employee/bulk-reschedule-table";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  boardAfterMoves,
  earliestNewListing,
  filterReschedulable,
  type ReschedulableHearing,
} from "@/lib/employee/bulk-reschedule";
import {
  courtCaseStageLabel,
  courtHearingPurposeLabel,
  formatCourtDay,
  formatListingDate,
  isoDay,
  parseIsoDay,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * The day the bench is standing on is the reader's, not the server's — the same clock
 * today's cause list reads: the server renders its own guess and the browser replaces it
 * on hydration, so there is no mismatch to suppress and no blank first paint.
 */
const NEVER_CHANGES = () => () => {};
const readToday = () => isoDay(new Date());

/** What the filter controls hold. `null` on either end means "the day the court is on". */
type RangeFilters = { from: string | null; to: string | null; query: string };

const EMPTY_FILTERS: RangeFilters = { from: null, to: null, query: "" };

/** Matters this session has moved, and the day each one was moved to. */
type MovedTo = Readonly<Record<string, string>>;

/** Both ends of the span, either of which may be unasked. */
type Span = { from: string | null; to: string | null };

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * What a click on the range calendar should mean — which is not what the calendar means
 * by it.
 *
 * `react-day-picker`'s range mode treats the first day as fixed and every later click as
 * dragging the far end: from 13–25, clicking the 22nd gives 13–22, and clicking the 23rd
 * gives 13–23. There is no click that starts somewhere else. The only way back to a fresh
 * span is to land exactly on the start date, which collapses it — a move nobody finds,
 * and the reason the control read as having no way to clear and pick again (owner,
 * 2026-09-13, measured on the render before this).
 *
 * So the rule every date-range control the bench has used elsewhere follows: **a finished
 * span is finished.** The next click begins a new one on the day clicked, and the click
 * after that closes it. Widening 13–19 to 13–22 costs one extra click; being unable to
 * ask for 20–25 at all cost the whole control.
 *
 * The day clicked is not handed over, so it is read back out of what changed — the
 * calendar has already moved exactly one end, or cleared the span because the click
 * landed on its start.
 *
 * **Whether an end is being held is told, not inferred.** It used to be read off the
 * value as `from !== to`, which is true of a span half-drawn and false of a span of one
 * day — two different things wearing one shape. Ask for a single day (click it twice),
 * reopen, and click the 5th meaning only the 5th: the click was taken as the *far end*
 * of a span that was already finished, and the board got `5 Sept – 14 Sept` — ten days,
 * nine of them behind the court, on the screen that moves twenty-two matters at once.
 * The caller knows which click this is because it watched the previous one, so it says.
 */
function nextRangeFromPick(
  current: Span,
  next: DateRange | undefined,
  /** One end is down and this click is the other. */
  holding: boolean,
): Span {
  if (!next?.from) {
    /* Cleared — which the calendar only does when the click landed on the span's own
       start. A span of one day is where that click was going. */
    return { from: current.from, to: current.from };
  }

  const from = isoDay(next.from);
  const to = next.to ? isoDay(next.to) : from;

  /* One day held, second day named: this is the span being closed, so take it —
     including when both names are the same day, which is a span of one. */
  if (holding) return { from, to };

  const clicked = !next.to ? from : from !== current.from ? from : to;
  return { from: clicked, to: clicked };
}

/**
 * Bulk reschedule — moving a span of this court's board to another date in one act.
 *
 * The job is the day the bench does not sit: leave, transfer, a holiday declared late.
 * The court pulls up everything listed across a range of days and lists it again
 * somewhere else, rather than opening twenty case files.
 *
 * Composed exactly as today's cause list is (`HearingsScreen`) — the two screens are
 * siblings in the same rail group and the bench should not have to learn a second layout.
 * The page title stands on the page, and **one** lifted panel holds the filters and the
 * table together (ui-craft §4: no box inside a box). What this screen adds is a sticky
 * action bar, because the act is committed once for a list long enough to scroll away
 * from its own button.
 *
 * **Nothing is picked when the screen opens, and the date is asked for inside the act.**
 * Both are the same correction, made on the render (owner, 2026-09-13). The screen used
 * to open with the whole range checked — twenty-two matters already committed to moving
 * before the bench had said anything — and it carried a second container above the table
 * holding a date picker and an Apply button, which wrote a new date into a column the
 * table then read back. That is two acts, a worksheet between them, and a page that had
 * already answered the question it was asking. Now: the bench picks, the footer counts
 * what was picked, and the one button opens an overlay that asks for the date and
 * commits. One flow, one date, one commitment.
 *
 * **The move is a demo move.** Confirming writes the new date onto the matters for this
 * session, so the board reads back what the bench did and the flow can be walked end to
 * end. Nothing further happens: no notification is drawn up for the parties, nobody is
 * told, and a reload puts the board back. The settled stage of the overlay says so, in
 * the place it matters, rather than letting the screen imply the act is finished.
 */
export function BulkRescheduleScreen() {
  const today = React.useSyncExternalStore(NEVER_CHANGES, readToday, readToday);

  /* One state, not a draft and an applied one: the board answers the controls as they are
     used. Both ends of the range are calendars, which hand over a whole day or nothing —
     there is no half-picked date whose intermediate state would be meaningless — and the
     search is free text, so all three can apply on change and the row has one rule rather
     than two. Nothing here re-queries anything expensive: the range is a filter over
     rows already in the browser. */
  const [filters, setFilters] = React.useState<RangeFilters>(EMPTY_FILTERS);

  /**
   * What the bench has picked — held as what is *in*, and empty to start with.
   *
   * It was the inverse: a set of exclusions, so that the screen could open with
   * everything checked and widening the range would sweep new matters in. That default
   * was the defect. A court that opens this screen has a day it is not sitting, not
   * twenty-two decisions already made, and a list that arrives fully checked leaves the
   * bench unchecking its way to what it meant — the one interaction nobody can audit
   * afterwards. Storing what was chosen also means the count and the act can never
   * disagree: both read the same set, intersected with what is on screen.
   */
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const [moved, setMoved] = React.useState<MovedTo>({});

  const rows = filterReschedulable(boardAfterMoves(today, moved), filters);
  /* Derived from what is on screen, so the act can never reach a row the range has
     dropped — an id left in the set by a narrowed range simply stops counting. */
  const selectedRows = rows.filter((row) => selected.has(row.id));

  const isSearched = filters.query.trim() !== "";

  /**
   * Give the board back — the filters, and only the filters.
   *
   * It used to drop the ticks as well, which made sense when the screen opened with
   * everything already ticked and clearing meant starting over. It does not now: a
   * selection is deliberate work, a span is a lens over it, and a control labelled
   * *Clear filters* that quietly unticked twenty matters would be taking something it
   * never said it would. Rows the filters hide stop counting on their own — the act reads
   * the selection intersected with what is on screen — so there is nothing to tidy.
   *
   * Its only caller is the empty state, because each field now gives its own value back
   * (see `RangeField`) and a row button that repeats both of them is a third way to do
   * what two controls already do.
   */
  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function changeRange(from: string | null, to: string | null) {
    setFilters({ ...filters, from, to });
  }

  function toggleRow(id: string, next: boolean) {
    setSelected((current) => {
      const draft = new Set(current);
      if (next) draft.add(id);
      else draft.delete(id);
      return draft;
    });
  }

  /** The header box speaks for the rows in range, and only those. */
  function toggleAll(next: boolean) {
    setSelected((current) => {
      const draft = new Set(current);
      for (const row of rows) {
        if (next) draft.add(row.id);
        else draft.delete(row.id);
      }
      return draft;
    });
  }

  /**
   * The act, as far as this build performs it: the matters take the new date and the
   * selection is spent. Matters already listed on that day are not passed in — they were
   * never a move, and the overlay has already said so.
   */
  function reschedule(day: string, moving: ReschedulableHearing[]) {
    setMoved((current) => {
      const next = { ...current };
      for (const row of moving) next[row.id] = day;
      return next;
    });
    setSelected(new Set());
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          Bulk reschedule hearings
        </h1>
      </header>

      {/* One panel: the range and the list are one unit of work, so they share one lifted
          sheet — the same recipe and the same `gap-6` / `p-6` today's cause list uses.
          Nothing inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <RangeFilters
          filters={filters}
          onQueryChange={(query) => setFilters({ ...filters, query })}
          onRangeChange={changeRange}
        />

        {/* Mounted whatever the board is doing, including empty — see `QueueAnnouncer`.
            This screen paginates nothing, so the whole range is what is showing. */}
        <QueueAnnouncer from={1} to={rows.length} total={rows.length} />

        {rows.length === 0 ? (
          <NothingToMove
            range={filters}
            isSearched={isSearched}
            onClear={clearFilters}
          />
        ) : (
          /* min-w-0 lets this flex item shrink below the table's content width, so a
             wide table scrolls inside the panel instead of pushing the page sideways. */
          <div className="min-w-0 overflow-x-auto">
            {/* Six columns do not survive a phone. Below `md` the same rows stack as
                items — today's cause list's own answer. */}
            <div className="hidden md:block">
              <BulkRescheduleTable
                rows={rows}
                selected={selected}
                onToggle={toggleRow}
                onToggleAll={toggleAll}
              />
            </div>
            <div className="md:hidden">
              <RescheduleItemList
                rows={rows}
                selected={selected}
                onToggle={toggleRow}
              />
            </div>
          </div>
        )}
      </section>

      {/* Mounted whatever the board is holding, including nothing. It used to be gated on
          the board having rows, which is fine until the act empties the board — moving
          everything in range to a date outside it does exactly that — and the overlay
          reporting what just happened went down with the bar it was mounted in. Chrome
          does not vanish from the layout (ui-craft §2). */}
      <CommitBar
        selected={selectedRows}
        total={rows.length}
        today={today}
        range={filters}
        onReschedule={reschedule}
      />
    </div>
  );
}

/**
 * Which days to pull in, and what to look for inside them.
 *
 * Laid out the way today's cause list lays out its filters, and labelled the same way:
 * every control carries a visible label, because the reference labels none of them and
 * the accessibility floor treats a placeholder as a hint rather than a label
 * (ACCESSIBILITY §12).
 *
 * Every control applies as it is used, and the Search button is gone. It had been
 * argued for on the grounds that a range is composed before it is asked for — but a
 * calendar hands over a whole day or nothing, so there was never a half-formed range to
 * protect, and the filter only narrows rows the browser already holds. Nothing is
 * re-queried and nothing is committed: moving the board is the act at the bottom of the
 * page, behind its own overlay, and it is untouched.
 *
 * A reference the owner brought on 2026-09-14 offered named spans (`Last 7 days`) and an
 * **Apply Custom Filter** button beside them. Neither is here. The spans were built, put
 * beside the field, then moved inside the picker, then dropped — the calendar is the one
 * question this filter asks and it turned out not to want a second way of answering it
 * (owner, across 2026-09-14). The Apply never came across at all: this screen had one, a
 * date picker and an Apply above the table, and it was taken out on 2026-09-13 as "two
 * acts, a worksheet between them".
 *
 * Removing it also spends the screen's teal properly. This page used to paint two strong
 * fills — Search here and Reschedule in the commit bar — on a reading of the Ration Teal
 * Law that rations per visual region. With Search gone the page has one, and it is the
 * one that moves twenty listings.
 */
function RangeFilters({
  filters,
  onQueryChange,
  onRangeChange,
}: {
  filters: RangeFilters;
  onQueryChange: (query: string) => void;
  onRangeChange: (from: string | null, to: string | null) => void;
}) {
  return (
    /* Two fields, each a label over one control — the shape today's cause list uses,
       so the bottoms line up. */
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <RangeField
        id="reschedule-range"
        label="Hearing dates"
        range={filters}
        onChange={onRangeChange}
        className="sm:w-72"
      />

      <QueueSearchField
        label="Search cases"
        className="sm:w-64"
        value={filters.query}
        onChange={onQueryChange}
        placeholder="Case name or number"
      />
    </form>
  );
}

/**
 * The span of days the board is showing — **one control that says it is a range**.
 *
 * It was two fields once: `Listed from` and `Listed until`, each its own single-date
 * picker. They were read on the render as two unrelated date fields rather than as the
 * two ends of one thing — *"it was not apparent that this is a date range selector"*
 * (stakeholder, via the owner, 2026-09-13). Two adjacent controls can only ever be a
 * range by convention; one control whose value is a span says so before it is read.
 *
 * **Composed from `Popover` and `Calendar` rather than taken from `DateRangePicker`,
 * and that is a deliberate step away from the primitive.**
 *
 * It began as the only way to put a row of named spans inside the picker rather than
 * beside it (owner, 2026-09-14). The spans were then dropped — the calendar is the one
 * question this filter asks, and it did not want a second way of answering it — but the
 * composition stays, because what it actually bought was §19 itself.
 *
 * `DateRangePicker` renders its own `Popover` and its own `Calendar`, takes no
 * `children`, spreads its `className` onto the trigger `Button`, and portals its content
 * to `document.body`. So a screen using it cannot reach the calendar inside it, in props
 * or in CSS, and three of the four defects filed against it are unreachable from here —
 * which is the whole of `ds-requests` 19. Owning the popover fixes all three rather than
 * working around them:
 *
 * - **(a)** `showOutsideDays={false}`. Two adjacent months draw each other's edge days,
 *   so September's trailing cells and October's leading cells were the same dates drawn
 *   twice and lit twice — one span painting two ends.
 * - **(c)** the calendar dismisses when the span closes. The primitive leaves it standing
 *   over the page after the one decision it exists for.
 * - **(e)** the `×` no longer costs the calendar. It sits outside the portalled content,
 *   so Radix's dismissable layer read the press as an outside click and closed the
 *   popover the bench was still using; with `open` held here, clearing clears and nothing
 *   else moves.
 *
 * **A one-day span is held as `to: undefined`.** That is what draws a single date rather
 * than the same day written twice with a dash between it, and it is the state the
 * calendar wants when the next click is going to set the other end. The board still reads
 * it as `from = to`: a court sitting on one day is a range of one, not an unfinished
 * question. What a click does to a span already finished is decided in
 * `nextRangeFromPick`, not by the calendar.
 *
 * **The span is given back from the `×` on the field**, the way the search box beside it
 * gives its text back, and it appears only once there is a span to clear (owner,
 * 2026-09-13). `Clear filters` drops the search and the span together and is the empty
 * state's business; a field's own clear takes only what the field holds.
 *
 * The width is the caller's, and the id prefixes the label element it owns.
 */
function RangeField({
  id,
  label,
  range,
  onChange,
  className,
}: {
  id: string;
  label: string;
  range: Span;
  onChange: (from: string | null, to: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  /* One end is down and the calendar is waiting for the other. Held here rather than
     read off the value, because a span of one day and a span half-drawn are the same
     value — see `nextRangeFromPick`. True only between two clicks on the calendar:
     closing the surface abandons a half-drawn span rather than leaving it armed for the
     next time it opens. */
  const [holding, setHolding] = React.useState(false);
  const held = range.from !== null;

  /* Undefined, not an empty `DateRange`: the calendar is handed the value directly here
     rather than through `DateRangePicker`, whose `value === undefined` meant "this
     control is uncontrolled" and made clearing impossible (`ds-requests` 19(b)). Nothing
     falls back to a remembered value any more, so the plain absence is the honest shape
     and the workaround it needed is gone with the primitive. */
  const selected: DateRange | undefined =
    range.from === null
      ? undefined
      : {
          from: parseIsoDay(range.from),
          to:
            range.to === null || range.from === range.to
              ? undefined
              : parseIsoDay(range.to),
        };

  /* The same words the table's own date column uses, so the field and the rows it
     filters cannot describe one day two ways. */
  const value = !held
    ? "Select date range"
    : range.to === null || range.from === range.to
      ? formatListingDate(range.from as string)
      : `${formatListingDate(range.from as string)} – ${formatListingDate(range.to)}`;

  function pick(next: DateRange | undefined) {
    const picked = nextRangeFromPick(range, next, holding);
    onChange(picked.from, picked.to);
    /* The second click closes the span, whichever day it landed on — a different day
       makes a range, the held day again makes a span of one — and closing the span is
       the decision this surface exists for, so it stands down on it (§19c). A first
       click is not that: it puts one end down and waits. */
    setHolding(!holding);
    if (holding) setOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* A real `label`, not a `span`: a `button` is a labelable element, so this both
          names the trigger and opens it when pressed — which is what the search field
          40px to the right already does with its own label, and what a bench that
          clicks the words expects. The `aria-labelledby` on the trigger stays, because
          the accessible name wants the span as well as the field's name. */}
      <label
        id={`${id}-label`}
        htmlFor={`${id}-trigger`}
        data-range-part={id}
        className="w-fit text-body font-medium"
      >
        {label}
      </label>
      <div className={cn("relative w-full min-w-0", className)}>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            /* A half-drawn span does not survive the surface closing. Escaping out of
               one and reopening would otherwise take the first click as its far end. */
            if (!next) setHolding(false);
          }}
        >
          <PopoverTrigger asChild>
            {/* Named by the visible label *and* by its own content, the way a combobox
                is: "Hearing dates, 14 Sept 2026 – 20 Sept 2026". The label alone would
                drop the span; the content alone would drop what the span is of. */}
            <Button
              id={`${id}-trigger`}
              variant="outline"
              aria-labelledby={`${id}-label ${id}-trigger`}
              className={cn(
                "w-full justify-start gap-2 text-left font-normal",
                !held && "text-muted-foreground",
                held && "pr-12",
              )}
            >
              <CalendarDaysIcon data-icon="inline-start" aria-hidden />
              <span className="truncate">{value}</span>
            </Button>
          </PopoverTrigger>

          {/* Sized by what it holds rather than the popover's own `w-72` — but never
              wider than the room it has.

              A two-month calendar has a floor it cannot shrink past: the months stack
              into one column below `md`, which is enough at a phone's default text size,
              and is not once the text grows. Measured at 200% on a 375px viewport, the
              calendar alone wants 424px. Radix's popper hard-sets `min-width:
              max-content` on its wrapper, so without a ceiling the surface simply takes
              that width and hangs off the screen — and because a popover is
              `position: fixed`, there is no page scroll to go and get it
              (ACCESSIBILITY §10, RESPONSIVE.md 9).

              Radix's own available-width variable is that ceiling, and it is the reason
              this does not reproduce here while it still does under `DateRangePicker`,
              which sets no max width at all. `collisionPadding` keeps the surface off
              the viewport edge rather than flush against it. */}
          <PopoverContent
            align="start"
            collisionPadding={16}
            className="w-auto max-w-(--radix-popover-content-available-width) gap-0 p-0"
            /* **This field's own parts are not outside clicks.** The label and the
               `×` both sit outside the portalled content in the DOM — the `×` laid
               over the trigger's padding, the label above it — so Radix's dismissable
               layer dismisses on both. Radix excludes the trigger itself
               (`targetIsTrigger`) and nothing else, which is how clearing used to cost
               the calendar (`ds-requests` 19(e)), and it is why a plain `label` would
               close the surface on pointer-down and then reopen it when the browser
               forwarded the click on to the button — a flicker that can never be shut.

               Refusing the dismiss for both fixes both: the `×` clears and the surface
               the bench is still reading stays put; the label's forwarded click reaches
               the trigger with the popover still open, so it toggles shut the way
               pressing the trigger does. Marked per field — a bare attribute would let a
               second range field suppress this one's legitimate dismiss. Covers focus as
               well as pointer, because pressing either does both. */
            onInteractOutside={(event) => {
              const target = event.detail.originalEvent.target;
              if (
                target instanceof Element &&
                target.closest(`[data-range-part="${id}"]`)
              ) {
                event.preventDefault();
              }
            }}
          >
            <Calendar
              mode="range"
              numberOfMonths={2}
              /* §19a: two adjacent months otherwise draw each other's edge days, so
                   the same date appears in both panels and lights twice. Measured on
                   the render with 13 Sept – 2 Oct: no date now appears more than once. */
              showOutsideDays={false}
              selected={selected}
              onSelect={pick}
              /* Opening the surface puts the reader on a day, not on the chevron that
                 happens to come first in it. Radix focuses the first tabbable in the
                 content, which without this is *Previous month* — so a keyboard user
                 arrived one control short of the only question here. */
              autoFocus
            />
          </PopoverContent>
        </Popover>

        {held ? (
          /* **The same mark as the search box's clear, one control to the right.** It
             was drawn a third smaller and went unfound: `Button size="icon-xs"` shrinks
             its glyph to 12px, where the design system's own field-clear
             (`InputGroupButton`) draws 16px — so two controls doing the identical job in
             one row disagreed about how big that job looks (owner, 2026-09-13; measured
             at 12px against the search box's 16px). A size class on the icon is the
             sanctioned way out, because the size-setting selector steps aside for an svg
             that carries its own.

             Muted at rest, foreground on hover, matching the sibling again: a clear does
             not compete with the value it sits beside until the pointer is on it.

             The button is 32px drawn, under the 40×40 floor on its own, so it carries the
             same transparent `after:` inset the search box's clear uses to take the hit
             area back without changing what is drawn (ACCESSIBILITY §8). */
          <Button
            type="button"
            data-range-part={id}
            variant="ghost"
            size="icon-xs"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onChange(null, null);
              setHolding(false);
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground after:absolute after:-inset-2 after:content-['']"
          >
            <XIcon aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Why there is nothing to move, and what to do about it.
 *
 * Two different facts, so two different states: a span the court has nothing listed in is
 * not the same as a search that matched nothing, and only the second has an action worth
 * offering. Borderless and unpadded — the panel around it is already the frame.
 */
function NothingToMove({
  range,
  isSearched,
  onClear,
}: {
  range: Span;
  isSearched: boolean;
  onClear: () => void;
}) {
  /* With no span asked for, the board is everything this court has listed — so there is
     no window to name and the sentence does without one. */
  const span =
    range.from === null
      ? ""
      : range.from === range.to || range.to === null
        ? ` on ${formatCourtDay(range.from)}`
        : ` between ${formatCourtDay(range.from)} and ${formatCourtDay(range.to)}`;

  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isSearched ? (
            <SearchXIcon aria-hidden />
          ) : (
            <CalendarX2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isSearched ? "No matters match this search" : "Nothing to move"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isSearched
            ? `No matter listed${span} matches the case name or number you asked for.`
            : `This court has nothing listed${span} that it could move.`}
        </EmptyDescription>
      </EmptyHeader>
      {isSearched ? (
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
 * A board read on a phone is still the cause, its number and the day it stands listed on.
 * The columns that only support scanning (stage, hearing type) drop to a caption line
 * rather than forcing a six-column table through a 375px screen.
 */
function RescheduleItemList({
  rows,
  selected,
  onToggle,
}: {
  rows: ReschedulableHearing[];
  selected: ReadonlySet<string>;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const isSelected = selected.has(row.id);

        return (
          <li
            key={row.id}
            className={cn(
              "flex gap-3 rounded-lg border border-hairline p-4 transition-colors",
              isSelected ? "bg-accent-strong" : "bg-surface-sunken",
            )}
          >
            {/* The design system's box expands its own hit area to 40×40; the name it
                carries is the matter, not the column, because a row read aloud has no
                column header. */}
            <span className="pt-0.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(next) => onToggle(row.id, next === true)}
                aria-label={`Select ${row.title}, ${row.caseNumber}`}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-body-compact font-medium">{row.title}</p>
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">{row.caseNumber}</span> ·{" "}
                {courtCaseStageLabel(row.stage)} ·{" "}
                {courtHearingPurposeLabel(row.purpose)}
              </p>
              <p className="text-body-compact tabular-nums text-muted-foreground">
                {formatListingDate(row.date)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What is picked, and the act itself.
 *
 * Sticky, because the list it commits is longer than a screen and a button that scrolls
 * away from its own selection is a button the bench has to hunt for. Chrome, so it is
 * `bg-card` over a hairline seam and never carries the panel's full-strength edge
 * (ui-craft §4, layer 2); the negative margins let it span the page's own padding.
 *
 * `z-30` is the chrome layer this app already uses — the top bar and the filing footer
 * both sit there — so the bar is never painted over by rows scrolling under it.
 *
 * The count beside the button is `aria-live`, so a screen reader hears the selection
 * change without going looking for the number, and the button carries the same count in
 * its own label once there is one: a button that says what pressing it will do needs no
 * sentence beside it, and a button that says "Reschedule hearings" over an empty
 * selection would be promising an act it cannot perform, which is why it is off.
 */
function CommitBar({
  selected,
  total,
  today,
  range,
  onReschedule,
}: {
  selected: ReschedulableHearing[];
  total: number;
  today: string;
  range: Span;
  onReschedule: (day: string, moving: ReschedulableHearing[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const summaryRef = React.useRef<HTMLParagraphElement>(null);
  const count = selected.length;

  return (
    <div className="sticky bottom-0 z-30 -mx-6 -mb-6 border-t border-hairline bg-card px-6 py-3 md:-mx-8 md:-mb-8 md:px-8 md:py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          ref={summaryRef}
          tabIndex={-1}
          className="mr-auto text-body-compact text-muted-foreground tabular-nums outline-none"
          aria-live="polite"
        >
          {total === 0
            ? "Nothing listed in this range."
            : count === 0
              ? "Select the matters to move."
              : `${count} of ${total} ${plural(total, "matter", "matters")} selected`}
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={count === 0} className="w-full sm:w-fit">
              {count > 0
                ? `Reschedule ${count} ${plural(count, "hearing", "hearings")}`
                : "Reschedule hearings"}
            </Button>
          </DialogTrigger>
          {/* Mounted only while it is open, so every session starts on the first stage
              with no date held over from the last one. */}
          {open ? (
            <RescheduleOverlay
              rows={selected}
              today={today}
              range={range}
              onReschedule={onReschedule}
              onReturnFocus={() => summaryRef.current?.focus()}
            />
          ) : null}
        </Dialog>
      </div>
    </div>
  );
}

/** What the act did, kept by the overlay so its last stage survives the spent selection. */
type Outcome = { day: string; moved: number };

/**
 * The act: how many are moving, what date they move to, and the commitment.
 *
 * **One overlay, two stages, no dialog on a dialog** (ui-craft §7). Asking for the date
 * and reporting what happened are stages of the same window; the second resolves in place
 * rather than sliding, because the bench is looking at the thing that changed.
 *
 * **The calendar is composed here rather than hidden behind a picker trigger.** Three
 * things fall out of that, and each was a defect on the version this replaces. A day
 * already past can be refused by the control instead of by a sentence after the fact —
 * `DatePicker` takes no matcher, so the screen used to catch a past date and complain
 * about it. The date is written out by the court's own registers (`formatCourtDay`)
 * rather than by the picker's fixed `en-US` trigger, which disagreed with every other
 * date on the page. And a stage whose whole question is "which day" should not open a
 * second layer to ask it.
 */
function RescheduleOverlay({
  rows,
  today,
  range,
  onReschedule,
  onReturnFocus,
}: {
  rows: ReschedulableHearing[];
  today: string;
  /** The span the board is holding — read only, and only to floor the calendar. */
  range: Span;
  onReschedule: (day: string, moving: ReschedulableHearing[]) => void;
  onReturnFocus: () => void;
}) {
  const [day, setDay] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  const count = rows.length;
  /* The days the calendar will not offer — the span the bench asked the board for, and
     everything in it. See `earliestNewListing`. */
  const earliestNewDay = earliestNewListing(rows, range.to, today);

  /* Focus follows the stage: the title is the line that rewrites itself, so it is what
     announces the outcome. */
  React.useEffect(() => {
    if (outcome) titleRef.current?.focus();
  }, [outcome]);

  return (
    <ChromeDialogContent
      className={cn(
        "flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
        OVERLAY_RISE,
      )}
      /* The question, not the first control the overlay happens to contain — which is
         the calendar's previous-month arrow, and a ring around that on open reads as a
         starting point the bench does not have. */
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        titleRef.current?.focus();
      }}
      /* Cancelling leaves the trigger standing, so the primitive's own restore is right.
         Committing spends the selection and turns that button off, so focus would drop
         to the body with nothing to say — it goes to the count instead, which is the
         line that just changed. */
      onCloseAutoFocus={(event) => {
        if (!outcome) return;
        event.preventDefault();
        onReturnFocus();
      }}
    >
      <DialogHeader className="shrink-0 gap-2 border-b border-hairline p-6 pr-16">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-title-s font-semibold outline-none"
        >
          {outcome
            ? `${outcome.moved} ${plural(outcome.moved, "hearing", "hearings")} rescheduled`
            : `Reschedule ${count} ${plural(count, "hearing", "hearings")}`}
        </DialogTitle>
        {/* What the overlay does, not a fact the board has already given. It carried an
            empty-selection pair until the span control left the card — nothing inside the
            overlay can empty the selection any more, and the button that opens it is off
            at nothing, so the branch was unreachable copy telling the bench to change
            dates it can no longer reach from here. On the settled stage this is the one
            line that reports the act. */}
        <DialogDescription className="text-body-compact text-muted-foreground">
          {outcome
            ? `Now listed on ${formatCourtDay(outcome.day)}.`
            : "Everything selected moves to one new date."}
        </DialogDescription>
      </DialogHeader>

      {/* The stage: a tinted canvas under a white card, with the chrome above and below
          it left white so the tint reads as the surface the work sits on rather than as a
          grey dialog (ui-craft §1.0). Dark keeps `bg-background`, because `muted` is the
          raised step there and would invert the depth. */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted p-4 sm:p-6 dark:bg-background">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
          {outcome ? (
            <Settled outcome={outcome} />
          ) : (
            <PickDay day={day} onDayChange={setDay} earliest={earliestNewDay} />
          )}
        </div>
      </div>

      {/* Chrome too, so it is `bg-card` rather than the primitive's muted fill — under a
          muted stage the two would merge into one grey band. */}
      <DialogFooter className="mx-0 mb-0 shrink-0 border-hairline bg-card">
        {outcome ? (
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Done
            </Button>
          </DialogClose>
        ) : (
          <>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            {/* Off until a day is held. Nothing else can be wrong with it: the calendar
                offers no day that any of these matters is already on or past. */}
            <Button
              type="button"
              disabled={day === null}
              onClick={() => {
                if (day === null) return;
                onReschedule(day, rows);
                setOutcome({ day, moved: rows.length });
              }}
            >
              Reschedule hearings
            </Button>
          </>
        )}
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/**
 * The one question the overlay exists to ask.
 *
 * A white card on the tinted stage, holding a labelled calendar and nothing else.
 *
 * It held two more lines and both have gone. A hint reading "Pick the day these matters
 * move to" sat directly under a label reading "New hearing date", which is the same
 * instruction twice and the second one in the weaker voice. And a line confirming that
 * *n* matters move to the day just picked restated the count in the title against the day
 * already lit in the grid — a sentence the reader could have written themselves.
 *
 * A third line went the same way. It reported that part of the selection was already
 * listed on the day chosen, so the act was smaller than the title said — a sentence that
 * only existed because the calendar was offering a day it should never have offered. The
 * floor under the calendar (`earliest`) removes the case instead of narrating it.
 *
 * **One question, and only one.** The span being moved was briefly a second control here,
 * so the bench could correct it without cancelling. It came out again on the render: the
 * overlay is opened *after* the board has been narrowed and the matters ticked, so a
 * second date control beside the first — one naming days being left, one naming the day
 * being chosen — read as two questions where the flow has one (owner, 2026-09-13). The
 * span belongs to the board, and the board is where it is set.
 */
function PickDay({
  day,
  onDayChange,
  earliest,
}: {
  day: string | null;
  onDayChange: (day: string) => void;
  /**
   * The first day the act can land on — the day after the span the board is showing.
   * Everything before it is drawn but refused, which is the point: the bench sees the
   * days it asked for, greyed, and the choice begins where they end.
   */
  earliest: string;
}) {
  return (
    <Card size="sm" className="border-hairline px-4 shadow-raised">
      <div className="flex flex-col gap-3">
        <span id="reschedule-day-label" className="text-body font-medium">
          New hearing date
        </span>
        {/* A 40px grid is wider than a phone-width dialog's card once three paddings have
            been taken out of 375px, and the week clipped its last column on the render.
            The calendar reaches back into the card's own gutter rather than shrinking its
            cells below the control height or making the card's text cramped — only the
            grid moves, and only where it has to. */}
        <div
          role="group"
          aria-labelledby="reschedule-day-label"
          className="-mx-3 sm:mx-0"
        >
          <Calendar
            mode="single"
            /* The one variable the primitive exposes for this, and the reason to reach
               for it: the design system's calendar draws 28px day cells, which is fine
               under a picker trigger and below the 40×40 floor the same system sets for
               anything a finger has to hit (ACCESSIBILITY §8). Here the calendar is not a
               detail inside a field — it is the question the overlay was opened to ask —
               so the cell takes the control height every other control on the screen
               has. Logged upstream; nothing is forked to do it. */
            className="mx-auto [--cell-size:--spacing(10)]"
            selected={day ? parseIsoDay(day) : undefined}
            /* Opens where the choice is, not where the work was — a month whose days are
               all refused is a month nobody needs to look at. */
            defaultMonth={parseIsoDay(earliest)}
            /* Every day up to the end of the span is refused: a day already gone, a day
               one of these matters is already on, and a day inside the span the bench
               just drew are all the same wrong answer, and the control gives none of them
               rather than explaining afterwards. */
            disabled={{ before: parseIsoDay(earliest) }}
            startMonth={parseIsoDay(earliest)}
            onSelect={(next) => {
              if (next) onDayChange(isoDay(next));
            }}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * What the act did — the same card, settled.
 *
 * It fades and lifts a few pixels in place rather than sliding a new scene in: the bench
 * is looking at the thing that changed, and a window that slides after a button press
 * reads as somewhere else having opened (ui-craft §8).
 *
 * The last line is the half of the truth the screen would otherwise be implying. Moving a
 * day's board is communicated to the parties by a notification the court draws up — the
 * register carries the type — and this build draws none.
 */
function Settled({ outcome }: { outcome: Outcome }) {
  return (
    <Card
      size="sm"
      className={cn("border-hairline px-4 shadow-raised", RESOLVE_IN_PLACE)}
    >
      <div className="flex items-center gap-2 rounded-md bg-success-muted px-3 py-2 text-body-compact text-success-muted-foreground">
        <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
        <span role="status" className="font-medium">
          Rescheduled
        </span>
      </div>

      <p className="text-body text-pretty">
        {outcome.moved} {plural(outcome.moved, "matter", "matters")} now{" "}
        {plural(outcome.moved, "stands", "stand")} listed on{" "}
        <span className="font-medium tabular-nums">
          {formatCourtDay(outcome.day)}
        </span>
        .
      </p>

      <p className="text-caption text-muted-foreground">
        No notification has gone to the parties yet.
      </p>
    </Card>
  );
}
