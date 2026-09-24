"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DownloadIcon, FileTextIcon, FileXIcon, XIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  PdfViewer,
  isPdfSrc,
  parsePdfSrc,
} from "@/components/cases/pdf-viewer";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applicationSideLabel,
  type ApplicationRecord,
  type LinkedApplication,
} from "@/lib/cases/application-record";
import { orderHref } from "@/lib/cases/sections";
import { resumeDraftHref } from "@/lib/cases/applications";
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
  onOpenLinked,
  onAct,
}: {
  caseId: string;
  application: ApplicationRecord | null;
  onOpenChange: (open: boolean) => void;
  /** Open another application in this dialog: an objection and what it objects to. */
  onOpenLinked?: (id: string) => void;
  /** Take the viewer's step on it (sign, pay) from the record itself. */
  onAct?: (application: ApplicationRecord) => void;
}) {
  return (
    <Dialog open={application !== null} onOpenChange={onOpenChange}>
      <FlowDialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {application ? (
          <RecordBody
            key={application.id}
            caseId={caseId}
            application={application}
            onOpenLinked={onOpenLinked}
            onAct={onAct}
          />
        ) : null}
      </FlowDialogContent>
    </Dialog>
  );
}

function RecordBody({
  caseId,
  application,
  onOpenLinked,
  onAct,
}: {
  caseId: string;
  application: ApplicationRecord;
  onOpenLinked?: (id: string) => void;
  onAct?: (application: ApplicationRecord) => void;
}) {
  const draftHref = resumeDraftHref(caseId, application.source);
  const viewable = application.documents.filter((doc) => doc.src);
  const [openSrc, setOpenSrc] = useState(viewable[0]?.src);
  const open = viewable.find((doc) => doc.src === openSrc);
  const pdf = open?.src && isPdfSrc(open.src) ? parsePdfSrc(open.src) : null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline py-3 pr-3 pl-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <DialogTitle className="text-body-compact font-semibold text-pretty sm:truncate">
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href={pdf.url} download aria-label="Download">
                    <DownloadIcon aria-hidden />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon-sm">
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex shrink-0 flex-col gap-0 overflow-y-auto border-hairline p-4 max-md:max-h-72 max-md:border-b md:w-80 md:border-r">
          {/* Grouped so the panel can be skimmed (owner, Sept 24): what is
              happening first, then numbers, dates, people, objections and the
              order, each group parted by a hairline. Dates and people run two
              to a row; they are short. */}
          <div className="flex flex-col divide-y divide-hairline">
            {courtLine(application) ? (
              <p className="pb-3 text-body-compact text-foreground">
                {courtLine(application)}
              </p>
            ) : null}

            {hasNumberFacts(application) ? (
            <FactGroup>
              {application.source.kind === "document" ||
              application.source.type === "objection" ? null : (
                <Fact label="Application number">
                  {application.applicationNumber ? (
                    <span className="font-mono">
                      {application.applicationNumber}
                    </span>
                  ) : (
                    <Muted>
                      {application.status === "dismissed"
                        ? "Not allotted. Dismissed before the court took it up"
                        : "Allotted when the court takes it up"}
                    </Muted>
                  )}
                </Fact>
              )}
              {application.temporaryId ? (
                <Fact
                  label={
                    application.status === "pending-review"
                      ? "Temporary ID"
                      : "Filing ID"
                  }
                >
                  <span className="font-mono">{application.temporaryId}</span>
                </Fact>
              ) : null}
            </FactGroup>
            ) : null}

            <FactGroup columns={2}>
              <Fact label="Created on">
                <span className="tabular-nums">{application.createdShort}</span>
              </Fact>
              <Fact label="Submitted on">
                {application.submittedShort ? (
                  <span className="tabular-nums">
                    {application.submittedShort}
                  </span>
                ) : (
                  <Muted>Not yet</Muted>
                )}
              </Fact>
              {application.onboardedShort ? (
                <Fact label="Taken up on">
                  <span className="tabular-nums">
                    {application.onboardedShort}
                  </span>
                </Fact>
              ) : null}
              {application.decisionShort &&
              application.status === "pending-decision" ? (
                <Fact label="Decision on">
                  <span className="tabular-nums">
                    {application.decisionShort}
                  </span>
                </Fact>
              ) : null}
            </FactGroup>

            <FactGroup columns={2}>
              <Fact label="Raised by">{application.filedBy}</Fact>
              <Fact label="Side">{applicationSideLabel(application.side)}</Fact>
              {application.onBehalfOf ? (
                <Fact label="On behalf of">{application.onBehalfOf}</Fact>
              ) : null}
              {application.draftedBy ? (
                <Fact label="Drafted by">{application.draftedBy}</Fact>
              ) : null}
            </FactGroup>

            {application.objectionsInvited !== undefined ||
            application.objection ||
            application.objectionTo ? (
              <FactGroup>
                {application.objectionsInvited !== undefined ? (
                  <Fact label="Objections">
                    <span className="font-normal tabular-nums">
                      {application.objectionsInvited
                        ? application.objectionDue
                          ? `Invited. Due by the end of ${application.objectionDue}`
                          : "Invited"
                        : "Not invited"}
                    </span>
                  </Fact>
                ) : null}
                {application.objection ? (
                  <Fact label="Objection filed">
                    <LinkedRecord
                      linked={application.objection}
                      onOpen={onOpenLinked}
                    />
                  </Fact>
                ) : null}
                {application.objectionTo ? (
                  <Fact label="Objection to">
                    <LinkedRecord
                      linked={application.objectionTo}
                      onOpen={onOpenLinked}
                    />
                  </Fact>
                ) : null}
              </FactGroup>
            ) : null}

            <FactGroup>
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
                  <Muted>
                    {isDecided(application.status)
                      ? "Order not on file yet"
                      : "No order yet"}
                  </Muted>
                )}
              </Fact>
            </FactGroup>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-hairline pt-3">
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
                          "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-body-compact outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50",
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
          /* The same designed gap the order record shows when its PDF is
             missing: the pane says what is absent and whether the reader has
             anything to do, instead of a stray line of grey text. */
          <div className="flex min-h-64 flex-1 items-center justify-center bg-surface-sunken p-6">
            <Empty className="flex-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileXIcon aria-hidden />
                </EmptyMedia>
                <EmptyTitle className="text-body font-semibold">
                  {application.documents.length === 0
                    ? "No documents with this application"
                    : "These documents are not on file yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {application.documents.length === 0
                    ? "Nothing is attached to it. The details of the application are alongside."
                    : "They are listed alongside, and open here once the files are uploaded."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* The viewer's step, where they have one: read it, then act on it, in the
          filing dialogs' own footer band, primary at the far end (owner, Sept
          24). The table only opens; Needs attention stays the shortcut. */}
      {application.step ? (
        <footer className="flex shrink-0 flex-col gap-3 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-compact text-muted-foreground">
            {STEP_NOTE[application.step]}
          </p>
          {application.step === "continue" && draftHref ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={draftHref}>Continue draft</Link>
            </Button>
          ) : application.step !== "continue" && onAct ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => onAct(application)}
            >
              {application.step === "sign" ? "Add signature" : "Complete payment"}
            </Button>
          ) : null}
        </footer>
      ) : null}
    </>
  );
}

const STEP_NOTE = {
  continue: "A draft. Finish it, then sign and pay to file it.",
  sign: "Needs your signature before it can go to the court.",
  pay: "Signed. Pay the court fee to submit it to the court.",
} as const;

/** An objection or a document has no application number; unfiled, no ID either. */
function hasNumberFacts(application: ApplicationRecord): boolean {
  const numbered = !(
    application.source.kind === "document" ||
    application.source.type === "objection"
  );
  return numbered || Boolean(application.temporaryId);
}

function isDecided(status: ApplicationRecord["status"]): boolean {
  return status === "accepted" || status === "rejected" || status === "dismissed";
}

/**
 * Where the application stands with the court, in the reader's words. The
 * badge says the status; this says what it means and what comes next.
 */
function courtLine(application: ApplicationRecord): string | undefined {
  switch (application.status) {
    case "pending-review":
      return "Waiting for the court to take it up.";
    case "pending-decision":
      return application.decision
        ? `The court decides it on ${application.decision}.`
        : "Waiting for the court's decision.";
    case "accepted":
    case "rejected":
    case "dismissed":
      return application.courtResult;
    case "submitted":
      return application.objectionTo
        ? "Read with the application it objects to."
        : undefined;
    case "expired":
      return "Expired before it was submitted.";
    default:
      return undefined;
  }
}

/** Another application, one press away: its type, number and status. */
function LinkedRecord({
  linked,
  onOpen,
}: {
  linked: LinkedApplication;
  onOpen?: (id: string) => void;
}) {
  const label = linked.number
    ? `${linked.typeLabel} · ${linked.number}`
    : linked.typeLabel;
  return (
    <span className="flex flex-col items-start gap-1">
      {onOpen ? (
        <Button
          type="button"
          variant="link"
          className="h-auto justify-start px-0 text-left whitespace-normal"
          onClick={() => onOpen(linked.id)}
        >
          {label}
        </Button>
      ) : (
        <span>{label}</span>
      )}
      <Badge variant={linked.statusVariant}>{linked.statusLabel}</Badge>
    </span>
  );
}

/** One skimmable group of facts; the wrapper's hairline parts it from the next. */
function FactGroup({
  columns = 1,
  children,
}: {
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-4 gap-y-3 py-3 first:pt-0",
        columns === 2 && "grid-cols-2"
      )}
    >
      {children}
    </dl>
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
