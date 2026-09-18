/**
 * The facts behind one listing's case overview — the page the bench opens when it
 * starts a hearing.
 *
 * Restated here rather than imported from `lib/cases/peek.ts` because the employee
 * area does not read the citizen side (see `content.ts`). The *shape* of the glance
 * is the same one: parties, stage, the last sitting, a short history.
 * Advocate-only facts — "you appear", pending tasks, a link into the advocate case
 * file — are not restated. There is no court-side case file yet, which is also why
 * the overview page's View case action is not wired to one.
 *
 * **There is no backend.** Extras are demo rows keyed to `CAUSE_LIST`, enough for
 * the page to survive a first listing (no last sitting) and a part-heard evidence
 * matter (an order of the day). A hearing with no extras still renders: the listing
 * itself is the case.
 */

import {
  COURT_CASE_STAGES,
  courtHearingPurposeLabel,
  formatListingDate,
  parseIsoDay,
  shiftDay,
  type CourtCaseStage,
  type CourtHearing,
} from "./hearings";
import {
  FILING_WINDOW_DAYS,
  NOTICE_WINDOW_DAYS,
  PAYMENT_WINDOW_DAYS,
  PRESENTATION_WINDOW_DAYS,
  niWindowNote,
  type NiWindowStatus,
} from "./ni-act";

export type HearingCaseExtras = {
  filedOn?: string;
  chequeAmount?: number;
  lastHearing?: {
    on: string;
    purpose: string;
    order: string;
    directed: boolean;
  };
};

export function formatCaseDate(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseIsoDay(day));
}

export function formatCaseWeekday(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseIsoDay(day));
}

export function formatChequeAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "A and B" — the same sentence the advocate peek uses for counsel. */
export function formatCounselList(names: string[]): string {
  return new Intl.ListFormat("en-IN", {
    style: "long",
    type: "conjunction",
  }).format(names);
}

export function hearingCaseExtras(id: string): HearingCaseExtras {
  return HEARING_CASE_EXTRAS[id] ?? {};
}

const HEARING_CASE_EXTRAS: Partial<Record<string, HearingCaseExtras>> = {
  "h-241": {
    filedOn: "2026-03-12",
    chequeAmount: 450000,
    lastHearing: {
      on: "2026-08-19",
      purpose: "Evidence of complainant",
      order:
        "PW-1 was examined in chief and partly cross-examined. Further cross-examination was deferred at the request of counsel for the accused. The complainant was directed to keep PW-2 present and produce the original bank return memo on the next posting date.",
      directed: true,
    },
  },
  "h-243": {
    filedOn: "2026-06-04",
    chequeAmount: 180000,
  },
  "h-244": {
    filedOn: "2026-05-22",
    chequeAmount: 275000,
  },
  "h-245": {
    filedOn: "2026-07-08",
    chequeAmount: 90000,
  },
  "h-246": {
    filedOn: "2026-07-15",
    chequeAmount: 150000,
  },
  "h-247": {
    filedOn: "2026-04-30",
    chequeAmount: 320000,
  },
  "h-248": {
    filedOn: "2026-02-18",
    chequeAmount: 210000,
    lastHearing: {
      on: "2026-08-12",
      purpose: "Plea",
      order:
        "Accused pleaded not guilty. Matter posted for evidence of the complainant.",
      directed: true,
    },
  },
  "h-249": {
    filedOn: "2026-06-28",
    chequeAmount: 125000,
  },
  "h-250": {
    filedOn: "2026-01-16",
    chequeAmount: 620000,
    lastHearing: {
      on: "2026-08-05",
      purpose: "Evidence of complainant",
      order:
        "PW-1's examination-in-chief concluded. Cross-examination to continue.",
      directed: false,
    },
  },
  "h-251": {
    filedOn: "2025-11-04",
    chequeAmount: 840000,
    lastHearing: {
      on: "2026-07-29",
      purpose: "For reports",
      order:
        "Forensic report awaited. Matter posted for reports to be received.",
      directed: true,
    },
  },
  "h-252": {
    filedOn: "2026-06-11",
    chequeAmount: 95000,
  },
  "h-253": {
    filedOn: "2025-09-18",
    chequeAmount: 340000,
    lastHearing: {
      on: "2026-08-26",
      purpose: "Examination of accused under S. 351 BNSS",
      order:
        "Examination of the accused begun. Matter part-heard and posted for continuation.",
      directed: false,
    },
  },
  "h-254": {
    filedOn: "2025-08-07",
    chequeAmount: 410000,
    lastHearing: {
      on: "2026-08-14",
      purpose: "Arguments",
      order: "Arguments heard. Judgment reserved.",
      directed: true,
    },
  },
  "h-255": {
    filedOn: "2026-05-09",
    chequeAmount: 175000,
  },
  "h-256": {
    filedOn: "2026-07-02",
    chequeAmount: 80000,
  },
  "h-257": {
    filedOn: "2026-04-21",
    chequeAmount: 260000,
  },
  "h-258": {
    filedOn: "2026-01-28",
    chequeAmount: 390000,
    lastHearing: {
      on: "2026-08-21",
      purpose: "Evidence of complainant",
      order: "PW-1 kept present. Examination-in-chief to continue.",
      directed: false,
    },
  },
  "h-259": {
    filedOn: "2026-06-19",
    chequeAmount: 110000,
  },
  "h-260": {
    filedOn: "2025-06-03",
    chequeAmount: 505000,
    lastHearing: {
      on: "2026-08-28",
      purpose: "Arguments",
      order: "Arguments concluded. Posted for judgment.",
      directed: true,
    },
  },
  "h-261": {
    filedOn: "2026-03-27",
    chequeAmount: 145000,
    lastHearing: {
      on: "2026-07-22",
      purpose: "Appearance",
      order: "Accused appeared. Posted for plea.",
      directed: true,
    },
  },
  "h-262": {
    filedOn: "2026-07-11",
    chequeAmount: 70000,
  },
  "h-263": {
    filedOn: "2025-12-16",
    chequeAmount: 230000,
    lastHearing: {
      on: "2026-08-07",
      purpose: "Arguments",
      order: "Part-heard. Counsel for the accused to conclude.",
      directed: false,
    },
  },
  "h-264": {
    filedOn: "2026-05-14",
    chequeAmount: 160000,
  },
};

/* ──────────────────────────── the case's timeline ─────────────────────────── */

/**
 * One dated step in a matter's life, as the timeline prints it.
 *
 * `on` is `null` for the step that has not closed — today's sitting, which is happening
 * while the bench reads this. Everything else carries the day it closed, because a date
 * is the one form of this fact nobody has to re-anchor to anything (owner, 2026-09-12).
 */
export type CaseTimelineStep = {
  id: string;
  label: string;
  on: string | null;
  /** What the step means: the statutory window it closes. Never the arithmetic. */
  note?: string;
  aside?: string;
  tone?: "warning";
  status: "past" | "current";
};

/**
 * A matter in two phases — what happened to the cheque, and what the court has done.
 *
 * The split is the one the register queue already draws (`register-case-screen.tsx`),
 * because it is the real one: everything above the line happened to two private parties
 * and is measured against §138, and everything below it is the court's own record.
 */
export type CaseTimeline = {
  beforeFiling: CaseTimelineStep[];
  inCourt: CaseTimelineStep[];
};

/** "12 Jul 2025" — the day as it sits in a column of other days. */
export function formatTimelineDate(day: string): string {
  return formatListingDate(day);
}

/**
 * The serial out of a case number — "ST/241/2026" is 241.
 *
 * The serial rather than the whole string because it is the part that differs between
 * two matters of the same year: seeding off the year would give every case on the board
 * an identical chain.
 */
function seedOf(caseNumber: string): number {
  const serial = caseNumber.match(/(\d+)/);
  return serial ? Number(serial[1]) : 0;
}

type StatutoryChain = {
  chequeOn: string;
  presentedOn: string;
  returnedOn: string;
  noticeSentOn: string;
  noticeServedOn: string;
  accruedOn: string;
  presentationDays: number;
  noticeDays: number;
  sinceAccrual: number;
};

/**
 * The §138 chain behind a filing date, built backwards from it.
 *
 * Backwards because the filing date is the one real fact the cause list holds — every
 * matter on the board has already been filed — and the six steps that had to precede it
 * are fixed in order and spacing by the statute itself. Walking back from the filing
 * date produces a chain that is self-consistent by construction: no generated matter can
 * have a notice sent before its cheque bounced.
 *
 * The moduli are the register queue's own (`chainFor`), so a matter demonstrated in one
 * screen and a matter demonstrated in the other look like they came from the same court.
 * They are sized to stay clear of the two windows this build never puts a listed matter
 * outside of: a case that reached the cause list was taken on file, so its cheque was
 * presented in time and its notice was sent in time. Filing is the one window a listed
 * matter can be outside — that is what a delay condonation application is for, and the
 * matter listed for one is the matter whose chain says so.
 *
 * **None of this is a court record.** It is demo data, deterministic from the case
 * number so a screenshot taken twice shows the same case.
 */
function statutoryChain(
  filedOn: string,
  seed: number,
  late: boolean,
): StatutoryChain {
  const sinceAccrual = late ? 44 + (seed % 90) : 4 + (seed % 24);
  const accruedOn = shiftDay(filedOn, -sinceAccrual);
  const noticeServedOn = shiftDay(accruedOn, -PAYMENT_WINDOW_DAYS);
  const noticeSentOn = shiftDay(noticeServedOn, -(2 + (seed % 4)));
  const noticeDays = 3 + (seed % 22);
  const returnedOn = shiftDay(noticeSentOn, -noticeDays);
  const presentedOn = shiftDay(returnedOn, -(1 + (seed % 3)));
  const presentationDays = 6 + (seed % 70);
  const chequeOn = shiftDay(presentedOn, -presentationDays);

  return {
    chequeOn,
    presentedOn,
    returnedOn,
    noticeSentOn,
    noticeServedOn,
    accruedOn,
    presentationDays,
    noticeDays,
    sinceAccrual,
  };
}

/**
 * The court's milestones between taking a complaint on file and today's sitting.
 *
 * One per stage the matter has already passed — a case at evidence has taken cognizance,
 * issued process, seen the accused appear and recorded a plea, in that order, because
 * that is the order a §138 summons case runs in and a stage cannot be reached without
 * the ones under it. The stage the matter is *at* is not a milestone: it is what today's
 * listing is for, and it sits at the foot of the timeline as the current step.
 *
 * The labels are what the register writes, not the stage names: a stage called "Process"
 * is the day summons went out, and a reader scanning a history wants the event.
 */
const STAGE_MILESTONE: Partial<Record<CourtCaseStage, string>> = {
  cognizance: "Cognizance taken",
  process: "Summons issued",
  appearance: "Accused appeared",
  plea: "Plea recorded",
  evidence: "Evidence begun",
  arguments: "Arguments begun",
};

/**
 * Where each milestone falls between the filing and the last sitting, as a fraction.
 *
 * Not evenly spaced, because a §138 matter is not: cognizance and summons follow the
 * filing within weeks, service and appearance are what take months, and the plea follows
 * the appearance quickly once the accused is before the court. Evenly spaced dates are
 * the tell that a timeline was generated rather than lived.
 */
const MILESTONE_AT: Record<string, number> = {
  cognizance: 0.1,
  process: 0.15,
  appearance: 0.46,
  plea: 0.63,
  evidence: 0.78,
  arguments: 0.88,
};

/**
 * A matter's whole timeline: the cheque's chain, then the court's record.
 *
 * Built rather than stored. Every listing on the board carries a filing date, a stage and
 * a purpose, and those three plus the statute determine the rest — so twenty-three
 * matters get twenty-three consistent histories without twenty-three hand-written blocks
 * that would eventually contradict each other about which comes first.
 *
 * A listing with no filing date on its sidecar gets today's sitting alone, which is the
 * truth about it: the cause list named the matter and nothing else is known.
 */
export function caseTimeline(
  hearing: CourtHearing,
  extras: HearingCaseExtras,
  today: string,
): CaseTimeline {
  const todayStep: CaseTimelineStep = {
    id: "today",
    label: courtHearingPurposeLabel(hearing.purpose),
    on: null,
    status: "current",
  };

  if (!extras.filedOn) return { beforeFiling: [], inCourt: [todayStep] };

  const seed = seedOf(hearing.caseNumber);
  /* The matter listed for a delay condonation is the matter that was filed late. The
     board says so on the row; the chain has to agree with it or the screen argues with
     itself two clicks apart. */
  const late = hearing.purpose === "delay-condonation";
  const chain = statutoryChain(extras.filedOn, seed, late);

  const presentation: NiWindowStatus =
    chain.presentationDays <= PRESENTATION_WINDOW_DAYS ? "within" : "outside";
  const notice: NiWindowStatus =
    chain.noticeDays <= NOTICE_WINDOW_DAYS ? "within" : "outside";
  const filing: NiWindowStatus =
    chain.sinceAccrual <= FILING_WINDOW_DAYS
      ? "within"
      : /* Late, and the matter is before the court today to ask that it be excused. */
        late
        ? "condonation-sought"
        : "outside";

  const beforeFiling: CaseTimelineStep[] = [
    { id: "dated", label: "Cheque dated", on: chain.chequeOn, status: "past" },
    {
      id: "presented",
      label: "Presented",
      on: chain.presentedOn,
      status: "past",
      ...niWindowNote("presentation", presentation),
    },
    {
      id: "returned",
      label: "Returned unpaid",
      on: chain.returnedOn,
      status: "past",
    },
    {
      id: "notice-sent",
      label: "Notice sent",
      on: chain.noticeSentOn,
      status: "past",
      ...niWindowNote("notice", notice),
    },
    {
      id: "notice-served",
      label: "Notice served",
      on: chain.noticeServedOn,
      status: "past",
    },
    {
      id: "accrued",
      label: "Cause of action",
      on: chain.accruedOn,
      status: "past",
    },
  ];

  const inCourt: CaseTimelineStep[] = [
    {
      id: "filed",
      label: "Complaint filed",
      on: extras.filedOn,
      status: "past",
      ...niWindowNote("filing", filing),
    },
  ];

  /* Milestones run from the filing to the last sitting the court held — or to today,
     for a matter whose first sitting this is. */
  const reachedOn = extras.lastHearing?.on ?? today;
  const span = daysApart(extras.filedOn, reachedOn);
  const passed = COURT_CASE_STAGES.slice(
    0,
    COURT_CASE_STAGES.findIndex((stage) => stage.id === hearing.stage),
  );

  for (const stage of passed) {
    const label = STAGE_MILESTONE[stage.id];
    const at = MILESTONE_AT[stage.id];
    if (!label || at === undefined) continue;
    inCourt.push({
      id: stage.id,
      label,
      on: shiftDay(extras.filedOn, Math.max(1, Math.round(span * at))),
      status: "past",
    });
  }

  if (extras.lastHearing) {
    /* The sitting itself, without its order. The order is printed in full in its own
       section a few centimetres away, and a timeline that repeated the paragraph would
       be saying it twice. */
    inCourt.push({
      id: "last-hearing",
      label: extras.lastHearing.purpose,
      on: extras.lastHearing.on,
      status: "past",
    });
  }

  inCourt.push(todayStep);
  return { beforeFiling, inCourt };
}

/** Whole days between two `YYYY-MM-DD` days. */
function daysApart(from: string, to: string): number {
  return Math.round(
    (parseIsoDay(to).getTime() - parseIsoDay(from).getTime()) / 86400000,
  );
}
