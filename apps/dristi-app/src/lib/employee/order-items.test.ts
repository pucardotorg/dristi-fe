import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createOrderItem,
  isOrderItemTypeId,
  nextOrderItemId,
  orderItemLabel,
  richTextFromPlain,
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
    assert.equal(unavailableReason(cognizance, onFile), "Only before cognizance");
    assert.equal(
      unavailableReason(cognizance, { ...onFile, cognizanceDue: true }),
      null,
    );

    const outOfLp = ORDER_TEMPLATES.find(
      (entry) => entry.id === "move-out-of-lp-register",
    )!;
    assert.equal(unavailableReason(outOfLp, onFile), "Only for a long-pending case");
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
    assert.match(item.text.text, /^Issue summons to the \[Party Type\] \[Party Name\]\./);
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
