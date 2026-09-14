import type { CaseDocumentKind } from "./case-review";

/**
 * Where on a facsimile a fact was read from — the region the scroller marks when a row is
 * clicked, in the scrutiny bundle's grammar (`scrutiny/bundle-view.tsx` draws the same
 * halo over an evidence rect).
 *
 * **The regions are approximate, and honestly so.** A facsimile is our own drawing of a
 * *kind* of page (`page-facsimile.tsx`), not a scan of this complaint's actual document,
 * so a zone points at where that field sits on the drawing — the amount box on a cheque,
 * the address block on an ID card — not at a place on a real image. That is the most a
 * generic facsimile can mark, and it is enough for the reader to see *which part* of the
 * page a value comes from. When a fact has no zone that fits, the whole page is ringed
 * instead (`null`), which is never wrong.
 *
 * Coordinates are per-cent of the facsimile box, which is `viewBox="0 0 60 80"` at a 3:4
 * aspect — the same ratio the scroller renders the page in — so a percentage rect lands on
 * the drawing without any scaling maths.
 */
export type ZoneRect = { x: number; y: number; w: number; h: number };

/**
 * The named regions of each kind of page, aligned to where `PageSheet` draws them.
 *
 * `page` is every kind's fallback — the frame of the document's own content, minus the
 * scan margin — used whenever a fact's slot has no more specific home.
 */
const ZONES: Record<CaseDocumentKind, Partial<Record<string, ZoneRect>>> = {
  cheque: {
    bank: { x: 11, y: 10, w: 34, h: 6 },
    date: { x: 58, y: 11, w: 32, h: 6 },
    payee: { x: 12, y: 18, w: 52, h: 5 },
    amount: { x: 63, y: 20, w: 26, h: 8 },
    signature: { x: 60, y: 30, w: 28, h: 8 },
    number: { x: 11, y: 35, w: 78, h: 5 },
    page: { x: 6, y: 8, w: 84, h: 33 },
  },
  memo: {
    bank: { x: 15, y: 10, w: 42, h: 5 },
    date: { x: 38, y: 21, w: 50, h: 5 },
    reason: { x: 38, y: 38, w: 50, h: 6 },
    page: { x: 10, y: 8, w: 80, h: 47 },
  },
  letter: {
    date: { x: 26, y: 5, w: 50, h: 7 },
    body: { x: 9, y: 15, w: 82, h: 40 },
    signature: { x: 58, y: 84, w: 30, h: 8 },
    page: { x: 6, y: 5, w: 88, h: 86 },
  },
  id: {
    photo: { x: 20, y: 17, w: 20, h: 22 },
    name: { x: 42, y: 18, w: 45, h: 6 },
    address: { x: 42, y: 27, w: 46, h: 11 },
    page: { x: 14, y: 9, w: 72, h: 33 },
  },
  form: {
    heading: { x: 25, y: 5, w: 50, h: 7 },
    table: { x: 10, y: 21, w: 80, h: 45 },
    page: { x: 6, y: 5, w: 88, h: 82 },
  },
  receipt: {
    heading: { x: 25, y: 6, w: 50, h: 7 },
    rows: { x: 10, y: 19, w: 80, h: 40 },
    total: { x: 9, y: 58, w: 82, h: 6 },
    page: { x: 6, y: 7, w: 88, h: 72 },
  },
};

/**
 * Which slot a fact belongs to, from the name the court gives it.
 *
 * A classifier over the term rather than a field on every fact: the terms are already the
 * attributes' own names (`case-review.ts`, `cognizance.ts`), so a date reads as a date and
 * a branch as a bank wherever it appears, and a fact nobody has classified falls through
 * to the page. Order matters — the more specific test wins.
 */
function slotForTerm(term: string): string {
  const t = term.toLowerCase();
  if (/reason for return|return reason/.test(t)) return "reason";
  if (/amount/.test(t)) return "amount";
  if (/\b(bank|branch|ifsc|jurisdiction)\b/.test(t)) return "bank";
  if (/cheque number|\bnumber\b/.test(t)) return "number";
  if (/address/.test(t)) return "address";
  if (/\bname\b/.test(t)) return "name";
  if (/photo|id proof|photograph/.test(t)) return "photo";
  if (
    /date|dated|presented|deposit|returned|informed|served|dispatch|delivery|filing|filed/.test(
      t,
    )
  ) {
    return "date";
  }
  return "page";
}

/**
 * The region to mark for a fact read off a given kind of page — or `null` to ring the
 * whole page when the kind has no zone that fits the fact's slot.
 */
export function zoneFor(
  kind: CaseDocumentKind,
  term: string,
): ZoneRect | null {
  const zones = ZONES[kind] ?? {};
  return zones[slotForTerm(term)] ?? zones.page ?? null;
}
