import type { CauseListRow } from "./home";

export type CauseListGroupBy = "item" | "court" | "hearingType";

/** Group only the current filtered scope; numeric item ordering works beyond 9.
 * "court" groups by the court itself (its name), not by court number. */
export function groupCauseList(rows: readonly CauseListRow[], by: CauseListGroupBy, locale = "en-IN") {
  const grouped = new Map<string, CauseListRow[]>();
  const keyOf = (row: CauseListRow) => (by === "court" ? row.courtLabel : String(row[by]));
  const compareCourt = (a: CauseListRow, b: CauseListRow) =>
    a.courtLabel.localeCompare(b.courtLabel, locale, { numeric: true }) ||
    a.court.localeCompare(b.court, locale);
  const sorted = [...rows].sort((a, b) =>
    (by === "item" ? a.item - b.item : by === "court" ? compareCourt(a, b) : a.hearingType.localeCompare(b.hearingType, locale)) ||
    a.item - b.item || compareCourt(a, b) || a.id.localeCompare(b.id)
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
