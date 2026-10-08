import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DOC_ROW } from "./bundle";
import {
  canSaveDraft,
  isLinkedComplete,
  unlocksSentence as unlocksSentenceRaw,
} from "./field";
import { FIELD_BY_ID } from "./sections";
import type { Draft, Field } from "./types";

const unlocksSentence = (field: Field) => unlocksSentenceRaw(field, DOC_ROW);

function draft(over: Partial<Draft> = {}): Draft {
  return {
    text: "",
    reason: null,
    linked: null,
    ...over,
  };
}


describe("unlocksSentence — the sentence printed in three places", () => {
  it("document rows grant re-upload", () => {
    assert.equal(
      unlocksSentence(FIELD_BY_ID["d-aadhaar"]),
      "Lets the advocate re-upload this document.",
    );
    assert.equal(
      unlocksSentence(FIELD_BY_ID["d-affidavit"]),
      "Lets the advocate re-upload this document.",
    );
  });

  it("a field sourced from an upload says 'only' — the boundary where a mark could mislead", () => {
    assert.equal(
      unlocksSentence(FIELD_BY_ID["c-name"]),
      "Lets the advocate edit this value only.",
    );
  });

  it("a field with no uploaded source takes the plain sentence", () => {
    // p-final renders from a generated page — nothing was uploaded,
    // so a boundary against re-upload would be a sentence about nothing.
    assert.equal(
      unlocksSentence(FIELD_BY_ID["p-final"]),
      "Lets the advocate edit this value.",
    );
  });

  it("says the plain phrase for a field with no source document", () => {
    assert.equal(
      unlocksSentence(FIELD_BY_ID["c-mob"]),
      "Lets the advocate edit this value.",
    );
  });
});

describe("the save gate — an item has to say what is wrong", () => {
  const field = FIELD_BY_ID["c-name"];
  const docRow = FIELD_BY_ID["d-aadhaar"];

  it("accepts a note", () => {
    assert.equal(
      canSaveDraft(field, draft({ text: "  Only the address side.  " })),
      true,
    );
  });

  it("accepts a document reason chip on its own", () => {
    assert.equal(
      canSaveDraft(docRow, draft({ reason: "Blurry / unreadable" })),
      true,
    );
  });

  it("refuses an empty draft and a missing one", () => {
    assert.equal(canSaveDraft(field, draft()), false);
    assert.equal(canSaveDraft(field, null), false);
  });

  it("holds the whole save until the linked document item names a reason", () => {
    const linked = { rowId: "d-aadhaar", docId: "aadhaar", reason: null, note: "" };
    const d = draft({ text: "Only the address side.", linked });
    assert.equal(isLinkedComplete(d), false);
    assert.equal(canSaveDraft(field, d), false);

    const ready = draft({
      text: "Only the address side.",
      linked: { ...linked, reason: "Page missing" },
    });
    assert.equal(isLinkedComplete(ready), true);
    assert.equal(canSaveDraft(field, ready), true);
  });

  it("treats a draft with no linked block as complete", () => {
    assert.equal(isLinkedComplete(draft()), true);
    assert.equal(isLinkedComplete(null), true);
  });
});
