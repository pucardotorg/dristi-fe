import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  caseSorts,
  compareCaseNumbers,
  daySorts,
  sortOptions,
  sortRows,
} from "./court-sort";
import {
  applyColumnFilters,
  columnFilterFields,
  emptyColumnFilters,
  hasColumnFilters,
  type ColumnFilter,
} from "./court-column-filters";

const row = (caseNumber: string, complainant: string, day: string | null = null) => ({
  caseNumber,
  parties: { complainant, accused: "X" },
  day,
});

describe("compareCaseNumbers", () => {
  it("orders by year, then serial, ignoring the register prefix", () => {
    const sorted = ["ST/12/2026", "CMP/900/2025", "ST/3/2026", "KL-001629-2025"].sort(
      compareCaseNumbers,
    );
    assert.deepEqual(sorted, ["CMP/900/2025", "KL-001629-2025", "ST/3/2026", "ST/12/2026"]);
  });
});

describe("caseSorts", () => {
  const rows = [row("ST/2/2026", "Beena"), row("ST/10/2026", "Anil"), row("ST/1/2025", "Chacko")];
  const specs = caseSorts<(typeof rows)[number]>();

  it("orders newest, oldest and by cause title", () => {
    assert.deepEqual(sortRows(rows, specs, "newest").map((r) => r.caseNumber), [
      "ST/10/2026",
      "ST/2/2026",
      "ST/1/2025",
    ]);
    assert.deepEqual(sortRows(rows, specs, "oldest").map((r) => r.caseNumber), [
      "ST/1/2025",
      "ST/2/2026",
      "ST/10/2026",
    ]);
    assert.deepEqual(sortRows(rows, specs, "name").map((r) => r.parties.complainant), [
      "Anil",
      "Beena",
      "Chacko",
    ]);
  });

  it("does not reorder the input", () => {
    const before = rows.map((r) => r.caseNumber);
    sortRows(rows, specs, "name");
    assert.deepEqual(rows.map((r) => r.caseNumber), before);
  });

  it("exposes id and label only to the control", () => {
    assert.deepEqual(Object.keys(sortOptions(specs)[0]).sort(), ["id", "label"]);
  });
});

describe("daySorts", () => {
  const rows = [row("ST/1/2026", "A", "2026-09-02"), row("ST/2/2026", "B", null), row("ST/3/2026", "C", "2026-09-05")];
  const specs = daySorts<(typeof rows)[number], "late" | "early">(
    (r) => r.day,
    { id: "late", label: "Latest", latest: true },
    { id: "early", label: "Earliest" },
  );

  it("keeps an empty day last in both directions", () => {
    assert.deepEqual(sortRows(rows, specs, "late").map((r) => r.day), ["2026-09-05", "2026-09-02", null]);
    assert.deepEqual(sortRows(rows, specs, "early").map((r) => r.day), ["2026-09-02", "2026-09-05", null]);
  });
});

describe("column filters", () => {
  type Row = { kind: string };
  const filters: ColumnFilter<Row>[] = [
    { id: "kind", label: "Kind", allLabel: "All", options: [], test: (r, v) => r.kind === v },
  ];
  const rows: Row[] = [{ kind: "a" }, { kind: "b" }];

  it("starts empty and narrows only when a value is set", () => {
    const empty = emptyColumnFilters(filters);
    assert.equal(hasColumnFilters(empty), false);
    assert.equal(applyColumnFilters(rows, filters, empty).length, 2);
    assert.deepEqual(applyColumnFilters(rows, filters, { kind: "b" }), [{ kind: "b" }]);
    assert.equal(hasColumnFilters({ kind: "b" }), true);
  });

  it("hands CourtFilters a field that applies back by id", () => {
    let applied: [string, string] | null = null;
    const [field] = columnFilterFields(filters, { kind: "all" }, (id, value) => {
      applied = [id, value];
    });
    assert.equal(field.all, "all");
    field.onApply("a");
    assert.deepEqual(applied, ["kind", "a"]);
  });
});
