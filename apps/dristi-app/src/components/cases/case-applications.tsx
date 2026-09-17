"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlertIcon,
  FileSearchIcon,
  FileTextIcon,
  SearchIcon,
} from "lucide-react";

import { DownloadFilingButton } from "@/components/cases/download-filing-button";
import { SubmissionBatchDialog } from "@/components/cases/submission-batch-dialog";
import { SubmissionPaymentDialog } from "@/components/cases/submission-payment-dialog";
import { SubmissionRecordDialog } from "@/components/cases/submission-record-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Input } from "@/components/ui/input";
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
import {
  APPLICATIONS_PAGE_SIZE,
  APPLICATIONS_PAGE_SIZES,
  APPLICATION_TYPES,
  FILING_STATUSES,
  SUBMISSION_DOCUMENT_TYPES,
  SUBMISSION_KINDS,
  applicationPageWindow,
  applicationsFile,
  batchAction,
  filingActionLabel,
  filingStatusLabel,
  filingStatusVariant,
  groupAttention,
  isApplicationsPageSize,
  isFilingStatus,
  isSubmissionTypeId,
  personIdentity,
  resumeDraftHref,
  selectApplications,
  submissionDocumentSrc,
  submissionTypeLabel,
  submittedByName,
  submittedBySideLabel,
  type ApplicationsFile,
  type AttentionEntry,
  type AttentionGroupEntry,
  type ApplicationsPageSize,
  type FilingStatus,
  type Submission,
  type SubmissionKind,
  type SubmissionPerson,
  type SubmissionTypeId,
} from "@/lib/cases/applications";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

type SubmitterOption = {
  value: string;
  label: string;
  role: string;
};

type TypeGroup = {
  value: SubmissionKind;
  label: string;
  items: { value: SubmissionTypeId; label: string }[];
};

const headClass =
  "h-10 border-b border-border px-4 py-3 text-caption font-medium text-muted-foreground";
const cellClass =
  "border-b border-border px-4 py-3 align-middle text-left text-body-compact";
const filterBarClass =
  "flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end";
const filterFieldClass = "min-w-0 w-full md:w-72";

/**
 * Case-level submission register. Filings that still need a step pin to a
 * highlighted well at the top of the list. Make filings stays the teal fill
 * (Laws).
 */
export function CaseApplications({ record }: { record: CaseRecord }) {
  const file = useMemo(() => {
    try {
      return applicationsFile(record);
    } catch {
      return null;
    }
  }, [record]);

  if (!file) return <ApplicationsError />;
  return <ApplicationsReady file={file} />;
}

export function ApplicationsLoading() {
  return (
    <ApplicationsPanel busy>
      <span className="sr-only" role="status">
        Loading applications
      </span>
      <div className={filterBarClass}>
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </ApplicationsPanel>
  );
}

function ApplicationsError() {
  return (
    <ApplicationsPanel>
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle className="text-body">
          Applications could not be loaded
        </AlertTitle>
        <AlertDescription className="text-body">
          Refresh the page to try again.
        </AlertDescription>
      </Alert>
    </ApplicationsPanel>
  );
}

function ApplicationsReady({ file }: { file: ApplicationsFile }) {
  const [submittedById, setSubmittedById] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<SubmissionTypeId | null>(null);
  const [status, setStatus] = useState<FilingStatus | null>(null);
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [pageSize, setPageSize] = useState<ApplicationsPageSize>(
    APPLICATIONS_PAGE_SIZE
  );
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState<Submission | null>(null);
  const [batchOpen, setBatchOpen] = useState<AttentionGroupEntry | null>(null);
  const [paymentOpen, setPaymentOpen] = useState<Submission | null>(null);
  const [signedIds, setSignedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [paidIds, setPaidIds] = useState<ReadonlySet<string>>(() => new Set());

  /**
   * Steps taken in this session move a filing on where the dummy pack cannot,
   * along the workflow the register already models and Raise application
   * already walks: signed but unpaid is Pending payment, and paying the fee
   * is what completes the electronic filing. Nothing persists past a reload —
   * the pack is the source of truth on load.
   */
  const submissions = useMemo(
    () =>
      signedIds.size === 0 && paidIds.size === 0
        ? file.submissions
        : file.submissions.map((submission) => {
            if (paidIds.has(submission.id)) {
              return { ...submission, status: "completed" as const };
            }
            if (signedIds.has(submission.id)) {
              return { ...submission, status: "pending-payment" as const };
            }
            return submission;
          }),
    [file.submissions, signedIds, paidIds]
  );

  const peopleById = new Map(file.people.map((person) => [person.id, person]));

  const submitterOptions: SubmitterOption[] = uniqueSubmitters(
    submissions,
    peopleById
  );

  const typeGroups: TypeGroup[] = SUBMISSION_KINDS.map((group) => ({
    value: group.id,
    label: group.label,
    items:
      group.id === "application"
        ? APPLICATION_TYPES.map((item) => ({
            value: item.id,
            label: item.label,
          }))
        : SUBMISSION_DOCUMENT_TYPES.map((item) => ({
            value: item.id,
            label: item.label,
          })),
  }));

  const selection = selectApplications({
    submissions,
    submittedById,
    typeId,
    status,
    submissionQuery,
    pageSize,
    page,
  });
  const attentionEntries = groupAttention(selection.attention);
  const hasAttention = attentionEntries.length > 0;
  const hasRows = selection.total > 0;

  const filtered =
    submittedById !== null ||
    typeId !== null ||
    status !== null ||
    submissionQuery.trim() !== "";

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setSubmittedById(null);
    setTypeId(null);
    setStatus(null);
    setSubmissionQuery("");
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

  if (submissions.length === 0) {
    return (
      <ApplicationsPanel>
        <ApplicationsEmpty
          icon={FileTextIcon}
          title="No submissions recorded"
          description="Use Make filings to raise an application or submit documents."
        />
      </ApplicationsPanel>
    );
  }

  /* The register-wide search from the legacy screens, at the header's right
     corner — the same seat the Documents register gives its filing-ID
     search. */
  const search = (
    <div className="relative w-full md:w-64">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Search submission ID"
        placeholder="Search submission ID"
        className="pl-9"
        value={submissionQuery}
        onChange={(event) => {
          setSubmissionQuery(event.target.value);
          resetPage();
        }}
      />
    </div>
  );

  return (
    <>
      <ApplicationsPanel search={search}>
        <div className={filterBarClass}>
          <Field className={filterFieldClass}>
            <FieldLabel
              htmlFor="applications-type"
              className="text-body font-medium"
            >
              Type
            </FieldLabel>
            <TypeFilterCombobox
              id="applications-type"
              groups={typeGroups}
              value={typeId}
              onChange={(next) => {
                setTypeId(next);
                resetPage();
              }}
            />
          </Field>

          <Field className={filterFieldClass}>
            <FieldLabel
              htmlFor="applications-status"
              className="text-body font-medium"
            >
              Status
            </FieldLabel>
            <Select
              value={status ?? "all"}
              onValueChange={(next) => {
                setStatus(isFilingStatus(next) ? next : null);
                resetPage();
              }}
            >
              <SelectTrigger
                id="applications-status"
                className="w-full text-body"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-body">
                  All statuses
                </SelectItem>
                {FILING_STATUSES.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={item.id}
                    className="text-body"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field className={filterFieldClass}>
            <FieldLabel
              htmlFor="applications-submitted-by"
              className="text-body font-medium"
            >
              Submitted by
            </FieldLabel>
            <SubmitterFilterCombobox
              id="applications-submitted-by"
              items={submitterOptions}
              value={submittedById}
              onChange={(next) => {
                setSubmittedById(next);
                resetPage();
              }}
            />
          </Field>

          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            disabled={!filtered}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
        <Separator />

        {!hasAttention && !hasRows ? (
          <ApplicationsEmpty
            icon={FileSearchIcon}
            title={
              filtered
                ? "No submissions matching filters"
                : "No submissions recorded"
            }
            description={
              filtered
                ? "No submissions match the selected filters."
                : "Use Make filings to raise an application or submit documents."
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {hasAttention ? (
              <ApplicationsAttention
                caseId={file.caseId}
                entries={attentionEntries}
                peopleById={peopleById}
                onOpenRecord={setRecordOpen}
                onOpenBatch={setBatchOpen}
                onCompletePayment={setPaymentOpen}
              />
            ) : null}

            {hasRows ? (
              <div className="flex flex-col gap-4">
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <ApplicationsTable
                    rows={selection.rows}
                    caption="Applications"
                    peopleById={peopleById}
                    onOpenRecord={setRecordOpen}
                  />
                </div>
                <div className="md:hidden">
                  <ApplicationsItemList
                    rows={selection.rows}
                    peopleById={peopleById}
                    onOpenRecord={setRecordOpen}
                  />
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    {selection.pageCount > 1 ? (
                      <p className="text-body-compact text-muted-foreground">
                        Showing {selection.from}–{selection.to}
                      </p>
                    ) : null}
                    <ApplicationsPageSizeSelect
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
                        {applicationPageWindow(
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
            ) : null}
          </div>
        )}
      </ApplicationsPanel>
      <SubmissionRecordDialog
        file={{ ...file, submissions }}
        peopleById={peopleById}
        submission={recordOpen}
        onOpenChange={setRecordOpen}
      />
      <SubmissionBatchDialog
        peopleById={peopleById}
        group={batchOpen}
        onOpenChange={setBatchOpen}
        onSigned={(ids) =>
          setSignedIds((current) => new Set([...current, ...ids]))
        }
      />
      <SubmissionPaymentDialog
        submission={paymentOpen}
        onOpenChange={setPaymentOpen}
        onPaid={(id) => setPaidIds((current) => new Set([...current, id]))}
      />
    </>
  );
}

function uniqueSubmitters(
  submissions: Submission[],
  peopleById: Map<string, SubmissionPerson>
): SubmitterOption[] {
  const seen = new Set<string>();
  const options: SubmitterOption[] = [];
  for (const submission of submissions) {
    if (seen.has(submission.submittedById)) continue;
    seen.add(submission.submittedById);
    const person = peopleById.get(submission.submittedById);
    options.push({
      value: submission.submittedById,
      label: person ? personIdentity(person) : submission.submittedById,
      role: person?.role ?? "",
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function ApplicationsPanel({
  children,
  search,
  busy = false,
}: {
  children: ReactNode;
  /** Submission-id search, seated at the header row's right corner. */
  search?: ReactNode;
  busy?: boolean;
}) {
  return (
    <section className="min-w-0" aria-busy={busy || undefined}>
      <Card className="hover:bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-title-s font-semibold">Applications</h2>
            {search}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      </Card>
    </section>
  );
}

/**
 * The well of filings that still owe a step. Two or more filings waiting on
 * the same step from the same filer read as one job, so they collapse into a
 * single entry with a single CTA; a filing alone in its bucket keeps its own
 * card. Rows inside a group stay openable — these filings are pinned out of
 * the register below, so this is the only route to the record.
 */
function ApplicationsAttention({
  caseId,
  entries,
  peopleById,
  onOpenRecord,
  onOpenBatch,
  onCompletePayment,
}: AttentionListProps) {
  return (
    <div
      role="region"
      aria-labelledby="applications-attention-heading"
      className="flex flex-col gap-4 rounded-xl border border-border bg-warning-muted p-6"
    >
      <div className="flex items-center gap-2">
        <CircleAlertIcon
          className="size-4 shrink-0 text-warning-ink"
          aria-hidden
        />
        <h3
          id="applications-attention-heading"
          className="text-title-s font-semibold"
        >
          Needs attention
        </h3>
      </div>
      <ItemGroup className="flex flex-col gap-3">
        {entries.map((entry) =>
          entry.kind === "group" ? (
            <AttentionGroup
              key={entry.key}
              entry={entry}
              peopleById={peopleById}
              onOpenRecord={onOpenRecord}
              onOpenBatch={onOpenBatch}
            />
          ) : (
            <AttentionSubmission
              key={entry.key}
              caseId={caseId}
              submission={entry.submission}
              peopleById={peopleById}
              onOpenRecord={onOpenRecord}
              onCompletePayment={onCompletePayment}
            />
          )
        )}
      </ItemGroup>
    </div>
  );
}

function AttentionSubmission({
  caseId,
  submission,
  peopleById,
  onOpenRecord,
  onCompletePayment,
}: {
  caseId: string;
  submission: Submission;
  peopleById: Map<string, SubmissionPerson>;
  onOpenRecord: (submission: Submission) => void;
  onCompletePayment: (submission: Submission) => void;
}) {
  const router = useRouter();
  /*
    The CTA is the step the filing owes, so it has to start that step:
    Complete payment opens the fee dialog, the same one Raise application
    shows after signing. Continue draft reopens the filing form itself —
    a draft's next step is finishing it, and the record dialog shows the
    filed packet and the court's answer, neither of which a draft has yet.
    The rest still open the record, which is where those two live.
  */
  const resumeHref = resumeDraftHref(caseId, submission);
  const start =
    submission.status === "pending-payment"
      ? onCompletePayment
      : resumeHref
        ? () => router.push(resumeHref)
        : onOpenRecord;
  return (
    <Item
      role="listitem"
      variant="outline"
      className="h-full items-start gap-3 p-4 hover:bg-card md:flex-nowrap md:items-center"
    >
      <ItemContent className="min-w-0 flex-1 gap-2 text-left">
        <ItemTitle className="line-clamp-none text-body font-medium text-foreground">
          {submission.title}
        </ItemTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={filingStatusVariant(submission.status)}>
            {filingStatusLabel(submission.status)}
          </Badge>
          <p className="text-body-compact text-muted-foreground">
            {formatCaseDate(submission.addedOn)}
          </p>
        </div>
        <p className="text-body-compact text-muted-foreground">
          {submittedBySideLabel(submission, peopleById)}
          {" · "}
          {submittedByName(submission, peopleById)}
        </p>
      </ItemContent>
      <ItemActions className="w-full md:w-auto">
        <Button
          type="button"
          variant="outline"
          className="w-full md:w-auto"
          aria-label={`${filingActionLabel(submission.status)}: ${submission.title}`}
          onClick={() => start(submission)}
        >
          {filingActionLabel(submission.status)}
        </Button>
      </ItemActions>
    </Item>
  );
}

/**
 * Rows shown before the tail folds away. The fold only earns its place when
 * it hides more than one filing — a disclosure over a single row costs more
 * than it saves.
 */
const ATTENTION_GROUP_PREVIEW = 3;

function AttentionGroup({
  entry,
  peopleById,
  onOpenRecord,
  onOpenBatch,
}: {
  entry: AttentionGroupEntry;
  peopleById: Map<string, SubmissionPerson>;
  onOpenRecord: (submission: Submission) => void;
  onOpenBatch: (entry: AttentionGroupEntry) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const action = batchAction(entry.status);
  if (!action) return null;

  const [lead] = entry.submissions;
  const count = entry.submissions.length;
  const headingId = `applications-attention-${entry.key}`;
  const listId = `${headingId}-list`;
  const folds = count > ATTENTION_GROUP_PREVIEW + 1;
  const shown = folds
    ? entry.submissions.slice(0, ATTENTION_GROUP_PREVIEW)
    : entry.submissions;
  const folded = folds ? entry.submissions.slice(ATTENTION_GROUP_PREVIEW) : [];

  return (
    <Item
      role="listitem"
      variant="outline"
      className="h-full flex-col items-stretch gap-3 p-4 hover:bg-card"
    >
      {/*
        Header band: the ask and who owes it on the left, the one CTA for the
        set top-right — the same anatomy as a single card, so a group reads as
        one entry in the well rather than a new kind of thing. The ruled list
        below it says what the CTA covers.
      */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <ItemContent className="min-w-0 flex-1 gap-2 text-left">
          <ItemTitle
            id={headingId}
            className="line-clamp-none text-body font-medium text-foreground"
          >
            {action.title(count)}
          </ItemTitle>
          {/*
            The chip carries the filing status once for the whole group; the
            filer is the same for every row by construction, so it sits here
            rather than repeating down the list. Dates differ, so they stay on
            the rows.
          */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={filingStatusVariant(entry.status)}>
              {filingStatusLabel(entry.status)}
            </Badge>
            <p className="text-body-compact text-muted-foreground">
              {submittedBySideLabel(lead, peopleById)}
              {" · "}
              {submittedByName(lead, peopleById)}
            </p>
          </div>
        </ItemContent>
        <ItemActions className="w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            aria-label={`${action.cta}: ${submittedByName(lead, peopleById)}`}
            onClick={() => onOpenBatch(entry)}
          >
            {action.cta}
          </Button>
        </ItemActions>
      </div>

      {/*
        Ruled rows, full-bleed to the card edge so the rule and the row's own
        hover fill share one width — same treatment as the register table
        below. The rules sit *between* filings: one above the first row to
        close off the header, none under the last, where the card edge
        already ends the list.

        One list, not two: the fold adds rows to this list rather than
        revealing a second one, so the count a screen reader announces is the
        count the header promised. That rules out Collapsible here — its
        content renders a div, which cannot live inside a ul.
      */}
      <div className="-mx-4 flex flex-col border-t border-border">
        <ul
          id={listId}
          aria-labelledby={headingId}
          className="flex flex-col divide-y divide-border"
        >
          {(showAll ? entry.submissions : shown).map((submission) => (
            <AttentionGroupRow
              key={submission.id}
              submission={submission}
              onOpenRecord={onOpenRecord}
            />
          ))}
        </ul>
      </div>
      {folded.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="-mx-2 self-start px-2"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((open) => !open)}
        >
          {showAll ? "Show fewer" : `Show ${folded.length} More`}
        </Button>
      ) : null}
    </Item>
  );
}

function AttentionGroupRow({
  submission,
  onOpenRecord,
}: {
  submission: Submission;
  onOpenRecord: (submission: Submission) => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={`View submission: ${submission.title}`}
        onClick={() => onOpenRecord(submission)}
        className="flex min-h-10 w-full flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="min-w-0 text-body-compact text-foreground">
          {submission.title}
        </span>
        <span className="text-body-compact text-muted-foreground">
          {formatCaseDate(submission.addedOn)}
        </span>
      </button>
    </li>
  );
}

function ApplicationsPageSizeSelect({
  value,
  onChange,
}: {
  value: ApplicationsPageSize;
  onChange: (pageSize: ApplicationsPageSize) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="applications-page-size"
        className="text-body-compact font-normal text-muted-foreground"
      >
        Per page
      </Label>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          const size = Number.parseInt(next, 10);
          if (isApplicationsPageSize(size)) onChange(size);
        }}
      >
        <SelectTrigger id="applications-page-size" className="text-body">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPLICATIONS_PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SubmitterFilterCombobox({
  id,
  items,
  value,
  onChange,
}: {
  id: string;
  items: SubmitterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(next) => onChange(next?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      itemToStringLabel={(item) => item.label}
      filter={(item, query) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return `${item.label} ${item.role}`.toLowerCase().includes(q);
      }}
      autoComplete="off"
    >
      <ComboboxInput
        id={id}
        placeholder="All submitters"
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>No submitter found.</ComboboxEmpty>
        <ComboboxList>
          {(item: SubmitterOption) => (
            <ComboboxItem
              key={item.value}
              value={item}
              className="items-start py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body-compact font-medium whitespace-normal">
                  {item.label}
                </span>
                {item.role ? (
                  <span className="text-caption font-medium text-muted-foreground whitespace-normal">
                    {item.role}
                  </span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function TypeFilterCombobox({
  id,
  groups,
  value,
  onChange,
}: {
  id: string;
  groups: TypeGroup[];
  value: SubmissionTypeId | null;
  onChange: (value: SubmissionTypeId | null) => void;
}) {
  const items = groups.flatMap((group) => group.items);
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={groups}
      value={selected}
      onValueChange={(next) =>
        onChange(
          next && isSubmissionTypeId(next.value) ? next.value : null
        )
      }
      isItemEqualToValue={(a, b) => a.value === b.value}
      itemToStringLabel={(item) => item.label}
      filter={(item, query) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return item.label.toLowerCase().includes(q);
      }}
      autoComplete="off"
    >
      <ComboboxInput id={id} placeholder="All types" className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No type found.</ComboboxEmpty>
        <ComboboxList>
          {(group: TypeGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel className="text-caption font-medium">
                {group.label}
              </ComboboxLabel>
              <ComboboxCollection>
                {(item: { value: SubmissionTypeId; label: string }) => (
                  <ComboboxItem key={item.value} value={item}>
                    <span className="text-body whitespace-normal">
                      {item.label}
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type AttentionListProps = {
  /** A draft's resume link is case-scoped, so the well needs the case. */
  caseId: string;
  entries: AttentionEntry[];
  peopleById: Map<string, SubmissionPerson>;
  onOpenRecord: (submission: Submission) => void;
  onOpenBatch: (entry: AttentionGroupEntry) => void;
  /** A filing that owes its fee goes straight into the payment step. */
  onCompletePayment: (submission: Submission) => void;
};

type GroupListProps = {
  rows: Submission[];
  peopleById: Map<string, SubmissionPerson>;
  onOpenRecord: (submission: Submission) => void;
};

/**
 * What the row's download hands over: the submission's signed artefact —
 * the first attached document with a file. Drafts and unsigned filings have
 * none yet, and the button disables rather than disappearing.
 */
function firstDocumentSrc(submission: Submission): string | undefined {
  for (const doc of submission.documents) {
    const src = submissionDocumentSrc(doc);
    if (src) return src;
  }
  return undefined;
}

function ApplicationsTable({
  rows,
  caption,
  peopleById,
  onOpenRecord,
}: {
  rows: Submission[];
  caption: string;
  peopleById: Map<string, SubmissionPerson>;
  onOpenRecord: (submission: Submission) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headClass}>Type</TableHead>
          <TableHead className={cn(headClass, "w-52")}>ID</TableHead>
          <TableHead className={cn(headClass, "w-40")}>Status</TableHead>
          <TableHead className={cn(headClass, "w-36")}>Submitted by</TableHead>
          <TableHead className={cn(headClass, "w-40")}>Date added</TableHead>
          <TableHead className={cn(headClass, "w-32")}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/*
          The row opens the record, exactly as the Documents register does,
          and the one column action is the download — the legacy three-dot
          menu held nothing else (Aug 31 correction round).
        */}
        {rows.map((submission) => (
          <TableRow
            key={submission.id}
            className="cursor-pointer"
            onClick={() => onOpenRecord(submission)}
          >
            <TableCell className={cn(cellClass, "min-w-0 whitespace-normal")}>
              <SubmissionTypeCell submission={submission} />
            </TableCell>
            <TableCell
              className={cn(
                cellClass,
                "min-w-0 whitespace-normal text-muted-foreground"
              )}
            >
              <SubmissionIdValue submission={submission} />
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-0 overflow-hidden")}>
              <Badge
                variant={filingStatusVariant(submission.status)}
                className="h-auto max-w-full min-h-6 whitespace-normal"
              >
                {filingStatusLabel(submission.status)}
              </Badge>
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-0 whitespace-normal")}>
              {submittedBySideLabel(submission, peopleById)}
            </TableCell>
            <TableCell className={cn(cellClass, "whitespace-nowrap")}>
              {formatCaseDate(submission.addedOn)}
            </TableCell>
            <TableCell className={cellClass}>
              <DownloadFilingButton
                label={`Download submission: ${submission.title}`}
                tooltip="Download submission"
                href={firstDocumentSrc(submission)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The type is the value people scan by; the filing's own title is the
 * supporting read. Rows that were never given a title carry the type label
 * twice, so the second line only prints when it says something new. Both
 * lines are plain text — Open in the Action column is the row's control.
 */
function SubmissionTypeCell({ submission }: { submission: Submission }) {
  const type = submissionTypeLabel(submission.type);
  const detail = submission.title === type ? null : submission.title;

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="font-medium text-foreground">{type}</span>
      {detail ? (
        <span className="text-body-compact text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </span>
  );
}

/**
 * No ID until the filing reaches the registry — a bare dash reads as nothing
 * at all, and the column header supplies the "ID" half of the announcement.
 */
function SubmissionIdValue({ submission }: { submission: Submission }) {
  if (submission.submissionId)
    return <Identifier value={submission.submissionId} label="submission id" />;
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">Not allotted</span>
    </>
  );
}

function ApplicationsItemList({
  rows,
  peopleById,
  onOpenRecord,
}: GroupListProps) {
  return (
    <ItemGroup className="flex flex-col gap-3">
      {rows.map((submission) => {
        const type = submissionTypeLabel(submission.type);
        const detail = submission.title === type ? null : submission.title;

        return (
          <Item
            key={submission.id}
            variant="outline"
            className="h-full items-start gap-3 p-4"
          >
            <ItemContent className="min-w-0 flex-1 gap-2 text-left">
              <ItemTitle className="line-clamp-none text-body font-medium text-foreground">
                {type}
              </ItemTitle>
              {detail ? (
                <p className="text-body-compact text-muted-foreground">
                  {detail}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={filingStatusVariant(submission.status)}>
                  {filingStatusLabel(submission.status)}
                </Badge>
                <p className="text-body-compact text-muted-foreground">
                  {formatCaseDate(submission.addedOn)}
                </p>
              </div>
              <p className="text-body-compact text-muted-foreground">
                {submittedBySideLabel(submission, peopleById)}
              </p>
              {/* No column header to lean on here, so the ID names itself. */}
              <p className="text-body-compact text-muted-foreground">
                ID <SubmissionIdValue submission={submission} />
              </p>
              {submission.courtResult ? (
                <p className="text-body-compact">
                  Court result: {submission.courtResult}
                </p>
              ) : null}
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="outline"
                aria-label={`Open ${submission.title}`}
                onClick={() => onOpenRecord(submission)}
              >
                Open
              </Button>
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

function ApplicationsEmpty({
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
        <EmptyTitle className="text-title-s font-semibold">{title}</EmptyTitle>
        {description ? (
          <EmptyDescription className="text-body">
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
