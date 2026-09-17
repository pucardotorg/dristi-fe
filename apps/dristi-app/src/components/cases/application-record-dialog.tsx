"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DownloadIcon, FileTextIcon, XIcon } from "lucide-react";

import {
  PdfViewer,
  isPdfSrc,
  parsePdfSrc,
} from "@/components/cases/pdf-viewer";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applicationSideLabel,
  type ApplicationRecord,
} from "@/lib/cases/application-record";
import { orderHref } from "@/lib/cases/sections";
import { cn } from "@/lib/utils";

/**
 * Opening an application shows the application, its documents and the linked
 * order (APP-07). The record on the left is exactly §9.4; the document the
 * reader picked shows on the right.
 */
export function ApplicationRecordDialog({
  caseId,
  application,
  onOpenChange,
}: {
  caseId: string;
  application: ApplicationRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={application !== null} onOpenChange={onOpenChange}>
      <ChromeDialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {application ? (
          <RecordBody
            key={application.id}
            caseId={caseId}
            application={application}
          />
        ) : null}
      </ChromeDialogContent>
    </Dialog>
  );
}

function RecordBody({
  caseId,
  application,
}: {
  caseId: string;
  application: ApplicationRecord;
}) {
  const viewable = application.documents.filter((doc) => doc.src);
  const [openSrc, setOpenSrc] = useState(viewable[0]?.src);
  const open = viewable.find((doc) => doc.src === openSrc);
  const pdf = open?.src && isPdfSrc(open.src) ? parsePdfSrc(open.src) : null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline py-2 pr-2 pl-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <DialogTitle className="truncate text-body-compact font-semibold">
            {application.typeLabel}
          </DialogTitle>
          <Badge variant={application.statusVariant}>
            {application.statusLabel}
          </Badge>
          <DialogDescription className="sr-only">
            Application record, documents and linked order
          </DialogDescription>
        </div>
        {pdf ? (
          <Button variant="outline" size="sm" asChild>
            <a href={pdf.url} download>
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Download
            </a>
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon-sm">
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex shrink-0 flex-col gap-4 overflow-y-auto border-hairline p-4 max-md:max-h-72 max-md:border-b md:w-80 md:border-r">
          <dl className="flex flex-col gap-3">
            <Fact label="Application ID">
              {application.applicationId ? (
                <span className="font-mono">{application.applicationId}</span>
              ) : (
                <Muted>Not allotted yet</Muted>
              )}
            </Fact>
            <Fact label="Created on">
              <span className="tabular-nums">{application.created}</span>
            </Fact>
            <Fact label="Submitted on">
              {application.submitted ? (
                <span className="tabular-nums">{application.submitted}</span>
              ) : (
                <Muted>Not submitted yet</Muted>
              )}
            </Fact>
            <Fact label="Filed by">{application.filedBy}</Fact>
            <Fact label="Side">{applicationSideLabel(application.side)}</Fact>
            <Fact label="Linked order">
              {application.linkedOrder ? (
                <Button
                  variant="link"
                  asChild
                  className="h-auto justify-start px-0 text-left whitespace-normal"
                >
                  <Link href={orderHref(caseId, application.linkedOrder.id)}>
                    {application.linkedOrder.label}
                  </Link>
                </Button>
              ) : (
                <Muted>No order yet</Muted>
              )}
            </Fact>
          </dl>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-caption font-medium text-muted-foreground">
              Documents
            </h3>
            {application.documents.length === 0 ? (
              <Muted>None attached</Muted>
            ) : (
              <ul className="-mx-2 flex flex-col gap-0.5">
                {application.documents.map((doc) => (
                  <li key={doc.label}>
                    {doc.src ? (
                      <button
                        type="button"
                        aria-pressed={doc.src === openSrc}
                        onClick={() => setOpenSrc(doc.src)}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-body-compact outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                          doc.src === openSrc && "bg-accent font-medium"
                        )}
                      >
                        <FileTextIcon
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0">{doc.label}</span>
                      </button>
                    ) : (
                      <span className="flex min-h-10 items-center gap-2 px-2 text-body-compact text-muted-foreground">
                        <FileTextIcon aria-hidden className="size-4 shrink-0" />
                        <span className="min-w-0">{doc.label}</span>
                        <span className="ml-auto shrink-0 text-caption font-medium">
                          Not on file
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {pdf && open ? (
          <PdfViewer
            key={open.src}
            src={pdf.url}
            title={open.label}
            pages={pdf.page ? { from: pdf.page, to: pdf.page } : undefined}
            className="min-h-64 flex-1 rounded-none"
          />
        ) : (
          <div className="flex min-h-64 flex-1 items-center justify-center bg-surface-sunken p-6">
            <p className="text-body-compact text-muted-foreground">
              No document to show for this application.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-caption font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-body-compact font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="text-body-compact font-normal text-muted-foreground">
      {children}
    </span>
  );
}
