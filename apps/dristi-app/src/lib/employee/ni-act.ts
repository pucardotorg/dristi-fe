/**
 * The windows §138 and §142 of the Negotiable Instruments Act count in, as numbers.
 *
 * They are here, on their own, because more than one court-side module counts with
 * them and none of them owns the statute: the register queue measures a waiting
 * complaint against these (`case-review.ts`), and the cause list's case overview builds
 * a matter's chain backward from them (`hearing-overview.ts`). Those two already point
 * at each other for formatting, so a constant defined in either would be a cycle for
 * the other to import — and a constant *copied* into both is the law written twice,
 * which is the version that eventually disagrees with itself.
 *
 * DRISTI runs one core per state over identical national law. These four numbers are
 * the national part: a state deployment changes the language around them, never them.
 */

/** §138(a) — the three months a cheque may be presented in, counted from its date. */
export const PRESENTATION_WINDOW_DAYS = 90;

/** §138(b) — the thirty days between the return of a cheque and the notice. */
export const NOTICE_WINDOW_DAYS = 30;

/** §138(c) — the fifteen days the drawer has to pay before the offence is complete. */
export const PAYMENT_WINDOW_DAYS = 15;

/** §142(1)(b) — the month a complaint must be filed within of the cause of action. */
export const FILING_WINDOW_DAYS = 30;

/** The three limits a §138 complaint has to sit inside to be one the court can act on. */
export type NiWindowId = "presentation" | "notice" | "filing";

/**
 * Where a span sits against its limit — a closed set, because a boolean cannot say the
 * thing that matters most on the filing window: that the file is late *and* there is an
 * application on record asking the court to excuse it.
 */
export type NiWindowStatus =
  | "within"
  | "outside"
  | "early"
  | "condonation-sought";

/**
 * Each window in the statute's own words: the limit as the Act writes it, and the day
 * it is counted from.
 *
 * The phrasing is here rather than in either screen because both print it, and a limit
 * described as "30 days of the return" on one screen and "a month of the dishonour" on
 * another is the same law read two ways by two officers.
 */
export const NI_WINDOWS: Record<
  NiWindowId,
  { limit: number; limitLabel: string; countedFrom: string }
> = {
  presentation: {
    limit: PRESENTATION_WINDOW_DAYS,
    limitLabel: "3 months",
    countedFrom: "the cheque date",
  },
  notice: {
    limit: NOTICE_WINDOW_DAYS,
    limitLabel: "30 days",
    countedFrom: "the return",
  },
  filing: {
    limit: FILING_WINDOW_DAYS,
    limitLabel: "1 month",
    countedFrom: "the cause of action",
  },
};

/**
 * What to print under the step a window closes on — never a bare figure.
 *
 * A span stated as a number of days is something the reader has to re-anchor to two
 * events before it means anything (owner, 2026-09-12). So the note names the limit and
 * the day it runs from, and the two dates either side of it on the timeline are what the
 * reader checks it against. Warning ink appears only where the file is outside a window,
 * so the norm stays quiet.
 */
export function niWindowNote(
  id: NiWindowId,
  status: NiWindowStatus,
): { note: string; aside?: string; tone?: "warning" } {
  const { limitLabel, countedFrom } = NI_WINDOWS[id];
  const limit = `${limitLabel} of ${countedFrom}`;
  switch (status) {
    case "within":
      return { note: `within ${limit}` };
    case "outside":
      return { note: `beyond ${limit}`, tone: "warning" };
    case "condonation-sought":
      /* Two facts, so two lines rather than one that wraps: the file is late, and there
         is an application on record asking the court to excuse it. */
      return {
        note: `beyond ${limit}`,
        aside: "condonation sought",
        tone: "warning",
      };
    case "early":
      return { note: "before the cause of action arose", tone: "warning" };
  }
}
