"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { InfoIcon } from "lucide-react";

import { Identifier } from "@/components/chrome/identifier";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  complaintDocumentHref,
  complaintDocumentSrc,
  type ComplaintDocument,
  type ComplaintField,
  type ComplaintPane,
} from "@/lib/cases/complaint";
import { cn } from "@/lib/utils";

/**
 * Structured read of a filed record — DescriptionList, narrative blocks,
 * people, and a paper strip. Used by Complaint and by Case file digital
 * view. Papers preview as a look at the page; a filed preview opens that
 * paper in Case file.
 */
export function DigitalRecord({
  caseId,
  pane,
  emptyTitle = "No record selected",
  emptyDescription = "Choose an item from the complaint to open it here.",
}: {
  caseId: string;
  pane: ComplaintPane | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!pane) {
    return (
      <Empty className="min-h-0 flex-1 border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle className="text-title-s font-semibold">
            {emptyTitle}
          </EmptyTitle>
          <EmptyDescription className="text-body">
            {emptyDescription}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const documents = pane.documents ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      {pane.notice ? (
        <Alert variant="info">
          <InfoIcon aria-hidden />
          <AlertDescription className="text-body group-has-[>svg]/alert:col-start-2">
            {pane.notice}
          </AlertDescription>
        </Alert>
      ) : null}

      {pane.fields && pane.fields.length > 0 ? (
        <DescriptionList>
          {pane.fields.map((item, index) => (
            <FieldRow key={`${item.term}-${index}`} field={item} />
          ))}
        </DescriptionList>
      ) : null}

      {pane.blocks?.map((block) => (
        <div key={block.title} className="flex flex-col gap-2">
          <h3 className="text-body font-medium text-foreground">
            {block.title}
          </h3>
          <p className="text-body text-muted-foreground">{block.body}</p>
        </div>
      ))}

      {pane.people && pane.people.length > 0 ? (
        <ItemGroup>
          {pane.people.map((person, index) => (
            <FragmentRow key={person.title} first={index === 0}>
              <Item
                role="listitem"
                size="sm"
                className="items-start px-0 hover:bg-transparent"
              >
                <ItemContent className="gap-2">
                  <ItemTitle className="line-clamp-none min-w-0 text-body font-medium text-foreground">
                    {person.title}
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none text-body">
                    {person.detail}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </FragmentRow>
          ))}
        </ItemGroup>
      ) : null}

      {documents.length > 0 ? (
        <DocumentStrip caseId={caseId} documents={documents} />
      ) : null}
    </div>
  );
}

function FieldRow({ field }: { field: ComplaintField }) {
  return (
    <DescriptionRow>
      <DescriptionTerm className="text-body">{field.term}</DescriptionTerm>
      <DescriptionDetails
        className={cn(
          "text-body",
          field.empty ? "text-muted-foreground" : "font-medium"
        )}
      >
        {field.id ? (
          <Identifier value={field.value} label={field.term} />
        ) : (
          field.value
        )}
      </DescriptionDetails>
    </DescriptionRow>
  );
}

function DocumentStrip({
  caseId,
  documents,
}: {
  caseId: string;
  documents: ComplaintDocument[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-body font-medium text-foreground">Documents</h3>
      <ul aria-label="Documents" className="flex gap-4 overflow-x-auto pb-1">
        {documents.map((doc) => (
          <li key={doc.id} className="w-48 shrink-0">
            <DocumentTile caseId={caseId} document={doc} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocumentTile({
  caseId,
  document,
}: {
  caseId: string;
  document: ComplaintDocument;
}) {
  const src = complaintDocumentSrc(document);
  const href = complaintDocumentHref(caseId, document);
  const preview = (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-sunken">
      <AspectRatio ratio={3 / 4}>
        {src ? (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              src={previewSrc(src)}
              title=""
              tabIndex={-1}
              aria-hidden
              scrolling="no"
              className="pointer-events-none absolute top-0 left-0 h-[calc(100%+theme(spacing.6))] w-[calc(100%+theme(spacing.6))] max-w-none border-0 bg-paper"
            />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center">
            <p className="text-body text-muted-foreground">Not uploaded</p>
          </div>
        )}
      </AspectRatio>
    </div>
  );

  if (!href) {
    return (
      <div className="flex flex-col gap-2">
        {preview}
        <p className="text-body font-medium text-foreground">{document.label}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {preview}
      <span className="text-body font-medium text-foreground">
        {document.label}
      </span>
      <span className="text-body text-muted-foreground">Open in case file</span>
    </Link>
  );
}

function previewSrc(src: string): string {
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
  return src.includes("#") ? `${src}&${flags}` : `${src}#${flags}`;
}

function FragmentRow({
  first,
  children,
}: {
  first: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {first ? null : <ItemSeparator className="my-0" />}
      {children}
    </>
  );
}
