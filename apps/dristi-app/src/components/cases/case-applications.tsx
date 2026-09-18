"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  FileSearchIcon,
  FileTextIcon,
} from "lucide-react";

import { ApplicationPaymentDialog } from "@/components/cases/application-payment-dialog";
import { ApplicationRecordDialog } from "@/components/cases/application-record-dialog";
import { RestingCard } from "@/components/cases/case-overview-card";
import {
  RECENT_ROW,
  RegisterFilter,
  RegisterSearch,
  RowViewButton,
  useRecentRow,
} from "@/components/cases/register-controls";
import { PartySignatureDialog } from "@/components/cases/party-application";
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
  nextStepCopy,
  type FilingStatus,
} from "@/lib/cases/applications";
import { type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

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
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [filers, setFilers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  /* The open record lives in `?application=`, so a case update can link
     straight to it. */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const recordOpen = searchParams.get("application");
  const { recentId, markRecent, recentRowRef } = useRecentRow();
  function setRecordOpen(id: string | null) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("application", id);
    else next.delete("application");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  const [signing, setSigning] = useState<ApplicationRecord[]>([]);
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
      (types.length === 0 || types.includes(item.type)) &&
      (statuses.length === 0 || statuses.includes(item.status)) &&
      (filers.length === 0 || filers.includes(item.filedById)) &&
      (needle === "" ||
        (item.applicationId ?? "").toLowerCase().includes(needle))
  );
  const actions = groupActions(rows);
  const filtered =
    types.length > 0 ||
    statuses.length > 0 ||
    filers.length > 0 ||
    needle !== "";
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
      setSigning(applications);
    }
  }

  return (
    <ApplicationsPanel
      search={
        <RegisterSearch
          label="Search by application ID"
          value={query}
          onChange={setQuery}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <RegisterFilter
          label="Type"
          values={types}
          onChange={setTypes}
          options={APPLICATION_TYPE_OPTIONS}
        />
        <RegisterFilter
          label="Status"
          values={statuses}
          onChange={setStatuses}
          options={FILING_STATUSES.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
        <RegisterFilter
          label="Filed by"
          values={filers}
          onChange={setFilers}
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
              setTypes([]);
              setStatuses([]);
              setFilers([]);
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
          <ApplicationsTable
            rows={rows}
            onOpen={setRecordOpen}
            recentId={recentId}
            recentRowRef={recentRowRef}
          />
        </>
      )}

      <ApplicationRecordDialog
        caseId={record.id}
        application={openApplication}
        onOpenChange={(open) => {
          if (open) return;
          if (recordOpen) markRecent(recordOpen);
          setRecordOpen(null);
        }}
      />
      {/* The same signing flow as Add witness and Add power of attorney; one
          signature covers every application in the batch. */}
      <PartySignatureDialog
        open={signing.length > 0}
        onClose={() => setSigning([])}
        onComplete={() => {
          move(
            signing.map((item) => item.id),
            "pending-payment"
          );
          setSigning([]);
        }}
        chooseTitle={
          signing.length > 1
            ? `How are these ${signing.length} applications signed?`
            : undefined
        }
        submitLabel="Submit signed copy"
        confirmation={
          signing.length > 1
            ? {
                title: `${signing.length} applications signed`,
                description: "Pay the court fee to submit them to the court.",
              }
            : {
                title: "Application signed",
                description: "Pay the court fee to submit it to the court.",
              }
        }
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
          Needs attention
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
  recentId,
  recentRowRef,
}: {
  rows: ApplicationRecord[];
  onOpen: (id: string) => void;
  recentId: string | null;
  recentRowRef: (node: HTMLTableRowElement | null) => void;
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
            ref={recentId === item.id ? recentRowRef : undefined}
            className={cn(
              tableRowClass(),
              "cursor-pointer",
              recentId === item.id && RECENT_ROW
            )}
            onClick={() => onOpen(item.id)}
          >
            <TableCell
              className={cn(TABLE_CELL, "font-medium whitespace-normal")}
            >
              {item.typeLabel}
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, "text-caption text-muted-foreground")}
            >
              {item.applicationId ? (
                <Identifier value={item.applicationId} label="application id" />
              ) : (
                <Dash label="Not allotted" />
              )}
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
              <RowViewButton
                label={item.typeLabel}
                onClick={() => onOpen(item.id)}
              />
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
