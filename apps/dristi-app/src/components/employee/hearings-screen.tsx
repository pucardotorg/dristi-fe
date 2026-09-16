"use client";

import * as React from "react";
import { CalendarX2Icon, SearchXIcon, VideoIcon } from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { HearingOverviewDialog } from "@/components/employee/hearing-overview-dialog";
import {
  HearingCaseButton,
  HearingRowActions,
  HearingsTable,
} from "@/components/employee/hearings-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { useCourtRole } from "@/components/employee/use-court-role";
import { useCourtToday } from "@/components/employee/use-court-today";
import { useHearingSession } from "@/components/employee/use-hearing-session";
import { rowActivation } from "@/lib/employee/row-activation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CourtRole } from "@/lib/employee/content";
import {
  markHearingEnded,
  markHearingOngoing,
  markHearingPassedOver,
} from "@/lib/employee/hearing-session";
import {
  causeTitle,
  counselFor,
  courtHearingPurposeLabel,
  courtHearingStatusLabel,
  courtHearingStatusVariant,
  filterHearings,
  formatCourtDay,
  hearingsForDay,
  isoDay,
  parseIsoDay,
  COURT_HEARING_PURPOSES,
  TODAYS_CAUSE_STATUSES,
  EMPTY_FILTERS,
  PAGE_SIZE,
  withHearingSession,
  type CourtHearing,
  type HearingFilters,
  type HearingsPageSize,
} from "@/lib/employee/hearings";

/**
 * Today's hearings — the court's cause list for the day it is sitting.
 *
 * Composed the way the advocate's cases list is composed (`CasesListScreen`), because it
 * is the same kind of screen and the bench should not have to learn a second layout: the
 * page title stands on the page, and **one** lifted panel holds the filters, the table
 * and the pagination footer together. The filters live inside that panel rather than
 * floating on the page — they belong to the list they filter, and a second framed box
 * below them would be the box-in-box the layering model rules out (ui-craft §4).
 */
export function HearingsScreen() {
  const today = useCourtToday();
  /* Which seat the court side is being worked from. It decides what the rows offer, not
     what they say: the same board, with the acts that move the sitting on it or not
     (`lib/employee/court-role.ts`). */
  const seat = useCourtRole();

  /* `null` means "the day the court is sitting" — resolved against the reader's clock
     rather than frozen at first render, so the screen is right whenever it is opened. */
  const [day, setDay] = React.useState<string | null>(null);
  const activeDay = day ?? today;

  /* One state, not a draft and an applied one: the board answers the controls as they are
     used — status, purpose and free text alike, so the row has one rule rather than a live
     date beside three deferred filters. Every change resets to page one; the old Search
     button did that, and a keystroke that narrows the list to four rows must not leave the
     reader on page three of nothing. */
  const [filters, setFilters] = React.useState<HearingFilters>(EMPTY_FILTERS);
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  /* Which listing the bench has called, which it has ended, and which it has passed
     over. Held outside this component because the marks have to outlive it: the cause
     title and the order composer both navigate away, and the matter must still read as
     ongoing when the bench lands there — see `lib/employee/hearing-session.ts`. None of
     the three writes a court record; that part of the bargain is unchanged. */
  const session = useHearingSession();
  const [liveMessage, setLiveMessage] = React.useState<string | null>(null);
  /* The matter being read over the list — opened by the cause title, or by the call
     that also marks it ongoing. Held as an id rather than a row because in the second
     case the row it names has just changed status, and a copy taken at click time would
     show the overlay a listing that is still scheduled. */
  const [openHearingId, setOpenHearingId] = React.useState<string | null>(null);

  const listed = withHearingSession(hearingsForDay(activeDay, today), session);
  const rows = filterHearings(listed, filters);

  /**
   * Reading a matter without calling it — the cause title on the row, and the row
   * itself, which delegates to it.
   *
   * The whole of it is opening the overlay. It writes no session mark, announces
   * nothing and touches no status: a reader who opens item 4 to see what it is has not
   * started hearing item 4, and a screen that recorded otherwise would be lying about
   * the one thing this list is for. That is also why it needs no seat test — reading is
   * not one of the acts a seat has or lacks (`lib/employee/court-role.ts`), so the
   * typist gets the same overview from the same cell the bench does.
   */
  function openCase(hearing: CourtHearing) {
    setOpenHearingId(hearing.id);
  }

  /**
   * Calling a matter. It marks the listing ongoing and nothing else.
   *
   * **It does not open the overlay** (owner, 2026-09-12). It used to, on the argument
   * that the bench would want the matter in front of them the moment they called it —
   * but that made one press do two things, and the second one was the one nobody asked
   * for: a sheet over the day, to be dismissed, before the next item could be called.
   * Calling the list is a run of presses down a column, and a modal between each of them
   * is a modal in the way. Reading a matter is its own act, with its own control on the
   * same row (`openCase`), and now they are cleanly separated — press to call, click the
   * name to read.
   *
   * The row says it happened without any of that: the chip turns Ongoing, the slot the
   * press landed on becomes End hearing under the pointer, and the Orders control opens.
   * Three changes on the row the eye is already on, which is what an in-place outcome is
   * supposed to look like.
   *
   * All three marks announce from here, and here is where the announcement belongs now
   * that none of them opens anything: the list is what stays on screen. None of the
   * three runs in a seat that does not run the sitting — the controls that call them are
   * simply not on the row, so the mark never happens there.
   */
  function startHearing(hearing: CourtHearing) {
    markHearingOngoing(hearing.id);
    setLiveMessage(`Hearing started for ${causeTitle(hearing)}`);
  }

  /*
   * **Opening an order marks nothing, since 2026-09-15.**
   *
   * The typist's trip into a listing used to mark the matter heard on the way in, so the
   * row would read Completed when the trail brought them back. Two things were wrong with
   * it, and the owner hit the second: *"whenever I click on an order icon and land in the
   * order page, on default the order is already typed out. That shouldn't happen."*
   *
   * It was doing exactly that, and this line was why. `initialOrderDraft` opens a
   * **completed** listing on a written order (D23) — the roll called, the applications
   * allowed, a paragraph per purpose — and it reads the *live* status, which this made
   * `completed` at the instant of arrival. So the typist reached a composer that had
   * already written the order they came to type, and the words were not theirs.
   *
   * The other thing was quieter and worse: Completed is a claim about a sitting, and
   * opening a screen is not a sitting. "What a court record must not do is quietly imply a
   * fact nobody entered" is this area's own rule, and a status set by navigation breaks it.
   *
   * Nothing takes its place, because nothing needs to: a listing the typist has actually
   * dictated on now carries the draft mark in the Orders column (`hearings-table.tsx`), so
   * the trail is drawn by work that exists rather than by a trip that happened. A listing
   * opened and left shows no mark, which is the truth about it.
   */

  function endHearing(hearing: CourtHearing) {
    markHearingEnded(hearing.id);
    setLiveMessage(`Hearing ended for ${causeTitle(hearing)}`);
  }

  function passOverHearing(hearing: CourtHearing) {
    markHearingPassedOver(hearing.id);
    setLiveMessage(`Hearing passed over for ${causeTitle(hearing)}`);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered =
    filters.status !== "all" ||
    filters.purpose !== "all" ||
    filters.query !== "";

  /* Read from `listed`, not from `rows`: a filter set to Scheduled drops the matter
     the bench has just called out of the filtered list, and the overlay reading it
     should not close because of that. */
  const openHearing =
    listed.find((hearing) => hearing.id === openHearingId) ?? null;

  function changeFilters(next: HearingFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_FILTERS);
    setDay(null);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-title text-balance font-semibold sm:text-title-l">
            Today&rsquo;s hearings
          </h1>
          <p className="text-body text-muted-foreground">
            {formatCourtDay(activeDay)}
          </p>
        </div>
        <JoinVideoCourt />
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe and the same `gap-6` / `p-6` the cases panel
          uses. Nothing inside draws a second frame. */}
      <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card p-6 shadow-raised">
        <HearingsFilters
          filters={filters}
          onChange={changeFilters}
          day={activeDay}
          onDayChange={(next) => {
            setDay(next);
            setPage(1);
          }}
          onClear={clearFilters}
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <HearingsEmpty
            day={activeDay}
            isFiltered={isFiltered}
            onClear={clearFilters}
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page sideways. */}
            <div className="min-w-0">
              {/* Seven or eight columns do not survive a phone. Below `md` the same rows
                  stack as items — the advocate list's own answer. `min-w-0` lets the
                  table's own scrollport shrink instead of blowing the page sideways. */}
              <div className="hidden min-w-0 md:block">
                <HearingsTable
                  rows={pageRows}
                  seat={seat}
                  onOpenCase={openCase}
                  onStartHearing={startHearing}
                  onEndHearing={endHearing}
                  onPassOver={passOverHearing}
                />
              </div>
              <div className="md:hidden">
                <HearingsItemList
                  rows={pageRows}
                  seat={seat}
                  onOpenCase={openCase}
                  onStartHearing={startHearing}
                  onEndHearing={endHearing}
                  onPassOver={passOverHearing}
                />
              </div>
            </div>

            {liveMessage ? (
              <p className="sr-only" aria-live="polite">
                {liveMessage}
              </p>
            ) : null}

            <ListFooter
              id="hearings-page-size"
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
      </div>

      {/* Focus goes back to the cause title that opened it — the only thing that opens
          it now. Radix restores that; nothing here has to. */}
      <HearingOverviewDialog
        hearing={openHearing}
        seat={seat}
        /* The same two handlers the row presses, so a sitting called from the overlay
           and one called from the row are one act with one set of marks — including
           the announcement, which the overlay makes again inside itself because a
           modal hides this screen's announcer from assistive tech.
           Neither handler opens anything, which is what lets them be shared: pressed
           from in here the overlay is already open and stays open, and pressed from the
           row it does not open. */
        onStartHearing={startHearing}
        onEndHearing={endHearing}
        onOpenChange={(open) => {
          if (!open) setOpenHearingId(null);
        }}
      />
    </div>
  );
}

/**
 * Status, purpose, day and free text — all of them live.
 *
 * Filters only. The court-level action lives in the page header (`JoinVideoCourt`), so
 * this row holds nothing that is not a way of narrowing the list. Wraps rather than
 * scrolls, stacking to one control per line on narrow screens (RESPONSIVE).
 *
 * Every control carries a visible label. The reference labels none of them, leaning on
 * placeholders instead, which the accessibility floor treats as a defect rather than a
 * style (ACCESSIBILITY §12: placeholders may hint format, they are not labels) — so the
 * labels are the deviation, and the smallest one available.
 *
 * The Search button is gone, and its absence settles an inconsistency that was already
 * here: the hearing date filters the moment it was picked while the other three waited to
 * be asked for, so half this row behaved one way and half the other. All four now apply on
 * change. Nothing in the row has a meaningless in-between state — two selects, a calendar
 * and a text box — which is the test for whether a control can go live.
 *
 * That also settles the teal. Search carried `bg-primary` here despite the paragraph that
 * used to claim otherwise, so the board showed two strong fills at once: Search and Join
 * VC. Removing it leaves Join VC as the screen's single primary, which is what the Ration
 * Teal Law wanted — the court-level act this view exists for. It stays `aria-disabled`
 * with a tooltip that says why (video conferencing is not available yet).
 */
function HearingsFilters({
  filters,
  onChange,
  day,
  onDayChange,
  onClear,
}: {
  filters: HearingFilters;
  onChange: (filters: HearingFilters) => void;
  day: string;
  onDayChange: (day: string) => void;
  onClear: () => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="hearings-status" className="w-fit text-body-compact">
          Status
        </Label>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onChange({
              ...filters,
              status: value as HearingFilters["status"],
            })
          }
        >
          <SelectTrigger id="hearings-status" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TODAYS_CAUSE_STATUSES.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="hearings-purpose" className="w-fit text-body-compact">
          Purpose
        </Label>
        <Select
          value={filters.purpose}
          onValueChange={(value) =>
            onChange({
              ...filters,
              purpose: value as HearingFilters["purpose"],
            })
          }
        >
          <SelectTrigger id="hearings-purpose" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {COURT_HEARING_PURPOSES.map((purpose) => (
              <SelectItem key={purpose.id} value={purpose.id}>
                {purpose.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* `DatePicker` owns its trigger and takes no `id`, so the visible label names a
          group around it rather than pointing `htmlFor` at a control that does not
          exist. The trigger still announces the date it holds. */}
      <div className="flex min-w-0 flex-col gap-2">
        <span id="hearings-day-label" className="w-fit text-body-compact font-medium">
          Hearing date
        </span>
        <div role="group" aria-labelledby="hearings-day-label">
          <DatePicker
            value={parseIsoDay(day)}
            onValueChange={(next) => {
              if (next) onDayChange(isoDay(next));
            }}
            className="w-full sm:w-52"
          />
        </div>
      </div>

      <QueueSearchField
        label="Search cases"
        className="sm:w-52"
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Case name or number"
      />

      {/* The only button left on the row. It stays because it undoes more than the search
          box's own `×` does — status, purpose and the day go back to the board the screen
          opens on — and it is labelled for that rather than for the text it also happens
          to clear. */}
      <Button type="button" variant="ghost" onClick={onClear}>
        Clear filters
      </Button>
    </form>
  );
}

/**
 * The court's own action, in the page header beside the title.
 *
 * It belongs to the page, not to the list: joining the video court acts on the sitting
 * itself, so its scope is the screen and its home is the page chrome (ui-craft §0 —
 * placement encodes scope). Sat on the filter row it had no natural width, and once the
 * labelled filters filled that row it wrapped underneath them and read as a fifth filter.
 * The header also keeps it visible without scrolling past the controls.
 *
 * It is the screen's single teal action, and it is `aria-disabled` with a tooltip that
 * says why: video conferencing is not available yet. Primary paint still marks the
 * court-level act; the disabled state keeps the promise honest.
 */
function JoinVideoCourt() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-disabled className="w-full shrink-0 sm:w-fit">
            <VideoIcon data-icon="inline-start" aria-hidden />
            Join VC
          </Button>
        </TooltipTrigger>
        <TooltipContent>Not available yet</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a day the court has no listing for is not
 * the same as a filter that matched nothing, and only the second one has an action worth
 * offering. Borderless and unpadded — the panel around it is already the frame.
 */
function HearingsEmpty({
  day,
  isFiltered,
  onClear,
}: {
  day: string;
  isFiltered: boolean;
  onClear: () => void;
}) {
  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltered ? (
            <SearchXIcon aria-hidden />
          ) : (
            <CalendarX2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No matters match these filters" : "Nothing listed"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No matter on this day's list matches the status, purpose or search you asked for."
            : `This court has no hearings listed for ${formatCourtDay(day)}.`}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
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
 * A cause list read on a phone is still the court's serial, the cause, and where it
 * stands — the columns that only support scanning (counsel, purpose) drop to a caption
 * line rather than forcing a seven-column table through a 375px screen.
 */
function HearingsItemList({
  rows,
  seat,
  onOpenCase,
  onStartHearing,
  onEndHearing,
  onPassOver,
  onOpenOrder,
}: {
  rows: CourtHearing[];
  seat: CourtRole;
  onOpenCase: (hearing: CourtHearing) => void;
  onStartHearing: (hearing: CourtHearing) => void;
  onEndHearing: (hearing: CourtHearing) => void;
  onPassOver: (hearing: CourtHearing) => void;
  /** Optional, and unsupplied: see the note where `openOrder` used to be. */
  onOpenOrder?: (hearing: CourtHearing) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((hearing) => {
        const complainant = counselFor(hearing, "complainant");
        const accused = counselFor(hearing, "accused");
        return (
          <li
            key={hearing.id}
            {...rowActivation(
              "flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
            )}
          >
            {/* The serial and the cause stay one reading — a block opener would orphan
                the number on a line of its own. It is a flex row rather than inline
                flow because the opener is now a button, and a button does not flow
                between words the way an anchor's text did: the row keeps the number
                at the left and lets the cause wrap beside it. `min-h-0` drops the
                40×40 floor `rowOpenerClass` sets for the table cell — on a phone the
                whole item is the target (`rowActivation`), and a 40px box here would
                only lift the title off the number's baseline. */}
            <p className="flex min-w-0 items-baseline gap-1 text-body-compact font-medium">
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {hearing.item}.
              </span>
              <HearingCaseButton
                hearing={hearing}
                onOpen={onOpenCase}
                className="min-h-0 w-fit"
              />
            </p>
            <Badge
              variant={courtHearingStatusVariant(hearing.status)}
              className="w-fit"
            >
              {courtHearingStatusLabel(hearing.status)}
            </Badge>
            <p className="text-caption text-muted-foreground">
              <span className="tabular-nums">{hearing.caseNumber}</span> ·{" "}
              {courtHearingPurposeLabel(hearing.purpose)}
            </p>
            {/* Comfortable, not dense: on a phone the +N chip gets the full 40×40
                target, and a tap opens the same list the pointer hover does. */}
            <CounselCell
              complainant={complainant.map((counsel) => counsel.name)}
              accused={accused.map((counsel) => counsel.name)}
            />
            <HearingRowActions
              hearing={hearing}
              seat={seat}
              onStartHearing={onStartHearing}
              onEndHearing={onEndHearing}
              onPassOver={onPassOver}
              onOpenOrder={onOpenOrder}
            />
          </li>
        );
      })}
    </ul>
  );
}
