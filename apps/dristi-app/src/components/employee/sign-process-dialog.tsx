"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { DocumentPreview } from "@/components/cases/document-preview";
import { SignMethodDialog } from "@/components/employee/sign-method-dialog";
import { useSignatureChoice } from "@/components/employee/sign-signature-fields";
import {
  useHeld,
  useSignStepHandoff,
} from "@/components/employee/use-sign-step-handoff";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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

/** What the paper is called in the signature overlay's copy. */
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
 * The same two-overlay path the four single-act queues use, and for the same reasons.
 * Reading is the wide step: the paper *is* the task, so it is a `height="fill"`
 * `DocumentPreview` in a tall overlay. Signing is the narrow step: what is about to be
 * signed, the choice of how, and Submit. They are two Dialogs sequenced by
 * `useSignStepHandoff` rather than two states of one, so the second plays the DS enter
 * animation instead of jumping the box from the document size to the method size in a
 * single frame.
 *
 * **The signature step only exists on Pending sign.** A process waiting for its
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
  const held = useHeld(process);
  const handoff = useSignStepHandoff(process !== null);
  const choice = useSignatureChoice(NOUN);

  React.useEffect(() => {
    if (!process) return;
    choice.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on identity, not on every choice render
  }, [process?.id]);

  if (!held) return null;

  function dismiss() {
    onOpenChange(null);
  }

  return (
    <>
      <Dialog
        open={handoff.readOpen}
        onOpenChange={(open) => handoff.onReadOpenChange(open, dismiss)}
      >
        <SignProcessReadBody
          process={held}
          onProceed={handoff.goToSign}
          onCloseAutoFocus={(event) =>
            handoff.onReadCloseAutoFocus(event, onReturnFocus)
          }
        />
      </Dialog>

      <SignMethodDialog
        open={handoff.signOpen}
        onOpenChange={(open) => handoff.onSignOpenChange(open, dismiss)}
        onCloseAutoFocus={(event) =>
          handoff.onSignCloseAutoFocus(event, onReturnFocus)
        }
        noun={NOUN}
        subject={processSubject(held)}
        warning="Signing this process cannot be reversed."
        download={{
          prompt: "Want to read it again?",
          onDownload: () => downloadProcessDocument(held),
        }}
        choice={choice}
        onBack={handoff.goToRead}
        onSubmit={() => onSign(held)}
      />
    </>
  );
}

function SignProcessReadBody({
  process,
  onProceed,
  onCloseAutoFocus,
}: {
  process: CourtProcess;
  onProceed: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const document = React.useMemo(
    () => buildProcessDocument(process),
    [process],
  );
  const stage = processStage(process.stage);
  const signable = process.stage === "pending-sign";
  const day = stage.dateOf(process);

  return (
    <ChromeDialogContent
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* `pr-16` keeps the title clear of the close button the DS places top-right. */}
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <DialogTitle className="text-title-s font-semibold">
          {document.title}
        </DialogTitle>
        {/* The stage is the overlay's supporting line rather than a badge beside the
            title: the row was opened from a tab that already names it, so what is worth
            saying here is the stage *with its own date on it* — the fact the row's fourth
            column carries and the one a reader loses when the table goes behind the
            overlay. */}
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(process)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={process.caseNumber} label="case number" copyable={false} />{" "}
          ·{" "}
          {processChannelLabel(process.channel)}
          {day ? ` · ${stage.dateColumn} ${formatProcessDate(day)}` : null}
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col p-6">
        <DocumentPreview
          className="min-h-96 md:min-h-0"
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

      {signable ? (
        <DialogFooter className="mx-0 mb-0 shrink-0">
          <Button type="button" onClick={onProceed}>
            Sign this process
          </Button>
        </DialogFooter>
      ) : null}
    </ChromeDialogContent>
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
