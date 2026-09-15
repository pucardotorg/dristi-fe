import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  draftOrderHref,
  draftOrdersForSitting,
  hasOrderDrawnUp,
} from "./draft-orders";
import {
  hearingsForDay,
  withHearingSession,
  type CourtHearing,
} from "./hearings";
import { EMPTY_ORDER_DRAFT } from "./order-draft";
import { ORDERS_IN_PROGRESS } from "./order-demo";
import type { OrderDrafts } from "./order-drafts";

const TODAY = "2026-09-16";

type Session = {
  ongoingId: string | null;
  endedIds: ReadonlySet<string>;
  passedOverIds: ReadonlySet<string>;
};

const NO_SESSION: Session = {
  ongoingId: null,
  endedIds: new Set<string>(),
  passedOverIds: new Set<string>(),
};

function hearing(overrides: Partial<CourtHearing> = {}): CourtHearing {
  return {
    id: "h-1",
    item: 1,
    caseNumber: "ST/700/2026",
    stage: "evidence",
    parties: { complainant: "Sunil Varghese", accused: "Anand Traders" },
    counsel: [{ name: "Adv. Suresh Menon", side: "complainant" }],
    purpose: "evidence-of-complainant",
    status: "scheduled",
    ...overrides,
  };
}

/** The board as the screen hands it over: today's listings under this sitting's marks. */
function todaysBoard(session: Session = NO_SESSION): CourtHearing[] {
  return withHearingSession(hearingsForDay(TODAY, TODAY), session);
}

describe("draftOrdersForSitting", () => {
  it("leaves out a listing nobody has drawn an order on", () => {
    assert.deepEqual(draftOrdersForSitting([hearing()], {}), []);
  });

  it("takes a listing with an order started on it", () => {
    const drafts: OrderDrafts = { "h-1": EMPTY_ORDER_DRAFT };
    const rows = draftOrdersForSitting([hearing()], drafts);
    assert.deepEqual(
      rows.map((row) => row.id),
      ["h-1"],
    );
  });

  it("takes a finished sitting, which opens on a written order with no draft of its own", () => {
    const rows = draftOrdersForSitting([hearing({ status: "completed" })], {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "completed");
  });

  it("runs in the court's own serial order, not the board's", () => {
    const board = [
      hearing({ id: "h-c", item: 9, status: "completed" }),
      hearing({ id: "h-a", item: 2, status: "completed" }),
      hearing({ id: "h-b", item: 5, status: "completed" }),
    ];
    assert.deepEqual(
      draftOrdersForSitting(board, {}).map((row) => row.item),
      [2, 5, 9],
    );
  });

  it("reads the live status, so a matter ended a moment ago is on the list", () => {
    const board = withHearingSession([hearing()], {
      ...NO_SESSION,
      endedIds: new Set(["h-1"]),
    });
    const rows = draftOrdersForSitting(board, {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "completed");
  });

  it("leaves out a matter the bench is still hearing with nothing written on it", () => {
    const board = withHearingSession([hearing()], {
      ...NO_SESSION,
      ongoingId: "h-1",
    });
    assert.deepEqual(draftOrdersForSitting(board, {}), []);
  });

  it("keeps a draft that was then passed over, because the words are still there", () => {
    const board = withHearingSession([hearing()], {
      ...NO_SESSION,
      passedOverIds: new Set(["h-1"]),
    });
    const drafts: OrderDrafts = { "h-1": EMPTY_ORDER_DRAFT };
    assert.deepEqual(
      draftOrdersForSitting(board, drafts).map((row) => row.status),
      ["passed-over"],
    );
  });

  /**
   * The module's central claim, as a gate rather than a comment: this list holds exactly
   * the listings today's cause list marks as having an order on them — an order started,
   * or a sitting that finished. Those are the two facts `HearingOrdersButton` reads for
   * its own glyph (`drafted`, `recorded`), written here the way that component writes
   * them, so a change to either rule has to break this.
   */
  it("selects exactly the listings the cause list draws a plate or a tick on", () => {
    /* Three ids the fixture leaves scheduled, so the session marks below are the thing
       under test rather than a status the board already carried. */
    const board = todaysBoard({
      ...NO_SESSION,
      ongoingId: "h-249",
      endedIds: new Set(["h-244"]),
      passedOverIds: new Set(["h-246"]),
    });
    const drafts: OrderDrafts = {
      /* Started on a matter still to be called, on the one being heard, and on one that
         was deferred — every leg of the cause list's own `drafted` test. */
      "h-251": EMPTY_ORDER_DRAFT,
      "h-249": EMPTY_ORDER_DRAFT,
      "h-246": EMPTY_ORDER_DRAFT,
    };
    const expected = board
      .filter((entry) => {
        const drafted = Boolean(drafts[entry.id]);
        const recorded = entry.status === "completed";
        return drafted || recorded;
      })
      .map((entry) => entry.id);
    assert.deepEqual(
      draftOrdersForSitting(board, drafts).map((row) => row.id),
      expected,
    );
    /* And it is not vacuous: the board has rows on both sides of the rule. */
    assert.ok(expected.length > 0 && expected.length < board.length);
  });

  it("opens on enough of the day's work to read as a queue", () => {
    const rows = draftOrdersForSitting(todaysBoard(), ORDERS_IN_PROGRESS);
    /* The owner's floor for the prototype: the tab has to hold a morning's work on a
       cold load, not the one row a fixture-completed listing leaves behind. */
    assert.ok(
      rows.length >= 10,
      `the draft queue opens on ${rows.length} rows, fewer than 10`,
    );
    /* Both states the Orders column can draw, so the column carries information rather
       than one repeated glyph: a started draft takes the plate, and a listing whose
       order is only the one its finished sitting carries takes the tick. */
    const started = rows.filter((row) => ORDERS_IN_PROGRESS[row.id]);
    const recordedOnly = rows.filter((row) => !ORDERS_IN_PROGRESS[row.id]);
    assert.ok(started.length > 0 && recordedOnly.length > 0);
    /* And every row reads as a matter this court has actually called. An order is drawn
       up at a sitting, so a row here saying "Scheduled" would be claiming an order on a
       matter nobody had reached (owner, 2026-09-16). */
    for (const row of rows) {
      assert.equal(
        row.status,
        "completed",
        `${row.id} has an order on it but has not been heard`,
      );
    }
    /* And a spread of purposes, so the Purpose column is not one word repeated. */
    assert.ok(new Set(rows.map((row) => row.purpose)).size >= 5);
  });

  it("every opening draft names a listing this court has heard", () => {
    const board = todaysBoard();
    for (const id of Object.keys(ORDERS_IN_PROGRESS)) {
      const listing = board.find((entry) => entry.id === id);
      assert.ok(
        listing,
        `${id} has an opening draft but is not on today's cause list`,
      );
      assert.equal(
        listing.status,
        "completed",
        `${id} has an opening draft but its sitting has not happened`,
      );
    }
  });

  it("leaves the board something still to be called", () => {
    const stillListed = todaysBoard().filter(
      (entry) => entry.status === "scheduled",
    );
    /* Start hearing has to have somewhere to land: a board with nothing scheduled would
       take the cause list's own act off the screen. */
    assert.ok(stillListed.length >= 5);
  });
});

describe("hasOrderDrawnUp", () => {
  it("is the two facts the cause list marks, and nothing else", () => {
    assert.equal(hasOrderDrawnUp(hearing(), {}), false);
    assert.equal(hasOrderDrawnUp(hearing({ status: "completed" }), {}), true);
    assert.equal(
      hasOrderDrawnUp(hearing(), { "h-1": EMPTY_ORDER_DRAFT }),
      true,
    );
  });
});

describe("draftOrderHref", () => {
  it("points at the composer that owns the words", () => {
    assert.equal(
      draftOrderHref({ id: "h-254" }),
      "/employee/hearings/h-254/order",
    );
  });
});

describe("ORDERS_IN_PROGRESS", () => {
  it("is a draft the live composer could have produced, not a screenshot", () => {
    for (const [id, draft] of Object.entries(ORDERS_IN_PROGRESS)) {
      /* Somebody took the roll — the one thing every seeded draft has done. */
      assert.ok(
        Object.keys(draft.marks).length > 0,
        `${id} carries no attendance`,
      );
      /* None of them has posted the matter on: that is what still-being-written means,
         and it is what keeps the fixture free of today's date. */
      assert.equal(draft.nextDate, null, `${id} already carries a next date`);
      /* No standing `[Token]` left in the words. An item past the first opens on raw
         template text, which is why the seed stops at the one that is already prose. */
      assert.ok(
        !draft.body.text.includes("["),
        `${id} has an unfilled token in its order`,
      );
    }
  });
});
