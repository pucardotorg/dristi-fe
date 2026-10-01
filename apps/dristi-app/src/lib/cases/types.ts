/**
 * Cases list domain shapes.
 *
 * Stage names follow the prescribed national §138 journey in
 * docs/product/domain/journey.md, plus the pre-cognizance scrutiny step
 * recorded in docs/product/domain/practice-notes.md. Cases enter this list at
 * scrutiny — drafts and returned filings belong to Filings.
 *
 * Registration is a scrutiny substage, not a stage: the national process in
 * journey.md has no discrete registration step.
 */

export type ActiveStage =
  | "scrutiny"
  | "cognizance"
  | "summons"
  | "appearance"
  | "evidence"
  | "arguments"
  | "judgment";

export type DisposedOutcome =
  | "convicted"
  | "acquitted"
  | "compounded"
  | "withdrawn"
  | "dismissed";

/**
 * A folder in the grid. Every view folds: the live views fold by stage, Disposed
 * folds by outcome, and Bookmarked folds by stage plus one `disposed` folder —
 * a bookmark is a personal marker that outlives disposal, so its cases span both
 * statuses and need somewhere to land.
 */
export type BucketKey = ActiveStage | DisposedOutcome | "disposed";

export type Parties = {
  complainant: string;
  accused: string;
};

export type CounselSide = "complainant" | "accused";

/** Advocates on record for each side. Either side may be absent or several. */
export type CaseCounsel = {
  complainant?: string[];
  accused?: string[];
};

export type CaseRecord = {
  id: string;
  /** Registered number. Two formats coexist — see cases brief §12 Q5. */
  caseNumber: string;
  /** Cause title. Every case on this list has both sides named. */
  parties: Parties;
  /** Counsel on record, split by side. Absent before a vakalat is filed. */
  counsel?: CaseCounsel;
  court: string;
  filedOn: string;
  updatedOn: string;
  /** Short plain-language note of the latest registry / order activity. */
  latestUpdate: string;
  stage: ActiveStage;
  /** Where the case actually sits inside the stage. Often absent. */
  substage?: string;
  /** Next listed hearing — absent before listing or after disposal. */
  nextHearing?: {
    on: string;
    purpose: string;
  };
  /** Last completed hearing date, when one exists. */
  previousHearingOn?: string;
  longPending: boolean;
  bookmarked: boolean;
  disposal?: {
    outcome: DisposedOutcome;
    on: string;
  };
};

export const ACTIVE_STAGES: { value: ActiveStage; label: string }[] = [
  { value: "scrutiny", label: "Scrutiny" },
  { value: "cognizance", label: "Awaiting cognizance" },
  { value: "summons", label: "Summons issued" },
  { value: "appearance", label: "Appearance" },
  { value: "evidence", label: "Evidence" },
  { value: "arguments", label: "Final arguments" },
  { value: "judgment", label: "Reserved for judgment" },
];

export const DISPOSED_OUTCOMES: { value: DisposedOutcome; label: string }[] = [
  { value: "convicted", label: "Convicted" },
  { value: "acquitted", label: "Acquitted" },
  { value: "compounded", label: "Compounded" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "dismissed", label: "Complaint dismissed" },
];

export function stageLabel(stage: ActiveStage): string {
  return ACTIVE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function outcomeLabel(outcome: DisposedOutcome): string {
  return DISPOSED_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}

export function bucketLabel(bucket: BucketKey): string {
  if (bucket === "disposed") return "Disposed";
  return (
    ACTIVE_STAGES.find((s) => s.value === bucket)?.label ??
    DISPOSED_OUTCOMES.find((o) => o.value === bucket)?.label ??
    bucket
  );
}

/** "14 March 2023" — no abbreviation, so translated months stay readable. */
export function formatCaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function partiesLabel(record: CaseRecord): string {
  return `${record.parties.complainant} v. ${record.parties.accused}`;
}

export function counselFor(
  record: CaseRecord,
  side: CounselSide
): string[] {
  return record.counsel?.[side]?.filter((name) => name.length > 0) ?? [];
}

/** "A and B", "A, B and C" — a cause title reads as a sentence, not a CSV. */
export function formatCounselList(names: string[]): string {
  return new Intl.ListFormat("en-IN", {
    style: "long",
    type: "conjunction",
  }).format(names);
}

export function allCounselNames(record: CaseRecord): string {
  return [
    ...counselFor(record, "complainant"),
    ...counselFor(record, "accused"),
  ].join(" ");
}
