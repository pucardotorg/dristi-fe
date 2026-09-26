/**
 * Applications — the case register of submission containers: structured
 * applications and document submissions. Filing status is the electronic
 * workflow; court result exists only when an order is linked. The list
 * carries the scannable facts; the outcome and the filed packet live on the
 * record.
 *
 * Featured dummy content comes from `applications-dummy.json`. Labels
 * follow Laws sentence case.
 */
import pack from "./applications-dummy.json";
import { counselFor, type CaseRecord, type Parties } from "./types";

export type SubmissionKind = "application" | "document";

export type FilingStatus =
  | "draft"
  | "pending-signature"
  | "pending-payment"
  | "completed"
  | "rejected"
  | "expired";

export type ApplicationTypeId =
  | "absent-application"
  | "advancement-reschedule"
  | "bail"
  | "condonation-of-delay"
  | "production-of-documents"
  | "reopen-evidence"
  | "settlement"
  | "transfer"
  | "warrant-by-hand"
  | "warrant-recall"
  | "withdrawal"
  | "application-others";

/** Submission-flow buckets — the register's document heads live in documents.ts. */
export type SubmissionDocumentTypeId =
  | "affidavits"
  | "memos"
  | "objections"
  | "document-others";

export type SubmissionTypeId = ApplicationTypeId | SubmissionDocumentTypeId;

export const SUBMISSION_KINDS: {
  id: SubmissionKind;
  label: string;
}[] = [
  { id: "application", label: "Application" },
  { id: "document", label: "Document submission" },
];

export const APPLICATION_TYPES: {
  id: ApplicationTypeId;
  label: string;
}[] = [
  { id: "absent-application", label: "Absent application" },
  { id: "advancement-reschedule", label: "Advancement/reschedule" },
  { id: "bail", label: "Bail" },
  { id: "condonation-of-delay", label: "Condonation of delay" },
  { id: "production-of-documents", label: "Production of documents" },
  { id: "reopen-evidence", label: "Reopen evidence" },
  { id: "settlement", label: "Settlement" },
  { id: "transfer", label: "Transfer" },
  { id: "warrant-by-hand", label: "Warrant by hand" },
  { id: "warrant-recall", label: "Warrant recall" },
  { id: "withdrawal", label: "Withdrawal" },
  { id: "application-others", label: "Others" },
];

/**
 * Types the picker shows as cards but whose form is not built yet. Choosing one
 * lands on a "not built" notice instead of a form: the card says what the type
 * is for; the flow behind it is still to come. Kept out of the fields switch and
 * the generate path so a card can never reach a form it does not have.
 */
export const UNBUILT_APPLICATION_TYPE_IDS: ReadonlySet<ApplicationTypeId> =
  new Set<ApplicationTypeId>([
    "absent-application",
    "reopen-evidence",
    "warrant-by-hand",
    "warrant-recall",
  ]);

export function isUnbuiltApplicationType(id: ApplicationTypeId): boolean {
  return UNBUILT_APPLICATION_TYPE_IDS.has(id);
}

/** Submission-flow buckets — the register's document heads live in documents.ts. */
export const SUBMISSION_DOCUMENT_TYPES: {
  id: SubmissionDocumentTypeId;
  label: string;
}[] = [
  { id: "affidavits", label: "Affidavits" },
  { id: "memos", label: "Memos" },
  { id: "objections", label: "Objections" },
  { id: "document-others", label: "Others" },
];

export const FILING_STATUSES: { id: FilingStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "pending-signature", label: "Pending signature" },
  { id: "pending-payment", label: "Pending payment" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
];

const APPLICATION_TYPE_IDS = new Set<string>(
  APPLICATION_TYPES.map((item) => item.id)
);
const SUBMISSION_DOCUMENT_TYPE_IDS = new Set<string>(
  SUBMISSION_DOCUMENT_TYPES.map((item) => item.id)
);

export function isApplicationTypeId(
  value: string
): value is ApplicationTypeId {
  return APPLICATION_TYPE_IDS.has(value);
}

export function isSubmissionDocumentTypeId(
  value: string
): value is SubmissionDocumentTypeId {
  return SUBMISSION_DOCUMENT_TYPE_IDS.has(value);
}

export function isSubmissionTypeId(value: string): value is SubmissionTypeId {
  return isApplicationTypeId(value) || isSubmissionDocumentTypeId(value);
}

export function isFilingStatus(value: string): value is FilingStatus {
  return FILING_STATUSES.some((item) => item.id === value);
}

export function submissionKindLabel(kind: SubmissionKind): string {
  return SUBMISSION_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

export function submissionTypeLabel(id: SubmissionTypeId): string {
  const fromApplication = APPLICATION_TYPES.find((item) => item.id === id);
  if (fromApplication) return fromApplication.label;
  return SUBMISSION_DOCUMENT_TYPES.find((item) => item.id === id)?.label ?? id;
}

export function filingStatusLabel(status: FilingStatus): string {
  return FILING_STATUSES.find((item) => item.id === status)?.label ?? status;
}

/**
 * Filing-workflow colour — not court outcome, so no status here takes a
 * solid. Amber stays reserved for the three statuses that still need a step
 * from you, which is what pins them to Needs attention. Completed is outline
 * so it cannot be read as Allowed; Expired takes the neutral fill — terminal
 * like Completed, distinct from it at a glance, and never a defect the way
 * destructive Rejected is (Colors: three treatments per status, no neutral
 * status family; Laws: pair colour with the words).
 */
export function filingStatusVariant(
  status: FilingStatus
): "warning" | "destructive" | "secondary" | "success" {
  if (status === "rejected") return "destructive";
  if (status === "expired") return "secondary";
  /* Success tint, matching the Documents register — the two tables sit two
     tabs apart and a Completed that is green in one and grey in the other
     reads as two different states (Aug 31 round). */
  if (status === "completed") return "success";
  return "warning";
}

export function nextStepCopy(status: FilingStatus): string | null {
  switch (status) {
    case "draft":
      return "Continue draft";
    case "pending-signature":
      return "Add signature";
    case "pending-payment":
      return "Complete payment";
    default:
      return null;
  }
}

export function filingActionLabel(status: FilingStatus): string {
  return nextStepCopy(status) ?? "View application";
}

/** Filings that still need a step from you — pin these above the register. */
export function needsAttention(status: FilingStatus): boolean {
  return nextStepCopy(status) !== null;
}

export type BatchAction = {
  /** Group header — the ask in words, since the chip alone cannot say it. */
  title: (count: number) => string;
  /** The one CTA that stands in for the whole group. */
  cta: string;
  /** Heading of the confirm step, which names what the batch covers. */
  confirm: (count: number) => string;
};

/**
 * The steps that can be taken for several filings in one go. Signature is the
 * only one for now: one signing session covers a set.
 *
 * Payment is deliberately out until a filing carries its fee — a single
 * "Complete payments" over two filings that cannot state a total asks for
 * money without saying how much. Draft is out for a different reason: a draft
 * is resumed one at a time, so one "continue" over three of them would
 * promise something the flow cannot do. Both keep their own card until then.
 */
const BATCH_ACTIONS: Partial<Record<FilingStatus, BatchAction>> = {
  "pending-signature": {
    title: (count) =>
      count === 1
        ? "1 application needs a signature"
        : `${count} applications need a signature`,
    cta: "Add signatures",
    confirm: (count) =>
      count === 1 ? "Add signature" : `Add signatures to ${count} applications`,
  },
};

export function batchAction(status: FilingStatus): BatchAction | null {
  return BATCH_ACTIONS[status] ?? null;
}

export type AttentionEntry =
  | { kind: "single"; key: string; submission: Submission }
  | {
      kind: "group";
      key: string;
      status: FilingStatus;
      submittedById: string;
      submissions: Submission[];
    };

export type AttentionGroupEntry = Extract<AttentionEntry, { kind: "group" }>;

function attentionEntryDate(entry: AttentionEntry): string {
  return entry.kind === "single"
    ? entry.submission.addedOn
    : entry.submissions[0].addedOn;
}

/**
 * Two or more filings waiting on the same step from the same filer collapse
 * into one entry with one CTA — three "Add signature" cards are three copies
 * of one job. Grouping is per filer because you cannot sign or pay for
 * someone else's filing, and a filing left alone in its bucket keeps its own
 * card. Order stays the well's newest-first, a group taking the date of its
 * newest member. Expects `rows` already sorted newest-first.
 */
export function groupAttention(rows: Submission[]): AttentionEntry[] {
  const buckets = new Map<string, Submission[]>();
  for (const submission of rows) {
    if (!batchAction(submission.status)) continue;
    const key = `${submission.status}-${submission.submittedById}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(submission);
    else buckets.set(key, [submission]);
  }

  const entries: AttentionEntry[] = [];
  const grouped = new Set<string>();
  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    for (const submission of bucket) grouped.add(submission.id);
    entries.push({
      kind: "group",
      key,
      status: bucket[0].status,
      submittedById: bucket[0].submittedById,
      submissions: bucket,
    });
  }
  for (const submission of rows) {
    if (grouped.has(submission.id)) continue;
    entries.push({ kind: "single", key: submission.id, submission });
  }

  return entries.sort((a, b) => {
    const byDate = attentionEntryDate(b).localeCompare(attentionEntryDate(a));
    return byDate !== 0 ? byDate : a.key.localeCompare(b.key);
  });
}

export type SubmissionPerson = {
  id: string;
  name: string;
  role: string;
  filterLabel: string;
};

export type SubmissionDocument = {
  label: string;
  href?: string;
  page?: number;
};

export type LinkedOrder = {
  id: string;
  label: string;
};

export type Submission = {
  id: string;
  kind: SubmissionKind;
  type: SubmissionTypeId;
  title: string;
  status: FilingStatus;
  addedOn: string;
  submittedById: string;
  /** Registry or filing ID once allotted. */
  submissionId: string | null;
  /**
   * The prayer in plain words — what the filer asked the court to do. Only
   * applications ask for something, so document submissions carry null.
   *
   * Deliberately not rendered in the record dialog: the filed PDF sits on
   * that same screen and *is* the application, and a plain-language
   * paraphrase placed above the operative text invites reliance on the
   * paraphrase. Kept because two "Advancement/reschedule" rows are currently
   * indistinguishable in the register — this is the candidate secondary line
   * for the table row. Not dead data; do not re-add it to the dialog.
   */
  request: string | null;
  courtResult: string | null;
  linkedOrder: LinkedOrder | null;
  defects: string[];
  documents: SubmissionDocument[];
};

export type ApplicationsFile = {
  /** Needed to link a record out to the section that holds the order. */
  caseId: string;
  caseNumber: string;
  parties: Parties;
  court: string;
  people: SubmissionPerson[];
  submissions: Submission[];
};

export function personIdentity(person: SubmissionPerson): string {
  const [left] = person.filterLabel.split(" — ");
  return left?.trim() || person.name;
}

export function submittedByName(
  submission: Submission,
  peopleById: Map<string, SubmissionPerson>
): string {
  const person = peopleById.get(submission.submittedById);
  return person ? personIdentity(person) : submission.submittedById;
}

/**
 * Table shows the party side as plain text. Who signed it and on whose
 * behalf is the record's job, not a hover. Accused is matched first so
 * "Accused counsel" is not read as complainant.
 */
export function submittedBySideLabel(
  submission: Submission,
  peopleById: Map<string, SubmissionPerson>
): string {
  const role =
    peopleById.get(submission.submittedById)?.role.toLowerCase() ?? "";
  if (role.includes("accused")) return "Accused";
  if (role.includes("complainant")) return "Complainant";
  return submittedByName(submission, peopleById);
}

export function submittedByOnBehalf(
  submission: Submission,
  peopleById: Map<string, SubmissionPerson>,
  parties: Parties
): string {
  const name = submittedByName(submission, peopleById);
  const side = submittedBySideLabel(submission, peopleById);
  if (side === "Complainant") {
    return `${name} on behalf of ${parties.complainant}`;
  }
  if (side === "Accused") {
    return `${name} on behalf of ${parties.accused}`;
  }
  return name;
}

export function submissionDocumentSrc(
  doc: SubmissionDocument
): string | undefined {
  if (!doc.href) return undefined;
  return doc.page ? `${doc.href}#page=${doc.page}` : doc.href;
}

export function hasSubmissionDocument(submission: Submission): boolean {
  return submission.documents.some((doc) => Boolean(doc.href));
}

function kindFromPack(value: string): SubmissionKind {
  const normalized = value.trim().toLowerCase();
  if (normalized === "application") return "application";
  if (normalized === "document submission") return "document";
  throw new Error(`Unknown submission kind in dummy pack: ${value}`);
}

function typeFromPack(kind: SubmissionKind, label: string): SubmissionTypeId {
  const normalized = label.trim().toLowerCase();
  const catalogue =
    kind === "application" ? APPLICATION_TYPES : SUBMISSION_DOCUMENT_TYPES;
  const match = catalogue.find(
    (item) => item.label.toLowerCase() === normalized
  );
  if (!match) {
    throw new Error(`Unknown ${kind} type in dummy pack: ${label}`);
  }
  return match.id;
}

function statusFromPack(value: string): FilingStatus {
  const normalized = value.trim().toLowerCase();
  const match = FILING_STATUSES.find(
    (item) => item.label.toLowerCase() === normalized
  );
  if (!match) {
    throw new Error(`Unknown filing status in dummy pack: ${value}`);
  }
  return match.id;
}

function featuredPeople(): SubmissionPerson[] {
  return pack.people.map((item) => {
    const [left, role] = item.label.split(" — ");
    const name = left.split(",")[0]?.trim() ?? left;
    return {
      id: item.id,
      name,
      role: role ?? "",
      filterLabel: item.label,
    };
  });
}

/**
 * A pack row from either register — the featured case's `submissions` or an
 * `extraCases` entry. Spelled out rather than inferred off the JSON because
 * the two sources carry different optional fields and both must go through
 * the same throwing validators.
 */
type PackSubmissionRow = {
  id: string;
  kind: string;
  type: string;
  title: string;
  status: string;
  addedOn: string;
  submittedById: string;
  submissionId: string | null;
  request: string | null;
  courtResult: string | null;
  linkedOrder: LinkedOrder | null;
  defects: string[];
  documents: { label: string; href?: string; page?: number }[];
};

function submissionFromPack(row: PackSubmissionRow): Submission {
  const kind = kindFromPack(row.kind);
  const type = typeFromPack(kind, row.type);
  return {
    id: row.id,
    kind,
    type,
    title: row.title.trim() || submissionTypeLabel(type),
    status: statusFromPack(row.status),
    addedOn: row.addedOn,
    submittedById: row.submittedById,
    submissionId: row.submissionId,
    request: row.request,
    courtResult: row.courtResult,
    linkedOrder: row.linkedOrder,
    defects: row.defects,
    documents: row.documents.map((doc) => ({
      label: doc.label,
      href: doc.href,
      page: doc.page,
    })),
  };
}

function featuredFile(record: CaseRecord): ApplicationsFile {
  return {
    caseId: record.id,
    caseNumber: record.caseNumber,
    parties: record.parties,
    court: pack.case.court,
    people: featuredPeople(),
    submissions: (pack.submissions as PackSubmissionRow[]).map(
      submissionFromPack
    ),
  };
}

/**
 * Registers for the non-featured cases, keyed by fixture id. Rows name
 * people by the generated ids `peopleFrom` produces (`<case>-complainant`,
 * `<case>-counsel-c-0`, …), so populating a case here needs no people
 * authoring — the fixture's cause title and counsel stay the one source.
 */
const EXTRA_PACKS = pack.extraCases as Record<
  string,
  PackSubmissionRow[] | undefined
>;

function peopleFrom(record: CaseRecord): SubmissionPerson[] {
  const people: SubmissionPerson[] = [
    {
      id: `${record.id}-complainant`,
      name: record.parties.complainant,
      role: "Complainant",
      filterLabel: `${record.parties.complainant} — Complainant`,
    },
    {
      id: `${record.id}-accused`,
      name: record.parties.accused,
      role: "Accused",
      filterLabel: `${record.parties.accused} — Accused`,
    },
  ];

  counselFor(record, "complainant").forEach((name, index) => {
    people.push({
      id: `${record.id}-counsel-c-${index}`,
      name,
      role: "Complainant counsel",
      filterLabel: `${name} — Complainant counsel`,
    });
  });
  counselFor(record, "accused").forEach((name, index) => {
    people.push({
      id: `${record.id}-counsel-a-${index}`,
      name,
      role: "Accused counsel",
      filterLabel: `${name} — Accused counsel`,
    });
  });

  return people;
}

const FEATURED_CASE_ID = "c-1001";

export function applicationsFile(record: CaseRecord): ApplicationsFile {
  if (record.id === FEATURED_CASE_ID) return featuredFile(record);
  return {
    caseId: record.id,
    caseNumber: record.caseNumber,
    parties: record.parties,
    court: record.court,
    people: peopleFrom(record),
    submissions: (EXTRA_PACKS[record.id] ?? []).map(submissionFromPack),
  };
}

/**
 * Where a draft resumes. Applications reopen in the Raise application form
 * with the draft named in the URL; document submissions have their own flow
 * and no per-draft resume, so they get the flow itself.
 *
 * Anything that is not a draft has no form to go back to — it has been filed
 * — and belongs on the record instead, which is what the null tells callers.
 */
export function resumeDraftHref(
  caseId: string,
  submission: Submission
): string | null {
  if (submission.status !== "draft") return null;
  const base = `/cases/${caseId}/filings`;
  return submission.kind === "application"
    ? `${base}/application?draft=${encodeURIComponent(submission.id)}`
    : `${base}/documents`;
}

/**
 * The draft named by ?draft=. A stale or hand-edited id resolves to null and
 * the flow simply starts fresh at the type picker — a filing screen should
 * not 404 over a query parameter.
 */
export function findDraftSubmission(
  file: ApplicationsFile,
  id: string | undefined
): Submission | null {
  if (!id) return null;
  const match = file.submissions.find((item) => item.id === id);
  return match && match.status === "draft" ? match : null;
}

export const APPLICATIONS_PAGE_SIZES = [10, 20, 30, 40, 50] as const;
export type ApplicationsPageSize = (typeof APPLICATIONS_PAGE_SIZES)[number];
export const APPLICATIONS_PAGE_SIZE: ApplicationsPageSize = 10;

export function isApplicationsPageSize(
  value: number
): value is ApplicationsPageSize {
  return (APPLICATIONS_PAGE_SIZES as readonly number[]).includes(value);
}

export type ApplicationsSelection = {
  attention: Submission[];
  rows: Submission[];
  total: number;
  page: number;
  pageCount: number;
  from: number;
  to: number;
};

function sortSubmissions(list: Submission[]): Submission[] {
  return [...list].sort((a, b) => {
    const byDate = b.addedOn.localeCompare(a.addedOn);
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });
}

export function selectApplications(options: {
  submissions: Submission[];
  submittedById: string | null;
  typeId: SubmissionTypeId | null;
  status: FilingStatus | null;
  /** Case-insensitive submission-id fragment; empty/whitespace = no search. */
  submissionQuery?: string;
  pageSize: ApplicationsPageSize;
  page: number;
}): ApplicationsSelection {
  const query = options.submissionQuery?.trim().toLowerCase() ?? "";
  const matched = options.submissions.filter((submission) => {
    if (
      options.submittedById &&
      submission.submittedById !== options.submittedById
    ) {
      return false;
    }
    if (options.typeId && submission.type !== options.typeId) return false;
    if (options.status && submission.status !== options.status) return false;
    // Drafts and unsigned filings have no submission id yet, so an id search
    // rightly excludes them.
    if (
      query &&
      !(submission.submissionId ?? "").toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });

  const attention = sortSubmissions(
    matched.filter((item) => needsAttention(item.status))
  );
  const rest = sortSubmissions(
    matched.filter((item) => !needsAttention(item.status))
  );

  const pageSize = options.pageSize;
  const pageCount = Math.max(1, Math.ceil(rest.length / pageSize));
  const page = Math.min(options.page, pageCount);
  const start = (page - 1) * pageSize;
  const rows = rest.slice(start, start + pageSize);

  return {
    attention,
    rows,
    total: rest.length,
    page,
    pageCount,
    from: rest.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}

export function applicationPageWindow(
  page: number,
  pageCount: number
): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const visible = [...pages]
    .filter((entry) => entry >= 1 && entry <= pageCount)
    .sort((a, b) => a - b);

  return visible.flatMap((entry, index) =>
    index > 0 && entry - visible[index - 1] > 1
      ? ["gap" as const, entry]
      : [entry]
  );
}
