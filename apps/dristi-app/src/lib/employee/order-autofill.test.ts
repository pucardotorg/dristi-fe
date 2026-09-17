/**
 * The auto-fill pass — step 3 of the spec's resolution order.
 *
 * The failure mode this guards is not a broken render. It is **a wrong value silently
 * written into an order**, or a slot that quietly resolves to a blank so the sentence
 * reads finished with a hole in the middle of it. Neither shows up on a screen as
 * anything but correct-looking text, so they are asserted here.
 *
 * The census at the bottom is the load-bearing test: templates are system configuration
 * an administrator edits, so a new one can introduce a token whenever it likes, and every
 * token has to be *decided* — filled by the system, or declared a choice the judge makes.
 * A bracket that is neither is one nobody will ever fill.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CURRENT_STAFF, PRESIDING_MAGISTRATE } from "./content";
import {
  CAUSE_LIST,
  causeTitle,
  formatOrderDate,
  hearingById,
} from "./hearings";
import { applicationsForListing } from "./listing-applications";
import { EMPTY_ORDER_DRAFT, orderTemplateFacts } from "./order-draft";
import { createOrderItem, orderItemStandingText } from "./order-items";
import { applicationForOrder, orderSuggestions } from "./order-suggestions";
import {
  AUTO_FILLED_TOKENS,
  fillGeneralVariables,
  openSlots,
  ORDER_TEMPLATES,
  orderTemplate,
  type OrderTemplateFacts,
} from "./order-templates";

const TODAY = "2026-09-14";

/** h-241 — the listing with two applications standing on it. */
const twoApplications = hearingById("h-241")!;
/** h-245 — the listing with exactly one. */
const oneApplication = hearingById("h-245")!;
/** h-249 — a listing with none. */
const noApplications = hearingById("h-249")!;
/** h-258 — the one carrying an application to withdraw the complaint. */
const withdrawalListing = hearingById("h-258")!;

const facts: OrderTemplateFacts = {
  court: "JMFC Court 1, Kollam",
  caseName: "Sunil Varghese v. Anand Traders",
  caseNumber: "ST/412/2025",
  currentDate: "14 September 2026",
  judgeName: "Sri. Anand Krishnan",
  judgeDesignation: "Judicial Magistrate of the First Class",
  complainant: "Sunil Varghese",
  accused: "Anand Traders",
  currentHearingDate: "14 September 2026",
  applicationNumber: "CMP/312/2026",
  applicationType: "Bail",
  hearingPurpose: "Plea",
  hearingDate: "5 October 2026",
  originalHearingDate: "14 September 2026",
};

describe("what the pass resolves", () => {
  it("fills every token it claims to, and leaves nothing bracketed behind", () => {
    const line = AUTO_FILLED_TOKENS.join(" | ");
    const filled = fillGeneralVariables(line, facts);
    assert.deepEqual(openSlots(filled), []);
    for (const token of AUTO_FILLED_TOKENS) {
      assert.ok(
        !filled.includes(token),
        `${token} survived the pass unresolved`,
      );
    }
  });

  it("replaces every occurrence, not the first", () => {
    /* Six templates use a token twice or more — `[Party Type]` fifteen times across the
       catalogue, `[Mode of ADR]` twice in one sentence. A pass that replaced once would
       leave half a sentence bracketed and look like it had worked. */
    const filled = fillGeneralVariables(
      "[Case Number] and again [Case Number]",
      facts,
    );
    assert.equal(filled, "ST/412/2025 and again ST/412/2025");
  });

  it("leaves an unresolved optional standing as its own token, never blank", () => {
    /* The honesty rule the whole pass rests on: a hole the reader can see, in the place
       the value goes. A blank would read as a finished sentence with a gap in it. */
    const withoutContext: OrderTemplateFacts = {
      ...facts,
      applicationNumber: undefined,
      hearingPurpose: undefined,
      hearingDate: "",
    };
    const filled = fillGeneralVariables(
      "Application [Application Number] listed on [Hearing Date] for [Hearing Purpose].",
      withoutContext,
    );
    assert.equal(
      filled,
      "Application [Application Number] listed on [Hearing Date] for [Hearing Purpose].",
    );
    assert.deepEqual(openSlots(filled), [
      "[Application Number]",
      "[Hearing Date]",
      "[Hearing Purpose]",
    ]);
  });

  it("never touches a value that is the judge's to choose", () => {
    /* D40's lesson, asserted rather than remembered: the old build wrote "Issue summons
       to Anand Traders" and read as finished while nobody had chosen a party. */
    const choices = [
      "[Party Type]",
      "[Party Name]",
      "[Document Type]",
      "[Document Name]",
      "[Amount]",
      "[Date]",
      "[Notice Type]",
      "[Plea]",
      "[Mode of ADR]",
      "[Deadline for Submission]",
      "[Deadline for Response]",
      "[New Submission Date]",
      "[New Hearing Date]",
      "[Date of End of ADR]",
    ];
    const line = choices.join(" | ");
    assert.equal(fillGeneralVariables(line, facts), line);
  });

  it("has no token that is a prefix of another, so plain substitution is safe", () => {
    /* `[Hearing Date]` and `[Original Hearing Date]` are the near miss. Bracketed on both
       ends they cannot collide — this asserts that stays true of every pair, including
       any token a future template adds. */
    for (const a of AUTO_FILLED_TOKENS) {
      for (const b of AUTO_FILLED_TOKENS) {
        if (a === b) continue;
        assert.ok(
          !a.includes(b),
          `${b} is contained in ${a} — substitution order would matter`,
        );
      }
    }
  });
});

describe("an order as it now opens", () => {
  it("carries the application number on the one reachable template that takes it", () => {
    /* `withdrawal-of-case` is #14, in the dropdown, and its BOTD opens on the application
       number as a locked variable. Before this pass it opened on the bracket while the
       application sat on the same screen. */
    const item = createOrderItem("withdrawal-of-case", "t-1", facts);
    assert.ok(item.text.text.startsWith("As per application CMP/312/2026 "));
    assert.deepEqual(openSlots(item.text.text), []);
  });

  it("fills the hearing fields of a scheduling order from the next listing", () => {
    const item = createOrderItem("scheduling-of-hearing", "t-2", facts);
    assert.equal(
      item.text.text,
      "Next hearing is scheduled on 5 October 2026 for Plea.",
    );
  });

  it("still leaves a summons waiting for the party nobody has chosen", () => {
    const item = createOrderItem("issue-of-summons", "t-3", facts);
    assert.deepEqual(openSlots(item.text.text), [
      "[Party Type]",
      "[Party Name]",
      "[Party Type]",
    ]);
  });

  it("returns the bare template when there is no case in hand", () => {
    /* The catalogue can still be asked what a template *says*, independently of any
       listing — which is what the catalogue's own tests read. */
    assert.equal(
      orderItemStandingText("withdrawal-of-case"),
      orderTemplate("withdrawal-of-case").botd,
    );
    assert.equal(createOrderItem("others", "t-4", facts).text.text, "");
  });
});

describe("the facts this listing supplies", () => {
  it("takes court, cause, case number and magistrate off the record", () => {
    const built = orderTemplateFacts(
      noApplications,
      EMPTY_ORDER_DRAFT,
      TODAY,
    );
    assert.equal(built.court, CURRENT_STAFF.court);
    assert.equal(built.caseName, causeTitle(noApplications));
    assert.equal(built.caseNumber, noApplications.caseNumber);
    assert.equal(built.complainant, noApplications.parties.complainant);
    assert.equal(built.accused, noApplications.parties.accused);
    /* The order is the magistrate's, never the seat at the keyboard's. */
    assert.equal(built.judgeName, PRESIDING_MAGISTRATE.name);
    assert.equal(built.judgeDesignation, PRESIDING_MAGISTRATE.designation);
    assert.notEqual(built.judgeName, CURRENT_STAFF.name);
  });

  it("writes dates in the order's register, not the screen's", () => {
    /* "14 September 2026" — the way the court's own orders write a date inside a
       direction. The screen's prose keeps the weekday; an operative sentence does not. */
    const built = orderTemplateFacts(noApplications, EMPTY_ORDER_DRAFT, TODAY);
    assert.equal(built.currentDate, formatOrderDate(TODAY));
    assert.equal(built.currentDate, "14 September 2026");
    assert.ok(!built.currentDate.includes("Monday"));
    assert.equal(built.currentHearingDate, formatOrderDate(TODAY));
  });

  it("does not claim today is the hearing being rescheduled", () => {
    /* The bug the first build of `orderTemplateFacts` shipped with. Template 7 reads
       "Next hearing scheduled on [Original Hearing Date] … has been rescheduled to
       [New Hearing Date]" — the date being moved is a *future* listing's, and today is
       the day the order moving it is passed. Filling it with today would write a false
       statement into an order, which is exactly the failure this file exists to catch. */
    const built = orderTemplateFacts(noApplications, EMPTY_ORDER_DRAFT, TODAY);
    assert.equal(built.originalHearingDate, undefined);
    assert.notEqual(built.originalHearingDate, formatOrderDate(TODAY));

    /* So the rescheduling order opens on that bracket rather than on a wrong date. */
    const item = createOrderItem("rescheduling-of-hearing", "t-12", built);
    assert.ok(
      item.text.text.includes("[Original Hearing Date]"),
      item.text.text,
    );
    assert.ok(!item.text.text.includes(formatOrderDate(TODAY)), item.text.text);
  });

  it("fills nothing off its own bat, however few applications are standing", () => {
    /* The bug the first build shipped: it filled from "the only application on the
       listing". h-245's only application is for **production of documents**, so browsing
       a **withdrawal** order there opened it on that number — a wrong application named in
       an order, reading as finished text. The facts now fill only what a caller names. */
    assert.equal(applicationsForListing(oneApplication.id).length, 1);
    const built = orderTemplateFacts(oneApplication, EMPTY_ORDER_DRAFT, TODAY);
    assert.equal(built.applicationNumber, undefined);
    assert.equal(built.applicationType, undefined);
  });

  it("type-matches rather than counts when nothing was pressed", () => {
    const onH245 = applicationsForListing(oneApplication.id).map((entry) => ({
      number: entry.number,
      type: entry.type,
    }));
    /* A production application does not answer a withdrawal order, so nothing matches
       even though it is the only one there. */
    assert.equal(applicationForOrder("withdrawal-of-case", onH245), undefined);
    /* It does answer the direction to produce, which is the pairing it was mapped on. */
    assert.equal(
      applicationForOrder("mandatory-submissions", onH245)?.number,
      "CMP/305/2026",
    );
    /* And a dismissed one answers nothing at all. */
    assert.equal(
      applicationForOrder("mandatory-submissions", [
        { ...onH245[0], decision: "dismissed" },
      ]),
      undefined,
    );
  });

  it("stays quiet when two applications of the same head are standing", () => {
    const two = [
      { number: "CMP/900/2026", type: "case-withdrawal" as const },
      { number: "CMP/901/2026", type: "case-withdrawal" as const },
    ];
    assert.equal(applicationForOrder("withdrawal-of-case", two), undefined);
    assert.equal(
      applicationForOrder("withdrawal-of-case", [two[0]])?.number,
      "CMP/900/2026",
    );
  });

  it("leaves it open when two are standing and nothing says which", () => {
    assert.equal(applicationsForListing(twoApplications.id).length, 2);
    const built = orderTemplateFacts(
      twoApplications,
      EMPTY_ORDER_DRAFT,
      TODAY,
    );
    assert.equal(built.applicationNumber, undefined);
    assert.equal(built.applicationType, undefined);
  });

  it("takes the one the order was reached from, even when two are standing", () => {
    /* What the suggestion row knows and a count cannot. */
    const [, second] = applicationsForListing(twoApplications.id);
    const built = orderTemplateFacts(
      twoApplications,
      EMPTY_ORDER_DRAFT,
      TODAY,
      second,
    );
    assert.equal(built.applicationNumber, second.number);
    assert.equal(
      built.applicationType,
      "Application to reschedule/adjournment",
    );
  });

  it("has no application at all on a listing with none", () => {
    assert.deepEqual(applicationsForListing(noApplications.id), []);
    const built = orderTemplateFacts(noApplications, EMPTY_ORDER_DRAFT, TODAY);
    assert.equal(built.applicationNumber, undefined);
  });

  it("fills the next listing only once the bench has set it", () => {
    const unset = orderTemplateFacts(
      noApplications,
      EMPTY_ORDER_DRAFT,
      TODAY,
    );
    assert.equal(unset.hearingPurpose, undefined);
    assert.equal(unset.hearingDate, undefined);

    const set = orderTemplateFacts(
      noApplications,
      {
        ...EMPTY_ORDER_DRAFT,
        next: "list",
        nextPurpose: "plea",
        nextDate: "2026-10-05",
      },
      TODAY,
    );
    assert.equal(set.hearingPurpose, "Plea");
    assert.equal(set.hearingDate, "5 October 2026");
  });

  it("supplies no next date when the matter is not being listed again", () => {
    /* "No next date" is a real answer, so there is no value for `[Hearing Date]` to take
       and the token stays standing rather than resolving to a stale one. */
    const built = orderTemplateFacts(
      noApplications,
      {
        ...EMPTY_ORDER_DRAFT,
        next: "none",
        nextPurpose: "plea",
        nextDate: "2026-10-05",
      },
      TODAY,
    );
    assert.equal(built.hearingPurpose, undefined);
    assert.equal(built.hearingDate, undefined);
  });
});

describe("the census — every token is decided", () => {
  /**
   * Tokens the judge answers, declared here rather than in the source.
   *
   * Each is a **choice among options**, which the spec says the system cannot make: a
   * party or a document the case has several of, an amount, a date at the judge's
   * discretion, or a master-data selection. This list living in the test is deliberate —
   * it is a claim about the *catalogue*, so it has to fail when the catalogue changes,
   * not be quietly satisfied by the code changing with it.
   */
  const JUDGE_CHOOSES = new Set([
    "[Party Type]",
    "[Party Name]",
    "[Document Type]",
    "[Document Name]",
    "[Amount]",
    "[Date]",
    "[Notice Type]",
    "[Plea]",
    "[Mode of ADR]",
    "[Deadline for Submission]",
    "[Deadline for Response]",
    "[New Submission Date]",
    "[New Hearing Date]",
    "[Date of End of ADR]",
  ]);

  const used = new Set(
    ORDER_TEMPLATES.flatMap((template) => openSlots(template.botd)),
  );

  it("classifies every token the twenty-seven actually use", () => {
    const filled = new Set(AUTO_FILLED_TOKENS);
    const undecided = [...used].filter(
      (token) => !filled.has(token) && !JUDGE_CHOOSES.has(token),
    );
    assert.deepEqual(
      undecided,
      [],
      `these tokens are neither auto-filled nor declared a judge's choice: ${undecided.join(", ")}`,
    );
  });

  it("declares no choice the catalogue does not contain", () => {
    const stale = [...JUDGE_CHOOSES].filter((token) => !used.has(token));
    assert.deepEqual(stale, [], `no template uses ${stale.join(", ")}`);
  });

  it("records that the six name variables appear in no template", () => {
    /* The finding that corrected D40 in the other direction. The spec's general-variables
       table has thirteen rows; the six *name* ones are real general variables and are
       simply unused by today's twenty-seven. They stay mapped because an administrator can
       edit a template — this asserts the fact, so a future template using one is a change
       somebody sees rather than a surprise. */
    for (const token of [
      "[Court Name]",
      "[Case Name]",
      "[Case Number]",
      "[Current Date]",
      "[Judge Name]",
      "[Judge Designation]",
      "[Complainant Name]",
      "[Accused Name]",
      "[Current Hearing Date]",
    ]) {
      assert.ok(
        !used.has(token),
        `${token} is now used by a template — the auto-fill pass covers it, but D40's note that it is unused is out of date`,
      );
      assert.ok(
        AUTO_FILLED_TOKENS.includes(token),
        `${token} is a general variable and must stay in the pass`,
      );
    }
  });

  it("leaves the whole catalogue openable, with only choices left standing", () => {
    /* Every template, run through the pass with a full set of facts: nothing should be
       left bracketed except values the judge chooses. This is the one test that would
       catch a token that is auto-fillable in principle and missing from the map. */
    for (const template of ORDER_TEMPLATES) {
      for (const slot of openSlots(fillGeneralVariables(template.botd, facts))) {
        assert.ok(
          JUDGE_CHOOSES.has(slot),
          `${template.id} still carries ${slot} after auto-fill, and it is not a judge's choice`,
        );
      }
    }
  });

  it("counts what is left, because the composer shows that number", () => {
    assert.equal(openSlots(fillGeneralVariables(orderTemplate("cognizance").botd, facts)).length, 0);
    assert.equal(openSlots(fillGeneralVariables(orderTemplate("cost").botd, facts)).length, 4);
    assert.equal(
      openSlots(fillGeneralVariables(orderTemplate("withdrawal-of-case").botd, facts)).length,
      0,
    );
  });
});

describe("the whole path a click takes", () => {
  /**
   * Suggestion → facts → text, which is exactly what `addItem` does when a row in
   * "Likely at this hearing" is pressed. Asserted here because the composer's own two
   * lines of JSX are the only part of this path a test cannot reach, and the value being
   * carried — *which application an order names* — is the one that must not be wrong.
   */
  it("opens a withdrawal order on the number of the application it was reached from", () => {
    const [, adjournment] = applicationsForListing(twoApplications.id);
    const draft = {
      ...EMPTY_ORDER_DRAFT,
      /* The bench allows the second of the two — an adjournment, which draws no order of
         its own — and a withdrawal application is not on this listing at all, so this is
         the ambiguous case: two applications standing, and a count cannot say which. */
      applications: { [adjournment.id]: "allowed" as const },
    };

    const ambiguous = orderTemplateFacts(twoApplications, draft, TODAY);
    assert.equal(
      ambiguous.applicationNumber,
      undefined,
      "with two standing and nothing to say which, the token stays open",
    );

    /* But a suggestion row does know, and it is what the click hands over. */
    const suggestions = orderSuggestions({
      purpose: twoApplications.purpose,
      catalogue: {
        cognizanceDue: false,
        longPending: false,
        hearingOngoing: true,
      },
      attendance: [],
      applications: applicationsForListing(twoApplications.id).map(
        (application) => ({
          number: application.number,
          type: application.type,
          decision: draft.applications[application.id],
        }),
      ),
      chosen: [],
    });
    const bail = suggestions.find((entry) => entry.template.id === "bail");
    assert.ok(bail, "the bail application still argues for the bail order");
    assert.equal(bail.fromApplication?.number, "CMP/312/2026");

    /* And the order it opens carries that number rather than a bracket. `bail` has no
       application token of its own, so the assertion is on the facts the click builds —
       and on a template that does take one. */
    const fromRow = orderTemplateFacts(
      twoApplications,
      draft,
      TODAY,
      bail.fromApplication,
    );
    assert.equal(fromRow.applicationNumber, "CMP/312/2026");
    assert.equal(fromRow.applicationType, "Bail");
    const withdrawal = createOrderItem("withdrawal-of-case", "t-9", fromRow);
    assert.ok(
      withdrawal.text.text.startsWith("As per application CMP/312/2026 "),
      withdrawal.text.text,
    );
    assert.deepEqual(openSlots(withdrawal.text.text), []);
  });

  it("opens a browsed order on the application that answers it", () => {
    /* No suggestion row involved — the typist searched the catalogue and picked it. This
       is the path `addItem` takes through `applicationForOrder`, on the one listing that
       carries a withdrawal application (h-258). */
    const signals = applicationsForListing(withdrawalListing.id).map((entry) => ({
      number: entry.number,
      type: entry.type,
    }));
    const matched = applicationForOrder("withdrawal-of-case", signals);
    assert.equal(matched?.number, "CMP/341/2026");
    const item = createOrderItem(
      "withdrawal-of-case",
      "t-10",
      orderTemplateFacts(
        withdrawalListing,
        EMPTY_ORDER_DRAFT,
        TODAY,
        matched,
      ),
    );
    assert.ok(
      item.text.text.startsWith("As per application CMP/341/2026 "),
      item.text.text,
    );
    assert.deepEqual(openSlots(item.text.text), []);
  });

  it("leaves a browsed order open where no application answers it", () => {
    const signals = applicationsForListing(oneApplication.id).map((entry) => ({
      number: entry.number,
      type: entry.type,
    }));
    const item = createOrderItem(
      "withdrawal-of-case",
      "t-13",
      orderTemplateFacts(
        oneApplication,
        EMPTY_ORDER_DRAFT,
        TODAY,
        applicationForOrder("withdrawal-of-case", signals),
      ),
    );
    assert.deepEqual(openSlots(item.text.text), ["[Application Number]"]);
    assert.ok(!item.text.text.includes("CMP/305/2026"), item.text.text);
  });

  it("still opens on the bracket when the listing cannot say which", () => {
    const item = createOrderItem(
      "withdrawal-of-case",
      "t-11",
      orderTemplateFacts(twoApplications, EMPTY_ORDER_DRAFT, TODAY),
    );
    assert.deepEqual(openSlots(item.text.text), ["[Application Number]"]);
  });
});

describe("the fixtures the pass runs against", () => {
  it("names a magistrate and a court for every listing on the board", () => {
    for (const hearing of CAUSE_LIST) {
      const built = orderTemplateFacts(hearing, EMPTY_ORDER_DRAFT, TODAY);
      assert.ok(built.court.length > 0);
      assert.ok(built.caseName.includes(" v. "));
      assert.ok(built.judgeName.length > 0);
    }
  });
});
