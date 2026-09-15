import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAUSE_LIST, parseIsoDay } from "./hearings";
import { applicationsForListing } from "./listing-applications";
import { appearancesFor, assembleOrder } from "./order-draft";
import { initialOrderDraft, nextSittingDay } from "./order-demo";

const today = "2026-09-07";
const hearing = CAUSE_LIST[0];

describe("initialOrderDraft", () => {
  it("leaves a listing that has not been heard empty", () => {
    for (const status of ["scheduled", "ongoing", "passed-over"] as const) {
      const draft = initialOrderDraft(hearing, status, today);
      assert.deepEqual(draft.items, []);
      assert.deepEqual(draft.marks, {});
      assert.equal(draft.nextDate, null);
    }
  });

  it("opens a completed listing on a written order", () => {
    const draft = initialOrderDraft(hearing, "completed", today);
    assert.ok(draft.items.length > 0);
    assert.ok(draft.items.every((item) => item.text.text.length > 0));
    assert.ok(
      draft.items.every((item) => item.text.html.includes(item.text.text)),
    );
    assert.equal(draft.next, "list");
    assert.ok(draft.nextPurpose);
    assert.ok(draft.nextDate);
  });

  it("marks every appearance on the roll, and nobody who is not on it", () => {
    const draft = initialOrderDraft(hearing, "completed", today);
    const roll = appearancesFor(hearing).map((appearance) => appearance.id);
    assert.deepEqual(Object.keys(draft.marks).sort(), [...roll].sort());
    assert.ok(Object.values(draft.marks).every((mark) => mark === "present"));
  });

  it("answers every application that was pending on the listing", () => {
    const withApplications = CAUSE_LIST.find(
      (row) => applicationsForListing(row.id).length > 0,
    );
    assert.ok(withApplications);
    const draft = initialOrderDraft(withApplications, "completed", today);
    for (const application of applicationsForListing(withApplications.id)) {
      assert.equal(draft.applications[application.id], "allowed");
    }
  });

  /* Two items on a cognizance listing — the finding and the process that follows it —
     because the reference's own Add item says an order can carry more than one, and this
     is the listing where a court plainly does. */
  it("gives a cognizance listing the finding and the summons", () => {
    const cognizance = CAUSE_LIST.find((row) => row.purpose === "cognizance");
    assert.ok(cognizance);
    const draft = initialOrderDraft(cognizance, "completed", today);
    assert.deepEqual(
      draft.items.map((item) => item.type),
      ["cognizance", "issue-of-summons"],
    );
    assert.match(draft.items[1].text.text, /^Issue summons to /);
    /* The party is a slot, not a name. Which party is summoned is a choice the source
       says the system cannot make — a §138 case can have more than one accused, and a
       summons at an evidence listing goes to a witness. The old build wrote the accused's
       name in and read as finished while nobody had chosen. */
    assert.match(draft.items[1].text.text, /\[Party Name\]/);
    assert.ok(!draft.items[1].text.text.includes(cognizance.parties.accused));
  });

  it("writes every template it pulled in into the one box, in order", () => {
    /* The invariant the composer itself keeps (`addItem`): what the panel pulled in is
       what the paper reads. A fixture that set `items` without `body` would show a
       state the screen cannot reach — a list of orders standing over an empty page. */
    for (const row of CAUSE_LIST) {
      const draft = initialOrderDraft(row, "completed", today);
      assert.equal(
        draft.body.text,
        draft.items.map((item) => item.text.text).join("\n\n"),
        `${row.caseNumber} has a body its items do not account for`,
      );
      for (const item of draft.items) {
        assert.ok(
          draft.body.html.includes(item.text.html),
          `${row.caseNumber} lost ${item.type} on the way into the box`,
        );
      }
    }
  });

  it("opens the box on words, never on a blank line before them", () => {
    const draft = initialOrderDraft(hearing, "completed", today);
    assert.equal(draft.body.text, draft.body.text.trimStart());
  });

  it("keeps an item's id stable, so a row does not jump under the typist", () => {
    const first = initialOrderDraft(hearing, "completed", today);
    const second = initialOrderDraft(hearing, "completed", today);
    assert.deepEqual(
      first.items.map((item) => item.id),
      second.items.map((item) => item.id),
    );
  });

  it("posts a judgement listing to no next date", () => {
    const judgement = CAUSE_LIST.find((row) => row.purpose === "judgement");
    assert.ok(judgement);
    const draft = initialOrderDraft(judgement, "completed", today);
    assert.equal(draft.next, "none");
    assert.equal(draft.nextDate, null);
    assert.equal(draft.nextPurpose, "");
  });

  /* The point of the whole module: the paper a completed listing prints has nothing
     left waiting to be filled in. */
  it("assembles an order with no block still pending", () => {
    for (const row of CAUSE_LIST) {
      const order = assembleOrder(row, initialOrderDraft(row, "completed", today));
      const pending = order.blocks.filter((block) => block.pending);
      assert.deepEqual(
        pending.map((block) => block.heading),
        [],
        `${row.caseNumber} left a block pending`,
      );
    }
  });
});

describe("nextSittingDay", () => {
  it("keeps the next date off a Saturday or a Sunday", () => {
    for (let offset = 0; offset < 14; offset += 1) {
      const from = `2026-09-${String(7 + offset).padStart(2, "0")}`;
      const day = parseIsoDay(nextSittingDay(from)).getDay();
      assert.ok(day !== 0 && day !== 6, `${from} landed on day ${day}`);
    }
  });

  it("counts the days from the day it is given", () => {
    assert.equal(nextSittingDay("2026-09-07", 7), "2026-09-14");
  });
});
