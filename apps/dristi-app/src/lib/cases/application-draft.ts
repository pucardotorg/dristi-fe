/**
 * The Raise application draft — one shape covering all eight application
 * types, plus the validation each type actually needs.
 *
 * Fields and their mandatory markers come from a read-only QA review of the
 * Kerala portal shared by product — not from a document in this repo, so the
 * rules below are the only record of it. Where that review found a field
 * present but could not confirm whether the server requires it, the note on
 * the rule says so; those are the rules to relax first when the backend
 * contract lands.
 *
 * One draft holds every type's fields rather than one per type, so switching
 * type to compare forms never destroys what was already typed. Only the
 * selected type is validated, reviewed and filed.
 */
import { EMPTY_RICH_TEXT, type RichTextValue } from "@/components/cases/rich-text-field";
import {
  isApplicationTypeId,
  submissionTypeLabel,
  type ApplicationTypeId,
  type Submission,
} from "./applications";
import { CASES } from "./fixtures";

/** The portal caps the party's proposed availability at five dates. */
export const MAX_AVAILABILITY_DATES = 5;

export type YesNo = "yes" | "no";

export type SuretyDraft = {
  id: string;
  fullName: string;
  fatherName: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  pincode: string;
  district: string;
  state: string;
  identityProof: File[];
  solvencyProof: File[];
  otherDocuments: File[];
};

/** Condonation's supporting documents and Production's submission documents. */
export type DocumentRowDraft = {
  id: string;
  type: string;
  title: string;
  files: File[];
};

export type ApplicationDraft = {
  type: ApplicationTypeId | "";
  /**
   * The side it is raised for, set from who is filing (never typed). Names
   * the litigant on the form and in the generated document; empty falls
   * back to the old rule (bail for the accused, the rest for the
   * complainant).
   */
  filedForSide: "" | "complainant" | "accused";

  /** Shared by Production, Settlement, Transfer and Withdrawal. */
  referenceOrderId: string;
  applicationDate: Date | undefined;
  comments: RichTextValue;

  /**
   * Advance (prepone) and Postpone: one form for both (PRD). The reason is a
   * pick from a list and the date is one day from which the hearing can be
   * held. `availabilityDates` is the earlier form's up-to-five dates, kept so
   * nothing typed into an old draft is lost, and no longer asked for.
   */
  availabilityDates: Date[];
  rescheduleReason: string;
  rescheduleFrom: Date | undefined;
  partiesAgreed: YesNo;
  /** The filer's own words on the reason; optional beside the pick. */
  requestReason: string;
  supportingFiles: File[];

  /** Bail. */
  petitionerFather: string;
  bailGrounds: RichTextValue;
  addSureties: YesNo;
  sureties: SuretyDraft[];

  /** Condonation of delay. */
  delayDays: string;
  delayReason: RichTextValue;
  additionalInformation: RichTextValue;
  supportingDocuments: DocumentRowDraft[];

  /** Others. Each document carries its type and title (PRD "Generic"). */
  title: string;
  details: RichTextValue;
  otherDocuments: DocumentRowDraft[];

  /** Production of documents. */
  submissionDocuments: DocumentRowDraft[];
  applicationReason: RichTextValue;

  /** Transfer. */
  requestedCourt: string;
  transferGrounds: string;

  /** Withdrawal: a reason picked from a list (PRD), then the filer's own words. */
  withdrawalReasonCode: string;
  withdrawalReason: RichTextValue;

  /**
   * Objection (Application Lifecycle PRD, ALC-12). The PRD specifies no
   * fields yet; these are the least an objection needs: what it objects to
   * (fixed by the File objection task, never chosen here), the grounds, and
   * anything relied on. WORKING GUESS, flagged for the PM.
   */
  objectionToId: string;
  objectionGrounds: RichTextValue;
  objectionDocuments: DocumentRowDraft[];
};

type ScalarErrors = Partial<Record<keyof ApplicationDraft, string>>;
type RowErrors = Record<string, string | undefined>;

export type ApplicationErrors = {
  fields: ScalarErrors;
  sureties: Record<string, RowErrors>;
  documentRows: Record<string, RowErrors>;
};

export const EMPTY_APPLICATION_ERRORS: ApplicationErrors = {
  fields: {},
  sureties: {},
  documentRows: {},
};

export const EMPTY_APPLICATION_DRAFT: ApplicationDraft = {
  type: "",
  filedForSide: "",
  referenceOrderId: "",
  applicationDate: undefined,
  comments: EMPTY_RICH_TEXT,
  availabilityDates: [],
  rescheduleReason: "",
  rescheduleFrom: undefined,
  partiesAgreed: "yes",
  requestReason: "",
  supportingFiles: [],
  petitionerFather: "",
  bailGrounds: EMPTY_RICH_TEXT,
  addSureties: "yes",
  sureties: [],
  delayDays: "",
  delayReason: EMPTY_RICH_TEXT,
  additionalInformation: EMPTY_RICH_TEXT,
  supportingDocuments: [],
  title: "",
  details: EMPTY_RICH_TEXT,
  otherDocuments: [],
  submissionDocuments: [],
  applicationReason: EMPTY_RICH_TEXT,
  requestedCourt: "",
  transferGrounds: "",
  withdrawalReasonCode: "",
  withdrawalReason: EMPTY_RICH_TEXT,
  objectionToId: "",
  objectionGrounds: EMPTY_RICH_TEXT,
  objectionDocuments: [],
};

export function emptySurety(): SuretyDraft {
  return {
    id: `surety-${crypto.randomUUID()}`,
    fullName: "",
    fatherName: "",
    phone: "",
    email: "",
    addressLine1: "",
    city: "",
    pincode: "",
    district: "",
    state: "",
    identityProof: [],
    solvencyProof: [],
    otherDocuments: [],
  };
}

/**
 * Why a hearing should move. The PRD asks for a single-select reason and
 * gives no list: WORKING GUESS, flagged for the PM. The same list serves
 * both directions, as the PRD's fields do.
 */
export const RESCHEDULE_REASONS = [
  "A party or witness cannot attend",
  "Counsel is engaged in another court",
  "Illness",
  "The parties are negotiating a settlement",
  "Other",
] as const;

/**
 * Why the complainant withdraws the case. Single select per the PRD, which
 * gives no list: WORKING GUESS, flagged for the PM.
 */
export const WITHDRAWAL_REASONS = [
  "The accused has paid the amount",
  "The parties have settled",
  "The complainant does not wish to proceed",
  "Other",
] as const;

export function emptyDocumentRow(): DocumentRowDraft {
  return { id: `doc-${crypto.randomUUID()}`, type: "", title: "", files: [] };
}

/**
 * Courts a case can be asked to move to — the real courts this deployment
 * already knows about, minus the one hearing the case. A hand-written list
 * would be inventing court names.
 */
export function transferCourtOptions(currentCourt: string): string[] {
  return [...new Set(CASES.map((record) => record.court))]
    .filter((court) => court !== currentCourt)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * A saved draft, reopened as the form that wrote it.
 *
 * The register keeps a draft as a Submission — which type it is and the
 * prayer in the filer's own words — not as a field-by-field snapshot of the
 * form. So resuming restores the two things that survive that shape: the
 * type, and the ask already written. Everything else the type needs is still
 * blank, which is precisely what makes the draft unfinished.
 *
 * The ask does not land in the same field for every type. Each form carries
 * it in the field that *is* the ask — Settlement in Comments, Bail in
 * Grounds, Withdrawal in Reason — so the mapping is per type rather than one
 * shared "notes" box that none of the eight forms actually has.
 */
/** Others' title rule, shared so seeding cannot disagree with validation. */
const TITLE_PATTERN = /^[\p{L}\p{N} ]+$/u;

export function applicationDraftFrom(submission: Submission): ApplicationDraft {
  // A document submission has no application form to resume into, and the
  // caller routes it elsewhere; returning the empty draft keeps this total.
  if (
    submission.kind !== "application" ||
    !isApplicationTypeId(submission.type)
  ) {
    return EMPTY_APPLICATION_DRAFT;
  }

  const type = submission.type;
  const draft: ApplicationDraft = {
    ...EMPTY_APPLICATION_DRAFT,
    type,
    objectionToId: submission.objectionToId ?? "",
  };
  const ask = submission.request?.trim() ?? "";
  if (!ask) return draft;

  const rich: RichTextValue = { html: richTextFromPlain(ask), text: ask };

  switch (type) {
    case "advancement-reschedule":
    case "postpone":
      draft.requestReason = ask;
      break;
    case "bail":
      draft.bailGrounds = rich;
      break;
    case "condonation-of-delay":
      draft.delayReason = rich;
      break;
    case "production-of-documents":
      draft.applicationReason = rich;
      break;
    case "settlement":
      draft.comments = rich;
      break;
    case "transfer":
      draft.transferGrounds = ask;
      break;
    case "withdrawal":
      draft.withdrawalReason = rich;
      break;
    case "objection":
      draft.objectionGrounds = rich;
      break;
    case "application-others": {
      draft.details = rich;
      // Others is the one type that also names itself. A row that was never
      // titled carries the type label, which is not a title; and the field
      // rejects punctuation, so a title that could only fail validation is
      // left blank for the filer rather than seeded pre-broken.
      const title = submission.title.trim();
      if (
        title &&
        title !== submissionTypeLabel(type) &&
        TITLE_PATTERN.test(title)
      ) {
        draft.title = title;
      }
      break;
    }
  }

  return draft;
}

/**
 * The editor renders `html` through dangerouslySetInnerHTML, so stored plain
 * text is escaped rather than trusted — fixture copy today, a server's copy
 * tomorrow, and the difference should not be what keeps this safe.
 */
function richTextFromPlain(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}

export function isApplicationDirty(draft: ApplicationDraft): boolean {
  const { type, partiesAgreed, addSureties, objectionToId, filedForSide, ...rest } =
    draft;
  void partiesAgreed;
  void addSureties;
  void filedForSide;
  // Set by the File objection task, not typed: opening the form is not work.
  void objectionToId;
  return Boolean(
    type ||
      Object.values(rest).some((value) => {
        if (typeof value === "string") return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (value instanceof Date) return true;
        if (value && typeof value === "object" && "text" in value) {
          return (value as RichTextValue).text.trim().length > 0;
        }
        return false;
      })
  );
}

export function hasApplicationErrors(errors: ApplicationErrors): boolean {
  return (
    Object.values(errors.fields).some(Boolean) ||
    Object.values(errors.sureties).some((row) =>
      Object.values(row).some(Boolean)
    ) ||
    Object.values(errors.documentRows).some((row) =>
      Object.values(row).some(Boolean)
    )
  );
}

function rich(value: RichTextValue): boolean {
  return value.text.trim().length > 0;
}

/**
 * A document row exists only because someone added it, so every row is
 * validated whole — the same rule the shipped Condonation form already used.
 * Empty rows are removed, not tolerated.
 */
function validateDocumentRows(
  rows: DocumentRowDraft[],
  errors: ApplicationErrors
) {
  for (const row of rows) {
    const rowErrors: RowErrors = {};
    if (!row.type.trim()) rowErrors.type = "Enter the document type.";
    if (!row.title.trim()) rowErrors.title = "Enter the document title.";
    if (row.files.length === 0) {
      rowErrors.files = "Choose at least one file or remove this document.";
    }
    if (Object.values(rowErrors).some(Boolean)) {
      errors.documentRows[row.id] = rowErrors;
    }
  }
}

/**
 * Surety rules cover what identifies the person and what the court needs to
 * accept them — name, parentage, a reachable number, and the two proofs. The
 * QA review could not confirm field-level requirements here, so address and
 * email are checked for format when filled but never demanded.
 */
function validateSureties(sureties: SuretyDraft[], errors: ApplicationErrors) {
  for (const surety of sureties) {
    const rowErrors: RowErrors = {};
    if (!surety.fullName.trim()) rowErrors.fullName = "Enter the full name.";
    if (!surety.fatherName.trim()) {
      rowErrors.fatherName = "Enter the father's name.";
    }
    if (!surety.phone.trim()) {
      rowErrors.phone = "Enter the phone number.";
    } else if (!/^\d{10}$/.test(surety.phone.trim())) {
      rowErrors.phone = "Enter a 10-digit phone number.";
    }
    if (surety.email.trim() && !/^\S+@\S+\.\S+$/.test(surety.email.trim())) {
      rowErrors.email = "Enter a valid email address.";
    }
    if (surety.pincode.trim() && !/^\d{6}$/.test(surety.pincode.trim())) {
      rowErrors.pincode = "Enter a 6-digit pincode.";
    }
    if (surety.identityProof.length === 0) {
      rowErrors.identityProof = "Attach an identity proof.";
    }
    if (surety.solvencyProof.length === 0) {
      rowErrors.solvencyProof = "Attach a proof of solvency.";
    }
    if (Object.values(rowErrors).some(Boolean)) {
      errors.sureties[surety.id] = rowErrors;
    }
  }
}

export function validateApplication(
  draft: ApplicationDraft
): ApplicationErrors {
  const errors: ApplicationErrors = {
    fields: {},
    sureties: {},
    documentRows: {},
  };

  if (!draft.type) {
    errors.fields.type = "Select an application type.";
    return errors;
  }

  switch (draft.type) {
    case "advancement-reschedule":
    case "postpone": {
      if (!draft.rescheduleReason) {
        errors.fields.rescheduleReason = "Choose the reason for rescheduling.";
      }
      // Not marked mandatory in the PRD, but a request to move a hearing
      // with no date asks the court for nothing.
      if (!draft.rescheduleFrom) {
        errors.fields.rescheduleFrom =
          "Choose the date from which the hearing can be held.";
      }
      break;
    }

    case "bail": {
      if (!draft.petitionerFather.trim()) {
        errors.fields.petitionerFather = "Enter the petitioner's father's name.";
      }
      if (!rich(draft.bailGrounds)) {
        errors.fields.bailGrounds = "Enter the grounds and reasons for bail.";
      }
      if (draft.addSureties === "yes") {
        if (draft.sureties.length === 0) {
          errors.fields.sureties = "Add at least one surety, or choose No.";
        }
        validateSureties(draft.sureties, errors);
      }
      break;
    }

    case "condonation-of-delay": {
      const days = draft.delayDays.trim();
      if (!days) {
        errors.fields.delayDays = "Enter the number of days of delay.";
      } else if (!/^\d+$/.test(days) || Number(days) < 1) {
        errors.fields.delayDays = "Enter a positive whole number.";
      }
      if (!rich(draft.delayReason)) {
        errors.fields.delayReason = "Enter the reason for delay.";
      }
      if (draft.supportingDocuments.length === 0) {
        errors.fields.supportingDocuments =
          "Add at least one supporting document.";
      }
      validateDocumentRows(draft.supportingDocuments, errors);
      break;
    }

    case "application-others": {
      const title = draft.title.trim();
      if (!title) {
        errors.fields.title = "Enter an application title.";
      } else if (!TITLE_PATTERN.test(title)) {
        errors.fields.title = "Use letters, numbers and spaces only.";
      }
      if (!rich(draft.details)) {
        errors.fields.details = "Enter the application details.";
      }
      validateDocumentRows(draft.otherDocuments, errors);
      break;
    }

    case "production-of-documents": {
      if (!draft.applicationDate) {
        errors.fields.applicationDate = "Choose the date of application.";
      }
      if (!rich(draft.applicationReason)) {
        errors.fields.applicationReason = "Enter the reason for application.";
      }
      validateDocumentRows(draft.submissionDocuments, errors);
      break;
    }

    case "settlement": {
      if (!draft.applicationDate) {
        errors.fields.applicationDate = "Choose the date of application.";
      }
      break;
    }

    case "transfer": {
      if (!draft.applicationDate) {
        errors.fields.applicationDate = "Choose the date of application.";
      }
      if (!draft.requestedCourt) {
        errors.fields.requestedCourt = "Select the requested court.";
      }
      if (!draft.transferGrounds.trim()) {
        errors.fields.transferGrounds =
          "Enter the grounds for seeking transfer.";
      }
      break;
    }

    case "withdrawal": {
      if (!draft.applicationDate) {
        errors.fields.applicationDate = "Choose the date of application.";
      }
      if (!draft.withdrawalReasonCode) {
        errors.fields.withdrawalReasonCode = "Choose the reason for withdrawal.";
      }
      break;
    }

    case "objection": {
      if (!rich(draft.objectionGrounds)) {
        errors.fields.objectionGrounds = "Enter the grounds of objection.";
      }
      validateDocumentRows(draft.objectionDocuments, errors);
      break;
    }
  }

  return errors;
}

/**
 * The ask in the filer's words, for saving a draft: the one field of each
 * type that `applicationDraftFrom` restores. The inverse of that mapping, so
 * a saved draft reopens with what was written.
 */
export function draftRequestText(draft: ApplicationDraft): string {
  switch (draft.type) {
    case "advancement-reschedule":
    case "postpone":
      return draft.requestReason.trim();
    case "bail":
      return draft.bailGrounds.text.trim();
    case "condonation-of-delay":
      return draft.delayReason.text.trim();
    case "production-of-documents":
      return draft.applicationReason.text.trim();
    case "settlement":
      return draft.comments.text.trim();
    case "transfer":
      return draft.transferGrounds.trim();
    case "withdrawal":
      return draft.withdrawalReason.text.trim();
    case "objection":
      return draft.objectionGrounds.text.trim();
    case "application-others":
      return draft.details.text.trim();
    default:
      return "";
  }
}
