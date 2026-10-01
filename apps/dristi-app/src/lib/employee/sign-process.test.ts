import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceProcesses,
  buildProcessDocument,
  COURT_PROCESS_TYPES,
  processesAdvancing,
  defaultProcessFilters,
  filterProcesses,
  PROCESS_LINE,
  outcomeComplete,
  outcomeLabel,
  recordOutcome,
  PROCESS_QUEUE_COUNT,
  PROCESS_STAGES,
  processDocumentText,
  processStage,
  processesAt,
  processesElsewhere,
  groupSelectionByCase,
  singleCaseMatch,
  processIdsForCase,
  rebaseFilters,
  type CourtProcess,
  type ProcessStageId,
} from "./sign-process";

/** The stages a row can be standing in, in the order it travels through them. */
const ORDER: ProcessStageId[] = PROCESS_STAGES.map((stage) => stage.id);

/** Every day a row carries, in the order the line stamps them. */
function stampedDays(process: CourtProcess): string[] {
  return [
    process.paidOn,
    process.issuedOn,
    process.signedOn,
    process.sentOn,
    process.completedOn,
  ].filter((day): day is string => day !== undefined);
}

describe("PROCESS_LINE", () => {
  it("stamps every day a row's stage says it has passed, and none it has not", () => {
    /* One field per stage reached, and nothing from a stage still ahead: a signed date
       on a row waiting to be signed is the line claiming work that has not happened. */
    const stamped: [ProcessStageId, keyof CourtProcess][] = [
      ["pending-sign", "issuedOn"],
      ["signed", "signedOn"],
      ["sent", "sentOn"],
      ["completed", "completedOn"],
    ];
    for (const process of PROCESS_LINE) {
      const reached = ORDER.indexOf(process.stage);
      assert.ok(process.paidOn, `${process.id} has no fee payment`);
      for (const [stage, field] of stamped) {
        assert.equal(
          process[field] !== undefined,
          reached >= ORDER.indexOf(stage),
          `${process.id} at ${process.stage}: ${String(field)} is ${String(process[field] ?? "missing")}`,
        );
      }
    }
  });

  it("gives every row the day its own tab's fourth column prints", () => {
    /* Two stages share a field — the reference heads both Pending sign and Signed with
       "Issued date" — so this is a separate question from which fields are stamped: can
       the column the bench is looking at actually render? */
    for (const stage of PROCESS_STAGES) {
      for (const process of processesAt(PROCESS_LINE, stage.id)) {
        assert.ok(
          stage.dateOf(process),
          `${process.id} has no ${stage.dateColumn.toLowerCase()}`,
        );
      }
    }
  });

  it("runs its days forward — a process cannot be signed before it was issued", () => {
    for (const process of PROCESS_LINE) {
      const days = stampedDays(process);
      assert.deepEqual(days, [...days].sort(), `${process.id} runs backwards`);
    }
  });

  it("makes every process returnable for a listing still ahead of it", () => {
    for (const process of PROCESS_LINE) {
      const last = stampedDays(process).at(-1) ?? process.paidOn;
      assert.ok(
        process.hearingDate > last,
        `${process.id} comes back on ${process.hearingDate}, which is not after ${last}`,
      );
    }
  });

  it("holds only registered post at the stage that waits on a cover", () => {
    /* The reason the first tab's channel filter is fixed rather than live: police and
       bailiff rounds have no cover to collect and start at Pending sign. */
    const stage = processStage("pending-rpad-collection");
    for (const process of processesAt(PROCESS_LINE, "pending-rpad-collection")) {
      assert.equal(process.channel, stage.onlyChannel, process.id);
    }
  });

  it("gives every stage enough rows to be worth a tab", () => {
    for (const stage of PROCESS_STAGES) {
      assert.ok(
        processesAt(PROCESS_LINE, stage.id).length > 0,
        `${stage.id} is empty`,
      );
    }
  });

  it("counts only the stages that still need an act for the rail's badge", () => {
    const working = PROCESS_STAGES.filter((stage) => stage.act !== undefined);
    const expected = working.reduce(
      (total, stage) => total + processesAt(PROCESS_LINE, stage.id).length,
      0,
    );
    assert.equal(PROCESS_QUEUE_COUNT, expected);
    assert.ok(PROCESS_QUEUE_COUNT < PROCESS_LINE.length);
  });

  it("mints one id per row", () => {
    const ids = new Set(PROCESS_LINE.map((process) => process.id));
    assert.equal(ids.size, PROCESS_LINE.length);
  });
});

describe("COURT_PROCESS_TYPES", () => {
  it("keeps an abbreviation's capitals in the name a screen reader gets", () => {
    /* `label.toLowerCase()` is what this replaced: it turned "DCA notice" into a word
       rather than four letters in every row opener and every checkbox on the screen. */
    const byId = new Map(COURT_PROCESS_TYPES.map((type) => [type.id, type]));
    assert.equal(byId.get("dca-notice")?.inline, "DCA notice");
    assert.equal(byId.get("section-223-notice")?.inline, "Section 223 notice");
    assert.equal(byId.get("summons")?.inline, "summons");
    for (const type of COURT_PROCESS_TYPES) {
      assert.equal(
        type.inline.toLowerCase(),
        type.label.toLowerCase(),
        `${type.id} names two different instruments`,
      );
    }
  });
});

describe("PROCESS_STAGES", () => {
  it("chains its acts into one line, ending where nothing acts", () => {
    for (const [index, stage] of PROCESS_STAGES.entries()) {
      if (!stage.act) continue;
      assert.equal(
        stage.act.advancesTo,
        PROCESS_STAGES[index + 1]?.id,
        `${stage.id} does not advance to the stage after it`,
      );
    }
    /* Nothing on this screen closes a round off — that is the delivery channel
       reporting back. Sent and Completed are records. */
    assert.equal(processStage("sent").act, undefined);
    assert.equal(processStage("completed").act, undefined);
  });

  it("offers the hearing-date filter everywhere the reference does", () => {
    assert.equal(processStage("pending-rpad-collection").hearingDateFilter, false);
    for (const stage of PROCESS_STAGES.slice(1)) {
      assert.equal(stage.hearingDateFilter, true, stage.id);
    }
  });

  it("opens a stage on everything it holds, bar the channel it is defined by", () => {
    for (const stage of PROCESS_STAGES) {
      const filters = defaultProcessFilters(stage);
      assert.equal(filters.type, "all");
      assert.equal(filters.hearingDate, "");
      assert.equal(filters.query, "");
      assert.equal(filters.channel, stage.onlyChannel ?? "all");
      assert.equal(
        filterProcesses(processesAt(PROCESS_LINE, stage.id), filters).length,
        processesAt(PROCESS_LINE, stage.id).length,
        `${stage.id} hides work behind a filter nobody touched`,
      );
    }
  });
});

describe("filterProcesses", () => {
  const rows = processesAt(PROCESS_LINE, "pending-sign");

  it("cuts on the instrument", () => {
    const cut = filterProcesses(rows, {
      type: "warrant",
      channel: "all",
      hearingDate: "",
      query: "",
    });
    assert.ok(cut.length > 0 && cut.length < rows.length);
    assert.ok(cut.every((process) => process.type === "warrant"));
  });

  it("cuts on the channel", () => {
    const cut = filterProcesses(rows, {
      type: "all",
      channel: "police",
      hearingDate: "",
      query: "",
    });
    assert.ok(cut.length > 0 && cut.length < rows.length);
    assert.ok(cut.every((process) => process.channel === "police"));
  });

  it("searches the case number only, ignoring case and stray space", () => {
    const first = rows[0];
    const byNumber = filterProcesses(rows, {
      type: "all",
      channel: "all",
      hearingDate: "",
      query: `  ${first.caseNumber.toLowerCase()} `,
    });
    assert.deepEqual(
      byNumber.map((process) => process.id),
      rows
        .filter((process) => process.caseNumber === first.caseNumber)
        .map((process) => process.id),
    );

    const byParty = filterProcesses(rows, {
      type: "all",
      channel: "all",
      hearingDate: "",
      query: first.parties.accused.toUpperCase(),
    });
    assert.ok(!byParty.some((process) => process.id === first.id));
  });
});

describe("finding a process that has moved on", () => {
  const collection = processStage("pending-rpad-collection");
  /* A real row sitting under Signed — the case a bench would hunt for from the tab it
     last saw it at. */
  const moved = processesAt(PROCESS_LINE, "signed")[0];

  function searchFrom(stage: ProcessStageId, query: string) {
    const here = processStage(stage);
    return {
      here: filterProcesses(processesAt(PROCESS_LINE, stage), {
        ...defaultProcessFilters(here),
        query,
      }),
      elsewhere: processesElsewhere(
        PROCESS_LINE,
        { ...defaultProcessFilters(here), query },
        stage,
      ),
    };
  }

  it("does not find a row by the cause title the Case name column prints", () => {
    const cause = `${moved.parties.complainant} v. ${moved.parties.accused}`;
    const rows = filterProcesses(processesAt(PROCESS_LINE, "signed"), {
      ...defaultProcessFilters(processStage("signed")),
      query: cause,
    });
    assert.ok(
      !rows.some((process) => process.id === moved.id),
      "a cause title still finds the row after search became number-only",
    );
  });

  it("names the stage that has it when this one does not", () => {
    const { here, elsewhere } = searchFrom(
      "pending-rpad-collection",
      moved.caseNumber,
    );
    assert.equal(here.length, 0);
    assert.deepEqual(
      elsewhere.map((entry) => [entry.stage.id, entry.count]),
      [["signed", 1]],
    );
  });

  it("says nothing is anywhere only when nothing is", () => {
    const { here, elsewhere } = searchFrom(
      "pending-rpad-collection",
      "ST/9999/2026",
    );
    assert.equal(here.length, 0);
    assert.deepEqual(elsewhere, []);
  });

  it("does not carry a stage's own channel onto a stage that is not defined by one", () => {
    /* Leaving Pending RPAD collection with "RPAD" still on would hide every police and
       bailiff round — which is most of what the bench is looking for. */
    const police = PROCESS_LINE.find(
      (process) => process.stage === "pending-sign" && process.channel === "police",
    );
    assert.ok(police);
    const { elsewhere } = searchFrom(
      "pending-rpad-collection",
      police.caseNumber,
    );
    assert.deepEqual(
      elsewhere.map((entry) => entry.stage.id),
      ["pending-sign"],
    );
  });

  it("keeps a channel the bench chose for itself", () => {
    const from = processStage("pending-sign");
    const to = processStage("signed");
    const chosen = { ...defaultProcessFilters(from), channel: "police" as const };
    assert.equal(rebaseFilters(chosen, from, to).channel, "police");
    /* …and drops one it never had a control for. */
    const pinned = defaultProcessFilters(collection);
    assert.equal(pinned.channel, "rpad");
    assert.equal(rebaseFilters(pinned, collection, to).channel, "all");
  });
});

describe("advanceProcesses", () => {
  const pending = processesAt(PROCESS_LINE, "pending-sign");
  const chosen = new Set(pending.slice(0, 2).map((process) => process.id));
  const ON = "2026-09-06";

  it("moves the chosen rows one stage along and stamps that stage's day", () => {
    const next = advanceProcesses(PROCESS_LINE, chosen, "pending-sign", ON);
    for (const id of chosen) {
      const moved = next.find((process) => process.id === id);
      assert.equal(moved?.stage, "signed");
      assert.equal(moved?.signedOn, ON);
    }
    assert.equal(
      processesAt(next, "pending-sign").length,
      pending.length - chosen.size,
    );
    assert.equal(
      processesAt(next, "signed").length,
      processesAt(PROCESS_LINE, "signed").length + chosen.size,
    );
  });

  it("leaves the line it was given alone", () => {
    const before = PROCESS_LINE.map((process) => process.stage);
    advanceProcesses(PROCESS_LINE, chosen, "pending-sign", ON);
    assert.deepEqual(
      PROCESS_LINE.map((process) => process.stage),
      before,
    );
  });

  it("ignores an id that names a row standing somewhere else, or no row at all", () => {
    const stale = new Set([
      ...processesAt(PROCESS_LINE, "sent").map((process) => process.id),
      "pr-does-not-exist",
    ]);
    const next = advanceProcesses(PROCESS_LINE, stale, "pending-sign", ON);
    assert.deepEqual(
      next.map((process) => process.stage),
      PROCESS_LINE.map((process) => process.stage),
    );
    assert.deepEqual(processesAdvancing(PROCESS_LINE, stale, "pending-sign"), []);
  });

  it("moves nothing out of a stage with no act", () => {
    const sent = new Set(
      processesAt(PROCESS_LINE, "sent").map((process) => process.id),
    );
    const next = advanceProcesses(PROCESS_LINE, sent, "sent", ON);
    assert.deepEqual(
      next.map((process) => process.stage),
      PROCESS_LINE.map((process) => process.stage),
    );
  });

  it("names what an act would actually move, and agrees with the act", () => {
    const moving = processesAdvancing(PROCESS_LINE, chosen, "pending-sign");
    assert.deepEqual(new Set(moving.map((process) => process.id)), chosen);
    /* The success step downloads exactly these rows, read back after the act — so the
       two must pick out the same set or the bench is handed the wrong papers. */
    const after = advanceProcesses(PROCESS_LINE, chosen, "pending-sign", ON);
    const moved = after.filter(
      (process) => process.stage === "signed" && process.signedOn === ON,
    );
    assert.deepEqual(
      new Set(moved.map((process) => process.id)),
      new Set(moving.map((process) => process.id)),
    );
  });

  it("stamps the signature onto the papers the success step hands over", () => {
    /* The regression the download exists to avoid: resolving the rows *before* the act
       writes "Pending the signature of the magistrate" across papers just signed. */
    const after = advanceProcesses(PROCESS_LINE, chosen, "pending-sign", ON);
    for (const id of chosen) {
      const before = PROCESS_LINE.find((process) => process.id === id);
      const now = after.find((process) => process.id === id);
      assert.ok(before && now);
      assert.match(
        buildProcessDocument(before).signature,
        /^Pending the signature/,
      );
      assert.match(
        buildProcessDocument(now).signature,
        /^Signed by the magistrate/,
      );
    }
  });

  it("walks a row the whole length of the line", () => {
    const start = processesAt(PROCESS_LINE, "pending-rpad-collection")[0];
    const only = new Set([start.id]);
    let line = PROCESS_LINE;
    for (const stage of PROCESS_STAGES) {
      if (!stage.act) break;
      line = advanceProcesses(line, only, stage.id, ON);
    }
    const walked = line.find((process) => process.id === start.id);
    assert.equal(walked?.stage, "sent");
    assert.equal(walked?.issuedOn, ON);
    assert.equal(walked?.signedOn, ON);
    assert.equal(walked?.sentOn, ON);
  });
});

describe("buildProcessDocument", () => {
  it("writes a template for every instrument, and addresses it", () => {
    const seen = new Set<string>();
    for (const process of PROCESS_LINE) {
      const document = buildProcessDocument(process);
      seen.add(process.type);
      assert.equal(document.paragraphs.length, 2, process.id);
      assert.ok(document.addressee.startsWith("To "), process.id);
      assert.ok(document.title.length > 0, process.id);
    }
    assert.equal(seen.size, 6);
  });

  it("addresses a warrant to the officer who must execute it, not to the accused", () => {
    const warrant = PROCESS_LINE.find((process) => process.type === "warrant");
    assert.ok(warrant);
    const document = buildProcessDocument(warrant);
    assert.match(document.addressee, /officer in charge/);
    assert.ok(!document.addressee.includes(warrant.parties.accused));
  });

  it("says plainly whether the signature is on it", () => {
    const unsigned = PROCESS_LINE.find(
      (process) => process.stage === "pending-sign",
    );
    const signed = PROCESS_LINE.find((process) => process.stage === "signed");
    assert.ok(unsigned && signed);
    assert.match(buildProcessDocument(unsigned).signature, /^Pending the signature/);
    assert.match(buildProcessDocument(signed).signature, /^Signed by the magistrate/);
  });

  it("names the listing it is returnable for inside its own prose", () => {
    for (const process of PROCESS_LINE) {
      const document = buildProcessDocument(process);
      const text = processDocumentText(document);
      assert.ok(
        text.includes(document.dated) && text.includes(document.channel),
        `${process.id} loses its date or its channel in the written form`,
      );
    }
  });

  it("recites no sum, address or process fee it does not hold", () => {
    /* The rows carry none of these, and an invented particular in a facsimile is the
       kind of detail that gets screenshot and quoted back. */
    for (const process of PROCESS_LINE) {
      const text = processDocumentText(buildProcessDocument(process));
      assert.ok(!/₹|Rs\.?\s*\d/.test(text), `${process.id} names a sum`);
    }
  });
});

describe("the selection, counted as envelopes", () => {
  const collection = processesAt(PROCESS_LINE, "pending-rpad-collection");

  /** A case this stage holds more than one process for — the interesting shape. */
  const shared = collection.find(
    (process) =>
      collection.filter((other) => other.caseNumber === process.caseNumber)
        .length > 1,
  );
  assert.ok(shared, "the demo line needs a case with several processes waiting");

  const siblings = collection.filter(
    (process) => process.caseNumber === shared.caseNumber,
  );

  it("puts one case in one entry, however much process is inside it", () => {
    const [entry, ...rest] = groupSelectionByCase(
      collection,
      new Set(siblings.map((process) => process.id)),
    );
    assert.equal(rest.length, 0, "one envelope must not read as several");
    assert.equal(entry.caseNumber, shared.caseNumber);
    assert.equal(entry.processes.length, siblings.length);
  });

  it("counts only what is ticked, never the case's true total", () => {
    /* Two of three ticked is two covers' worth of nothing — the entry must not round up
       to the case's total, or it reports a cover as reconciled that is not. */
    const [entry] = groupSelectionByCase(
      collection,
      new Set([siblings[0].id]),
    );
    assert.equal(entry.processes.length, 1);
    assert.ok(siblings.length > 1, "the fixture must have a sibling to leave out");
  });

  it("keeps the order the envelopes were picked up in", () => {
    const other = collection.find(
      (process) => process.caseNumber !== shared.caseNumber,
    );
    assert.ok(other, "the demo line needs a second case at this stage");

    /* A Set walks in insertion order, which is the clerk's own morning: the envelope
       just ticked belongs at the end of the tray, not wherever the line happens to hold
       it. Ticking the second case first must put it first. */
    const picked = groupSelectionByCase(
      collection,
      new Set([other.id, siblings[0].id]),
    );
    assert.deepEqual(
      picked.map((entry) => entry.caseNumber),
      [other.caseNumber, shared.caseNumber],
    );
  });

  it("holds a case at the place its first process was ticked", () => {
    const other = collection.find(
      (process) => process.caseNumber !== shared.caseNumber,
    );
    assert.ok(other);
    /* First, third, second: the case ticked first stays first even though its second
       process was ticked last. */
    const picked = groupSelectionByCase(
      collection,
      new Set([siblings[0].id, other.id, siblings[1].id]),
    );
    assert.deepEqual(
      picked.map((entry) => entry.caseNumber),
      [shared.caseNumber, other.caseNumber],
    );
    assert.equal(picked[0].processes.length, 2);
  });

  it("drops an id the stage no longer holds rather than counting it", () => {
    const gone = processesAt(PROCESS_LINE, "signed")[0];
    assert.ok(gone, "the demo line needs a row at another stage");
    const picked = groupSelectionByCase(
      collection,
      new Set([siblings[0].id, gone.id]),
    );
    assert.equal(picked.length, 1);
    assert.equal(picked[0].caseNumber, shared.caseNumber);
  });

  it("takes the whole case out, because the whole case is the envelope", () => {
    const ids = processIdsForCase(collection, shared.caseNumber);
    assert.deepEqual(
      [...ids].sort(),
      siblings.map((process) => process.id).sort(),
    );
  });
});

describe("what Enter is allowed to commit", () => {
  const stage = processStage("pending-rpad-collection");
  const collection = processesAt(PROCESS_LINE, "pending-rpad-collection");
  const base = defaultProcessFilters(stage);

  const shared = collection.find(
    (process) =>
      collection.filter((other) => other.caseNumber === process.caseNumber)
        .length > 1,
  );
  assert.ok(shared, "the demo line needs a case with several processes waiting");

  it("takes the whole envelope when the number names one case", () => {
    const matches = singleCaseMatch(collection, {
      ...base,
      query: shared.caseNumber,
    });
    assert.ok(matches, "a complete case number must resolve");
    assert.ok(matches.length > 1, "the case's other process travels with it");
    assert.ok(
      matches.every((process) => process.caseNumber === shared.caseNumber),
      "nothing from another case rides along",
    );
  });

  it("refuses to guess while two cases still match", () => {
    /* The shared prefix of the court's own numbering: enough to narrow, never enough to
       choose. Committing here would put one court's process into another's envelope on a
       keystroke the clerk did not mean as a choice. */
    const prefix = shared.caseNumber.slice(0, 3);
    const matching = new Set(
      collection
        .filter((process) => process.caseNumber.includes(prefix))
        .map((process) => process.caseNumber),
    );
    assert.ok(matching.size > 1, "the fixture needs an ambiguous prefix");
    assert.equal(singleCaseMatch(collection, { ...base, query: prefix }), null);
  });

  it("has nothing to commit when nothing matches", () => {
    assert.equal(
      singleCaseMatch(collection, { ...base, query: "ZZ/9999/1999" }),
      null,
    );
  });

  it("stays inside the stage it was asked about", () => {
    /* A cover waiting for collection cannot be answered with a row that has already been
       signed, however exactly the number matches. */
    const elsewhere = processesAt(PROCESS_LINE, "signed").find(
      (process) =>
        !collection.some((row) => row.caseNumber === process.caseNumber),
    );
    assert.ok(elsewhere, "the demo line needs a case that has moved on");
    assert.equal(
      singleCaseMatch(collection, { ...base, query: elsewhere.caseNumber }),
      null,
    );
  });
});

describe("recording an outcome from the Sent tab (DSP-08, DSP-09)", () => {
  const sent = PROCESS_LINE.find((process) => process.stage === "sent")!;

  it("needs a status and a comment, and a reason when not delivered", () => {
    assert.equal(outcomeComplete({ comment: "x" }), false);
    assert.equal(outcomeComplete({ status: "delivered", comment: " " }), false);
    assert.equal(outcomeComplete({ status: "delivered", comment: "Card returned." }), true);
    assert.equal(outcomeComplete({ status: "not-delivered", comment: "Returned." }), false);
    assert.equal(
      outcomeComplete({ status: "not-delivered", reason: "Premises locked", comment: "Returned." }),
      true,
    );
  });

  it("closes the process on it and moves it to Completed", () => {
    const outcome = { status: "delivered" as const, comment: "Card returned.", recordedOn: "2026-10-01" };
    const after = recordOutcome(PROCESS_LINE, sent.id, outcome).find((p) => p.id === sent.id)!;
    assert.equal(after.stage, "completed");
    assert.equal(after.completedOn, "2026-10-01");
    assert.deepEqual(after.outcome, outcome);
  });

  it("labels a warrant's outcome Executed / Not executed (§10.1)", () => {
    assert.equal(outcomeLabel("warrant", "delivered"), "Executed");
    assert.equal(outcomeLabel("warrant", "not-delivered"), "Not executed");
    assert.equal(outcomeLabel("summons", "delivered"), "Delivered");
  });
});

describe("the police-executed instruments on the Sent tab", () => {
  it("offers Record outcome on a warrant, a proclamation and an attachment, addressed to the police", () => {
    for (const type of ["warrant", "proclamation", "attachment"] as const) {
      const sent = PROCESS_LINE.find((process) => process.type === type && process.stage === "sent");
      assert.ok(sent, `a ${type} on the Sent tab`);
      assert.equal(outcomeLabel(type, "delivered"), "Executed");
      assert.equal(
        buildProcessDocument(sent).addressee,
        "To the officer in charge of the police station",
      );
    }
  });
});
