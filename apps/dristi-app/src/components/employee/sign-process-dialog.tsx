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
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { causeTitle } from "@/lib/employee/hearings";
import {
  buildProcessDocument,
  courtProcessTypeInline,
  downloadProcessDocument,
  formatProcessDate,
  processChannelLabel,
  processStage,
  type CourtProcess,
  type ProcessDocument,
} from "@/lib/employee/sign-process";
import { Identifier } from "@/components/chrome/identifier";
import { DialogDescription } from "@/components/ui/dialog";

/** What the paper is called in the signature stage's copy. */
const NOUN = "process";

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
  onReturnFocus,
}: {
  process: CourtProcess | null;
  onOpenChange: (process: CourtProcess | null) => void;
  onSign: (process: CourtProcess) => void;
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
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function SignProcessBody({
  process,
  onSign,
  onReturnFocus,
}: {
  process: CourtProcess;
  onSign: (process: CourtProcess) => void;
  onReturnFocus: () => void;
}) {
  const flow = useStagedFlow<SignStage>({
    order: SIGN_STAGES,
    scene: SIGN_SCENES,
  });
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
      title={reading ? document.title : "Add signature"}
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
          ) : null
        ) : (
          <SignatureActions
            choice={choice}
            onBack={() => flow.go("read")}
            onSubmit={() => onSign(process)}
          />
        )
      }
    >
      {reading ? (
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
