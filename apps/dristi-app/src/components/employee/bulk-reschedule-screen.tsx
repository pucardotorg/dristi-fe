"use client";

import * as React from "react";
import {
  CalendarCheck2Icon,
  CalendarDaysIcon,
  CalendarX2Icon,
  CheckIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { OVERLAY_RISE, RESOLVE_IN_PLACE } from "@/components/chrome/motion";

import { BulkRescheduleTable } from "@/components/employee/bulk-reschedule-table";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { DateRange } from "react-day-picker";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  boardAfterMoves,
  earliestNewListing,
  filterReschedulable,
  groupByNewListing,
  type ReschedulableHearing,
  type RescheduledGroup,
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
 * **The move is a demo move, and the board shows it.** Confirming writes the new date
 * onto the matters for this session, and the rows stay on the board they were picked out
 * of, now carrying both ends of the change — the day each was listed on, and the day it
 * goes to. That is the whole of the feedback for an act that touches twenty matters at
 * once, so it belongs on the thing that was acted on rather than only in the overlay that
 * closes over it. Nothing further happens: no notification is drawn up for the parties, nobody is
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

  /**
   * Which board is on screen.
   *
   * **Unscheduled is the default and the work; Scheduled is the receipt** (owner,
   * 2026-09-15). The board used to be one list with the moved matters sorted back into
   * it wearing an extra column, which made the bench read a whole range to find the four
   * rows it had just acted on — and put a New hearing date column over twenty matters
   * that had no new hearing date. Splitting them lets each list be about one thing: what
   * is still to move, and what moved.
   */
  const [tab, setTab] = React.useState<"unscheduled" | "scheduled">(
    "unscheduled",
  );

  /**
   * Which days on the record are open — **empty to start with, and after an act.**
   *
   * The resting state of this record is every day shut, so the tab lands on the dates
   * themselves rather than on one day's rows (owner, 2026-09-16). Nothing opens a day but
   * the bench, including the act that created it: the overlay has just said in as many
   * words how many matters went where, and the day arrives on the stack carrying its own
   * count.
   *
   * Held here rather than inside the record so that it survives a trip to the other tab
   * and back, which unmounts that pane. A bench that opened October and went to find more
   * matters should not come back to October shut.
   */
  const [openDays, setOpenDays] = React.useState<string[]>([]);

  const board = boardAfterMoves(today, moved);

  /**
   * The two lists, split by the one fact that tells them apart — and **only one of them
   * answers to the filters.**
   *
   * The range and the search are a lens for finding matters to move, so they narrow the
   * board being worked and nothing else. The record is what this session did, and work
   * already done cannot be un-done by narrowing a lens: move three matters to the 17th,
   * then set the range to the fortnight after to find the next eight, and the Scheduled
   * tab used to read zero — the court's own afternoon, gone, because a filter meant for
   * the other list reached it (owner, 2026-09-15).
   *
   * The controls sit above the tab strip, where they read as this panel's, and that is
   * where the owner wants them. They were briefly moved inside the Unscheduled pane so
   * that their scope would be structural rather than a rule — and it cost more than it
   * bought, because switching to Scheduled then took a row of controls off the page and
   * the tabs jumped up under the pointer (owner, 2026-09-15). Chrome does not move when
   * the content under it changes (ui-craft §2). So the scope is this one line below
   * instead: only `unscheduled` is filtered.
   */
  const unscheduled = filterReschedulable(board, filters).filter(
    (row) => row.newDate === undefined,
  );
  const scheduled = board.filter((row) => row.newDate !== undefined);
  const rescheduledDays = groupByNewListing(scheduled);

  /**
   * How much of the record is showing, for the live region below — which has to be
   * mounted in every state, including the one with no record at all, so it needs the
   * count without the record being on screen to give it.
   *
   * A single date has no disclosure and its cases are always showing; a stack shows the
   * rows of whichever days are open, and none to begin with.
   */
  const showingRows =
    rescheduledDays.length === 1
      ? rescheduledDays[0].rows.length
      : rescheduledDays
          .filter((group) => openDays.includes(group.day))
          .reduce((count, group) => count + group.rows.length, 0);

  /* Derived from what is on screen, so the act can never reach a row the range has
     dropped — an id left in the set by a narrowed range simply stops counting, and a row
     that has just moved to the other tab stops counting with it. */
  const selectedRows = unscheduled.filter((row) => selected.has(row.id));

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

  /** The header box speaks for the unscheduled rows in range, and only those. */
  function toggleAll(next: boolean) {
    setSelected((current) => {
      const draft = new Set(current);
      for (const row of unscheduled) {
        if (next) draft.add(row.id);
        else draft.delete(row.id);
      }
      return draft;
    });
  }

  /**
   * The act, as far as this build performs it: the matters take the new date and the
   * selection is spent.
   *
   * It says nothing. The overlay reports what happened on its own confirmation — the
   * product's success panel, the one the advocate submission and every court-side signing
   * queue end on — and the board behind it carries the durable half in the Current / New
   * hearing date pair. A toast here was a third report nobody asked for.
   */
  function reschedule(day: string, moving: ReschedulableHearing[]) {
    setMoved((current) => {
      const next = { ...current };
      for (const row of moving) next[row.id] = day;
      return next;
    });
    setSelected(new Set());
  }

  /**
   * Follow the matters to the tab they are now on — **once the overlay has gone**.
   *
   * Not at the moment of the act, which is where this started and where it does not
   * work: the commit bar belongs to the Unscheduled tab, the overlay is mounted inside
   * it, and switching tabs mid-act therefore unmounts the bar, the dialog and the
   * confirmation the bench had not read yet. Caught on the render — the success panel
   * flashed and vanished.
   *
   * So the move happens on the way out, when the bench presses Done: it reads what
   * happened, dismisses it, and lands on the record of it. Which is the answer to "where
   * did those twenty rows go", given before it has to be asked.
   */
  function finish() {
    setTab("scheduled");
    /* And give the span back. It was drawn to find the matters that have just gone, so
       leaving it on the field means the next move starts inside a window that has already
       been dealt with — and the board behind it reads as if the court had nothing listed
       (owner, 2026-09-15). The search text is the bench's own words and is left alone. */
    setFilters((current) => ({ ...current, from: null, to: null }));
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
      {/* `grow`, not `flex-1`: the panel fills the page it is the only thing on, so a
          record of two collapsed dates does not stop a third of the way down a screen with
          nothing under it (owner, 2026-09-16). `flex-1` would also let it *shrink*, and a
          board of forty rows would be squashed into the viewport instead of scrolling the
          page. The content stays top-aligned, so what grows is the sheet, not the gaps
          inside it. */}
      <section className="flex min-w-0 grow flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <RangeFilters
          filters={filters}
          onQueryChange={(query) => setFilters({ ...filters, query })}
          onRangeChange={changeRange}
        />

        <Tabs
          value={tab}
          onValueChange={(value) =>
            setTab(value as "unscheduled" | "scheduled")
          }
          className="flex min-w-0 flex-col gap-6"
        >
          {/* Line `TabsList`, not the pill track — the same composition the process queue
              uses for the same job, down to the `after:-bottom-px` that sits the mark on
              the gutter's own rule instead of floating a second line above it. Two labels
              fit a phone, but the row scrolls rather than crushing them (RESPONSIVE). */}
          <div className="overflow-x-auto border-b border-hairline">
            <TabsList
              variant="line"
              aria-label="Which matters to show"
              className="h-10 w-max min-w-full justify-start rounded-none p-0 group-data-horizontal/tabs:h-10"
            >
              {(
                [
                  ["unscheduled", "Unscheduled", unscheduled.length],
                  ["scheduled", "Scheduled", scheduled.length],
                ] as const
              ).map(([value, label, count]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-10 flex-none gap-2 px-3 text-body group-data-horizontal/tabs:after:-bottom-px"
                >
                  {label}
                  {/* How much is standing here, inheriting the trigger's colour so the
                      count and its label read as one thing rather than as a badge stuck
                      to a tab (ui-craft §2). */}
                  <span className="font-normal tabular-nums">{count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="unscheduled" className="min-w-0 outline-none">
            {/* Mounted whatever the board is doing, including empty — see
                `QueueAnnouncer`. This screen paginates nothing, so the whole range is
                what is showing. One per tab, because switching tabs changes the answer
                and the inactive pane is unmounted. */}
            <QueueAnnouncer
              from={1}
              to={unscheduled.length}
              total={unscheduled.length}
            />

            {unscheduled.length === 0 ? (
              <NothingToMove
                range={filters}
                isSearched={isSearched}
                everythingMoved={scheduled.length > 0}
                onClear={clearFilters}
              />
            ) : (
              /* min-w-0 lets this flex item shrink below the table's content width, so a
                 wide table scrolls inside the panel instead of pushing the page
                 sideways. */
              <div className="min-w-0 overflow-x-auto">
                {/* Six columns do not survive a phone. Below `md` the same rows stack as
                    items — today's cause list's own answer. */}
                <div className="hidden md:block">
                  <BulkRescheduleTable
                    rows={unscheduled}
                    selection={{
                      selected,
                      onToggle: toggleRow,
                      onToggleAll: toggleAll,
                    }}
                  />
                </div>
                <div className="md:hidden">
                  <RescheduleItemList
                    rows={unscheduled}
                    selection={{ selected, onToggle: toggleRow }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="scheduled"
            className="flex min-w-0 flex-col gap-4 outline-none"
          >
            {/* Mounted whatever the record holds, including nothing — a live region has
                to be in the DOM before the change to be read out at all
                (`QueueAnnouncer`). What is on screen is one day of the record, not the
                tab's total. */}
            <QueueAnnouncer from={1} to={showingRows} total={showingRows} />

            {rescheduledDays.length === 0 ? (
              <NothingRescheduled />
            ) : (
              <RescheduledRecord
                groups={rescheduledDays}
                open={openDays}
                onOpenChange={setOpenDays}
              />
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Mounted whatever the Unscheduled board is holding, including nothing — it used
          to be gated on that board having rows, and the overlay reporting what had just
          happened went down with the bar it was mounted in the moment the board emptied.
          Chrome does not vanish from the layout (ui-craft §2).

          It does belong to one tab, though. The bar commits a selection, the Scheduled
          record has none to make, and a sticky teal button over a list of finished work
          would be offering an act that list cannot perform. */}
      {tab === "unscheduled" ? (
        <CommitBar
          selected={selectedRows}
          total={unscheduled.length}
          today={today}
          range={filters}
          onReschedule={reschedule}
          onFinished={finish}
        />
      ) : null}
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
  everythingMoved,
  onClear,
}: {
  range: Span;
  isSearched: boolean;
  /**
   * The board is empty because the bench emptied it, not because the court had nothing
   * listed. Two different facts that look identical from a row count, and telling the
   * bench "this court has nothing it could move" after it has just moved everything
   * would be the screen forgetting the act it performed a second ago.
   */
  everythingMoved: boolean;
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
          ) : everythingMoved ? (
            <CalendarCheck2Icon aria-hidden />
          ) : (
            <CalendarX2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isSearched
            ? "No matters match this search"
            : everythingMoved
              ? "Everything here has been rescheduled"
              : "Nothing to move"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isSearched
            ? `No matter listed${span} matches the case name or number you asked for.`
            : everythingMoved
              ? `Every matter listed${span} is on the Scheduled tab.`
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
 * What this session moved — **a day at a time, stacked and shut.**
 *
 * The dates are the content of this tab. "Where did my afternoon's work go" is a question
 * about days, and every structure that made the *cases* primary answered it badly: a flat
 * list buried the later dates under the first one's rows, and so did an accordion whose
 * first day stood open. A chooser above one table fixed that and read as a filter strip;
 * folder tiles fixed it too and put a click in front of every day.
 *
 * So: the days stack, and **they all start shut** (owner, 2026-09-16). Landing on this tab
 * shows the dates and nothing else — every day the court scheduled into, with its count,
 * on one screen and in one glance. Opening one shows its cases; opening a second does not
 * shut the first, because the bench is comparing what it did rather than navigating a
 * menu.
 *
 * **Two days is where the stack starts.** One day cannot hide another, so a single date
 * skips the disclosure entirely and its cases are the record — nothing to click through
 * and nothing to collapse (owner, 2026-09-16).
 *
 * The day is the trigger and the heading both: Radix's `Accordion.Header` is the `h3`, so
 * the outline reads as one heading per day with its table under it.
 */
function RescheduledRecord({
  groups,
  open,
  onOpenChange,
}: {
  groups: RescheduledGroup[];
  /** The days whose cases are showing. Empty is the resting state, not an accident. */
  open: string[];
  onOpenChange: (open: string[]) => void;
}) {
  if (groups.length === 1) {
    const only = groups[0];
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <DayHeading group={only} />
        <DayCases group={only} />
      </div>
    );
  }

  return (
    <Accordion type="multiple" value={open} onValueChange={onOpenChange}>
      {groups.map((group) => (
        <AccordionItem
          key={group.day}
          value={group.day}
          /* The primitive's own rule between days is the DS default `border`, which is
             two steps darker than anything else on this screen — the table's row rules,
             the panel edge and the tab gutter are all hairlines — so it read as the
             heaviest line on a page it is the lightest thing on. Dashed, in the surface
             tone: a separation between days, not a rule competing with the tables under
             them (owner, 2026-09-15). */
          className="border-dashed border-surface-sunken"
        >
          <AccordionTrigger className="items-baseline justify-start gap-2 py-3 text-body font-semibold tabular-nums hover:no-underline">
            {/* The date takes the room and wraps; the count keeps one line beside it.
                Left to share the row evenly, a long day on a 390px screen squeezed the
                count into a column narrow enough to break "3 hearings" in half. */}
            <span className="min-w-0">{formatCourtDay(group.day)}</span>
            <span className="shrink-0 text-body-compact font-normal whitespace-nowrap text-muted-foreground">
              {group.rows.length}{" "}
              {plural(group.rows.length, "hearing", "hearings")}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <DayCases group={group} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** The one day on a record that has no disclosure to carry its name. */
function DayHeading({ group }: { group: RescheduledGroup }) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2 text-body font-semibold tabular-nums">
      <span className="min-w-0">{formatCourtDay(group.day)}</span>
      <span className="shrink-0 text-body-compact font-normal whitespace-nowrap text-muted-foreground">
        {group.rows.length} {plural(group.rows.length, "hearing", "hearings")}
      </span>
    </h3>
  );
}

/** One day's cases — the table above `md`, the same rows stacked below it. */
function DayCases({ group }: { group: RescheduledGroup }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="hidden md:block">
        <BulkRescheduleTable
          rows={group.rows}
          caption={`Hearings rescheduled to ${formatCourtDay(group.day)}`}
        />
      </div>
      <div className="md:hidden">
        <RescheduleItemList rows={group.rows} />
      </div>
    </div>
  );
}

/**
 * The Scheduled tab before anything has been scheduled.
 *
 * Says what would put something here rather than apologising for the blank. No control:
 * the thing to do is on the other tab, and a button that only switched tabs would be a
 * third way to press a tab.
 */
function NothingRescheduled() {
  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarCheck2Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          Nothing rescheduled yet
        </EmptyTitle>
        <EmptyDescription className="text-body">
          Matters you move from the Unscheduled tab appear here, with the date
          they were listed on and the date they go to.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * A board read on a phone is still the cause, its number and the day it stands listed on.
 * The columns that only support scanning (stage, hearing type) drop to a caption line
 * rather than forcing a six-column table through a 375px screen.
 *
 * `selection` is omitted on the Scheduled tab for the same reason the table drops its
 * checkbox column there: it is a record of what was done, not a board to work. The date
 * line changes with it — on the board it is the day the matter stands on, on the record
 * the day it came *from*, because the day it went to is the heading over the group.
 */
function RescheduleItemList({
  rows,
  selection,
}: {
  rows: ReschedulableHearing[];
  selection?: {
    selected: ReadonlySet<string>;
    onToggle: (id: string, next: boolean) => void;
  };
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const isSelected = selection?.selected.has(row.id) ?? false;

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
            {selection ? (
              <span className="pt-0.5">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(next) =>
                    selection.onToggle(row.id, next === true)
                  }
                  aria-label={`Select ${row.title}, ${row.caseNumber}`}
                />
              </span>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-body-compact font-medium">{row.title}</p>
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">{row.caseNumber}</span> ·{" "}
                {courtCaseStageLabel(row.stage)} ·{" "}
                {courtHearingPurposeLabel(row.purpose)}
              </p>
              <p className="text-body-compact tabular-nums text-muted-foreground">
                {selection ? "" : "Previously "}
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
  onFinished,
}: {
  selected: ReschedulableHearing[];
  total: number;
  today: string;
  range: Span;
  onReschedule: (day: string, moving: ReschedulableHearing[]) => void;
  /**
   * The act is over and its window has closed.
   *
   * Separate from `onReschedule` because the two happen at different moments and one of
   * them is allowed to unmount this bar. Anything the screen does that takes this bar off
   * the page — following the matters to the other tab — has to wait until the overlay
   * mounted inside it is no longer needed.
   */
  onFinished: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const summaryRef = React.useRef<HTMLParagraphElement>(null);
  const count = selected.length;
  /** Whether this opening of the overlay actually committed anything. */
  const committed = React.useRef(false);

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

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next || !committed.current) return;
            committed.current = false;
            onFinished();
          }}
        >
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
              onReschedule={(day, moving) => {
                committed.current = true;
                onReschedule(day, moving);
              }}
              onReturnFocus={() => summaryRef.current?.focus()}
            />
          ) : null}
        </Dialog>
      </div>
    </div>
  );
}

/** What the act committed, read before it spends the selection that says so. */
type Outcome = { day: string; moved: number; cases: number };

/**
 * The act: how many are moving, what date they move to, and the signature.
 *
 * **One overlay, three stages, no dialog on a dialog** (ui-craft §7). Asking for the
 * date, taking the signature and reporting what happened are stages of the same window.
 *
 * The last one is **the product's own success confirmation**, not a shape invented here:
 * the solid `bg-success` panel carrying the heading with the tick beneath it, and the
 * facts in a sunken well under that. It is what the advocate side ends a submission on
 * (`cases/add-signature-dialog.tsx`) and what every court-side signing queue ends on
 * (`sign-bulk-confirm-dialog.tsx`). Signing off a bulk act and signing a submission are
 * the same beat of the same product and must not end on two different kinds of object —
 * which a toast of my own invention was (owner, 2026-09-15).
 *
 * **The signature is the finalisation, and nothing moves before it.** Anshumanth's note
 * (2026-09-15) is that a bulk reschedule needs a document drawn up and signed before it
 * is finalised — which is how the act actually works: a court moves twenty matters by
 * passing one order, and the order is what the files carry. So picking a date commits
 * nothing; the matters move when the signature goes on.
 *
 * **It is an e-sign, and it asks for nothing.** No method group, because there is no
 * second route to choose between — the order is drawn up by the court at the moment of
 * the act, so there is no paper to upload — and no code, because the bench is not
 * authenticating a document it has opened. Pressing Sign signs, the way the court's own
 * bulk path does (`sign-bulk-confirm-dialog.tsx`, which asks for neither).
 *
 * The order document itself (`bulk-reschedule.ts`) is drawn up and tested but has no
 * surface on this screen: the bench is not offered a copy before signing or after it.
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
  /** Which of the two questions is on screen. */
  const [stage, setStage] = React.useState<"day" | "sign">("day");
  /**
   * What the act did, captured at the moment it ran.
   *
   * The confirmation reports the selection the act consumed, which by then is no longer
   * live: signing empties it, so `rows` is `[]` on the very next render and every live
   * figure is zero. These are the ones that were committed.
   */
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  const count = rows.length;

  /* The fact the signing stage states, named so the dialog can be described by it rather
     than by a second sentence written to have something to point at. */
  const factId = React.useId();

  /* Whether the act is what closed this, rather than Cancel, Escape or the X. The two
     want different things afterwards and the dialog cannot tell them apart on its own —
     it is unmounted by a parent that has already spent the selection. */
  const committed = React.useRef(false);
  /* The days the calendar will not offer — the span the bench asked the board for, and
     everything in it. See `earliestNewListing`. */
  const earliestNewDay = earliestNewListing(rows, range.to, today);

  /* Focus follows the stage: the title is the line that rewrites itself, so it is what
     announces each change. Swapping a stage replaces the whole body, and focus left on a
     control that has just been unmounted drops to the document.

     Not on the first render — the overlay's own `onOpenAutoFocus` has already put focus
     on the title, and re-running it here would be the same move twice. */
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    titleRef.current?.focus();
  }, [stage, outcome]);

  return (
    <ChromeDialogContent
      className={cn(
        "flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
        OVERLAY_RISE,
      )}
      /* The signing stage carries no `DialogDescription`; the fact in its card is what
         describes this window, so it is pointed at directly. Left unset the primitive
         would go looking for a description that is deliberately not there. */
      aria-describedby={stage === "sign" && !outcome ? factId : undefined}
      /* The DS places a small ghost X top-right, which lands on the success panel's solid
         fill and disappears into it — the reason the advocate confirmation draws its own.
         Here the footer's Done is the way out, so that stage goes without one. */
      showCloseButton={!outcome}
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
        if (!committed.current) return;
        event.preventDefault();
        onReturnFocus();
      }}
    >
      {/* The confirmation carries its own heading inside the success panel, which is
          what the product's confirmations do — so this bordered header belongs to the two
          stages that ask a question, and goes when the asking is over. */}
      {outcome ? null : (
        <DialogHeader className="shrink-0 gap-2 border-b border-hairline p-6 pr-16">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-title-s font-semibold outline-none"
          >
            {stage === "sign"
              ? "Sign the rescheduling order"
              : `Reschedule ${count} ${plural(count, "hearing", "hearings")}`}
          </DialogTitle>
          {/* The signing stage has no line here. What the bench needs at that moment is
              the one fact below — how many matters, and the day they go to — and a
              sentence above it restating that a signature signs things was the header
              talking over the only thing it had to say. The dialog is described by that
              fact instead (`aria-describedby` above). */}
          {stage === "day" ? (
            <DialogDescription className="text-body-compact text-muted-foreground">
              Everything selected moves to one new date.
            </DialogDescription>
          ) : null}
        </DialogHeader>
      )}

      {/* The stage: a tinted canvas under a white card, with the chrome above and below
          it left white so the tint reads as the surface the work sits on rather than as a
          grey dialog (ui-craft §1.0). Dark keeps `bg-background`, because `muted` is the
          raised step there and would invert the depth. */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted p-4 sm:p-6 dark:bg-background">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
          {outcome ? (
            <Signed outcome={outcome} titleRef={titleRef} />
          ) : stage === "sign" && day !== null ? (
            <SignOrder count={count} day={day} factId={factId} />
          ) : (
            <PickDay day={day} onDayChange={setDay} earliest={earliestNewDay} />
          )}
        </div>
      </div>

      {/* Chrome too, so it is `bg-card` rather than the primitive's muted fill — under a
          muted stage the two would merge into one grey band. */}
      <DialogFooter className="mx-0 mb-0 shrink-0 border-hairline bg-card">
        {outcome ? (
          /* One way out, and it is the way back to the board — where the rows the act
             moved are now carrying both of their dates. */
          <DialogClose asChild>
            <Button type="button">Done</Button>
          </DialogClose>
        ) : stage === "sign" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStage("day")}
            >
              Back
            </Button>
            {/* The act, and the finalisation: nothing has moved until this, and this asks
                for nothing further. */}
            <Button
              type="button"
              disabled={day === null}
              onClick={() => {
                if (day === null) return;
                committed.current = true;
                setOutcome({
                  day,
                  moved: rows.length,
                  cases: new Set(rows.map((row) => row.caseNumber)).size,
                });
                onReschedule(day, rows);
              }}
            >
              Sign
            </Button>
          </>
        ) : (
          <>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            {/* Off until a day is held. Nothing else can be wrong with it: the calendar
                offers no day that any of these matters is already on or past.

                It says what the flow does rather than what this press does, because the
                press is the commitment and the signature is the last thing it asks for
                (owner, 2026-09-15). Nothing is moved by it. */}
            <Button
              type="button"
              disabled={day === null}
              onClick={() => setStage("sign")}
            >
              Reschedule and sign
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
 * What the act did — **the product's success confirmation, not a new one.**
 *
 * The solid `bg-success` panel carrying the heading, with the outcome under it and the
 * tick beneath that, and the facts in a sunken well below. That composition is the
 * advocate side's (`cases/add-signature-dialog.tsx`, where a submission ends) and every
 * court-side signing queue's (`sign-bulk-confirm-dialog.tsx`). Signing off twenty
 * listings is the same beat of the same product as signing a submission, and the two must
 * not end on two different kinds of object. A toast written for this screen alone was
 * exactly that, and it is gone (owner, 2026-09-15).
 *
 * The heading is the `DialogTitle` on this stage — the bordered header above has gone
 * with the question it belonged to — so focus lands here and a screen reader hears what
 * happened rather than the question it just answered. The outcome is a live region for
 * the same reason `SignBulkConfirmDialog` makes it one: `aria-describedby` sits on the
 * dialog and does not fire again when the description underneath it is swapped.
 *
 * The panel says what happened; the well carries the two facts that are not in it. There
 * is no third thing. The last line is the half of the truth the screen would otherwise
 * imply — moving a day's board is communicated to the parties by a notification the court
 * draws up, and this build draws none.
 */
function Signed({
  outcome,
  titleRef,
}: {
  outcome: Outcome;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className={cn("flex flex-col gap-4", RESOLVE_IN_PLACE)}>
      <div className="flex flex-col items-center gap-4 rounded-lg bg-success p-6 text-center">
        <div className="flex flex-col gap-1.5">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-title-s font-semibold text-balance tabular-nums text-success-foreground outline-none"
          >
            {outcome.moved} {plural(outcome.moved, "hearing", "hearings")}{" "}
            rescheduled
          </DialogTitle>
          <DialogDescription
            role="status"
            className="text-body-compact text-pretty text-success-foreground"
          >
            The rescheduling order has been signed.
          </DialogDescription>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-success-foreground">
          <CheckIcon className="size-6 text-success" aria-hidden />
        </span>
      </div>

      <DescriptionList className="rounded-lg bg-surface-sunken px-4 py-1">
        <DescriptionRow className="grid-cols-[1fr_auto] items-center border-hairline">
          <DescriptionTerm className="text-body">
            New hearing date
          </DescriptionTerm>
          <DescriptionDetails className="text-body tabular-nums">
            {formatListingDate(outcome.day)}
          </DescriptionDetails>
        </DescriptionRow>
        <DescriptionRow className="grid-cols-[1fr_auto] items-center border-hairline">
          <DescriptionTerm className="text-body">Cases</DescriptionTerm>
          <DescriptionDetails className="text-body tabular-nums">
            {outcome.cases === 1 ? "1 case" : `${outcome.cases} cases`}
          </DescriptionDetails>
        </DescriptionRow>
      </DescriptionList>

      <p className="text-caption text-muted-foreground">
        No notification has gone to the parties yet.
      </p>
    </div>
  );
}

/**
 * What the signature covers. It asks for nothing.
 *
 * **An e-sign, not a credential ceremony.** This stage briefly carried the six-digit code
 * the signing queues take, which was the wrong pattern borrowed from the wrong path
 * (owner, 2026-09-15). Those queues ask because they offer a *choice* — e-sign or a paper
 * somebody signed by hand — and a chosen route that showed nothing would look finished
 * when it was not. There is no choice here and no code: pressing Sign e-signs the order,
 * the way the court's own bulk path signs a queue (`SignBulkConfirmDialog`, which asks
 * for no method either).
 *
 * So the stage is the one fact the bench cannot get anywhere else at this moment, having
 * come from a board it has already scrolled away from: how many matters, and the day they
 * go to. It sits on the tinted stage directly rather than inside the white card the
 * calendar needs — a card holding a single tinted strip is a box inside a box, and this
 * stage has nothing for a card to hold together (ui-craft §4).
 *
 * The `Banner` is the DS element for "what the next control will act on", which is
 * exactly what this is, and it is what the dialog is described by — so the one sentence
 * on this stage is read once, by everybody.
 */
function SignOrder({
  count,
  day,
  factId,
}: {
  count: number;
  day: string;
  /** Named so the dialog can point `aria-describedby` at the fact rather than at prose. */
  factId: string;
}) {
  return (
    /* Written as the move it is, not as a recital of the act the button performs. It read
       "You are signing one order listing 29 matters on Tuesday, 22 September 2026" —
       which puts the reader in the sentence, names the paperwork before the fact, and
       leaves "on Tuesday" hanging between the matters and the listing so it could be
       either. */
    <Banner variant="info" id={factId} className={cn(RESOLVE_IN_PLACE, "tabular-nums")}>
      {count} {plural(count, "hearing", "hearings")}{" "}
      {plural(count, "moves", "move")} to {formatCourtDay(day)}.
    </Banner>
  );
}

