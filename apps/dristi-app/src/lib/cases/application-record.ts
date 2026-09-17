import {
  applicationsFile,
  filingStatusLabel,
  filingStatusVariant,
  needsAttention,
  submissionDocumentSrc,
  submissionTypeLabel,
  submittedByName,
  APPLICATION_TYPES,
  SUBMISSION_DOCUMENT_TYPES,
  type FilingStatus,
  type Submission,
} from "./applications";
import { dayStamp } from "./peek";
import { formatCaseDate, type CaseRecord } from "./types";

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
 * An application as the PRD records it (§9.4, APP-12 to APP-20). The register,
 * the "needs your action" list and the record dialog all read this one shape.
 * `source` stays attached because the signing and payment dialogs still take
 * the underlying filing.
 */
export type ApplicationRecord = {
  id: string;
  /** One flat catalogue; see `APPLICATION_TYPE_OPTIONS`. */
  type: string;
  typeLabel: string;
  status: FilingStatus;
  statusLabel: string;
  statusVariant: ReturnType<typeof filingStatusVariant>;
  needsAction: boolean;
  /** ISO days; `submittedOn` is absent until the filing is submitted. */
  createdOn: string;
  submittedOn?: string;
  created: string;
  submitted?: string;
  /** "8 Sep 2025", for the register, which sets two dates side by side. */
  createdShort: string;
  submittedShort?: string;
  filedById: string;
  filedBy: string;
  side: ApplicationSide;
  /** The registry's identifier, once allotted. */
  applicationId?: string;
  linkedOrder?: { id: string; label: string };
  documents: { label: string; src?: string }[];
  source: Submission;
};

/** Whether the viewer has set up the bulk signing tool (APP-10). A working
 *  stand-in until product says how the screen learns this. */
export const HAS_BULK_SIGNING_TOOL = true;

/** The two catalogues as one list. Each had its own "Others"; one survives. */
const OTHERS = "others";
function flatType(id: string): string {
  return id === "application-others" || id === "document-others" ? OTHERS : id;
}

export const APPLICATION_TYPE_OPTIONS: { value: string; label: string }[] = [
  ...[...APPLICATION_TYPES, ...SUBMISSION_DOCUMENT_TYPES]
    .filter((item) => flatType(item.id) !== OTHERS)
    .map((item) => ({ value: item.id as string, label: item.label }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  { value: OTHERS, label: "Others" },
];

export type ApplicationPerson = { id: string; name: string; role: string };

export type ApplicationsRegister = {
  applications: ApplicationRecord[];
  /** Everyone on the case, for the Filed by filter (APP-03). */
  people: ApplicationPerson[];
};

/**
 * Everything in this section is an application, one kind (§9). The prototype
 * pack still tags some filings as document submissions (affidavits, memos,
 * objections); they are folded in as application types rather than dropped.
 * Whether those types belong here or only under Documents is open with
 * product. Sorted by submitted date, newest first, falling back to the
 * created date for filings not yet submitted (working guess for APP-08).
 */
export function applicationsRegister(
  record: CaseRecord,
  overrides: ReadonlyMap<string, FilingStatus> = new Map()
): ApplicationsRegister {
  const file = applicationsFile(record);
  const peopleById = new Map(file.people.map((person) => [person.id, person]));

  const applications = file.submissions
    .map((original): ApplicationRecord => {
      const status = overrides.get(original.id) ?? original.status;
      const source = { ...original, status };
      const role =
        peopleById.get(source.submittedById)?.role.toLowerCase() ?? "";
      const submittedOn = submittedDay(source);
      return {
        id: source.id,
        type: flatType(source.type),
        typeLabel: submissionTypeLabel(source.type),
        status,
        statusLabel: filingStatusLabel(status),
        statusVariant: filingStatusVariant(status),
        needsAction: needsAttention(status),
        createdOn: dayStamp(source.addedOn),
        submittedOn,
        created: formatCaseDate(source.addedOn),
        submitted: submittedOn ? formatCaseDate(submittedOn) : undefined,
        createdShort: shortDate(source.addedOn),
        submittedShort: submittedOn ? shortDate(submittedOn) : undefined,
        filedById: source.submittedById,
        filedBy: submittedByName(source, peopleById),
        side: role.includes("accused")
          ? "accused"
          : role.includes("complainant")
            ? "complainant"
            : "court",
        applicationId: source.submissionId ?? undefined,
        linkedOrder: source.linkedOrder ?? undefined,
        documents: source.documents.map((doc) => ({
          label: doc.label,
          src: submissionDocumentSrc(doc),
        })),
        source,
      };
    })
    .sort((a, b) =>
      (b.submittedOn ?? b.createdOn).localeCompare(a.submittedOn ?? a.createdOn)
    );

  return {
    applications,
    people: file.people.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
    })),
  };
}

/** The pack carries one date. A filing that went through was submitted the
 *  day it was added; one still waiting on its filer has not been. */
function submittedDay(submission: Submission): string | undefined {
  if (submission.status === "completed" || submission.status === "rejected") {
    return dayStamp(submission.addedOn);
  }
  return undefined;
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
      status: FilingStatus;
      filedBy: string;
      applications: ApplicationRecord[];
    };

/**
 * Two or more applications waiting on the same step from the same filer
 * collapse into one entry with one action (APP-09). Drafts never group: each
 * is continued in its own form.
 */
export function groupActions(rows: ApplicationRecord[]): ActionEntry[] {
  const buckets = new Map<string, ApplicationRecord[]>();
  for (const row of rows) {
    if (!row.needsAction) continue;
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
