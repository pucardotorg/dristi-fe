import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  casesOnTab,
  COGNIZANCE_QUEUE,
  hasDelay,
  isCognizanceAct,
  primaryActFor,
  tabFor,
  type CognizanceAct,
  type CognizanceCase,
} from "./cognizance";
import {
  cognizanceComposite,
  cognizanceOrderBlockers,
  cognizanceOrderOutcome,
  cognizanceTemplateFacts,
  composedText,
  defaultNextPurposeFor,
  defaultNextPurposeLabel,
  DELAY_APPLICATION_TYPE,
  delayApplicationNumber,
  itemOpenSlots,
  type CognizanceOrderItem,
} from "./cognizance-order";
import { COURT_HEARING_PURPOSES } from "./hearings";
import { orderTemplate } from "./order-templates";
import { defaultProcessVariables } from "./process-variables";
import {
  subjectAppearances,
  subjectApplications,
  subjectCauseTitle,
  subjectCaseNumber,
  subjectFacts,
  subjectScheduling,
  subjectTrail,
  type OrderSubject,
} from "./order-subject";

const TODAY = "2026-09-24";

const late = casesOnTab(COGNIZANCE_QUEUE, "with-delay")[0];
const timely = casesOnTab(COGNIZANCE_QUEUE, "without-delay")[0];

function compose(matter: CognizanceCase, act: CognizanceAct) {
  return cognizanceComposite(
    matter,
    act,
    cognizanceTemplateFacts(matter, TODAY, {
      purpose: defaultNextPurposeLabel(act),
    }),
  );
}

/** As a composite arrives, minus the one thing it never carries on its own — the
 *  delivery-channel confirmation `cognizanceOrderBlockers` now also gates on. */
function withConfirmedDelivery(
  items: CognizanceOrderItem[],
): CognizanceOrderItem[] {
  return items.map((item) =>
    item.template === "issue-of-summons" || item.template === "issue-of-notice"
      ? { ...item, variables: defaultProcessVariables("Anand Traders") }
      : item,
  );
}

describe("the composite each act loads", () => {
  it("takes cognizance with summons and a hearing, and the delay ahead of it", () => {
    assert.deepEqual(
      compose(late, "cognizance").map((item) => item.id),
      [
        "accept-application",
        "cognizance",
        "issue-of-summons",
        "scheduling-of-hearing",
      ],
    );
  });

  it("leaves the delay application out of a complaint filed in time", () => {
    const ids = compose(timely, "cognizance").map((item) => item.id);
    assert.ok(!ids.includes("accept-application"));
    assert.deepEqual(ids, [
      "cognizance",
      "issue-of-summons",
      "scheduling-of-hearing",
    ]);
  });

  it("issues a notice with a hearing, and nothing else", () => {
    assert.deepEqual(
      compose(late, "notice").map((item) => item.id),
      ["issue-of-notice", "scheduling-of-hearing"],
    );
  });

  it("dismisses with one item and schedules nothing", () => {
    const items = compose(late, "dismiss");
    assert.deepEqual(
      items.map((item) => item.id),
      ["dismiss-case"],
    );
    assert.ok(!items.some((item) => item.schedules));
  });

  it("schedules a hearing on both positive acts and only those", () => {
    for (const matter of [late, timely]) {
      for (const act of ["cognizance", "notice"] as CognizanceAct[]) {
        assert.ok(
          compose(matter, act).some((item) => item.schedules),
          `${matter.id} ${act}`,
        );
      }
      assert.ok(!compose(matter, "dismiss").some((item) => item.schedules));
    }
  });

  it("fixes the act's own item and leaves the rest removable", () => {
    const fixed = (act: CognizanceAct, matter: CognizanceCase) =>
      compose(matter, act)
        .filter((item) => item.fixed)
        .map((item) => item.id);
    assert.deepEqual(fixed("cognizance", late), ["cognizance"]);
    assert.deepEqual(fixed("notice", late), ["issue-of-notice"]);
    assert.deepEqual(fixed("dismiss", late), ["dismiss-case"]);
  });

  it("gives every item a distinct id, so an edit cannot land on two", () => {
    for (const matter of COGNIZANCE_QUEUE) {
      for (const act of ["cognizance", "notice", "dismiss"] as CognizanceAct[]) {
        const ids = compose(matter, act).map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length, `${matter.id} ${act}`);
      }
    }
  });

  it("words every item from the catalogue, never from here", () => {
    for (const item of compose(late, "cognizance")) {
      const botd = orderTemplate(item.template).botd;
      /* The first clause survives filling on every one of these templates, which is
         enough to prove the sentence came from the catalogue and not from us. */
      const opening = botd.split(/[[.]/)[0].trim();
      assert.ok(item.text.startsWith(opening), item.id);
    }
  });
});

describe("what the composite fills in", () => {
  it("names the delay application without saying 'application' twice", () => {
    const accept = compose(late, "cognizance").find(
      (item) => item.id === "accept-application",
    )!;
    assert.equal(
      accept.text,
      `Application ${delayApplicationNumber(late)} for ${DELAY_APPLICATION_TYPE} is accepted.`,
    );
    assert.ok(!/Application for .*Application/.test(accept.text));
  });

  it("summons the accused and puts the steps on the complainant", () => {
    const summons = compose(timely, "cognizance").find(
      (item) => item.id === "issue-of-summons",
    )!;
    assert.ok(summons.text.includes(`accused ${timely.parties.accused}`));
    assert.ok(summons.text.includes("The complainant is directed"));
    assert.deepEqual(itemOpenSlots(summons), []);
  });

  it("leaves no blank on a notice but the ones a date fills", () => {
    const notice = compose(late, "notice").find(
      (item) => item.id === "issue-of-notice",
    )!;
    assert.deepEqual(itemOpenSlots(notice), []);
    assert.ok(notice.text.startsWith("Issue DCA notice to the accused"));
  });

  it("holds the hearing date open until one is picked, and only the date", () => {
    const blank = compose(late, "cognizance").find((item) => item.schedules)!;
    /* The purpose is the act's own and arrives filled; the date is the judge's. */
    assert.deepEqual(itemOpenSlots(blank), ["[Hearing Date]"]);
    assert.ok(blank.text.includes("Appearance"));

    const filled = composedText(
      "scheduling-of-hearing",
      late,
      cognizanceTemplateFacts(late, TODAY, {
        date: "2026-10-12",
        purpose: "Appearance",
      }),
    );
    assert.equal(
      filled,
      "Next hearing is scheduled on 12 October 2026 for Appearance.",
    );
  });

  it("derives the delay application's number from the filing it came in on", () => {
    assert.match(delayApplicationNumber(late), /^CMP\/\d{4}\/\d{4}$/);
  });
});

describe("cognizanceOrderBlockers", () => {
  const items = compose(late, "cognizance");

  it("holds the order back until the hearing has a date", () => {
    const blockers = cognizanceOrderBlockers(items, null, TODAY);
    assert.ok(blockers.some((line) => line.includes("needs a date")));
  });

  it("does not count the missing date twice, as a date and as a blank", () => {
    const blockers = cognizanceOrderBlockers(
      withConfirmedDelivery(items),
      null,
      TODAY,
    );
    assert.equal(blockers.length, 1);
  });

  it("refuses a date that has already gone, and today's", () => {
    for (const day of ["2026-09-23", TODAY]) {
      const blockers = cognizanceOrderBlockers(items, day, TODAY);
      assert.ok(
        blockers.some((line) => line.includes("later date")),
        day,
      );
    }
  });

  it("clears once a later date is set and delivery is confirmed", () => {
    assert.deepEqual(
      cognizanceOrderBlockers(withConfirmedDelivery(items), "2026-10-12", TODAY),
      [],
    );
  });

  it("holds the order back until the summons has its delivery channels confirmed", () => {
    const blockers = cognizanceOrderBlockers(items, "2026-10-12", TODAY);
    assert.ok(
      blockers.some((line) => line.includes("delivery channels confirmed")),
    );
  });

  it("names an item that still has a blank in it", () => {
    const withBlank = [
      { ...items[1], text: "Cognizance is taken of [Something]." },
    ];
    const blockers = cognizanceOrderBlockers(withBlank, "2026-10-12", TODAY);
    assert.ok(blockers.some((line) => line.includes("Cognizance")));
  });

  it("lets a dismissal through with no date at all", () => {
    assert.deepEqual(
      cognizanceOrderBlockers(compose(late, "dismiss"), null, TODAY),
      [],
    );
  });
});

describe("the act's own words", () => {
  it("says the delay is condoned only where there is one", () => {
    assert.ok(cognizanceOrderOutcome(late, "cognizance").includes("delay"));
    assert.ok(!cognizanceOrderOutcome(timely, "cognizance").includes("delay"));
  });

  it("offers a next purpose for each positive act and none for a dismissal", () => {
    const ids = COURT_HEARING_PURPOSES.map((entry) => entry.id);
    assert.ok(ids.includes(defaultNextPurposeFor("cognizance")!));
    assert.ok(ids.includes(defaultNextPurposeFor("notice")!));
    assert.equal(defaultNextPurposeFor("dismiss"), null);
  });

  it("reads an act off a URL, and nothing else", () => {
    assert.ok(isCognizanceAct("cognizance"));
    assert.ok(isCognizanceAct("notice"));
    assert.ok(isCognizanceAct("dismiss"));
    assert.ok(!isCognizanceAct("take-cognizance"));
    assert.ok(!isCognizanceAct(undefined));
  });
});

describe("the order's subject", () => {
  const subject: OrderSubject = {
    kind: "cognizance",
    matter: late,
    act: "cognizance",
  };

  it("carries the cause and the number, the same as a hearing would", () => {
    assert.equal(subjectCaseNumber(subject), late.caseNumber);
    assert.equal(
      subjectCauseTitle(subject),
      `${late.parties.complainant} v. ${late.parties.accused}`,
    );
  });

  it("has nobody appearing and nothing pending, because it was never called", () => {
    assert.deepEqual(subjectAppearances(subject), []);
    assert.deepEqual(subjectApplications(subject), []);
  });

  it("requires a next date on a positive act and forbids one on a dismissal", () => {
    assert.equal(subjectScheduling(subject), "required");
    assert.equal(
      subjectScheduling({ kind: "cognizance", matter: late, act: "notice" }),
      "required",
    );
    assert.equal(
      subjectScheduling({ kind: "cognizance", matter: late, act: "dismiss" }),
      "none",
    );
  });

  it("names no item and no purpose — a complaint has neither", () => {
    const labels = subjectFacts(subject).map((fact) => fact.label);
    assert.ok(!labels.includes("Item"));
    assert.ok(!labels.includes("Purpose"));
    assert.deepEqual(labels, ["Act", "Case", "Filing", "Filed"]);
  });

  it("leads on the act, because that is what the order is", () => {
    const [first] = subjectFacts(subject);
    assert.equal(first.label, "Act");
    assert.equal(first.value, "Take cognizance");
    assert.equal(
      subjectFacts({ kind: "cognizance", matter: late, act: "dismiss" })[0]
        .value,
      "Dismiss case",
    );
  });

  it("leads back the way the bench came, not through the hearings list", () => {
    const trail = subjectTrail(subject);
    assert.equal(trail[0].label, "Take cognizance");
    assert.ok(trail.every((crumb) => !crumb.href?.includes("/hearings")));
  });

  it("says which half of the register the complaint stands on", () => {
    const filed = (matter: CognizanceCase) =>
      subjectFacts({ kind: "cognizance", matter, act: "cognizance" }).find(
        (fact) => fact.label === "Filed",
      )!.value;
    assert.equal(filed(late), "Beyond the month");
    assert.equal(filed(timely), "In time");
    assert.ok(hasDelay(late) && !hasDelay(timely));
  });
});

describe("the act a complaint arrives with", () => {
  it("is the one its tab offers, for every complaint in the queue", () => {
    for (const matter of COGNIZANCE_QUEUE) {
      const act = primaryActFor(matter);
      assert.equal(
        act,
        tabFor(matter) === "with-delay" ? "notice" : "cognizance",
        matter.id,
      );
      assert.ok(compose(matter, act).length > 0);
    }
  });
});
