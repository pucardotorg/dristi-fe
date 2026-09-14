import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  filterReschedulable,
  reschedulableHearings,
} from "./bulk-reschedule";

const TODAY = "2026-09-14";
const span = (from: string | null, to: string | null) => ({
  from,
  to,
  query: "",
});

describe("the board a bulk move is drawn over", () => {
  it("reaches far enough ahead for a range to be worth asking for", () => {
    /* It used to stop nine days out, and a filter whose every useful span selected the
       whole screen reads as a control that does not work. A month is the shortest span
       a court on leave asks for, so the board has to outlast one. */
    const board = reschedulableHearings(TODAY);
    const last = board.reduce((a, row) => (row.date > a ? row.date : a), "");
    assert.ok(
      last > addDays(TODAY, 30),
      `board stops at ${last}, inside a month of ${TODAY}`,
    );
  });
});

describe("filterReschedulable", () => {
  const board = reschedulableHearings(TODAY);

  it("gives the whole board back when neither end is asked for", () => {
    assert.equal(
      filterReschedulable(board, span(null, null)).length,
      board.length,
    );
  });

  it("narrows as the span narrows, and both ends are inclusive", () => {
    const week = filterReschedulable(board, span(TODAY, addDays(TODAY, 6)));
    const month = filterReschedulable(board, span(TODAY, addDays(TODAY, 29)));
    const oneDay = filterReschedulable(board, span(TODAY, TODAY));

    assert.ok(oneDay.length > 0, "nothing listed on the day the court is on");
    assert.ok(oneDay.length < week.length);
    assert.ok(week.length < month.length);
    assert.ok(month.length < board.length, "a month is the whole board again");

    assert.ok(oneDay.every((row) => row.date === TODAY));
    assert.ok(week.every((row) => row.date <= addDays(TODAY, 6)));
  });

  it("treats one end alone as one bound, not as a span", () => {
    const from = filterReschedulable(board, span(addDays(TODAY, 20), null));
    assert.ok(from.length > 0);
    assert.ok(from.every((row) => row.date >= addDays(TODAY, 20)));
    assert.ok(from.length < board.length);
  });

  it("matches the query against the cause title and the case number", () => {
    const byNumber = filterReschedulable(board, {
      ...span(null, null),
      query: "ST/276",
    });
    assert.equal(byNumber.length, 1);
    assert.match(byNumber[0].title, /Zainaba Musthafa/);

    const byName = filterReschedulable(board, {
      ...span(null, null),
      query: "zainaba musthafa",
    });
    assert.deepEqual(byName, byNumber);
  });

  it("applies the span and the query together", () => {
    /* The matter is on the board, but outside the week — a search inside a span does
       not reach past it. */
    const rows = filterReschedulable(board, {
      ...span(TODAY, addDays(TODAY, 6)),
      query: "zainaba musthafa",
    });
    assert.equal(rows.length, 0);
  });
});
