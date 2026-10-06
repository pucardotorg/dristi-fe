"use client";

import * as React from "react";
import {
  CalendarCheck2Icon,
  CalendarDaysIcon,
  CalendarX2Icon,
  ChevronDownIcon,
  FileTextIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { CheckGroup } from "@/components/cases/cases-filters";
import {
  NewDateText,
  RescheduleItemList,
  RescheduleTable,
  RescheduledItemList,
  RescheduledTable,
} from "@/components/employee/bulk-reschedule-table";
import { PlannerCalendar } from "@/components/employee/planner-calendar";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { RescheduleDateDialog } from "@/components/employee/reschedule-date-dialog";
import {
  SignRescheduleDialog,
  ViewRescheduleOrderDialog,
  type RescheduleRun,
} from "@/components/employee/reschedule-order-dialog";
import { AppliedChip } from "@/components/shell/applied-chip";
import { SearchBox } from "@/components/tasks/filter-row";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  autoPlace,
  boardAfterMoves,
  buildRescheduleOrder,
  earliestNewListing,
  filterReschedulable,
  hearingSlotLabel,
  type Listing,
  type ReschedulableHearing,
  type RescheduleFilters,
  type RescheduleOrder,
} from "@/lib/employee/bulk-reschedule";
import {
  COURT_CASE_STAGES,
  COURT_HEARING_PURPOSES,
  courtCaseStageLabel,
  courtHearingPurposeLabel,
  formatCourtDay,
  formatListingDate,
  isSittingDay,
  isoDay,
  parseIsoDay,
  type CourtCaseStage,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * The day the bench is standing on is the reader's, not the server's — the same clock
 * today's cause list reads: the server renders its own guess and the browser replaces it
 * on hydration, so there is no mismatch to suppress and no blank first paint.
 */
const NEVER_CHANGES = () => () => {};
const readToday = () => isoDay(new Date());

/**
 * What the screen opens on: **the day the court is standing on, and only that day**
 * (owner, 2026-09-16 — *"if today is the 16th, then I will see the 16th"*).
 */
function todayOnly(today: string): RescheduleFilters {
  return { from: today, to: today, query: "" };
}

type SignedOrder = { order: RescheduleOrder; ids: string[] };

/** Both ends of the span, either of which may be unasked. */
type Span = { from: string | null; to: string | null };

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * A span in words — **the same words the table's own date column uses**, so the field,
 * the surface drawing it and the rows it filters cannot describe one day three ways.
 *
 * Said twice on this screen: by the trigger, of the span the board is showing, and by the
 * calendar's footer, of the span the bench has drawn and not yet applied. A span of one
 * day is one date, not the same date written twice with a dash between it.
 */
function spanLabel(span: Span): string {
  if (span.from === null) return "Select date range";
  return span.to === null || span.from === span.to
    ? formatListingDate(span.from)
    : `${formatListingDate(span.from)} – ${formatListingDate(span.to)}`;
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
 * - **(c)** the calendar dismisses on Apply. The primitive leaves it standing over the
 *   page after the one decision it exists for, and owning the surface is what lets the
 *   bench close it deliberately instead.
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
 * **The span is drawn here and applied on a press.** The calendar holds a draft; the
 * board is not narrowed until *Apply*, and leaving the surface any other way — Escape,
 * a click on the page, the trigger again — abandons what was drawn and leaves the board
 * on what it was showing. A range takes two clicks, so a span applied as it is drawn
 * spends its first click narrowing the board to a single day nobody asked for, and its
 * second widening it back; the bench watched twenty-two rows vanish and return between
 * two clicks of one gesture, and never saw the finished span at all, because closing it
 * dismissed the calendar in the same motion (owner, 2026-09-16). Now the span is drawn,
 * shown in the surface's own footer in the words the rows use, and applied when the bench
 * says so.
 *
 * *Apply* is the only button here. A Cancel would be a second way to do what Escape, the
 * trigger and the rest of the page already do, on a surface whose draft costs nothing to
 * abandon. It carries no glyph — the label is the whole of it.
 *
 * It is disabled while there is no day on the calendar, and enabled from the first click
 * onwards — **including when the span drawn is the one already applied.** Gating on
 * *different from the board* was the other candidate and is what a Search button would
 * do, but this button is also the way out of the surface, and the dead end it makes is
 * easy to walk into: reopen on 14–20, click 14, click 20, and the press the footer is
 * asking for is refused for re-drawing what was wanted. Re-applying an identical span
 * costs a render of the same rows, so the honest gate is the one about the calendar
 * being empty.
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
  floor,
  onChange,
  className,
}: {
  id: string;
  label: string;
  range: Span;
  /**
   * The span the field can never be emptied below — **today, on this screen.**
   *
   * The court's own day is not a filter the bench applied, it is where the board starts
   * (owner, 2026-09-16: *"hearing dates will always show the current day's date, they
   * cannot cross that out"*). So the `×` is not a way to empty the field: it appears only
   * once the span has been drawn away from this, and it undoes that drawing rather than
   * the day underneath it.
   */
  floor: Span;
  onChange: (from: string | null, to: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  /* What the calendar is showing, which is the applied span until the bench draws over
     it. Seeded every time the surface opens rather than once, so a span abandoned by an
     Escape is gone by the next opening and the calendar always arrives on the board. */
  const [draft, setDraft] = React.useState<Span>(range);
  /* One end is down and the calendar is waiting for the other. Held here rather than
     read off the value, because a span of one day and a span half-drawn are the same
     value — see `nextRangeFromPick`. True only between two clicks on the calendar:
     closing the surface abandons a half-drawn span rather than leaving it armed for the
     next time it opens. */
  const [holding, setHolding] = React.useState(false);
  /* One day or a span, said out loud: a calendar that silently took either was read as
     not knowing which it was (owner, 2026-10-06). Opens on whichever the board shows. */
  const [mode, setMode] = React.useState<"day" | "range">("day");
  const drawn = draft.from !== null;
  /* Something to give back: the applied span is not the one the field rests on. */
  const clearable =
    range.from !== floor.from || (range.to ?? range.from) !== (floor.to ?? floor.from);

  /* Undefined, not an empty `DateRange`: the calendar is handed the value directly here
     rather than through `DateRangePicker`, whose `value === undefined` meant "this
     control is uncontrolled" and made clearing impossible (`ds-requests` 19(b)). Nothing
     falls back to a remembered value any more, so the plain absence is the honest shape
     and the workaround it needed is gone with the primitive. */
  const selected: DateRange | undefined =
    draft.from === null
      ? undefined
      : {
          from: parseIsoDay(draft.from),
          to:
            draft.to === null || draft.from === draft.to
              ? undefined
              : parseIsoDay(draft.to),
        };

  function pick(next: DateRange | undefined) {
    /* Drawn, not applied: the board holds still until Apply. The second click closes the
       span, whichever day it landed on — a different day makes a range, the held day
       again makes a span of one — and a first click puts one end down and waits. */
    setDraft(nextRangeFromPick(draft, next, holding));
    setHolding(!holding);
  }

  function applyDraft() {
    onChange(draft.from, draft.to);
    /* The press is the decision this surface exists for, so it stands down on it (§19c). */
    setOpen(false);
  }

  return (
    <div className="flex min-w-0 shrink-0">
      <div className={cn("relative w-full min-w-0", className)}>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            /* A half-drawn span does not survive the surface closing. Escaping out of
               one and reopening would otherwise take the first click as its far end. */
            setHolding(false);
            /* Opening starts from the board, which is also how a drawn-but-unapplied
               span is abandoned: nothing carries over but what was applied. */
            if (next) {
              setDraft(range);
              setMode(
                range.from !== null && range.to !== null && range.from !== range.to
                  ? "range"
                  : "day",
              );
            }
          }}
        >
          <PopoverTrigger asChild>
            {/* Named by the visible label *and* by its own content, the way a combobox
                is: "Hearing dates, 14 Sept 2026 – 20 Sept 2026". The label alone would
                drop the span; the content alone would drop what the span is of. */}
            <Button
              id={`${id}-trigger`}
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 text-left font-normal",
                range.from === null && "text-muted-foreground",
                clearable && "pr-12",
              )}
            >
              <CalendarDaysIcon data-icon="inline-start" aria-hidden />
              {/* The label lives in the trigger, as Pending tasks' Filters button carries
                  its own word: the row this sits in is a row of controls, not a form.
                  It is permanent visible text, so it is the name voice users say. */}
              <span id={`${id}-label`} className="text-muted-foreground">
                {label}
              </span>
              <span className="truncate font-medium text-foreground">
                {spanLabel(range)}
              </span>
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
              the viewport edge rather than flush against it.

              **Height needs the same ceiling now that the surface has a floor.** Two
              stacked months are 512px of calendar on a phone, and a footer under them
              put Apply at 834px down a 820px viewport — off the bottom of a
              `position: fixed` surface, which no amount of page scrolling reaches
              (measured at 375×820 before this line). So the content stops at the height
              Radix says is available, the calendar takes the scrolling, and the footer
              keeps its place at the bottom: the one action is on screen at every size.
              A footer that scrolls away is a footer the bench cannot press. */}
          <PopoverContent
            align="start"
            collisionPadding={16}
            /* Radix hard-sets `role="dialog"` on this surface, and ARIA 1.2 requires a
               dialog to carry a name — without one a reader enters it hearing "dialog"
               and then a grid of numbers. The field's own label is that name, so the
               surface is announced as the field it belongs to (ACCESSIBILITY §2). */
            aria-labelledby={`${id}-label`}
            className="max-h-(--radix-popover-content-available-height) w-auto max-w-(--radix-popover-content-available-width) gap-0 p-0"
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
            <div className="flex shrink-0 flex-col gap-3 border-b border-hairline p-4">
              <SegmentedControl
                type="single"
                aria-label="Reschedule one day or a range of days"
                value={mode}
                onValueChange={(next) => {
                  if (!next) return;
                  setMode(next as "day" | "range");
                  setHolding(false);
                  /* A span collapses to its first day; a day becomes the start of one. */
                  setDraft((current) => ({ from: current.from, to: current.from }));
                }}
                className="w-full"
              >
                <SegmentedControlItem value="day" className="flex-1">
                  One day
                </SegmentedControlItem>
                <SegmentedControlItem value="range" className="flex-1">
                  Range of days
                </SegmentedControlItem>
              </SegmentedControl>
              <p aria-live="polite" className="text-body-compact text-muted-foreground">
                {mode === "day"
                  ? "Choose the date you want to see the hearings for."
                  : holding
                    ? "Now choose the last date."
                    : "Choose the range of dates you want to see the hearings listed for."}
              </p>
            </div>
            <div className="min-h-0 overflow-y-auto">
              {mode === "day" ? (
                <Calendar
                  mode="single"
                  numberOfMonths={2}
                  showOutsideDays={false}
                  selected={draft.from ? parseIsoDay(draft.from) : undefined}
                  onSelect={(next) => {
                    if (!next) return;
                    const day = isoDay(next);
                    setDraft({ from: day, to: day });
                  }}
                  autoFocus
                />
              ) : (
              <Calendar
                mode="range"
                numberOfMonths={2}
                /* §19a: two adjacent months otherwise draw each other's edge days, so
                   the same date appears in both panels and lights twice. Measured on
                   the render with 13 Sept – 2 Oct: no date now appears more than once. */
                showOutsideDays={false}
                selected={selected}
                onSelect={pick}
                /* Opening the surface puts the reader on a day, not on the chevron
                   that happens to come first in it. Radix focuses the first tabbable in
                   the content, which without this is *Previous month* — so a keyboard
                   user arrived one control short of the only question here. */
                autoFocus
              />
              )}
            </div>

            {/* The surface says what it is holding before it is asked to apply it — the
                calendar paints the span across two months, and a bench that has just
                clicked twice reads the dates back in one line rather than counting cells.
                Muted until there is one, so an empty picker does not state a value it
                does not have.

                Shaped like this screen's other overlay footer (`DialogFooter`): a tray
                fill under a hairline, the action to the end of the line, and stacked with
                the button full width where the two months stack — the calendar's own
                breakpoint, so the footer turns when the surface above it does. */}
            <div className="flex shrink-0 flex-col gap-2 rounded-b-lg border-t bg-muted p-2 md:flex-row md:items-center md:justify-between">
              <p
                id={`${id}-drawn`}
                className={cn(
                  "text-body-compact tabular-nums",
                  drawn ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {mode === "range" && holding && draft.from
                  ? `${formatListingDate(draft.from)} – …`
                  : spanLabel(draft)}
              </p>
              {/* Named by itself and described by the span, so it is announced as
                  "Apply, 14 Sept 2026 – 20 Sept 2026" — the visible label stays the whole
                  of the name (ACCESSIBILITY §12). */}
              <Button
                type="button"
                aria-describedby={`${id}-drawn`}
                disabled={!drawn}
                onClick={applyDraft}
                className="w-full md:w-auto"
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {clearable ? (
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
            /* Named for what it does, which is not "clear the field": it puts the board
               back on the court's own day. */
            aria-label={`Back to ${floor.from === null ? "no dates" : formatListingDate(floor.from)}`}
            onClick={() => {
              onChange(floor.from, floor.to);
              /* The field's own clear is not a draft: it gives the span back on the
                 spot, so the calendar behind it has nothing left to apply either. */
              setDraft(floor);
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
 * Bulk reschedule — moving the hearings of the days the court will not sit onto new
 * dates, then passing one signed order for all of them.
 *
 * **The table is the plan** (owner, 2026-10-06). There is no mode to choose and no wizard:
 * a court on leave auto-places most of a day's list, pulls a few back, puts one
 * advocate's matters on the same day and leaves some for later, in whatever order it
 * works. So the dates are set on the rows — *Auto-assign* fills what has no date (or what
 * is ticked) from the scheduler, *Set date* puts the ticked rows on one day and slot, and
 * every row's own New date opens the same small calendar. Each act can be undone, and
 * nothing moves until the order is signed.
 *
 * Composed as Pending tasks is: the title and its summary line, the tabs, one row of
 * controls (what decides the list on the left, search and Filters on the right), the
 * toolbar over the table — always there, its acts waiting disabled until they apply, so
 * nothing essential is hidden behind a click (owner, 2026-10-06) — and the table in its
 * panel.
 *
 * **The move is a demo move.** Signing writes the new dates onto the matters for this
 * session; no notification is drawn up for the parties and a reload puts the board back.
 * The signed state says so, where it matters.
 */
export function BulkRescheduleScreen() {
  const today = React.useSyncExternalStore(NEVER_CHANGES, readToday, readToday);

  const [filters, setFilters] = React.useState<RescheduleFilters>(() =>
    todayOnly(today),
  );
  const [stages, setStages] = React.useState<CourtCaseStage[]>([]);
  const [purposes, setPurposes] = React.useState<CourtHearingPurposeId[]>([]);
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /** New dates drawn up and not yet signed. */
  const [draft, setDraft] = React.useState<Readonly<Record<string, Listing>>>({});
  /** New dates signed this session. */
  const [moved, setMoved] = React.useState<Readonly<Record<string, Listing>>>({});
  const [orders, setOrders] = React.useState<SignedOrder[]>([]);
  const [tab, setTab] = React.useState<"unscheduled" | "scheduled">(
    "unscheduled",
  );
  /** What the last act did, with the draft it replaced — the toolbar offers to undo it. */
  const [notice, setNotice] = React.useState<{
    text: string;
    before: Readonly<Record<string, Listing>>;
  } | null>(null);
  const [signing, setSigning] = React.useState(false);
  const [session, setSession] = React.useState(0);
  const [viewing, setViewing] = React.useState<number | null>(null);
  /** Recently rescheduled, as a list or as the month it changed. */
  const [recordView, setRecordView] = React.useState<"list" | "calendar">("list");
  const [recordMonth, setRecordMonth] = React.useState<string | null>(null);
  const [recordDay, setRecordDay] = React.useState<string | null>(null);
  const recordTabRef = React.useRef<HTMLButtonElement>(null);
  const workTabRef = React.useRef<HTMLButtonElement>(null);

  /* The notice stands for a few seconds, long enough to reach Undo, then the bar goes
     back to saying what is left. */
  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const board = boardAfterMoves(today, moved);
  const spanned = new Set(
    filterReschedulable(board, { ...filters, query: "" }).map((row) => row.id),
  );
  /* Still to move: listed in the range and not yet moved — and anything already given a
     new date, wherever the range has since been drawn, because it is part of the order
     being drawn up. */
  const toMove = board.filter(
    (row) =>
      row.newDate === undefined &&
      (spanned.has(row.id) || draft[row.id] !== undefined),
  );
  const query = filters.query.trim().toLowerCase();
  const passes = (row: ReschedulableHearing) =>
    (!query || `${row.title} ${row.caseNumber}`.toLowerCase().includes(query)) &&
    (!stages.length || stages.includes(row.stage)) &&
    (!purposes.length || purposes.includes(row.purpose));
  const listed = toMove.filter(passes);
  const planned = toMove.filter((row) => draft[row.id] !== undefined);
  const unplanned = listed.filter((row) => draft[row.id] === undefined);

  const shown = listed;
  const selectedRows = toMove.filter((row) => selected.has(row.id));

  const scheduled = board.filter((row) => row.newDate !== undefined);
  const record = scheduled.filter(passes);
  /* The month view: what each day gained and what it gave up. */
  const movedIn = (day: string) => record.filter((row) => row.newDate === day).length;
  const movedOut = (day: string) => record.filter((row) => row.date === day).length;
  const [dayOpen, setDayOpen] = React.useState(false);
  const firstNewDay =
    record.map((row) => row.newDate ?? "").filter(Boolean).sort()[0] ?? today;
  const shownDay = recordDay ?? firstNewDay;
  const movedHere = recordDay ? record.filter((row) => row.newDate === recordDay) : [];
  const movedAway = recordDay ? record.filter((row) => row.date === recordDay) : [];
  const daySections: [string, ReschedulableHearing[]][] = [
    ["Moved here", movedHere],
    ["Moved away", movedAway],
  ];

  const floorFor = (rows: ReschedulableHearing[]) =>
    earliestNewListing(rows, filters.to, today);

  function act(text: string, next: Readonly<Record<string, Listing>>) {
    setNotice({ text, before: draft });
    setDraft(next);
    setSelected(new Set());
  }

  function place(rows: ReschedulableHearing[], at: Listing) {
    const next = { ...draft };
    for (const row of rows) next[row.id] = at;
    act(
      `${rows.length} ${plural(rows.length, "hearing", "hearings")} set for ${formatListingDate(at.day)}, ${hearingSlotLabel(at.slot).toLowerCase()}`,
      next,
    );
  }

  function clear(rows: ReschedulableHearing[]) {
    const next = { ...draft };
    for (const row of rows) delete next[row.id];
    act(
      `New date cleared from ${rows.length} ${plural(rows.length, "hearing", "hearings")}`,
      next,
    );
  }

  /** Ticked rows if any are ticked; otherwise everything shown that has no date yet. */
  const autoTargets = selectedRows.length ? selectedRows : unplanned;
  function autoAssign() {
    const placed = autoPlace(board, draft, autoTargets, floorFor(autoTargets));
    const days = new Set(Object.values(placed).map((at) => at.day)).size;
    act(
      `${autoTargets.length} ${plural(autoTargets.length, "hearing", "hearings")} auto-assigned across ${days} ${plural(days, "day", "days")}`,
      { ...draft, ...placed },
    );
  }

  const run: RescheduleRun = planned.map((row) => ({ row, to: draft[row.id] }));

  function sign(reason: Parameters<typeof buildRescheduleOrder>[1]) {
    const ids = run.map(({ row }) => row.id);
    setOrders((current) => [
      ...current,
      { order: buildRescheduleOrder(run, reason, today, today), ids },
    ]);
    setMoved((current) => {
      const next = { ...current };
      for (const { row, to } of run) next[row.id] = to;
      return next;
    });
    setDraft((current) => {
      const next = { ...current };
      for (const id of ids) delete next[id];
      return next;
    });
    setNotice(null);
    setSelected(new Set());
  }

  function toggleRow(id: string, next: boolean) {
    setSelected((current) => {
      const draftSet = new Set(current);
      if (next) draftSet.add(id);
      else draftSet.delete(id);
      return draftSet;
    });
  }

  function toggleAll(next: boolean) {
    setSelected((current) => {
      const draftSet = new Set(current);
      for (const row of shown) {
        if (next) draftSet.add(row.id);
        else draftSet.delete(row.id);
      }
      return draftSet;
    });
  }

  function clearFilters() {
    setFilters((current) => ({ ...current, query: "" }));
    setStages([]);
    setPurposes([]);
  }

  const dateCell = (row: ReschedulableHearing) => {
    const at = draft[row.id];
    return (
      <RescheduleDateDialog
        rows={[row]}
        board={board}
        draft={draft}
        floor={floorFor([row])}
        onSet={(next) => place([row], next)}
        onClear={() => clear([row])}
      >
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-10 w-full justify-between gap-2 px-2 py-1.5 font-normal"
        >
          {/* Named by what it shows, then what it is for — a voice user says the
              visible words (ACCESSIBILITY §9). */}
          {at ? (
            <NewDateText day={at.day} slot={hearingSlotLabel(at.slot)} />
          ) : (
            <span className="text-body-compact text-muted-foreground">
              Set date
            </span>
          )}
          <span className="sr-only">
            {at ? `, change the new date for ${row.caseNumber}` : ` for ${row.caseNumber}`}
          </span>
          <ChevronDownIcon
            data-icon="inline-end"
            aria-hidden
            className="text-muted-foreground"
          />
        </Button>
      </RescheduleDateDialog>
    );
  };

  const spanText = spanLabel(filters);
  const narrowed = Boolean(query) || stages.length > 0 || purposes.length > 0;
  const filterBase = tab === "unscheduled" ? toMove : scheduled;

  const controlsRight = (
    <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
      <SearchBox
        query={filters.query}
        onChange={(next) => setFilters((current) => ({ ...current, query: next }))}
        label="Search these hearings"
        placeholder="Case title or number"
      />
      <FiltersSheet
        base={filterBase}
        stages={stages}
        purposes={purposes}
        onStages={setStages}
        onPurposes={setPurposes}
        onClear={clearFilters}
        shownCount={(tab === "unscheduled" ? listed : record).length}
      />
    </div>
  );

  const applied = narrowed ? (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((stage) => (
        <AppliedChip
          key={stage}
          label={`${courtCaseStageLabel(stage)} stage`}
          onClear={() => setStages(stages.filter((each) => each !== stage))}
        />
      ))}
      {purposes.map((purpose) => (
        <AppliedChip
          key={purpose}
          label={courtHearingPurposeLabel(purpose)}
          onClear={() => setPurposes(purposes.filter((each) => each !== purpose))}
        />
      ))}
      <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
        <XIcon data-icon="inline-start" aria-hidden />
        Clear
      </Button>
    </div>
  ) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-title text-balance font-semibold">
          Bulk reschedule hearings
        </h1>
        <p className="text-body-compact tabular-nums text-muted-foreground">
          {toMove.length} {plural(toMove.length, "hearing", "hearings")} to reschedule
          from {spanText} · {planned.length} with a new date · {scheduled.length}{" "}
          rescheduled
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as "unscheduled" | "scheduled");
          setSelected(new Set());
          setNotice(null);
        }}
        className="flex min-w-0 flex-col gap-6"
      >
        <div className="overflow-x-auto border-b border-hairline">
          <TabsList
            variant="line"
            aria-label="Which hearings to show"
            className="h-10 w-max min-w-full justify-start gap-4 rounded-none p-0 group-data-horizontal/tabs:h-10 sm:gap-6"
          >
            {(
              [
                ["unscheduled", "To reschedule", toMove.length],
                ["scheduled", "Recently rescheduled", scheduled.length],
              ] as const
            ).map(([value, label, count]) => (
              <TabsTrigger
                key={value}
                ref={value === "scheduled" ? recordTabRef : workTabRef}
                value={value}
                className="h-10 flex-none items-baseline gap-1.5 px-0 pb-2.5 text-body-compact group-data-horizontal/tabs:after:-bottom-px group-data-[variant=line]/tabs-list:data-active:after:bg-brand-accent"
              >
                {label}
                <span className="text-caption tabular-nums text-muted-foreground">
                  {count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent
          value="unscheduled"
          className="flex min-w-0 flex-col gap-4 outline-none"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* What decides the list, on the left: the days being cleared, then the new
                dates once there are any. */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:flex-nowrap">
              <RangeField
                id="reschedule-range"
                label="Cases listed on"
                range={filters}
                floor={{ from: today, to: today }}
                onChange={(from, to) => {
                  setFilters((current) => ({ ...current, from, to }));
                  setSelected(new Set());
                }}
              />
            </div>
            {controlsRight}
          </div>
          {applied}

          {toMove.length ? (
            <Toolbar
              selected={selectedRows}
              notice={notice?.text ?? null}
              onUndo={() => {
                if (!notice) return;
                setDraft(notice.before);
                setNotice(null);
              }}
              onClearSelection={() => setSelected(new Set())}
              autoCount={autoTargets.length}
              onAuto={autoAssign}
              planned={planned.length}
              unplanned={toMove.length - planned.length}
              onReview={() => {
                setSession((count) => count + 1);
                setSigning(true);
              }}
              setDate={
                <RescheduleDateDialog
                  rows={selectedRows}
                  board={board}
                  draft={draft}
                  floor={floorFor(selectedRows)}
                  onSet={(at) => place(selectedRows, at)}
                  onClear={() => clear(selectedRows)}
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selectedRows.length === 0}
                  >
                    <CalendarDaysIcon data-icon="inline-start" aria-hidden />
                    Set date
                  </Button>
                </RescheduleDateDialog>
              }
            />
          ) : null}

          <QueueAnnouncer from={1} to={shown.length} total={shown.length} />

          {shown.length === 0 ? (
            <NothingToMove
              range={filters}
              isSearched={narrowed}
              everythingMoved={scheduled.length > 0 && toMove.length === 0}
              onClear={clearFilters}
            />
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <RescheduleTable
                  rows={shown}
                  selection={{ selected, onToggle: toggleRow, onToggleAll: toggleAll }}
                  dateCell={dateCell}
                />
              </div>
              <div className="md:hidden">
                <RescheduleItemList
                  rows={shown}
                  selection={{ selected, onToggle: toggleRow, onToggleAll: toggleAll }}
                  dateCell={dateCell}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent
          value="scheduled"
          className="flex min-w-0 flex-col gap-4 outline-none"
        >
          {scheduled.length ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* How to read what moved: as the list, or as the month it changed —
                  which days took hearings and which gave them up. */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <SegmentedControl
                  type="single"
                  aria-label="Show as"
                  value={recordView}
                  onValueChange={(next) => {
                    if (next) setRecordView(next as "list" | "calendar");
                  }}
                >
                  <SegmentedControlItem value="list">List</SegmentedControlItem>
                  <SegmentedControlItem value="calendar">Calendar</SegmentedControlItem>
                </SegmentedControl>
                {/* One control for however many orders a session signs — a list of them
                    on the page would grow with every order (owner, 2026-10-06). */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <FileTextIcon data-icon="inline-start" aria-hidden />
                      Signed orders
                      <span className="tabular-nums text-muted-foreground">{orders.length}</span>
                      <ChevronDownIcon data-icon="inline-end" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-72">
                    {orders.map((entry, index) => (
                      <DropdownMenuItem
                        key={index}
                        onSelect={() => setViewing(index)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="text-body-compact font-medium">
                          Rescheduling order {index + 1}
                        </span>
                        <span className="text-caption tabular-nums text-muted-foreground">
                          Signed {entry.order.dated} · {entry.ids.length}{" "}
                          {plural(entry.ids.length, "hearing", "hearings")}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {controlsRight}
            </div>
          ) : null}
          {scheduled.length ? applied : null}

          <QueueAnnouncer from={1} to={record.length} total={scheduled.length} />

          {scheduled.length === 0 ? (
            <NothingRescheduled />
          ) : record.length === 0 ? (
            <NothingToMove
              range={filters}
              isSearched
              everythingMoved={false}
              onClear={clearFilters}
            />
          ) : recordView === "calendar" ? (
            <section
              aria-label="The month these hearings moved in"
              className="rounded-xl border border-hairline bg-card p-4 shadow-raised"
            >
              <PlannerCalendar
                month={recordMonth ?? shownDay}
                onMonthChange={setRecordMonth}
                selected={recordDay}
                onSelect={(day) => {
                  setRecordDay(day);
                  setDayOpen(true);
                }}
                isDisabled={(day) => !isSittingDay(day)}
                label="Days hearings moved to and from — choose one to see them"
                cell={(day) => {
                  const into = movedIn(day);
                  const from = movedOut(day);
                  return {
                    body: into
                      ? `+${into} moved in`
                      : from
                        ? `${from} moved out`
                        : null,
                    label: `${formatCourtDay(day)}${into ? `, ${into} moved in` : ""}${from ? `, ${from} moved out` : ""}`,
                  };
                }}
              />
            </section>
          ) : (
            <>
              <div className="hidden min-w-0 md:block">
                <RescheduledTable
                  rows={record}
                  caption="Hearings rescheduled this session"
                />
              </div>
              <div className="md:hidden">
                <RescheduledItemList rows={record} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* A day from the calendar, over it rather than under it: the month stays where
          the bench left it (owner, 2026-10-06). */}
      <Sheet open={dayOpen} onOpenChange={setDayOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-title-s font-semibold">
              {recordDay ? formatCourtDay(recordDay) : ""}
            </SheetTitle>
            <SheetDescription className="text-body-compact tabular-nums">
              {movedHere.length} moved in · {movedAway.length} moved out
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
            {daySections.map(([title, rows]) =>
              rows.length ? (
                <section key={title} className="flex flex-col gap-3">
                  <h3 className="text-body-compact font-medium text-muted-foreground">
                    {title} <span className="tabular-nums">{rows.length}</span>
                  </h3>
                  <RescheduledItemList rows={rows} />
                </section>
              ) : null,
            )}
            {movedHere.length + movedAway.length === 0 ? (
              <p className="text-body-compact text-muted-foreground">
                Nothing moved to or from this day.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <SignRescheduleDialog
        open={signing}
        onOpenChange={(open) => {
          setSigning(open);
          /* Signed and nothing left: the receipt is what the bench wants next. */
          if (!open && orders.length && toMove.length === 0) setTab("scheduled");
        }}
        session={session}
        run={run}
        unplanned={toMove.length - planned.length}
        today={today}
        onSign={sign}
        onSignedClose={() =>
          (toMove.length ? workTabRef : recordTabRef).current?.focus()
        }
      />
      <ViewRescheduleOrderDialog
        order={viewing === null ? null : (orders[viewing]?.order ?? null)}
        number={(viewing ?? 0) + 1}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
    </div>
  );
}

/**
 * The bar over the table — Pending tasks' selection bar, always on (owner, 2026-10-06:
 * essential acts are never hidden behind a click). What it says on the left answers what
 * the bench can do next; the acts on the right wait, disabled, until they apply.
 *
 * *Auto-assign* takes the ticked rows when there are any and everything shown without a
 * date when there are not, so it is never off while there is something to place.
 */
function Toolbar({
  selected,
  notice,
  onUndo,
  onClearSelection,
  autoCount,
  onAuto,
  planned,
  unplanned,
  onReview,
  setDate,
}: {
  selected: ReschedulableHearing[];
  notice: string | null;
  onUndo: () => void;
  onClearSelection: () => void;
  autoCount: number;
  onAuto: () => void;
  planned: number;
  unplanned: number;
  onReview: () => void;
  setDate: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label="Rescheduling"
      /* `top-14` clears the chrome bar exactly; opaque so rows sliding under it never
         decide its contrast; unlifted, so the table stays the one raised object. */
      className="sticky top-14 z-20 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-hairline bg-card px-4 py-3"
    >
      <p
        aria-live="polite"
        className="mr-auto flex flex-wrap items-center gap-x-3 text-body-compact tabular-nums text-muted-foreground"
      >
        {selected.length ? (
          <>
            <span>
              {selected.length} {plural(selected.length, "hearing", "hearings")} selected.
            </span>
            <Button
              variant="link"
              className="h-auto p-0 font-normal underline"
              onClick={onClearSelection}
            >
              Clear
            </Button>
          </>
        ) : notice ? (
          <>
            <span className="text-foreground">{notice}.</span>
            <Button
              variant="link"
              className="h-auto p-0 font-normal underline"
              onClick={onUndo}
            >
              Undo
            </Button>
          </>
        ) : planned === 0 ? (
          <span>Select hearings and set a date, or auto-assign them.</span>
        ) : unplanned ? (
          <span>
            {unplanned} {plural(unplanned, "hearing has", "hearings have")} no new date
            yet.
          </span>
        ) : (
          <span>Every hearing has a new date.</span>
        )}
      </p>
      <Button variant="outline" disabled={autoCount === 0} onClick={onAuto}>
        Auto-assign
        {autoCount ? (
          <span className="font-normal tabular-nums text-muted-foreground">
            {autoCount}
          </span>
        ) : null}
      </Button>
      {setDate}
      <Button disabled={planned === 0} onClick={onReview} className="tabular-nums">
        {planned
          ? `Reschedule ${planned} ${plural(planned, "hearing", "hearings")} and sign order`
          : "Reschedule and sign order"}
      </Button>
    </div>
  );
}

/**
 * Stage and hearing type, in a sheet — Pending tasks' Filters: the controls fold away,
 * and whatever is on stays out on the row as a removable chip.
 */
function FiltersSheet({
  base,
  stages,
  purposes,
  onStages,
  onPurposes,
  onClear,
  shownCount,
}: {
  base: ReschedulableHearing[];
  stages: CourtCaseStage[];
  purposes: CourtHearingPurposeId[];
  onStages: (next: CourtCaseStage[]) => void;
  onPurposes: (next: CourtHearingPurposeId[]) => void;
  onClear: () => void;
  shownCount: number;
}) {
  const applied = stages.length + purposes.length;
  const count = <T extends string>(pick: (row: ReschedulableHearing) => T, value: T) =>
    base.filter((row) => pick(row) === value).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Filters${applied ? `, ${applied} applied` : ""}`}
        >
          <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
          Filters
          {applied ? (
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-medium tabular-nums text-primary-foreground">
              {applied}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="text-title-s font-semibold">Filters</SheetTitle>
          <SheetDescription className="text-body-compact">
            Narrow the list. Anything you set stays visible on the row behind this.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          <CheckGroup
            id="reschedule-filter-stage"
            legend="Stage"
            options={COURT_CASE_STAGES.filter((stage) =>
              base.some((row) => row.stage === stage.id),
            ).map((stage) => ({
              value: stage.id,
              label: stage.label,
              count: count((row) => row.stage, stage.id),
            }))}
            value={stages}
            onChange={onStages}
          />
          <CheckGroup
            id="reschedule-filter-purpose"
            legend="Hearing type"
            options={COURT_HEARING_PURPOSES.filter((purpose) =>
              base.some((row) => row.purpose === purpose.id),
            ).map((purpose) => ({
              value: purpose.id,
              label: purpose.label,
              count: count((row) => row.purpose, purpose.id),
            }))}
            value={purposes}
            onChange={onPurposes}
          />
        </div>
        <SheetFooter>
          {applied ? (
            <Button variant="outline" onClick={onClear}>
              Clear all filters
            </Button>
          ) : null}
          <SheetClose asChild>
            <Button className="tabular-nums">
              Show {shownCount} {plural(shownCount, "hearing", "hearings")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Nothing to show — and which kind of nothing: a range with nothing listed, a range
 * already cleared, or a search or filter that matched nothing (the only one with an
 * action worth offering).
 */
function NothingToMove({
  range,
  isSearched,
  everythingMoved,
  onClear,
}: {
  range: Span;
  isSearched: boolean;
  everythingMoved: boolean;
  onClear: () => void;
}) {
  const span =
    range.from === null
      ? ""
      : range.from === range.to || range.to === null
        ? ` on ${formatCourtDay(range.from)}`
        : ` between ${formatCourtDay(range.from)} and ${formatCourtDay(range.to)}`;
  return (
    <Empty className="rounded-xl border border-hairline bg-card shadow-raised">
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
            ? "No hearings match"
            : everythingMoved
              ? "Everything here has been rescheduled"
              : "Nothing to move"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isSearched
            ? "Try another case title or number, or clear the filters."
            : everythingMoved
              ? `Every hearing listed${span} is on Recently rescheduled.`
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

function NothingRescheduled() {
  return (
    <Empty className="rounded-xl border border-hairline bg-card shadow-raised">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarCheck2Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          Nothing rescheduled yet
        </EmptyTitle>
        <EmptyDescription className="text-body">
          Hearings appear here once the order moving them is signed.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
