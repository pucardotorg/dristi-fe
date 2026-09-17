"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  FileSearchIcon,
  FileTextIcon,
  SearchIcon,
} from "lucide-react";

import { ApplicationPaymentDialog } from "@/components/cases/application-payment-dialog";
import { ApplicationRecordDialog } from "@/components/cases/application-record-dialog";
import { RestingCard } from "@/components/cases/case-overview-card";
import { SubmissionBatchDialog } from "@/components/cases/submission-batch-dialog";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPLICATION_TYPE_OPTIONS,
  HAS_BULK_SIGNING_TOOL,
  applicationsRegister,
  groupActions,
  type ActionEntry,
  type ApplicationRecord,
} from "@/lib/cases/application-record";
import {
  FILING_STATUSES,
  applicationsFile,
  nextStepCopy,
  type AttentionGroupEntry,
  type FilingStatus,
} from "@/lib/cases/applications";
import { type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

const ALL = "all";

/**
 * Applications (§9). One kind of thing, many types. What the viewer still has
 * to do sits above the register as a quiet list, never as an alarm: the work
 * is routine, and the status badges already carry the colour.
 */
export function CaseApplications({ record }: { record: CaseRecord }) {
  /* Signing and paying move a filing on in memory only; this is a prototype. */
  const [moved, setMoved] = useState<ReadonlyMap<string, FilingStatus>>(
    () => new Map()
  );
  const register = useMemo(() => {
    try {
      return applicationsRegister(record, moved);
    } catch {
      return null;
    }
  }, [record, moved]);
  const peopleById = useMemo(() => {
    try {
      return new Map(
        applicationsFile(record).people.map((person) => [person.id, person])
      );
    } catch {
      return new Map();
    }
  }, [record]);

  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [filedBy, setFiledBy] = useState(ALL);
  const [query, setQuery] = useState("");
  const [recordOpen, setRecordOpen] = useState<string | null>(null);
  const [signing, setSigning] = useState<AttentionGroupEntry | null>(null);
  const [paying, setPaying] = useState<ApplicationRecord[]>([]);

  if (!register) {
    return (
      <ApplicationsPanel>
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Applications could not be loaded</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </Alert>
      </ApplicationsPanel>
    );
  }

  const needle = query.trim().toLowerCase();
  const rows = register.applications.filter(
    (item) =>
      (type === ALL || item.type === type) &&
      (status === ALL || item.status === status) &&
      (filedBy === ALL || item.filedById === filedBy) &&
      (needle === "" ||
        (item.applicationId ?? "").toLowerCase().includes(needle))
  );
  const actions = groupActions(rows);
  const filtered =
    type !== ALL || status !== ALL || filedBy !== ALL || needle !== "";
  const openApplication =
    register.applications.find((item) => item.id === recordOpen) ?? null;

  function move(ids: string[], next: FilingStatus) {
    setMoved((current) => {
      const updated = new Map(current);
      for (const id of ids) updated.set(id, next);
      return updated;
    });
  }

  /** The step a filing is waiting on: a draft resumes in its form, the rest
   *  open their dialog. One application signs through the same flow as many. */
  function act(applications: ApplicationRecord[]) {
    const [lead] = applications;
    if (lead.status === "pending-payment") {
      setPaying(applications);
    } else if (lead.status === "pending-signature") {
      setSigning({
        kind: "group",
        key: applications.map((item) => item.id).join(),
        status: lead.status,
        submittedById: lead.filedById,
        submissions: applications.map((item) => item.source),
      });
    }
  }

  return (
    <ApplicationsPanel
      search={
        <div className="relative w-full sm:w-64">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search by application ID"
            placeholder="Search by application ID"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Type"
          value={type}
          onChange={setType}
          options={APPLICATION_TYPE_OPTIONS}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={FILING_STATUSES.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
        <FilterSelect
          label="Filed by"
          value={filedBy}
          onChange={setFiledBy}
          options={register.people.map((person) => ({
            value: person.id,
            label: person.name,
          }))}
        />
        {filtered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setType(ALL);
              setStatus(ALL);
              setFiledBy(ALL);
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {filtered ? (
                <FileSearchIcon aria-hidden />
              ) : (
                <FileTextIcon aria-hidden />
              )}
            </EmptyMedia>
            <EmptyTitle className="text-body font-semibold">
              {filtered ? "No applications match" : "No applications yet"}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? "Try a different filter or clear them."
                : "Use Make filings to raise an application."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {actions.length > 0 ? (
            <NeedsAction
              caseId={record.id}
              entries={actions}
              onAct={act}
              onOpen={setRecordOpen}
            />
          ) : null}
          <ApplicationsTable rows={rows} onOpen={setRecordOpen} />
        </>
      )}

      <ApplicationRecordDialog
        caseId={record.id}
        application={openApplication}
        onOpenChange={(open) => {
          if (!open) setRecordOpen(null);
        }}
      />
      <SubmissionBatchDialog
        peopleById={peopleById}
        group={signing}
        onOpenChange={setSigning}
        onSigned={(ids) => move(ids, "pending-payment")}
      />
      <ApplicationPaymentDialog
        applications={paying}
        onOpenChange={(open) => {
          if (!open) setPaying([]);
        }}
        onPaid={(ids) => move(ids, "completed")}
      />
    </ApplicationsPanel>
  );
}

export function ApplicationsLoading() {
  return (
    <ApplicationsPanel busy>
      <span className="sr-only" role="status">
        Loading applications
      </span>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </ApplicationsPanel>
  );
}

function ApplicationsPanel({
  search,
  busy,
  children,
}: {
  search?: ReactNode;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <RestingCard>
      <CardContent className="flex flex-col gap-4" aria-busy={busy}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-body font-semibold text-foreground">
            Applications
          </h2>
          {search}
        </div>
        {children}
      </CardContent>
    </RestingCard>
  );
}

/** The label rides inside the trigger, so the filter names itself without a
 *  row of labels above the bar (ACCESSIBILITY 12: a visible label). */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-auto max-w-full gap-1.5">
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All</SelectItem>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * What still needs a step from the viewer (APP-05, §9.2). A sunken well with
 * plain rows: the same surfaces as the rest of the page, so it reads as a
 * short to-do list rather than a warning. The only colour is the status badge.
 */
function NeedsAction({
  caseId,
  entries,
  onAct,
  onOpen,
}: {
  caseId: string;
  entries: ActionEntry[];
  onAct: (applications: ApplicationRecord[]) => void;
  onOpen: (id: string) => void;
}) {
  const count = entries.reduce(
    (sum, entry) =>
      sum + (entry.kind === "group" ? entry.applications.length : 1),
    0
  );
  return (
    <section
      aria-labelledby="applications-needs-action"
      className="flex flex-col gap-1 rounded-xl bg-surface-sunken p-1"
    >
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <h3
          id="applications-needs-action"
          className="text-body-compact font-semibold text-foreground"
        >
          Needs your action
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.key} className="rounded-lg bg-card shadow-raised">
            {entry.kind === "single" ? (
              <ActionRow
                caseId={caseId}
                application={entry.application}
                onAct={onAct}
                onOpen={onOpen}
              />
            ) : (
              <ActionGroup entry={entry} onAct={onAct} onOpen={onOpen} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionRow({
  caseId,
  application,
  onAct,
  onOpen,
  nested = false,
}: {
  caseId: string;
  application: ApplicationRecord;
  onAct: (applications: ApplicationRecord[]) => void;
  onOpen: (id: string) => void;
  /** Inside a group the status is already said once, on the group. */
  nested?: boolean;
}) {
  const step = nextStepCopy(application.status);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:basis-full">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(application.id)}
            className="rounded-sm text-left text-body-compact font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {application.typeLabel}
          </button>
          {nested ? null : (
            <Badge variant={application.statusVariant}>
              {application.statusLabel}
            </Badge>
          )}
        </div>
        <p className="text-caption font-medium text-muted-foreground">
          {nested ? null : `${application.filedBy} · `}
          <span className="tabular-nums">Created {application.created}</span>
        </p>
      </div>
      {step ? (
        application.status === "draft" ? (
          <Button variant="outline" size="sm" className="max-sm:h-10" asChild>
            <Link href={`/cases/${caseId}/filings/application`}>
              {step}
              <span className="sr-only">: {application.typeLabel}</span>
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={nested ? "ghost" : "outline"}
            size="sm"
            className="max-sm:h-10"
            onClick={() => onAct([application])}
          >
            {step}
            <span className="sr-only">: {application.typeLabel}</span>
          </Button>
        )
      ) : null}
    </div>
  );
}

/** Same step, same filer: one entry, one action, with each application still
 *  open to being handled alone (APP-09 to APP-11). */
function ActionGroup({
  entry,
  onAct,
  onOpen,
}: {
  entry: Extract<ActionEntry, { kind: "group" }>;
  onAct: (applications: ApplicationRecord[]) => void;
  onOpen: (id: string) => void;
}) {
  const [lead] = entry.applications;
  const count = entry.applications.length;
  const signing = entry.status === "pending-signature";
  /* Bulk signing is only for a filer with the tool set up; everyone else signs
     one at a time, so the list opens and the bulk button is not offered. */
  const bulk = !signing || HAS_BULK_SIGNING_TOOL;

  return (
    <Collapsible defaultOpen={!bulk}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:basis-full">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-body-compact font-medium text-foreground">
              {count} applications{" "}
              {signing ? "need a signature" : "need payment"}
            </p>
            <Badge variant={lead.statusVariant}>{lead.statusLabel}</Badge>
          </div>
          <p className="text-caption font-medium text-muted-foreground">
            {entry.filedBy}
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group/expand max-sm:h-10"
          >
            <span className="group-aria-expanded/expand:hidden">Show all</span>
            <span className="hidden group-aria-expanded/expand:inline">
              Hide
            </span>
            <ChevronDownIcon
              data-icon="inline-end"
              aria-hidden
              className="transition-transform group-aria-expanded/expand:rotate-180"
            />
          </Button>
        </CollapsibleTrigger>
        {bulk ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-sm:h-10"
            onClick={() => onAct(entry.applications)}
          >
            {signing ? "Sign all" : "Pay all"}
          </Button>
        ) : null}
      </div>
      <CollapsibleContent>
        <ul className="border-t border-hairline">
          {entry.applications.map((application) => (
            <li
              key={application.id}
              className="border-b border-hairline last:border-b-0"
            >
              <ActionRow
                caseId=""
                application={application}
                onAct={onAct}
                onOpen={onOpen}
                nested
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ApplicationsTable({
  rows,
  onOpen,
}: {
  rows: ApplicationRecord[];
  onOpen: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={TABLE_HEAD}>Type</TableHead>
          <TableHead className={TABLE_HEAD}>Application ID</TableHead>
          <TableHead className={TABLE_HEAD}>Status</TableHead>
          <TableHead className={TABLE_HEAD}>Filed by</TableHead>
          <TableHead className={TABLE_HEAD}>Created on</TableHead>
          <TableHead className={TABLE_HEAD}>Submitted on</TableHead>
          <TableHead className={cn(TABLE_HEAD, "w-20 text-right")}>
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {rows.map((item) => (
          <TableRow
            key={item.id}
            className={cn(tableRowClass(), "cursor-pointer")}
            onClick={() => onOpen(item.id)}
          >
            <TableCell
              className={cn(TABLE_CELL, "font-medium whitespace-normal")}
            >
              {item.typeLabel}
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, "font-mono text-caption text-muted-foreground")}
            >
              {item.applicationId ?? <Dash label="Not allotted" />}
            </TableCell>
            <TableCell className={TABLE_CELL}>
              <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
              {item.filedBy}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "tabular-nums")}>
              {item.createdShort}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "tabular-nums")}>
              {item.submittedShort ?? <Dash label="Not submitted" />}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "text-right")}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-my-1.5"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item.id);
                }}
              >
                View
                <span className="sr-only">: {item.typeLabel}</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Dash({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden className="text-muted-foreground">
        —
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}
