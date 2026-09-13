import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAUSE_LIST } from "./hearings";
import { createOrderItem } from "./order-items";
import { applicationsForListing } from "./listing-applications";
import {
  appearancesFor,
  assembleApplications,
  assembleAttendance,
  assembleItems,
  assembleNextListing,
  assembleOrder,
  EMPTY_ORDER_DRAFT,
} from "./order-draft";

const hearing = CAUSE_LIST[0];

describe("appearancesFor", () => {
  it("names the parties, then each counsel on that side — not a ghost advocate", () => {
    const noAccusedCounsel = CAUSE_LIST.find(
      (row) => row.counsel.every((c) => c.side !== "accused"),
    );
    assert.ok(noAccusedCounsel);
    const rows = appearancesFor(noAccusedCounsel);
    assert.equal(
      rows.some((row) => row.role === "Advocate for the accused"),
      false,
    );
    assert.equal(rows[0].role, "Complainant");
    assert.equal(rows[0].name, noAccusedCounsel.parties.complainant);
  });
});

describe("assembleAttendance", () => {
  it("says attendance is unmarked when nothing is marked", () => {
    const block = assembleAttendance(appearancesFor(hearing), {});
    assert.equal(block.pending, true);
    assert.equal(block.body, "Attendance has not been marked.");
  });

  it("names only the people who were marked, and cannot be both", () => {
    const appearances = appearancesFor(hearing);
    const block = assembleAttendance(appearances, {
      complainant: "present",
      accused: "absent",
    });
    assert.equal(block.pending, false);
    assert.match(block.body, /Sunil Varghese, the complainant, is present/);
    assert.match(block.body, /Anand Traders, the accused, is absent/);
    assert.doesNotMatch(block.body, /Adv\./);
    assert.equal(block.appearances?.length, 2);
    assert.equal(block.appearances?.[0]?.name, "Sunil Varghese");
    assert.equal(block.appearances?.[1]?.mark, "absent");
  });
});

describe("assembleNextListing", () => {
  it("treats skip as a positive sentence, not a missing date", () => {
    const block = assembleNextListing({
      next: "none",
      nextPurpose: "",
      nextDate: null,
    });
    assert.equal(block.pending, false);
    assert.equal(block.body, "No next date is listed.");
  });

  it("flags a listed-next order with no date", () => {
    const block = assembleNextListing({
      next: "list",
      nextPurpose: "plea",
      nextDate: null,
    });
    assert.equal(block.pending, true);
    assert.equal(block.body, "Next date has not been set.");
  });
});

describe("assembleItems", () => {
  it("says so when the order has no item, rather than printing nothing", () => {
    const block = assembleItems([]);
    assert.equal(block.pending, true);
    assert.equal(block.body, "No item has been added.");
    assert.equal(block.items, undefined);
  });

  it("numbers the items by position — item two is paragraph two", () => {
    const block = assembleItems([
      createOrderItem("issue-of-summons", "a"),
      createOrderItem("cost", "b"),
    ]);
    assert.deepEqual(
      block.items?.map((entry) => [entry.number, entry.heading]),
      [
        [1, "Issue of summons"],
        [2, "Cost"],
      ],
    );
    assert.equal(block.pending, false);
  });

  it("is pending on the text, not the markup — an empty editor still holds a break", () => {
    const block = assembleItems([
      { id: "a", type: "others", text: { html: "<br>", text: "   " } },
    ]);
    assert.equal(block.pending, true);
    assert.equal(block.items?.[0].pending, true);
    assert.equal(block.items?.[0].html, "");
    assert.match(block.items?.[0].body ?? "", /nothing has been written/);
  });

  it("keeps a chosen item in the order even before it is written", () => {
    /* The court passed it — the typist said so by adding it. An order that dropped the
       paragraph would be the screen deciding which items are worth printing. */
    const block = assembleItems([
      createOrderItem("issue-of-summons", "a"),
      { id: "b", type: "others", text: { html: "", text: "" } },
    ]);
    assert.equal(block.items?.length, 2);
    assert.equal(block.items?.[1].number, 2);
  });

  it("keeps the formatting the typist put inside one item", () => {
    const block = assembleItems([
      {
        id: "a",
        type: "issue-of-notice",
        text: {
          html: "<ol><li>Notice to the accused.</li></ol>",
          text: "Notice to the accused.",
        },
      },
    ]);
    assert.equal(block.items?.[0].html, "<ol><li>Notice to the accused.</li></ol>");
    assert.equal(block.items?.[0].body, "Notice to the accused.");
  });
});

describe("assembleOrder", () => {
  it("is attendance, then the item, then next listing", () => {
    /* A listing with nothing pending on it — this claim is about where the item sits,
       and a matter carrying applications grows a block between the two. That ordering
       has its own test below. */
    const bare = CAUSE_LIST.find(
      (row) => applicationsForListing(row.id).length === 0,
    );
    assert.ok(bare);
    const order = assembleOrder(bare, {
      ...EMPTY_ORDER_DRAFT,
      items: [
        {
          id: "a",
          type: "issue-of-notice",
          text: {
            html: "<p>Notice to the accused.</p>",
            text: "Notice to the accused.",
          },
        },
      ],
    });
    assert.deepEqual(
      order.blocks.map((block) => block.heading),
      ["Attendance", "Item text", "Next listing"],
    );
    assert.equal(order.blocks[1].body, "Notice to the accused.");
  });
});

describe("assembleApplications", () => {
  const withApplications = CAUSE_LIST.find(
    (row) => applicationsForListing(row.id).length > 1,
  );

  it("gives a listing with nothing pending no block at all", () => {
    const bare = CAUSE_LIST.find(
      (row) => applicationsForListing(row.id).length === 0,
    );
    assert.ok(bare);
    assert.equal(assembleApplications(bare, [], {}), undefined);
  });

  it("says how many are unanswered rather than passing over them", () => {
    assert.ok(withApplications);
    const applications = applicationsForListing(withApplications.id);
    const block = assembleApplications(withApplications, applications, {});
    assert.ok(block);
    assert.equal(block.pending, true);
    /* Nothing is answered, so every line is the pending note — never a silent omission
       of an application that is on the file. */
    assert.equal(block.sentences?.length, 1);
    assert.equal(block.sentences?.[0].pending, true);
    assert.match(block.body, /have not been answered/);
  });

  it("records each answer in the court's words, not the button's", () => {
    assert.ok(withApplications);
    const [first, second] = applicationsForListing(withApplications.id);
    const block = assembleApplications(withApplications, [first, second], {
      [first.id]: "allowed",
      [second.id]: "dismissed",
    });
    assert.ok(block);
    assert.equal(block.pending, false);
    assert.equal(block.sentences?.length, 2);
    assert.match(block.body, /is allowed\./);
    assert.match(block.body, /is dismissed\./);
    /* The order names the application by its own serial, never the case number. */
    assert.ok(block.body.includes(first.number));
    assert.equal(block.body.includes(withApplications.caseNumber), false);
  });

  it("keeps the answered ones and still reports the rest", () => {
    assert.ok(withApplications);
    const [first, second] = applicationsForListing(withApplications.id);
    const block = assembleApplications(withApplications, [first, second], {
      [first.id]: "allowed",
    });
    assert.ok(block);
    assert.equal(block.pending, true);
    assert.equal(block.sentences?.length, 2);
    assert.equal(block.sentences?.[0].pending, false);
    assert.equal(block.sentences?.[1].pending, true);
    assert.match(block.body, /One application .* has not been answered\./);
  });
});

describe("assembleOrder with applications", () => {
  it("puts the disposals between the roll and the directions", () => {
    const withApplications = CAUSE_LIST.find(
      (row) => applicationsForListing(row.id).length > 0,
    );
    assert.ok(withApplications);
    const order = assembleOrder(withApplications, EMPTY_ORDER_DRAFT);
    const headings = order.blocks.map((block) => block.heading);
    assert.deepEqual(headings, [
      "Attendance",
      "Applications",
      "Item text",
      "Next listing",
    ]);
  });

  it("leaves a listing with nothing pending exactly as it was", () => {
    const bare = CAUSE_LIST.find(
      (row) => applicationsForListing(row.id).length === 0,
    );
    assert.ok(bare);
    const order = assembleOrder(bare, EMPTY_ORDER_DRAFT);
    assert.deepEqual(
      order.blocks.map((block) => block.heading),
      ["Attendance", "Item text", "Next listing"],
    );
  });
});
