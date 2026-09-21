import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DOC_ROW } from "./bundle";
import {
  canSaveDraft,
  collectMarks,
  docMarkCount,
  isLinkedComplete,
  saysSomething,
  unlocksSentence as unlocksSentenceRaw,
} from "./field";
import { FIELD_BY_ID } from "./sections";
import type { Draft, Evidence, Field, Flag, FlagMap, Rect } from "./types";

const unlocksSentence = (field: Field) => unlocksSentenceRaw(field, DOC_ROW);

const RECT: Rect = [10, 20, 30, 40];

function draft(over: Partial<Draft> = {}): Draft {
  return {
    value: "",
    text: "",
    reason: null,
    voice: false,
    recording: false,
    prefilled: false,
    evidence: null,
    askReupload: null,
    linked: null,
    ...over,
  };
}

function flag(over: Partial<Flag> = {}): Flag {
  return {
    correction: null,
    reason: null,
    comment: null,
    voice: false,
    evidence: null,
    ...over,
  };
}

const mark = (doc: string, rect: Rect = RECT): Evidence => ({ doc, rect });

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

  it("refuses a mark with no words — that is the one-word remark, drawn", () => {
    const d = draft({ evidence: mark("aadhaar"), value: field.value });
    assert.equal(saysSomething(field, d), false);
    assert.equal(canSaveDraft(field, d), false);
  });

  it("refuses a voice press that produced nothing", () => {
    const d = draft({ voice: true, value: field.value });
    assert.equal(canSaveDraft(field, d), false);
  });

  it("accepts a note", () => {
    assert.equal(
      canSaveDraft(field, draft({ text: "  Only the address side.  " })),
      true,
    );
  });

  it("accepts a correction with no note — it states itself", () => {
    assert.equal(
      canSaveDraft(field, draft({ value: "Prateek Agarwal" })),
      true,
    );
  });

  it("does not mistake the untouched filed value for a correction", () => {
    assert.equal(canSaveDraft(field, draft({ value: field.value })), false);
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

describe("collectMarks — one box per defect", () => {
  it("draws one box for a linked pair and counts two items behind it", () => {
    const flags: FlagMap = {
      "c-name": flag({
        comment: "Only the address side.",
        evidence: mark("aadhaar"),
        linkedTo: "d-aadhaar",
      }),
      "d-aadhaar": flag({
        reason: "Page missing",
        evidence: mark("aadhaar"),
        linkedFrom: "c-name",
      }),
    };

    const marks = collectMarks(flags);
    assert.equal(marks.length, 1);
    // The survivor is the field item: it holds the officer's words.
    assert.equal(marks[0].fieldId, "c-name");
    assert.equal(marks[0].count, 2);
    assert.equal(docMarkCount("aadhaar", flags), 1);
  });

  it("keeps both boxes when the linked item was moved to its own region", () => {
    const flags: FlagMap = {
      "c-name": flag({
        comment: "Only the address side.",
        evidence: mark("aadhaar"),
        linkedTo: "d-aadhaar",
      }),
      "d-aadhaar": flag({
        reason: "Page missing",
        evidence: mark("aadhaar", [1, 2, 3, 4]),
        linkedFrom: "c-name",
      }),
    };

    assert.equal(collectMarks(flags).length, 2);
    assert.equal(docMarkCount("aadhaar", flags), 2);
  });

  it("counts unlinked marks on the same document separately", () => {
    const flags: FlagMap = {
      "c-name": flag({ comment: "a", evidence: mark("aadhaar") }),
      "c-perm": flag({ comment: "b", evidence: mark("aadhaar", [5, 5, 5, 5]) }),
      "q-amt": flag({ comment: "c", evidence: mark("cheque") }),
    };
    assert.equal(docMarkCount("aadhaar", flags), 2);
    assert.equal(docMarkCount("cheque", flags), 1);
  });

  it("ignores items with no mark", () => {
    assert.deepEqual(collectMarks({ "c-mob": flag({ comment: "x" }) }), []);
    assert.equal(docMarkCount("aadhaar", {}), 0);
  });
});
