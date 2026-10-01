import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSittingDay } from "./hearings";
import {
  addDays,
  boardAfterMoves,
  rescheduledDays,
  buildRescheduleOrder,
  earliestNewListing,
  filterReschedulable,
  listedOn,
  reschedulableHearings,
  rescheduleOrderText,
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

describe("a board with this session's moves written over it", () => {
  const board = reschedulableHearings(TODAY);
  const first = board[0];
  const NEW_DAY = addDays(TODAY, 60);
  const moved = boardAfterMoves(TODAY, { [first.id]: NEW_DAY });
  const row = moved.find((candidate) => candidate.id === first.id)!;

  it("keeps the day the matter was listed on beside the day it moves to", () => {
    /* Both ends, because the board has to show the bench what it just did. Writing the
       new day over the old one leaves a move with nothing to compare against. */
    assert.equal(row.date, first.date);
    assert.equal(row.newDate, NEW_DAY);
    assert.equal(listedOn(row), NEW_DAY);
  });

  it("leaves every other matter alone, and unmarked", () => {
    const untouched = moved.filter((candidate) => candidate.id !== first.id);
    assert.equal(untouched.length, board.length - 1);
    assert.ok(untouched.every((candidate) => candidate.newDate === undefined));
  });

  it("re-sorts the moved matter into the day it now sits on", () => {
    /* A matter moved two months out belongs at the end of the board, not in the block
       it was pulled from. */
    assert.equal(moved[moved.length - 1].id, first.id);
  });

  it("does not mark a move onto the day the matter is already on", () => {
    const same = boardAfterMoves(TODAY, { [first.id]: first.date });
    assert.equal(same.find((c) => c.id === first.id)!.newDate, undefined);
  });

  it("splits cleanly into what is still to move and what moved", () => {
    /* The two tabs are this one fact read twice. A row belongs to exactly one of them,
       and every row belongs to one — so nothing can go missing between them however the
       range is drawn. */
    const unscheduled = moved.filter((row) => row.newDate === undefined);
    const scheduled = moved.filter((row) => row.newDate !== undefined);

    assert.equal(unscheduled.length + scheduled.length, moved.length);
    assert.deepEqual(
      scheduled.map((row) => row.id),
      [first.id],
    );
    assert.ok(!unscheduled.some((row) => row.id === first.id));
  });

  it("judges a moved matter on the day it now sits on, not the one it left", () => {
    /* The board is the list of what is still to move, so a matter that has moved leaves
       the span it was picked from. Seeing what was done is the Scheduled tab's job, and
       that tab is not filtered at all — which is the whole point: a range narrowed to
       find the next eight matters must not erase the three already moved. */
    const span = { from: first.date, to: first.date, query: "" };
    const inRange = filterReschedulable(moved, span);

    assert.ok(!inRange.some((candidate) => candidate.id === first.id));
    assert.ok(NEW_DAY > span.to, "the new day is outside the span, as it must be");
  });

  it("also pulls in a matter moved into the span from outside it", () => {
    const span = { from: NEW_DAY, to: NEW_DAY, query: "" };
    const inRange = filterReschedulable(moved, span);

    assert.deepEqual(
      inRange.map((candidate) => candidate.id),
      [first.id],
    );
  });

  it("floors a second move on where the matter now stands", () => {
    /* Not on the day it was listed on — that day is behind the court once the first
       move has landed, and the calendar would offer it again. */
    assert.equal(
      earliestNewListing([row], null, TODAY),
      addDays(NEW_DAY, 1),
    );
  });
});

describe("the order a bulk move is passed by", () => {
  const board = reschedulableHearings(TODAY);
  const moving = board.slice(0, 3);
  const NEW_DAY = addDays(TODAY, 4);

  it("covers every matter in the run, from where it is to where it goes", () => {
    const order = buildRescheduleOrder(moving, NEW_DAY, TODAY);

    assert.equal(order.matters.length, moving.length);
    assert.deepEqual(
      order.matters.map((matter) => matter.caseNumber),
      moving.map((row) => row.caseNumber),
    );
    /* One order for the whole run, so every line lands on the same new day. */
    assert.equal(new Set(order.matters.map((m) => m.to)).size, 1);
  });

  it("says it is unsigned until it is signed, and by whom when it is", () => {
    /* The blank-rule trap: a signature block that printed nothing would read as a
       signature that failed to render rather than as one that has not been given. */
    const unsigned = buildRescheduleOrder(moving, NEW_DAY, TODAY);
    assert.match(unsigned.signature, /Pending the signature/);

    const signed = buildRescheduleOrder(moving, NEW_DAY, TODAY, TODAY);
    assert.match(signed.signature, /^Signed by /);
    assert.doesNotMatch(signed.signature, /Pending/);
  });

  it("recites no ground, and orders nothing at the parties", () => {
    /* The screen never asks why the court is not sitting, and this build sends no
       notification. An order that said either would be the app writing the bench's
       words, or claiming an act nothing performed. */
    const text = rescheduleOrderText(
      buildRescheduleOrder(moving, NEW_DAY, TODAY, TODAY),
    );
    assert.doesNotMatch(text, /leave|holiday|transfer|strike/i);
    assert.doesNotMatch(text, /notif|inform|intimat|serve/i);
  });

  it("writes the matters, the new date and the date it is passed", () => {
    const text = rescheduleOrderText(
      buildRescheduleOrder(moving, NEW_DAY, TODAY),
    );

    assert.match(text, /Order rescheduling listed hearings/);
    assert.match(text, new RegExp(`Matters \\(${moving.length}\\)`));
    for (const row of moving) assert.ok(text.includes(row.caseNumber));
    assert.match(text, /Dated this the /);
  });

  it("reads a matter this session already moved from where it now stands", () => {
    /* A second move is measured from the day the first one put it on, not from the
       fixture's day — otherwise the order would recite a date the board left behind. */
    const first = board[0];
    const once = boardAfterMoves(TODAY, { [first.id]: addDays(TODAY, 2) })
      .find((row) => row.id === first.id)!;
    const order = buildRescheduleOrder([once], addDays(TODAY, 9), TODAY);
    const asListed = buildRescheduleOrder(
      [{ ...first, date: addDays(TODAY, 2) }],
      addDays(TODAY, 9),
      TODAY,
    );

    assert.equal(order.matters[0].from, asListed.matters[0].from);
    assert.notEqual(
      order.matters[0].from,
      buildRescheduleOrder([first], addDays(TODAY, 9), TODAY).matters[0].from,
    );
  });
});

describe("the board the prototype opens on", () => {
  /* A Monday, so every weekday in the window is reachable from it. */
  const MONDAY = "2026-09-14";
  const board = reschedulableHearings(MONDAY);

  it("lists nothing on a day the court is closed", () => {
    const closed = board.map((row) => row.date).filter((day) => !isSittingDay(day));

    assert.deepEqual([...new Set(closed)], [], "a listing on a Saturday or a Sunday");
  });

  it("lists something on every one of the next forty sittings", () => {
    const listed = new Set(board.map((row) => row.date));
    const missing: string[] = [];
    let day = MONDAY;

    for (let sitting = 1; sitting <= 40; sitting += 1) {
      do {
        day = addDays(day, 1);
      } while (!isSittingDay(day));
      if (!listed.has(day)) missing.push(day);
    }

    assert.deepEqual(missing, [], "a sitting day with nothing to move");
  });

  it("gives the same board twice, so a row can be pointed at", () => {
    assert.deepEqual(reschedulableHearings(MONDAY), board);
  });

  it("gives every matter its own case number", () => {
    const numbers = board.map((row) => row.caseNumber);
    assert.equal(numbers.length, new Set(numbers).size, "two matters share a number");
  });
});

describe("the record of a session's moves", () => {
  const board = reschedulableHearings(TODAY);
  const SOON = addDays(TODAY, 3);
  const LATER = addDays(TODAY, 30);

  /* Two acts in one afternoon, the way a court actually works it: a day's board to one
     date, and then a later stretch to another. */
  const moved = boardAfterMoves(TODAY, {
    [board[0].id]: SOON,
    [board[1].id]: SOON,
    [board[2].id]: LATER,
  });
  const scheduled = moved.filter((row) => row.newDate !== undefined);

  it("names every day moved to, ascending, with what went there", () => {
    assert.deepEqual(rescheduledDays(scheduled), [
      { day: SOON, count: 2 },
      { day: LATER, count: 1 },
    ]);
  });

  it("counts a matter once, and counts only the ones that moved", () => {
    const days = rescheduledDays(moved);

    assert.deepEqual(days, rescheduledDays(scheduled), "the board's unmoved rows count");
    assert.equal(
      days.reduce((total, day) => total + day.count, 0),
      scheduled.length,
    );
  });

  it("survives a range drawn somewhere else entirely", () => {
    /* The bug this was written for: move three matters, then narrow the board to the
       fortnight after to find the next eight, and the record read zero. The filters are
       the board's; the record is not filtered. */
    const elsewhere = { from: addDays(TODAY, 40), to: addDays(TODAY, 50), query: "" };
    assert.equal(filterReschedulable(moved, elsewhere).length < moved.length, true);
    assert.equal(rescheduledDays(scheduled).length, 2);
  });

  it("gives nothing back before anything has moved", () => {
    assert.deepEqual(rescheduledDays(board), []);
  });

  it("offers one day when one act moved everything to it", () => {
    const onePlace = boardAfterMoves(TODAY, {
      [board[0].id]: SOON,
      [board[1].id]: SOON,
    });
    assert.deepEqual(rescheduledDays(onePlace), [{ day: SOON, count: 2 }]);
  });
});
