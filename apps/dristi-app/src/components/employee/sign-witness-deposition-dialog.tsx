"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { DocumentPreview } from "@/components/cases/document-preview";
import { Badge } from "@/components/ui/badge";
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
  buildWitnessDepositionDocument,
  depositionTitle,
  downloadWitnessDepositionDocument,
  formatDepositionDate,
  type WitnessDeposition,
  type WitnessDepositionDocument,
} from "@/lib/employee/sign-witness-deposition";
import { Identifier } from "@/components/chrome/identifier";

/**
 * One deposition, read and then signed — the single-sheet path off the evidence queue.
 *
 * The document *is* the task, so the dialog is the document: a `height="fill"`
 * `DocumentPreview` in a tall overlay, the same layout `SignOrderDialog`,
 * `SignFormDialog` and `ReschedulingRequestDialog` already use to read a court paper
 * before acting on it. The reference draws this screen's overlay as the sheet and
 * nothing else, and it is right to: evidence is long, and the bench signing it is
 * certifying that this is what the witness said.
 *
 * One step rather than the two the forms queue needs. A form is signed by a *party*, so
 * that dialog has to ask how — e-sign, or upload the paper they signed. A deposition is
 * signed by the bench that is already logged in, so the act is one button under the
 * document it acts on, as it is for orders.
 *
 * Download is not repeated in the footer. `DocumentPreview` owns a sticky header with
 * Download and Full view in it, and the same control twice in one dialog is one too
 * many.
 *
 * **Signing signs nothing.** It drops the sheet from the demo queue and closes — see
 * `lib/employee/sign-witness-deposition.ts`. Nothing is written, published, sent or
 * filed, and no e-sign provider is called.
 */
export function SignWitnessDepositionDialog({
  deposition,
  onOpenChange,
  onSign,
  onReturnFocus,
}: {
  deposition: WitnessDeposition | null;
  onOpenChange: (deposition: WitnessDeposition | null) => void;
  onSign: (deposition: WitnessDeposition) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog
      open={deposition !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {deposition ? (
        /* Keyed on the sheet so opening a second one renders that document from the top
           rather than inheriting the last one's scroll. */
        <SignWitnessDepositionBody
          key={deposition.id}
          deposition={deposition}
          onSign={onSign}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function SignWitnessDepositionBody({
  deposition,
  onSign,
  onReturnFocus,
}: {
  deposition: WitnessDeposition;
  onSign: (deposition: WitnessDeposition) => void;
  onReturnFocus: () => void;
}) {
  const document = React.useMemo(
    () => buildWitnessDepositionDocument(deposition),
    [deposition],
  );
  const title = depositionTitle(deposition);

  return (
    <ChromeDialogContent
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
    >
      {/* `pr-16` keeps the title clear of the close button the DS places top-right. */}
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          {/* The reference's own title: the paper, and which witness's it is. */}
          <DialogTitle className="text-title-s font-semibold">
            {title}
          </DialogTitle>
          {/* The sheet's state — waiting for this bench's signature — in the DS's
              sentence case rather than the reference's shouted status. `warning` is the
              variant the sibling overlays already spend on a pending paper, so the
              court side reports a pending state one way. */}
          <Badge variant="warning">Pending signature</Badge>
        </div>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(deposition)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={deposition.caseNumber} label="case number" copyable={false} />{" "}
          · Recorded{" "}
          {formatDepositionDate(deposition.depositionOn)}
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col p-6">
        <DocumentPreview
          className="min-h-96 md:min-h-0"
          height="fill"
          title={title}
          source={{
            kind: "composed",
            content: <DepositionFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadWitnessDepositionDocument(deposition),
            label: `Download the ${title.toLowerCase()}`,
          }}
        />
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 sm:items-center">
        {/* What the act means, and what this build does not do — said at the moment of
            the act rather than left for the bench to discover. */}
        <p className="text-caption text-muted-foreground sm:mr-auto sm:text-left">
          Signing publishes this deposition and cannot be reversed. Not part of
          this build — nothing is signed, published or sent.
        </p>
        <Button type="button" onClick={() => onSign(deposition)}>
          Sign and publish
        </Button>
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/**
 * The deposition itself as paper — the same facsimile treatment the three other
 * court-side overlays use, bound to this sheet's own particulars.
 *
 * Two things are its own. The **particulars** block names who was in the box, and is
 * the part of a deposition that identifies the same witness if they are recalled. And
 * the evidence is **split into chief and cross-examination**, under headings, because
 * that division is what a deposition is read for: the answers a witness gave their own
 * side, and the answers they gave the other. Where there was no cross-examination the
 * heading stays and says why, rather than the section vanishing — a missing section on
 * a court paper reads as a document that failed to render.
 */
function DepositionFacsimile({
  document,
}: {
  document: WitnessDepositionDocument;
}) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <h3 className="text-body font-semibold">{document.title}</h3>
        <p className="text-body-compact text-paper-muted-foreground">
          ({document.citation})
        </p>
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body">{document.jurisdiction}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body">{document.matter}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h4 className="text-body font-semibold">{document.subject}</h4>
        <dl className="flex flex-col gap-1">
          {document.particulars.map(({ label, value }) => (
            <div key={label} className="flex flex-wrap gap-1">
              <dt className="text-body text-paper-muted-foreground">
                {label}:
              </dt>
              <dd className="text-body">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-body font-semibold">Examination-in-chief</h4>
        <ol className="flex list-decimal flex-col gap-3 ps-6">
          {document.chief.map((paragraph, index) => (
            <li key={index} className="text-body">
              {paragraph}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-body font-semibold">Cross-examination</h4>
        {document.cross.length > 0 ? (
          <ol className="flex list-decimal flex-col gap-3 ps-6">
            {document.cross.map((paragraph, index) => (
              <li key={index} className="text-body">
                {paragraph}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body">{document.crossNote}</p>
        )}
      </section>

      <p className="text-body">{document.attestation}</p>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}
