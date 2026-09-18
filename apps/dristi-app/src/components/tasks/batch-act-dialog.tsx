"use client";

import * as React from "react";
import { CheckIcon, SignatureIcon } from "lucide-react";

import { rupees } from "@/lib/tasks/format";
import { useTasks } from "@/lib/tasks/store";
import { recordPayment, sign, TransitionError } from "@/lib/tasks/transitions";
import type { PaymentResult, Person, Task, TaskId } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";

/**
 * Signing or paying a selected set — one authorisation for the whole set.
 *
 * The handover's one note to developers: "the UI will allow users to select multiple
 * signing or payment tasks and complete them in one action (one OTP, one transaction).
 * Each task remains an individual record." So the authorisation happens once, here, and
 * the set is then applied task by task, because each task closes on its own event and
 * any one of them can be refused. Part success is the normal case, not the exception.
 *
 * ## Two steps, and why it was three
 *
 * The first build asked three screens for one decision: a review that re-listed every
 * ticked task, an authorise step, then a result. The owner called it clunky (2026-09-16)
 * and the court side's own bulk-sign confirmation says why in its margin — *"what was
 * ticked is the list it just came from; restating it here is a second reading of the
 * same page at the moment it has to decide."* The list behind the dialog is that list,
 * and the selection bar above it already carries the count and the total.
 *
 * So this is the shape that queue uses, which the owner has already approved: a header
 * that asks the question with the one fact nowhere else on screen — the money — a line
 * under it naming the risk, and the single control the act genuinely needs. Nothing
 * between the header and the footer.
 *
 * The per-task list earns its place in exactly one state: when something was refused.
 * There it is the only place the outcome of each task exists.
 */

type Step = "confirm" | "result";
/**
 * What became of one task. `confirming` is its own answer, not a shade of done: the
 * gateway has the money and the registry has not confirmed it, so the task sits in
 * `payment-confirming` and nothing may call it paid.
 */
type Mark = "done" | "confirming" | "failed";
type Outcome = { id: TaskId; title: string; mark: Mark; note: string };

const MARK_LABEL: Record<Mark, string> = { done: "Done", confirming: "Confirming", failed: "Not done" };
const MARK_CLASS: Record<Mark, string> = {
  done: "text-success-ink",
  confirming: "text-warning-ink",
  failed: "text-destructive-ink",
};

const GATEWAY: { value: PaymentResult; label: string }[] = [
  { value: "success", label: "Success — receipts issued" },
  { value: "pending", label: "Confirming — the gateway is still deciding" },
  { value: "failed", label: "Failed — nothing is paid" },
];

export function BatchActDialog({
  kind,
  tasks,
  user,
  open,
  onOpenChange,
  onFinished,
}: {
  kind: "sign" | "pay" | null;
  tasks: Task[];
  user: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ids that left the selection, so the screen can clear them. */
  onFinished: (closed: TaskId[]) => void;
}) {
  /**
   * While the set is being applied the dialog cannot be dismissed. It used to pass
   * `onOpenChange` straight through, so Escape unmounted the body mid-run: the remaining
   * signatures and payments still committed — the loop and the store outlive the
   * unmount — and nobody was told which ones (2026-09-15).
   */
  const [running, setRunning] = React.useState(false);
  /**
   * The step lives here because the close button and the dismiss guards depend on it,
   * while the body it belongs to is remounted per open. So it has to be reset here too:
   * left alone, a second open came back on the result step it finished on, rendering an
   * outcome list that had just been remounted empty (render, 2026-09-16).
   */
  const [step, setStep] = React.useState<Step>("confirm");
  /* Adjusted during render rather than in an effect — this is state deriving from a
     prop change, not synchronisation with anything outside React. */
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStep("confirm");
  }
  const close = React.useCallback(() => {
    if (!running) onOpenChange(false);
  }, [running, onOpenChange]);

  return (
    <Dialog open={open && !!kind && tasks.length > 0} onOpenChange={(next) => (next ? undefined : close())}>
      <ChromeDialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        /* The DS's ghost X lands on the result panel's own fill and disappears into it;
           there the footer's Close is the way out. It is also gone while the set is
           being applied, along with Escape and a click outside. */
        showCloseButton={step === "confirm" && !running}
        onEscapeKeyDown={(e) => running && e.preventDefault()}
        onPointerDownOutside={(e) => running && e.preventDefault()}
        onInteractOutside={(e) => running && e.preventDefault()}
      >
        {/* Mounted per open, so the code, the gateway and the outcome all start fresh. */}
        {open && kind ? (
          <BatchBody
            kind={kind}
            tasks={tasks}
            user={user}
            step={step}
            onStep={setStep}
            running={running}
            onRunning={setRunning}
            onClose={() => onOpenChange(false)}
            onFinished={onFinished}
          />
        ) : null}
      </ChromeDialogContent>
    </Dialog>
  );
}

function BatchBody({
  kind,
  tasks,
  user,
  step,
  onStep,
  running,
  onRunning,
  onClose,
  onFinished,
}: {
  kind: "sign" | "pay";
  tasks: Task[];
  user: Person;
  step: Step;
  onStep: (step: Step) => void;
  running: boolean;
  onRunning: (running: boolean) => void;
  onClose: () => void;
  onFinished: (closed: TaskId[]) => void;
}) {
  const { dispatch } = useTasks();
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [otp, setOtp] = React.useState("");
  const [gateway, setGateway] = React.useState<PaymentResult>("success");
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  /** The set this run is acting on — a retry narrows it to what was refused. */
  const [batch, setBatch] = React.useState<Task[]>(tasks);

  /* Swapping the step replaces the dialog's content wholesale; landing focus on the new
     title is what announces the change. Initial open keeps Radix's own focus handling —
     this only runs on a step change. */
  React.useEffect(() => {
    if (step === "result") titleRef.current?.focus();
  }, [step]);

  const n = batch.length;
  const one = n === 1;
  const total = batch.reduce((sum, t) => sum + (t.amountPaise ?? 0), 0);
  const money = rupees(total);
  const caseCount = new Set(batch.map((t) => t.caseId)).size;

  const run = async () => {
    onRunning(true);
    const done: Outcome[] = [];
    for (const task of batch) {
      try {
        const next = await dispatch(task.id, (t, ctx) =>
          kind === "sign" ? sign(t, ctx) : recordPayment(t, ctx, gateway)
        );
        // A failed payment is a legal transition that changes nothing but the note, so
        // "the transition ran" is not the same as "the fee was paid".
        const mark: Mark =
          kind === "pay" ? (gateway === "failed" ? "failed" : gateway === "pending" ? "confirming" : "done") : "done";
        done.push({
          id: task.id,
          title: task.title,
          mark,
          note:
            mark === "failed"
              ? "The gateway declined this one — nothing was debited"
              : kind === "sign"
                ? `Signed — ${next.completion?.receipt ?? ""}`
                : mark === "confirming"
                  ? `Sent — the gateway is confirming${next.lastPayment ? ` (ref ${next.lastPayment.ref})` : ""}`
                  : `${rupees(task.amountPaise ?? 0)} paid — receipt ${next.completion?.receipt ?? ""}`,
        });
      } catch (e) {
        done.push({
          id: task.id,
          title: task.title,
          mark: "failed",
          note: e instanceof TransitionError ? e.message : "Something went wrong — nothing changed",
        });
      }
    }
    onRunning(false);
    setOutcomes(done);
    onStep("result");
    // A confirming payment has left this viewer's queue too — it waits on the gateway.
    onFinished(done.filter((o) => o.mark !== "failed").map((o) => o.id));
  };

  if (step === "result") {
    const refused = outcomes.filter((o) => o.mark === "failed");
    const through = outcomes.filter((o) => o.mark !== "failed");
    const confirming = through.filter((o) => o.mark === "confirming").length;
    const paid = through.reduce(
      (sum, o) => sum + (batch.find((t) => t.id === o.id)?.amountPaise ?? 0),
      0
    );
    const heading = !through.length
      ? kind === "sign"
        ? "Nothing was signed"
        : "Nothing was paid"
      : refused.length
        ? `${through.length} of ${outcomes.length} went through`
        : kind === "sign"
          ? through.length === 1
            ? "Document signed"
            : `${through.length} documents signed`
          : confirming === through.length
            ? "Sent to the gateway"
            : "Paid";
    const outcome = !through.length
      ? "Every one was refused, and each task is exactly where it was."
      : refused.length
        ? "The refused ones are still open, exactly as they were."
        : kind === "sign"
          ? "One OTP covered the set. Each document is attached to its own task."
          : confirming === through.length
            ? "The registry confirms each receipt; the tasks wait until it does."
            : "Charged as one transaction, with a receipt against each fee.";
    const clean = !refused.length && !!through.length;

    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {clean ? (
              /* The product's confirmation panel: the verb the question asked, answered,
                 with the tick under it. */
              <div className="flex flex-col items-center gap-4 rounded-lg bg-success p-6 text-center">
                <div className="flex flex-col gap-1.5">
                  <DialogTitle
                    ref={titleRef}
                    tabIndex={-1}
                    className="text-title-s font-semibold text-balance tabular-nums text-success-foreground outline-none"
                  >
                    {heading}
                  </DialogTitle>
                  {/* Focus lands on the heading, which announces the title and its role
                      and nothing else; a live region is what gets the outcome spoken. */}
                  <DialogDescription
                    role="status"
                    className="text-body-compact text-pretty text-success-foreground"
                  >
                    {outcome}
                  </DialogDescription>
                </div>
                <span className="flex size-10 items-center justify-center rounded-full bg-success-foreground">
                  <CheckIcon className="size-6 text-success" aria-hidden />
                </span>
              </div>
            ) : (
              /* Something was refused, so there is nothing to celebrate: the plain
                 header states the count and the list below carries the detail. */
              <div className="flex flex-col gap-1.5">
                <DialogTitle
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-title-s font-semibold text-balance tabular-nums outline-none"
                >
                  {heading}
                </DialogTitle>
                <DialogDescription role="status" className="text-body text-pretty">
                  {outcome}
                </DialogDescription>
              </div>
            )}

            {clean ? (
              /* The facts, in the well the product's confirmations put facts in. No
                 per-task list: every one of them did the same thing. */
              <DescriptionList className="rounded-lg bg-surface-sunken px-4 py-1">
                {kind === "pay" ? (
                  <DescriptionRow className="grid-cols-[1fr_auto] items-center border-hairline">
                    <DescriptionTerm className="text-body">
                      {confirming === through.length ? "Sent" : "Charged"}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-body font-semibold tabular-nums">
                      {rupees(confirming === through.length ? total : paid)}
                    </DescriptionDetails>
                  </DescriptionRow>
                ) : null}
                <DescriptionRow className="grid-cols-[1fr_auto] items-center border-hairline">
                  <DescriptionTerm className="text-body">
                    {kind === "pay" ? "Fees" : "Documents"}
                  </DescriptionTerm>
                  <DescriptionDetails className="text-body tabular-nums">{through.length}</DescriptionDetails>
                </DescriptionRow>
                <DescriptionRow className="grid-cols-[1fr_auto] items-center border-hairline">
                  <DescriptionTerm className="text-body">Cases</DescriptionTerm>
                  <DescriptionDetails className="text-body tabular-nums">
                    {caseCount === 1 ? "1 case" : `${caseCount} cases`}
                  </DescriptionDetails>
                </DescriptionRow>
              </DescriptionList>
            ) : (
              /* The one state where naming each task earns its place: this is the only
                 place the outcome of each one exists. */
              <ul className="flex flex-col divide-y divide-hairline rounded-lg bg-surface-sunken px-4">
                {outcomes.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body-compact font-medium text-foreground">{o.title}</span>
                      <span className="text-caption text-muted-foreground">{o.note}</span>
                    </div>
                    <span className={cn("text-caption font-semibold", MARK_CLASS[o.mark])}>
                      {MARK_LABEL[o.mark]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
          {refused.length ? (
            <Button
              type="button"
              variant="outline"
              className="tabular-nums"
              onClick={() => {
                setBatch(tasks.filter((t) => refused.some((r) => r.id === t.id)));
                setOutcomes([]);
                setOtp("");
                setGateway("success");
                onStep("confirm");
              }}
            >
              Try {refused.length === 1 ? "it" : `those ${refused.length}`} again
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>
            {refused.length ? "Close" : "Done"}
          </Button>
        </footer>
      </>
    );
  }

  /* The question, and the one control the act needs. The money is the fact that is
     nowhere else at this moment, so it is in the title; the line under it names what can
     go wrong, because a declined fee leaving its task open is the normal case. */
  const question =
    kind === "pay"
      ? one
        ? `Pay ${money}?`
        : `Pay ${money} for ${n} fees?`
      : one
        ? "Sign this document?"
        : `Sign ${n} documents?`;
  const meaning =
    kind === "pay"
      ? one
        ? "Charged now, with a receipt against the fee. If the gateway declines it, the task stays open."
        : `One transaction across ${caseCount === 1 ? "one case" : `${caseCount} cases`}, with a receipt against each fee. Any the gateway declines stay open.`
      : one
        ? `Signed as ${user.name}, and attached to the task and the case file.`
        : `One OTP signs all ${n}, as ${user.name}. Each closes on its own signature.`;

  return (
    <>
      <DialogHeader className="min-h-0 shrink overflow-y-auto border-b border-hairline px-6 py-4 pr-12 text-left">
        <DialogTitle className="text-title-s font-semibold text-balance tabular-nums">
          {question}
        </DialogTitle>
        <DialogDescription className="text-body text-pretty">{meaning}</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {kind === "sign" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="batch-otp" className="text-body-compact font-medium">
              Aadhaar OTP
            </Label>
            <InputOTP id="batch-otp" maxLength={6} value={otp} onChange={setOtp} containerClassName="gap-2">
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-input" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-caption text-muted-foreground">
              Sandbox — any 6-digit code is accepted here.
            </p>
          </div>
        ) : (
          /* Sandbox scaffolding, kept to one line and plainly labelled as such: the
             three outcomes were three stacked radio cards filling their own step, which
             is most of what made this dialog feel like a form. */
          <div className="flex flex-col gap-2">
            <Label htmlFor="batch-gateway" className="text-body-compact font-medium">
              Sandbox gateway
            </Label>
            <NativeSelect
              id="batch-gateway"
              value={gateway}
              onChange={(e) => setGateway(e.target.value as PaymentResult)}
            >
              {GATEWAY.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-caption text-muted-foreground">
              No money moves; the receipt is generated locally.
            </p>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={running} onClick={onClose}>
          Back
        </Button>
        <Button
          type="button"
          disabled={running || (kind === "sign" && otp.length < 6)}
          aria-busy={running || undefined}
          onClick={() => void run()}
          className="tabular-nums"
        >
          {running ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden />
              {kind === "sign" ? "Signing…" : "Paying…"}
            </>
          ) : kind === "sign" ? (
            <>
              <SignatureIcon data-icon="inline-start" aria-hidden />
              {one ? "Sign" : `Sign ${n} documents`}
            </>
          ) : (
            `Pay ${money}`
          )}
        </Button>
      </footer>
    </>
  );
}
