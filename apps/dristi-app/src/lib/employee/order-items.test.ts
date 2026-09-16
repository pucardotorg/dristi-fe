import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendRichText,
  createOrderItem,
  isOrderItemTypeId,
  nextOrderItemId,
  orderItemLabel,
  orderItemsInBody,
  plainTextOfRichText,
  recitalText,
  richTextCarriesItem,
  richTextFromPlain,
  richTextWithoutItem,
  stripRichTextItem,
  upsertRichTextFact,
  upsertRichTextSentence,
} from "./order-items";
import {
  browsableTemplates,
  likelyTemplatesFor,
  ORDER_GROUPS,
  ORDER_TEMPLATES,
  unavailableReason,
  type OrderCatalogueContext,
} from "./order-templates";

const onFile: OrderCatalogueContext = {
  cognizanceDue: false,
  longPending: false,
  hearingOngoing: true,
};

describe("the court's catalogue", () => {
  it("carries all twenty-seven, numbered 1 to 27, with no id used twice", () => {
    assert.equal(ORDER_TEMPLATES.length, 27);
    assert.deepEqual(
      ORDER_TEMPLATES.map((entry) => entry.number).sort((a, b) => a - b),
      Array.from({ length: 27 }, (_, index) => index + 1),
    );
    assert.equal(
      new Set(ORDER_TEMPLATES.map((entry) => entry.id)).size,
      ORDER_TEMPLATES.length,
    );
  });

  it("files every template under exactly one known group", () => {
    const known = new Set(ORDER_GROUPS.map((group) => group.id));
    for (const entry of ORDER_TEMPLATES) {
      assert.ok(known.has(entry.group), `${entry.id} has no group`);
    }
  });

  /**
   * The one that earns its place: a locked variable the workflow needs, that no longer
   * appears in the sentence, is a transcription slip no type can catch — the order would
   * read fine and the task behind it would never be raised.
   */
  it("leaves every declared variable standing in its own template text", () => {
    for (const entry of ORDER_TEMPLATES) {
      for (const variable of [...entry.locked, ...entry.optional]) {
        assert.ok(
          entry.botd.includes(`[${variable.name}]`),
          `${entry.id} declares [${variable.name}] and does not use it`,
        );
      }
      if (entry.botd === "") {
        assert.equal(entry.locked.length, 0, `${entry.id} has no text to fill`);
        assert.equal(entry.optional.length, 0);
      }
    }
  });

  it("keeps the application-only types out of the browsable list", () => {
    const browsable = browsableTemplates().map((entry) => entry.id);
    assert.ok(!browsable.includes("accept-application"));
    assert.ok(!browsable.includes("rescheduling-of-hearing"));
    assert.ok(browsable.includes("issue-of-summons"));
    assert.equal(
      unavailableReason(
        ORDER_TEMPLATES.find((entry) => entry.id === "accept-application")!,
        onFile,
      ),
      "Comes from an application",
    );
  });

  it("gates on the state of the case, and says why", () => {
    const cognizance = ORDER_TEMPLATES.find(
      (entry) => entry.id === "cognizance",
    )!;
    assert.equal(
      unavailableReason(cognizance, onFile),
      "Only before cognizance",
    );
    assert.equal(
      unavailableReason(cognizance, { ...onFile, cognizanceDue: true }),
      null,
    );

    const outOfLp = ORDER_TEMPLATES.find(
      (entry) => entry.id === "move-out-of-lp-register",
    )!;
    assert.equal(
      unavailableReason(outOfLp, onFile),
      "Only for a long-pending case",
    );
    assert.equal(
      unavailableReason(outOfLp, { ...onFile, longPending: true }),
      null,
    );
  });

  it("suggests only what the matter can actually take", () => {
    const likely = likelyTemplatesFor("appearance", onFile).map(
      (entry) => entry.id,
    );
    assert.ok(likely.includes("issue-of-summons"));
    /* The source lists Acceptance of bail against the Bail purpose, but marks it
       application-only — a suggestion the typist cannot act on is worse than none. */
    const atBail = likelyTemplatesFor("bail", onFile).map((entry) => entry.id);
    assert.ok(!atBail.includes("acceptance-of-bail"));
  });
});

describe("createOrderItem", () => {
  it("opens an order on the court's own sentence, slots and all", () => {
    const item = createOrderItem("issue-of-summons", "a");
    assert.match(
      item.text.text,
      /^Issue summons to the \[Party Type\] \[Party Name\]\./,
    );
  });

  it("opens Others empty, because nobody chose a sentence for it", () => {
    const item = createOrderItem("others", "a");
    assert.equal(item.text.text, "");
    assert.equal(item.text.html, "");
  });

  it("names an unknown id rather than throwing", () => {
    assert.equal(isOrderItemTypeId("issue-of-summons"), true);
    assert.equal(isOrderItemTypeId("others"), true);
    assert.equal(isOrderItemTypeId("interim-compensation"), false);
    assert.equal(orderItemLabel("witness-batta"), "Witness batta");
  });

  it("escapes markup rather than letting it into the order", () => {
    const value = richTextFromPlain("A & B <Traders>");
    assert.ok(value.html.includes("&amp;"));
    assert.ok(!value.html.includes("<Traders>"));
    assert.equal(value.text, "A & B <Traders>");
  });

  it("mints a fresh id for each order, so two of a type do not collide", () => {
    assert.notEqual(nextOrderItemId(), nextOrderItemId());
    assert.notEqual(createOrderItem("cost").id, createOrderItem("cost").id);
  });
});

describe("upsertRichTextSentence", () => {
  const allowed = "The application for bail (CMP/312/2026) is allowed.";
  const dismissed = "The application for bail (CMP/312/2026) is dismissed.";
  const both = [allowed, dismissed];

  it("writes the sentence into an empty passage", () => {
    const value = upsertRichTextSentence({ html: "", text: "" }, allowed, both);
    assert.equal(value.text, allowed);
    assert.equal(value.html, `<p>${allowed}</p>`);
  });

  it("appends to what the typist has already written", () => {
    const written = richTextFromPlain("Heard both sides.");
    const value = upsertRichTextSentence(written, allowed, both);
    assert.equal(value.text, `Heard both sides.\n\n${allowed}`);
    assert.equal(value.html, `<p>Heard both sides.</p><p>${allowed}</p>`);
  });

  it("replaces the earlier answer rather than carrying both", () => {
    const written = upsertRichTextSentence(
      richTextFromPlain("Heard both sides."),
      allowed,
      both,
    );
    const changed = upsertRichTextSentence(written, dismissed, both);
    assert.ok(changed.text.includes(dismissed));
    assert.ok(!changed.text.includes(allowed));
    assert.ok(!changed.html.includes(allowed));
    assert.equal(changed.text.split("is dismissed").length - 1, 1);
  });

  it("does not duplicate the same answer given twice", () => {
    const once = upsertRichTextSentence({ html: "", text: "" }, allowed, both);
    const twice = upsertRichTextSentence(once, allowed, both);
    assert.deepEqual(twice, once);
  });

  it("keeps the markup around a sentence the typist has moved", () => {
    const moved = {
      html: `<ul><li>${allowed}</li></ul>`,
      text: allowed,
    };
    const changed = upsertRichTextSentence(moved, dismissed, both);
    assert.equal(changed.html, `<ul><li>${dismissed}</li></ul>`);
    assert.equal(changed.text, dismissed);
  });

  it("matches the sentence as the editor holds it, escaped", () => {
    const sentence = "The application of A & B (CMP/1/2026) is allowed.";
    const written = richTextFromPlain(sentence);
    assert.ok(written.html.includes("&amp;"));
    const changed = upsertRichTextSentence(
      written,
      "The application of A & B (CMP/1/2026) is dismissed.",
      [sentence],
    );
    assert.ok(changed.html.includes("is dismissed"));
    assert.ok(!changed.html.includes("is allowed"));
    assert.ok(changed.html.includes("&amp;"));
  });

  it("leaves the passage alone when nothing matches and nothing is given", () => {
    const written = richTextFromPlain("Heard both sides.");
    assert.deepEqual(upsertRichTextSentence(written, "", []), written);
  });
});

/**
 * The mark that ties a passage in the order to the row that pulled it in, and the two
 * questions it exists to answer exactly: *take this one out*, and *is it still there*.
 * The composer refused a Remove until the guessing could be removed from it (owner,
 * 2026-09-16), so these are the cases that guessing used to get wrong.
 */
describe("a pulled-in item's passage", () => {
  const marked = (id: string, words: string) =>
    richTextFromPlain(words, id).html;

  it("is marked with the item's own id, and a disposal sentence is not", () => {
    const item = createOrderItem("bail", "order-item-9");
    assert.ok(richTextCarriesItem(item.text.html, "order-item-9"));
    /* The sentences an answered application writes are facts of the sitting, not items
       of the catalogue, and nothing offers to take them back out. */
    assert.ok(!richTextFromPlain("The application is allowed.").html.includes("data-order-item"));
  });

  it("is taken out whole, with whatever the typist nested inside it", () => {
    const body = `<p>Heard both sides.</p>${marked("i1", "Bail is granted.").replace("Bail is granted.", "Bail is <b>granted</b> on a bond.")}<p>Call on 30 Sept.</p>`;
    assert.equal(
      stripRichTextItem(body, "i1"),
      "<p>Heard both sides.</p><p>Call on 30 Sept.</p>",
    );
  });

  it("is taken out in every block it has come to occupy", () => {
    /* Enter inside the paragraph splits it and the browser copies the attribute onto
       both halves, so one item can hold two blocks by the time it is removed. */
    const body = `${marked("i1", "Bail is granted")}${marked("i1", "on a bond of Rs 10,000.")}<p>Kept.</p>`;
    assert.equal(stripRichTextItem(body, "i1"), "<p>Kept.</p>");
  });

  it("is found by its whole id, never by a prefix of a longer one", () => {
    const body = marked("order-item-10", "Summons shall issue.");
    assert.ok(!richTextCarriesItem(body, "order-item-1"));
    assert.equal(stripRichTextItem(body, "order-item-1"), body);
  });

  it("rebuilds the plain side when it goes, so the slot count is not stale", () => {
    const body = {
      html: `<p>Heard both sides.</p>${marked("i1", "Bail on [Amount].")}`,
      text: "Heard both sides.\n\nBail on [Amount].",
    };
    const after = richTextWithoutItem(body, "i1");
    assert.equal(after.html, "<p>Heard both sides.</p>");
    assert.equal(after.text, "Heard both sides.");
  });

  it("is the same object back when the typist has already deleted it themselves", () => {
    const body = { html: "<p>Heard both sides.</p>", text: "Heard both sides." };
    assert.equal(richTextWithoutItem(body, "i1"), body);
  });
});

/**
 * What the screen shows, counts and gates on. A row is a record of a passage: it belongs
 * in the list while the passage does, and an edit inside the passage is not a deletion
 * of it — the direction is still in the order, in the typist's words rather than the
 * court's.
 */
describe("orderItemsInBody", () => {
  const rows = [{ id: "i1" }, { id: "i2" }, { id: "i3" }];

  it("keeps the rows whose passages the order still carries, in order", () => {
    const html = `${richTextFromPlain("Third.", "i3").html}${richTextFromPlain("First.", "i1").html}`;
    assert.deepEqual(orderItemsInBody(rows, html), [{ id: "i1" }, { id: "i3" }]);
  });

  it("drops a row whose passage has been deleted in the editor", () => {
    const html = richTextFromPlain("Only this one.", "i2").html;
    assert.deepEqual(orderItemsInBody(rows, html), [{ id: "i2" }]);
  });

  it("keeps a row whose words the typist has rewritten inside the passage", () => {
    /* The block survives an edit to its text, so the mark does, so the row does. */
    const html = '<p data-order-item="i2">Words the bench dictated instead.</p>';
    assert.deepEqual(orderItemsInBody(rows, html), [{ id: "i2" }]);
  });

  it("is empty when the order has been cleared out altogether", () => {
    assert.deepEqual(orderItemsInBody(rows, ""), []);
  });
});

describe("plainTextOfRichText", () => {
  it("joins blocks the way a template's words are joined onto the order", () => {
    assert.equal(
      plainTextOfRichText("<p>One.</p><p>Two.</p>"),
      "One.\n\nTwo.",
    );
  });

  it("reads the escaped forms back as the characters they stand for", () => {
    assert.equal(
      plainTextOfRichText("<p>Fees &amp; costs &lt;paid&gt;</p>"),
      "Fees & costs <paid>",
    );
  });

  it("is empty for empty markup, which is what an untouched order says", () => {
    assert.equal(plainTextOfRichText(""), "");
  });
});

/*
 * The two recitals the order carries because the sitting is known: the roll that opens it
 * and the posting that closes it. What is pinned here is not the wording — that is
 * `attendanceRecital`'s — but that a recital the screen re-writes under the typist's hand
 * lands in the right place, replaces itself rather than accumulating, renders as labelled
 * lines, and never claims to be a pulled-in order.
 */
describe("upsertRichTextFact", () => {
  const roll = [
    { label: "Present", value: "Sunil Varghese, the complainant." },
  ];
  const posting = [
    { label: "Next hearing", value: "6 October 2026" },
    { label: "Purpose", value: "Appearance" },
  ];
  const written = { html: "<p>Heard both sides.</p>", text: "Heard both sides." };

  it("renders each line as a bold label and its value", () => {
    assert.equal(
      upsertRichTextFact({ html: "", text: "" }, "next", posting).html,
      '<p data-order-fact="next"><strong>Next hearing:</strong> 6 October 2026<br><strong>Purpose:</strong> Appearance</p>',
    );
  });

  it("reads the breaks back as lines on the plain side", () => {
    assert.equal(
      upsertRichTextFact({ html: "", text: "" }, "next", posting).text,
      "Next hearing: 6 October 2026\nPurpose: Appearance",
    );
  });

  it("opens the order with the roll and closes it with the posting", () => {
    const rolled = upsertRichTextFact(written, "attendance", roll);
    assert.ok(
      rolled.html.startsWith('<p data-order-fact="attendance"><strong>Present:</strong> '),
    );
    assert.ok(rolled.html.endsWith("<p>Heard both sides.</p>"));
    const closed = upsertRichTextFact(rolled, "next", posting);
    assert.equal(
      closed.text,
      `${recitalText(roll)}\n\nHeard both sides.\n\n${recitalText(posting)}`,
    );
  });

  it("writes over the recital already there rather than beside it", () => {
    const first = upsertRichTextFact(written, "attendance", roll);
    const corrected = upsertRichTextFact(first, "attendance", [
      ...roll,
      { label: "Absent", value: "Anand Traders, the accused." },
    ]);
    assert.equal(
      corrected.html.match(/data-order-fact="attendance"/g)?.length,
      1,
    );
    assert.equal(corrected.html.match(/<strong>Present:<\/strong>/g)?.length, 1);
    assert.match(corrected.text, /^Present: [^\n]+\nAbsent: Anand Traders, the accused\./);
  });

  it("stays where the typist moved it, and keeps the shape they gave it", () => {
    const moved = {
      html: '<p>Heard both sides.</p><li data-order-fact="attendance" class="x">anything</li>',
      text: "Heard both sides.\n\nanything",
    };
    const corrected = upsertRichTextFact(moved, "attendance", [
      { label: "Absent", value: "Nobody appeared." },
    ]);
    assert.equal(
      corrected.html,
      '<p>Heard both sides.</p><li data-order-fact="attendance" class="x"><strong>Absent:</strong> Nobody appeared.</li>',
    );
  });

  it("leaves an empty line under the roll to write on", () => {
    const rolled = upsertRichTextFact({ html: "", text: "" }, "attendance", roll);
    assert.ok(rolled.html.endsWith("<p><br></p>"));
    /* The blank is for the caret, not for the record: nothing has been written yet. */
    assert.equal(rolled.text, recitalText(roll));
  });

  it("does not stack empty lines up as the roll is corrected", () => {
    let body = upsertRichTextFact({ html: "", text: "" }, "attendance", roll);
    body = upsertRichTextFact(body, "attendance", [
      ...roll,
      { label: "Absent", value: "Anand Traders, the accused." },
    ]);
    body = upsertRichTextFact(body, "attendance", roll);
    assert.equal(body.html.match(/<p><br><\/p>/g)?.length, 1);
  });

  it("writes the roll above a passage that already opens on an empty line", () => {
    const body = upsertRichTextFact(
      { html: "<p><br></p><p>Heard both sides.</p>", text: "Heard both sides." },
      "attendance",
      roll,
    );
    assert.equal(body.html.match(/<p><br><\/p>/g)?.length, 1);
  });

  it("takes the recital out when the fact stops being one", () => {
    const rolled = upsertRichTextFact(written, "attendance", roll);
    assert.deepEqual(upsertRichTextFact(rolled, "attendance", []), written);
  });

  it("takes the empty line with it, so the order does not open on a blank", () => {
    const rolled = upsertRichTextFact({ html: "", text: "" }, "attendance", roll);
    assert.deepEqual(upsertRichTextFact(rolled, "attendance", []), {
      html: "",
      text: "",
    });
  });

  it("writes nothing at all for a fact that has no lines yet", () => {
    assert.deepEqual(upsertRichTextFact(written, "next", []), written);
  });

  it("rebuilds from the first marked block and leaves only one wearing the mark", () => {
    /* Enter inside the recital splits it and the browser copies the mark onto both
       halves, so one recital can be two marked blocks by the time the roll changes. */
    const split = {
      html: '<p data-order-fact="attendance">Present: Sunil</p><p data-order-fact="attendance"> Varghese</p>',
      text: "Present: Sunil\n\n Varghese",
    };
    const corrected = upsertRichTextFact(split, "attendance", [
      { label: "Absent", value: "Anand Traders, the accused." },
    ]);
    assert.equal(
      corrected.html.match(/data-order-fact="attendance"/g)?.length,
      1,
    );
    assert.ok(
      corrected.html.startsWith(
        '<p data-order-fact="attendance"><strong>Absent:</strong> Anand Traders, the accused.</p>',
      ),
    );
  });

  it("never deletes what the typist wrote inside the recital, only unmarks it", () => {
    /* The flow that found this: mark the roll, put the caret at the end of it, press
       Enter and write the order. Those words are in a marked block, and replacing every
       marked block would take a sentence of a court order with it. */
    const written = {
      html: '<p data-order-fact="attendance">Present: Sunil Varghese</p><p data-order-fact="attendance">Heard both sides.</p>',
      text: "Present: Sunil Varghese\n\nHeard both sides.",
    };
    const corrected = upsertRichTextFact(written, "attendance", [
      { label: "Absent", value: "Anand Traders, the accused." },
    ]);
    assert.match(corrected.text, /Heard both sides\./);
    assert.equal(
      corrected.html,
      '<p data-order-fact="attendance"><strong>Absent:</strong> Anand Traders, the accused.</p><p>Heard both sides.</p>',
    );
  });

  it("is not a pulled-in order and never appears in that list", () => {
    const rolled = upsertRichTextFact(written, "attendance", roll);
    assert.ok(!rolled.html.includes("data-order-item"));
    assert.deepEqual(orderItemsInBody([{ id: "i1" }], rolled.html), []);
  });

  it("escapes a name the markup would otherwise read as a tag", () => {
    const rolled = upsertRichTextFact({ html: "", text: "" }, "attendance", [
      { label: "Absent", value: "A & B <Traders>, the accused." },
    ]);
    assert.equal(
      rolled.html,
      '<p data-order-fact="attendance"><strong>Absent:</strong> A &amp; B &lt;Traders&gt;, the accused.</p><p><br></p>',
    );
    assert.equal(rolled.text, "Absent: A & B <Traders>, the accused.");
  });
});

describe("appendRichText, against a closed order", () => {
  const closed = upsertRichTextFact(
    { html: "<p>Heard both sides.</p>", text: "Heard both sides." },
    "next",
    [{ label: "Next hearing", value: "6 October 2026" }],
  );

  it("puts a direction above the posting, not after it", () => {
    const added = appendRichText(closed, {
      html: "<p>Issue summons.</p>",
      text: "Issue summons.",
    });
    assert.equal(
      added.text,
      "Heard both sides.\n\nIssue summons.\n\nNext hearing: 6 October 2026",
    );
  });

  it("still closes on the posting after several directions", () => {
    const twice = appendRichText(
      appendRichText(closed, { html: "<p>One.</p>", text: "One." }),
      { html: "<p>Two.</p>", text: "Two." },
    );
    assert.match(twice.text, /One\.\n\nTwo\.\n\nNext hearing: /);
  });
});
