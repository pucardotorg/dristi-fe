/**
 * Column filters a court list adds beside its search — the Filters sheet's fields, as data.
 *
 * Most court queues began with one search box over the case; the owner asked for each to
 * carry the filters its own columns invite (2026-10-07). Each screen declares those as a
 * list — a label, the options, and the test a row has to pass — and this turns them into
 * `CourtFilters` fields and back into a narrowed list, so the plumbing is written once.
 *
 * Every filter is single-select with an "all" value, the shape `CourtFilters` folds.
 */

export const ALL = "all";

export type ColumnFilter<T> = {
  id: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
};

export type ColumnFilterValues = Readonly<Record<string, string>>;

export function emptyColumnFilters<T>(filters: readonly ColumnFilter<T>[]): ColumnFilterValues {
  return Object.fromEntries(filters.map((filter) => [filter.id, ALL]));
}

export function hasColumnFilters(values: ColumnFilterValues): boolean {
  return Object.values(values).some((value) => value !== ALL);
}

export function applyColumnFilters<T>(
  rows: readonly T[],
  filters: readonly ColumnFilter<T>[],
  values: ColumnFilterValues,
): T[] {
  return rows.filter((row) =>
    filters.every((filter) => {
      const value = values[filter.id] ?? ALL;
      return value === ALL || filter.test(row, value);
    }),
  );
}

/** The `CourtFilters` fields for these filters (structurally `CourtFilterField[]`). */
export function columnFilterFields<T>(
  filters: readonly ColumnFilter<T>[],
  values: ColumnFilterValues,
  onApply: (id: string, value: string) => void,
) {
  return filters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    value: values[filter.id] ?? ALL,
    all: ALL,
    allLabel: filter.allLabel,
    options: filter.options,
    onApply: (value: string) => onApply(filter.id, value),
  }));
}
