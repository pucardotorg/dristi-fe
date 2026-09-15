import type { CauseListRow } from "./home";

export type CauseListGroupBy = "item" | "court" | "hearingType" | "status";

/** Status groups read most-active first: ongoing, then listed, then completed. */
const STATUS_ORDER: Record<string, number> = { now: 0, upcoming: 1, concluded: 2 };

/** Group only the current filtered scope; numeric item ordering works beyond 9.
 * "court" groups by the court itself (its name), not by court number. */
export function groupCauseList(rows: readonly CauseListRow[], by: CauseListGroupBy, locale = "en-IN") {
  const grouped = new Map<string, CauseListRow[]>();
  const keyOf = (row: CauseListRow) => (by === "court" ? row.courtLabel : String(row[by]));
  const compareCourt = (a: CauseListRow, b: CauseListRow) =>
    a.courtLabel.localeCompare(b.courtLabel, locale, { numeric: true }) ||
    a.court.localeCompare(b.court, locale);
  const compareStatus = (a: CauseListRow, b: CauseListRow) =>
    (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  const primary = (a: CauseListRow, b: CauseListRow) =>
    by === "item" ? a.item - b.item :
    by === "court" ? compareCourt(a, b) :
    by === "status" ? compareStatus(a, b) :
    a.hearingType.localeCompare(b.hearingType, locale);
  const sorted = [...rows].sort((a, b) =>
    primary(a, b) || a.item - b.item || compareCourt(a, b) || a.id.localeCompare(b.id)
  );
  for (const row of sorted) {
    const key = keyOf(row);
    const items = grouped.get(key) ?? [];
    items.push(row);
    grouped.set(key, items);
  }
  return [...grouped].map(([key, items]) => ({ key, rows: items }));
}

export function searchCauseList(rows: readonly CauseListRow[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [...rows];
  return rows.filter((row) =>
    [row.parties, row.caseNumber, row.advocates, row.courtLabel, String(row.courtNumber ?? ""), row.hearingType]
      .some((value) => value.toLocaleLowerCase().includes(q)) || String(row.item) === q
  );
}
