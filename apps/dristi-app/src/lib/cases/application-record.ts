import {
  APPLICATION_STATUSES,
  applicationStatusLabel,
  applicationStatusVariant,
  canCreate,
  canPay,
  canSign,
  isFiled,
  objectionTaskOpen,
  sideLabel,
  visibleToSeat,
  type ApplicationStatus,
  type FilerSeat,
  type LifecycleApplication,
  type Side,
  type StatusVariant,
} from "@/lib/applications/lifecycle";
import {
  applicationsFile,
  needsAttention,
  submissionDocumentSrc,
  submissionTypeLabel,
  submittedByName,
  type Submission,
} from "./applications";
import { dayStamp } from "./peek";
import { formatCaseDate, type CaseRecord } from "./types";
import { displayName } from "./names";

export type ApplicationSide = "complainant" | "accused" | "court";

const SIDE_LABEL: Record<ApplicationSide, string> = {
  complainant: "Complainant",
  accused: "Accused",
  court: "Court",
};

export function applicationSideLabel(side: ApplicationSide): string {
  return SIDE_LABEL[side];
}

/**
 * An application as the lifecycle document records it ("Application attributes"). The
 * register, the needs-attention list and the record dialog all read this one shape.
 *
 * Two sources feed it: the seeded register (`applications-dummy.json`, the legacy
 * portal's shape, mapped onto the lifecycle's statuses) and applications raised in this
 * browser (`lib/applications/store.ts`), which carry the whole lifecycle.
 */
export type ApplicationRecord = {
  id: string;
  type: string;
  typeLabel: string;
  status: ApplicationStatus;
  statusLabel: string;
  statusVariant: StatusVariant;
  /** ISO days; `submittedOn` is absent until the filing is submitted. */
  createdOn: string;
  submittedOn?: string;
  created: string;
  submitted?: string;
  onboarded?: string;
  /** "8 Sep 2025", for the register, which sets two dates side by side. */
  createdShort: string;
  submittedShort?: string;
  filedById: string;
  filedBy: string;
  /** Application Raised On Behalf Of. */
  onBehalfOf?: string;
  side: ApplicationSide;
  /** Allotted at submission; shown to the filer, never cited in an order. */
  temporaryId?: string;
  /** Allotted at onboarding — the number a court recognises. */
  applicationNumber?: string;
  /** A seeded order lives in the case's Orders section; a live one is its own text. */
  linkedOrder?: { id: string; label: string; text?: string };
  objection?: { id: string; label: string; status: ApplicationStatus };
  objectionTo?: { id: string; label: string };
  objectionsInvited?: boolean;
  objectionDueBy?: string;
  decisionOn?: string;
  workflowResult?: string;
  documents: { label: string; src?: string }[];
  /** Set for an application raised in this browser. */
  live?: LifecycleApplication;
  /** Set for a seeded row. */
  source?: Submission;
};

/** Whether the viewer has set up the bulk signing tool (APP-10). A working
 *  stand-in until product says how the screen learns this. */
export const HAS_BULK_SIGNING_TOOL = true;

export type ApplicationPerson = { id: string; name: string; role: string };

export type ApplicationsRegister = {
  applications: ApplicationRecord[];
  /** Everyone on the case, for the Filed by filter (APP-03). */
  people: ApplicationPerson[];
  /** File objection tasks open on the viewer's side (`ALC-12`). */
  objectionTasks: ApplicationRecord[];
};

export const APPLICATION_STATUS_OPTIONS = APPLICATION_STATUSES.map((item) => ({
  value: item.id,
  label: item.label,
}));

/**
 * The seeded pack speaks the legacy portal's statuses — everything that went through
 * is "Completed", with the court's outcome in a separate note. On the lifecycle, the
 * outcome is the status: an allowed application is Accepted; one with no outcome yet
 * is still with the court.
 */
export function lifecycleStatusOf(submission: Submission): ApplicationStatus {
  switch (submission.status) {
    case "completed":
      if (submission.courtResult?.toLowerCase().startsWith("allowed")) {
        return "accepted";
      }
      return submission.linkedOrder ? "pending-decision" : "pending-review";
    default:
      return submission.status;
  }
}

function seededSide(role: string): ApplicationSide {
  const lower = role.toLowerCase();
  if (lower.includes("accused")) return "accused";
  if (lower.includes("complainant")) return "complainant";
  return "court";
}

/**
 * Applications only (View Case `CHG-28`): the pack's document submissions — affidavits,
 * memos and the old "Objections" bucket — belong to the Documents register. An
 * objection is now an application of its own, raised from a File objection task.
 */
function seededRecords(record: CaseRecord): {
  rows: ApplicationRecord[];
  people: ApplicationPerson[];
} {
  const file = applicationsFile(record);
  const peopleById = new Map(file.people.map((person) => [person.id, person]));
  const rows = file.submissions
    .filter((submission) => submission.kind === "application")
    .map((source): ApplicationRecord => {
      const status = lifecycleStatusOf(source);
      const role = peopleById.get(source.submittedById)?.role ?? "";
      const submittedOn = isFiled(status) ? dayStamp(source.addedOn) : undefined;
      const onboarded = status === "accepted" || status === "pending-decision" || status === "rejected";
      return {
        id: source.id,
        type: source.type,
        typeLabel: submissionTypeLabel(source.type),
        status,
        statusLabel: applicationStatusLabel(status),
        statusVariant: applicationStatusVariant(status),
        createdOn: dayStamp(source.addedOn),
        submittedOn,
        created: formatCaseDate(source.addedOn),
        submitted: submittedOn ? formatCaseDate(submittedOn) : undefined,
        createdShort: shortDate(source.addedOn),
        submittedShort: submittedOn ? shortDate(submittedOn) : undefined,
        filedById: source.submittedById,
        filedBy: displayName(submittedByName(source, peopleById)),
        side: seededSide(role),
        /* The pack carries one identifier. Before onboarding it can only be the
           temporary one; once the court has the application, it is its number. */
        temporaryId: !onboarded ? (source.submissionId ?? undefined) : undefined,
        applicationNumber: onboarded ? (source.submissionId ?? undefined) : undefined,
        linkedOrder: source.linkedOrder ?? undefined,
        documents: source.documents.map((doc) => ({
          label: doc.label,
          src: submissionDocumentSrc(doc),
        })),
        source,
      };
    });
  return {
    rows,
    people: file.people.map((person) => ({
      id: person.id,
      name: displayName(person.name),
      role: person.role,
    })),
  };
}

export function liveRecord(
  app: LifecycleApplication,
  all: LifecycleApplication[] = [],
): ApplicationRecord {
  const objection = app.objectionId
    ? all.find((item) => item.id === app.objectionId)
    : undefined;
  const objectionTo = app.objectionToId
    ? all.find((item) => item.id === app.objectionToId)
    : undefined;
  return {
    id: app.id,
    type: app.type,
    typeLabel: app.typeLabel,
    status: app.status,
    statusLabel: applicationStatusLabel(app.status),
    statusVariant: applicationStatusVariant(app.status),
    createdOn: app.createdOn,
    submittedOn: app.submittedOn,
    created: formatCaseDate(app.createdOn),
    submitted: app.submittedOn ? formatCaseDate(app.submittedOn) : undefined,
    onboarded: app.onboardedOn ? formatCaseDate(app.onboardedOn) : undefined,
    createdShort: shortDate(app.createdOn),
    submittedShort: app.submittedOn ? shortDate(app.submittedOn) : undefined,
    filedById: `live-${app.side}-${app.createdBy}`,
    filedBy: displayName(app.raisedBy ?? app.createdByName),
    onBehalfOf: app.onBehalfOf,
    side: app.side,
    temporaryId: app.temporaryId,
    applicationNumber: app.applicationNumber,
    linkedOrder: app.linkedOrder
      ? {
          id: app.linkedOrder.id,
          label: `Order dated ${formatCaseDate(app.linkedOrder.signedOn)}`,
          text: app.linkedOrder.text,
        }
      : undefined,
    objection: objection
      ? {
          id: objection.id,
          label: objection.temporaryId ?? "Objection",
          status: objection.status,
        }
      : undefined,
    objectionTo: objectionTo
      ? {
          id: objectionTo.id,
          label: `${objectionTo.typeLabel}${
            objectionTo.applicationNumber ? ` (${objectionTo.applicationNumber})` : ""
          }`,
        }
      : undefined,
    objectionsInvited: app.objectionsInvited,
    objectionDueBy: app.objectionDueBy
      ? formatCaseDate(app.objectionDueBy)
      : undefined,
    decisionOn: app.decide ? formatCaseDate(app.decide.dueOn) : undefined,
    workflowResult: app.workflowResult?.replace(/\d{4}-\d{2}-\d{2}/g, (day) =>
      formatCaseDate(day),
    ),
    documents: app.documents.map((label) => ({ label })),
    live: app,
  };
}

/** Seeded rows have no lifecycle record, so visibility reads their status and side. */
function seededVisible(row: ApplicationRecord, seat: FilerSeat): boolean {
  if (row.side === "court") return true;
  return visibleToSeat(
    {
      side: row.side,
      status: row.status,
      type: row.type,
      onboardedOn: row.applicationNumber ? row.createdOn : undefined,
    } as LifecycleApplication,
    seat,
  );
}

/**
 * Sorted by submitted date, newest first, falling back to the created date for
 * filings not yet submitted (working guess for APP-08).
 */
export function applicationsRegister(
  record: CaseRecord,
  live: LifecycleApplication[],
  seat: FilerSeat,
): ApplicationsRegister {
  const seeded = seededRecords(record);
  const mine = live.filter((app) => app.caseId === record.id);
  const liveRows = mine
    .filter((app) => visibleToSeat(app, seat))
    .map((app) => liveRecord(app, mine));
  const applications = [
    ...seeded.rows.filter((row) => seededVisible(row, seat)),
    ...liveRows,
  ].sort((a, b) =>
    (b.submittedOn ?? b.createdOn).localeCompare(a.submittedOn ?? a.createdOn),
  );
  const objectionTasks = mine
    .filter((app) => app.side !== seat.side && objectionTaskOpen(app))
    .filter(() => canCreate(seat))
    .map((app) => liveRecord(app, mine));
  const people = [...seeded.people];
  for (const row of liveRows) {
    if (!people.some((person) => person.id === row.filedById)) {
      people.push({
        id: row.filedById,
        name: row.filedBy,
        role: `${sideLabel(row.side as Side)} side`,
      });
    }
  }
  return { applications, people, objectionTasks };
}

/**
 * What still needs a step from this seat. Only the filing side's own work, and only
 * the steps this seat can take: a clerk's draft waiting on the advocate's signature is
 * the advocate's to-do, not the clerk's (`ALC-01`, "Users and actions").
 */
export function needsActionFrom(
  row: ApplicationRecord,
  seat: FilerSeat,
): boolean {
  if (row.side !== seat.side || !needsAttention(row.status)) return false;
  if (row.status === "draft") return canCreate(seat);
  if (row.status === "pending-signature") return canSign(seat);
  if (row.status === "pending-payment") return canPay(seat);
  return false;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type ActionEntry =
  | { kind: "single"; key: string; application: ApplicationRecord }
  | {
      kind: "group";
      key: string;
      status: ApplicationStatus;
      filedBy: string;
      applications: ApplicationRecord[];
    };

/**
 * Two or more applications waiting on the same step from the same filer
 * collapse into one entry with one action (APP-09). Drafts never group: each
 * is continued in its own form.
 */
export function groupActions(
  rows: ApplicationRecord[],
  seat: FilerSeat,
): ActionEntry[] {
  const buckets = new Map<string, ApplicationRecord[]>();
  for (const row of rows) {
    if (!needsActionFrom(row, seat)) continue;
    const key = `${row.status}-${row.filedById}`;
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  }
  const entries: ActionEntry[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length > 1 && bucket[0].status !== "draft") {
      entries.push({
        kind: "group",
        key,
        status: bucket[0].status,
        filedBy: bucket[0].filedBy,
        applications: bucket,
      });
    } else {
      for (const application of bucket) {
        entries.push({ kind: "single", key: application.id, application });
      }
    }
  }
  return entries;
}
