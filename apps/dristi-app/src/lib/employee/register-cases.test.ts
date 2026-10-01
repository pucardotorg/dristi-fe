import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMPTY_REGISTER_FILTERS,
  REGISTER_QUEUE,
  filterRegisterCases,
  formatDaysSinceSubmitted,
  formatDaysWaiting,
} from "./register-cases";

describe("REGISTER_QUEUE", () => {
  it("is long enough to page, and longest wait first", () => {
    assert.equal(REGISTER_QUEUE.length, 35);
    const waits = REGISTER_QUEUE.map((row) => row.daysSinceSubmitted);
    assert.deepEqual(
      waits,
      [...waits].sort((a, b) => b - a),
    );
  });
});

describe("filterRegisterCases", () => {
  it("returns the queue unchanged when the query is empty", () => {
    const rows = filterRegisterCases(REGISTER_QUEUE, EMPTY_REGISTER_FILTERS);
    assert.equal(rows.length, REGISTER_QUEUE.length);
  });

  it("matches a cause, a number, or an advocate", () => {
    assert.equal(
      filterRegisterCases(REGISTER_QUEUE, { query: "cashew" }).length,
      1,
    );
    assert.equal(
      filterRegisterCases(REGISTER_QUEUE, { query: "KL-000210-2026" })[0]?.id,
      "r-210",
    );
    assert.equal(
      filterRegisterCases(REGISTER_QUEUE, { query: "nisha" })[0]?.id,
      "r-612",
    );
  });

  it("treats surrounding spaces as no query", () => {
    const rows = filterRegisterCases(REGISTER_QUEUE, { query: "  " });
    assert.equal(rows.length, REGISTER_QUEUE.length);
  });
});

describe("formatDaysWaiting", () => {
  it("is the number the column header already names", () => {
    assert.equal(formatDaysWaiting(281), "281");
  });
});

describe("formatDaysSinceSubmitted", () => {
  it("spells the unit when there is no column header", () => {
    assert.equal(formatDaysSinceSubmitted(1), "1 day since submitted");
    assert.equal(formatDaysSinceSubmitted(281), "281 days since submitted");
  });
});
