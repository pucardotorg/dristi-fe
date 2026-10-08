/**
 * The generated application — the court-form document that Generate
 * Application produces, built from the draft and the case record.
 *
 * Structure mirrors the legacy portal's generated document: court heading,
 * case number, cause title, a facts table, numbered operative paragraphs and
 * a prayer. The operative text is composed from what the filer actually
 * typed, so the document is the draft restated as a filing — dummy only in
 * that no backend renders or stores it.
 *
 * Statutory citations are deliberately absent: journey.md names sections for
 * some of these applications but not all, and a generated legal document is
 * the last place to guess one.
 */
import { type ApplicationDraft } from "./application-draft";
import { counselFor, formatCaseDate, type CaseRecord } from "./types";
import { localizeForDownload } from "@/lib/court/browser";

export type GeneratedApplication = {
  /** "Before the …" heading line. */
  court: string;
  caseNumber: string;
  /** Cause title — "In the matter of …". */
  matter: string;
  /** Document title, e.g. "Application for condonation of delay". */
  title: string;
  /** The party the application is filed for. */
  filedFor: string;
  /** Key-value rows under the heading, like the legacy parties table. */
  facts: { term: string; value: string }[];
  /** Numbered operative paragraphs. */
  paragraphs: string[];
  prayer: string;
};

/**
 * The register's dummy pack writes this court long-form — "JMFC-I"
 * appears as "Judicial First Class Magistrate Court-I" in
 * applications-dummy.json — so the expansion is the product's own
 * vocabulary, not an invented one. Unmatched courts pass through as-is.
 */
export function courtLongForm(court: string): string {
  const match = /^JMFC-([IVXLC]+), (.+)$/.exec(court);
  if (!match) return court;
  return `Judicial First Class Magistrate Court-${match[1]}, ${match[2]}`;
}

function trimmed(value: string): string {
  return value.trim();
}

function fileCount(count: number, noun = "supporting document"): string {
  return `${count} ${noun}${count === 1 ? "" : "s"} accompany this application.`;
}

/** Applications the portal dates and links to an order. */
const DATED_TYPES = new Set([
  "production-of-documents",
  "settlement",
  "transfer",
  "withdrawal",
]);

export function buildGeneratedApplication(
  draft: ApplicationDraft,
  record: CaseRecord,
  /** The side filing it. Absent, bail is the accused's and the rest the complainant's. */
  side?: "complainant" | "accused"
): GeneratedApplication | null {
  if (!draft.type) return null;

  const complainant = record.parties.complainant;
  const accused = record.parties.accused;
  const filedFor =
    (side ?? (draft.type === "bail" ? "accused" : "complainant")) === "accused"
      ? accused
      : complainant;

  const facts: { term: string; value: string }[] = [
    { term: "Complainant", value: complainant },
    { term: "Accused", value: accused },
  ];
  const complainantCounsel = counselFor(record, "complainant");
  if (complainantCounsel.length) {
    facts.push({
      term: "Complainant counsel",
      value: complainantCounsel.join(", "),
    });
  }
  const accusedCounsel = counselFor(record, "accused");
  if (accusedCounsel.length) {
    facts.push({ term: "Accused counsel", value: accusedCounsel.join(", ") });
  }
  // The draft holds every type's fields; only read the ones this type owns.
  if (DATED_TYPES.has(draft.type)) {
    if (draft.applicationDate) {
      facts.push({
        term: "Date of application",
        value: formatCaseDate(draft.applicationDate.toISOString()),
      });
    }
    if (trimmed(draft.referenceOrderId)) {
      facts.push({
        term: "Reference order",
        value: trimmed(draft.referenceOrderId),
      });
    }
  }

  let title = "Application";
  const paragraphs: string[] = [];
  let prayer = "";

  switch (draft.type) {
    case "advancement-reschedule":
    case "postpone": {
      title =
        draft.type === "postpone"
          ? "Application to postpone the hearing"
          : "Application to advance the hearing";
      paragraphs.push(
        record.nextHearing
          ? `This case is listed before this court on ${formatCaseDate(
              record.nextHearing.on
            )} for ${record.nextHearing.purpose.toLowerCase()}.`
          : "No hearing is currently listed in this case."
      );
      paragraphs.push(
        trimmed(draft.requestReason)
          ? `The applicant seeks a change of the hearing date for the following reason: ${trimmed(
              draft.requestReason
            )}`
          : "The applicant seeks a change of the hearing date."
      );
      if (draft.availabilityDates.length) {
        paragraphs.push(
          `The party is available to attend on ${draft.availabilityDates
            .map((date) => formatCaseDate(date.toISOString()))
            .join(", ")}.`
        );
      }
      paragraphs.push(
        draft.partiesAgreed === "yes"
          ? "The other parties in the case have agreed to the proposed dates."
          : "The other parties in the case have not yet agreed to the proposed dates."
      );
      if (draft.supportingFiles.length) {
        paragraphs.push(fileCount(draft.supportingFiles.length));
      }
      prayer =
        "It is therefore prayed that this court may advance or reschedule the hearing of this case to one of the dates proposed above.";
      break;
    }

    case "bail": {
      title = "Application for bail";
      paragraphs.push(
        trimmed(draft.petitionerFather)
          ? `The petitioner ${accused}, whose father's name is ${trimmed(
              draft.petitionerFather
            )}, seeks release on bail in this case.`
          : `The petitioner ${accused} seeks release on bail in this case.`
      );
      if (trimmed(draft.bailGrounds.text)) {
        paragraphs.push(trimmed(draft.bailGrounds.text));
      }
      if (trimmed(draft.comments.text)) {
        paragraphs.push(trimmed(draft.comments.text));
      }
      paragraphs.push(
        draft.addSureties === "yes"
          ? `${draft.sureties.length} ${
              draft.sureties.length === 1 ? "surety stands" : "sureties stand"
            } for the petitioner; their details, identity proofs and proofs of solvency accompany this application.`
          : "No surety details accompany this application."
      );
      prayer =
        "It is therefore prayed that the petitioner be released on bail on such terms as this court considers fit.";
      break;
    }

    case "condonation-of-delay": {
      title = "Application for condonation of delay";
      paragraphs.push(
        `The complaint in this case has been filed with a delay of ${trimmed(
          draft.delayDays
        )} days.`
      );
      if (trimmed(draft.delayReason.text)) {
        paragraphs.push(
          `The delay was caused for the following reasons: ${trimmed(
            draft.delayReason.text
          )}`
        );
      }
      if (trimmed(draft.additionalInformation.text)) {
        paragraphs.push(trimmed(draft.additionalInformation.text));
      }
      if (draft.supportingDocuments.length) {
        paragraphs.push(fileCount(draft.supportingDocuments.length));
      }
      prayer = `It is therefore prayed that the delay of ${trimmed(
        draft.delayDays
      )} days in filing the complaint be condoned for sufficient cause shown.`;
      break;
    }

    case "objection": {
      title = "Objection";
      if (trimmed(draft.details.text)) {
        paragraphs.push(trimmed(draft.details.text));
      }
      if (draft.supportingFiles.length) {
        paragraphs.push(fileCount(draft.supportingFiles.length));
      }
      prayer =
        "It is therefore prayed that this court reject the application objected to.";
      break;
    }

    case "application-others": {
      title = trimmed(draft.title) || "Application";
      if (trimmed(draft.details.text)) {
        paragraphs.push(trimmed(draft.details.text));
      }
      if (draft.supportingFiles.length) {
        paragraphs.push(fileCount(draft.supportingFiles.length));
      }
      prayer =
        "It is therefore prayed that this court grant the relief sought in this application.";
      break;
    }

    case "production-of-documents": {
      title = "Application for production of documents";
      const titles = draft.submissionDocuments
        .map((row) => trimmed(row.title))
        .filter(Boolean);
      if (titles.length) {
        paragraphs.push(
          `The applicant seeks to place the following documents on the record of this case: ${titles.join(
            ", "
          )}.`
        );
      }
      if (trimmed(draft.applicationReason.text)) {
        paragraphs.push(trimmed(draft.applicationReason.text));
      }
      if (trimmed(draft.comments.text)) {
        paragraphs.push(trimmed(draft.comments.text));
      }
      prayer =
        "It is therefore prayed that the documents listed above be taken on record.";
      break;
    }

    case "settlement": {
      title = "Application for settlement";
      paragraphs.push(
        "The parties have agreed to settle the matter between them."
      );
      if (trimmed(draft.comments.text)) {
        paragraphs.push(trimmed(draft.comments.text));
      }
      // Compounding language per journey.md §9 — the offence is compoundable
      // and the parties may settle and close the case (NI Act §147).
      prayer =
        "It is therefore prayed that the settlement be recorded and the case be closed as compounded.";
      break;
    }

    case "transfer": {
      title = "Application for transfer";
      paragraphs.push(
        `This case is pending before the ${courtLongForm(record.court)}.`
      );
      paragraphs.push(
        trimmed(draft.transferGrounds)
          ? `The applicant seeks transfer of the case to the ${courtLongForm(
              draft.requestedCourt
            )} on the following grounds: ${trimmed(draft.transferGrounds)}`
          : `The applicant seeks transfer of the case to the ${courtLongForm(
              draft.requestedCourt
            )}.`
      );
      if (trimmed(draft.comments.text)) {
        paragraphs.push(trimmed(draft.comments.text));
      }
      prayer = `It is therefore prayed that this case be transferred to the ${courtLongForm(
        draft.requestedCourt
      )}.`;
      break;
    }

    case "withdrawal": {
      title = "Application for withdrawal";
      if (trimmed(draft.withdrawalReason.text)) {
        paragraphs.push(
          `The complainant seeks permission to withdraw the complaint for the following reason: ${trimmed(
            draft.withdrawalReason.text
          )}`
        );
      } else {
        paragraphs.push(
          "The complainant seeks permission to withdraw the complaint."
        );
      }
      if (trimmed(draft.comments.text)) {
        paragraphs.push(trimmed(draft.comments.text));
      }
      prayer =
        "It is therefore prayed that the complainant be permitted to withdraw the complaint.";
      break;
    }
  }

  return {
    court: `Before the ${courtLongForm(record.court)}`,
    caseNumber: record.caseNumber,
    matter: `In the matter of ${complainant} v. ${accused}`,
    title,
    filedFor,
    facts,
    paragraphs,
    prayer,
  };
}

/**
 * The generated application as plain text, laid out in reading order.
 *
 * Composed locally from the draft — there is no server-rendered PDF behind
 * this document, so a text copy is the most the prototype can honestly hand
 * over. Both the preview dialog and the signature dialog call this, so the
 * file a filer downloads is the same either side of signing.
 */
export function generatedApplicationText(
  generated: GeneratedApplication
): string {
  return [
    generated.court,
    `Case no. ${generated.caseNumber}`,
    generated.matter,
    "",
    generated.title,
    "",
    ...generated.facts.map((fact) => `${fact.term}: ${fact.value}`),
    "",
    ...generated.paragraphs.map(
      (paragraph, index) => `${index + 1}. ${paragraph}`
    ),
    "",
    `Prayer: ${generated.prayer}`,
    "",
    `Filed for ${generated.filedFor}`,
  ].join("\n");
}

/** Slashes in a case number are path separators to a download manager. */
export function generatedApplicationFilename(record: CaseRecord): string {
  return `${record.caseNumber.replace(/\//g, "-")}-application.txt`;
}

/**
 * Writes the text copy to disk. The object URL is released straight after the
 * synthetic click, which is when the browser has already taken the blob.
 */
export function downloadGeneratedApplication(
  draft: ApplicationDraft,
  record: CaseRecord,
  side?: "complainant" | "accused"
): void {
  const generated = buildGeneratedApplication(draft, record, side);
  if (!generated) return;
  const url = URL.createObjectURL(
    new Blob([localizeForDownload(generatedApplicationText(generated))], { type: "text/plain" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = generatedApplicationFilename(record);
  anchor.click();
  URL.revokeObjectURL(url);
}
