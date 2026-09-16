"use client";

import * as React from "react";
import {
  CalendarX2Icon,
  SearchXIcon,
  VideoIcon,
} from "lucide-react";

import { CounselCell } from "@/components/employee/counsel-cell";
import { HearingOverviewDialog } from "@/components/employee/hearing-overview-dialog";
import {
  HearingCaseLink,
  HearingRowActions,
  HearingsTable,
} from "@/components/employee/hearings-table";
import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { useCourtRole } from "@/components/employee/use-court-role";
import { useCourtToday } from "@/components/employee/use-court-today";
import { useHearingSession } from "@/components/employee/use-hearing-session";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CourtFilters } from "@/components/employee/court-filters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CourtRole } from "@/lib/employee/content";
import { seatHasBenchControls } from "@/lib/employee/court-role";
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
  /* The matter the bench has called and is reading, held as an id rather than a row:
     the row it names has just changed status, and a copy taken at click time would
     show the overlay a listing that is still scheduled. */
  const [openHearingId, setOpenHearingId] = React.useState<string | null>(null);

  const listed = withHearingSession(hearingsForDay(activeDay, today), session);
  const rows = filterHearings(listed, filters);

  /* All three announcements stay with the list, because the bench stays with it —
     Start hearing opens an overlay over this screen rather than navigating off it.
     The overlay names the matter and its new chip on open, so the line is a second
     confirmation for a reader who dismisses it, not the only one.
     None of the three runs in a seat that does not run the sitting: the controls that
     call them are simply not on the row, so the overlay never opens there either. The
     case overview is still one click away for that seat — the cause title, which reads
     rather than calls, and goes to the page. */
  function startHearing(hearing: CourtHearing) {
    markHearingOngoing(hearing.id);
    setOpenHearingId(hearing.id);
    setLiveMessage(`Hearing started for ${causeTitle(hearing)}`);
  }

  /**
   * The typist walking into a listing's order.
   *
   * For the bench, opening the composer is just navigation — the sitting is ended from
   * the row, deliberately, and a trip to type an order must not do it by accident.
   *
   * The typist has no session controls at all, so the trip is the whole sitting: the
   * matter is marked heard on the way in, which is what makes the row read Completed
   * when the trail brings them back. Marking it here rather than on the order screen is
   * what keeps the composer honest — it opens already knowing the sitting is over, so
   * the order it opens on is the finished one (`order-demo.ts`) rather than an empty
   * composer that fills in underneath the typing.
   *
   * Still not a court record. It is the same screen mark End hearing makes.
   */
  function openOrder(hearing: CourtHearing) {
    if (seatHasBenchControls(seat)) return;
    markHearingEnded(hearing.id);
  }

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
  const openHearing = listed.find((hearing) => hearing.id === openHearingId) ?? null;

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
          <h1 className="text-title text-balance font-semibold">
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
          today={today}
          onDayChange={(next) => {
            setDay(next);
            setPage(1);
          }}
          onClearDay={() => {
            setDay(null);
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
                  onStartHearing={startHearing}
                  onEndHearing={endHearing}
                  onPassOver={passOverHearing}
                  onOpenOrder={openOrder}
                />
              </div>
              <div className="md:hidden">
                <HearingsItemList
                  rows={pageRows}
                  seat={seat}
                  onStartHearing={startHearing}
                  onEndHearing={endHearing}
                  onPassOver={passOverHearing}
                  onOpenOrder={openOrder}
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

      {/* Focus goes back to the control that opened it, which by then reads End
          hearing — same slot, same node, the next move on the same matter. Radix
          restores it; nothing here has to. */}
      <HearingOverviewDialog
        hearing={openHearing}
        onOpenChange={(open) => {
          if (!open) setOpenHearingId(null);
        }}
      />
    </div>
  );
}

/**
 * The filter row: search inline, everything else behind a Filters button (owner,
 * 2026-09-15 — the advocate Cases pattern). The free text filters live where it is typed;
 * Status, Purpose and the hearing date fold into a right-hand sheet, and what is applied is
 * spelled out in removable chips on the row, so the folded controls never hide a narrowed
 * list. The court-level action (`JoinVideoCourt`) stays in the page header, not here.
 */
function HearingsFilters({
  filters,
  onChange,
  day,
  today,
  onDayChange,
  onClearDay,
  onClear,
}: {
  filters: HearingFilters;
  onChange: (filters: HearingFilters) => void;
  /** The day in view, already resolved to today when none is picked. */
  day: string;
  today: string;
  onDayChange: (day: string) => void;
  onClearDay: () => void;
  onClear: () => void;
}) {
  return (
    <CourtFilters
      search={{
        label: "Search cases",
        value: filters.query,
        onChange: (query) => onChange({ ...filters, query }),
        placeholder: "Case name or number",
      }}
      fields={[
        {
          id: "hearings-status",
          label: "Status",
          value: filters.status,
          all: "all",
          allLabel: "All statuses",
          options: TODAYS_CAUSE_STATUSES.map((status) => ({
            value: status.id,
            label: status.label,
          })),
          onApply: (value) =>
            onChange({ ...filters, status: value as HearingFilters["status"] }),
        },
        {
          id: "hearings-purpose",
          label: "Purpose",
          value: filters.purpose,
          all: "all",
          allLabel: "All purposes",
          options: COURT_HEARING_PURPOSES.map((purpose) => ({
            value: purpose.id,
            label: purpose.label,
          })),
          onApply: (value) =>
            onChange({ ...filters, purpose: value as HearingFilters["purpose"] }),
        },
      ]}
      date={{
        label: "Hearing date",
        value: parseIsoDay(day),
        active: day !== today,
        chipLabel: formatCourtDay(day),
        draftActive: (value) => !!value && isoDay(value) !== today,
        cleared: parseIsoDay(today),
        onApply: (value) => {
          if (value && isoDay(value) !== today) onDayChange(isoDay(value));
          else onClearDay();
        },
      }}
      onClearAll={onClear}
    />
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
  onStartHearing,
  onEndHearing,
  onPassOver,
  onOpenOrder,
}: {
  rows: CourtHearing[];
  seat: CourtRole;
  onStartHearing: (hearing: CourtHearing) => void;
  onEndHearing: (hearing: CourtHearing) => void;
  onPassOver: (hearing: CourtHearing) => void;
  onOpenOrder: (hearing: CourtHearing) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((hearing) => {
        const complainant = counselFor(hearing, "complainant");
        const accused = counselFor(hearing, "accused");
        return (
          <QueueItemRow
            key={hearing.id}
            className="flex flex-col gap-2"
          >
            <p className="min-w-0 text-body-compact font-medium">
              <span className="text-muted-foreground tabular-nums">
                {hearing.item}.
              </span>{" "}
              {/* Stays inline: the serial and the cause are one reading here, and a
                  block box would orphan the number on its own line. */}
              <HearingCaseLink hearing={hearing} className="w-fit" />
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
          </QueueItemRow>
        );
      })}
    </ul>
  );
}
