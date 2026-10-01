import { BUNDLE, DOC_BY_ID, DOC_ROW } from "@/lib/employee/scrutiny/bundle";
import { deriveScrutinyCase } from "@/lib/employee/scrutiny/derive";
import { CASE, HISTORY, HISTORY_ROUND, HISTORY_SUMMARY } from "@/lib/employee/scrutiny/history";
import { findFiling } from "@/lib/employee/scrutiny/queue";
import {
  ALL_FIELDS,
  CHECKS,
  FIELD_BY_ID,
  SECTIONS,
  TRANSCRIPTS,
} from "@/lib/employee/scrutiny/sections";
import type {
  BundleDoc,
  Filing,
  FlatField,
  ScrutinyCase,
  SectionDef,
} from "@/lib/employee/scrutiny/types";

/** The one hand-authored case — the showcase, with real scans and pixel-mapped regions. */
export const HERO_FILING_NO = CASE.filingNo;

/** Every field, flattened once, tagged with the group and section it came from. */
function flatten(sections: SectionDef[]): FlatField[] {
  return sections.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.fields.map((field) => ({
        ...field,
        group: group.title,
        section: section.title,
        sectionId: section.id,
      })),
    ),
  );
}

function indexBy<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

/**
 * Assemble one filing's workbench.
 *
 * The authored case returns its own rich content; every other filing is derived from its
 * queue row (`derive.ts`). Either way the caller gets one `ScrutinyCase` and the workbench
 * renders identically — which is the whole point of the seam: no row is a dead link, and
 * no screen special-cases "the real one".
 */
export function buildScrutinyCase(filing: Filing): ScrutinyCase {
  if (filing.no === HERO_FILING_NO) {
    return {
      filing,
      party: {
        complainant: CASE.complainant,
        accused: CASE.accused,
        submitted: CASE.submitted,
        advocate: CASE.advocate,
      },
      sections: SECTIONS,
      allFields: ALL_FIELDS,
      fieldById: FIELD_BY_ID,
      bundle: BUNDLE,
      docById: DOC_BY_ID,
      docRow: DOC_ROW,
      transcripts: TRANSCRIPTS,
      checks: CHECKS,
      history: HISTORY,
      historySummary: HISTORY_SUMMARY,
      historyRound: HISTORY_ROUND,
    };
  }

  const derived = deriveScrutinyCase(filing);
  const allFields = flatten(derived.sections);
  return {
    filing,
    party: derived.party,
    sections: derived.sections,
    allFields,
    fieldById: indexBy(allFields),
    bundle: derived.bundle,
    docById: indexBy<BundleDoc>(derived.bundle),
    docRow: derived.docRow,
    transcripts: derived.transcripts,
    checks: derived.checks,
    history: derived.history,
    historySummary: derived.historySummary,
    historyRound: derived.historyRound,
  };
}

/** The case behind a route param, or `undefined` when the id names no real filing. */
export function scrutinyCaseFor(filingNo: string): ScrutinyCase | undefined {
  const filing = findFiling(filingNo);
  return filing ? buildScrutinyCase(filing) : undefined;
}
