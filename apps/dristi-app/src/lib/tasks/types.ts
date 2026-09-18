/**
 * The pending-tasks contract.
 *
 * Everything the screens read is one of these shapes. `Task` mirrors what a tasks
 * service will return; the fields that only this front end needs (history, sandbox
 * payment refs) are marked. Dates are ISO strings throughout — the comparator parses
 * them once.
 */

import type { TargetableStep } from "@/lib/filing/targets";
import type { StepId as FilingStepId } from "@/lib/filing/types";

export type PersonId = string;
export type CaseId = string;
export type TaskId = string;

export type PersonRole = "senior" | "junior";

export type Person = {
  id: PersonId;
  name: string;
  /** Two letters for the avatar. */
  initials: string;
  role: PersonRole;
};

export type Case = {
  id: CaseId;
  /** "ST 412/2025"; empty until the registry numbers the case. */
  stNumber: string;
  /** "KLKL01-000412-2025"; empty until numbered. */
  cnr: string;
  /** "Sreekumar N. v. Vismaya Traders". */
  parties: string;
  court: string;
  /** Court-issued room/designation, when available. */
  courtNumber?: string;
  stage: string;
  nextHearingAt?: string;
  /**
   * The listed time is a fixed, court-given slot rather than the usual rough
   * order. Courts rarely commit to a clock time; when a matter is specially
   * rescheduled the bench does give one, and only then is an upcoming hearing's
   * time exact. Absent/false means an upcoming time is approximate.
   */
  timeFixed?: boolean;
  /**
   * The matter was called on its listed day and passed over: reached in the cause
   * list but not taken up. It is NOT concluded. It goes back among the matters
   * still to be called that day, in item order, until the court takes it up.
   */
  passedOver?: boolean;
  /**
   * The matter was passed over on an earlier day (ISO date) and carried to the
   * current `nextHearingAt`. It lists as an ordinary matter on the new day, tagged
   * with the day it was passed over.
   */
  passedOverOn?: string;
  /**
   * Advocates signed on the vakalatnama, in order — the first is the main advocate.
   * Only they may complete a task (sign, pay, file).
   */
  signatories: PersonId[];
  /** Everyone on the case, signatories included. Anyone here may see and prepare. */
  advocates: PersonId[];
};

/**
 * What the task asks for. Each kind is one overview card:
 * sign · pay · file (a document or application due) · returned (scrutiny sent a filing
 * back: fix the defects and re-file) · review (a request addressed to this advocate
 * that needs their decision — a consent to a removal, and whatever review-type asks
 * follow) · hearing (court-initiated, anchored to a posting: the plea, a deposition,
 * the sworn statement, arguments) · draft (a filing or application someone started and
 * left in draft).
 */
export type TaskKind = "sign" | "pay" | "file" | "returned" | "review" | "hearing" | "draft";

/**
 * The six kind pills. Every pill names an act, and `draft` is a state rather than an
 * act, so it is not one of them — `cardKindOf` files a started filing under the act it
 * will become. Excluding it here is what stops a seventh label, filter value or count
 * from being written for a pill that cannot exist (2026-09-15).
 */
export type PillKind = Exclude<TaskKind, "draft">;

/** What set the deadline; decides how the due cue is worded and how it moves. */
export type DueKind = "statutory" | "court-set" | "before-hearing" | "none";

/**
 * open — nobody has started it · draft — someone on the case started work and saved
 * it · ready — the work is complete and needs a signatory to complete it ·
 * awaiting-court — filed, with the registry · payment-confirming — paid, the gateway
 * has not confirmed · done · expired (the window closed) · obsolete (no longer needed)
 * · archived — put away by someone on the case; restorable to the state it left.
 */
export type TaskStatus =
  | "open"
  | "draft"
  | "ready"
  | "awaiting-court"
  | "payment-confirming"
  | "done"
  | "expired"
  | "obsolete"
  | "archived";

/** An uploaded file, by reference; the bytes live in the repository's file store. */
export type StoredFileRef = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** "PDF", "JPG" — for the file chip. */
  ext: string;
  /** Which "documents needed" slot this upload fills, if any. */
  slot?: string;
};

/* ─────────────────────────── Scrutiny defects ─────────────────────────── */

/**
 * Where a defect lives in the filing.
 *
 * A defect that cannot say where it is costs a second return: with `cheques[]`,
 * `complainants[]` and `notices[]` all repeating, "IFSC is wrong" is ambiguous the moment
 * there are two cheques. `step` is the filing step id; `instance` is the 0-based index
 * within a repeating list; `field` is the key on that record. `label` /
 * `sectionLabel` / `instanceLabel` carry the officer's own words for the breadcrumb, so
 * the screen never has to reverse-engineer a human name from a key.
 *
 * `step` is deliberately narrower than the filing's own step list: only the sections whose
 * fields are wired to be found can hold a defect, because a defect the form cannot show is
 * one the advocate can never clear. `lib/filing/targets` owns that list and the note on
 * widening it.
 */
export type FieldTarget = {
  kind: "field";
  step: TargetableStep;
  instance?: number;
  field: string;
  label: string;
  sectionLabel: string;
  instanceLabel?: string;
};

/** A whole document, by the intake slot it fills ("c1ad" — the AD card for cheque 1). */
export type DocTarget = {
  kind: "doc";
  step: FilingStepId;
  slotKey: string;
  label: string;
  sectionLabel: string;
};

export type DefectTarget = FieldTarget | DocTarget;

/**
 * A spoken remark from the officer. It never carries a defect's meaning on its own —
 * WCAG 1.2.1 wants a text alternative for prerecorded audio, so `Defect.note` is always
 * there beside it and a transcript is shown when one exists.
 */
export type VoiceNote = {
  id: string;
  durationMs: number;
  transcript?: string;
};

/** A box the officer drew on an upload — the same geometry the OCR highlight uses. */
export type DefectAnnotation = {
  file: StoredFileRef;
  box: { x0: number; y0: number; x1: number; y1: number };
  page: { width: number; height: number };
};

/** "This should read KLGB0040213, not KLGB0040231" — with the paper that says so. */
export type Suggestion = {
  from: string;
  to: string;
  evidence?: StoredFileRef;
};

/**
 * What the advocate did about it. Never a self-certified tick: the screen writes this
 * only when a value actually changed, a suggestion was actually taken, or a document was
 * actually replaced — and `defects.ts` derives "resolved" from it plus the live value.
 */
export type Resolution = {
  /**
   * `kept` is disagreement (brief D7): the filed value stands and the advocate has said
   * why. It is a resolution, not an unresolved defect — and it is a different act from an
   * edit, so the history must not call it one.
   */
  how: "accepted" | "edited" | "kept" | "replaced";
  /** The value now in the filing (field defects) — for the record, not the gate. */
  value?: string;
  /**
   * The advocate's reason. Required when an explicit suggestion was overridden and when
   * the filed value is being kept; available on any field defect, because that is how a
   * disagreement reaches the Registry at all.
   */
  justification?: string;
  /** The upload that replaced the flagged document. */
  replacement?: StoredFileRef;
  at: string;
};

/** One scrutiny defect on a returned filing. */
export type Defect = {
  n: number;
  target: DefectTarget;
  /** The officer's written remark. Always present — see `VoiceNote`. */
  note: string;
  /** The value as scrutiny saw it: the baseline "has this changed?" is measured against. */
  valueAtReturn?: string;
  voiceNote?: VoiceNote;
  annotation?: DefectAnnotation;
  suggestion?: Suggestion;
  resolution?: Resolution;
};

/** Who last saved work on this task and when (status `draft`). */
export type Draft = {
  by: PersonId;
  savedAt: string;
  note?: string;
};

/** Who finished the preparation and when (status `ready`). */
export type Prepared = {
  by: PersonId;
  at: string;
  note?: string;
  /** What was attached when it was marked ready — shown to the signatory. */
  files?: StoredFileRef[];
};

/** Why a `returned` task exists: scrutiny sent the filing back with these defects. */
export type Returned = {
  by: "scrutiny";
  at: string;
  defects: Defect[];
};

/**
 * Why a `review` task exists: someone asked this advocate to decide something. `of`
 * names the addressee — the one person whose decision it is; everyone else on the case
 * watches it wait. `decision` is written by the respond transition.
 */
export type Review = {
  /** Who raised the request. */
  requestedBy: PersonId;
  /** Whose decision it is. */
  of: PersonId;
  decision?: { by: PersonId; at: string; accepted: boolean; note?: string };
};

/** Set while a task is archived: who put it away, when, and the state to restore. */
export type Archived = {
  by?: PersonId;
  at: string;
  /** The status the task held before archiving — unarchive returns it there. */
  from: TaskStatus;
};

export type Completion = {
  by?: PersonId;
  at: string;
  how: "event" | "manual";
  /** Receipt / acknowledgement number the person can quote at the counter. */
  receipt?: string;
};

export type HistoryEntry = {
  at: string;
  by?: PersonId;
  text: string;
};

export type PaymentResult = "success" | "pending" | "failed";

export type Task = {
  id: TaskId;
  caseId: CaseId;
  kind: TaskKind;
  /** Verb + object: "Pay the process fee for the summons". */
  title: string;
  /** The order / notice / scrutiny remark that created the task. */
  why: { event: string; at: string };
  whatToDo: string;
  documentsNeeded?: string[];
  amountPaise?: number;
  feeHead?: string;
  dueAt?: string;
  dueKind: DueKind;
  /** Provenance of the deadline: "Order dated 27 Jul: produce before next posting". */
  deadlineNote?: string;
  /** The hearing this task is anchored to — the posting it must be done before or at. */
  hearingAt?: string;
  /** The hearing cannot proceed without it. */
  isBlocking: boolean;
  createdAt: string;
  /** Closed by the event (payment, signature, acceptance) — never by hand. */
  systemObservable: boolean;
  /**
   * The closure rule in the service's own words, auto-closure included — "Closes on
   * payment, or when the hearing passes". Declares when it will close; `completion.how`
   * records how it did.
   */
  closesWhen?: string;
  /**
   * Who on the case sees the task. `"case"` (the default) — everyone on the case's
   * side; `"actors"` — only the people who can act on it. The 1.0 attributes doc names
   * a third audience, courtroom staff, which is out of scope for this advocate-side app.
   */
  visibility?: "case" | "actors";
  status: TaskStatus;
  draft?: Draft;
  prepared?: Prepared;
  /** Set on a `returned` task: the scrutiny return that created it. */
  returned?: Returned;
  /** Set on a `review` task: the request awaiting this advocate's decision. */
  review?: Review;
  /**
   * The e-filing draft this task acts on. A scrutiny return opens that draft in a
   * correction posture, so the defects can point at real fields rather than at prose.
   */
  draftId?: string;
  /** Set while status is `archived`. */
  archived?: Archived;
  completion?: Completion;
  /** One line explaining the current state when the status alone does not. */
  statusNote?: string;
  /** Set when a `before-hearing` due date moved with the hearing. */
  redate?: { from: string; to: string; reason: string; at: string };
  /** Last payment attempt — sandbox gateway result. */
  lastPayment?: { result: PaymentResult; ref: string; at: string };
  history: HistoryEntry[];
  files?: StoredFileRef[];
};

/**
 * Which tab a task belongs to — for a given viewer. A task is "needs action" only when
 * this viewer holds its acting verb; a ready item that needs a vakalatnama holder waits
 * on that person from everyone else's chair.
 */
export type TaskView = "needs-action" | "waiting" | "completed" | "archived";

/** The verbs a row or panel may show. */
export type Verb =
  | "Sign"
  | "Pay"
  | "File"
  | "Re-file"
  /** Any viewer, on a draft. */
  | "Continue"
  /** The addressee of a review task — accept or decline the request. */
  | "Respond"
  /** Any open-state task, by anyone on the case — records completion outside DRISTI. */
  | "Mark done"
  /** An archived task, by anyone on the case — back to the state it left. */
  | "Unarchive"
  /** Nothing to do here: waiting on others, or closed. */
  | "View";
