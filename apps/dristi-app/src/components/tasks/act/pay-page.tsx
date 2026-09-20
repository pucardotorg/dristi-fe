"use client";

/**
 * Pay — the fee, why it is owed, and who may pay it, as an act-modal body. A signatory
 * pays (with a confirmation before money would move); anyone else on the case prepares
 * the payment and marks it ready. Success closes the task by event with a receipt; a
 * pending gateway parks it in Waiting; a failure keeps the task where it was, with the
 * cue, and the person stays in the modal with the notice focused.
 *
 * The gateway's answer is no longer chosen here. It was three radios in a grey well under
 * the fee, which made a court fee look like a thing with a settings panel attached; it now
 * lives on the queue row that opens this modal (`pay-scenario-select.tsx`), so what is left
 * on this screen is only what a person paying a fee would actually see. Everything below
 * the fee summary is therefore the button and the two notices that must not be missed —
 * a failed previous attempt, and work someone else prepared.
 */

import * as React from "react";
import { CircleAlertIcon, CircleCheckIcon, ClockIcon } from "lucide-react";

import { dateTime, dueCueOf, longDate, rupees } from "@/lib/tasks/format";
import { signatoriesOf, TERMINAL } from "@/lib/tasks/permissions";
import { confirmPayment, recordPayment } from "@/lib/tasks/transitions";
import { isBenchTask, rearmBench, scenarioSpec } from "@/lib/tasks/pay-scenario";
import type { PaymentResult } from "@/lib/tasks/types";
import { usePayScenario } from "@/components/tasks/pay-scenario-select";
import { cn } from "@/lib/utils";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import { useStagedFlow } from "@/components/chrome/staged-overlay";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import { SectionNotice } from "@/components/shell/notices";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import {
  type ActContext,
  closedTitle,
  PrepareCard,
  PreparedNote,
  RailCard,
  RecordCard,
} from "@/components/tasks/act/shared";
import { Identifier } from "@/components/chrome/identifier";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DescriptionRow className="border-hairline">
      <DescriptionTerm className="text-body-compact">{label}</DescriptionTerm>
      <DescriptionDetails className="text-body-compact">
        {children}
      </DescriptionDetails>
    </DescriptionRow>
  );
}

/* ─────────────────────── what the gateway answered ─────────────────────── */

/**
 * The three answers this flow can land on, and the words for each.
 *
 * **Failed and pending are not shades of each other.** Failed means the money did not
 * move and the fee is still owed; pending means the money *has* moved and only the record
 * is behind. Telling someone nothing was paid while their bank is holding ₹25 is how a
 * court fee gets paid twice, so pending carries the instruction not to retry and failed
 * carries the assurance that nothing left the account. Neither sentence is filler.
 *
 * That assurance lives in the **body**, not the headline. All three headlines name the
 * event — successful, being confirmed, failed — because the bands have to read as three
 * answers to one question. Two earlier shapes were the odd one out and both went: a
 * headline reporting the state of the *money* ("Nothing was paid") restated the line
 * directly under it, and one carrying the figure ("Paid ₹120") repeated the Amount row
 * four lines below while breaking the pattern its neighbours kept (owner, 2026-09-19).
 *
 * There is a fourth answer the live service will have and this sandbox cannot yet
 * produce: *no answer at all*, where the gateway never replied and we genuinely do not
 * know. It must not borrow the failed copy. It is the "No answer" scenario on the queue
 * row, still disabled.
 */
type Answer = {
  headline: string;
  /** The band's fill and its measured foreground pair — a DS solid, never a tint. */
  band: string;
  Icon: typeof CircleCheckIcon;
  /** What the reference number is called once the attempt has an outcome. */
  refLabel: string;
  whenLabel: string;
  /** Who did it. "Attempted by" where nothing was actually paid. */
  byLabel: string;
  body: React.ReactNode;
};

const ANSWER: Record<PaymentResult, Answer> = {
  success: {
    headline: "Payment successful",
    band: "bg-success text-success-foreground",
    Icon: CircleCheckIcon,
    refLabel: "Receipt",
    whenLabel: "When",
    byLabel: "Paid by",
    body: "This task is done. The receipt stays on the case record.",
  },
  pending: {
    headline: "Payment is being confirmed",
    band: "bg-warning text-warning-foreground",
    Icon: ClockIcon,
    refLabel: "Reference",
    whenLabel: "When",
    byLabel: "Paid by",
    /* Two sentences: what happened, and what not to do (owner, this round). No
       "gateway" — that is our word for the plumbing, not the payer's — and no timing
       promise, because we have no SLA to quote and inventing one is a system claim the
       product cannot support. Where the task went is left to the queue, which shows it
       under Waiting on others without being told to. */
    body: (
      <>
        The payment has been made but not yet confirmed.{" "}
        <span className="font-medium text-foreground">Do not pay again.</span>
      </>
    ),
  },
  failed: {
    headline: "Payment failed",
    band: "bg-destructive text-destructive-foreground",
    Icon: CircleAlertIcon,
    refLabel: "Reference",
    whenLabel: "Attempted",
    byLabel: "Attempted by",
    body: "The payment did not go through and no money left the account. The fee is still owed.",
  },
};


/**
 * The fee summary under its heading — the whole first stage, and the same block the
 * non-payable rails sit above. `headingRef` is how the staged flow lands focus on the
 * line that changed; the callers that never move focus leave it off.
 */
function OwedSection({
  ctx,
  headingRef,
}: {
  ctx: ActContext;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-body font-semibold outline-none"
      >
        What is owed
      </h3>
      {/* A well, not a bare list. The DS is explicit that key-value rows live in a
          container ("Key-value rows use DescriptionList inside Card"), and the outcome
          this stage turns into is already one — so the facts were changing surface
          halfway through the flow (owner, this round). Same radius, same hairline, same
          fill as the stamped version; the only thing the outcome adds is the band.

          The hairline is not optional here: a well carries one when it holds interactive
          content, and the Receipt row holds a copy control. */}
      <div className="rounded-xl border border-hairline bg-surface-sunken px-4">
        <OwedSummary ctx={ctx} />
      </div>
    </section>
  );
}

function OwedSummary({ ctx }: { ctx: ActContext }) {
  const { task, kase, people, signatory } = ctx;
  const payers = signatoriesOf(kase, people);
  const due = dueCueOf(task);
  return (
    <DescriptionList>
      <Row label="Amount">
        <span className="text-title-s font-semibold tabular-nums">
          {task.amountPaise !== undefined ? rupees(task.amountPaise) : "To be fetched"}
        </span>
      </Row>
      <Row label="Fee head">{task.feeHead ?? "—"}</Row>
      <Row label="For">{task.whatToDo}</Row>
      <Row label="Why">
        {task.why.event}
        {/dated|on \d/.test(task.why.event) ? null : (
          <span className="text-muted-foreground"> · {longDate(task.why.at)}</span>
        )}
      </Row>
      <Row label="Due">
        {due.primary === "No date" ? (
          <span className="text-muted-foreground">No date set</span>
        ) : (
          <>
            <span className={cn("tabular-nums", due.overdue && "font-medium text-destructive-ink")}>
              {due.primary}
            </span>
            {due.date ? <span className="tabular-nums text-muted-foreground"> · {due.date}</span> : null}
          </>
        )}
        {task.deadlineNote ? (
          <span className="block text-caption text-muted-foreground">{task.deadlineNote}</span>
        ) : null}
      </Row>
      <Row label="Payer">
        {payers.map((p) => p.name).join(" or ") || "A signatory"}
        {signatory ? <span className="text-muted-foreground"> · you</span> : null}
      </Row>
      {task.completion?.receipt ? (
        <Row label="Receipt">
          <span className="inline-flex items-center gap-1.5">
            <CircleCheckIcon aria-hidden className="size-4 text-success-ink" />
            <Identifier value={task.completion.receipt} label="receipt" />
          </span>
        </Row>
      ) : null}
    </DescriptionList>
  );
}

/** A failed previous attempt — carried onto both stages, because it is why you are here again. */
function FailedNotice({
  task,
  justFailed,
  innerRef,
}: {
  task: ActContext["task"];
  justFailed: boolean;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (task.lastPayment?.result !== "failed") return null;
  return (
    <div ref={innerRef} tabIndex={-1} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <SectionNotice
        variant="destructive"
        announce={justFailed ? "assertive" : "none"}
        title="Last attempt failed"
      >
        {/* Consequence first, evidence under it. The reference used to sit in the middle
            of the sentence, where a ten-character opaque string breaks the line you are
            trying to read and the timestamp runs straight into it; as its own quiet line
            it can be scanned, or ignored, which is what a reference number is for.

            The wording is the outcome screen's, verbatim. One event should not have two
            descriptions depending on which screen caught it — and "try again" is gone
            because the button underneath says Pay, not Try again. */}
        <span className="flex flex-col gap-1">
          <span>No money left the account. The fee is still owed.</span>
          <span className="text-caption">
            {dateTime(task.lastPayment.at)}
            <span aria-hidden> · </span>
            Ref{" "}
            {/* Copyable only once the alert has stopped announcing. A copy control's
                accessible name is read out as part of an assertive alert, so in the
                moment after a failure it would talk over the failure; on a task reopened
                later there is no announcement to interrupt, and the reference is exactly
                the thing worth lifting to quote to a bank. */}
            <Identifier
              value={task.lastPayment.ref}
              label="payment reference"
              copyable={!justFailed}
            />
          </span>
        </span>
      </SectionNotice>
    </div>
  );
}

type PayStage = "demand" | "outcome";
const PAY_STAGES = ["demand", "outcome"] as const;
/**
 * **One scene, both stages.** An outcome is not a place you travel to — it is the act you
 * just performed, settling. `useStagedFlow` only animates a stage whose scene changes, so
 * sharing the scene keeps the panel exactly where it is and lets the band be the only
 * thing that moves (`ui-craft` motion: "a settled outcome is not a stage change — the
 * scene it settles in stays where it is and uses RESOLVE_IN_PLACE").
 */
const PAY_SCENES: Record<PayStage, string> = { demand: "pay", outcome: "pay" };

/**
 * The signatory's pay flow: what is owed, then what the gateway answered — two stages of
 * one window, never a second window.
 *
 * ## There is no method screen
 *
 * A stage offering UPI / card / netbanking stood here and has been taken out (owner, this
 * round). Payment happens at the gateway, and the gateway asks that question with its own
 * rails and its own licensed logos; asking it first in our chrome was a screen that
 * collected an answer nobody downstream consumed. What DRISTI owns is the demand and the
 * **return** — so Pay commits, and the next thing on screen is the answer.
 */
function PayFlow({ ctx }: { ctx: ActContext }) {
  const { task, user, online, finish } = ctx;
  const { act, busy } = useTaskActions();
  const scenario = usePayScenario(task.id);
  /* What the attempt came back with, held here rather than read off the task: a bench fee
     is re-armed on the way out, and the screen must keep showing what actually happened. */
  const [answered, setAnswered] = React.useState<{ result: PaymentResult; ref: string; at: string } | null>(null);
  // Set when the attempt just made failed: the notice announces and takes focus, and the
  // person stays here with the Pay button — a failure is not a reason to leave.
  const [justFailed, setJustFailed] = React.useState(false);
  const failedRef = React.useRef<HTMLDivElement>(null);
  const demandRef = React.useRef<HTMLHeadingElement>(null);
  const outcomeRef = React.useRef<HTMLHeadingElement>(null);

  const flow = useStagedFlow<PayStage>({
    order: PAY_STAGES,
    scene: PAY_SCENES,
    /* Each stage lands on its own heading: the act modal owns the title above, so the
       line that changed is the one inside the stage, not the one in the chrome. */
    focus: { demand: demandRef, outcome: outcomeRef },
  });

  const amount = task.amountPaise !== undefined ? rupees(task.amountPaise) : "the fee";
  const payable = task.amountPaise !== undefined;
  /* A scenario the transitions cannot yet produce can only arrive from a stale
     `sessionStorage` entry written by a later build. Rather than quietly paying a
     different way than the row promises, the button says it cannot. */
  const outcome = scenarioSpec(scenario).result;

  const pay = async () => {
    if (!outcome) return;
    const t = await act(task.id, (x, c) => recordPayment(x, c, outcome));
    if (!t) return;
    setAnswered({
      result: outcome,
      ref: t.lastPayment?.ref ?? t.completion?.receipt ?? "—",
      at: t.lastPayment?.at ?? new Date().toISOString(),
    });
    flow.go("outcome");
    /* A bench fee goes back on the bench the moment the answer is recorded, not when the
       modal is dismissed. The close button, Escape and the overlay all shut the dialog
       without passing through any control of ours, and every one of those was losing the
       card. The outcome screen reads from `answered` rather than from the task, and the
       modal holds a frozen snapshot of it, so restoring it underneath changes nothing on
       screen. Failed is left alone: it never moved the task out of Needs action, and its
       `lastPayment` is what draws the notice when you press Try again. */
    if (isBenchTask(task.id) && outcome !== "failed") {
      await act(task.id, rearmBench);
    }
  };

  /* Leaving the modal. The outcome screen has already said what happened, so `finish`
     is called without a message — a toast repeating it would be the same sentence twice. */
  const close = () => finish();

  const retry = () => {
    setAnswered(null);
    setJustFailed(true);
    flow.go("demand");
  };

  React.useEffect(() => {
    if (!justFailed) return;
    const id = window.requestAnimationFrame(() => failedRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [justFailed, task.lastPayment?.at]);

  if (flow.stage === "outcome" && answered) {
    const answer = ANSWER[answered.result];
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <h3 ref={outcomeRef} tabIndex={-1} className="sr-only outline-none">
          Payment result
        </h3>
        {/* The same facts, stamped. The container holds still and only the band arrives,
            which is what makes this read as the act settling rather than a new screen. */}
        <div className="overflow-hidden rounded-xl border border-hairline">
          <div
            key={answered.result}
            className={cn("flex items-center gap-2 px-4 py-3", answer.band, RESOLVE_IN_PLACE)}
          >
            <answer.Icon aria-hidden className="size-5 shrink-0" />
            {/* `role="status"` is what gets the outcome spoken: focus lands on the
                heading above, which announces itself and nothing under it. */}
            <p role="status" className="text-body font-semibold">
              {answer.headline}
            </p>
          </div>
          <div className="bg-surface-sunken px-4">
            <DescriptionList>
              {/* Who paid leads: a receipt is read to answer "who settled this", and on
                  a case several advocates may act, so the name is the first fact and the
                  number is the reference for it. No "· you" marker — the demand stage
                  earns one because its Payer row lists everyone who *may* pay and has to
                  say which is you; this row is a single person who already did. */}
              <Row label={answer.byLabel}>{user.name}</Row>
              <Row label={answer.refLabel}>
                <Identifier value={answered.ref} label={answer.refLabel.toLowerCase()} />
              </Row>
              <Row label={answer.whenLabel}>
                <span className="tabular-nums">{dateTime(answered.at)}</span>
              </Row>
              <Row label="Fee head">{task.feeHead ?? "—"}</Row>
              <Row label="Amount">
                <span className="font-semibold tabular-nums">{amount}</span>
              </Row>
            </DescriptionList>
          </div>
        </div>

        {/* One footer row: what it means on the left, what to do about it on the right
            (owner, 2026-09-20). Two stacked full-width blocks left the modal ending in a
            lot of vertical nothing, and the sentence and the button are answering the
            same moment. Below `sm` it stacks — the failed body runs to two lines at phone
            width and would crush a pair of buttons beside it. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-body-compact text-muted-foreground sm:flex-1">{answer.body}</p>
          <div className="flex flex-col-reverse gap-2 sm:shrink-0 sm:flex-row">
            {answered.result === "failed" ? (
              <Button variant="outline" disabled={!!busy} onClick={retry}>
                Try again
              </Button>
            ) : null}
            <Button disabled={!!busy} onClick={close}>
              {answered.result === "failed" ? "Close" : "Done"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    /* `gap-4`, not `gap-6`: `DialogContent` is a `grid gap-4 p-6`, so the header-to-body
       break is 16px and anything larger inside the body puts the widest gap in the modal
       somewhere other than its biggest structural seam. One rhythm — 16px between blocks,
       12px and 8px within them — so hierarchy reads from the tighter end.

       **No height floor.** There was a `sm:min-h-96` here to stop the panel shrinking
       when the shorter stage arrived. It never earned it: the demand stage runs past
       384px on its own, so the floor could not equalise the two — it only propped the
       outcome up, which showed as ~55px of dead space under the footer against a 24px
       `p-6` on every other edge (owner, 2026-09-20). Trading a stable panel height for a
       consistent frame is the right way round here; the two stages share a scene, so the
       resize is the only movement between them and nothing slides under it. */
    <div className="flex min-w-0 flex-col gap-4">
      <OwedSection ctx={ctx} headingRef={demandRef} />
      <div className="flex flex-col gap-3">
        <PreparedNote ctx={ctx} />
        <FailedNotice task={task} justFailed={justFailed} innerRef={failedRef} />
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={!online || !!busy || !payable || !outcome}
            onClick={() => void pay()}
          >
            Pay{payable ? ` ${rupees(task.amountPaise!)}` : ""}
          </Button>
          {!payable ? (
            <p className="text-caption text-muted-foreground">
              Amount to be fetched — the fee is not on the task yet.
            </p>
          ) : !outcome ? (
            <p className="text-caption text-muted-foreground">
              The sandbox answer chosen on the row is not built yet — pick another on the queue.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConfirmingCard({ ctx }: { ctx: ActContext }) {
  const { task, online, finish } = ctx;
  const { act, busy } = useTaskActions();
  return (
    <RailCard
      title="Payment confirming"
      description={`Paid ${task.lastPayment ? `on ${dateTime(task.lastPayment.at)}` : ""} — the gateway has not confirmed yet. Ref ${task.lastPayment?.ref ?? "—"}.`}
    >
      <Button
        variant="outline"
        disabled={!online || !!busy}
        onClick={async () => {
          const t = await act(task.id, confirmPayment);
          if (t) finish(`Payment confirmed — receipt ${t.completion?.receipt ?? ""}`);
        }}
      >
        Gateway: confirm
      </Button>
      <p className="text-caption text-muted-foreground">Sandbox — stands in for the gateway&apos;s callback.</p>
    </RailCard>
  );
}

/**
 * The pay flow inside the act modal.
 *
 * Only the payable path is staged: a closed record, a gateway still confirming, and a
 * viewer who may only prepare all have one thing to look at and nothing to walk through,
 * so they keep the single-stage shape — the summary, then their one rail.
 */
export function PayBody({ ctx }: { ctx: ActContext }) {
  const { task, signatory } = ctx;

  if (!TERMINAL.has(task.status) && task.status !== "payment-confirming" && signatory) {
    return <PayFlow ctx={ctx} />;
  }

  let rail: React.ReactNode;
  if (TERMINAL.has(task.status)) rail = <RecordCard ctx={ctx} title={closedTitle(task, "Paid")} />;
  else if (task.status === "payment-confirming") rail = <ConfirmingCard ctx={ctx} />;
  else rail = <PrepareCard ctx={ctx} what="pay" />;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <OwedSection ctx={ctx} />
      {rail}
    </div>
  );
}
