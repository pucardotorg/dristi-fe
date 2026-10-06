/**
 * The matters this court could move to another date — as data.
 *
 * Rescheduling in bulk is what a bench does when it is not going to sit: leave, transfer,
 * a court holiday declared late, a strike. The court pulls up everything listed across a
 * span of days and puts it on a new date in one act, rather than opening 20 case files.
 *
 * **There is no backend; the move is a demo move.** Confirming inside the overlay writes
 * the new date onto the matters for this session and nothing further — the board reads
 * back what the bench did, so the flow can be walked end to end, and that is the whole of
 * it. No notification is drawn up for the parties (the court's own
 * `notification-for-bulk-reschedule`), nobody is told, and nothing survives a reload. The
 * settled stage of the overlay says the second half of that out loud rather than letting
 * the screen imply the court has finished the act. Same bargain the registrations overlay
 * makes with its queue.
 *
 * **Today's rows are not restated here.** They are read out of `CAUSE_LIST` in
 * `./hearings`, so the two court-side screens cannot disagree about what this bench is
 * sitting on today. Only matters still `scheduled` are offered: one already heard,
 * abandoned or moved is not a matter this court can move again.
 *
 * The days after today are this module's own, and they are declared as **offsets** rather
 * than dates. A fixture pinned to 2026 goes stale the morning after it is written and
 * leaves the screen permanently empty; an offset is right whenever the screen is opened.
 */

import { CURRENT_STAFF, PRESIDING_MAGISTRATE } from "./content";
import {
  CAUSE_LIST,
  causeTitle,
  courtHearingPurposeLabel,
  formatOrderDate,
  isSittingDay,
  isoDay,
  parseIsoDay,
  type CourtCaseStage,
  type CourtHearingPurposeId,
} from "./hearings";

/**
 * Which half of the sitting a hearing is listed in.
 *
 * The court's own rescheduling order states it beside the date — the reference
 * product's notice has a "New (Rescheduled) Hearing Slot" column reading "Morning Slot"
 * — so a move names both, and the board keeps the slot every listing already has.
 */
export type HearingSlot = "morning" | "afternoon";

export const HEARING_SLOTS: readonly { id: HearingSlot; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
];

export function hearingSlotLabel(slot: HearingSlot): string {
  return slot === "morning" ? "Morning" : "Afternoon";
}

/** A place on the court's board: a sitting day and the slot within it. */
export type Listing = { day: string; slot: HearingSlot };

export type ReschedulableHearing = {
  id: string;
  caseNumber: string;
  /** "A v. B" — the cause title, the same way the case record writes it. */
  title: string;
  /** How far the case has got. */
  stage: CourtCaseStage;
  /** What this sitting is listed for. Not the same fact as the stage. */
  purpose: CourtHearingPurposeId;
  /** The day the court's board has this matter on, `YYYY-MM-DD`. */
  date: string;
  /** The slot it is listed in on that day. */
  slot: HearingSlot;
  /**
   * Where this session's bulk move has put it — absent on a matter nobody has moved.
   *
   * Held beside `date` rather than written over it, because a move is a change and a
   * change has two ends. A board that only ever showed where a matter now stands could
   * not tell the bench what it had just done: twenty rows would quietly take a new day
   * and the act that moved them would leave no mark on the thing it acted on. So the
   * day the matter was listed on stays where it is, this is the day it goes to, and the
   * board shows the pair (owner, 2026-09-15).
   */
  newDate?: string;
  /** The slot it moved to, beside `newDate`. */
  newSlot?: HearingSlot;
};

/**
 * The day a matter actually sits on — where this session moved it, else where it was
 * listed. Everything that asks *when* asks this; only the board, which shows the change
 * itself, reads the two fields apart.
 */
export function listedOn(row: ReschedulableHearing): string {
  return row.newDate ?? row.date;
}

/**
 * A listing on a day the court has already fixed, held as a distance from today **in
 * sitting days** — `offset: 1` is the next day this court sits, not tomorrow.
 *
 * Calendar days were the first reading and they cannot survive the sitting-day rule: an
 * offset of 5 from a Monday is a Saturday, so the fixture at that distance simply vanished
 * — and *which* fixtures vanished changed with the day of the week the screen was opened,
 * which is a board that cannot be tested or pointed at. Counting in sitting days keeps
 * every fixture on the board and keeps all of them on days the court is open, whatever
 * today happens to be.
 */
type UpcomingListing = Omit<ReschedulableHearing, "date" | "slot"> & { offset: number };

/**
 * The days ahead of today, on this bench's board.
 *
 * Shaped to exercise what the screen has to survive rather than to look busy: a cause
 * title long enough to wrap its column, complaint numbers that have not yet become
 * summary-trial numbers, every stage the journey names, and enough days that a range
 * wider than one is worth asking for.
 */
const UPCOMING: UpcomingListing[] = [
  {
    id: "r-799",
    caseNumber: "CMP/799/2026",
    title: "Ancy Varghese v. Kadavu Timber Depot",
    stage: "cognizance",
    purpose: "cognizance",
    offset: 1,
  },
  {
    id: "r-801",
    caseNumber: "CMP/801/2026",
    title: "Rahul Nambiar v. Sreelakshmi Agencies",
    stage: "cognizance",
    purpose: "admission",
    offset: 1,
  },
  {
    id: "r-266",
    caseNumber: "ST/266/2026",
    title: "Jayasree Menon v. Ashokan K",
    stage: "appearance",
    purpose: "appearance",
    offset: 1,
  },
  {
    id: "r-267",
    caseNumber: "ST/267/2026",
    title: "Noushad Ali v. Meridian Tyres and Retreading Works Pvt Ltd",
    stage: "evidence",
    purpose: "evidence-of-complainant",
    offset: 1,
  },
  {
    id: "r-803",
    caseNumber: "CMP/803/2026",
    title: "Sarita Balakrishnan v. Vayal Agri Products",
    stage: "cognizance",
    purpose: "delay-condonation",
    offset: 2,
  },
  {
    id: "r-268",
    caseNumber: "ST/268/2026",
    title: "Devika Ravindran v. Chackos Jewellery",
    stage: "plea",
    purpose: "plea",
    offset: 2,
  },
  {
    id: "r-269",
    caseNumber: "ST/269/2026",
    title: "Manaf Sadiq v. Greenfield Rubber Estates",
    stage: "evidence",
    purpose: "examination-of-accused-351",
    offset: 2,
  },
  {
    id: "r-807",
    caseNumber: "CMP/807/2026",
    title: "Bindu Rajan v. Alappat Hardware",
    stage: "process",
    purpose: "appearance",
    offset: 3,
  },
  {
    id: "r-270",
    caseNumber: "ST/270/2026",
    title: "Elizabeth Mathew v. Karunya Motors",
    stage: "arguments",
    purpose: "arguments",
    offset: 3,
  },
  {
    id: "r-271",
    caseNumber: "ST/271/2026",
    title: "Prakash Menon v. Sea Breeze Cold Storage",
    stage: "evidence",
    purpose: "for-reports",
    offset: 3,
  },
  {
    id: "r-808",
    caseNumber: "CMP/808/2026",
    title: "Shalini Dev v. Amrutha Fabrics",
    stage: "cognizance",
    purpose: "admission",
    offset: 5,
  },
  {
    id: "r-272",
    caseNumber: "ST/272/2026",
    title: "Ibrahim Kutty v. Pournami Chit Funds",
    stage: "judgement",
    purpose: "judgement",
    offset: 5,
  },
  {
    id: "r-273",
    caseNumber: "ST/273/2026",
    title: "Geetha Sasidharan v. Vismaya Builders",
    stage: "appearance",
    purpose: "bail",
    offset: 6,
  },
  {
    id: "r-842",
    caseNumber: "CMP/842/2026",
    title: "Anwar Sadath v. Neeraja Metals",
    stage: "cognizance",
    purpose: "cognizance",
    offset: 8,
  },
  {
    id: "r-274",
    caseNumber: "ST/274/2026",
    title: "Latha Vijayan v. Kollam Marine Foods",
    stage: "plea",
    purpose: "plea",
    offset: 8,
  },
  {
    id: "r-275",
    caseNumber: "ST/275/2026",
    title: "Sabu Cherian v. Highway Auto Works",
    stage: "evidence",
    purpose: "evidence-of-complainant",
    offset: 9,
  },
  /* Past the fortnight, and then past the month. A court fixes evidence and arguments
     six weeks out as a matter of course, and the board used to stop nine days from
     today — which left the range filter with almost nothing to do: every span wider
     than a week selected the whole screen, so asking for one looked like a control that
     did not work. A range is only worth drawing over a board deep enough to narrow. */
  {
    id: "r-276",
    caseNumber: "ST/276/2026",
    title: "Zainaba Musthafa v. Ashtamudi Cashew Exports",
    stage: "evidence",
    purpose: "evidence-of-complainant",
    offset: 13,
  },
  {
    id: "r-851",
    caseNumber: "CMP/851/2026",
    title: "Vinod Kumar P v. Thattamala Steels",
    stage: "cognizance",
    purpose: "admission",
    offset: 17,
  },
  {
    id: "r-277",
    caseNumber: "ST/277/2026",
    title: "Remani Amma v. Kundara Poultry Farms",
    stage: "evidence",
    purpose: "examination-of-accused-351",
    offset: 24,
  },
  {
    id: "r-278",
    caseNumber: "ST/278/2026",
    title: "Shajahan Kunju v. Paravur Cements",
    stage: "arguments",
    purpose: "arguments",
    offset: 36,
  },
  {
    id: "r-279",
    caseNumber: "ST/279/2026",
    title: "Preetha Krishnan v. Chavara Fisheries Co-operative",
    stage: "judgement",
    purpose: "judgement",
    offset: 47,
  },
];

/** How far ahead the prototype's board reaches — forty sittings, about eight weeks. */
const BOARD_SITTINGS = 40;

/**
 * Names for the days the hand-written fixtures do not reach.
 *
 * `UPCOMING` above is deliberate: long titles, every stage, complaint numbers beside
 * summary-trial ones. It covers twelve sittings out of forty, which was enough while
 * the board opened unasked and the bench arrived on everything. It is not enough now that
 * the screen opens on one day and the range is the way around: a bench moving Thursday's
 * board wants Thursday to have something on it (owner, 2026-09-16 — *"cases for all
 * dates"*).
 *
 * So every sitting day the fixtures miss gets two or three matters drawn from these,
 * deterministically by day, because a board that reshuffles between renders is a board
 * nobody can point at twice.
 */
const FILLER_PARTIES: { complainant: string; respondent: string }[] = [
  { complainant: "Vijayan Pillai", respondent: "Kollam Coir Traders" },
  { complainant: "Leela Mohan", respondent: "Ashtamudi Marine Exports" },
  { complainant: "Sabu Chacko", respondent: "Thevally Steel Syndicate" },
  { complainant: "Girija Damodaran", respondent: "Punalur Paper Agencies" },
  { complainant: "Anil Kurup", respondent: "Kottarakkara Cashew Works" },
  { complainant: "Remya Suresh", respondent: "Chinnakada Gold Palace" },
  { complainant: "Basheer Kunju", respondent: "Karunagappally Tile Company" },
  { complainant: "Sheela Thomas", respondent: "Paravur Lake Resorts Pvt Ltd" },
  { complainant: "Manoj Prasad", respondent: "Kundara Rubber Industries" },
  { complainant: "Fathima Rasheed", respondent: "Chathannoor Poultry Farm" },
  { complainant: "Unnikrishnan Nair", respondent: "Sasthamcotta Transport Service" },
  { complainant: "Devika Ramesh", respondent: "Anchalummoodu Timber Mart" },
  { complainant: "Joseph Varkey", respondent: "Neendakara Fishing Fleet" },
  { complainant: "Sreelatha Vijayan", respondent: "Pathanapuram Spice Board Agency" },
  { complainant: "Riyas Muhammed", respondent: "Kadappakada Auto Works" },
];

const FILLER_STAGES: { stage: CourtCaseStage; purpose: CourtHearingPurposeId }[] = [
  { stage: "cognizance", purpose: "cognizance" },
  { stage: "cognizance", purpose: "delay-condonation" },
  { stage: "process", purpose: "appearance" },
  { stage: "appearance", purpose: "admission" },
  { stage: "plea", purpose: "plea" },
  { stage: "evidence", purpose: "evidence-of-complainant" },
  { stage: "evidence", purpose: "for-reports" },
  { stage: "arguments", purpose: "arguments" },
  { stage: "judgement", purpose: "judgement" },
  { stage: "appearance", purpose: "bail" },
];

/**
 * The matters on one day that the fixtures left empty.
 *
 * Two or three, alternating, so consecutive days do not look stamped from one template;
 * the party and the stage advance on their own cycles so a day is not three rows of the
 * same posture either. Case numbers run in their own series (`ST/4xx`, `CMP/9xx`) so they
 * can never collide with a hand-written fixture.
 */
function fillerFor(sitting: number): UpcomingListing[] {
  /* A court's days are uneven — a light Monday, a heavy Thursday — and the scheduler
     only has somewhere to put a cleared day if some days have room. 6 to 18 a day. */
  const count = 6 + ((sitting * 7) % 13);
  return Array.from({ length: count }, (_, index) => {
    const seed = sitting * 20 + index;
    const parties = FILLER_PARTIES[seed % FILLER_PARTIES.length];
    const posture = FILLER_STAGES[seed % FILLER_STAGES.length];
    const summary = seed % 3 !== 0;
    const serial = 400 + seed;
    return {
      id: `r-fill-${sitting}-${index}`,
      caseNumber: summary ? `ST/${serial}/2026` : `CMP/${serial + 500}/2026`,
      title: `${parties.complainant} v. ${parties.respondent}`,
      stage: posture.stage,
      purpose: posture.purpose,
      offset: sitting,
    };
  });
}

/** `YYYY-MM-DD`, `n` days on. Built through a Date so month and year ends are the OS's. */
export function addDays(day: string, count: number): string {
  const date = parseIsoDay(day);
  date.setDate(date.getDate() + count);
  return isoDay(date);
}

/**
 * The `n`th day this court sits after `from` — weekends skipped, never counted.
 *
 * Here rather than beside `isSittingDay` because it needs `addDays`, and `hearings.ts`
 * importing this module back would be a cycle. The predicate is the shared fact; walking
 * it is arithmetic.
 */
function nthSittingDay(from: string, count: number): string {
  let day = from;
  for (let step = 0; step < count; step += 1) {
    do {
      day = addDays(day, 1);
    } while (!isSittingDay(day));
  }
  return day;
}

/**
 * The order a board reads in: by the day it sits on, then by the court's own number, so
 * a matter keeps its place when the range widens — and when a move lands it in a
 * different day's block.
 */
function byListing(a: ReschedulableHearing, b: ReschedulableHearing): number {
  return (
    listedOn(a).localeCompare(listedOn(b)) ||
    a.caseNumber.localeCompare(b.caseNumber)
  );
}

/**
 * Everything this court could move, today first.
 */
export function reschedulableHearings(today: string): ReschedulableHearing[] {
  const listedToday: ReschedulableHearing[] = CAUSE_LIST.filter(
    (hearing) => hearing.status === "scheduled",
  ).map((hearing) => ({
    id: hearing.id,
    caseNumber: hearing.caseNumber,
    title: causeTitle(hearing),
    stage: hearing.stage,
    purpose: hearing.purpose,
    date: today,
    slot: "morning" as HearingSlot,
  }));

  /* Every sitting day in the window, so a range drawn anywhere inside it lands on
     something: the hand-written listings where there are any, filler where there are
     none, and nothing at all on a day the court is closed. */
  const spoken = new Set(UPCOMING.map((listing) => listing.offset));
  const ahead: ReschedulableHearing[] = [];
  for (let sitting = 1; sitting <= BOARD_SITTINGS; sitting += 1) {
    const date = nthSittingDay(today, sitting);
    const listings = [
      ...(spoken.has(sitting)
        ? UPCOMING.filter((listing) => listing.offset === sitting)
        : []),
      ...fillerFor(sitting),
    ];
    for (const listing of listings) {
      ahead.push({
        id: listing.id,
        caseNumber: listing.caseNumber,
        title: listing.title,
        stage: listing.stage,
        purpose: listing.purpose,
        date,
        slot: "morning",
      });
    }
  }

  return withSlots([...listedToday, ...ahead].sort(byListing));
}

/**
 * Each day's listings split across its two slots in board order — the first half in the
 * morning, the rest after lunch. The fixtures carry no slot of their own, and a day read
 * top to bottom is the order the court calls it in.
 */
function withSlots(rows: ReschedulableHearing[]): ReschedulableHearing[] {
  const perDay = new Map<string, number>();
  for (const row of rows) perDay.set(row.date, (perDay.get(row.date) ?? 0) + 1);
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const index = seen.get(row.date) ?? 0;
    seen.set(row.date, index + 1);
    const morning = Math.ceil((perDay.get(row.date) ?? 0) / 2);
    return { ...row, slot: index < morning ? "morning" : "afternoon" };
  });
}

/**
 * The board as this session left it.
 *
 * The fixture with whatever the bench has already moved written over it, back in board
 * order — a matter moved to next Tuesday has to fall into next Tuesday's block, not stay
 * in the one it was pulled out of. Recomputed from the fixture on every read rather than
 * held as a mutated list, so there is one source for what is listed and the moves are a
 * layer over it that a reload drops.
 */
export function boardAfterMoves(
  today: string,
  moved: Readonly<Record<string, Listing>>,
): ReschedulableHearing[] {
  return reschedulableHearings(today)
    .map((row) => {
      const to = moved[row.id];
      /* A move onto the day the matter is already on is not a move, and a row carrying
         a new date equal to its old one would put a second date on the board saying
         nothing. The overlay's calendar cannot offer that day, so this is a floor under
         the data rather than a case the screen reaches. */
      return to && to.day !== row.date
        ? { ...row, newDate: to.day, newSlot: to.slot }
        : row;
    })
    .sort(byListing);
}

/** One day the bench moved matters to, and how many went there. */
export type RescheduledDay = { day: string; count: number };

/**
 * The days this session moved matters to, ascending, each with its tally.
 *
 * A session is not one act. A court that is not sitting on the 15th moves that day's
 * board to the 17th, then looks at the fortnight after and moves eight more to 9 October
 * — two decisions, two days, one afternoon. The record has to hold both.
 *
 * **This returns the days, not the rows under them.** It used to return the rows too
 * (`groupByNewListing`), because the record was a stack of tables with a date heading
 * over each. The record is now one table with a *New hearing date* column, and the days
 * are what its filter offers (owner, 2026-09-16) — so what a caller needs is the list of
 * dates and, for each, how much is waiting there. The tally is the number worth having:
 * it is how a bench decides which date to look at, which is the moment the filter is
 * open.
 *
 * Rows keep the order the board gave them — `boardAfterMoves` has already sorted by the
 * day a matter now sits on and then by the court's own number — so the flat table reads
 * date by date without anything here sorting it again.
 */
export function rescheduledDays(
  rows: ReschedulableHearing[],
): RescheduledDay[] {
  const tally = new Map<string, number>();
  for (const row of rows) {
    if (row.newDate === undefined) continue;
    tally.set(row.newDate, (tally.get(row.newDate) ?? 0) + 1);
  }
  return [...tally]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
}

export type RescheduleFilters = {
  /**
   * First and last listing date to pull in, inclusive — or `null` for no bound.
   *
   * The screen used to open on today and only today, and to say so by writing today into
   * both ends. That default is what made the range control read as already answered: the
   * calendar opened with a day lit, and the next click was taken as the *other* end of a
   * span starting there rather than as a first choice (owner, 2026-09-13). So an unasked
   * range is now genuinely unasked — the board shows everything this court has listed,
   * and the first click on the calendar is a first date.
   */
  from: string | null;
  to: string | null;
  /** Free text over the cause title and the case number — what the bench can recall. */
  query: string;
};

export function filterReschedulable(
  rows: ReschedulableHearing[],
  filters: RescheduleFilters,
): ReschedulableHearing[] {
  const query = filters.query.trim().toLowerCase();

  /* ISO days sort as strings, so each bound is a plain comparison — no Date per row.
     A `null` end is not a bound at all rather than a bound at today. */
  const inSpan = (day: string) =>
    (filters.from === null || day >= filters.from) &&
    (filters.to === null || day <= filters.to);

  return rows.filter((row) => {
    /* Judged on the day the matter stands listed on — which for a matter this session
       moved is the day it moved to.
       
       This used to let either end of the move keep a row in range, so that the bench
       could see what it had just done. That job now belongs to the Scheduled tab, which
       this filter does not touch: a range is a lens for finding matters to move, and
       nothing about narrowing it should hide work already finished. Leaving the rule
       here made the record answer to the lens — reschedule three matters, then move the
       range on to the next fortnight, and the Scheduled tab read zero (owner,
       2026-09-15). */
    if (!inSpan(listedOn(row))) return false;
    if (!query) return true;
    return `${row.title} ${row.caseNumber}`.toLowerCase().includes(query);
  });
}

/** The last day any of these matters currently stands listed on. */
function lastListedDay(rows: ReschedulableHearing[]): string | null {
  let last: string | null = null;
  for (const row of rows) {
    const day = listedOn(row);
    if (last === null || day > last) last = day;
  }
  return last;
}

/**
 * The first day a bulk move can land on.
 *
 * A bulk move is one act in one direction — the court is not sitting across a span, so
 * the span goes forward — and a new date *inside* the days being moved would send the
 * matters listed before it forward and the ones listed after it backward, which is two
 * acts wearing one button. It would also silently do nothing to whatever was already
 * listed on the day picked.
 *
 * So the floor is whichever of these is latest, and the day after it is the first the
 * overlay's calendar will offer:
 *
 * - **The span the bench asked the board for.** This is the one that matters, and it is
 *   the reason this takes `spanEnd` rather than reading the rows alone: a court that has
 *   said "13 September to 12 October" has declared those days dealt with, and offering a
 *   new date inside them invites exactly the mistaken pick the span was drawn to avoid —
 *   even where nothing happens to be listed in the tail of it (owner, 2026-09-13).
 * - **The last day any selected matter is listed**, which covers the board with no span
 *   asked for at all.
 * - **Today**, because a listing cannot be made in the past.
 */
export function earliestNewListing(
  rows: ReschedulableHearing[],
  spanEnd: string | null,
  today: string,
): string {
  let floor = today;
  const last = lastListedDay(rows);
  if (last !== null && last > floor) floor = last;
  if (spanEnd !== null && spanEnd > floor) floor = spanEnd;
  return addDays(floor, 1);
}

/**
 * The new dates the bench has drawn up and not yet signed, by matter.
 *
 * A plan rather than a move: nothing on the board changes until the order is signed, so
 * the bench can auto-place a day's list, pull a few back, put one advocate's matters on
 * the same day and leave the rest for later — in any order, and as many times as it
 * likes (owner, 2026-10-06: "it cannot fall into a wizard or a choice"). Signing turns
 * the plan into moves.
 */
export type RescheduleDraft = Readonly<Record<string, Listing>>;

/** Where a matter will sit once the draft is counted: drafted, else moved, else listed. */
export function placeOf(
  row: ReschedulableHearing,
  draft: RescheduleDraft,
): Listing {
  return (
    draft[row.id] ??
    (row.newDate !== undefined
      ? { day: row.newDate, slot: row.newSlot ?? "morning" }
      : { day: row.date, slot: row.slot })
  );
}

/**
 * How many hearings a day holds once the draft is counted — in one slot, or the whole
 * day. This is what the bench reads before it adds to a day: "12 → 15 hearings".
 */
export function loadOn(
  board: ReschedulableHearing[],
  draft: RescheduleDraft,
  day: string,
  slot?: HearingSlot,
): number {
  let count = 0;
  for (const row of board) {
    const place = placeOf(row, draft);
    if (place.day === day && (slot === undefined || place.slot === slot)) count += 1;
  }
  return count;
}

/** The sitting day after `day`. */
export function nextSittingDay(day: string): string {
  return nthSittingDay(day, 1);
}

/**
 * The most hearings this court takes in a day, read off its own board: the heaviest of
 * the next twenty sittings from `from`. Auto-place fills the lighter days up to it and no
 * further, and a day pushed past it is the one a new-date filter marks — so "more than
 * usual" means more than this court already carries on its busiest day, not a number
 * written in.
 */
export function usualDayLoad(board: ReschedulableHearing[], from: string): number {
  const days: string[] = [];
  let day = isSittingDay(from) ? from : nextSittingDay(from);
  for (let i = 0; i < 20; i += 1) {
    days.push(day);
    day = nextSittingDay(day);
  }
  const heaviest = days.reduce(
    (most, each) =>
      Math.max(most, board.filter((row) => row.date === each).length),
    0,
  );
  return Math.max(1, heaviest);
}

/**
 * New dates for `rows`, from the scheduler — a stand-in for the court's own algorithm.
 *
 * Walks the sitting days from `floor` and fills each up to the court's busiest day, in
 * whichever slot is lighter at that moment, keeping the rows in board order so matters
 * listed together stay together. Anything already in the draft for other matters is
 * counted as taken; the rows being placed are not, so placing them again re-flows them
 * rather than stacking on top of themselves.
 */
export function autoPlace(
  board: ReschedulableHearing[],
  draft: RescheduleDraft,
  rows: ReschedulableHearing[],
  floor: string,
): Record<string, Listing> {
  const moving = new Set(rows.map((row) => row.id));
  const others = board.filter((row) => !moving.has(row.id));
  const placed: Record<string, Listing> = {};
  const ordered = [...rows].sort(byListing);
  const cap = usualDayLoad(board, floor);
  let day = isSittingDay(floor) ? floor : nextSittingDay(floor);
  let next = 0;
  for (let guard = 0; next < ordered.length && guard < 400; guard += 1) {
    let morning = loadOn(others, draft, day, "morning");
    let afternoon = loadOn(others, draft, day, "afternoon");
    let room = cap - morning - afternoon;
    while (room > 0 && next < ordered.length) {
      const slot: HearingSlot = morning <= afternoon ? "morning" : "afternoon";
      if (slot === "morning") morning += 1;
      else afternoon += 1;
      placed[ordered[next].id] = { day, slot };
      next += 1;
      room -= 1;
    }
    day = nextSittingDay(day);
  }
  return placed;
}

/**
 * The day the scheduler suggests for `rows` when the bench sets one date by hand: the
 * earliest sitting day from `floor` that takes all of them without going past the
 * court's busiest day — and, when no day in the next six weeks can, the lightest one.
 * `fits` says which it is, so the screen can say why.
 */
export function suggestDay(
  board: ReschedulableHearing[],
  draft: RescheduleDraft,
  rows: ReschedulableHearing[],
  floor: string,
): { day: string; fits: boolean } {
  const moving = new Set(rows.map((row) => row.id));
  const others = board.filter((row) => !moving.has(row.id));
  const cap = usualDayLoad(board, floor);
  let day = isSittingDay(floor) ? floor : nextSittingDay(floor);
  let lightest = { day, load: Number.POSITIVE_INFINITY };
  for (let i = 0; i < 30; i += 1) {
    const load = loadOn(others, draft, day);
    if (load + rows.length <= cap) return { day, fits: true };
    if (load < lightest.load) lightest = { day, load };
    day = nextSittingDay(day);
  }
  return { day: lightest.day, fits: false };
}

/**
 * Why the court is not sitting — the ground the order states.
 *
 * The three the court's current product offers when it reschedules in bulk. The bench
 * picks one; the order recites it in the court's own register.
 */
export const RESCHEDULE_REASONS = [
  {
    id: "non-working-day",
    label: "Court non-working day",
    ground: "a court non-working day",
  },
  {
    id: "planned-leave",
    label: "Judge’s planned leave",
    ground: "the planned leave of the presiding officer",
  },
  {
    id: "emergency-leave",
    label: "Judge’s emergency leave",
    ground: "the emergency leave of the presiding officer",
  },
] as const;

export type RescheduleReasonId = (typeof RESCHEDULE_REASONS)[number]["id"];

export function rescheduleReason(id: RescheduleReasonId) {
  return RESCHEDULE_REASONS.find((reason) => reason.id === id)!;
}

/**
 * The order a bulk move is passed by.
 *
 * A court does not move twenty matters by editing twenty rows: it passes one order, and
 * the order is what the case files carry afterwards. The bench signs it before anything
 * moves (Anshumanth, 2026-09-15).
 *
 * **One order for every new date.** However many days the matters are spread across,
 * they go out together in one table, sorted by the day and slot they move to — one
 * signature, not one per date (owner, 2026-10-06).
 *
 * It recites the ground the bench chose and nothing it did not. It directs nothing at the
 * parties: no notification is drawn up on this branch, so the paper does not pretend to
 * order one.
 */
export type RescheduleOrder = {
  /** "Before the JMFC Court 1, Kollam". */
  court: string;
  title: string;
  /** The operative words. */
  paragraphs: string[];
  /** What the order covers, one line each, by the day and slot each goes to. */
  matters: {
    caseNumber: string;
    matter: string;
    listedFor: string;
    from: string;
    to: string;
    slot: string;
  }[];
  dated: string;
  /** Who signs, and whether they have. */
  signature: string;
};

export function buildRescheduleOrder(
  rows: { row: ReschedulableHearing; to: Listing }[],
  /** The ground the bench chose; absent while it has not chosen one. */
  reason: RescheduleReasonId | null,
  /** The day the order is passed. */
  today: string,
  /**
   * Present once the signature has gone on, absent before it.
   *
   * The signature block is the one part of the paper that is not the same before and
   * after the act, and it must be read at the moment it is written: a copy taken on the
   * signing step and handed back on the settled step would print "Pending the signature
   * of the magistrate" across an order the bench has just signed — the same trap
   * `sign-process` documents on its own bundle.
   */
  signedOn?: string,
): RescheduleOrder {
  const sorted = [...rows].sort(
    (a, b) =>
      a.to.day.localeCompare(b.to.day) ||
      (a.to.slot === b.to.slot ? 0 : a.to.slot === "morning" ? -1 : 1) ||
      a.row.caseNumber.localeCompare(b.row.caseNumber, undefined, { numeric: true }),
  );
  const from = [...new Set(rows.map(({ row }) => listedOn(row)))].sort();
  const notSitting =
    from.length === 0
      ? ""
      : from.length === 1
        ? ` on ${formatOrderDate(from[0])}`
        : ` from ${formatOrderDate(from[0])} to ${formatOrderDate(from[from.length - 1])}`;
  const ground = reason ? rescheduleReason(reason).ground : null;
  return {
    court: `Before the ${CURRENT_STAFF.court}`,
    title: "Order rescheduling listed hearings",
    paragraphs: [
      ground
        ? `Owing to ${ground}, this court will not sit${notSitting}.`
        : `This court will not sit${notSitting}.`,
      `The matters listed below stand adjourned from the dates shown against them, and are listed for hearing before this court on the dates and in the slots shown.`,
    ],
    matters: sorted.map(({ row, to }) => ({
      caseNumber: row.caseNumber,
      matter: row.title,
      listedFor: courtHearingPurposeLabel(row.purpose),
      from: formatOrderDate(listedOn(row)),
      to: formatOrderDate(to.day),
      slot: hearingSlotLabel(to.slot),
    })),
    dated: formatOrderDate(today),
    signature: signedOn
      ? `Signed by ${PRESIDING_MAGISTRATE.name}, ${PRESIDING_MAGISTRATE.designation}, ${CURRENT_STAFF.court}, on ${formatOrderDate(signedOn)}.`
      : "Pending the signature of the magistrate.",
  };
}

/** The order as a plain-text facsimile — the shape every other court paper here takes. */
export function rescheduleOrderText(order: RescheduleOrder): string {
  return [
    order.court,
    "",
    order.title,
    "",
    ...order.paragraphs.map((paragraph, index) => `${index + 1}. ${paragraph}`),
    "",
    `Matters (${order.matters.length})`,
    ...order.matters.map(
      (matter) =>
        `${matter.caseNumber} · ${matter.matter} · ${matter.listedFor} · ${matter.from} → ${matter.to}, ${matter.slot.toLowerCase()}`,
    ),
    "",
    `Dated this the ${order.dated}.`,
    "",
    order.signature,
  ].join("\n");
}

export function rescheduleOrderFilename(order: RescheduleOrder): string {
  return `reschedule-order-${order.matters.length}-matters.txt`;
}

/**
 * Put the order in the bench's hands.
 *
 * Offered on the signing step, where the paper is off screen and the bench is one click
 * from committing, and again once it is signed — the two moments the reference offers a
 * court paper. Same blob-and-anchor the process and application documents use; nothing
 * is filed and no record is minted.
 */
export function downloadRescheduleOrder(order: RescheduleOrder): void {
  const url = URL.createObjectURL(
    new Blob([rescheduleOrderText(order)], { type: "text/plain" }),
  );
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = rescheduleOrderFilename(order);
  anchor.click();
  URL.revokeObjectURL(url);
}
