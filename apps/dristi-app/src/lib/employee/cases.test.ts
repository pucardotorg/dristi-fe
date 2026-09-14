import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COURT_CASE_COUNT,
  COURT_CASE_FLAG_LABEL,
  COURT_CASES,
  COURT_PRIORITIES,
  courtCaseAge,
  courtCaseTitle,
  courtPriorityById,
  courtPriorityCount,
  courtStageSpread,
  oldestCourtCase,
  EMPTY_COURT_CASE_FILTERS,
  filterCourtCases,
  hasCourtCaseFilters,
  nextHearingDay,
  registeredDay,
  type CourtCaseFlag,
} from "./cases";
import { CAUSE_LIST, causeTitle, COURT_CASE_STAGES } from "./hearings";

const TODAY = "2026-09-14";

describe("the court register", () => {
  /* The dashboard and the cause list must not name the same case two ways. The register
     builds today's rows from `CAUSE_LIST`, and this is the assertion that keeps it. */
  it("holds every matter listed today, with the cause list's own title and stage", () => {
    for (const hearing of CAUSE_LIST) {
      const record = COURT_CASES.find(
        (entry) => entry.caseNumber === hearing.caseNumber,
      );
      assert.ok(record, `${hearing.caseNumber} is not on the register`);
      assert.equal(courtCaseTitle(record), causeTitle(hearing));
      assert.equal(record.stage, hearing.stage);
      assert.equal(record.nextHearingInDays, 0, "a matter listed today has no date");
    }
  });

  it("gives every case one id and one case number", () => {
    const ids = new Set(COURT_CASES.map((record) => record.id));
    const numbers = new Set(COURT_CASES.map((record) => record.caseNumber));
    assert.equal(ids.size, COURT_CASE_COUNT);
    assert.equal(numbers.size, COURT_CASE_COUNT);
  });

  it("names every flag it sets", () => {
    for (const record of COURT_CASES) {
      for (const flag of record.flags) {
        assert.ok(COURT_CASE_FLAG_LABEL[flag], `${flag} has no label`);
      }
    }
  });

  it("has a date in front of it, or no date at all — never one behind", () => {
    for (const record of COURT_CASES) {
      if (record.nextHearingInDays === null) continue;
      assert.ok(
        record.nextHearingInDays >= 0,
        `${record.caseNumber} is listed in the past`,
      );
    }
  });

  /* Dates are offsets so a demo opened next month is not a screen of expired listings. */
  it("resolves offsets against the day it is asked about", () => {
    const listedToday = COURT_CASES.find((r) => r.nextHearingInDays === 0);
    assert.ok(listedToday);
    assert.equal(nextHearingDay(listedToday, TODAY), TODAY);

    const awaitingCognizance = COURT_CASES.find(
      (r) => r.nextHearingInDays === null,
    );
    assert.ok(awaitingCognizance);
    assert.equal(nextHearingDay(awaitingCognizance, TODAY), null);

    const old = COURT_CASES.find((r) => r.caseNumber === "ST/29/2025");
    assert.ok(old);
    assert.equal(nextHearingDay(old, TODAY), "2026-09-28");
    assert.equal(registeredDay(old, TODAY), "2025-07-21");
  });
});

describe("the bench's six priorities", () => {
  it("offers six, each with a tile name, a full title and a meaning", () => {
    assert.equal(COURT_PRIORITIES.length, 6);
    for (const priority of COURT_PRIORITIES) {
      assert.ok(priority.tile);
      assert.ok(priority.title);
      assert.ok(priority.meaning);
      assert.equal(courtPriorityById(priority.id), priority);
      /* A tile name that is longer than its full title is a tile name that did not get
         shortened — which is the whole reason there are two. */
      assert.ok(
        priority.tile.length <= priority.title.length,
        `${priority.id}'s tile name is not shorter than its title`,
      );
    }
  });

  /* Cognizance and process are stages the register already knew; the other four are
     facts about the matter. Neither kind is allowed to be empty demo data — a tile that
     reads 0 on every demo proves nothing about the composition. */
  it("holds at least one case in every category", () => {
    for (const priority of COURT_PRIORITIES) {
      assert.ok(
        courtPriorityCount(priority) > 0,
        `${priority.id} has no cases behind it`,
      );
    }
  });

  it("derives cognizance and process from the stage, not from a flag", () => {
    const cognizance = courtPriorityById("pending-cognizance");
    const process = courtPriorityById("process-pending");
    assert.ok(cognizance && process);
    assert.equal(
      courtPriorityCount(cognizance),
      COURT_CASES.filter((r) => r.stage === "cognizance").length,
    );
    assert.equal(
      courtPriorityCount(process),
      COURT_CASES.filter((r) => r.stage === "process").length,
    );
  });

  it("reads the other four off the case's flags", () => {
    const flags: CourtCaseFlag[] = ["utp", "stayed", "time-bound", "appellate-pending"];
    for (const flag of flags) {
      const priority = courtPriorityById(flag);
      assert.ok(priority, `${flag} is not a priority`);
      assert.equal(
        courtPriorityCount(priority),
        COURT_CASES.filter((r) => r.flags.includes(flag)).length,
      );
    }
  });

  /* A case can be stayed and at evidence stage at once, so the six do not partition the
     register and their counts are not expected to add up to it. */
  it("lets one case hold more than one priority", () => {
    const doubled = COURT_CASES.find((r) => r.flags.length > 1);
    assert.ok(doubled, "no case exercises the multi-priority row");
  });
});

describe("filtering the register", () => {
  it("returns everything with nothing set", () => {
    assert.equal(hasCourtCaseFilters(EMPTY_COURT_CASE_FILTERS), false);
    assert.equal(
      filterCourtCases(EMPTY_COURT_CASE_FILTERS).length,
      COURT_CASE_COUNT,
    );
  });

  it("narrows to a priority, and the count matches its tile", () => {
    for (const priority of COURT_PRIORITIES) {
      const rows = filterCourtCases({
        ...EMPTY_COURT_CASE_FILTERS,
        priority: priority.id,
      });
      assert.equal(rows.length, courtPriorityCount(priority));
      assert.ok(rows.every(priority.matches));
    }
  });

  it("finds a file by number whatever its case or padding", () => {
    for (const query of ["ST/241/2026", "st/241/2026", "  ST/241/2026  "]) {
      const rows = filterCourtCases({ ...EMPTY_COURT_CASE_FILTERS, query });
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.caseNumber, "ST/241/2026");
    }
  });

  it("finds a file by either party, and by the cause title", () => {
    assert.ok(
      filterCourtCases({ ...EMPTY_COURT_CASE_FILTERS, query: "Sunil" }).length > 0,
    );
    assert.ok(
      filterCourtCases({ ...EMPTY_COURT_CASE_FILTERS, query: "Anand Traders" })
        .length > 0,
    );
    assert.ok(
      filterCourtCases({
        ...EMPTY_COURT_CASE_FILTERS,
        query: "Varghese v. Anand",
      }).length > 0,
    );
  });

  it("finds nothing for a number no file holds", () => {
    assert.equal(
      filterCourtCases({ ...EMPTY_COURT_CASE_FILTERS, query: "ST/999/2099" })
        .length,
      0,
    );
  });

  it("stacks a stage, a priority and a search rather than replacing them", () => {
    const rows = filterCourtCases({
      query: "",
      stage: "evidence",
      priority: "stayed",
    });
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.stage === "evidence" && r.flags.includes("stayed")));
    /* Narrower than either on its own is the point of stacking. */
    assert.ok(
      rows.length <=
        filterCourtCases({ ...EMPTY_COURT_CASE_FILTERS, priority: "stayed" }).length,
    );
  });
});

describe("the court's health check", () => {
  it("spreads every case across the stages, in pipeline order", () => {
    const spread = courtStageSpread();
    assert.deepEqual(
      spread.map((entry) => entry.stage),
      COURT_CASE_STAGES.map((stage) => stage.id),
      "the bars are not in the order a case moves through them",
    );
    assert.equal(
      spread.reduce((total, entry) => total + entry.count, 0),
      COURT_CASE_COUNT,
      "the stages do not account for every case",
    );
    for (const entry of spread) {
      assert.ok(entry.label, `${entry.stage} has no label`);
    }
  });

  it("names the oldest case on the file", () => {
    const oldest = oldestCourtCase();
    assert.ok(oldest);
    for (const record of COURT_CASES) {
      assert.ok(record.registeredDaysAgo <= oldest.registeredDaysAgo);
    }
  });

  it("has no oldest case in an empty register", () => {
    assert.equal(oldestCourtCase([]), undefined);
  });

  /* The unit a court would say out loud, and never a zero second unit. */
  it("says an age in the unit that fits it", () => {
    assert.equal(courtCaseAge(1), "1 day");
    assert.equal(courtCaseAge(18), "18 days");
    assert.equal(courtCaseAge(30), "30 days");
    assert.equal(courtCaseAge(61), "2 months");
    assert.equal(courtCaseAge(365), "1 year");
    assert.equal(courtCaseAge(420), "1 year 1 month");
    assert.equal(courtCaseAge(800), "2 years 2 months");
    for (const days of [365, 730, 1095]) {
      assert.ok(
        !courtCaseAge(days).includes("0 month"),
        `${days} days reads with a zero second unit`,
      );
    }
  });
});
