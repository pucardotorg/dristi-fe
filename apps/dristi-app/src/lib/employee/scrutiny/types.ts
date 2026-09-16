/**
 * Domain model for the court-registry scrutiny workbench (`/employee/scrutiny`).
 *
 * The shapes are named here so the fixtures are typed data and the screens stay pure
 * rendering. Nothing in this file knows about React, the design system, or a route —
 * keep it that way, so the same model can sit behind a real API later without the
 * screens noticing.
 */

import type { CaseDocumentKind } from "@/lib/employee/case-review";

/* ── the case bundle ─────────────────────────────────────────────────────── */

/**
 * Where a bundle page comes from.
 *
 * - `generated` / `scan` render legible React facsimiles (`generated-pages.tsx`) — these
 *   exist only for the one hand-authored case, whose bundle is worth reading in full.
 * - `image` is an uploaded scan under `/public`.
 * - `facsimile` is the illegible SVG page the rest of the court side already draws
 *   (`page-facsimile.tsx`): the shape of a document, never its words. Every *derived*
 *   filing's bundle is drawn this way, because a legible page for a case we are only
 *   standing in for would be fabricating a court record — the one thing a demo must not
 *   do (`document-scroller.tsx`).
 */
export type BundleDocKind = "generated" | "scan" | "image" | "facsimile";

export interface BundleDoc {
  id: string;
  /** As printed on the page label and in the index rail. */
  name: string;
  kind: BundleDocKind;
  /** Only for `kind: "image"` — a URL under `/public`, never inline base64. */
  src?: string;
  /** Only for `kind: "facsimile"` — which illegible page shape to draw. */
  sheet?: CaseDocumentKind;
  /** 1-based position in the complaint-PDF reading order. */
  no: number;
  /** Uploaded scans that are illegible enough to worry about. */
  poorScan?: boolean;
}

/** `[left, top, width, height]`, each a percentage of the page box. */
export type Rect = readonly [number, number, number, number];

/* ── filed information ───────────────────────────────────────────────────── */

export interface Field {
  id: string;
  label: string;
  /** What the advocate filed. Empty string for rows that are only a document. */
  value: string;
  /** Long prose (prayer, condonation reason) reads as body, not as a datum. */
  long?: boolean;

  /** Bundle doc this value was read from, plus the region it was read at. */
  doc?: string;
  region?: Rect;
  /** A thumbnail of the source doc belongs on the row (ID proof). */
  thumb?: string;
  /** This row IS a document in the Evidence › Documents group. */
  docrow?: string;

  /** AI read a different value here than the one filed. */
  docread?: string;
  /** ...and the filer dismissed that warning at filing time. */
  skipped?: boolean;
  /** AI could not read the value at all. */
  ocrfail?: boolean;
  failnote?: string;
  /** A quiet AI consistency confirmation. */
  aiok?: string;
  /** No document exists to verify this against — said plainly, not hidden. */
  nodoc?: string;
  /** Standing caution about the upload behind this row. */
  scannote?: string;
  /** Where in the document the value sits, when that is not obvious. */
  srcnote?: string;
}

/** A field, flattened with the group and section it belongs to. */
export interface FlatField extends Field {
  group: string;
  section: string;
  sectionId: string;
}

export interface FieldGroupDef {
  id: string;
  icon: GroupIcon;
  title: string;
  fields: Field[];
}

export interface SectionDef {
  id: string;
  num: string;
  title: string;
  groups: FieldGroupDef[];
}

export type GroupIcon =
  | "user"
  | "userSearch"
  | "scale"
  | "cheque"
  | "memo"
  | "mail"
  | "pin"
  | "doc";

/* ── what the officer raises ─────────────────────────────────────────────── */

/** A rectangle drawn on a bundle page, as evidence for one raised item. */
export interface Evidence {
  doc: string;
  rect: Rect;
}

/**
 * One raised item against one field. A correction proposes a replacement value (the
 * advocate confirms it); a flag asks the advocate to fix something.
 *
 * An item is a permission grant, and it grants only what it names: a field item unlocks
 * that value, a document-row item unlocks re-upload of that document. The two pointers
 * below are what let one defect be raised as both without either item pretending to be
 * the other.
 */
export interface Flag {
  correction: string | null;
  /** Structured reason, only for document rows (Blurry / Wrong document / …). */
  reason: string | null;
  comment: string | null;
  /** A voice note was recorded; its transcript is folded into `comment`. */
  voice: boolean;
  evidence: Evidence | null;
  /** Field item → the document row raised with it. */
  linkedTo?: string | null;
  /** Document item → the field it was raised from. */
  linkedFrom?: string | null;
}

/** The document-row item being written alongside a field item, before either is saved. */
export interface LinkedDoc {
  /** Field id of the document row in Evidence › Documents. */
  rowId: string;
  /** Bundle doc id that row represents. */
  docId: string;
  reason: string | null;
  note: string;
}

/** The in-progress state of the composer, before it is saved as a `Flag`. */
export interface Draft {
  /** Contents of the "Your correction" box. */
  value: string;
  /** Contents of the note box. */
  text: string;
  reason: string | null;
  voice: boolean;
  recording: boolean;
  /** The correction box was machine-filled and is not yet human-verified. */
  prefilled: boolean;
  evidence: Evidence | null;
  /** Bundle doc id the re-upload question is being asked about, or null. */
  askReupload: string | null;
  /** The linked document item this save will write alongside the field item. */
  linked: LinkedDoc | null;
}

export type FlagMap = Record<string, Flag>;

/* ── the queue ───────────────────────────────────────────────────────────── */

/** Who currently holds the ball. This is what the queue tabs segment by. */
export type Ball = "registry" | "advocate" | "closed";

export interface Filing {
  no: string;
  parties: string;
  type: string;
  stage: string;
  ball: Ball;
  reason: string;
  advocate: string;
  /** Officer holding it, or "—" when unclaimed. */
  who: string;
  /** Days the filing has been waiting on whoever holds it. */
  days: number;
  /** Claimed by the signed-in officer. */
  self?: boolean;
}

export type QueueOwner = "anyone" | "me" | "unclaimed";

/* ── case history ────────────────────────────────────────────────────────── */

/** One item that travelled in a send-back, and what became of it. */
export interface HistoryItem {
  /** Field id, so clicking navigates back into the work. */
  ref: string;
  what: string;
  was: string;
  status: string;
  /** Still unresolved after the round trip. */
  open?: boolean;
}

export interface HistoryEvent {
  status: "past" | "current" | "future";
  title: string;
  meta: string;
  items?: HistoryItem[];
}

/* ── one case, assembled ─────────────────────────────────────────────────── */

/** The party names and provenance line the case bar prints. */
export interface CaseParty {
  complainant: string;
  accused: string;
  /** "Submitted 4 Jul 2026" — the provenance line under the title. */
  submitted: string;
  advocate: string;
}

/**
 * Everything one filing's workbench reads, in one object.
 *
 * The workbench used to import each of these from a module-level constant, which is why
 * only the single hand-authored case could open. Assembled per filing instead — the one
 * authored case returns its rich, hand-built content; every other filing returns content
 * derived from its queue row (`case.ts`) — the workbench is handed this and renders the
 * same regardless of which it got. Threaded through the tree by `ScrutinyCaseProvider`
 * rather than prop-drilled, since nine components below read from it.
 */
export interface ScrutinyCase {
  filing: Filing;
  party: CaseParty;
  sections: SectionDef[];
  allFields: FlatField[];
  fieldById: Record<string, FlatField>;
  bundle: BundleDoc[];
  docById: Record<string, BundleDoc>;
  /** Bundle doc id → the Evidence › Documents row that represents it. */
  docRow: Record<string, string>;
  /** Field id → simulated speech-to-text, for the voice-note affordance. */
  transcripts: Record<string, string>;
  /** The officer's standing checklist — cheque-shaped or civil, per the matter. */
  checks: string[];
  history: HistoryEvent[];
  historySummary: string;
  historyRound: number;
}

/**
 * The two lookups the pure state transitions need to resolve an id.
 *
 * Passed in rather than imported so `use-scrutiny-state.ts` and `field.ts` stay pure
 * functions of one case's data — the workbench builds this once from its `ScrutinyCase`,
 * and the unit tests pass the authored case's own maps.
 */
export interface ScrutinyLookups {
  fieldById: Record<string, FlatField>;
  docRow: Record<string, string>;
}

/* ── workbench chrome ────────────────────────────────────────────────────── */

export type BundleTool = "select" | "rect";
