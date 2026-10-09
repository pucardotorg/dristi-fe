import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBlankDraft } from "./blank";
import {
  isDelayed,
  limitationView,
  noticeDispatchIssue,
  noticeServiceIssue,
  sectionComplete,
} from "./selectors";
import type { FilingDraft } from "./types";

/** A draft with one cheque returned on 1 Aug and its notice sent and served. */
function dated(): FilingDraft {
  const d = createBlankDraft("draft-limitation");
  d.cheques[0].returnDate = "2026-08-01";
  d.notices[0].dispatchDate = "2026-08-10";
  d.notices[0].delivered = "yes";
  d.notices[0].deliveryDate = "2026-08-14";
  d.jurisdiction.filingDate = "2026-09-10";
  return d;
}

describe("the limitation chain — return, notice, service, cause of action, filing", () => {
  it("takes the cause of action as 15 days after service", () => {
    const lim = limitationView(dated());
    assert.equal(lim.causeDate, "2026-08-29");
    assert.equal(lim.causeDerived, true);
    assert.equal(lim.elapsed, 12);
    assert.equal(lim.withinLimit, true);
  });

  it("flags a notice sent more than 30 days after the cheque came back", () => {
    const d = dated();
    d.notices[0].dispatchDate = "2026-09-05";
    assert.match(noticeDispatchIssue(d, 0) ?? "", /within 30 days/);
    d.notices[0].dispatchDate = "2026-07-30";
    assert.match(noticeDispatchIssue(d, 0) ?? "", /before the cheque was returned/);
    d.notices[0].dispatchDate = "2026-08-31";
    assert.equal(noticeDispatchIssue(d, 0), undefined);
  });

  it("flags a delivery before the dispatch", () => {
    const d = dated();
    d.notices[0].deliveryDate = "2026-08-09";
    assert.match(noticeServiceIssue(d.notices[0]) ?? "", /before the notice was dispatched/);
  });

  it("refuses a typed cause date inside the 15-day payment window", () => {
    const d = dated();
    d.jurisdiction.causeDate = "2026-08-20";
    assert.match(limitationView(d).causeIssue ?? "", /Cannot be before/);
    assert.equal(sectionComplete(d, "jurisdiction"), false);
  });

  it("refuses a filing date before the cause of action", () => {
    const d = dated();
    d.jurisdiction.filingDate = "2026-08-25";
    const lim = limitationView(d);
    assert.match(lim.filingIssue ?? "", /can only be filed once/);
    assert.equal(lim.elapsed, null);
  });

  it("asks for condonation past 30 days, and the fee follows the derived dates", () => {
    const d = dated();
    d.jurisdiction.deposited = "no";
    d.jurisdiction.filingDate = "2026-10-09";
    const lim = limitationView(d);
    assert.equal(lim.overBy, 11);
    assert.equal(isDelayed(d), true);
    assert.equal(sectionComplete(d, "jurisdiction"), false);
    d.jurisdiction.condonationReason = "The complainant was abroad.";
    assert.equal(sectionComplete(d, "jurisdiction"), true);
  });

  it("counts the section complete from a derived cause date, not only a typed one", () => {
    const d = dated();
    d.jurisdiction.deposited = "no";
    assert.equal(sectionComplete(d, "jurisdiction"), true);
  });
});
