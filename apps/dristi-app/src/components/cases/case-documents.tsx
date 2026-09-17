"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  CircleAlertIcon,
  FileSearchIcon,
  FileTextIcon,
} from "lucide-react";

import { DocumentRecordDialog } from "@/components/cases/document-record-dialog";
import { DownloadFilingButton } from "@/components/cases/download-filing-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  REGISTER_ALL,
  RegisterFilter,
  RegisterSearch,
} from "@/components/cases/register-controls";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { PANEL_CLASS } from "@/components/shell/panel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DOCUMENTS_PAGE_SIZE,
  DOCUMENTS_PAGE_SIZES,
  DOCUMENT_GROUPS,
  DOCUMENT_TYPES,
  documentKind,
  documentSrc,
  documentKindTitle,
  documentPageWindow,
  documentSourceLabel,
  documentStatusLabel,
  documentStatusVariant,
  documentTypeLabel,
  documentsFile,
  evidenceStatusLabel,
  isDocumentKind,
  isDocumentTypeId,
  isDocumentsPageSize,
  personIdentity,
  selectDocuments,
  submittedByName,
  submittedBySideLabel,
  type CaseDocument,
  type DocumentKind,
  type DocumentPerson,
  type DocumentTypeId,
  type DocumentsFile,
  type DocumentsPageSize,
} from "@/lib/cases/documents";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

type SubmitterOption = {
  value: string;
  label: string;
  role: string;
};

type TypeGroup = {
  value: string;
  label: string;
  items: { value: DocumentTypeId; label: string }[];
};

const headClass = TABLE_HEAD;
const cellClass = TABLE_CELL;
const filterBarClass =
  "flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end";
const filterFieldClass = "min-w-0 w-full md:w-72";

/**
 * Case-wide register of individual files. Panel title sits above
 * Documents / Bail bonds (default Tabs; active uses text-primary). Make
 * filings stays the teal fill (Laws). Type groups stay in the filter
 * inside Documents — bail bonds are a sibling population, not a type.
 */
export function CaseDocuments({ record }: { record: CaseRecord }) {
  const file = useMemo(() => {
    try {
      return documentsFile(record);
    } catch {
      return null;
    }
  }, [record]);

  if (!file) return <DocumentsError />;
  return <DocumentsReady file={file} />;
}

export function DocumentsLoading() {
  return (
    <DocumentsPanel
      busy
      switcher={<Skeleton className="h-10 w-64 rounded-lg" />}
    >
      <span className="sr-only" role="status">
        Loading documents
      </span>
      <div className={filterBarClass}>
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </DocumentsPanel>
  );
}

function DocumentsError() {
  return (
    <DocumentsPanel>
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>
          Documents could not be loaded
        </AlertTitle>
        <AlertDescription>
          Refresh the page to try again.
        </AlertDescription>
      </Alert>
    </DocumentsPanel>
  );
}

function DocumentsReady({ file }: { file: DocumentsFile }) {
  const [kind, setKind] = useState<DocumentKind>("documents");
  const [typeId, setTypeId] = useState<DocumentTypeId | null>(null);
  const [submittedById, setSubmittedById] = useState<string | null>(null);
  const [filingQuery, setFilingQuery] = useState("");
  const [pageSize, setPageSize] = useState<DocumentsPageSize>(
    DOCUMENTS_PAGE_SIZE
  );
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState<CaseDocument | null>(null);

  const peopleById = new Map(file.people.map((person) => [person.id, person]));
  const kindDocuments = file.documents.filter(
    (document) => documentKind(document.type) === kind
  );
  const submitterOptions = uniqueSubmitters(kindDocuments, peopleById);

  const typeGroups: TypeGroup[] = DOCUMENT_GROUPS.filter((group) =>
    kind === "bail-bonds"
      ? group.id === "bail-bonds"
      : group.id !== "bail-bonds"
  )
    .map((group) => ({
      value: group.id,
      label: group.label,
      items: DOCUMENT_TYPES.filter((item) => item.groupId === group.id).map(
        (item) => ({
          value: item.id,
          label: item.label,
        })
      ),
    }))
    .filter((group) => group.items.length > 0);

  const selection = selectDocuments({
    documents: file.documents,
    kind,
    typeId,
    submittedById,
    filingQuery,
    pageSize,
    page,
  });

  const filtered =
    typeId !== null || submittedById !== null || filingQuery.trim() !== "";
  const showTypeFilter = kind === "documents";

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setTypeId(null);
    setSubmittedById(null);
    setFilingQuery("");
    resetPage();
  }

  function pageLink(nextPage: number) {
    return {
      href: "#",
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setPage(nextPage);
      },
    };
  }

  const switcher = (
    <KindTabs
      kind={kind}
      documentsCount={selection.documentsCount}
      bailBondsCount={selection.bailBondsCount}
      onKindChange={(next) => {
        setKind(next);
        setTypeId(null);
        setSubmittedById(null);
        resetPage();
      }}
    />
  );

  /* Sits at the switcher row's right corner — the register-wide search the
     legacy screens keep beside Type, reduced to the one field the filter bar
     does not already cover. */
  const search = (
    <RegisterSearch
      label="Search by filing ID"
      value={filingQuery}
      onChange={(next) => {
        setFilingQuery(next);
        resetPage();
      }}
    />
  );

  if (file.documents.length === 0) {
    return (
      <DocumentsPanel switcher={switcher}>
        <DocumentsEmpty
          icon={FileTextIcon}
          title={emptyTitle(kind, false)}
          description={emptyDescription(kind, false)}
        />
      </DocumentsPanel>
    );
  }

  return (
    <>
      <DocumentsPanel switcher={switcher} search={search}>
        <div className="flex flex-wrap items-center gap-2">
          {showTypeFilter ? (
            <RegisterFilter
              label="Type"
              value={typeId ?? REGISTER_ALL}
              onChange={(next) => {
                setTypeId(isDocumentTypeId(next) ? next : null);
                resetPage();
              }}
              options={typeGroups.flatMap((group) => group.items)}
            />
          ) : null}
          <RegisterFilter
            label="Submitted by"
            value={submittedById ?? REGISTER_ALL}
            onChange={(next) => {
              setSubmittedById(next === REGISTER_ALL ? null : next);
              resetPage();
            }}
            options={submitterOptions}
          />
          {filtered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {selection.total === 0 ? (
          <DocumentsEmpty
            icon={filtered ? FileSearchIcon : FileTextIcon}
            title={emptyTitle(kind, filtered)}
            description={emptyDescription(kind, filtered)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p
                aria-live="polite"
                className="text-caption font-medium tabular-nums text-muted-foreground"
              >
                {matchingCountLabel(kind, selection.total, filtered)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <DocumentsTable
                  caption={documentKindTitle(kind)}
                  rows={selection.rows}
                  peopleById={peopleById}
                  onOpenRecord={setRecordOpen}
                />
              </div>
              <div className="p-4 md:hidden">
                <DocumentsItemList
                  rows={selection.rows}
                  peopleById={peopleById}
                  onOpenRecord={setRecordOpen}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {selection.pageCount > 1 ? (
                  <p className="text-body-compact text-muted-foreground">
                    Showing {selection.from}–{selection.to}
                  </p>
                ) : null}
                <DocumentsPageSizeSelect
                  value={pageSize}
                  onChange={(size) => {
                    setPageSize(size);
                    resetPage();
                  }}
                />
              </div>
              {selection.pageCount > 1 ? (
                <Pagination className="mx-0 w-auto justify-start md:justify-end">
                  <PaginationContent>
                    {selection.page > 1 ? (
                      <PaginationItem>
                        <PaginationPrevious
                          {...pageLink(selection.page - 1)}
                        />
                      </PaginationItem>
                    ) : null}
                    {documentPageWindow(
                      selection.page,
                      selection.pageCount
                    ).map((entry, index) => (
                      <PaginationItem key={`${entry}-${index}`}>
                        {entry === "gap" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            {...pageLink(entry)}
                            isActive={entry === selection.page}
                            aria-label={`Go to page ${entry}`}
                          >
                            {entry}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    {selection.page < selection.pageCount ? (
                      <PaginationItem>
                        <PaginationNext {...pageLink(selection.page + 1)} />
                      </PaginationItem>
                    ) : null}
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          </div>
        )}
      </DocumentsPanel>
      <DocumentRecordDialog
        file={file}
        peopleById={peopleById}
        document={recordOpen}
        onOpenChange={setRecordOpen}
      />
    </>
  );
}

function matchingCountLabel(
  kind: DocumentKind,
  total: number,
  filtered: boolean
): string {
  const noun =
    kind === "bail-bonds"
      ? total === 1
        ? "bail bond"
        : "bail bonds"
      : total === 1
        ? "document"
        : "documents";
  if (!filtered) return `${total} ${noun}`;
  return total === 1
    ? `1 ${noun} matches the filters`
    : `${total} ${noun} match the filters`;
}

function emptyTitle(kind: DocumentKind, filtered: boolean): string {
  if (filtered) {
    return kind === "bail-bonds"
      ? "No bail bonds matching filters"
      : "No documents matching filters";
  }
  return kind === "bail-bonds"
    ? "No bail bonds recorded"
    : "No documents recorded";
}

function emptyDescription(kind: DocumentKind, filtered: boolean): string {
  if (filtered) {
    return kind === "bail-bonds"
      ? "No bail bonds match the selected filters."
      : "No documents match the selected filters.";
  }
  return kind === "bail-bonds"
    ? "Bail bonds recorded for this case will appear here."
    : "Use Make filings to submit documents.";
}

function uniqueSubmitters(
  documents: CaseDocument[],
  peopleById: Map<string, DocumentPerson>
): SubmitterOption[] {
  const seen = new Set<string>();
  const options: SubmitterOption[] = [];
  for (const document of documents) {
    if (seen.has(document.submittedById)) continue;
    seen.add(document.submittedById);
    const person = peopleById.get(document.submittedById);
    options.push({
      value: document.submittedById,
      label: person ? personIdentity(person) : document.submittedById,
      role: person?.role ?? "",
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * One bounded documents region. Hover fill is cancelled — this panel is
 * not the action (Laws; same resting Card as Hearings).
 */
function DocumentsPanel({
  children,
  switcher,
  search,
  busy = false,
}: {
  children: ReactNode;
  switcher?: ReactNode;
  /** Filing-id search, seated at the switcher row's right corner. */
  search?: ReactNode;
  busy?: boolean;
}) {
  return (
    <section className="min-w-0" aria-busy={busy || undefined}>
      <Card className={cn(PANEL_CLASS, "gap-4 hover:bg-card")}>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <h2 className="text-body font-semibold">Documents</h2>
            {search ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {switcher}
                {search}
              </div>
            ) : (
              switcher
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function KindTabs({
  kind,
  documentsCount,
  bailBondsCount,
  onKindChange,
}: {
  kind: DocumentKind;
  documentsCount: number;
  bailBondsCount: number;
  onKindChange: (kind: DocumentKind) => void;
}) {
  return (
    <Tabs
      value={kind}
      onValueChange={(next) => {
        if (isDocumentKind(next)) onKindChange(next);
      }}
      className="gap-0"
    >
      {/*
        Default TabsList (surface-sunken + hairline), never line — these are two
        mutually exclusive populations, not page sections. Height only
        on TabsList (h-10). Triggers keep DS h-[calc(100%-1px)].
      */}
      <TabsList
        className="h-10 group-data-horizontal/tabs:h-10"
        aria-label="Document group"
      >
        <TabsTrigger
          value="documents"
          className="flex-none px-3 after:opacity-0 data-[state=active]:text-primary"
          aria-label={`Documents, ${documentsCount}`}
        >
          Documents
          <Badge variant="secondary">{documentsCount}</Badge>
        </TabsTrigger>
        <TabsTrigger
          value="bail-bonds"
          className="flex-none px-3 after:opacity-0 data-[state=active]:text-primary"
          aria-label={`Bail bonds, ${bailBondsCount}`}
        >
          Bail bonds
          <Badge variant="secondary">{bailBondsCount}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function DocumentsPageSizeSelect({
  value,
  onChange,
}: {
  value: DocumentsPageSize;
  onChange: (pageSize: DocumentsPageSize) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="documents-page-size"
        className="text-body-compact font-normal text-muted-foreground"
      >
        Per page
      </Label>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          const size = Number.parseInt(next, 10);
          if (isDocumentsPageSize(size)) onChange(size);
        }}
      >
        <SelectTrigger id="documents-page-size" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOCUMENTS_PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DocumentsTable({
  caption,
  rows,
  peopleById,
  onOpenRecord,
}: {
  caption: string;
  rows: CaseDocument[];
  peopleById: Map<string, DocumentPerson>;
  onOpenRecord: (document: CaseDocument) => void;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(headClass, "min-w-56")}>Document</TableHead>
          <TableHead className={cn(headClass, "min-w-40")}>
            Document type
          </TableHead>
          <TableHead className={cn(headClass, "w-40")}>Submitted by</TableHead>
          <TableHead className={cn(headClass, "w-36")}>Submitted on</TableHead>
          <TableHead className={cn(headClass, "w-44")}>
            Submission status
          </TableHead>
          <TableHead className={cn(headClass, "w-36")}>Evidence</TableHead>
          <TableHead className={cn(headClass, "w-32")}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {rows.map((document) => (
          <TableRow
            key={document.id}
            className={cn(tableRowClass(), "cursor-pointer")}
            onClick={() => onOpenRecord(document)}
          >
            <TableCell className={cn(cellClass, "min-w-0 whitespace-normal")}>
              <p className="font-medium text-foreground">{document.title}</p>
              <p className="text-caption font-medium text-muted-foreground">
                {documentSourceLabel(document.source)}
                <span aria-hidden> · </span>
                {/* The id the register's search matches — shown so a found
                    row identifies itself. */}
                <span className="font-mono tabular-nums">
                  {document.filingId}
                </span>
              </p>
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-0 whitespace-normal")}>
              {documentTypeLabel(document.type)}
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-0 whitespace-normal")}>
              <SubmittedByCell document={document} peopleById={peopleById} />
            </TableCell>
            <TableCell className={cn(cellClass, "whitespace-nowrap")}>
              {formatCaseDate(document.submittedOn)}
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-0 overflow-hidden")}>
              <Badge
                variant={documentStatusVariant(document.submissionStatus)}
                className="h-auto max-w-full min-h-6 whitespace-normal"
              >
                {documentStatusLabel(document.submissionStatus)}
              </Badge>
            </TableCell>
            <TableCell className={cn(cellClass, "whitespace-nowrap")}>
              <EvidenceValue document={document} />
            </TableCell>
            <TableCell className={cellClass}>
              {/* The row itself opens the record; the one column action is the
                  download. Icon-only with the label on hover/focus, per the
                  Aug 31 correction round (legacy's three-dot menu held only
                  Download). */}
              <DownloadFilingButton
                label={`Download filing: ${document.title}`}
                tooltip="Download filing"
                href={documentSrc(document)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SubmittedByCell({
  document,
  peopleById,
}: {
  document: CaseDocument;
  peopleById: Map<string, DocumentPerson>;
}) {
  const side = submittedBySideLabel(document, peopleById);
  const advocate = submittedByName(document, peopleById);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="justify-start px-2 text-body-compact"
          aria-label={`${side}, ${advocate}`}
        >
          {side}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{advocate}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The title is the control; the card is only its hit area, covered via
 * `after:` the way case rows do it. Wrapping the whole card in a button
 * would flatten status, evidence, date and submitter into one label and
 * nest block elements inside a button. Focus lands on the title but the
 * ring is drawn on the card, so what is about to open is what is outlined.
 */
function DocumentsItemList({
  rows,
  peopleById,
  onOpenRecord,
}: {
  rows: CaseDocument[];
  peopleById: Map<string, DocumentPerson>;
  onOpenRecord: (document: CaseDocument) => void;
}) {
  return (
    <ItemGroup className="flex flex-col gap-3">
      {rows.map((document) => (
        <Item
          key={document.id}
          variant="outline"
          role="listitem"
          className="relative h-full items-start gap-3 p-4 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-focus-ring"
        >
          <ItemContent className="min-w-0 flex-1 gap-2 text-left">
            <ItemTitle className="line-clamp-none">
              <button
                type="button"
                onClick={() => onOpenRecord(document)}
                className="cursor-pointer p-0 text-left outline-none after:absolute after:inset-0"
              >
                {document.title}
              </button>
            </ItemTitle>
            <p className="text-caption font-medium text-muted-foreground">
              <span className="font-mono">{document.id}</span>
              {" · "}
              {documentSourceLabel(document.source)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={documentStatusVariant(document.submissionStatus)}>
                {documentStatusLabel(document.submissionStatus)}
              </Badge>
              {document.evidenceStatus ? (
                <EvidenceValue document={document} />
              ) : null}
              <p className="text-body-compact text-muted-foreground">
                {formatCaseDate(document.submittedOn)}
              </p>
            </div>
            <p className="text-body-compact text-muted-foreground">
              {documentTypeLabel(document.type)}
            </p>
            <p className="text-body-compact text-muted-foreground">
              {submittedBySideLabel(document, peopleById)}
              {" · "}
              {submittedByName(document, peopleById)}
            </p>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

function EvidenceValue({ document }: { document: CaseDocument }) {
  if (!document.evidenceStatus) {
    return <span className="text-muted-foreground">—</span>;
  }

  const label = evidenceStatusLabel(document.evidenceStatus);
  const evidenceNumber =
    document.evidenceStatus === "marked" ? document.evidenceNumber : null;

  return (
    <Badge
      variant={document.evidenceStatus === "marked" ? "secondary" : "outline"}
      aria-label={
        evidenceNumber ? `${label}, evidence number ${evidenceNumber}` : label
      }
    >
      {label}
      {evidenceNumber ? (
        <>
          <span aria-hidden>·</span>
          <span className="font-mono">{evidenceNumber}</span>
        </>
      ) : null}
    </Badge>
  );
}

function DocumentsEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileTextIcon;
  title: string;
  description?: string;
}) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-body font-semibold">{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
