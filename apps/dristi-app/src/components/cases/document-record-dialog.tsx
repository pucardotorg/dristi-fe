"use client";

import { useState, type ReactNode } from "react";
import { MessageSquareIcon, PaperclipIcon } from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { DocumentPreview } from "@/components/cases/document-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  documentSrc,
  documentSourceLabel,
  documentStatusLabel,
  documentStatusVariant,
  documentTypeLabel,
  evidenceStatusLabel,
  submittedByName,
  submittedByRole,
  type CaseDocument,
  type DocumentPerson,
  type DocumentsFile,
} from "@/lib/cases/documents";
import { formatCaseDate } from "@/lib/cases/types";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The record overlay chrome: header, a scrolling left pane, comments on the
 * right. Filed documents on the advocate case file open this frame.
 *
 * Download and Full view hang off the preview itself (see DocumentPreview),
 * so they sit beside the thing they act on. Comments live in this dialog
 * only — they are not a court filing.
 */
export function DocumentRecordFrame({
  title,
  badge,
  description,
  commentId,
  className,
  onCloseAutoFocus,
  children,
}: {
  title: string;
  badge: ReactNode;
  description: ReactNode;
  commentId: string;
  className?: string;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  return (
    <ChromeDialogContent
      className={cn(
        "flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl",
        className,
      )}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-title font-semibold">{title}</DialogTitle>
          {badge}
        </div>
        <DialogDescription className="text-body text-muted-foreground">
          {description}
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
            <div className="flex flex-col gap-6">{children}</div>
          </div>
        </div>
        <Separator className="md:hidden" />
        <Separator orientation="vertical" className="hidden md:block" />
        <CommentsPane fieldId={commentId} />
      </div>
    </ChromeDialogContent>
  );
}

/**
 * One filed document: preview on the left, comments on the right.
 * Download and Full view hang off the preview itself, so they sit beside the
 * thing they act on and stay put while it scrolls. Comments live in this
 * dialog only — they are not a court filing.
 */
export function DocumentRecordDialog({
  file,
  peopleById,
  document,
  onOpenChange,
}: {
  file: DocumentsFile;
  peopleById: Map<string, DocumentPerson>;
  document: CaseDocument | null;
  onOpenChange: (document: CaseDocument | null) => void;
}) {
  return (
    <Dialog
      open={document !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {document ? (
        <DocumentBody
          key={document.id}
          file={file}
          document={document}
          peopleById={peopleById}
        />
      ) : null}
    </Dialog>
  );
}

function DocumentBody({
  file,
  document,
  peopleById,
}: {
  file: DocumentsFile;
  document: CaseDocument;
  peopleById: Map<string, DocumentPerson>;
}) {
  const previewSrc = documentSrc(document);
  const commentId = `document-comment-${document.id}`;
  // Status-driven, not kind-driven: depositions and pleas reach Pending
  // review too. Amber keeps the banner in the same family as the header
  // badge (documentStatusVariant maps pending-review → warning) — badge
  // family and banner family move together, so one dialog says one thing.
  const pendingReview = document.submissionStatus === "pending-review";

  return (
    <DocumentRecordFrame
      title={document.title}
      badge={
        <Badge variant={documentStatusVariant(document.submissionStatus)}>
          {documentStatusLabel(document.submissionStatus)}
        </Badge>
      }
      description={documentTypeLabel(document.type)}
      commentId={commentId}
    >
      <DescriptionList>
        <RecordRow term="Filing ID">
          <Identifier value={document.id} label="filing id" />
        </RecordRow>
        <RecordRow term="Case number">
          <Identifier value={file.caseNumber} label="case number" />
        </RecordRow>
        <RecordRow term="Document type">
          {documentTypeLabel(document.type)}
        </RecordRow>
        <RecordRow term="Source">
          {documentSourceLabel(document.source)}
        </RecordRow>
        <RecordRow term="Submitted on">
          {formatCaseDate(document.submittedOn)}
        </RecordRow>
        <RecordRow term="Submitted by">
          <span className="flex min-w-0 flex-col gap-1">
            <span>{submittedByName(document, peopleById)}</span>
            {submittedByRole(document, peopleById) ? (
              <span className="text-caption font-medium text-muted-foreground">
                {submittedByRole(document, peopleById)}
              </span>
            ) : null}
          </span>
        </RecordRow>
        {document.evidenceNumber ? (
          <RecordRow term="Evidence no.">
            <Identifier value={document.evidenceNumber} label="evidence number" />
          </RecordRow>
        ) : null}
        {document.evidenceStatus ? (
          <RecordRow term="Evidence status">
            {evidenceStatusLabel(document.evidenceStatus)}
          </RecordRow>
        ) : null}
        {document.linkedApplication ? (
          <RecordRow term="Filed with">
            <Identifier value={document.linkedApplication.id} label="application id" />
            <span className="text-muted-foreground">
              {" "}
              ({document.linkedApplication.label})
            </span>
          </RecordRow>
        ) : null}
        {document.linkedHearing ? (
          <RecordRow term="Hearing">
            <Identifier value={document.linkedHearing.id} label="hearing id" />
            <span className="text-muted-foreground">
              {" "}
              ({document.linkedHearing.label})
            </span>
          </RecordRow>
        ) : null}
      </DescriptionList>

      {pendingReview ? (
        <Banner variant="warning">
          All party signatures are recorded. Waiting on the magistrate to sign.
        </Banner>
      ) : null}

      {previewSrc ? (
        <DocumentPreview
          title={document.title}
          source={{ kind: "src", src: previewSrc }}
          download={{
            href: previewSrc,
            filename: downloadName(document),
            label: pendingReview
              ? `Download ${document.title} — waiting on the magistrate to sign`
              : `Download ${document.title}`,
          }}
        />
      ) : (
        <Alert>
          <AlertTitle className="text-body">No file attached</AlertTitle>
          <AlertDescription className="text-body">
            This record has no file attached.
          </AlertDescription>
        </Alert>
      )}
    </DocumentRecordFrame>
  );
}

/**
 * A Pending review filing carries the parties' signatures but not the
 * magistrate's, so it is not yet operative. Once the file is on disk every
 * piece of dialog UI is gone — the filename is the only carrier left, so it
 * states the caveat. Other statuses keep the source filename.
 */
function downloadName(document: CaseDocument): string | undefined {
  if (document.submissionStatus !== "pending-review" || !document.href) {
    return undefined;
  }
  const segment = document.href.split("/").pop() ?? "";
  const dot = segment.lastIndexOf(".");
  const extension = dot > 0 ? segment.slice(dot) : "";
  return `${document.id}-unsigned-by-court${extension}`;
}

/**
 * Comments on one open file. Local to the overlay — not a court filing.
 * The rescheduling review reuses this pane beside a generated application.
 */
export function CommentsPane({ fieldId }: { fieldId: string }) {
  const [comments, setComments] = useState<{ id: string; body: string }[]>([]);
  const [draft, setDraft] = useState("");
  const canPost = draft.trim().length > 0;
  // The scoping caveat sits in the pane header, out of the input's reading
  // order — describe the Textarea with it so it is heard on focus too.
  const scopeId = `${fieldId}-scope`;

  function postComment() {
    const body = draft.trim();
    if (!body) return;
    setComments((current) => [...current, { id: crypto.randomUUID(), body }]);
    setDraft("");
  }

  return (
    <aside className="flex min-h-48 w-full shrink-0 flex-col md:w-80">
      <div className="shrink-0 p-6 pb-3">
        <h3 className="text-title-s font-semibold">Comments</h3>
        <p
          id={scopeId}
          className="text-caption font-medium text-muted-foreground"
        >
          On this file only — not a filing.
        </p>
      </div>
      {comments.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center px-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-title-s font-semibold">
                No comments
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <ItemGroup>
            {comments.map((comment) => (
              <Item key={comment.id} variant="muted">
                <ItemContent>
                  <ItemTitle className="line-clamp-none whitespace-pre-wrap text-body font-normal text-foreground">
                    {comment.body}
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      )}
      <div className="shrink-0 p-6 pt-3">
        <Field>
          <FieldLabel htmlFor={fieldId} className="text-body">
            Write a comment
          </FieldLabel>
          <Textarea
            id={fieldId}
            placeholder="Type here"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby={scopeId}
            className="text-body"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Attach a file"
            >
              <PaperclipIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canPost}
              className="ml-auto"
              onClick={postComment}
            >
              Post
            </Button>
          </div>
        </Field>
      </div>
    </aside>
  );
}

function RecordRow({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <DescriptionRow>
      <DescriptionTerm className="text-body">{term}</DescriptionTerm>
      <DescriptionDetails className="min-w-0 text-body font-medium whitespace-normal">
        {children}
      </DescriptionDetails>
    </DescriptionRow>
  );
}
