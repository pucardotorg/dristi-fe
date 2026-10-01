import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { QUEUE } from "./fixtures";
import { filterQueue, nextFilingAfter } from "./queue";

const work = filterQueue(QUEUE, "registry", "anyone", "");

describe("nextFilingAfter — what Next file reaches for", () => {
  it("follows the order the queue shows, not the fixture's", () => {
    assert.ok(work.length > 2, "the registry list needs rows to walk");
    assert.equal(nextFilingAfter(work[0].no)?.no, work[1].no);
    assert.equal(nextFilingAfter(work[1].no)?.no, work[2].no);
  });

  it("is undefined on the last row, so the caller can offer the queue", () => {
    assert.equal(nextFilingAfter(work[work.length - 1].no), undefined);
  });

  it("answers the first row for a filing that is not in the work list", () => {
    const away = QUEUE.find((filing) => filing.ball !== "registry");
    assert.ok(away, "the fixture needs a filing that is not with the registry");
    assert.equal(nextFilingAfter(away.no)?.no, work[0].no);
  });

  it("answers the first row for an id that names nothing", () => {
    assert.equal(nextFilingAfter("F/NOPE/0000/00000")?.no, work[0].no);
  });
});
