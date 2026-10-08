import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBlankDraft, migrateDraft } from "./blank";
import { isOutstanding, signatories, signingComplete } from "./selectors";
import type { FilingDraft } from "./types";

/** One complainant with one advocate on record — the commonest shape of a filing. */
function draftWithAdvocate(): FilingDraft {
  const d = createBlankDraft("draft-oath");
  d.complainants[0].name = "Zeenath Beevi";
  d.advocates[0].name = "Anjali Nair";
  d.advocates[0].barNumber = "K/123/2010";
  return d;
}

describe("advocate's oath", () => {
  it("is off by default: advocates owe no oath, and the fee opens once everyone signs", () => {
    const d = draftWithAdvocate();
    const { complainants, advocates } = signatories(d, null);
    assert.equal(complainants[0].oathTaken, undefined);
    assert.equal(advocates[0].oathTaken, undefined);

    const at = "2026-10-06T10:00:00.000Z";
    for (const s of [...complainants, ...advocates]) d.sign.signed[s.id] = { at, with: "aadhaar" };
    assert.equal(signingComplete(d, null), true);
  });

  it("when switched on, is owed by advocates only, never by complainants", () => {
    const { complainants, advocates } = signatories(draftWithAdvocate(), null, true);
    assert.equal(complainants[0].oathTaken, undefined);
    assert.equal(advocates[0].oathTaken, false);
  });

  it("when switched on, keeps the court fee shut after every signature until the oath is in", () => {
    const d = draftWithAdvocate();
    const at = "2026-10-06T10:00:00.000Z";
    for (const s of Object.values(signatories(d, null, true)).flat()) {
      d.sign.signed[s.id] = { at, with: "aadhaar" };
    }
    assert.equal(signingComplete(d, null, true), false);

    const advocate = signatories(d, null, true).advocates[0];
    assert.equal(isOutstanding(advocate), true);

    d.sign.oaths[advocate.id] = { at, video: null };
    assert.equal(signingComplete(d, null, true), true);
  });

  it("moves an old draft off the retired Oath step and drops the complainant's video", () => {
    const old = draftWithAdvocate();
    (old as unknown as { lastStep: string }).lastStep = "oath";
    (old.complainants[0] as unknown as { oathVideo: unknown }).oathVideo = {
      file: { id: "f1", name: "oath.mp4", type: "video/mp4", size: 1 },
      durationSeconds: 30,
    };
    delete (old.sign as { oaths?: unknown }).oaths;

    const d = migrateDraft(old as FilingDraft);
    assert.equal(d.lastStep, "affidavit");
    assert.equal("oathVideo" in d.complainants[0], false);
    assert.deepEqual(d.sign.oaths, {});
  });
});
