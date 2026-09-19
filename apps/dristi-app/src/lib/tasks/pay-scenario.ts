/**
 * SANDBOX SCAFFOLDING — which answer the gateway gives, chosen on the row before you pay.
 *
 * The three radios used to live inside the pay modal, which made a court fee look like a
 * thing with a settings panel attached. They have moved out to the queue: the modal is now
 * only what a person paying a fee would actually see, and the scenario is picked where a
 * control this obviously synthetic belongs — next to the button that starts the payment.
 *
 * ## Why this is not a field on `Task`
 *
 * `types.ts` is the service contract and `sandbox.ts` is deleted the day the services
 * answer. A `scenario` field on `Task` would have to be taken back out of the contract on
 * that day, and every reader of the contract would have carried it in the meantime. So the
 * choice lives here instead, as a browser-side overlay keyed by task id: this whole file is
 * the thing that gets deleted, and nothing in the model knows it existed.
 *
 * ## Why unbuilt scenarios are still listed
 *
 * The payment journey is being built in steps, and the scenarios the transitions cannot yet
 * produce are listed and disabled rather than hidden. A switchboard whose job is to prove
 * coverage should say what it does not cover yet; hiding the gaps makes the sandbox look
 * finished when it is not. Each one names the step that will turn it on.
 */

import type { PaymentResult, Task, TaskId } from "./types";

export type PayScenario =
  | "success"
  | "confirming"
  | "failed"
  | "failed-otp"
  | "abandoned"
  | "unknown"
  | "late-success"
  | "paid-not-done";

export type ScenarioSpec = {
  value: PayScenario;
  /** The option's own text. Sentence case; it is a label, not a sentence. */
  label: string;
  /** The edge case this stands for — shown as the option's title and in the report. */
  edge: string;
  /**
   * The outcome `recordPayment` already produces. Absent means the transition does not
   * exist yet, and the option is offered disabled.
   */
  result?: PaymentResult;
  /** Which build step turns it on. Only meaningful while `result` is absent. */
  step?: string;
};

/** Success first: it is the ordinary path, not an edge case, and it is the default. */
export const PAY_SCENARIOS: ScenarioSpec[] = [
  {
    value: "success",
    label: "Paid",
    edge: "The ordinary path — receipt issued, task closes",
    result: "success",
  },
  {
    value: "confirming",
    label: "Confirming",
    edge: "E10 — the gateway took it, the registry has not confirmed",
    result: "pending",
  },
  {
    value: "failed",
    label: "Failed at gateway",
    edge: "Nothing was paid; the task stays where it is",
    result: "failed",
  },
  {
    value: "failed-otp",
    label: "Failed at bank OTP",
    edge: "E6 — dropped out on the bank's 3-D Secure page",
    step: "step 3",
  },
  {
    value: "unknown",
    label: "No answer",
    edge: "E13 — the bank never answered; money may have moved",
    step: "step 3",
  },
  {
    value: "late-success",
    label: "Failed, then paid",
    edge: "E11 — a failure the webhook later overturns",
    step: "step 3",
  },
  {
    value: "abandoned",
    label: "Abandoned",
    edge: "E5 — the tab closed and no answer ever arrives",
    step: "step 5",
  },
  {
    value: "paid-not-done",
    label: "Paid, but the work failed",
    edge: "E14 — money taken, the thing it unblocks did not complete",
    step: "step 6",
  },
];

export const DEFAULT_SCENARIO: PayScenario = "success";

export function scenarioSpec(value: PayScenario): ScenarioSpec {
  return PAY_SCENARIOS.find((s) => s.value === value) ?? PAY_SCENARIOS[0];
}

/* ─────────────────────────── the store ─────────────────────────── */

/**
 * `sessionStorage`, not `localStorage`: a scenario is a thing you set for the run you are
 * doing now, and a stale one surviving until next week would be a trap. Every access is
 * guarded — a private window, blocked site data, or the server pass all throw or return
 * nothing, and the switchboard has to keep working with the default in every one of them.
 */
const KEY = "dristi-pay-scenario";

type ScenarioMap = Partial<Record<TaskId, PayScenario>>;

let cache: ScenarioMap | null = null;
const listeners = new Set<() => void>();

function read(): ScenarioMap {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ScenarioMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function getScenario(taskId: TaskId): PayScenario {
  /* A bench fee has its own resting answer; anything else rests on success. A stored
     choice outranks both — the selector is still the last word. */
  const resting = BENCH_DEFAULT[taskId] ?? DEFAULT_SCENARIO;
  if (typeof window === "undefined") return resting;
  return read()[taskId] ?? resting;
}

export function setScenario(taskId: TaskId, value: PayScenario): void {
  cache = { ...read(), [taskId]: value };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* The choice still holds for this page; only its survival across a reload is lost. */
  }
  for (const fn of listeners) fn();
}

export function subscribeScenario(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ─────────────────────── the payment bench ─────────────────────── */

/**
 * The three fees that exist to be paid repeatedly (`sandbox.ts`).
 *
 * A real pay task closes on success and parks in Waiting while a gateway confirms, so
 * the card you ran the scenario from leaves Needs action the moment you use it — two of
 * the three built outcomes delete the thing you were testing with. These re-arm instead,
 * so the bench survives its own runs. Only these: a paid fee is supposed to leave, and
 * the Completed tab needs tasks that did.
 */
/**
 * **One bench fee per answer, so all three outcome screens are one click apart.**
 *
 * The rail on the advocate home has no scenario control — it is a reading surface, not a
 * switchboard — so on that screen the only way to reach a given outcome is for the fee
 * itself to already be set to it. These three sit together at the bottom of Due today, in
 * this order, because `compareUrgency` falls through to oldest-created when the due dates
 * tie and they were seeded -3, -2, -1 days apart for exactly that reason.
 *
 * Keyed by id rather than by position: a default that depended on sort order would move
 * the moment anything else came due today.
 */
const BENCH_DEFAULT: Record<string, PayScenario> = {
  /* 1st in Due today */ "t-bench-copying": "success",
  /* 2nd */ "t-bench-process": "confirming",
  /* 3rd */ "t-bench-vakfee": "failed",
};

export function isBenchTask(id: TaskId): boolean {
  return id in BENCH_DEFAULT;
}

/** The answer a bench fee gives before anyone touches its selector. */
export function benchDefault(id: TaskId): PayScenario | undefined {
  return BENCH_DEFAULT[id];
}

/**
 * Put a bench fee back the way it was found, as a pure transition.
 *
 * Deliberately not in `transitions.ts`: that file is the service contract and this is a
 * scaffold, so it lives with the rest of the scaffolding and leaves with it. The run that
 * just happened stays in `history` — the bench should show its own mileage.
 */
export function rearmBench(task: Task): Task {
  return {
    ...task,
    status: "open",
    statusNote: undefined,
    completion: undefined,
    lastPayment: undefined,
    draft: undefined,
    prepared: undefined,
    history: [
      ...task.history,
      { at: new Date().toISOString(), text: "Sandbox bench — re-armed for the next run" },
    ],
  };
}
