import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADVOCATE_LINK_SAMPLES, buildSampleDraft } from "./sample-drafts";
import { signatories } from "./selectors";

describe("the two-advocate sample", () => {
  const draft = buildSampleDraft(ADVOCATE_LINK_SAMPLES[0], "2026-10-07");
  const { complainants, advocates } = signatories(draft, null);

  it("has two complainants, each with their own advocate", () => {
    assert.equal(complainants.length, 2);
    assert.equal(advocates.length, 2);
  });

  it("puts you in the first advocate's seat, signed with the oath still to take", () => {
    const [yours] = advocates;
    assert.equal(yours.you, true);
    assert.equal(yours.status, "signed");
    assert.equal(yours.oathTaken, false);
  });

  it("sends the second advocate a link for their signature and oath", () => {
    const theirs = advocates[1];
    assert.equal(theirs.you, false);
    assert.equal(theirs.status, "pending");
    assert.equal(theirs.oathTaken, false);
    assert.ok(draft.sign.notified[theirs.id], "their link has gone out");
  });
});
