import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DOC_ROW } from "./bundle";
import { FIELD_BY_ID } from "./sections";
import type { Draft, FlagMap, ScrutinyLookups } from "./types";
import {
  applyLinkDoc as applyLinkDocRaw,
  applyRemoveFlag,
  applySaveFlag as applySaveFlagRaw,
  survivingPartner,
  type ScrutinyState,
} from "./use-scrutiny-state";

/** The authored case's own maps — the fixture these transitions were written against. */
const LOOK: ScrutinyLookups = { fieldById: FIELD_BY_ID, docRow: DOC_ROW };
const applySaveFlag = (s: ScrutinyState) => applySaveFlagRaw(s, LOOK);
const applyLinkDoc = (s: ScrutinyState, docId: string) =>
  applyLinkDocRaw(s, docId, LOOK);

function draft(over: Partial<Draft> = {}): Draft {
  return {
    text: "",
    reason: null,
    linked: null,
    ...over,
  };
}

function state(over: Partial<ScrutinyState> = {}): ScrutinyState {
  return {
    flags: {},
    selectedId: null,
    composeField: null,
    draft: null,
    pendingFocus: null,
    ...over,
  };
}

/** The Full name composer, about a value read from the Aadhaar. */
function composingName(over: Partial<Draft> = {}): ScrutinyState {
  return state({
    composeField: "c-name",
    draft: draft({
      text: "Only the address side of the Aadhaar was uploaded.",
      ...over,
    }),
  });
}

const LINKED = {
  rowId: "d-aadhaar",
  docId: "aadhaar",
  reason: "Page missing",
  note: "Re-scan the front side at 300 dpi.",
};

describe("applyLinkDoc — the sub-composer opens, nothing is created", () => {
  it("opens an empty linked block", () => {
    const next = applyLinkDoc(composingName(), "aadhaar");
    assert.deepEqual(next.draft?.linked, {
      rowId: "d-aadhaar",
      docId: "aadhaar",
      reason: null,
      note: "",
    });
    // Nothing exists yet — the officer still has to say what is wrong, and save.
    assert.deepEqual(next.flags, {});
  });

  it("never pre-selects a reason, not even on a poor scan", () => {
    const s = state({
      composeField: "p-aff",
      draft: draft({ text: "Second paragraph is blurred." }),
    });
    assert.equal(applyLinkDoc(s, "affidavit").draft?.linked?.reason, null);
  });

  it("leaves an in-progress linked block alone", () => {
    const next = applyLinkDoc(composingName({ linked: LINKED }), "aadhaar");
    assert.deepEqual(next.draft?.linked, LINKED);
  });
});

describe("applySaveFlag — one act, two grants", () => {
  it("writes both items, linked to each other", () => {
    const next = applySaveFlag(composingName({ linked: LINKED }));

    const fieldItem = next.flags["c-name"];
    const docItem = next.flags["d-aadhaar"];
    assert.ok(fieldItem && docItem);

    assert.equal(fieldItem.linkedTo, "d-aadhaar");
    assert.equal(docItem.linkedFrom, "c-name");
    assert.equal(docItem.reason, "Page missing");
    // The field note is about the value, the document note about the file. Two items
    // repeating one sentence leave the advocate unable to tell what answers what.
    assert.equal(docItem.comment, LINKED.note);
    assert.notEqual(docItem.comment, fieldItem.comment);
    // The composer closes behind the save.
    assert.equal(next.composeField, null);
    assert.equal(next.draft, null);
  });

  it("refuses to save when the linked item has no reason", () => {
    const s = composingName({ linked: { ...LINKED, reason: null } });
    assert.equal(applySaveFlag(s), s);
  });

  it("refuses to save an item that says nothing", () => {
    const s = composingName({ text: "" });
    assert.equal(applySaveFlag(s), s);
  });

  it("saves a lone field item with no link", () => {
    const next = applySaveFlag(composingName());
    assert.equal(next.flags["c-name"].linkedTo, null);
    assert.equal(next.flags["d-aadhaar"], undefined);
  });

  it("drops the partner when the officer edits and unlinks — at save, not before", () => {
    const saved = applySaveFlag(composingName({ linked: LINKED }));
    const editing: ScrutinyState = {
      ...saved,
      composeField: "c-name",
      draft: draft({
        text: "Only the address side of the Aadhaar was uploaded.",
        linked: null,
      }),
    };

    const next = applySaveFlag(editing);
    assert.equal(next.flags["d-aadhaar"], undefined);
    assert.equal(next.flags["c-name"].linkedTo, null);
  });

  it("keeps the document row's own linkedFrom when it is edited directly", () => {
    const saved = applySaveFlag(composingName({ linked: LINKED }));
    const editingRow: ScrutinyState = {
      ...saved,
      composeField: "d-aadhaar",
      draft: draft({ reason: "Blurry / unreadable", text: "Re-scan it." }),
    };

    const next = applySaveFlag(editingRow);
    assert.equal(next.flags["d-aadhaar"].linkedFrom, "c-name");
    assert.equal(next.flags["c-name"].linkedTo, "d-aadhaar");
  });
});

describe("removal never cascades", () => {
  const saved = applySaveFlag(composingName({ linked: LINKED }));

  it("leaves the document issue standing when the field flag goes", () => {
    const next = applyRemoveFlag(saved, "c-name");
    assert.equal(next.flags["c-name"], undefined);
    // A bad scan is still a bad scan.
    assert.ok(next.flags["d-aadhaar"]);
    assert.equal(next.flags["d-aadhaar"].linkedFrom, null);
  });

  it("names the item left behind, so the toast can be honest", () => {
    assert.equal(survivingPartner(saved.flags, "c-name"), "d-aadhaar");
  });

  it("says nothing when the document item is the one removed", () => {
    assert.equal(survivingPartner(saved.flags, "d-aadhaar"), null);
    const next = applyRemoveFlag(saved, "d-aadhaar");
    assert.equal(next.flags["d-aadhaar"], undefined);
    assert.ok(next.flags["c-name"]);
    assert.equal(next.flags["c-name"].linkedTo, null);
  });

  it("removes the survivor too when the toast action is taken", () => {
    const once = applyRemoveFlag(saved, "c-name");
    const twice = applyRemoveFlag(once, "d-aadhaar");
    assert.deepEqual(twice.flags, {});
  });

  it("is a no-op for an item that is not there", () => {
    const flags: FlagMap = saved.flags;
    assert.equal(survivingPartner(flags, "c-mob"), null);
    assert.equal(applyRemoveFlag(saved, "c-mob"), saved);
  });

  it("closes the composer when the item being edited is removed", () => {
    const editing: ScrutinyState = { ...saved, composeField: "c-name", draft: draft() };
    const next = applyRemoveFlag(editing, "c-name");
    assert.equal(next.composeField, null);
    assert.equal(next.draft, null);
  });
});
