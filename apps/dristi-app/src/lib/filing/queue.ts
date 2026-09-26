/**
 * The filings work queue — one row model over four sources the app already owns.
 *
 * The queue is a *view*, never a dataset. Drafts come from the filing repository,
 * scrutiny and registered rows from `lib/cases`, returned-defect rows from `lib/tasks`.
 * Nothing here invents a case, a status or a court: if the row cannot be built from a
 * record that already exists somewhere else in the app, the tab renders empty. That is
 * the rule that keeps this screen from becoming a second `/cases` with its own truth
 * (see docs/design/proposals/e-filing.md, W1–W2).
 *
 * The four tabs are four different tables that happen to share a row shape. They do not
 * share a column set and they do not share an order: a draft is ordered by how long it
 * has left, a registered case by when it is next in court. Treating them as one table is
 * what put already-heard dates at the top of a column headed "Next hearing".
 */

import { CASES } from "@/lib/cases/fixtures";
import type { CaseRecord } from "@/lib/cases/types";
import type { Case as TaskCase, Task } from "@/lib/tasks/types";
import { fixHref } from "@/lib/tasks/routes";

import { addDays, daysBetween, money, toDisplayDate } from "./format";
import {
  draftProgress,
  draftTitle,
  feeBill,
  limitationView,
  LIMITATION_DAYS,
  signatories,
} from "./selectors";
import { stepHref } from "./steps";
import type { FilingDraft, Signatory, UserProfile } from "./types";

export const QUEUE_TABS = [
  { id: "drafts", label: "Drafts" },
  { id: "pendingSignature", label: "Pending signature" },
  { id: "pendingPayment", label: "Pending payment" },
  { id: "scrutiny", label: "Pending scrutiny" },
  { id: "returned", label: "Returned post scrutiny" },
  { id: "registered", label: "Registered" },
] as const;

export type QueueTab = (typeof QUEUE_TABS)[number]["id"];

export function isQueueTab(value: string | null): value is QueueTab {
  return !!value && QUEUE_TABS.some((tab) => tab.id === value);
}

/** How the info cell reads. `tone` never carries the meaning on its own. */
export type InfoTone = "default" | "warning" | "danger";

/** Sorts last in every ascending (most-pressing-first) order. */
const NO_URGENCY = "9999-12-31";

export type QueueRow = {
  id: string;
  /** The number this row is known by. Absent on drafts — a draft has not got one. */
  ref?: string;
  parties: string;
  /** Empty while no court applies; the column is dropped on tabs where none ever does. */
  court: string;
  info: { lead: string; sub?: string; tone: InfoTone };
  /** A count the info column shows as a chip instead of `info.lead`. Returned rows. */
  count?: number;
  /** How much of the form is filled in, and when it was last touched. Drafts only. */
  progress?: { percent: number; savedOn: string };
  /**
   * Whether the signed-in profile is one of the people still asked to sign. Pending-
   * signature rows only — this is what a bulk sign can actually act on: you cannot sign
   * for a party who is not you, however pressing their row looks.
   */
  youPending?: boolean;
  /** The court fee still owed, in rupees. Pending-payment rows only — for the bulk total. */
  amount?: number;
  action: { label: string; href: string };
  /** When this row needs attention — ascending puts the most pressing first. */
  urgencyAt: string;
  /** When this row last moved — descending puts the freshest first. */
  recencyAt: string;
  /**
   * Secondary key, descending, for rows whose primary key ties — which every row with
   * nothing pressing does, since they all share one sentinel. It should be whatever the
   * *visible* column shows, or that column reads as unsorted. Defaults to `recencyAt`.
   */
  tieAt?: string;
  /** Drafts can be thrown away; a filed case cannot. Drives the row's ghost action. */
  discardable?: boolean;
  /** Everything the search box matches against, pre-lowered. */
  haystack: string;
};

export type ColumnId = "ref" | "parties" | "court" | "info" | "progress" | "action";

/**
 * What each tab actually shows.
 *
 * Case type is gone from every tab: DRISTI files one case type, so a column repeating
 * "S-138, NI Act" down the page carried nothing. Court is gone from drafts for the same
 * reason — a draft has not chosen one. A column with a single value is a caption printed
 * once per row.
 *
 * Drafts split what used to be one "Time to file" cell into two questions a person asks
 * separately: by when (File by — the limitation date, or NA while the clock cannot start)
 * and how far along (Completed — the share of the form filled in, with a ring beside it).
 */
export const TAB_LAYOUT: Record<
  QueueTab,
  { columns: ColumnId[]; ref?: string; info: string; label: string }
> = {
  drafts: {
    columns: ["parties", "info", "progress", "action"],
    info: "File by",
    label: "Drafts you have not filed yet",
  },
  pendingSignature: {
    columns: ["parties", "info", "action"],
    info: "Signatures",
    label: "Filings sent for signature",
  },
  pendingPayment: {
    columns: ["parties", "info", "action"],
    info: "Court fee",
    label: "Filings signed and awaiting the court fee",
  },
  scrutiny: {
    columns: ["ref", "parties", "court", "info", "action"],
    ref: "E-filing no.",
    info: "Filed",
    label: "Filings waiting on the registry's check",
  },
  returned: {
    columns: ["ref", "parties", "court", "info", "action"],
    ref: "E-filing no.",
    info: "Defects",
    label: "Filings scrutiny returned with defects",
  },
  registered: {
    columns: ["ref", "parties", "court", "info", "action"],
    ref: "Case no.",
    info: "Hearing",
    label: "Cases the court has numbered",
  },
};

export type SortOption = {
  value: string;
  label: string;
  key: "urgencyAt" | "recencyAt";
  dir: "asc" | "desc";
};

/**
 * Each tab's own orders, most useful first — which is also its default.
 *
 * "Newest first" is meaningless on a forward-looking column: sorted that way a list of
 * hearings opens on the one furthest away and buries the next one under dates that have
 * already been heard.
 */
export const TAB_SORTS: Record<QueueTab, SortOption[]> = {
  drafts: [
    { value: "deadline", label: "Deadline first", key: "urgencyAt", dir: "asc" },
    { value: "recent", label: "Recently saved", key: "recencyAt", dir: "desc" },
  ],
  pendingSignature: [
    { value: "waiting", label: "Longest waiting", key: "urgencyAt", dir: "asc" },
    { value: "recent", label: "Recently sent", key: "recencyAt", dir: "desc" },
  ],
  pendingPayment: [
    { value: "waiting", label: "Longest waiting", key: "urgencyAt", dir: "asc" },
    { value: "recent", label: "Recently signed", key: "recencyAt", dir: "desc" },
  ],
  scrutiny: [
    { value: "waiting", label: "Longest waiting", key: "urgencyAt", dir: "asc" },
    { value: "recent", label: "Recently filed", key: "recencyAt", dir: "desc" },
  ],
  returned: [
    { value: "cure", label: "Cure date first", key: "urgencyAt", dir: "asc" },
    { value: "recent", label: "Recently returned", key: "recencyAt", dir: "desc" },
  ],
  registered: [
    { value: "hearing", label: "Next hearing first", key: "urgencyAt", dir: "asc" },
    { value: "updated", label: "Recently updated", key: "recencyAt", dir: "desc" },
  ],
};

export function defaultSortFor(tab: QueueTab): string {
  return TAB_SORTS[tab][0].value;
}

export function sortOptionFor(tab: QueueTab, value: string | null): SortOption {
  return TAB_SORTS[tab].find((option) => option.value === value) ?? TAB_SORTS[tab][0];
}

function partiesOf(record: CaseRecord): string {
  return `${record.parties.complainant} v. ${record.parties.accused}`;
}

/** No clock can start until the draft carries the dates that start it. */
export const NO_DEADLINE = "NA";

/** Inside this many days the date reads in the warning ink. */
export const DEADLINE_WARNING_DAYS = 2;

/**
 * What a draft's limitation clock says — the one number on this screen that can cost a
 * client the case. The File by column.
 *
 * The complaint is due within one month of the cause of action (NI Act §142(1)(b)); past
 * that, delay may be condoned for sufficient cause, so the copy never says "barred" or
 * "overdue" — it says what filing now costs, which is a condonation application and the
 * fee `feeBill()` already adds. With no cause date and no served notice there is no clock
 * at all: `noticeCauseDate` refuses to guess one, and so does this — the cell says NA and
 * why, rather than a date it made up.
 *
 * The lead is always the date, so the column reads as one. What differs is the line
 * under it: days left in plain ink, the last two days in warning ink, and a closed
 * window in the destructive ink with the condonation consequence spelled out.
 */
export function draftClock(draft: FilingDraft): {
  lead: string;
  sub?: string;
  tone: InfoTone;
  dueOn: string;
} {
  const lim = limitationView(draft);
  if (!lim.causeDate) {
    return { lead: NO_DEADLINE, sub: "Notice dates not entered yet", tone: "default", dueOn: "" };
  }

  const dueOn = addDays(lim.causeDate, LIMITATION_DAYS);
  const left = daysBetween(lim.filingDate, dueOn);
  if (left === null) {
    return { lead: NO_DEADLINE, sub: "Notice dates not entered yet", tone: "default", dueOn: "" };
  }

  if (left < 0) {
    return {
      lead: toDisplayDate(dueOn),
      sub: "Window closed · filing now needs a condonation application",
      tone: "danger",
      dueOn,
    };
  }
  return {
    lead: toDisplayDate(dueOn),
    sub: left === 0 ? "Due today" : `${left} ${left === 1 ? "day" : "days"} left`,
    tone: left <= DEADLINE_WARNING_DAYS ? "warning" : "default",
    dueOn,
  };
}

/**
 * Sending for signature is what actually takes a draft out of drafting — see
 * `sign-section.tsx`'s own `requested`. Choosing the paper path is the same moment for
 * that path: `sign.mode` only ever becomes `"upload"` when the filer picks it there, and
 * it never carries a `requestedAt` of its own to read instead.
 */
function enteredSigning(draft: FilingDraft): boolean {
  return draft.sign.requestedAt !== null || draft.sign.mode === "upload";
}

export function draftRows(drafts: FilingDraft[]): QueueRow[] {
  return drafts
    .filter((draft) => !enteredSigning(draft))
    .map((draft) => {
      const parties = draftTitle(draft);
      const { dueOn, ...info } = draftClock(draft);
      return {
        id: draft.id,
        parties,
        court: "",
        info,
        progress: {
          percent: draftProgress(draft),
          savedOn: toDisplayDate(draft.updatedAt.slice(0, 10)),
        },
        action: { label: "Continue filing", href: stepHref(draft.id, draft.lastStep) },
        // A draft past its window keeps its real date rather than being pushed to the end:
        // it is the most pressing row on the tab, not a finished one.
        urgencyAt: dueOn || NO_URGENCY,
        recencyAt: draft.updatedAt.slice(0, 10),
        discardable: true,
        haystack: parties.toLowerCase(),
      };
    });
}

/** Who is still asked to sign, read from the filer's own point of view. */
function pendingSummary(everyone: Signatory[]): {
  count: number;
  youPending: boolean;
  sub: string;
} {
  const pending = everyone.filter((s) => s.status === "pending");
  const youPending = pending.some((s) => s.you);
  const others = pending.filter((s) => !s.you).length;
  const sub = youPending
    ? others
      ? `Waiting on you and ${others} other ${others === 1 ? "party" : "parties"}`
      : "Waiting on you"
    : others === 1
      ? "Waiting on the other party"
      : `Waiting on ${others} other parties`;
  return { count: pending.length, youPending, sub };
}

/**
 * Sent for signature, at least one signature still outstanding. Some of these are
 * waiting on the filer; some are waiting entirely on other parties, which is why the
 * count in the Signatures column, not a date, is the fact the row leads with.
 */
export function pendingSignatureRows(
  drafts: FilingDraft[],
  profile: UserProfile | null
): QueueRow[] {
  return drafts.flatMap((draft) => {
    if (!enteredSigning(draft)) return [];
    const { complainants, advocates } = signatories(draft, profile);
    const everyone = [...complainants, ...advocates];
    const allSigned = everyone.length > 0 && everyone.every((s) => s.status === "signed");
    if (allSigned) return [];
    const parties = draftTitle(draft);
    const { count, youPending, sub } = pendingSummary(everyone);
    // The moment it left the drafting phase — the paper path never sets `requestedAt`,
    // so its own last edit is the closest honest stand-in for "waiting since".
    const since = (draft.sign.requestedAt ?? draft.updatedAt).slice(0, 10);
    const row: QueueRow = {
      id: draft.id,
      parties,
      court: "",
      info: { lead: String(count), sub, tone: youPending ? "warning" : "default" },
      count,
      action: { label: "Continue signing", href: stepHref(draft.id, "sign") },
      urgencyAt: since,
      recencyAt: draft.updatedAt.slice(0, 10),
      youPending,
      haystack: parties.toLowerCase(),
    };
    return [row];
  });
}

/**
 * Every signature is in; the court fee is what stands between this draft and a case
 * number. `feeBill` is the same calculation Sign shows and charges from — this tab
 * cannot read the fee differently than the screen that collects it.
 */
export function pendingPaymentRows(
  drafts: FilingDraft[],
  profile: UserProfile | null
): QueueRow[] {
  return drafts.flatMap((draft) => {
    if (draft.sign.paid) return [];
    const { complainants, advocates } = signatories(draft, profile);
    const everyone = [...complainants, ...advocates];
    const allSigned = everyone.length > 0 && everyone.every((s) => s.status === "signed");
    if (!allSigned) return [];
    const parties = draftTitle(draft);
    const amount = feeBill(draft).total;
    const since = (draft.sign.requestedAt ?? draft.updatedAt).slice(0, 10);
    const row: QueueRow = {
      id: draft.id,
      parties,
      court: "",
      info: { lead: money(amount), tone: "default" },
      amount,
      action: { label: "Pay court fee", href: stepHref(draft.id, "sign") },
      urgencyAt: since,
      recencyAt: draft.updatedAt.slice(0, 10),
      haystack: parties.toLowerCase(),
    };
    return [row];
  });
}

/** Cases the registry has not cleared — the filing is in, the case is not. */
export function scrutinyRows(today: string, cases: CaseRecord[] = CASES): QueueRow[] {
  return cases
    .filter((record) => record.stage === "scrutiny" && !record.disposal)
    .map((record) => {
      const days = daysBetween(record.filedOn, today);
      const parties = partiesOf(record);
      return {
        id: record.id,
        ref: record.caseNumber,
        parties,
        court: record.court,
        info: {
          lead: toDisplayDate(record.filedOn),
          sub:
            days === null || days < 0
              ? record.latestUpdate
              : `In scrutiny ${days} ${days === 1 ? "day" : "days"}`,
          tone: "default" as InfoTone,
        },
        action: { label: "View case file", href: `/cases/${record.id}` },
        // The one waiting longest is the one to chase, so the oldest filing date is the
        // most pressing — ascending order does that without a second rule.
        urgencyAt: record.filedOn,
        recencyAt: record.filedOn,
        haystack: `${parties} ${record.caseNumber} ${record.court}`.toLowerCase(),
      };
    });
}

/**
 * Filings scrutiny sent back. These are tasks, not cases: the defect list, the cure
 * deadline and the fix route all belong to `lib/tasks`, and the row links straight into
 * the existing cure flow rather than restating it here.
 */
export function returnedRows(tasks: Task[], cases: TaskCase[]): QueueRow[] {
  const byId = new Map(cases.map((c) => [c.id, c]));
  return tasks
    .filter(
      (task) =>
        task.kind === "returned" &&
        task.returned !== undefined &&
        (task.status === "open" || task.status === "draft" || task.status === "ready")
    )
    .map((task) => {
      const c = byId.get(task.caseId);
      const count = task.returned?.defects.length ?? 0;
      const due = task.dueAt ? task.dueAt.slice(0, 10) : "";
      const parties = c?.parties ?? task.title;
      return {
        id: task.id,
        ref: c?.stNumber || c?.cnr || task.id.toUpperCase(),
        parties,
        court: c?.court ?? "",
        // The column is headed Defects, so the cell is the number alone, as a chip.
        info: {
          lead: String(count),
          sub: due ? `Cure by ${toDisplayDate(due)}` : undefined,
          tone: "danger" as InfoTone,
        },
        count,
        action: { label: "Cure defects", href: fixHref(task.id) },
        urgencyAt: due || NO_URGENCY,
        recencyAt: task.returned?.at.slice(0, 10) ?? task.createdAt.slice(0, 10),
        haystack:
          `${parties} ${c?.stNumber ?? ""} ${c?.cnr ?? ""} ${c?.court ?? ""}`.toLowerCase(),
      };
    });
}

/**
 * Numbered by the court and on the board — the filing is done, the case has begun.
 *
 * The hearing cell is tense-aware. A listing date that has passed is stated as one that
 * passed; calling it "Next hearing" told people their next hearing was a fortnight ago.
 */
export function registeredRows(today: string, cases: CaseRecord[] = CASES): QueueRow[] {
  return cases
    .filter((record) => record.stage !== "scrutiny" && !record.disposal)
    .map((record) => {
      const parties = partiesOf(record);
      const on = record.nextHearing?.on ?? "";
      const upcoming = !!on && on >= today;
      return {
        id: record.id,
        ref: record.caseNumber,
        parties,
        court: record.court,
        info: on
          ? {
              lead: toDisplayDate(on),
              sub: upcoming ? record.nextHearing?.purpose : "Last listed — no new date yet",
              tone: "default" as InfoTone,
            }
          : {
              lead: "Awaiting listing",
              sub: "No hearing date yet",
              tone: "default" as InfoTone,
            },
        action: { label: "Open case", href: `/cases/${record.id}` },
        // Only a hearing still to come is pressing. Past listings and unlisted cases fall
        // to the end rather than crowding out the date being prepared for.
        urgencyAt: upcoming ? on : NO_URGENCY,
        recencyAt: record.updatedOn.slice(0, 10),
        // Under the upcoming hearings sit the ones already heard; they read in the order
        // the Hearing column shows, most recently listed first.
        tieAt: on || "",
        haystack: `${parties} ${record.caseNumber} ${record.court}`.toLowerCase(),
      };
    });
}

export type QueueFilters = { q: string; court: string; sort: SortOption };

export function courtsOf(rows: QueueRow[]): string[] {
  return [...new Set(rows.map((row) => row.court).filter(Boolean))].sort();
}

export function applyQueueFilters(rows: QueueRow[], filters: QueueFilters): QueueRow[] {
  const q = filters.q.trim().toLowerCase();
  const { key, dir } = filters.sort;
  return rows
    .filter(
      (row) =>
        (!q || row.haystack.includes(q)) && (!filters.court || row.court === filters.court)
    )
    .sort((a, b) => {
      const primary = dir === "asc" ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      if (primary !== 0) return primary;
      // Everything with no date to be pressing about shares one sentinel key, so without
      // a tie-break the whole tail sits in whatever order the source happened to hold —
      // visibly unsorted under a column that claims an order.
      return (b.tieAt ?? b.recencyAt).localeCompare(a.tieAt ?? a.recencyAt);
    });
}

/** The windowed page list — 1 … 4 5 6 … 16, matching the cases list's own helper. */
export function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const visible = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return visible.flatMap((entry, index) =>
    index > 0 && entry - visible[index - 1] > 1 ? (["gap", entry] as const) : [entry]
  );
}
