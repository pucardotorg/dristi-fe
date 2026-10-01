/**
 * Process the court has issued and has still to get out of the building — the signing
 * line for summons, notices, warrants and proclamations, as data.
 *
 * The other four signing queues in the rail's Sign group each hold one act: a form, an
 * order, a bail bond, a deposition, signed and gone. This one is not a queue, it is a
 * **line**. A process is drawn up, its RPAD cover is collected, it is sent for
 * signature, it is signed, it is dispatched, and the channel reports back. Five stages,
 * and the reference screens draw them as five tabs of one screen because they are five
 * views of the same row moving.
 *
 * **What this screen owns is getting process out; whether it arrived is somewhere
 * else.** The case file's Notice/Process status section (`lib/cases/service.ts`) holds
 * what came back — served, returned undelivered, returned unexecuted — party by party
 * and round by round. That is a record of the outside world, authored from the court
 * file. This is the court's own worklist, and it stops at the point the process leaves.
 * `completed` here means the channel has closed the round off, not that anybody was
 * found.
 *
 * **There is no backend and nothing here is signed, sent or served.** `PROCESS_LINE` is
 * demo data shaped to exercise what the screen has to survive: all five process types,
 * all three channels, one case carrying three separate processes, corporate parties long
 * enough to wrap, hearing dates spread across months so the date filter has something to
 * cut on, and enough rows in the three working stages to page at 10, 20 and 30.
 *
 * **Advancing a row is a screen action, not a court record.** `advanceProcesses` moves a
 * row from one stage to the next in this in-memory list and stamps a day on it. It signs
 * nothing, prints nothing, calls no e-sign provider, posts nothing and notifies nobody.
 * The copy describes what each act *means* so the controls are not misread; the build
 * performs none of it.
 *
 * **The process wording is demo text, not court-approved process.** Each type has a
 * template filled from the row's own particulars, so the preview has something
 * real-shaped to render. `docs/product/` defines no §138 process templates, and the rows
 * carry no sums, addresses or process-fee figures — the templates therefore recite none.
 * The statutory hooks they do name are the ones `docs/product/domain/journey.md` already
 * cites for this stage of a §138 case.
 *
 * The type names are the reference screens' own words, put into sentence case per the DS
 * Laws. "DCA notice" is left as the reference writes it: `docs/product/` does not define
 * the abbreviation, and expanding it here would be this module deciding what it stands
 * for. See the build report.
 *
 * Numbers are `ST/…` and `CMP/…` both — process can issue before cognizance (a §223
 * notice on a complaint still numbered CMP) or after it. None of these rows overlap any
 * other court-side queue.
 */

import { CURRENT_STAFF } from "./content";
import { matchesQuery } from "./filter-state";
import { causeTitle, formatListingDate, parseIsoDay } from "./hearings";

/**
 * Which instrument the row is — the reference's "Process type" column.
 *
 * Five, and only these: a row must have a type the templates below can actually write,
 * and a type with no template is a preview that renders nothing. Summons, warrant and
 * proclamation are the case register's own words for the same three instruments
 * (`lib/cases/orders.ts`), restated rather than imported for the reason
 * `sign-orders.ts` restates the register's order titles — the employee area stays
 * self-contained (`content.ts`), and the *words* are the register's so the two halves of
 * the app cannot disagree about what a proclamation is called.
 */
export type CourtProcessTypeId =
  | "summons"
  | "section-223-notice"
  | "dca-notice"
  | "warrant"
  | "proclamation"
  | "attachment";

export const COURT_PROCESS_TYPES: {
  id: CourtProcessTypeId;
  /** How the type is written where it stands on its own — a column, a filter, a title. */
  label: string;
  /**
   * How it is written inside a sentence: "Read the summons in ST/1301/2026".
   *
   * Carried rather than lower-cased from `label`, because two of the five do not survive
   * that. "DCA notice" lower-cased is "dca notice", which is a screen reader being told
   * to say a word rather than four letters; "Section 223 notice" keeps its capital
   * because it names a section. Both of these strings are read aloud far more often than
   * they are seen — they are the accessible names of every row opener and every checkbox
   * on the screen (ACCESSIBILITY §2, §9).
   */
  inline: string;
}[] = [
  { id: "summons", label: "Summons", inline: "summons" },
  /* The statutory short form keeps its capital and its number, like BNSS and ADR
     elsewhere in this area. */
  {
    id: "section-223-notice",
    label: "Section 223 notice",
    inline: "Section 223 notice",
  },
  { id: "dca-notice", label: "DCA notice", inline: "DCA notice" },
  { id: "warrant", label: "Warrant", inline: "warrant" },
  { id: "proclamation", label: "Proclamation", inline: "proclamation" },
  /* Added 2026-10-01: the handover's sixth process type with a police channel, and one
     whose outcome is recorded from the Sent tab like the other two (§6.3, §10.1). */
  { id: "attachment", label: "Attachment", inline: "attachment" },
];

export function courtProcessTypeLabel(id: CourtProcessTypeId): string {
  return COURT_PROCESS_TYPES.find((entry) => entry.id === id)?.label ?? id;
}

/** The same instrument, named mid-sentence. See `inline` above. */
export function courtProcessTypeInline(id: CourtProcessTypeId): string {
  return COURT_PROCESS_TYPES.find((entry) => entry.id === id)?.inline ?? id;
}

/**
 * How the process will be delivered — the reference's "Delivery channel" column.
 *
 * Three, and all three are channels the app's own case-file record already names
 * (`lib/cases/service-dummy.json`: "Police", "Police + RPAD", "Court bailiff"). RPAD is
 * registered post with acknowledgement due — the speed-post route `journey.md` §5 says a
 * summons may take, and the only one of the three that needs anything collected before
 * the court can sign.
 */
export type ProcessChannelId = "rpad" | "police" | "court-bailiff";

export const PROCESS_CHANNELS: { id: ProcessChannelId; label: string }[] = [
  // An abbreviation the court uses as a word; it keeps its capitals.
  { id: "rpad", label: "RPAD" },
  { id: "police", label: "Police" },
  { id: "court-bailiff", label: "Court bailiff" },
];

export function processChannelLabel(id: ProcessChannelId): string {
  return PROCESS_CHANNELS.find((entry) => entry.id === id)?.label ?? id;
}

/** Where a row has got to in the line. The tab it appears under. */
export type ProcessStageId =
  | "pending-rpad-collection"
  | "pending-sign"
  | "signed"
  | "sent"
  | "completed";

export type CourtProcess = {
  id: string;
  caseNumber: string;
  parties: { complainant: string; accused: string };
  type: CourtProcessTypeId;
  channel: ProcessChannelId;
  stage: ProcessStageId;
  /** ISO day the process fee was paid. Every row has one — the fee comes first. */
  paidOn: string;
  /** The listing this process is returnable for. Always ahead of every day below. */
  hearingDate: string;
  /** ISO day it was drawn up and sent for signature. Absent before that happens. */
  issuedOn?: string;
  /** ISO day the signature went on. */
  signedOn?: string;
  /** ISO day it was handed to the channel. */
  sentOn?: string;
  /** ISO day the channel closed the round off. */
  completedOn?: string;
  /** What came back, as recorded from the Sent tab (`DSP-08`, `DSP-09`). */
  outcome?: ProcessOutcome;
};

/**
 * What came back from a delivery channel — §10.1 of `handovers/process-handover.md`.
 *
 * Three terminal outcomes a person records: it reached its destination; the attempt
 * reached it and failed (refused, not found); or it could not be carried at all.
 * Expired and Recalled are terminal too, but nobody records them — the system does
 * (`EXP-02`, `PIA-01`) — so they are not offered here.
 */
export type ProcessOutcomeStatus = "delivered" | "not-delivered" | "failed";

export type ProcessOutcome = {
  status: ProcessOutcomeStatus;
  /** Required where the outcome is negative (`DSP-09`). From `NON_DELIVERY_REASONS`. */
  reason?: string;
  comment: string;
  /** The supporting file's name. Nothing is stored — there is no backend. */
  fileName?: string;
  recordedOn: string;
};

/**
 * Why a process was not delivered or not executed (`DSP-09`). The handover makes this a
 * state-configurable master; these are demo values standing in for Kerala's list until
 * it is supplied.
 */
export const NON_DELIVERY_REASONS = [
  "Refused to accept",
  "Addressee not found at the address",
  "Address incomplete or incorrect",
  "Premises locked",
  "Addressee has left the address",
  "Addressee deceased",
] as const;

/** The instruments addressed to the police are *executed*, not delivered (§10.1). */
function executes(type: CourtProcessTypeId): boolean {
  return type === "warrant" || type === "proclamation" || type === "attachment";
}

export function outcomeOptions(type: CourtProcessTypeId): {
  id: ProcessOutcomeStatus;
  label: string;
  description: string;
}[] {
  const done = executes(type) ? "Executed" : "Delivered";
  const notDone = executes(type) ? "Not executed" : "Not delivered";
  return [
    {
      id: "delivered",
      label: done,
      description: executes(type)
        ? "The police report it was carried out."
        : "It reached the person — the acknowledgement or report says so.",
    },
    {
      id: "not-delivered",
      label: notDone,
      description:
        "The attempt reached the address and failed — refused, not found, returned.",
    },
    {
      id: "failed",
      label: "Failed",
      description:
        "It could not be carried at all, so no attempt was made at the address.",
    },
  ];
}

export function outcomeLabel(
  type: CourtProcessTypeId,
  status: ProcessOutcomeStatus,
): string {
  return outcomeOptions(type).find((option) => option.id === status)?.label ?? status;
}

/**
 * Whether a person records this channel's outcome, rather than the receiving system
 * reporting it (§6.2, `DSP-03`). Every channel this screen carries is recorded by hand
 * today: RPAD from the acknowledgement card, the police and the court bailiff from
 * their return. A channel whose status comes back by API would answer false here.
 */
export function outcomeRecordedByHand(channel: ProcessChannelId): boolean {
  return channel === "rpad" || channel === "police" || channel === "court-bailiff";
}

/** The badge an outcome wears: reached, failed at the address, or never carried. */
export function outcomeVariant(
  status: ProcessOutcomeStatus,
): "success" | "warning" | "destructive" {
  return status === "delivered" ? "success" : status === "failed" ? "destructive" : "warning";
}

/** Whether an outcome can be saved: a status, a comment, and a reason if negative. */
export function outcomeComplete(outcome: {
  status?: ProcessOutcomeStatus;
  reason?: string;
  comment: string;
}): boolean {
  if (!outcome.status) return false;
  if (outcome.status === "not-delivered" && !outcome.reason) return false;
  return outcome.comment.trim() !== "";
}

/** Record what came back: the process closes on it and moves to Completed (`DSP-06`). */
export function recordOutcome(
  rows: CourtProcess[],
  id: string,
  outcome: ProcessOutcome,
): CourtProcess[] {
  return rows.map((process) =>
    process.id === id && process.stage === "sent"
      ? { ...process, stage: "completed", completedOn: outcome.recordedOn, outcome }
      : process,
  );
}

/** The court whose process this is. One bench, one line. */
const COURT = CURRENT_STAFF.court;

/**
 * What the bench does to move a stage's rows on, and the words it does it in.
 *
 * The copy lives beside the stage rather than in the screen because three acts phrased
 * three ways, each said in six places — a bar button, a question, what it means, a
 * success heading, where the rows went, and the line the bar reads out afterwards — is
 * eighteen strings that have to agree with each other. Kept here they are read as a
 * table; spread through the screen they are eighteen chances to say "sign" where the
 * act is "send".
 */
export type ProcessAct = {
  /** The stage a committed row lands in. */
  advancesTo: ProcessStageId;
  /** The sticky bar's button. `0` is the idle label. */
  bar: (count: number) => string;
  /** The button that commits it, inside the confirmation. */
  confirm: string;
  /** The confirmation's question, over "this process" or "8 processes". */
  question: (subject: string) => string;
  /** What the act means, at the moment of the act. */
  meaning: (one: boolean) => string;
  /** The success heading, over the bare "process" or "8 processes". */
  done: (phrase: string) => string;
  /** Where the rows went. */
  outcome: (one: boolean) => string;
  /** What the bar reads out once it is over. */
  notice: (count: number) => string;
};

export type ProcessStage = {
  id: ProcessStageId;
  /** The tab. Sentence case, per the DS Laws. */
  label: string;
  /** What the page says under its title while this tab is the one open. */
  summary: (count: number) => string;
  /**
   * The heading of the one column that changes with the stage, and the day under it.
   *
   * The reference's own device: every tab shows six columns and the fourth is named for
   * the moment that stage is about — "Payment made" while the RPAD cover is still being
   * collected, "Issued date" once the process has been drawn up. The three stages the
   * reference does not draw follow the same rule rather than inventing a column.
   */
  dateColumn: string;
  dateOf: (process: CourtProcess) => string | undefined;
  /**
   * The channel every row at this stage carries, where the stage is defined by one.
   *
   * Only RPAD process waits for collection: a police or bailiff round has no cover to
   * collect and starts at Pending sign. So this stage's channel filter has one possible
   * answer, which is why the screen does not draw one there — see `ProcessFiltersForm`.
   */
  onlyChannel?: ProcessChannelId;
  /** Whether the hearing-date filter is offered. The reference omits it on the first tab. */
  hearingDateFilter: boolean;
  /**
   * Whether this stage is the clerk matching paper in their hands against this list.
   *
   * True at exactly one stage, and the tray above the table is read off it rather than
   * off the stage's id, so the reason travels with the data the way every other
   * per-stage difference on this screen does.
   *
   * The three working stages are the same loop with the paper pointing different ways.
   * At collection it points **at** the screen: the cover is in hand and its row has to be
   * found, so the risk is missing one or ticking one twice and the answer is to keep
   * everything picked visible. At signing there is no paper at all, so there is nothing
   * to keep visible and the tray would be furniture copied for symmetry. At dispatch it
   * points **away** from the screen — the document is produced for a cover — which is a
   * different problem again and not this one.
   */
  reconcilesCovers?: boolean;
  /** What moves a row out of here. Absent where nothing on this screen does. */
  act?: ProcessAct;
  /** What an empty stage means, when no filter is what emptied it. */
  empty: { title: string; description: string };
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * The line, in order. The tab strip is this array.
 *
 * Left to right is the direction a row travels, which is why the strip opens on the
 * first stage rather than on the biggest pile: the bench works the line from the end
 * nothing has been done to.
 */
export const PROCESS_STAGES: ProcessStage[] = [
  {
    id: "pending-rpad-collection",
    label: "Pending RPAD collection",
    summary: (count) =>
      count === 1
        ? "1 process is waiting for its registered-post cover to be collected."
        : `${count} processes are waiting for their registered-post covers to be collected.`,
    dateColumn: "Payment made",
    dateOf: (process) => process.paidOn,
    onlyChannel: "rpad",
    hearingDateFilter: false,
    reconcilesCovers: true,
    act: {
      advancesTo: "pending-sign",
      bar: (count) =>
        count === 0
          ? "Send selected for signature"
          : `Send ${count} ${plural(count, "process", "processes")} for signature`,
      confirm: "Send for signature",
      question: (subject) => `Send ${subject} for signature?`,
      meaning: (one) =>
        one
          ? "The cover is recorded as collected and the process joins the signing queue. Nothing is signed yet."
          : "Their covers are recorded as collected and they join the signing queue. Nothing is signed yet.",
      done: (phrase) => `${capitalise(phrase)} sent for signature`,
      outcome: (one) =>
        one ? "It is now waiting to be signed." : "They are now waiting to be signed.",
      notice: (count) =>
        `${count} ${plural(count, "process is", "processes are")} waiting to be signed. Nothing was sent.`,
    },
    empty: {
      title: "No covers to collect",
      description:
        "Every registered-post process this court has issued has its cover.",
    },
  },
  {
    id: "pending-sign",
    label: "Pending sign",
    summary: (count) =>
      count === 1
        ? "1 process is waiting for your signature."
        : `${count} processes are waiting for your signature.`,
    dateColumn: "Issued date",
    dateOf: (process) => process.issuedOn,
    hearingDateFilter: true,
    act: {
      advancesTo: "signed",
      bar: (count) =>
        count === 0
          ? "Sign selected processes"
          : `Sign ${count} ${plural(count, "process", "processes")}`,
      confirm: "Sign",
      question: (subject) => `Sign ${subject}?`,
      meaning: (one) =>
        one
          ? "Your signature goes on the process. This cannot be reversed."
          : "Your signature goes on every process selected. This cannot be reversed.",
      done: (phrase) => `${capitalise(phrase)} signed`,
      outcome: (one) =>
        one ? "It is ready to be sent." : "They are ready to be sent.",
      notice: (count) =>
        `${count} ${plural(count, "process is", "processes are")} marked signed on this screen. Nothing was signed.`,
    },
    empty: {
      title: "Nothing to sign",
      description: "Every process this court has issued has been signed.",
    },
  },
  {
    id: "signed",
    label: "Signed",
    summary: (count) =>
      count === 1
        ? "1 signed process is waiting to be sent."
        : `${count} signed processes are waiting to be sent.`,
    dateColumn: "Issued date",
    dateOf: (process) => process.issuedOn,
    hearingDateFilter: true,
    act: {
      advancesTo: "sent",
      bar: (count) =>
        count === 0
          ? "Send selected processes"
          : `Send ${count} ${plural(count, "process", "processes")}`,
      confirm: "Send",
      question: (subject) => `Send ${subject}?`,
      meaning: (one) =>
        one
          ? "The process is handed to its delivery channel. It cannot be recalled from this screen."
          : "Each process is handed to its own delivery channel. They cannot be recalled from this screen.",
      done: (phrase) => `${capitalise(phrase)} sent`,
      outcome: (one) =>
        one
          ? "It is with its delivery channel."
          : "They are with their delivery channels.",
      notice: (count) =>
        `${count} ${plural(count, "process is", "processes are")} marked sent on this screen. Nothing was dispatched.`,
    },
    empty: {
      title: "Nothing to send",
      description: "Every process this court has signed is on its way.",
    },
  },
  {
    id: "sent",
    label: "Sent",
    summary: (count) =>
      count === 1
        ? "1 process is out with its delivery channel. Open it to record what came back."
        : `${count} processes are out with their delivery channels. Open one to record what came back.`,
    dateColumn: "Sent on",
    dateOf: (process) => process.sentOn,
    hearingDateFilter: true,
    /* No bulk act: an outcome is one process's, read off its own acknowledgement or
       return, so it is recorded from the row's window (`recordOutcome`), one at a
       time. Recording it moves the row to Completed. */
    empty: {
      title: "Nothing is out",
      description: "No process this court has sent is still with a channel.",
    },
  },
  {
    id: "completed",
    label: "Completed",
    summary: (count) =>
      count === 1
        ? "1 process has come back from its delivery channel."
        : `${count} processes have come back from their delivery channels.`,
    dateColumn: "Completed on",
    dateOf: (process) => process.completedOn,
    hearingDateFilter: true,
    empty: {
      title: "Nothing has come back",
      description: "No delivery channel has closed a round off yet.",
    },
  },
];

export function processStage(id: ProcessStageId): ProcessStage {
  const stage = PROCESS_STAGES.find((entry) => entry.id === id);
  if (!stage) throw new Error(`Unknown process stage: ${id}`);
  return stage;
}

/** Which tab the screen opens on — the head of the line. */
export const DEFAULT_PROCESS_STAGE: ProcessStageId = PROCESS_STAGES[0].id;

/**
 * Every process this court has in the line, newest first inside each stage.
 *
 * Newest first because a working queue is worked from what was just drawn up. The stages
 * are interleaved in one list rather than kept in five, so a row that advances stays the
 * same object and the five tabs cannot disagree about where it is.
 */
export const PROCESS_LINE: CourtProcess[] = [
  /* Waiting on a registered-post cover. All RPAD, by definition of the stage. */
  {
    id: "pr-1301-a",
    caseNumber: "ST/1301/2026",
    parties: {
      complainant: "Thevally Rubber and Latex Traders",
      accused: "Rajeev Sankaran",
    },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-04",
    hearingDate: "2026-10-05",
  },
  {
    id: "pr-1301-b",
    caseNumber: "ST/1301/2026",
    parties: {
      complainant: "Thevally Rubber and Latex Traders",
      accused: "Rajeev Sankaran",
    },
    type: "section-223-notice",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-04",
    hearingDate: "2026-10-05",
  },
  {
    id: "pr-1301-c",
    caseNumber: "ST/1301/2026",
    parties: {
      complainant: "Thevally Rubber and Latex Traders",
      accused: "Rajeev Sankaran",
    },
    type: "dca-notice",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-04",
    hearingDate: "2026-10-05",
  },
  {
    id: "pr-1642",
    caseNumber: "CMP/1642/2026",
    parties: { complainant: "Sheeba Rasheed", accused: "Anil Kumar Pillai" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-03",
    hearingDate: "2026-09-28",
  },
  {
    id: "pr-1304",
    caseNumber: "ST/1304/2026",
    parties: {
      complainant: "Kadappakada Hardware and Sanitaryware",
      accused: "Fousiya Nazar",
    },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-02",
    hearingDate: "2026-10-12",
  },
  {
    id: "pr-1307",
    caseNumber: "ST/1307/2026",
    parties: { complainant: "Girija Damodaran", accused: "Sabu Chacko" },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-09-01",
    hearingDate: "2026-09-25",
  },
  {
    id: "pr-1646",
    caseNumber: "CMP/1646/2026",
    parties: { complainant: "Noushad Ali", accused: "Chinnakada Auto Spares" },
    type: "dca-notice",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-31",
    hearingDate: "2026-09-22",
  },
  {
    id: "pr-1310",
    caseNumber: "ST/1310/2026",
    parties: { complainant: "Bindu Rajagopal", accused: "Hameed Kunju" },
    type: "warrant",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-28",
    hearingDate: "2026-09-30",
  },
  {
    id: "pr-1313",
    caseNumber: "ST/1313/2026",
    parties: {
      complainant: "Ashramam Poultry and Feeds",
      accused: "Vinu Prakash",
    },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-27",
    hearingDate: "2026-10-19",
  },
  {
    id: "pr-1651",
    caseNumber: "CMP/1651/2026",
    parties: { complainant: "Remya Suresh", accused: "Abdul Latheef" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-26",
    hearingDate: "2026-09-24",
  },
  {
    id: "pr-1316",
    caseNumber: "ST/1316/2026",
    parties: { complainant: "Jayaprakash Menon", accused: "Sindhu Balan" },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-25",
    hearingDate: "2026-10-26",
  },
  {
    id: "pr-1319",
    caseNumber: "ST/1319/2026",
    parties: {
      complainant: "Perinad Cashew Processing Company",
      accused: "Mohammed Shafi",
    },
    type: "summons",
    channel: "rpad",
    stage: "pending-rpad-collection",
    paidOn: "2026-08-24",
    hearingDate: "2026-10-30",
  },

  /* Drawn up and waiting on the signature. Every channel reaches this stage. */
  {
    id: "pr-1322",
    caseNumber: "ST/1322/2026",
    parties: { complainant: "Lekha Vijayan", accused: "Sudheer Nadesan" },
    type: "warrant",
    channel: "police",
    stage: "pending-sign",
    paidOn: "2026-08-31",
    issuedOn: "2026-09-03",
    hearingDate: "2026-09-21",
  },
  {
    id: "pr-1655-a",
    caseNumber: "CMP/1655/2026",
    parties: {
      complainant: "Kilikolloor Steel and Cement Mart",
      accused: "Deepthi Ravindran",
    },
    type: "section-223-notice",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-28",
    issuedOn: "2026-09-02",
    hearingDate: "2026-09-23",
  },
  {
    id: "pr-1655-b",
    caseNumber: "CMP/1655/2026",
    parties: {
      complainant: "Kilikolloor Steel and Cement Mart",
      accused: "Deepthi Ravindran",
    },
    type: "dca-notice",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-28",
    issuedOn: "2026-09-02",
    hearingDate: "2026-09-23",
  },
  {
    id: "pr-1325",
    caseNumber: "ST/1325/2026",
    parties: { complainant: "Salim Muhammed", accused: "Anju Thankachan" },
    type: "summons",
    channel: "court-bailiff",
    stage: "pending-sign",
    paidOn: "2026-08-27",
    issuedOn: "2026-09-01",
    hearingDate: "2026-09-29",
  },
  {
    id: "pr-1328",
    caseNumber: "ST/1328/2026",
    parties: { complainant: "Radhika Unnikrishnan", accused: "Byju Thomas" },
    type: "proclamation",
    channel: "police",
    stage: "pending-sign",
    paidOn: "2026-08-24",
    issuedOn: "2026-08-31",
    hearingDate: "2026-10-08",
  },
  {
    id: "pr-1659",
    caseNumber: "CMP/1659/2026",
    parties: { complainant: "Ismail Kunju", accused: "Pallimukku Textiles" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-22",
    issuedOn: "2026-08-28",
    hearingDate: "2026-09-18",
  },
  {
    id: "pr-1331",
    caseNumber: "ST/1331/2026",
    parties: { complainant: "Sujith Mohan", accused: "Ayisha Beevi" },
    type: "summons",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-20",
    issuedOn: "2026-08-27",
    hearingDate: "2026-09-17",
  },
  {
    id: "pr-1334",
    caseNumber: "ST/1334/2026",
    parties: {
      complainant: "Mundakkal Fisheries Cooperative Society",
      accused: "Rahul Krishnan",
    },
    type: "warrant",
    channel: "police",
    stage: "pending-sign",
    paidOn: "2026-08-18",
    issuedOn: "2026-08-26",
    hearingDate: "2026-09-16",
  },
  {
    id: "pr-1337",
    caseNumber: "ST/1337/2026",
    parties: { complainant: "Preetha Nandakumar", accused: "Shibu Kesavan" },
    type: "summons",
    channel: "court-bailiff",
    stage: "pending-sign",
    paidOn: "2026-08-17",
    issuedOn: "2026-08-24",
    hearingDate: "2026-09-15",
  },
  {
    id: "pr-1663",
    caseNumber: "CMP/1663/2026",
    parties: { complainant: "Aneesh Gopakumar", accused: "Suma Devarajan" },
    type: "dca-notice",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-14",
    issuedOn: "2026-08-21",
    hearingDate: "2026-09-14",
  },
  {
    id: "pr-1340",
    caseNumber: "ST/1340/2026",
    parties: { complainant: "Vijayamma Kesavan", accused: "Nithin Raj" },
    type: "summons",
    channel: "rpad",
    stage: "pending-sign",
    paidOn: "2026-08-13",
    issuedOn: "2026-08-20",
    hearingDate: "2026-09-11",
  },

  /* Signed, and waiting on the bench to hand them to a channel. */
  {
    id: "pr-1343",
    caseNumber: "ST/1343/2026",
    parties: { complainant: "Faisal Rahman", accused: "Geetha Sadanandan" },
    type: "summons",
    channel: "rpad",
    stage: "signed",
    paidOn: "2026-08-14",
    issuedOn: "2026-08-21",
    signedOn: "2026-08-31",
    hearingDate: "2026-09-19",
  },
  {
    id: "pr-1346",
    caseNumber: "ST/1346/2026",
    parties: {
      complainant: "Kollam Beach Road Auto Works",
      accused: "Manoj Chandran",
    },
    type: "warrant",
    channel: "police",
    stage: "signed",
    paidOn: "2026-08-12",
    issuedOn: "2026-08-19",
    signedOn: "2026-08-28",
    hearingDate: "2026-09-26",
  },
  {
    id: "pr-1667",
    caseNumber: "CMP/1667/2026",
    parties: { complainant: "Shalini Peter", accused: "Rafeeq Muhammed" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "signed",
    paidOn: "2026-08-11",
    issuedOn: "2026-08-18",
    signedOn: "2026-08-27",
    hearingDate: "2026-09-12",
  },
  {
    id: "pr-1349",
    caseNumber: "ST/1349/2026",
    parties: { complainant: "Divya Anilkumar", accused: "Prasanth Vijayan" },
    type: "summons",
    channel: "court-bailiff",
    stage: "signed",
    paidOn: "2026-08-10",
    issuedOn: "2026-08-17",
    signedOn: "2026-08-25",
    hearingDate: "2026-09-10",
  },
  {
    id: "pr-1352",
    caseNumber: "ST/1352/2026",
    parties: { complainant: "Haridas Pillai", accused: "Kavitha Menon" },
    type: "proclamation",
    channel: "police",
    stage: "signed",
    paidOn: "2026-08-07",
    issuedOn: "2026-08-14",
    signedOn: "2026-08-24",
    hearingDate: "2026-10-01",
  },
  {
    id: "pr-1671",
    caseNumber: "CMP/1671/2026",
    parties: {
      complainant: "Sasthamcotta Lake Fisheries",
      accused: "Jomon Varghese",
    },
    type: "dca-notice",
    channel: "rpad",
    stage: "signed",
    paidOn: "2026-08-06",
    issuedOn: "2026-08-13",
    signedOn: "2026-08-21",
    hearingDate: "2026-09-09",
  },
  {
    id: "pr-1355",
    caseNumber: "ST/1355/2026",
    parties: { complainant: "Asha Vijayakumar", accused: "Siddique Ibrahim" },
    type: "summons",
    channel: "rpad",
    stage: "signed",
    paidOn: "2026-08-04",
    issuedOn: "2026-08-12",
    signedOn: "2026-08-19",
    hearingDate: "2026-09-08",
  },
  {
    id: "pr-1358",
    caseNumber: "ST/1358/2026",
    parties: { complainant: "Benny Mathew", accused: "Sreekala Prasad" },
    type: "summons",
    channel: "court-bailiff",
    stage: "signed",
    paidOn: "2026-08-03",
    issuedOn: "2026-08-11",
    signedOn: "2026-08-18",
    hearingDate: "2026-09-07",
  },

  /* Out with a channel, waiting on it to report back. */
  {
    id: "pr-1361",
    caseNumber: "ST/1361/2026",
    parties: { complainant: "Latha Ramakrishnan", accused: "Nazeer Muhammed" },
    type: "summons",
    channel: "rpad",
    stage: "sent",
    paidOn: "2026-07-30",
    issuedOn: "2026-08-06",
    signedOn: "2026-08-13",
    sentOn: "2026-08-24",
    hearingDate: "2026-09-13",
  },
  {
    id: "pr-1364",
    caseNumber: "ST/1364/2026",
    parties: {
      complainant: "Karunagappally Coir and Mats",
      accused: "Prakashan Achari",
    },
    type: "warrant",
    channel: "police",
    stage: "sent",
    paidOn: "2026-07-28",
    issuedOn: "2026-08-04",
    signedOn: "2026-08-11",
    sentOn: "2026-08-20",
    hearingDate: "2026-09-20",
  },
  /* One of each police-executed instrument out at once, so the Sent tab has a warrant,
     a proclamation and an attachment to record an outcome on. */
  {
    id: "pr-1391",
    caseNumber: "ST/1391/2026",
    parties: { complainant: "Chavara Cashew Exporters", accused: "Sajeev Kumar R" },
    type: "warrant",
    channel: "police",
    stage: "sent",
    paidOn: "2026-08-01",
    issuedOn: "2026-08-06",
    signedOn: "2026-08-12",
    sentOn: "2026-08-22",
    hearingDate: "2026-09-25",
  },
  {
    id: "pr-1392",
    caseNumber: "ST/1392/2026",
    parties: { complainant: "Paravur Fisheries Co-operative", accused: "Biju Thomas" },
    type: "attachment",
    channel: "police",
    stage: "sent",
    paidOn: "2026-08-02",
    issuedOn: "2026-08-07",
    signedOn: "2026-08-13",
    sentOn: "2026-08-23",
    hearingDate: "2026-09-27",
  },
  {
    id: "pr-1675",
    caseNumber: "CMP/1675/2026",
    parties: { complainant: "Manoj Sivadasan", accused: "Rekha Balachandran" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "sent",
    paidOn: "2026-07-27",
    issuedOn: "2026-08-03",
    signedOn: "2026-08-10",
    sentOn: "2026-08-18",
    hearingDate: "2026-09-11",
  },
  {
    id: "pr-1367",
    caseNumber: "ST/1367/2026",
    parties: { complainant: "Sreedevi Warrier", accused: "Tony Sebastian" },
    type: "summons",
    channel: "court-bailiff",
    stage: "sent",
    paidOn: "2026-07-24",
    issuedOn: "2026-07-31",
    signedOn: "2026-08-07",
    sentOn: "2026-08-14",
    hearingDate: "2026-09-09",
  },
  {
    id: "pr-1370",
    caseNumber: "ST/1370/2026",
    parties: { complainant: "Anwar Sadath", accused: "Meera Krishnankutty" },
    type: "proclamation",
    channel: "police",
    stage: "sent",
    paidOn: "2026-07-22",
    issuedOn: "2026-07-29",
    signedOn: "2026-08-05",
    sentOn: "2026-08-12",
    hearingDate: "2026-09-27",
  },
  {
    id: "pr-1679",
    caseNumber: "CMP/1679/2026",
    parties: { complainant: "Jaya Sreekumar", accused: "Eravipuram Marine Foods" },
    type: "dca-notice",
    channel: "rpad",
    stage: "sent",
    paidOn: "2026-07-20",
    issuedOn: "2026-07-27",
    signedOn: "2026-08-03",
    sentOn: "2026-08-10",
    hearingDate: "2026-09-08",
  },
  {
    id: "pr-1373",
    caseNumber: "ST/1373/2026",
    parties: { complainant: "Ravi Sankar Nair", accused: "Bushra Yusuf" },
    type: "summons",
    channel: "rpad",
    stage: "sent",
    paidOn: "2026-07-17",
    issuedOn: "2026-07-24",
    signedOn: "2026-07-31",
    sentOn: "2026-08-05",
    hearingDate: "2026-09-07",
  },

  /* Closed off by the channel. What actually came back is the case file's record, not
     this queue's — see the module header. */
  {
    id: "pr-1376",
    caseNumber: "ST/1376/2026",
    parties: { complainant: "Shajahan Beevi", accused: "Dileep Raghavan" },
    type: "summons",
    channel: "rpad",
    stage: "completed",
    paidOn: "2026-07-13",
    issuedOn: "2026-07-20",
    signedOn: "2026-07-27",
    sentOn: "2026-08-03",
    completedOn: "2026-08-18",
    outcome: { status: "delivered", comment: "Acknowledgement card returned signed by the accused.", recordedOn: "2026-08-18" },
    hearingDate: "2026-09-14",
  },
  {
    id: "pr-1379",
    caseNumber: "ST/1379/2026",
    parties: {
      complainant: "Punalur Plywood and Timber Company",
      accused: "Seema Joseph",
    },
    type: "warrant",
    channel: "police",
    stage: "completed",
    paidOn: "2026-07-10",
    issuedOn: "2026-07-17",
    signedOn: "2026-07-24",
    sentOn: "2026-07-31",
    completedOn: "2026-08-14",
    outcome: { status: "not-delivered", reason: "Addressee not found at the address", comment: "Police report: the accused was not found at the address; neighbours say he has moved.", recordedOn: "2026-08-14" },
    hearingDate: "2026-09-22",
  },
  {
    id: "pr-1683",
    caseNumber: "CMP/1683/2026",
    parties: { complainant: "Unnikrishnan Nair", accused: "Farhana Rasheed" },
    type: "section-223-notice",
    channel: "rpad",
    stage: "completed",
    paidOn: "2026-07-08",
    issuedOn: "2026-07-15",
    signedOn: "2026-07-22",
    sentOn: "2026-07-29",
    completedOn: "2026-08-11",
    outcome: { status: "delivered", comment: "Acknowledgement card returned.", fileName: "acknowledgement-card.pdf", recordedOn: "2026-08-11" },
    hearingDate: "2026-09-10",
  },
  {
    id: "pr-1382",
    caseNumber: "ST/1382/2026",
    parties: { complainant: "Molly Kuriakose", accused: "Sanal Kumar" },
    type: "summons",
    channel: "court-bailiff",
    stage: "completed",
    paidOn: "2026-07-06",
    issuedOn: "2026-07-13",
    signedOn: "2026-07-20",
    sentOn: "2026-07-27",
    completedOn: "2026-08-07",
    outcome: { status: "not-delivered", reason: "Refused to accept", comment: "Bailiff return: the accused refused to accept the summons.", recordedOn: "2026-08-07" },
    hearingDate: "2026-09-06",
  },
  {
    id: "pr-1385",
    caseNumber: "ST/1385/2026",
    parties: { complainant: "Abdul Salam", accused: "Nisha Chandrasekharan" },
    type: "proclamation",
    channel: "police",
    stage: "completed",
    paidOn: "2026-07-03",
    issuedOn: "2026-07-10",
    signedOn: "2026-07-17",
    sentOn: "2026-07-24",
    completedOn: "2026-08-04",
    outcome: { status: "delivered", comment: "Proclamation affixed at the residence and the courthouse; report of compliance filed.", recordedOn: "2026-08-04" },
    hearingDate: "2026-09-29",
  },
  {
    id: "pr-1687",
    caseNumber: "CMP/1687/2026",
    parties: { complainant: "Gopakumar Pillai", accused: "Thangassery Ice Plant" },
    type: "dca-notice",
    channel: "rpad",
    stage: "completed",
    paidOn: "2026-07-01",
    issuedOn: "2026-07-08",
    signedOn: "2026-07-15",
    sentOn: "2026-07-22",
    completedOn: "2026-07-30",
    outcome: { status: "failed", comment: "Returned by the post office: the PIN code does not exist.", recordedOn: "2026-07-30" },
    hearingDate: "2026-09-05",
  },
];

/** Everything sitting at one stage of the line. */
export function processesAt(
  rows: CourtProcess[],
  stage: ProcessStageId,
): CourtProcess[] {
  return rows.filter((process) => process.stage === stage);
}

/** One envelope's worth of selection: a case, and the process picked out of it. */
export type SelectedCase = {
  caseNumber: string;
  parties: CourtProcess["parties"];
  processes: CourtProcess[];
};

/**
 * The selection as the pile of envelopes it stands for.
 *
 * A cover is one per **case**, so the thing the clerk is holding is a case number, not a
 * process — a case with a summons, a Section 223 notice and a DCA notice arrives in one
 * envelope. Grouping here is what lets the table stay one row per process, the way the
 * other four stages draw it, while the tray above it counts in the unit the clerk counts
 * in. Both numbers are wanted and neither can be derived from the other by eye, which is
 * why callers get the cases and can still count the process inside them.
 *
 * **Order is the order they were picked**, not the order the line holds them. A `Set`
 * keeps insertion order, so walking `selectedIds` walks the clerk's own morning: the
 * envelope just ticked lands at the end of the tray, where the eye that ticked it
 * already is. Grouping by first appearance means a case ticked at envelope three stays
 * at position three even when its second process is ticked at envelope nine.
 *
 * Ids that name nothing in `rows` are dropped rather than counted — a row that has since
 * advanced out of this stage is no longer selected, and the tray must not claim it.
 */
export function groupSelectionByCase(
  rows: CourtProcess[],
  selectedIds: ReadonlySet<string>,
): SelectedCase[] {
  const byId = new Map(rows.map((process) => [process.id, process]));
  const cases = new Map<string, SelectedCase>();

  for (const id of selectedIds) {
    const process = byId.get(id);
    if (!process) continue;
    const existing = cases.get(process.caseNumber);
    if (existing) {
      existing.processes.push(process);
      continue;
    }
    cases.set(process.caseNumber, {
      caseNumber: process.caseNumber,
      parties: process.parties,
      processes: [process],
    });
  }

  return [...cases.values()];
}

/**
 * The one case a request names, or nothing.
 *
 * What Enter in the search box commits on. A cover is one per case, so a request that
 * lands on a single case names a single envelope and putting it on the pile is
 * unambiguous — every process that case has waiting goes on, because they all travel in
 * that one cover.
 *
 * **Two cases still matching is not a near miss, it is an unfinished number.** Picking
 * between them — the first row, the closest, the shortest — would put one court's
 * process into a batch bound for another's envelope on a keystroke the clerk did not
 * mean as a choice. So anything but exactly one case answers `null` and the clerk keeps
 * typing. Nothing matching answers `null` for the same reason: there is no envelope here
 * to pick.
 */
export function singleCaseMatch(
  rows: CourtProcess[],
  filters: ProcessFilters,
): CourtProcess[] | null {
  const matches = filterProcesses(rows, filters);
  const first = matches[0];
  if (!first) return null;
  return matches.every((process) => process.caseNumber === first.caseNumber)
    ? matches
    : null;
}

/** Every id at this stage belonging to one case — what removing an envelope takes out. */
export function processIdsForCase(
  rows: CourtProcess[],
  caseNumber: string,
): string[] {
  return rows
    .filter((process) => process.caseNumber === caseNumber)
    .map((process) => process.id);
}

/**
 * How much process is still waiting on this court — the number the rail carries beside
 * "Sign process".
 *
 * The three stages that have an act on them, not the length of the line: Sent and
 * Completed are records, and a badge that counted them would send the bench to a screen
 * with less work on it than the number promised. The same reasoning
 * `SIGN_ORDER_PENDING_COUNT` uses, over three stages instead of one.
 */
export const PROCESS_QUEUE_COUNT = PROCESS_LINE.filter((process) =>
  ["pending-rpad-collection", "pending-sign", "signed"].includes(process.stage),
).length;

export type ProcessFilters = {
  type: CourtProcessTypeId | "all";
  channel: ProcessChannelId | "all";
  /** ISO day of the listing the process is returnable for, or `""` for any day. */
  hearingDate: string;
  /** Free text over the case number only, token by token. */
  query: string;
};

/**
 * What a tab opens on — everything it holds.
 *
 * Unlike the orders queue, no filter is pre-set to narrow the view: the tab has already
 * done that narrowing, and narrowing it twice would hide work behind a control the bench
 * did not touch. The one exception is the channel on the first tab, which is not a
 * narrowing but a fact about the stage — see `ProcessStage.onlyChannel`.
 */
export function defaultProcessFilters(stage: ProcessStage): ProcessFilters {
  return {
    type: "all",
    channel: stage.onlyChannel ?? "all",
    hearingDate: "",
    query: "",
  };
}

export function filterProcesses(
  rows: CourtProcess[],
  filters: ProcessFilters,
): CourtProcess[] {
  return rows.filter((process) => {
    if (filters.type !== "all" && process.type !== filters.type) return false;
    if (filters.channel !== "all" && process.channel !== filters.channel) {
      return false;
    }
    if (filters.hearingDate && process.hearingDate !== filters.hearingDate) {
      return false;
    }
    /* Case number only. The box used to take a cause title as well, because that is
       what the Case name column prints; the search now matches the number and nothing
       else, so a name typed back from that column finds nothing. */
    return matchesQuery(filters.query, process.caseNumber);
  });
}

/**
 * The same request, asked of another stage.
 *
 * A stage-defining channel is a fact about the stage, not something the bench asked for:
 * carrying "RPAD" out of Pending RPAD collection and into Signed would hide every police
 * round the bench is looking for. A channel the bench *did* choose travels, because that
 * one is a question. Everything else travels untouched.
 */
export function rebaseFilters(
  filters: ProcessFilters,
  from: ProcessStage,
  to: ProcessStage,
): ProcessFilters {
  if (from.onlyChannel === undefined || filters.channel !== from.onlyChannel) {
    return { ...filters };
  }
  return { ...filters, channel: to.onlyChannel ?? "all" };
}

/**
 * Where else in the line this search would have found something.
 *
 * A queue that holds one stage can answer an unmatched search with "nothing matches" and
 * be telling the whole truth. A *line* cannot: the row the bench is hunting for has very
 * often simply moved on, and five tabs each independently saying "no" is how a working
 * search gets reported as broken. So when a stage comes up empty, it asks the other four
 * before it says nothing is there.
 */
export function processesElsewhere(
  rows: CourtProcess[],
  filters: ProcessFilters,
  from: ProcessStageId,
): { stage: ProcessStage; count: number }[] {
  const here = processStage(from);
  return PROCESS_STAGES.filter((stage) => stage.id !== from)
    .map((stage) => ({
      stage,
      count: filterProcesses(
        processesAt(rows, stage.id),
        rebaseFilters(filters, here, stage),
      ).length,
    }))
    .filter((entry) => entry.count > 0);
}

/** The day a row lands with when it reaches a stage. */
const STAMP: Partial<Record<ProcessStageId, keyof CourtProcess>> = {
  "pending-sign": "issuedOn",
  signed: "signedOn",
  sent: "sentOn",
  completed: "completedOn",
};

/**
 * Move the chosen rows one stage along — the demo act behind every bar on this screen.
 *
 * A pure function over the line so the screen holds one list and no second copy of the
 * truth. It moves only what is still at `from`: an id naming a row that has since
 * advanced, or no row at all, is ignored rather than throwing — a line that has moved on
 * under a stale selection is a real case, not an error. A stage with no act moves
 * nothing.
 *
 * **It sends nothing.** See the module header: this changes a stage and stamps a date in
 * memory. Nothing is signed, printed, posted or served.
 */
export function advanceProcesses(
  rows: CourtProcess[],
  ids: ReadonlySet<string>,
  from: ProcessStageId,
  on: string,
): CourtProcess[] {
  const act = processStage(from).act;
  if (!act) return rows;
  const stamp = STAMP[act.advancesTo];
  return rows.map((process) =>
    ids.has(process.id) && process.stage === from
      ? { ...process, stage: act.advancesTo, ...(stamp ? { [stamp]: on } : {}) }
      : process,
  );
}

/**
 * Which of the chosen rows the act would actually move.
 *
 * The rows rather than a count of them, because the screen needs both: how many to say it
 * moved, and which ones — so the confirmation can still offer the papers after the act has
 * stamped them and they have left the tab (`SignProcessScreen`). The same guard
 * `advanceProcesses` applies, so the two can never disagree about what a run touched.
 */
export function processesAdvancing(
  rows: CourtProcess[],
  ids: ReadonlySet<string>,
  from: ProcessStageId,
): CourtProcess[] {
  return rows.filter(
    (process) => ids.has(process.id) && process.stage === from,
  );
}

/** "31 Aug 2026" — the same column register every other court-side list uses. */
export function formatProcessDate(day: string): string {
  return formatListingDate(day);
}

const LONG_DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "15 September 2026" — a date named inside the process's prose, not in a column. */
export function formatProcessLongDate(day: string): string {
  return LONG_DAY.format(parseIsoDay(day));
}

/** Today, as an ISO day — what an act is stamped with. */
export function todayIsoDay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The process as a document: what the preview renders and what Download writes.
 *
 * Shaped like `SignOrderDocument`, with one field an order does not have. A process is
 * *addressed* — to the accused, or to the officer who must execute it — and who it is
 * addressed to is the first thing written on it. That is the difference between the
 * court's decision and the instrument that carries it out.
 */
export type ProcessDocument = {
  court: string;
  caseNumber: string;
  matter: string;
  title: string;
  /** Who the instrument commands. */
  addressee: string;
  paragraphs: string[];
  dated: string;
  /** How it goes out, written on the face of it. */
  channel: string;
  /** The signature block: who signs, and whether they have. */
  signature: string;
};

/**
 * Who each instrument is addressed to.
 *
 * A warrant, proclamation or attachment is addressed to the police, who execute it
 * (§6.3 of `handovers/process-handover.md`); everything else commands the accused to
 * appear. `docs/product/domain/actors.md` puts process execution with the police for a
 * §138 case.
 */
function addresseeFor(process: CourtProcess): string {
  if (executes(process.type)) {
    return "To the officer in charge of the police station";
  }
  return `To ${process.parties.accused}, the accused`;
}

/**
 * What each process says.
 *
 * Five templates, filled from the row's own particulars. All five are demo text — see
 * the module header. They recite no address, sum or process fee, because the rows carry
 * none and an invented particular in a facsimile is the kind of detail that gets
 * screenshot and quoted back.
 */
function paragraphsFor(process: CourtProcess): string[] {
  const { complainant, accused } = process.parties;
  const returnable = formatProcessLongDate(process.hearingDate);

  switch (process.type) {
    case "summons":
      return [
        `Whereas your attendance is necessary to answer a charge under section 138 of the Negotiable Instruments Act, 1881, on the complaint of ${complainant}, you are required to appear in person before this court on ${returnable}.`,
        "A summons sent by registered post is treated as duly served even if you refuse to take delivery of it. If you do not appear on the date fixed, this court may issue a warrant for your arrest.",
      ];
    case "section-223-notice":
      return [
        `A complaint under section 138 of the Negotiable Instruments Act, 1881 has been filed against you by ${complainant}. Before taking cognizance of the offence, this court has to give you an opportunity of being heard.`,
        `You are therefore given notice to appear before this court on ${returnable} and to state what you have to say on the complaint. The court will take cognizance after hearing you, or after the time allowed by this notice has passed.`,
      ];
    case "dca-notice":
      return [
        `The complainant, ${complainant}, has applied to this court to condone the delay in filing the complaint against you under section 138 of the Negotiable Instruments Act, 1881.`,
        `You are given notice of that application and are required to appear before this court on ${returnable} to show cause why the delay should not be condoned. The application will be heard and decided on that date.`,
      ];
    case "warrant":
      return [
        `Whereas ${accused}, the accused in this case, has failed to appear before this court although duly served with process, you are directed to arrest the said ${accused} and to produce them before this court.`,
        `This warrant remains in force until it is executed or until this court cancels it. The officer executing it shall report the manner of its execution to this court on ${returnable}.`,
      ];
    case "proclamation":
      return [
        `Whereas a warrant issued by this court for the arrest of ${accused} has been returned unexecuted, and this court has reason to believe that the said ${accused} is absconding or concealing themselves so that the warrant cannot be executed,`,
        `a proclamation is published requiring the said ${accused} to appear before this court on ${returnable}. It shall be read publicly, affixed at the accused's last known place of residence and at this courthouse, and the officer publishing it shall report compliance to this court.`,
      ];
    case "attachment":
      return [
        `Whereas a proclamation has been issued requiring ${accused}, the accused in this case, to appear before this court, and the said ${accused} has not appeared, on the complaint of ${complainant},`,
        `you are directed to attach the movable property belonging to the said ${accused} within the local limits of your jurisdiction, to hold it subject to the further orders of this court, and to report the manner of execution to this court on ${returnable}.`,
      ];
  }
}

export function buildProcessDocument(process: CourtProcess): ProcessDocument {
  const drawnUp = process.issuedOn ?? process.paidOn;
  return {
    court: `Before the ${COURT}`,
    caseNumber: process.caseNumber,
    matter: causeTitle(process),
    title: courtProcessTypeLabel(process.type),
    addressee: addresseeFor(process),
    paragraphs: paragraphsFor(process),
    dated: formatProcessLongDate(drawnUp),
    channel: `To be served through: ${processChannelLabel(process.channel)}.`,
    /* The signature block is the one part of the facsimile that is not the same on every
       row: an unsigned process says so plainly rather than showing an empty rule that
       could be mistaken for a signature that failed to render. */
    signature: process.signedOn
      ? `Signed by the magistrate, ${COURT}, on ${formatProcessLongDate(process.signedOn)}.`
      : "Pending the signature of the magistrate.",
  };
}

export function processDocumentText(document: ProcessDocument): string {
  return [
    document.court,
    `Case no. ${document.caseNumber}`,
    document.matter,
    "",
    document.title,
    document.addressee,
    "",
    ...document.paragraphs.map(
      (paragraph, index) => `${index + 1}. ${paragraph}`,
    ),
    "",
    document.channel,
    `Dated this the ${document.dated}.`,
    "",
    document.signature,
  ].join("\n");
}

export function processDocumentFilename(process: CourtProcess): string {
  return `${process.caseNumber.replace(/\//g, "-")}-${process.type}.txt`;
}

export function downloadProcessDocument(process: CourtProcess): void {
  const document = buildProcessDocument(process);
  const url = URL.createObjectURL(
    new Blob([processDocumentText(document)], { type: "text/plain" }),
  );
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = processDocumentFilename(process);
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Write the chosen rows out as one file — the Download the reference offers beside every
 * act, on every tab including the two that have no act.
 *
 * One file rather than one download per row: a bench that has checked eleven boxes is
 * asking for the eleven papers, and eleven separate saves is a browser fighting the
 * user. The papers are separated the way a bundle separates them.
 */
export function downloadProcessBundle(rows: CourtProcess[]): void {
  if (rows.length === 0) return;
  if (rows.length === 1) {
    downloadProcessDocument(rows[0]);
    return;
  }
  const body = rows
    .map((process) => processDocumentText(buildProcessDocument(process)))
    .join("\n\n———\n\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `process-${rows.length}-documents.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Sentence case, so a noun only rises to a capital when it opens the line. */
function capitalise(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
