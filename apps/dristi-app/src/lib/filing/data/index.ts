/**
 * Repository access for the filing screens. `getRepository()` is the one place that
 * chooses the implementation — swap it for an HTTP-backed one when the backend lands.
 */

import { IndexedDbFilingRepository } from "./indexeddb";
import type { FilingRepository, StoredFile } from "./repository";
import type { FilingDraft, StoredFileRef } from "../types";

export type { FilingRepository, StoredFile } from "./repository";

let instance: FilingRepository | null = null;

export function getRepository(): FilingRepository {
  if (typeof window === "undefined") {
    throw new Error("The filing repository is browser-only (IndexedDB).");
  }
  if (!instance) instance = new IndexedDbFilingRepository();
  return instance;
}

/** Short, URL-safe id for drafts, files and rows. */
export function newId(prefix = ""): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${raw.slice(0, 12)}` : raw.slice(0, 12);
}

/** Store an upload and return the reference the draft keeps. */
export async function storeUpload(file: File): Promise<StoredFileRef> {
  const ext = (file.name.split(".").pop() || "").toUpperCase().slice(0, 5) || "FILE";
  const ref: StoredFileRef = {
    id: newId("f"),
    name: file.name,
    size: file.size,
    type: file.type,
    ext,
  };
  const stored: StoredFile = { ...ref, blob: file, createdAt: new Date().toISOString() };
  await getRepository().putFile(stored);
  return ref;
}

/** Every file id a draft references (intake, list of documents, signed copy). */
export function draftFileIds(draft: FilingDraft): string[] {
  const ids: string[] = [];
  const push = (ref: StoredFileRef | null | undefined) => {
    if (ref) ids.push(ref.id);
  };
  for (const g of draft.intake.cheques) g.slots.forEach((s) => push(s.file));
  for (const g of draft.intake.parties) g.slots.forEach((s) => push(s.file));
  draft.intake.supporting.forEach((s) => push(s.file));
  for (const g of draft.documents) g.docs.forEach((d) => push(d.file));
  draft.complainants.forEach((c) => push(c.oathVideo?.file));
  push(draft.sign.signedCopy);
  return ids;
}

/** Delete a draft and every file only it referenced. */
export async function deleteDraftWithFiles(id: string): Promise<void> {
  const repo = getRepository();
  const draft = await repo.getDraft(id);
  await repo.deleteDraft(id);
  if (draft) await repo.deleteFiles(draftFileIds(draft));
}
