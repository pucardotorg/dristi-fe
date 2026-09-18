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
 * Coordinates are in the facsimile's own drawing grid — the `0 0 60 80` space every
 * `*Sheet` lays its marks in (`page-facsimile.tsx`) — not per-cent of the frame. A zone is
 * therefore read straight off the marks it points at (the cheque's date boxes are drawn at
 * x≈36, so the date zone is at x≈35), and it stays correct when the frame is cropped to the
 * kind's `SHEET_BOX`: the scroller converts these grid units to a per-cent rect against that
 * box at render time. Before, zones were per-cent of a fixed 3:4 frame and drifted the
 * moment the frame stopped being the whole page.
 */
export type ZoneRect = { x: number; y: number; w: number; h: number };

/**
 * The named regions of each kind of page, in the grid `PageSheet` draws them in.
 *
 * `page` is every kind's fallback — the frame of the document's own content — used whenever
 * a fact's slot has no more specific home. Each `page` matches the kind's `SHEET_BOX`.
 */
const ZONES: Record<CaseDocumentKind, Partial<Record<string, ZoneRect>>> = {
  cheque: {
    bank: { x: 7, y: 9.5, w: 18, h: 4 },
    date: { x: 35, y: 9.5, w: 20, h: 4 },
    payee: { x: 7, y: 15, w: 32, h: 3.5 },
    amount: { x: 38, y: 17, w: 15, h: 6 },
    signature: { x: 37, y: 24, w: 16, h: 6 },
    number: { x: 7, y: 29, w: 46, h: 3 },
    page: { x: 5, y: 8, w: 50, h: 24 },
  },
  memo: {
    bank: { x: 9, y: 9.5, w: 20, h: 4 },
    date: { x: 23, y: 15.5, w: 24, h: 4.5 },
    reason: { x: 23, y: 27, w: 26, h: 6 },
    page: { x: 7, y: 7, w: 46, h: 48 },
  },
  letter: {
    date: { x: 26, y: 5.5, w: 28, h: 5 },
    body: { x: 7, y: 12, w: 46, h: 52 },
    signature: { x: 37, y: 68, w: 16, h: 6 },
    page: { x: 6, y: 5, w: 48, h: 68 },
  },
  id: {
    photo: { x: 12, y: 14, w: 13, h: 15 },
    name: { x: 25, y: 15, w: 24, h: 6 },
    address: { x: 25, y: 22, w: 24, h: 8 },
    page: { x: 10, y: 8, w: 40, h: 55 },
  },
  form: {
    heading: { x: 15, y: 5, w: 30, h: 5 },
    table: { x: 7, y: 18, w: 46, h: 34 },
    page: { x: 6, y: 5, w: 48, h: 62 },
  },
  receipt: {
    heading: { x: 18, y: 6, w: 26, h: 5 },
    rows: { x: 7, y: 16, w: 46, h: 28 },
    total: { x: 7, y: 46, w: 46, h: 5 },
    page: { x: 6, y: 6, w: 48, h: 60 },
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
