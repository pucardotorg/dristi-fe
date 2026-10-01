import assert from "node:assert/strict";
import test from "node:test";

import {
  ROW_INTERACTIVE_SELECTOR,
  ROW_OPENER_SELECTOR,
  rowActivation,
  rowOpener,
  rowOpenerClass,
  shouldActivateRow,
} from "./row-activation";

/** A click that nothing has claimed and nobody is selecting text during. */
const plainClick = {
  defaultPrevented: false,
  insideControl: false,
  selection: "",
};

test("shouldActivateRow", async (t) => {
  await t.test("opens the row on an ordinary click in a dead cell", () => {
    assert.equal(shouldActivateRow(plainClick), true);
  });

  await t.test("refuses a click that landed inside another control", () => {
    // The signing queues: ticking fifteen boxes must not open fifteen overlays.
    assert.equal(
      shouldActivateRow({ ...plainClick, insideControl: true }),
      false,
    );
  });

  await t.test("refuses a click something else has already handled", () => {
    assert.equal(
      shouldActivateRow({ ...plainClick, defaultPrevented: true }),
      false,
    );
  });

  await t.test("refuses when the reader is holding a text selection", () => {
    // Dragging across a case number is copying it, not opening it.
    assert.equal(
      shouldActivateRow({ ...plainClick, selection: "KL-ADV-000118-2026" }),
      false,
    );
  });

  await t.test("treats whitespace as no selection", () => {
    // A drag that caught one space between two cells is not a copy.
    assert.equal(shouldActivateRow({ ...plainClick, selection: "  \n" }), true);
  });
});

test("ROW_INTERACTIVE_SELECTOR", async (t) => {
  /*
   * Named one by one rather than as a blob, because the failure mode is silent: drop
   * `input` and every checkbox in a court-side queue starts opening the row it was meant
   * to select, and nothing else in the app notices.
   */
  const mustCover = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "label",
    '[role="checkbox"]',
    '[role="button"]',
    '[role="menuitem"]',
    '[role="radio"]',
    '[role="switch"]',
  ];

  for (const control of mustCover) {
    await t.test(`covers ${control}`, () => {
      const parts = ROW_INTERACTIVE_SELECTOR.split(",").map((part) =>
        part.trim(),
      );
      assert.ok(
        parts.includes(control),
        `${control} must own its own click inside a row`,
      );
    });
  }

  await t.test("names Radix's checkbox by role, not by tag", () => {
    // The DS Checkbox renders a button with role=checkbox, not an <input>.
    assert.match(ROW_INTERACTIVE_SELECTOR, /\[role="checkbox"\]/);
  });
});

test("rowActivation", async (t) => {
  await t.test("carries the pointer and the hover group", () => {
    const { className } = rowActivation();
    assert.match(className, /\bcursor-pointer\b/);
    // The opener's underline hangs off this group — see `rowOpenerClass`.
    assert.match(className, /\bgroup\/row\b/);
  });

  await t.test("keeps the caller's own row classes", () => {
    assert.match(rowActivation("bg-card").className, /\bbg-card\b/);
  });

  await t.test("hands the row a click handler", () => {
    assert.equal(typeof rowActivation().onClick, "function");
  });
});

test("the opener", async (t) => {
  await t.test("is findable by the selector the row delegates through", () => {
    const attribute = Object.keys(rowOpener)[0];
    assert.equal(ROW_OPENER_SELECTOR, `[${attribute}]`);
  });

  await t.test("underlines from the row's hover, not only its own", () => {
    // The old `hover:underline` taught officers the underline was the only target.
    assert.match(rowOpenerClass, /group-hover\/row:underline/);
    assert.doesNotMatch(rowOpenerClass, /(^|[^-])\bhover:underline\b/);
  });

  await t.test("still underlines and rings on keyboard focus", () => {
    assert.match(rowOpenerClass, /focus-visible:underline/);
    assert.match(rowOpenerClass, /focus-visible:ring-focus-ring/);
  });

  await t.test("keeps a 40px target on a one-line cell", () => {
    // ACCESSIBILITY §8.
    assert.match(rowOpenerClass, /\bmin-h-10\b/);
  });
});
