/**
 * The ranking, against the states the demo board does not happen to contain.
 *
 * Most of these cases cannot be reached by clicking through the fixtures — there is no
 * appearance listing with an absent accused on the cause list — and they are the cases
 * the ranking exists for. The expectations are quoted from the two sources rather than
 * from the implementation: the hearing-purpose table in `docs/product/order-templates.md`
 * and the nine-order chain in `public/case-file/09-orders.pdf`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cognizanceDueFor,
  MAX_SUGGESTIONS,
  noSuggestionsNote,
  orderSuggestions,
  suggestionCaption,
  type ApplicationSignal,
  type AttendanceSignal,
  type OrderSuggestionSignals,
  type SuggestionGround,
} from "./order-suggestions";
import {
  LIKELY_BY_PURPOSE,
  unavailableReason,
  type OrderCatalogueContext,
} from "./order-templates";

/**
 * The grounds in the order the module promises, restated rather than imported.
 *
 * A test that imports the implementation's own ordering can only prove it is
 * self-consistent. This is the contract: an order the bench has allowed an application
 * for outranks one an absence argues for, which outranks the chain, which outranks a
 * conditional, which outranks the purpose table.
 */
const GROUND_ORDER_FOR_TEST: SuggestionGround[] = [
  "application-allowed",
  "party-absent",
  "order-chain",
  "application-pending",
  "purpose",
];

const onFile: OrderCatalogueContext = {
  cognizanceDue: false,
  longPending: false,
  hearingOngoing: true,
};

const beforeCognizance: OrderCatalogueContext = {
  cognizanceDue: true,
  longPending: false,
  hearingOngoing: true,
};

function signals(
  over: Partial<OrderSuggestionSignals> = {},
): OrderSuggestionSignals {
  return {
    purpose: "evidence-of-complainant",
    catalogue: onFile,
    attendance: [],
    applications: [],
    chosen: [],
    ...over,
  };
}

const absentAccused: AttendanceSignal = {
  side: "accused",
  kind: "party",
  mark: "absent",
};

const presentAccused: AttendanceSignal = {
  side: "accused",
  kind: "party",
  mark: "present",
};

const bailApplication: ApplicationSignal = {
  number: "CMP/312/2026",
  type: "bail",
};

function ids(input: OrderSuggestionSignals): string[] {
  return orderSuggestions(input).map((entry) => entry.template.id);
}

describe("the baseline is still the court's purpose table", () => {
  it("offers an evidence listing what row 8 lists, in the source's order", () => {
    assert.deepEqual(ids(signals()), ["witness-batta", "issue-of-summons"]);
  });

  it("leaves the ordinary row uncaptioned and lets its workflow line stand", () => {
    const [batta] = orderSuggestions(signals());
    assert.equal(batta.ground, "purpose");
    assert.equal(batta.reason, null);
    /* Which is what the row renders: the heading has already said why it is there. */
    assert.equal(suggestionCaption(batta), "Creates a payment task");
  });

  it("never suggests an order the state of the case will not allow", () => {
    /* Row 2 lists Issue of summons against Admission, and the catalogue gates it on the
       case being on file — which at an admission hearing it is not. The gate wins. */
    assert.ok(LIKELY_BY_PURPOSE.admission.includes("issue-of-summons"));
    const offered = ids(
      signals({ purpose: "admission", catalogue: beforeCognizance }),
    );
    assert.ok(!offered.includes("issue-of-summons"));
    assert.deepEqual(offered, [
      "cognizance",
      "dismiss-case",
      "order-under-section-202",
    ]);
  });

  it("never offers more than a shortcut's worth, and cuts only the weakest", () => {
    const many = orderSuggestions(
      signals({
        purpose: "appearance",
        applications: [
          bailApplication,
          { number: "CMP/320/2026", type: "adding-witnesses" },
          { number: "CMP/321/2026", type: "settlement" },
        ],
      }),
    );
    assert.equal(many.length, MAX_SUGGESTIONS);
    /* The cap is legitimate only because the sort runs before the slice, so what it drops
       is always the weakest-argued — and the whole catalogue is a search field below it.
       Two things prove that here: the list is in non-decreasing ground order, and every
       order a signal argued for survived. Four did, so the fifth seat goes to a baseline
       row rather than being held empty. */
    const rank = GROUND_ORDER_FOR_TEST.map((ground) =>
      many.filter((entry) => entry.ground === ground).length,
    );
    assert.deepEqual(
      many.map((entry) => entry.ground),
      GROUND_ORDER_FOR_TEST.flatMap((ground, index) =>
        Array.from({ length: rank[index] }, () => ground),
      ),
    );
    for (const id of ["bail", "issue-of-summons", "witness-batta", "case-settlement"]) {
      assert.ok(
        many.some((entry) => entry.template.id === id),
        `${id} was argued for by an application and must survive the cap`,
      );
    }
  });
});

describe("an application standing in the matter", () => {
  it("puts the bail order above the purpose table's own rows, as a conditional", () => {
    /* The first row of the cause list: an evidence listing with a bail application
       pending on it. Until this ranking existed the bench was offered witness batta. */
    const ranked = orderSuggestions(
      signals({ applications: [bailApplication] }),
    );
    assert.deepEqual(
      ranked.map((entry) => entry.template.id),
      ["bail", "witness-batta", "issue-of-summons"],
    );
    assert.equal(ranked[0].ground, "application-pending");
    assert.equal(suggestionCaption(ranked[0]), "If CMP/312/2026 is allowed");
  });

  it("states it as done once the bench has allowed it, and outranks a pending one", () => {
    const ranked = orderSuggestions(
      signals({
        applications: [
          { number: "CMP/318/2026", type: "settlement" },
          { ...bailApplication, decision: "allowed" },
        ],
      }),
    );
    assert.equal(ranked[0].template.id, "bail");
    assert.equal(ranked[0].ground, "application-allowed");
    assert.equal(
      suggestionCaption(ranked[0]),
      "Follows CMP/312/2026, allowed at this hearing",
    );
    /* The settlement application is still only a conditional, so it sits under it. */
    assert.equal(ranked[1].template.id, "case-settlement");
    assert.equal(ranked[1].ground, "application-pending");
  });

  it("says nothing on the strength of one it has dismissed", () => {
    assert.deepEqual(
      ids(
        signals({
          applications: [{ ...bailApplication, decision: "dismissed" }],
        }),
      ),
      ["witness-batta", "issue-of-summons"],
    );
  });

  it("draws the order the template's own words name", () => {
    /* `withdrawal-of-case` opens "As per application [Application Number]…" and takes the
       number as a locked variable — the pairing is in the template, not inferred. */
    assert.equal(
      ids(
        signals({
          applications: [
            {
              number: "CMP/330/2026",
              type: "case-withdrawal",
              decision: "allowed",
            },
          ],
        }),
      )[0],
      "withdrawal-of-case",
    );
    /* Production of documents is answered by the direction to produce. */
    assert.equal(
      ids(
        signals({
          applications: [
            {
              number: "CMP/305/2026",
              type: "production-of-documents",
              decision: "allowed",
            },
          ],
        }),
      )[0],
      "mandatory-submissions",
    );
  });

  it("adds nothing for the heads answered elsewhere on the screen", () => {
    /* An adjournment moves the next date, which is its own control; an extension is
       answered by a template the source marks not-in-dropdown, reached from the row's
       own Accept / Reject. Neither is an order to add here. */
    for (const type of [
      "reschedule-adjournment",
      "extension-of-submission-deadline",
      "submit-bail-documents",
    ] as const) {
      assert.deepEqual(
        ids(
          signals({
            applications: [{ number: "CMP/999/2026", type, decision: "allowed" }],
          }),
        ),
        ["witness-batta", "issue-of-summons"],
        `${type} should draw no order of its own`,
      );
    }
  });
});

describe("who appeared", () => {
  it("puts the warrant first when the accused is absent from an appearance listing", () => {
    const ranked = orderSuggestions(
      signals({ purpose: "appearance", attendance: [absentAccused] }),
    );
    assert.equal(ranked[0].template.id, "issue-of-warrants");
    assert.equal(ranked[0].ground, "party-absent");
    assert.equal(suggestionCaption(ranked[0]), "The accused is marked absent");
    /* Nothing is removed — the rest of row 5 is still there, underneath. */
    assert.deepEqual(
      ranked.map((entry) => entry.template.id).slice(1),
      ["issue-of-summons", "bail", "issue-of-notice"],
    );
  });

  it("answers absence only where the source's own row for the purpose does", () => {
    /* Row 7, Plea, names no warrant. Neither does this — the consequence of an absence
       at a plea hearing is a product question, not a ranking function's guess. */
    assert.deepEqual(ids(signals({ purpose: "plea", attendance: [absentAccused] })), [
      "bail",
      "referral-to-adr",
      "issue-of-notice",
    ]);
  });

  it("does not answer the complainant's absence with the accused's remedy", () => {
    assert.deepEqual(
      ids(
        signals({
          purpose: "appearance",
          attendance: [
            { side: "complainant", kind: "party", mark: "absent" },
          ],
        }),
      ),
      LIKELY_BY_PURPOSE.appearance,
    );
  });

  it("sinks process compelling an attendance that has just happened", () => {
    /* DOC-ORD-003: the accused appeared, so the sitting went to plea and bail and issued
       no process. Sunk, not removed — the rows are all still listed. */
    const ranked = ids(
      signals({ purpose: "appearance", attendance: [presentAccused] }),
    );
    assert.deepEqual(ranked, [
      "bail",
      "issue-of-summons",
      "issue-of-warrants",
      "issue-of-notice",
    ]);
  });

  it("reads only the party's own mark, never their counsel's", () => {
    assert.deepEqual(
      ids(
        signals({
          purpose: "appearance",
          attendance: [{ side: "accused", kind: "counsel", mark: "absent" }],
        }),
      ),
      LIKELY_BY_PURPOSE.appearance,
    );
  });
});

describe("the chain inside one order", () => {
  it("puts the summons next once cognizance is down, as DOC-ORD-001 does", () => {
    /* "Cognizance is taken. Issue summons to the accused on payment of process fee." One
       order, both directions — so the screen reads `cognizanceDue` against this draft and
       the summons is open by the time it is asked for. */
    const ranked = orderSuggestions(
      signals({
        purpose: "cognizance",
        catalogue: onFile,
        chosen: ["cognizance"],
      }),
    );
    assert.equal(ranked[0].template.id, "issue-of-summons");
    assert.equal(ranked[0].ground, "order-chain");
    assert.equal(suggestionCaption(ranked[0]), "Follows cognizance at item 1");
  });

  it("opens the summons that the case not being on file had shut", () => {
    /* The conflict the order pack settles. At a cognizance listing the case is not on
       file, so the catalogue shuts `issue-of-summons` — and the purpose table lists it
       anyway, because DOC-ORD-001 issues it in the very order that takes cognizance. */
    assert.equal(cognizanceDueFor("cognizance", []), true);
    assert.equal(cognizanceDueFor("cognizance", ["cognizance"]), false);
    /* A case already past cognizance was never due it, whatever this order carries. */
    assert.equal(cognizanceDueFor("evidence", []), false);

    const before: OrderCatalogueContext = {
      cognizanceDue: cognizanceDueFor("cognizance", []),
      longPending: false,
      hearingOngoing: true,
    };
    assert.ok(
      !ids(signals({ purpose: "cognizance", catalogue: before })).includes(
        "issue-of-summons",
      ),
      "no summons before the case is on file",
    );

    const chosen = ["cognizance"] as const;
    const after: OrderCatalogueContext = {
      cognizanceDue: cognizanceDueFor("cognizance", chosen),
      longPending: false,
      hearingOngoing: true,
    };
    const ranked = orderSuggestions(
      signals({ purpose: "cognizance", catalogue: after, chosen }),
    );
    assert.equal(ranked[0].template.id, "issue-of-summons");
    /* And the two that are open only before cognizance have correctly shut: a case taken
       on file at item 1 cannot be dismissed at item 2. */
    const offered = ranked.map((entry) => entry.template.id);
    assert.ok(!offered.includes("cognizance"));
    assert.ok(!offered.includes("dismiss-case"));
  });

  it("still sinks the summons once it is written, chain or no chain", () => {
    /* What a completed cognizance listing opens on (`order-demo.ts`): both items already
       down. The chain has nothing left to argue for, and the row says where it went. */
    const chosen = ["cognizance", "issue-of-summons"] as const;
    const ranked = orderSuggestions(
      signals({
        purpose: "cognizance",
        catalogue: {
          cognizanceDue: cognizanceDueFor("cognizance", chosen),
          longPending: false,
          hearingOngoing: true,
        },
        chosen,
      }),
    );
    assert.deepEqual(
      ranked.map((entry) => entry.template.id),
      ["order-under-section-202", "issue-of-summons"],
    );
    assert.equal(suggestionCaption(ranked[1]), "Already item 2");
  });

  it("names the item it follows, wherever in the order that is", () => {
    const ranked = orderSuggestions(
      signals({
        purpose: "cognizance",
        chosen: ["cost", "order-under-section-202", "cognizance"],
      }),
    );
    const summons = ranked.find(
      (entry) => entry.template.id === "issue-of-summons",
    );
    assert.equal(suggestionCaption(summons!), "Follows cognizance at item 3");
  });
});

describe("what the draft already carries", () => {
  it("drops an order already written below everything still to write, and says which item", () => {
    const ranked = orderSuggestions(signals({ chosen: ["witness-batta"] }));
    assert.deepEqual(
      ranked.map((entry) => entry.template.id),
      ["issue-of-summons", "witness-batta"],
    );
    const batta = ranked[1];
    assert.deepEqual(batta.alreadyAt, [1]);
    assert.equal(suggestionCaption(batta), "Already item 1");
  });

  it("keeps the row, because a second summons to a second witness is a second item", () => {
    const ranked = orderSuggestions(signals({ chosen: ["issue-of-summons"] }));
    assert.ok(
      ranked.some((entry) => entry.template.id === "issue-of-summons"),
      "an order already in the draft is ranked down, never removed",
    );
  });

  it("names every item of that type when the order carries more than one", () => {
    const ranked = orderSuggestions(
      signals({ chosen: ["issue-of-summons", "cost", "issue-of-summons"] }),
    );
    const summons = ranked.find(
      (entry) => entry.template.id === "issue-of-summons",
    );
    assert.deepEqual(summons!.alreadyAt, [1, 3]);
    assert.equal(suggestionCaption(summons!), "Already items 1, 3");
  });

  it("lets the already-written fact beat the reason that put the row there", () => {
    /* The caption has one line and three things it might say; this is the order they are
       needed in. An allowed application still argues for the bail order, but what the
       typist needs to know first is that it is already written. */
    const ranked = orderSuggestions(
      signals({
        applications: [{ ...bailApplication, decision: "allowed" }],
        chosen: ["bail"],
      }),
    );
    const bail = ranked.find((entry) => entry.template.id === "bail");
    assert.equal(bail!.ground, "application-allowed");
    assert.equal(suggestionCaption(bail!), "Already item 1");
  });
});

describe("the shape of the answer", () => {
  it("suggests no order twice, and keeps the strongest ground for it", () => {
    /* An allowed application for adding witnesses argues for the witness summons, and so
       does row 8 of the purpose table. One row, the stronger sentence. */
    const ranked = orderSuggestions(
      signals({
        applications: [
          {
            number: "CMP/327/2026",
            type: "adding-witnesses",
            decision: "allowed",
          },
        ],
      }),
    );
    const summonses = ranked.filter(
      (entry) => entry.template.id === "issue-of-summons",
    );
    assert.equal(summonses.length, 1);
    assert.equal(summonses[0].ground, "application-allowed");
  });

  it("only ever returns orders the catalogue would let the bench choose", () => {
    for (const purpose of Object.keys(LIKELY_BY_PURPOSE)) {
      for (const catalogue of [onFile, beforeCognizance]) {
        for (const entry of orderSuggestions(
          signals({
            purpose: purpose as OrderSuggestionSignals["purpose"],
            catalogue,
            applications: [bailApplication],
            attendance: [absentAccused],
          }),
        )) {
          assert.equal(
            unavailableReason(entry.template, catalogue),
            null,
            `${entry.template.id} was suggested for ${purpose} while unavailable`,
          );
        }
      }
    }
  });

  it("has a sentence for the listing the table says nothing about", () => {
    const note = noSuggestionsNote("for-reports");
    assert.match(note, /Search the catalogue below\.$/);
    assert.ok(note.includes("for reports"), note);
  });
});
