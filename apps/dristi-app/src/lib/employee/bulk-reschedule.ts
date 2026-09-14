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

import {
  CAUSE_LIST,
  causeTitle,
  isoDay,
  parseIsoDay,
  type CourtCaseStage,
  type CourtHearingPurposeId,
} from "./hearings";

export type ReschedulableHearing = {
  id: string;
  caseNumber: string;
  /** "A v. B" — the cause title, the same way the case record writes it. */
  title: string;
  /** How far the case has got. */
  stage: CourtCaseStage;
  /** What this sitting is listed for. Not the same fact as the stage. */
  purpose: CourtHearingPurposeId;
  /** The date the matter currently stands listed for, `YYYY-MM-DD`. */
  date: string;
};

/** A listing on a day the court has already fixed, held as a distance from today. */
type UpcomingListing = Omit<ReschedulableHearing, "date"> & { offset: number };

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

/** `YYYY-MM-DD`, `n` days on. Built through a Date so month and year ends are the OS's. */
export function addDays(day: string, count: number): string {
  const date = parseIsoDay(day);
  date.setDate(date.getDate() + count);
  return isoDay(date);
}

/**
 * The order a board reads in: by the day it sits on, then by the court's own number, so
 * a matter keeps its place when the range widens — and when a move lands it in a
 * different day's block.
 */
function byListing(a: ReschedulableHearing, b: ReschedulableHearing): number {
  return (
    a.date.localeCompare(b.date) || a.caseNumber.localeCompare(b.caseNumber)
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
  }));

  const ahead: ReschedulableHearing[] = UPCOMING.map(
    ({ offset, ...listing }) => ({
      ...listing,
      date: addDays(today, offset),
    }),
  );

  return [...listedToday, ...ahead].sort(byListing);
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
  moved: Readonly<Record<string, string>>,
): ReschedulableHearing[] {
  return reschedulableHearings(today)
    .map((row) => (moved[row.id] ? { ...row, date: moved[row.id] } : row))
    .sort(byListing);
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
  return rows.filter((row) => {
    /* ISO days sort as strings, so each bound is a plain comparison — no Date per row.
       A `null` end is not a bound at all rather than a bound at today. */
    if (filters.from !== null && row.date < filters.from) return false;
    if (filters.to !== null && row.date > filters.to) return false;
    if (!query) return true;
    return `${row.title} ${row.caseNumber}`.toLowerCase().includes(query);
  });
}

/** The last day any of these matters currently stands listed on. */
function lastListedDay(rows: ReschedulableHearing[]): string | null {
  let last: string | null = null;
  for (const row of rows) if (last === null || row.date > last) last = row.date;
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
