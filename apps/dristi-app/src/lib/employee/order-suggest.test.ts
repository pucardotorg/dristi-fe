import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ORDER_PHRASES,
  phraseCompletions,
  phraseRemainder,
  rankSuggestions,
  suggestCandidates,
  type SuggestCandidate,
} from "./order-suggest";
import type { OrderCatalogueContext } from "./order-templates";

const sitting: OrderCatalogueContext = {
  cognizanceDue: false,
  longPending: false,
  hearingOngoing: true,
};

const all = () => suggestCandidates(undefined, sitting, []);
const keys = (rows: readonly SuggestCandidate[]) => rows.map((row) => row.key);

describe("suggestCandidates", () => {
  it("reaches the court's standing orders and the owner's three phrases", () => {
    const rows = all();
    assert.ok(rows.some((row) => row.kind === "template"));
    assert.deepEqual(
      rows.filter((row) => row.kind === "phrase").map((row) => row.text),
      ORDER_PHRASES.map((phrase) => phrase.text),
    );
  });

  it("puts what the sitting argues for at the head of the list", () => {
    /* The prior: with nothing typed, this order *is* the answer. */
    const ranked = suggestCandidates(undefined, sitting, ["issue-of-summons"]);
    assert.equal(keys(ranked)[0], "template:issue-of-summons");
  });

  it("offers no order the case cannot take", () => {
    /* The catalogue lists a gated order with its reason, because the missing one may be
       the one that mattered. A completion has no room to say why, so it does not offer
       it at all rather than putting unpassable words in the order. */
    const gated = suggestCandidates(undefined, sitting, []);
    assert.ok(!keys(gated).includes("template:cognizance"));
  });

  it("offers nothing the court gives no words for", () => {
    /* Judgement and the section 202 order arrive blank — there is nothing to complete. */
    assert.ok(all().every((row) => row.text !== ""));
  });
});

describe("rankSuggestions", () => {
  const rows: SuggestCandidate[] = [
    { key: "a", kind: "template", label: "Summons to witness", text: "Summons shall issue.", terms: "Summons to witness Summons shall issue." },
    { key: "b", kind: "template", label: "Bail", text: "Released on a bond.", terms: "Bail Released on a bond." },
    { key: "c", kind: "template", label: "Issue of summons", text: "Summons to the accused.", terms: "Issue of summons Summons to the accused." },
  ];

  it("prefers a label that begins with what was typed", () => {
    assert.equal(keys(rankSuggestions("bail", rows))[0], "b");
  });

  it("then a label with a word that begins with it", () => {
    /* "sum" opens a word in both summons rows and opens neither label, so the order
       they arrived in — the sitting's — decides between them. */
    assert.deepEqual(keys(rankSuggestions("sum", rows)), ["a", "c"]);
  });

  it("finds an order by its standing words when the label never says them", () => {
    assert.deepEqual(keys(rankSuggestions("bond", rows)), ["b"]);
  });

  it("answers nothing when nothing answers, which is how the reader gets out", () => {
    assert.deepEqual(rankSuggestions("zzz", rows), []);
  });

  it("is the sitting's own order when nothing has been typed yet", () => {
    assert.deepEqual(keys(rankSuggestions("", rows)), ["a", "b", "c"]);
  });

  it("ignores case and surrounding space, because people type fast", () => {
    assert.equal(keys(rankSuggestions("  BAIL ", rows))[0], "b");
  });
});

/**
 * The no-trigger half: the sentence being typed completes itself. What these pin is that
 * the typist's own characters are never rewritten and that a direction never arrives
 * uninvited in the middle of somebody's writing.
 */
describe("phraseCompletions", () => {
  it("offers the rest of the sentence being typed", () => {
    assert.deepEqual(phraseCompletions("Heard bo"), [
      {
        key: "phrase:heard-both-sides",
        label: "Heard both sides.",
        ghost: "th sides.",
      },
    ]);
  });

  it("ignores case, because a sentence begun lowercase is the same sentence", () => {
    assert.equal(phraseCompletions("heard bo")[0]?.ghost, "th sides.");
  });

  it("offers no standing direction, however well it would match", () => {
    /* A template arriving mid-sentence would put brackets in somebody's writing. */
    assert.deepEqual(phraseCompletions("Issue summ"), []);
  });

  it("offers nothing once the sentence is complete", () => {
    assert.deepEqual(phraseCompletions("Heard both sides."), []);
  });

  it("offers nothing to a prefix no sentence begins with", () => {
    assert.deepEqual(phraseCompletions("The accused"), []);
  });
});

describe("phraseRemainder", () => {
  it("is what the typist has not typed yet", () => {
    assert.equal(
      phraseRemainder("phrase:none-for-accused", "None app"),
      "eared for the accused.",
    );
  });

  it("is nothing when the typed words are not that sentence after all", () => {
    assert.equal(phraseRemainder("phrase:none-for-accused", "Heard"), null);
    assert.equal(phraseRemainder("phrase:nope", "Heard"), null);
  });
});
