"use client";

import { useMemo } from "react";

import { FlowDialogContent } from "@/components/chrome/flow-dialog";

import { DocumentPreview } from "@/components/cases/document-preview";
import { ReviewRow } from "@/components/cases/filing-form-shared";
import { Button } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/description-list";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildGeneratedApplication,
  downloadGeneratedApplication,
  type GeneratedApplication,
} from "@/lib/cases/application-document";
import { type ApplicationDraft } from "@/lib/cases/application-draft";
import { submissionTypeLabel } from "@/lib/cases/applications";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { Identifier } from "@/components/chrome/identifier";

/**
 * What Generate application produces — the court-form document, shown before
 * signing, mirroring the legacy portal's generated-application modal.
 *
 * One CTA only: Add signature. The legacy Back button is dropped on the
 * product's ask — the dialog's close affordances already return to the
 * review step. The dialog is its own visual region under a scrim, so the
 * teal primary here does not compete with the page (Laws: ration teal per
 * region).
 */
export function GeneratedApplicationDialog({
  open,
  onOpenChange,
  draft,
  record,
  onAddSignature,
  onReturnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ApplicationDraft;
  record: CaseRecord;
  onAddSignature: () => void;
  onReturnFocus: () => void;
}) {
  const document = useMemo(
    () => buildGeneratedApplication(draft, record),
    [draft, record]
  );
  // Day precision, so recomputing per render never changes the text.
  const generatedOn = formatCaseDate(new Date().toISOString());

  if (!document || !draft.type) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FlowDialogContent
        className="grid-rows-[auto_auto_1fr_auto] max-h-[85dvh] sm:max-w-3xl"
        // Radix's own restore lands on document.body here, so put focus back
        // on the button that opened the dialog explicitly.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-title-s font-semibold">
            Generated application
          </DialogTitle>
          <DialogDescription className="text-body-compact">
            Check the generated document before adding a signature.
          </DialogDescription>
        </DialogHeader>

        {/* Meta strip — a nested well inside the dialog, so surface-sunken
            without a border (elevation: the box-in-box ban). */}
        <div className="rounded-lg bg-surface-sunken p-4">
          <DescriptionList>
            <ReviewRow term="Application type">
              {submissionTypeLabel(draft.type)}
            </ReviewRow>
            <ReviewRow term="Case">
              <Identifier value={record.caseNumber} label="case number" />
            </ReviewRow>
            <ReviewRow term="Generated on">{generatedOn}</ReviewRow>
            <ReviewRow term="Filed for">{document.filedFor}</ReviewRow>
          </DescriptionList>
        </div>

        {/*
          Download hands over the plain-text copy — there is no rendered PDF
          behind this document, and DocumentPreview omits the action entirely
          rather than offer one when a surface has nothing to give.
        */}
        <DocumentPreview
          title={document.title}
          source={{
            kind: "composed",
            content: (
              <GeneratedApplicationDocument
                document={document}
                generatedOn={generatedOn}
              />
            ),
          }}
          download={{
            onDownload: () => downloadGeneratedApplication(draft, record),
          }}
          height="fill"
        />

        <DialogFooter>
          <Button type="button" onClick={onAddSignature}>
            Add signature
          </Button>
        </DialogFooter>
      </FlowDialogContent>
    </Dialog>
  );
}

/**
 * The court-form document itself. Its own component because the inline well
 * and full view render the same markup — a second copy would be a second
 * document to keep in step with the draft.
 */
function GeneratedApplicationDocument({
  document,
  generatedOn,
}: {
  document: GeneratedApplication;
  generatedOn: string;
}) {
  return (
    /*
      The `paper` family, not the app palette: this is a facsimile of a filed
      court document, and the DS fixes those colours in both themes on purpose
      (AGENTS.md — "a printed complaint is a convention the reader recognises,
      and it does not go warm or dark because the product's palette did").
      That makes the whole subtree fixed-light, so the DescriptionList inside
      is re-bound to the paper pair by slot — its own `foreground` /
      `muted-foreground` would go pale on white the moment dark mode is on.
    */
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground [&_[data-slot=description-details]]:text-paper-foreground [&_[data-slot=description-term]]:text-paper-muted-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body font-semibold">{document.matter}</p>
        <p className="text-body-compact text-paper-muted-foreground">
          Date: {generatedOn}
        </p>
      </header>

      <DescriptionList className="rounded-md border border-paper-border px-4">
        {document.facts.map((fact) => (
          <ReviewRow key={fact.term} term={fact.term}>
            {fact.value}
          </ReviewRow>
        ))}
      </DescriptionList>

      <h3 className="text-center text-body font-semibold">{document.title}</h3>

      <ol className="flex list-decimal flex-col gap-3 ps-6">
        {document.paragraphs.map((paragraph, index) => (
          <li key={index} className="text-body whitespace-pre-wrap">
            {paragraph}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2">
        <h4 className="text-body font-semibold">Prayer</h4>
        <p className="text-body whitespace-pre-wrap">{document.prayer}</p>
      </section>

      {/* Dashed = empty target, the same meaning UploadWell borrows. The slot
          fills at the signature step, which this prototype does not have. */}
      <footer className="flex flex-col items-end gap-2">
        <p className="text-body-compact text-paper-muted-foreground">
          Filed for {document.filedFor}
        </p>
        <div className="flex h-16 w-56 max-w-full items-center justify-center rounded-lg border border-dashed border-paper-border">
          <p className="text-body-compact text-paper-muted-foreground">
            Signature pending
          </p>
        </div>
      </footer>
    </article>
  );
}
