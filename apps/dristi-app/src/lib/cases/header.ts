import { peekExtras } from "./peek";
import type { CaseRecord } from "./types";

/**
 * Header-only facts the PRD adds (DET-02, DET-05). Both are working guesses
 * until product confirms the vocabularies (open questions Q-1, Q-6); they live
 * here so correcting them touches one file.
 */

/** The five secondary stages the legacy product carries under a main stage. */
export type SecondaryStage =
  | "delay-condonation"
  | "notice"
  | "proclamation-attachment"
  | "summons"
  | "warrant";

const SECONDARY_STAGE_LABEL: Record<SecondaryStage, string> = {
  "delay-condonation": "Delay condonation",
  notice: "Notice",
  "proclamation-attachment": "Proclamation & attachment",
  summons: "Summons",
  warrant: "Warrant",
};

export function secondaryStageLabel(stage: SecondaryStage): string {
  return SECONDARY_STAGE_LABEL[stage];
}

const SECONDARY_STAGES: Partial<Record<string, SecondaryStage[]>> = {
  "c-1001": ["summons"],
  "c-1003": ["delay-condonation"],
  "c-1004": ["warrant", "proclamation-attachment"],
};

/** Empty for a disposed case: a closed matter has no process still running. */
export function secondaryStages(record: CaseRecord): SecondaryStage[] {
  if (record.disposal) return [];
  return SECONDARY_STAGES[record.id] ?? [];
}

export type PastCaseNumber = {
  number: string;
  /**
   * The day it was generated, ISO. Provenance only: the number's own format
   * already tells an advocate which stage produced it (owner, Sept 18).
   */
  generatedOn?: string;
};

/**
 * Older numbers, newest first. The header shows `record.caseNumber` as the
 * current one, the same number the cases list and the breadcrumb use.
 */
export function caseNumberHistory(record: CaseRecord): PastCaseNumber[] {
  const history: PastCaseNumber[] = [];
  const extras = peekExtras(record.id);
  if (extras.altCaseNumber) {
    history.push({
      number: extras.altCaseNumber,
      generatedOn: extras.altCaseNumberOn,
    });
  }
  const filingNumber = FILING_NUMBERS[record.id];
  if (filingNumber && filingNumber !== record.caseNumber) {
    history.push({
      number: filingNumber,
      generatedOn: record.filedOn,
    });
  }
  return history;
}

const FILING_NUMBERS: Partial<Record<string, string>> = {
  "c-1001": "KL-KLKM-001842-2026",
  "c-1003": "KL-KLEK-001903-2026",
  "c-1005": "KL-KLKM-000221-2023",
  "c-2002": "KL-KLEK-000088-2024",
};
