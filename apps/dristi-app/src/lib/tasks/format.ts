/**
 * Words for the row and the panel: the due cue (relative primary + absolute caption),
 * the Waiting-on phrase, the outcome phrase, amounts and dates. Pure — the table, the
 * panel and the act flows all call these so the same fact always reads the same. The
 * vocabulary is fixed (brief D13, v2.1): do not add synonyms here.
 */

import { format } from "date-fns";

import { isBinding, mainAdvocateOf, needOf, signatoriesOf } from "./permissions";
import { consequenceAt, daysUntil } from "./urgency";
import type { Case, Person, PersonId, Task } from "./types";

export function rupees(paise: number): string {
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  const base = `₹${whole.toLocaleString("en-IN")}`;
  return frac ? `${base}.${String(frac).padStart(2, "0")}` : base;
}

/** "20 Aug" */
export function shortDate(iso: string): string {
  return format(new Date(iso), "d MMM");
}

/** "20 Aug 2026" */
export function longDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

/** "Tue 20 Aug, 10:30 am" */
export function dateTime(iso: string): string {
  return format(new Date(iso), "EEE d MMM, h:mm a").replace("AM", "am").replace("PM", "pm");
}

/** "Tuesday 20 August" — the page header, the anchor every relative date counts from. */
export function headerDate(now: Date | string): string {
  return format(new Date(now), "EEEE d MMMM");
}

export function nameOf(people: Person[], id?: PersonId): string {
  return people.find((p) => p.id === id)?.name ?? "someone";
}

/**
 * The second line under a task's title — the status note, unless the Status phrase
 * already says it (an expired or obsolete task's reason lives in the phrase).
 */
export function noteOf(task: Task): string | undefined {
  if (task.status === "expired" || task.status === "obsolete") return undefined;
  return task.statusNote;
}

export type DueCue = {
  /** The relative phrase, counted from today. */
  primary: string;
  /** The absolute date under it, "18 Aug" — absent only when there is no date. */
  date?: string;
  overdue: boolean;
};

/**
 * The Due cell, one format everywhere: a relative primary line — "{n} days overdue" ·
 * "Due today" · "Due in {n} days" · "Before hearing in {n} days" · "No date" — with the
 * absolute date as a caption under it. Settled tasks (waiting on the court or the
 * gateway, closed, archived) recall the absolute date only, without the ink — the
 * deadline no longer binds, and "overdue" on a done row would be a lie.
 */
export function dueCueOf(task: Task, now: Date | string = new Date()): DueCue {
  const at = consequenceAt(task);
  if (!at) return { primary: "No date", overdue: false };
  const settled = !isBinding(task);
  const anchored = !!task.hearingAt && at === task.hearingAt;
  if (settled) {
    return { primary: anchored ? `Hearing ${shortDate(at)}` : `Due ${shortDate(at)}`, overdue: false };
  }
  const days = daysUntil(at, now);
  const date = shortDate(at);
  if (days < 0) {
    return { primary: days === -1 ? "1 day overdue" : `${-days} days overdue`, date, overdue: true };
  }
  if (days === 0) return { primary: "Due today", date, overdue: false };
  const inDays = days === 1 ? "in 1 day" : `in ${days} days`;
  if (anchored) return { primary: `Before hearing ${inDays}`, date, overdue: false };
  return { primary: `Due ${inDays}`, date, overdue: false };
}

/**
 * The second line under a Needs-action row's title: the status note ("Payment failed —
 * try again", "Prepared by S. Prakash"), or who holds the draft.
 */
export function secondLineOf(task: Task, user: Person | PersonId, people: Person[]): string | undefined {
  if (task.status === "draft") {
    const uid = typeof user === "string" ? user : user.id;
    return `Draft · ${task.draft?.by === uid ? "you" : nameOf(people, task.draft?.by)}`;
  }
  return noteOf(task);
}

/**
 * The Waiting-on cell: who or what the task waits for, one phrase —
 * "The court — scrutiny" · "Payment confirming" · "{main advocate} — signature".
 */
export function waitingOnOf(task: Task, kase: Case, people: Person[]): string {
  if (task.status === "awaiting-court") return "The court — scrutiny";
  if (task.status === "payment-confirming") return "Payment confirming";
  // A request waits on its addressee's decision.
  if (task.kind === "review") return `${nameOf(people, task.review?.of)} — decision`;
  // An open or ready item that needs a vakalatnama holder the viewer is not.
  return `${nameOf(people, mainAdvocateOf(kase))} — ${needOf(task.kind)}`;
}

/**
 * The outcome cell on Completed and Archived rows: "Done {date}" · "Expired — {why}" ·
 * "No longer needed — {why}" · "Archived {date}".
 */
export function outcomeOf(task: Task): string {
  switch (task.status) {
    case "done":
      return task.completion?.at ? `Done ${shortDate(task.completion.at)}` : "Done";
    case "expired":
      return task.statusNote ? `Expired — ${task.statusNote}` : "Expired";
    case "obsolete":
      return task.statusNote ? `No longer needed — ${task.statusNote}` : "No longer needed";
    case "archived":
      return task.archived ? `Archived ${shortDate(task.archived.at)}` : "Archived";
    default:
      return "";
  }
}

/** "You can view this task. R. Manoj holds the vakalatnama." — the panel's one quiet line. */
export function viewOnlyLineOf(kase: Case, people: Person[]): string {
  const names = signatoriesOf(kase, people).map((p) => p.name);
  const who = names.length ? names.join(" and ") : "A signatory";
  const holds = names.length > 1 ? "hold" : "holds";
  return `You can view this task. ${who} ${holds} the vakalatnama.`;
}
