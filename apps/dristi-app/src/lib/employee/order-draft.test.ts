import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAUSE_LIST } from "./hearings";
import { appendRichText, recitalText } from "./order-items";
import { applicationsForListing } from "./listing-applications";
import {
  appearancesFor,
  assembleApplications,
  assembleAttendance,
  assembleBody,
  assembleNextListing,
  assembleOrder,
  attendanceRecital,
  EMPTY_ORDER_DRAFT,
  nextListingRecital,
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

describe("attendanceRecital", () => {
  it("recites nothing while the roll has not been called", () => {
    assert.deepEqual(attendanceRecital(appearancesFor(hearing), {}), []);
  });

  it("groups by the answer, so who was absent is one line and not a paragraph", () => {
    assert.deepEqual(
      attendanceRecital(appearancesFor(hearing), {
        complainant: "present",
        "complainant-counsel-0": "present",
        accused: "absent",
        "accused-counsel-0": "present",
      }),
      [
        {
          label: "Present",
          value:
            "Sunil Varghese, the complainant; Adv. Suresh Menon, advocate for the complainant; Adv. Rekha Pillai, advocate for the accused.",
        },
        { label: "Absent", value: "Anand Traders, the accused." },
      ],
    );
  });

  it("leaves out the roll nobody is on, rather than heading an empty line", () => {
    const lines = attendanceRecital(appearancesFor(hearing), {
      complainant: "present",
    });
    assert.deepEqual(
      lines.map((line) => line.label),
      ["Present"],
    );
  });

  it("grows one office at a time, so a part-called roll is still in the order", () => {
    const appearances = appearancesFor(hearing);
    const first = attendanceRecital(appearances, { complainant: "present" });
    assert.equal(recitalText(first), "Present: Sunil Varghese, the complainant.");
    const both = attendanceRecital(appearances, {
      complainant: "present",
      accused: "absent",
    });
    assert.equal(
      recitalText(both),
      "Present: Sunil Varghese, the complainant.\nAbsent: Anand Traders, the accused.",
    );
  });
});

describe("nextListingRecital", () => {
  it("closes the order on the date, then what it is for", () => {
    assert.deepEqual(
      nextListingRecital({
        next: "list",
        nextPurpose: "evidence-of-complainant",
        nextDate: "2026-10-06",
      }),
      [
        { label: "Next hearing", value: "6 October 2026" },
        { label: "Purpose", value: "Evidence of complainant" },
      ],
    );
  });

  it("says a matter is not being listed again, which is an answer", () => {
    assert.deepEqual(
      nextListingRecital({ next: "none", nextPurpose: "", nextDate: null }),
      [{ label: "Next hearing", value: "Not listed again." }],
    );
  });

  it("recites nothing while the posting is half given, either way round", () => {
    assert.deepEqual(
      nextListingRecital({
        next: "list",
        nextPurpose: "evidence-of-complainant",
        nextDate: null,
      }),
      [],
    );
    assert.deepEqual(
      nextListingRecital({
        next: "list",
        nextPurpose: "",
        nextDate: "2026-10-06",
      }),
      [],
    );
  });
});

describe("assembleBody", () => {
  it("says so when nothing has been written, rather than printing nothing", () => {
    const block = assembleBody({ html: "", text: "" });
    assert.equal(block.pending, true);
    assert.equal(block.body, "No order has been written.");
    assert.equal(block.html, "");
  });

  it("is pending on the text, not the markup — an empty editor still holds a break", () => {
    const block = assembleBody({ html: "<br>", text: "   " });
    assert.equal(block.pending, true);
    assert.equal(block.html, "");
  });

  it("keeps the formatting the typist put in the box", () => {
    const block = assembleBody({
      html: "<ol><li>Notice to the accused.</li></ol>",
      text: "Notice to the accused.",
    });
    assert.equal(block.pending, false);
    assert.equal(block.html, "<ol><li>Notice to the accused.</li></ol>");
    assert.equal(block.body, "Notice to the accused.");
  });
});

describe("appendRichText", () => {
  it("joins two directions as separate passages, never as one sentence", () => {
    const joined = appendRichText(
      { html: "<p>Cognizance is taken.</p>", text: "Cognizance is taken." },
      { html: "<p>Issue summons.</p>", text: "Issue summons." },
    );
    assert.equal(
      joined.html,
      "<p>Cognizance is taken.</p><p>Issue summons.</p>",
    );
    assert.equal(joined.text, "Cognizance is taken.\n\nIssue summons.");
  });

  it("leaves the box alone when the template has no standing words", () => {
    const written = { html: "<p>Heard.</p>", text: "Heard." };
    assert.deepEqual(appendRichText(written, { html: "", text: "" }), written);
  });

  it("does not open the order on a blank line", () => {
    const first = { html: "<p>Heard.</p>", text: "Heard." };
    assert.deepEqual(appendRichText({ html: "", text: "" }, first), first);
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
      body: {
        html: "<p>Notice to the accused.</p>",
        text: "Notice to the accused.",
      },
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
