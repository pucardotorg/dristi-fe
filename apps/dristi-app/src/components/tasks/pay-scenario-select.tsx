"use client";

/**
 * SANDBOX SCAFFOLDING — the gateway's answer, picked on the row that starts the payment.
 *
 * ## Why the word "Sandbox" is on screen and not only in an `aria-label`
 *
 * The queue's action column is headed by an `sr-only` "Action", so there is no visible
 * column text for this control to borrow a name from, and ACCESSIBILITY §12 does not take
 * an `aria-label` as a substitute for a visible one — a voice user says the words they can
 * see. The label repeats down the payable rows, which is noise, and that is the right
 * trade: a control that fakes a bank's answer should be conspicuous, and scaffolding that
 * looks like product is worse than scaffolding that looks loud. It goes when the file does.
 *
 * The accessible name opens with the same word the label shows and then names the fee, so
 * a reader moving between rows can tell two selects apart (WCAG 2.5.3, Label in Name).
 *
 * The select is the DS control metric (`h-10`, 40px), which clears the 40×40 touch floor
 * and still fits inside the queue's `h-16` cell, so a payable row stays exactly as tall as
 * every other row in the queue.
 */

import * as React from "react";

import {
  benchDefault,
  DEFAULT_SCENARIO,
  getScenario,
  PAY_SCENARIOS,
  setScenario,
  subscribeScenario,
  type PayScenario,
} from "@/lib/tasks/pay-scenario";
import type { TaskId } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

/** The chosen scenario for one task, kept in step across the row and the modal. */
export function usePayScenario(taskId: TaskId): PayScenario {
  return React.useSyncExternalStore(
    subscribeScenario,
    () => getScenario(taskId),
    /* The server snapshot has to be the same resting value the client starts from, or a
       bench fee hydrates showing "Paid" and then swaps to its own answer. `sessionStorage`
       is unreadable here by definition, so the resting default is the whole answer. */
    () => benchDefault(taskId) ?? DEFAULT_SCENARIO
  );
}

export function PayScenarioSelect({
  taskId,
  taskTitle,
  className,
}: {
  taskId: TaskId;
  /** Named in the accessible label so a reader moving between rows knows which fee. */
  taskTitle: string;
  className?: string;
}) {
  const value = usePayScenario(taskId);
  const id = React.useId();

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="whitespace-nowrap text-caption text-muted-foreground">
        Sandbox
      </label>
      <NativeSelect
        className="min-w-0 flex-1"
        id={id}
        value={value}
        aria-label={`Sandbox gateway answer for: ${taskTitle}`}
        onChange={(event) => setScenario(taskId, event.target.value as PayScenario)}
      >
        {PAY_SCENARIOS.map((scenario) => (
          <NativeSelectOption
            key={scenario.value}
            value={scenario.value}
            /* Unbuilt outcomes stay listed and disabled — the switchboard says what it
               does not cover yet, and names the step that will turn it on. */
            disabled={!scenario.result}
            title={scenario.edge}
          >
            {scenario.result
              ? scenario.label
              : `${scenario.label} — ${scenario.step}`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </span>
  );
}
