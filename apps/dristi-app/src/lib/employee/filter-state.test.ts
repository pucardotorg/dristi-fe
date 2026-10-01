import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPendingFilterChange, matchesQuery } from "./filter-state";

/* What a Case name column actually prints, and what therefore gets typed back into a box
   labelled "case name or number". No stored field holds this string. */
const CAUSE = "Girija Damodaran v. Sabu Chacko";
const NUMBER = "ST/1307/2026";

describe("matchesQuery", () => {
  it("finds a row by the cause title exactly as the column prints it", () => {
    assert.ok(matchesQuery(CAUSE, CAUSE, NUMBER));
  });

  it("finds it by a fragment that straddles the two parties", () => {
    /* The regression this function exists for: matching one contiguous substring against
       the parties separately fails every query that crosses the "v.". */
    assert.ok(matchesQuery("Damodaran v. Sabu", CAUSE, NUMBER));
    assert.ok(matchesQuery("Girija Chacko", CAUSE, NUMBER));
  });

  it("ignores case, order and stray space", () => {
    assert.ok(matchesQuery("girija chacko", CAUSE, NUMBER));
    assert.ok(matchesQuery("chacko girija", CAUSE, NUMBER));
    assert.ok(matchesQuery("Girija   Damodaran", CAUSE, NUMBER));
    assert.ok(matchesQuery("  sabu  ", CAUSE, NUMBER));
  });

  it("finds it by whole or partial number", () => {
    assert.ok(matchesQuery(NUMBER, CAUSE, NUMBER));
    assert.ok(matchesQuery("1307", CAUSE, NUMBER));
  });

  it("asks for every token, not any of them", () => {
    assert.ok(!matchesQuery("Girija Menon", CAUSE, NUMBER));
    assert.ok(!matchesQuery("Chacko ST/9999", CAUSE, NUMBER));
  });

  it("treats an empty or blank box as no filter at all", () => {
    assert.ok(matchesQuery("", CAUSE, NUMBER));
    assert.ok(matchesQuery("   ", CAUSE, NUMBER));
  });

  it("skips a part a row does not carry", () => {
    assert.ok(matchesQuery("girija", CAUSE, undefined));
    assert.ok(!matchesQuery("st/1307", CAUSE, undefined));
  });

  it("agrees with the empty state about what counts as a request", () => {
    /* The two have to answer the same way about a blank-looking box. The queues filter as
       they are typed now, so this pairing decides what a reader is *told*: a box holding
       only spaces filters nothing, so the screen must not call itself filtered and offer
       "no results match this search" over a list that is simply empty. */
    const unfiltered = { query: "" };
    for (const query of ["", " ", "   "]) {
      assert.equal(isPendingFilterChange({ query }, unfiltered), false);
      assert.equal(matchesQuery(query, CAUSE, NUMBER), true);
    }
  });

  it("calls a real query a filtered view", () => {
    /* The other half of the same contract, and the one that survived the Search button:
       once there is something to match on, the screen is filtered and its empty state
       should say so. */
    assert.equal(
      isPendingFilterChange({ query: "girija" }, { query: "" }),
      true,
    );
  });
});
