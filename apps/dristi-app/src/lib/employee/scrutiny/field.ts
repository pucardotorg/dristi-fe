import type * as React from "react";

import { shortDocName } from "@/lib/employee/scrutiny/bundle";
import type {
  BundleDoc,
  Draft,
  Evidence,
  Field,
  FlagMap,
  Rect,
  SectionDef,
} from "@/lib/employee/scrutiny/types";

/* ── counts across the case ──────────────────────────────────────────────── */

/** Observations AI has about a section — what the officer should check. */
export function sectionIssueCount(section: SectionDef): number {
  return section.groups.reduce(
    (n, g) => n + g.fields.filter((f) => f.docread || f.ocrfail).length,
    0,
  );
}

/** Items the officer has raised in a section. */
export function sectionFlagCount(section: SectionDef, flags: FlagMap): number {
  return section.groups.reduce(
    (n, g) => n + g.fields.filter((f) => flags[f.id]).length,
    0,
  );
}

/* ── marks on the bundle ─────────────────────────────────────────────────── */

/** One box drawn on a page, with how many items are behind it. */
export interface Mark {
  fieldId: string;
  evidence: Evidence;
  /** 1, or 2 when a linked document item shares this exact rectangle. */
  count: number;
}

function sameSpot(a: Evidence, b: Evidence): boolean {
  return a.doc === b.doc && a.rect.every((n, i) => n === b.rect[i]);
}

/**
 * Every mark to draw, deduped.
 *
 * A linked document item carries a copy of its field item's rectangle — that copy is the
 * picture of the defect, and the advocate may never see the two items side by side. On
 * the officer's own bundle, though, two identical stacked boxes read as two defects. So
 * one box survives per defect, the field item's, because that is the one holding the
 * officer's words; the count says two items are behind it.
 */
export function collectMarks(flags: FlagMap): Mark[] {
  return Object.entries(flags).flatMap(([fieldId, flag]) => {
    const evidence = flag.evidence;
    if (!evidence) return [];

    const source = flag.linkedFrom ? flags[flag.linkedFrom] : undefined;
    if (source?.evidence && sameSpot(source.evidence, evidence)) return [];

    const copy = flag.linkedTo ? flags[flag.linkedTo] : undefined;
    const shared = !!copy?.evidence && sameSpot(copy.evidence, evidence);
    return [{ fieldId, evidence, count: shared ? 2 : 1 }];
  });
}

/** How many marks sit on one bundle document — the same count the page draws. */
export function docMarkCount(docId: string, flags: FlagMap): number {
  return collectMarks(flags).filter((m) => m.evidence.doc === docId).length;
}

/* ── evidence previews ───────────────────────────────────────────────────── */

/**
 * A raised item shows a cropped preview of the region it marked. The crop is a
 * background-position trick rather than a canvas: the scan is already loaded, and this
 * survives zoom, theme and re-render for free.
 */
export function evidencePreviewStyle(
  evidence: Evidence,
  docById: Record<string, BundleDoc>,
): React.CSSProperties | null {
  const doc = docById[evidence.doc];
  if (!doc || doc.kind !== "image" || !doc.src) return null;
  const [l, t, w, h] = evidence.rect;
  const bx = w >= 99.9 ? 0 : (l / (100 - w)) * 100;
  const by = h >= 99.9 ? 0 : (t / (100 - h)) * 100;
  return {
    backgroundImage: `url('${doc.src}')`,
    backgroundSize: `${10000 / Math.max(w, 8)}% auto`,
    backgroundPosition: `${bx.toFixed(1)}% ${by.toFixed(1)}%`,
  };
}

export function rectStyle(rect: Rect): React.CSSProperties {
  const [left, top, width, height] = rect;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

/* ── the composer's draft ────────────────────────────────────────────────── */

/** A correction only exists once the officer's text actually differs. */
export function isCorrected(field: Field, draft: Draft | null): boolean {
  if (!draft || field.docrow) return false;
  const next = draft.value.trim();
  return !!next && next !== field.value;
}

/** Anything at all has been entered. */
export function isDraftDirty(field: Field, draft: Draft | null): boolean {
  if (!draft) return false;
  return !!(
    isCorrected(field, draft) ||
    draft.text.trim() ||
    draft.reason ||
    draft.voice ||
    draft.evidence
  );
}

/**
 * The item states what is wrong.
 *
 * A correction states itself and a document reason chip states itself; otherwise there
 * must be words. **A mark does not count.** A red box with no note is "look here, guess
 * why" — the one-word remark this whole feature exists to kill, drawn instead of typed.
 */
export function saysSomething(field: Field, draft: Draft | null): boolean {
  if (!draft) return false;
  return !!(isCorrected(field, draft) || draft.reason || draft.text.trim());
}

/** A linked document item must name what is wrong with the document before it saves. */
export function isLinkedComplete(draft: Draft | null): boolean {
  return !draft?.linked || !!draft.linked.reason;
}

/** The save gate. Both items have to be legible, not just entered. */
export function canSaveDraft(field: Field, draft: Draft | null): boolean {
  return (
    isDraftDirty(field, draft) &&
    saysSomething(field, draft) &&
    isLinkedComplete(draft)
  );
}

/**
 * What a raised item grants the advocate — as one plain sentence, printed identically on
 * the composer, on the item, and in the review dialog.
 *
 * The unlock rule: an item unlocks only what it names. A field item unlocks that value
 * and nothing else; **re-upload is opened by a document-row item alone**. The earlier
 * phrasing said this as a negation ("this value — not re-upload of Aadhaar"), which read
 * as legalese; "only" carries the same boundary in natural voice, and the adjacent
 * "Flag the upload" affordance makes the alternative concrete. The word appears exactly
 * where a mark on an uploaded document could mislead — a field sourced from a generated
 * page has nothing to re-upload, so it takes the plain sentence.
 */
export function unlocksSentence(
  field: Field,
  docRow: Record<string, string>,
): string {
  if (field.docrow) {
    return "Lets the advocate re-upload this document.";
  }
  if (field.doc && docRow[field.doc]) {
    return "Lets the advocate edit this value only.";
  }
  return "Lets the advocate edit this value.";
}

/** Short enough that a Malayalam or Gujarati bundle label does not blow the line. */
export function docName(
  docId: string,
  docById: Record<string, BundleDoc>,
): string {
  const doc = docById[docId];
  return doc ? shortDocName(doc.name) : "the document";
}
