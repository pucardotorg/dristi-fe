/**
 * The orders a court list can be read in — the shared half of every screen's Sort control
 * (`CourtSortSelect`, owner 2026-10-07: every court-side list gets filters *and* a sort).
 *
 * A screen declares its own options, each a label and a comparison, because what a list
 * is read by depends on the list: a queue by how long it has waited, a register by its
 * date, a cause list by its serial. What is shared is the vocabulary those options are
 * built from, so "Case number" orders the same way on every screen.
 *
 * Every sort is stable and falls back on the case number, so two rows that tie keep one
 * order between renders.
 */

export type CourtSortSpec<T, Id extends string = string> = {
  id: Id;
  label: string;
  compare: (a: T, b: T) => number;
};

/** "ST/1204/2026" → [2026, 1204]. Anything unparseable sorts as text, after the rest. */
function caseKey(value: string): [number, number] | null {
  const match = /(\d+)\D+(\d{4})\s*$/.exec(value);
  return match ? [Number(match[2]), Number(match[1])] : null;
}

/**
 * Case or filing numbers, oldest first: by year, then serial. The prefix (ST, CMP, KL) is
 * the register's, not an order, so it is ignored.
 */
export function compareCaseNumbers(a: string, b: string): number {
  const ka = caseKey(a);
  const kb = caseKey(b);
  if (ka && kb) return ka[0] - kb[0] || ka[1] - kb[1];
  if (ka) return -1;
  if (kb) return 1;
  return a.localeCompare(b);
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en-IN", { sensitivity: "base" });
}

/** ISO days compare as text; an empty day sorts last. */
export function compareDays(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

/** The rows in the asked order; an unknown id leaves them as they came. */
export function sortRows<T, Id extends string>(
  rows: readonly T[],
  specs: readonly CourtSortSpec<T, Id>[],
  id: Id,
): T[] {
  const spec = specs.find((option) => option.id === id);
  return spec ? [...rows].sort(spec.compare) : [...rows];
}

/** The `{ id, label }` pairs a `CourtSortSelect` takes. */
export function sortOptions<T, Id extends string>(
  specs: readonly CourtSortSpec<T, Id>[],
): { id: Id; label: string }[] {
  return specs.map(({ id, label }) => ({ id, label }));
}

type CaseRow = { caseNumber: string; parties: { complainant: string; accused: string } };

const title = (row: CaseRow) => `${row.parties.complainant} v. ${row.parties.accused}`;

/**
 * The three orders every case list shares: newest case first (the default where a list
 * has no clock of its own), oldest first, and by cause title.
 */
export function caseSorts<T extends CaseRow>(): CourtSortSpec<
  T,
  "newest" | "oldest" | "name"
>[] {
  return [
    {
      id: "newest",
      label: "Newest case first",
      compare: (a, b) => compareCaseNumbers(b.caseNumber, a.caseNumber),
    },
    {
      id: "oldest",
      label: "Oldest case first",
      compare: (a, b) => compareCaseNumbers(a.caseNumber, b.caseNumber),
    },
    {
      id: "name",
      label: "Case name, A to Z",
      compare: (a, b) =>
        compareText(title(a), title(b)) || compareCaseNumbers(a.caseNumber, b.caseNumber),
    },
  ];
}

/** A date order in both directions, tie-broken on the case number. */
export function daySorts<T extends { caseNumber: string }, Id extends string>(
  day: (row: T) => string | null | undefined,
  first: { id: Id; label: string; latest: boolean },
  second: { id: Id; label: string },
): CourtSortSpec<T, Id>[] {
  const asc = (a: T, b: T) =>
    compareDays(day(a), day(b)) || compareCaseNumbers(a.caseNumber, b.caseNumber);
  /* Latest first, but an empty day still goes last rather than leading the list. */
  const desc = (a: T, b: T) =>
    Number(!day(a)) - Number(!day(b)) ||
    compareDays(day(b), day(a)) ||
    compareCaseNumbers(a.caseNumber, b.caseNumber);
  return [
    { id: first.id, label: first.label, compare: first.latest ? desc : asc },
    { id: second.id, label: second.label, compare: first.latest ? asc : desc },
  ];
}
