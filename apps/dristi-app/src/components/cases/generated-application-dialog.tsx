"use client";

import { useMemo } from "react";
import { DownloadIcon, XIcon } from "lucide-react";

import {
  Fact,
  FactGroup,
} from "@/components/cases/application-record-dialog";
import { ReviewRow } from "@/components/cases/filing-form-shared";
import { ComposedDocumentViewer } from "@/components/cases/pdf-viewer";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { Identifier } from "@/components/chrome/identifier";
import { Button } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/description-list";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildGeneratedApplication,
  downloadGeneratedApplication,
  type GeneratedApplication,
} from "@/lib/cases/application-document";
import { type ApplicationDraft } from "@/lib/cases/application-draft";
import { submissionTypeLabel } from "@/lib/cases/applications";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";

/**
 * What Generate application produces, read before signing. The application
 * record's frame (PM and owner, Oct 8: the same pattern as opening an
 * application from the tab): the facts on the left, the application itself
 * as large as the dialog allows on the right, the one step in the sunken
 * footer band. Halves stack when the dialog is narrow.
 *
 * One CTA only: Add signature. The dialog's close returns to the form.
 */
export function GeneratedApplicationDialog({
  open,
  onOpenChange,
  draft,
  record,
  onAddSignature,
  signLabel = "Add signature",
  onReturnFocus,
  side,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ApplicationDraft;
  record: CaseRecord;
  /** The side filing it, so "Filed for" names the right party. */
  side?: "complainant" | "accused";
  onAddSignature: () => void;
  onReturnFocus: () => void;
  /** The CTA's words. A clerk sends it to be signed rather than signing it. */
  signLabel?: string;
}) {
  const document = useMemo(
    () => buildGeneratedApplication(draft, record, side),
    [draft, record, side]
  );
  // Day precision, so recomputing per render never changes the text.
  const generatedOn = formatCaseDate(new Date().toISOString());

  if (!document || !draft.type) return null;
  const objection = draft.type === "objection";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FlowDialogContent
        ownBack
        showCloseButton={false}
        className="flex h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        // Radix's own restore lands on document.body here, so put focus back
        // on the button that opened the dialog explicitly.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-hairline py-3 pr-3 pl-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-body-compact font-semibold text-pretty sm:truncate">
              {objection ? "Generated objection" : "Generated application"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Check the generated document before adding a signature.
            </DialogDescription>
          </div>
          {/* The plain-text copy: there is no rendered PDF behind it. */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Download"
                  onClick={() => downloadGeneratedApplication(draft, record, side)}
                >
                  <DownloadIcon aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm">
              <XIcon aria-hidden />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        <div className="@container/record flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col @3xl/record:flex-row">
            <div className="flex max-h-72 shrink-0 flex-col overflow-y-auto border-b border-hairline p-4 @3xl/record:max-h-none @3xl/record:w-80 @3xl/record:border-r @3xl/record:border-b-0">
              <div className="flex flex-col divide-y divide-hairline">
                <FactGroup>
                  <Fact label={objection ? "Filing" : "Application type"}>
                    {submissionTypeLabel(draft.type)}
                  </Fact>
                </FactGroup>
                <FactGroup columns={2}>
                  <Fact label="Case">
                    <Identifier value={record.caseNumber} label="case number" />
                  </Fact>
                  <Fact label="Generated on">
                    <span className="tabular-nums">{generatedOn}</span>
                  </Fact>
                  <Fact label="Filed for">{document.filedFor}</Fact>
                </FactGroup>
              </div>
            </div>

            <ComposedDocumentViewer
              title={document.title}
              className="min-h-64 min-w-0 flex-1 rounded-none"
            >
              <GeneratedApplicationDocument
                document={document}
                generatedOn={generatedOn}
              />
            </ComposedDocumentViewer>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" className="w-full sm:w-auto" onClick={onAddSignature}>
            {signLabel}
          </Button>
        </footer>
      </FlowDialogContent>
    </Dialog>
  );
}

/**
 * The court-form document itself. Its own component because the inline well
 * and full view render the same markup — a second copy would be a second
 * document to keep in step with the draft.
 */
export function GeneratedApplicationDocument({
  document,
  generatedOn,
  signedBy,
}: {
  document: GeneratedApplication;
  generatedOn: string;
  /** Who signed it, once it is signed; the slot stays empty until then. */
  signedBy?: string;
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
        {signedBy ? (
          <div className="flex h-16 w-56 max-w-full flex-col items-center justify-center rounded-lg border border-paper-border">
            <p className="text-body-compact font-semibold">{signedBy}</p>
            <p className="text-caption text-paper-muted-foreground">Signed</p>
          </div>
        ) : (
          <div className="flex h-16 w-56 max-w-full items-center justify-center rounded-lg border border-dashed border-paper-border">
            <p className="text-body-compact text-paper-muted-foreground">
              Signature pending
            </p>
          </div>
        )}
      </footer>
    </article>
  );
}
