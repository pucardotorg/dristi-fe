/**
 * Application drafts saved in this browser — demo persistence, no backend.
 *
 * "Save as draft" on the Raise application form has to leave something the
 * filer can come back to, or the button is a promise the prototype cannot
 * keep. So a saved draft is written here, per case, and the Applications
 * register reads it back as a Draft row whose "Continue draft" reopens the
 * form. The same shape the register already resumes pack drafts from: the
 * type, a title, and the ask in the filer's words (see
 * `applicationDraftFrom`). Files and dates are not kept, exactly as with the
 * pack's drafts.
 *
 * Read with `useLocalStorageValue(savedDraftsKey(caseId))` and parse with
 * `parseSavedDrafts`, so every reader updates when one is saved.
 */

import { writeLocalStorageValue } from "@/hooks/use-local-storage-value";

import type { ApplicationTypeId, Submission } from "./applications";

export type SavedApplicationDraft = {
  id: string;
  type: ApplicationTypeId;
  title: string;
  /** The ask in the filer's words; restored into the field that holds it. */
  request: string;
  objectionToId: string | null;
  createdById: string;
  submittedById: string;
  onBehalfOfId: string;
  /** ISO timestamp. */
  addedOn: string;
};

export function savedDraftsKey(caseId: string): string {
  return `dristi-demo-application-drafts:${caseId}`;
}

export function parseSavedDrafts(raw: string | null): SavedApplicationDraft[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as SavedApplicationDraft[]) : [];
  } catch {
    return [];
  }
}

function readSaved(caseId: string): SavedApplicationDraft[] {
  try {
    return parseSavedDrafts(window.localStorage.getItem(savedDraftsKey(caseId)));
  } catch {
    return [];
  }
}

/** Save, or replace the draft with the same id. */
export function saveApplicationDraft(
  caseId: string,
  draft: SavedApplicationDraft
): void {
  const next = [
    draft,
    ...readSaved(caseId).filter((item) => item.id !== draft.id),
  ];
  writeLocalStorageValue(savedDraftsKey(caseId), JSON.stringify(next));
}

/** Drop a saved draft once it is filed: it is no longer a draft. */
export function removeSavedDraft(caseId: string, id: string): void {
  const current = readSaved(caseId);
  if (!current.some((item) => item.id === id)) return;
  writeLocalStorageValue(
    savedDraftsKey(caseId),
    JSON.stringify(current.filter((item) => item.id !== id))
  );
}

export function newSavedDraftId(): string {
  return `saved-${crypto.randomUUID()}`;
}

/** A saved draft as a register row: a Draft, nothing allotted yet. */
export function savedDraftSubmission(draft: SavedApplicationDraft): Submission {
  return {
    id: draft.id,
    kind: "application",
    type: draft.type,
    title: draft.title,
    status: "draft",
    addedOn: draft.addedOn,
    submittedById: draft.submittedById,
    createdById: draft.createdById,
    onBehalfOfId: draft.onBehalfOfId,
    temporaryId: null,
    applicationNumber: null,
    submittedOn: null,
    onboardedOn: null,
    decisionOn: null,
    objectionsInvited: null,
    objectionToId: draft.objectionToId,
    request: draft.request || null,
    courtResult: null,
    linkedOrder: null,
    defects: [],
    documents: [{ label: "Draft application" }],
  };
}
