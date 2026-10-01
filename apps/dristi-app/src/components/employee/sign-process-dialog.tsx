"use client";

import * as React from "react";

import {
  StagedOverlay,
  useStagedFlow,
} from "@/components/chrome/staged-overlay";
import { DocumentPreview } from "@/components/cases/document-preview";
import {
  SIGN_SCENES,
  SIGN_STAGES,
  SignatureActions,
  SignatureStage,
  type SignStage,
} from "@/components/employee/sign-method-stage";
import { useSignatureChoice } from "@/components/employee/sign-signature-fields";
import { useHeldRecord } from "@/components/employee/use-held-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { causeTitle } from "@/lib/employee/hearings";
import {
  buildProcessDocument,
  courtProcessTypeInline,
  downloadProcessDocument,
  formatProcessDate,
  NON_DELIVERY_REASONS,
  outcomeComplete,
  outcomeLabel,
  outcomeOptions,
  outcomeRecordedByHand,
  outcomeVariant,
  processChannelLabel,
  processStage,
  todayIsoDay,
  type CourtProcess,
  type ProcessDocument,
  type ProcessOutcome,
  type ProcessOutcomeStatus,
} from "@/lib/employee/sign-process";
import { Identifier } from "@/components/chrome/identifier";
import { DialogDescription } from "@/components/ui/dialog";

/** What the paper is called in the signature stage's copy. */
const NOUN = "process";

/**
 * The window's stages: the paper, the signature, and — for a process out on a channel
 * whose outcome is recorded by hand — what came back (`DSP-03`, `DSP-08`). Recording an
 * outcome is its own scene: a form, not the paper.
 */
const STAGES = [...SIGN_STAGES, "outcome"] as const;
type Stage = SignStage | "outcome";
const SCENES: Record<Stage, string> = { ...SIGN_SCENES, outcome: "outcome" };

/**
 * What the bench is about to sign, in one sentence.
 *
 * Named by its instrument rather than counted, because a case can carry three separate
 * processes and "the process in ST/1301/2026" would not tell the bench which of them.
 * Only the single-document path reaches this.
 */
function processSubject(process: CourtProcess): string {
  return `You are adding your signature to the ${courtProcessTypeInline(process.type)} in ${process.caseNumber}.`;
}

/**
 * One process, read — and signed, where the stage it is standing in is the one that
 * signs.
 *
 * The same two-stage act the four single-document queues share, in **one** overlay
 * (owner, 2026-09-16). Reading is the wide stage: the paper *is* the task, so it is a
 * `height="fill"` `DocumentPreview` on the canvas. Signing is the narrow stage: what is
 * about to be signed, the choice of how, and Submit, in a reading-width column centred in
 * the same window. It was two `Dialog`s until now — see `sign-method-stage.tsx`.
 *
 * **The signature stage only exists on Pending sign.** A process waiting for its
 * registered-post cover has not been drawn up for signature yet; one already signed,
 * sent or closed off cannot be signed twice. Those four stages open this overlay
 * read-only, which is the only way to see the paper without leaving the screen and costs
 * nothing but the absence of a button.
 *
 * **Submit signs nothing.** It moves the row one stage along in the demo line and
 * closes — see `lib/employee/sign-process.ts`. Nothing is written, printed, posted or
 * served, and no e-sign provider is called.
 */
export function SignProcessDialog({
  process,
  onOpenChange,
  onSign,
  onRecordOutcome,
  onReturnFocus,
}: {
  process: CourtProcess | null;
  onOpenChange: (process: CourtProcess | null) => void;
  onSign: (process: CourtProcess) => void;
  onRecordOutcome: (process: CourtProcess, outcome: ProcessOutcome) => void;
  onReturnFocus: () => void;
}) {
  const { held, opening } = useHeldRecord(process);

  return (
    <Dialog
      open={process !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(null);
      }}
    >
      {/* Keyed on the opening: a fresh window starts on the paper with an empty
          signature, and the one that is leaving keeps the stage it was left on. */}
      {held ? (
        <SignProcessBody
          key={opening}
          process={held}
          onSign={onSign}
          onRecordOutcome={onRecordOutcome}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function SignProcessBody({
  process,
  onSign,
  onRecordOutcome,
  onReturnFocus,
}: {
  process: CourtProcess;
  onSign: (process: CourtProcess) => void;
  onRecordOutcome: (process: CourtProcess, outcome: ProcessOutcome) => void;
  onReturnFocus: () => void;
}) {
  const flow = useStagedFlow<Stage>({
    order: STAGES,
    scene: SCENES,
  });
  const [outcome, setOutcome] = React.useState<OutcomeDraft>({ comment: "" });
  const recordable =
    process.stage === "sent" && outcomeRecordedByHand(process.channel);
  const choice = useSignatureChoice(NOUN);
  const document = React.useMemo(
    () => buildProcessDocument(process),
    [process],
  );
  const stage = processStage(process.stage);
  const signable = process.stage === "pending-sign";
  const day = stage.dateOf(process);
  const reading = flow.stage === "read";

  return (
    <StagedOverlay
      /* The width and the height the *document* needs, held for both stages — see
         `SignOrderDialog` for why the height is definite at every width. */
      className="h-[85dvh] sm:max-w-4xl"
      title={
        reading ? document.title : flow.stage === "outcome" ? "Record outcome" : "Add signature"
      }
      titleRef={flow.titleRef}
      /* The stage is the overlay's supporting line rather than a badge beside the title:
         the row was opened from a tab that already names it, so what is worth saying here
         is the stage *with its own date on it* — the fact the row's fourth column carries
         and the one a reader loses when the table goes behind the overlay. It stands on
         both stages, because the record is the same record on both. */
      description={
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(process)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={process.caseNumber} label="case number" copyable={false} />{" "}
          ·{" "}
          {`${processChannelLabel(process.channel)}${
            day ? ` · ${stage.dateColumn} ${formatProcessDate(day)}` : ""
          }`}
        </DialogDescription>
      }
      sceneKey={flow.sceneKey}
      motion={flow.motion}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
      footer={
        reading ? (
          signable ? (
            <Button type="button" onClick={() => flow.go("sign")}>
              Sign this process
            </Button>
          ) : recordable ? (
            <Button type="button" onClick={() => flow.go("outcome")}>
              Record outcome
            </Button>
          ) : null
        ) : flow.stage === "outcome" ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => flow.go("read")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={!outcomeComplete(outcome)}
              onClick={() =>
                outcome.status &&
                onRecordOutcome(process, {
                  status: outcome.status,
                  ...(outcome.status === "not-delivered" ? { reason: outcome.reason } : {}),
                  comment: outcome.comment.trim(),
                  ...(outcome.fileName ? { fileName: outcome.fileName } : {}),
                  recordedOn: todayIsoDay(),
                })
              }
            >
              Record outcome
            </Button>
          </div>
        ) : (
          <SignatureActions
            choice={choice}
            onBack={() => flow.go("read")}
            onSubmit={() => onSign(process)}
          />
        )
      }
    >
      {flow.stage === "outcome" ? (
        <OutcomeForm process={process} draft={outcome} onChange={setOutcome} />
      ) : reading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {process.outcome ? <OutcomeSummary process={process} /> : null}
          <DocumentPreview
          /* The stage canvas is a flex column, so the preview only takes the height the
             window can spare if it says so: a flex item's height is never stretched for
             it. The grid callers get this from a `minmax(0,1fr)` row; here it is
             `flex-1`, and `min-h-0` lets it shrink rather than pushing the footer. */
          className="min-h-0 flex-1"
          height="fill"
          title={document.title}
          source={{
            kind: "composed",
            content: <ProcessFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadProcessDocument(process),
            label: `Download the ${courtProcessTypeInline(process.type)}`,
          }}
        />
        </div>
      ) : (
        <SignatureStage
          noun={NOUN}
          subject={processSubject(process)}
          warning="Signing this process cannot be reversed."
          download={{
            prompt: "Want to read it again?",
            onDownload: () => downloadProcessDocument(process),
          }}
          choice={choice}
        />
      )}
    </StagedOverlay>
  );
}

/**
 * The process itself as paper — the same facsimile treatment the other court-side
 * overlays use, bound to this row's own particulars.
 *
 * One addition the order facsimile has no use for: the addressee, immediately under the
 * title. A process is an instrument commanding a named person, and who it commands is
 * written on the face of it before anything else is said.
 */
function ProcessFacsimile({ document }: { document: ProcessDocument }) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body font-semibold">{document.matter}</p>
      </header>

      <div className="flex flex-col gap-2">
        <h3 className="text-center text-body font-semibold">
          {document.title}
        </h3>
        <p className="text-body">{document.addressee}</p>
      </div>

      <ol className="flex list-decimal flex-col gap-3 ps-6">
        {document.paragraphs.map((paragraph, index) => (
          <li key={index} className="text-body">
            {paragraph}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <p className="text-body">{document.channel}</p>
        <p className="text-body">Dated this the {document.dated}.</p>
      </div>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}

type OutcomeDraft = {
  status?: ProcessOutcomeStatus;
  reason?: string;
  comment: string;
  fileName?: string;
};

/**
 * What came back, recorded by the person who has the acknowledgement or return in hand
 * (`DSP-08`): the outcome, a comment, an optional supporting file — and, for a negative
 * outcome, a reason from the state's list (`DSP-09`).
 */
function OutcomeForm({
  process,
  draft,
  onChange,
}: {
  process: CourtProcess;
  draft: OutcomeDraft;
  onChange: (draft: OutcomeDraft) => void;
}) {
  const options = outcomeOptions(process.type);
  const negative = draft.status === "not-delivered";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <p className="text-body-compact text-muted-foreground">
        Record what the {processChannelLabel(process.channel)} acknowledgement or return
        says for the {courtProcessTypeInline(process.type)} in {process.caseNumber}. The
        process closes on it and moves to Completed.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption mb-1 font-semibold text-muted-foreground">
          Outcome
        </legend>
        <RadioGroup
          value={draft.status ?? ""}
          onValueChange={(value) =>
            onChange({ ...draft, status: value as ProcessOutcomeStatus })
          }
          className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3"
        >
          {options.map((option) => (
            <div key={option.id} className="flex min-h-10 items-start gap-2 py-1">
              <RadioGroupItem
                id={`outcome-${option.id}`}
                value={option.id}
                className="mt-0.5"
              />
              <Label
                htmlFor={`outcome-${option.id}`}
                className="flex flex-col items-start gap-0.5 text-left font-normal"
              >
                <span className="text-body-compact font-medium text-foreground">
                  {option.label}
                </span>
                <span className="text-caption text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      {negative ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="outcome-reason" className="text-caption font-semibold text-muted-foreground">
            Reason
          </Label>
          <NativeSelect
            id="outcome-reason"
            value={draft.reason ?? ""}
            onChange={(event) =>
              onChange({ ...draft, reason: event.target.value || undefined })
            }
            className="w-full sm:w-80"
          >
            <NativeSelectOption value="">Choose a reason</NativeSelectOption>
            {NON_DELIVERY_REASONS.map((reason) => (
              <NativeSelectOption key={reason} value={reason}>
                {reason}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      <Field className="gap-2">
        <FieldLabel className="text-caption font-semibold text-muted-foreground">
          Comment
        </FieldLabel>
        <Textarea
          value={draft.comment}
          onChange={(event) => onChange({ ...draft, comment: event.target.value })}
          placeholder="What the acknowledgement or return says"
          rows={3}
        />
      </Field>

      <Field className="gap-2">
        <FieldLabel className="text-caption font-semibold text-muted-foreground">
          Supporting file <span className="font-normal">(optional)</span>
        </FieldLabel>
        <Input
          type="file"
          onChange={(event) =>
            onChange({ ...draft, fileName: event.target.files?.[0]?.name })
          }
          className="max-w-sm cursor-pointer file:mr-3 file:font-medium"
        />
        <FieldDescription className="text-caption text-muted-foreground">
          The acknowledgement card, the police return or the bailiff&apos;s report. Only
          its name is kept here — nothing is uploaded.
        </FieldDescription>
      </Field>
    </div>
  );
}

/** What was recorded, shown on a completed process above its paper. */
function OutcomeSummary({ process }: { process: CourtProcess }) {
  const outcome = process.outcome;
  if (!outcome) return null;
  return (
    <section
      aria-label="Outcome"
      className="flex shrink-0 flex-col gap-1 rounded-lg bg-surface-sunken p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={outcomeVariant(outcome.status)}>
          {outcomeLabel(process.type, outcome.status)}
        </Badge>
        <span className="text-caption tabular-nums text-muted-foreground">
          Recorded {formatProcessDate(outcome.recordedOn)}
        </span>
      </div>
      {outcome.reason ? (
        <p className="text-body-compact text-foreground">{outcome.reason}</p>
      ) : null}
      <p className="text-body-compact text-muted-foreground">{outcome.comment}</p>
      {outcome.fileName ? (
        <p className="text-caption text-muted-foreground">File: {outcome.fileName}</p>
      ) : null}
    </section>
  );
}
