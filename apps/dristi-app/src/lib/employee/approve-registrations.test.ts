import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMPTY_REGISTRATIONS_FILTERS,
  REGISTRATIONS_QUEUE,
  REGISTRATIONS_QUEUE_COUNT,
  currentRound,
  editFor,
  filterRegistrations,
  formatDaysWaiting,
  formatDaysWaitingSpoken,
  formatWaitingDuration,
  idCardName,
  idPhotoLabel,
  identityRows,
  registerName,
  registrantNoun,
  registrationIdLabel,
  registrationWaitTone,
  rejectionDay,
  rejectionRows,
  requestKindLabel,
  accountTypeVariant,
  nextInQueue,
  requestRows,
  requestTypeValue,
  comparisonBlocks,
  registerAnswer,
  registerFindingRow,
  mismatchedTerms,
  roleLabel,
  sortByLongestWait,
  submissionDay,
  type RegistrationRequest,
  type FactRow,
} from "./approve-registrations";

/** Every fact row the overlay renders, for a request — the groups, in order. */
function allRows(request: RegistrationRequest): FactRow[] {
  return [
    ...requestRows(request),
    ...identityRows(request),
    ...rejectionRows(request),
  ];
}

describe("REGISTRATIONS_QUEUE", () => {
  it("is long enough to page, and the count the rail shows is the list's own", () => {
    // 14 advocates and 3 advocate clerks — the queue is both kinds now.
    assert.equal(REGISTRATIONS_QUEUE.length, 17);
    assert.equal(
      REGISTRATIONS_QUEUE_COUNT,
      REGISTRATIONS_QUEUE.length,
    );
  });

  it("gives every row, application number and Bar registration ID its own identity", () => {
    for (const key of ["id", "applicationNumber", "registrationNumber"] as const) {
      const values = REGISTRATIONS_QUEUE.map((row) => row[key]);
      assert.equal(new Set(values).size, values.length, `duplicate ${key}`);
    }
  });

  it("keeps the application number in the form each person is shown on their own waiting screen", () => {
    // The sign-up's own two series (`registration-flow.tsx`, `applicationId`).
    for (const row of REGISTRATIONS_QUEUE) {
      assert.match(
        row.applicationNumber,
        row.registrantKind === "clerk"
          ? /^KL-CLERK-\d{6}-\d{4}$/
          : /^KL-ADV-\d{6}-\d{4}$/,
        `${row.applicationNumber} is not in its kind's series`,
      );
    }
  });

  it("carries the three kinds of request the lifecycle actually has", () => {
    const kinds = new Set(REGISTRATIONS_QUEUE.map((r) => r.requestKind));
    assert.deepEqual(
      [...kinds].sort(),
      ["edited", "first", "resubmission"].sort(),
    );
  });

  it("carries all three answers the Bar Council lookup can give, and none for a clerk", () => {
    const states = new Set(REGISTRATIONS_QUEUE.map((r) => r.lookup.state));
    assert.deepEqual(
      [...states].sort(),
      ["found", "no-entry", "none", "not-checked"].sort(),
    );
    // The handover names no register for clerks (`REG-13a`), and the Bar Council's is
    // an advocate requirement (`REG-13`) — so nothing is looked up for a clerk, and every
    // advocate is looked up.
    for (const row of REGISTRATIONS_QUEUE) {
      assert.equal(
        row.lookup.state === "none",
        row.registrantKind === "clerk",
        `${row.applicationNumber}: a lookup that does not belong to its kind`,
      );
    }
  });

  it("exercises the wait escalation at both thresholds and below them", () => {
    const tones = REGISTRATIONS_QUEUE.map((r: RegistrationRequest) =>
      registrationWaitTone(r.daysWaiting),
    );
    assert.equal(tones.filter((t) => t === "destructive").length, 2);
    assert.ok(tones.includes("warning"));
    assert.ok(tones.includes("plain"));
  });

  it("holds a name in a script Helvetica does not cover, tagged so it can be spoken", () => {
    const tagged = REGISTRATIONS_QUEUE.filter((r) => r.fullNameLang);
    assert.ok(tagged.length >= 2, "expected at least two non-English names");
    for (const row of tagged) {
      assert.match(
        row.fullName,
        /[ഀ-ൿ]/,
        `${row.applicationNumber} is tagged ${row.fullNameLang} but is written in Latin script`,
      );
    }
  });

  it("tags the register's own answer, rather than borrowing the claimant's script", () => {
    for (const row of REGISTRATIONS_QUEUE) {
      if (row.lookup.state !== "found") continue;
      const nonLatin = /[ഀ-ൿ]/.test(row.lookup.entry.name);
      assert.equal(
        Boolean(row.lookup.entryNameLang),
        nonLatin,
        `${row.applicationNumber}: the register name "${row.lookup.entry.name}" and its entryNameLang disagree about script — a screen reader would speak it in the wrong voice`,
      );
    }
  });

  it("holds a name long enough to wrap the column it sits in", () => {
    const longest = Math.max(
      ...REGISTRATIONS_QUEUE.map((r) => r.fullName.length),
    );
    assert.ok(longest >= 36, `the longest name is only ${longest} characters`);
  });

  it("holds Bar registration IDs from more than one state bar, so the column is not sized off Kerala", () => {
    const prefixes = new Set(
      REGISTRATIONS_QUEUE.map((r) => r.registrationNumber.split("/")[0]),
    );
    assert.ok(
      prefixes.size >= 4,
      `only ${prefixes.size} bar prefixes: ${[...prefixes].join(", ")}`,
    );
  });

  it("leaves email off the rows that never gave one — it is optional, not blank", () => {
    const without = REGISTRATIONS_QUEUE.filter((r) => r.email === undefined);
    assert.ok(without.length > 0, "every demo row has an email");
    for (const row of REGISTRATIONS_QUEUE) {
      assert.notEqual(row.email, "", `${row.applicationNumber} has a blank email`);
    }
  });

  it("attaches rejection rounds only to a resubmission, and edits only to an edited account", () => {
    for (const row of REGISTRATIONS_QUEUE) {
      if (row.requestKind === "resubmission") {
        assert.ok(row.rejections?.length, `${row.id} came back with no reason`);
      } else {
        assert.equal(row.rejections, undefined, `${row.id} carries rejections`);
      }

      if (row.requestKind === "edited") {
        assert.ok(row.edits?.length, `${row.id} is an edit that changed nothing`);
      } else {
        assert.equal(row.edits, undefined, `${row.id} carries edits`);
      }
    }
  });

  it("never says a request came back before the rejection that sent it back", () => {
    for (const row of REGISTRATIONS_QUEUE) {
      const rounds = row.rejections ?? [];
      for (const round of rounds) {
        assert.ok(
          round.daysAgo > row.daysWaiting,
          `${row.applicationNumber} was resubmitted ${row.daysWaiting} days ago but round ${round.round} went out only ${round.daysAgo} days ago`,
        );
      }
      // Oldest round first, and the numbers run 1, 2, 3 … without a gap.
      assert.deepEqual(
        rounds.map((round) => round.round),
        rounds.map((_, index) => index + 1),
      );
      const ages = rounds.map((round) => round.daysAgo);
      assert.deepEqual(ages, [...ages].sort((a, b) => b - a));
    }
  });

  it("gives every reason enough words to be acted on — the failure the gate exists to stop", () => {
    for (const row of REGISTRATIONS_QUEUE) {
      for (const round of row.rejections ?? []) {
        assert.ok(
          round.reason.trim().split(/\s+/).length >= 8,
          `${row.applicationNumber} round ${round.round} is a one-word remark`,
        );
      }
    }
  });

  it("holds one photograph that will not open, so the well's failure state is reachable", () => {
    const missing = REGISTRATIONS_QUEUE.filter((r) =>
      r.photo.src.includes("not-uploaded"),
    );
    assert.equal(missing.length, 1);
  });
});

describe("sortByLongestWait", () => {
  it("puts the longest wait first — the queue is a work list", () => {
    const days = REGISTRATIONS_QUEUE.map((r) => r.daysWaiting);
    assert.deepEqual(days, [...days].sort((a, b) => b - a));
  });

  it("breaks a tie on the application number, so the order is stable between renders", () => {
    const rows = sortByLongestWait([
      row({ id: "b", applicationNumber: "KL-ADV-000209-2026", daysWaiting: 1 }),
      row({ id: "a", applicationNumber: "KL-ADV-000204-2026", daysWaiting: 1 }),
      row({ id: "c", applicationNumber: "KL-ADV-000118-2026", daysWaiting: 9 }),
    ]);
    assert.deepEqual(
      rows.map((r) => r.id),
      ["c", "a", "b"],
    );
  });

  it("does not reorder the array it was handed", () => {
    const input = [
      row({ id: "a", daysWaiting: 1 }),
      row({ id: "b", daysWaiting: 9 }),
    ];
    sortByLongestWait(input);
    assert.deepEqual(
      input.map((r) => r.id),
      ["a", "b"],
    );
  });
});

describe("filterRegistrations", () => {
  const all = REGISTRATIONS_QUEUE;

  it("asks for everything when the box is empty", () => {
    assert.equal(
      filterRegistrations(all, EMPTY_REGISTRATIONS_FILTERS).length,
      all.length,
    );
    assert.equal(filterRegistrations(all, { query: "   " }).length, all.length);
  });

  it("finds a request by the name the officer was given", () => {
    const rows = filterRegistrations(all, { query: "meera" });
    assert.deepEqual(
      rows.map((r) => r.applicationNumber),
      ["KL-ADV-000181-2026"],
    );
  });

  it("finds a request by the Bar registration ID the bar quoted", () => {
    const rows = filterRegistrations(all, { query: "KAR/12453/2018" });
    assert.deepEqual(
      rows.map((r) => r.applicationNumber),
      ["KL-ADV-000203-2026"],
    );
  });

  it("finds a request by the application number the advocate read off their own screen", () => {
    const rows = filterRegistrations(all, { query: "KL-ADV-000207-2026" });
    assert.deepEqual(
      rows.map((r) => r.fullName),
      ["Joseph Mathew"],
    );
  });

  it("finds a name written in Malayalam, typed in Malayalam", () => {
    const rows = filterRegistrations(all, { query: "ഷൈലജ" });
    assert.deepEqual(
      rows.map((r) => r.applicationNumber),
      ["KL-ADV-000196-2026"],
    );
  });

  it("wants every word, in any order and any amount of space", () => {
    assert.equal(
      filterRegistrations(all, { query: "mathew   joseph" }).length,
      1,
    );
    assert.equal(filterRegistrations(all, { query: "joseph vaidya" }).length, 0);
  });

  it("does not reach the contact details — a queue is not a directory", () => {
    assert.equal(filterRegistrations(all, { query: "9605178432" }).length, 0);
    assert.equal(
      filterRegistrations(all, { query: "meera.suresh@example.com" }).length,
      0,
    );
  });

  it("matches whatever the case the officer typed", () => {
    assert.equal(
      filterRegistrations(all, { query: "kl/3312/2021" }).length,
      filterRegistrations(all, { query: "KL/3312/2021" }).length,
    );
  });
});

describe("removing a decided request from the queue", () => {
  /* The screen holds the ids it has decided and filters them out; the count line and the
     rail count are both read off what is left. This is that arithmetic, without React. */
  function remaining(decided: Set<string>): RegistrationRequest[] {
    return REGISTRATIONS_QUEUE.filter((r) => !decided.has(r.id));
  }

  it("drops exactly the row that was decided, and leaves the order alone", () => {
    const first = REGISTRATIONS_QUEUE[0];
    const rows = remaining(new Set([first.id]));
    assert.equal(rows.length, REGISTRATIONS_QUEUE.length - 1);
    assert.ok(!rows.some((r) => r.id === first.id));
    const days = rows.map((r) => r.daysWaiting);
    assert.deepEqual(days, [...days].sort((a, b) => b - a));
  });

  it("takes the count down with it — the header and the rail read the same list", () => {
    const decided = new Set(REGISTRATIONS_QUEUE.slice(0, 3).map((r) => r.id));
    assert.equal(remaining(decided).length, REGISTRATIONS_QUEUE_COUNT - 3);
  });

  it("empties to the good-empty state rather than to an error", () => {
    const decided = new Set(REGISTRATIONS_QUEUE.map((r) => r.id));
    assert.deepEqual(remaining(decided), []);
  });
});

describe("registrationWaitTone", () => {
  it("stays plain below the registry's first threshold", () => {
    assert.equal(registrationWaitTone(0), "plain");
    assert.equal(registrationWaitTone(6), "plain");
  });

  it("escalates on day 7 and again on day 14 — the scrutiny queue's borrowed clock", () => {
    assert.equal(registrationWaitTone(7), "warning");
    assert.equal(registrationWaitTone(13), "warning");
    assert.equal(registrationWaitTone(14), "destructive");
    assert.equal(registrationWaitTone(61), "destructive");
  });
});

describe("what the row and the overlay call things", () => {
  it("leaves a first registration unmarked — the norm gets no badge", () => {
    const first = REGISTRATIONS_QUEUE.find(
      (r) => r.requestKind === "first",
    );
    assert.ok(first);
    assert.equal(requestKindLabel(first), null);
  });

  it("marks an edited pre-created account, and a resubmission with its round", () => {
    const edited = REGISTRATIONS_QUEUE.find(
      (r) => r.requestKind === "edited",
    );
    assert.ok(edited);
    // The queue chip and the overlay row say the same thing: one fact, one name.
    assert.equal(requestKindLabel(edited), "Profile update");

    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-118");
    assert.ok(back);
    assert.equal(currentRound(back), 5);
    assert.equal(requestKindLabel(back), "Resubmitted · round 5");
  });

  it("spends colour on the account type alone — two hues, one per kind", () => {
    // States are the neutral pill now; the only pills with a hue are the account type's,
    // so colour on this screen answers one question (owner, 2026-09-11).
    assert.equal(accountTypeVariant("advocate"), "info");
    assert.equal(accountTypeVariant("clerk"), "success");
    assert.notEqual(accountTypeVariant("advocate"), accountTypeVariant("clerk"));
  });

  it("counts a request with one rejection behind it as round 2", () => {
    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-198");
    assert.ok(back);
    assert.equal(currentRound(back), 2);
    assert.deepEqual(
      rejectionRows(back).map((row) => row.term),
      ["Round 1"],
    );
  });

  it("names the three kinds of request as values, not as sentences", () => {
    const first = REGISTRATIONS_QUEUE.find((r) => r.requestKind === "first");
    const edited = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-191");
    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-118");
    assert.ok(first && edited && back);
    assert.equal(requestTypeValue(first), "New registration");
    // Three answers to one question. Where the account came from is provenance, not the
    // type of the request — the owner read "Edited Bar Council account" as nonsense.
    assert.equal(requestTypeValue(edited), "Profile update");
    assert.equal(requestTypeValue(back), "Resubmitted · round 5");
    assert.equal(
      requestTypeValue({ ...edited, registrantKind: "clerk" }),
      "Profile update",
    );
    assert.equal(requestKindLabel(edited), requestTypeValue(edited));
  });

  it("reads its labels off the registrant, so clerks need no restructuring", () => {
    // Parallel, and in the words each person's own sign-up form used.
    assert.equal(registrationIdLabel("advocate"), "Bar registration number");
    assert.equal(registrationIdLabel("clerk"), "Clerk registration number");
    assert.equal(idPhotoLabel("advocate"), "Photo of Bar ID card");
    assert.equal(idPhotoLabel("clerk"), "Photo of clerk ID card");
    assert.equal(idCardName("advocate"), "Bar ID card");
    assert.equal(idCardName("clerk"), "clerk ID card");
    assert.equal(registrantNoun("advocate"), "advocate");
    assert.equal(registrantNoun("clerk"), "clerk");
  });

  it("finds the changed value for a field, and nothing for one that was not touched", () => {
    const edited = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-191");
    assert.ok(edited);
    assert.equal(editFor(edited, "mobile")?.was, "9847051204");
    // An email the Bar Council record never held is an addition, not a change.
    assert.equal(editFor(edited, "email")?.was, null);
    assert.equal(editFor(edited, "fullName")?.was, "Thomas Kurian");
    assert.equal(editFor(edited, "registrationNumber"), undefined);
  });

  it("spells the unit out where there is no column header to say it", () => {
    assert.equal(formatDaysWaiting(18), "18");
    assert.equal(formatDaysWaitingSpoken(1), "1 day waiting");
    assert.equal(formatDaysWaitingSpoken(18), "18 days waiting");
  });
});

describe("the dates the overlay shows", () => {
  it("derives the submission day from the wait, so the two can never disagree", () => {
    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-118");
    assert.ok(back);
    assert.equal(back.daysWaiting, 61);
    assert.equal(submissionDay(back), "2026-07-11");
  });

  it("puts every rejection round before the submission it sent back", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const submitted = submissionDay(request);
      for (const round of request.rejections ?? []) {
        assert.ok(
          rejectionDay(round) < submitted,
          `${request.applicationNumber} round ${round.round} is dated after the request it produced`,
        );
      }
    }
  });
});

/**
 * The two shapes — the thing the overlay was rebuilt around, twice.
 *
 * The first build turned each machine answer into a sentence of its own. The second made
 * every answer a value but hung all of them off the row the value lived in, so one line
 * could carry two chips, a source line and a struck-through previous value at once. These
 * are the tests that keep both from coming back: a fact row is a term and a value and
 * nothing else, and anything comparing two sources is a table with a column for each.
 */
describe("shape one: a term and its value", () => {
  it("renders the request, the four submitted values and every round through one shape", () => {
    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-118");
    assert.ok(back);
    const rows = allRows(back);
    // 4 request facts (account type first) + 4 identity rows + 4 rejection rounds.
    assert.equal(rows.length, 12);
    for (const row of rows) {
      assert.equal(typeof row.term, "string");
      assert.ok(row.term.length > 0, "a row with no term");
      assert.equal(typeof row.value, "string");
      assert.ok(row.value.length > 0, `${row.id} has no value`);
    }
  });

  it("collects exactly four attribute rows — five collected values less the photograph", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const rows = identityRows(request);
      assert.deepEqual(
        rows.map((row) => row.id),
        request.email
          ? ["fullName", "registrationNumber", "mobile", "email"]
          : ["fullName", "registrationNumber", "mobile"],
        `${request.applicationNumber} shows an attribute the flow does not collect`,
      );
    }
  });

  it("says nothing on an identity row about where the value came from", () => {
    // The whole of the 2026-09-11 rebuild, as an assertion: the block the officer reads
    // against the photograph holds what the advocate typed and stops. Anything a source
    // has to say about it is a comparison table, never a decoration on the value.
    const carried = ["id", "term", "value", "format", "valueLang"];
    for (const request of REGISTRATIONS_QUEUE) {
      for (const row of identityRows(request)) {
        for (const key of Object.keys(row)) {
          assert.ok(
            carried.includes(key),
            `${request.applicationNumber} ${row.id} carries "${key}" — a source, a mark or a previous value has grown back onto the row`,
          );
        }
        assert.equal(row.tone, undefined);
        assert.equal(row.note, undefined);
      }
    }
  });

  it("carries the queue cell's own escalation into the overlay's Waiting row", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const [account, submitted, waiting, kind] = requestRows(request);
      assert.deepEqual(
        [account.term, submitted.term, waiting.term, kind.term],
        ["Account type", "Submitted", "Waiting", "Request type"],
      );
      assert.equal(account.tone, undefined);
      assert.equal(waiting.tone, registrationWaitTone(request.daysWaiting));
      assert.equal(waiting.value, formatWaitingDuration(request.daysWaiting));
      assert.equal(submitted.tone, undefined);
      assert.equal(kind.tone, undefined);
    }
  });

  it("puts the newest rejection first, every round in the same row", () => {
    const back = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-118");
    assert.ok(back);
    const rounds = rejectionRows(back);
    assert.deepEqual(
      rounds.map((row) => row.term),
      ["Round 4", "Round 3", "Round 2", "Round 1"],
    );
    for (const round of rounds) {
      // The officer's own words are the value; the date is a slot, not a sentence.
      assert.ok(round.note && /^\d+ \w+ \d{4}$/.test(round.note));
    }
    assert.equal(rounds[0].note, "8 July 2026");
    assert.deepEqual(rejectionRows(REGISTRATIONS_QUEUE[1]), []);
  });

  it("never repeats the application number the dialog header already carries", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      for (const row of allRows(request)) {
        assert.ok(
          !row.value.includes(request.applicationNumber),
          `${request.applicationNumber} is said twice`,
        );
      }
    }
  });

  it("reads every term off the registrant, so a clerk queue needs no new row", () => {
    const request = REGISTRATIONS_QUEUE[0];
    const clerk: RegistrationRequest = { ...request, registrantKind: "clerk" };
    assert.equal(identityRows(request)[1].term, "Bar registration number");
    assert.equal(identityRows(clerk)[1].term, "Clerk registration number");
    assert.deepEqual(
      identityRows(clerk).map((row) => row.id),
      identityRows(request).map((row) => row.id),
    );
  });
});

describe("the register speaks only when it disagrees", () => {
  it("says nothing at all when the entry agrees", () => {
    const clean = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-207");
    assert.ok(clean);
    assert.equal(registerAnswer(clean), null);
    assert.equal(registerFindingRow(clean), null);
    // …and the Request group is its four facts, with nothing appended.
    assert.equal(requestRows(clean).length, 4);
  });

  it("reaches its three answers, each as one row in the Request group", () => {
    const differs = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-181");
    const noEntry = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-203");
    const notChecked = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-164");
    assert.ok(differs && noEntry && notChecked);

    assert.equal(registerAnswer(differs), "differs");
    assert.deepEqual(registerFindingRow(differs), {
      id: "register",
      // The act, not the institution: a bare register name in a term column says nothing
      // about why the row is there. The register names itself over the values it claims.
      term: "Bar Council check",
      // The row names what is wrong; the disclosure holds the evidence for it.
      value: "Full name does not match",
      format: "text",
      tone: "warning",
    });

    assert.equal(registerAnswer(noEntry), "no-entry");
    // The term reads off the registrant, so the clerk queue needs no new row.
    assert.equal(registerName("advocate"), "Bar Council register");
    assert.equal(registerName("clerk"), "Clerk register");
    assert.equal(registerFindingRow(noEntry)?.term, "Bar Council check");
    assert.equal(
      registerFindingRow({ ...noEntry, registrantKind: "clerk" })?.term,
      "Clerk register check",
    );
    assert.equal(
      registerFindingRow(noEntry)?.value,
      "No entry for this registration ID",
    );

    assert.equal(registerAnswer(notChecked), "not-checked");
    assert.equal(registerFindingRow(notChecked)?.value, "Could not be reached");
  });

  it("never puts the finding anywhere but that one row", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const finding = registerFindingRow(request);
      const rows = requestRows(request);
      assert.equal(rows.length, finding ? 5 : 4);
      // Nothing in the Identity block mentions a register, matching or otherwise.
      for (const row of identityRows(request)) {
        assert.ok(
          !/register|matches|verified|OTP/i.test(row.value),
          `${request.applicationNumber} ${row.id} narrates a lookup`,
        );
      }
    }
  });
});

describe("shape two: two values, side by side", () => {
  it("compares nothing on an ordinary request", () => {
    const clean = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-207");
    assert.ok(clean);
    assert.deepEqual(comparisonBlocks(clean), []);
  });

  it("puts a disagreeing register in its own table, claim first", () => {
    const differs = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-181");
    assert.ok(differs);
    const [block, ...rest] = comparisonBlocks(differs);
    assert.deepEqual(rest, []);
    assert.equal(block.id, "register");
    assert.equal(block.label, "Does not match Bar Council of Kerala");
    // The register names itself over its own values — that is where "what is on the
    // system records" belongs, and why the row above it can be called a check.
    assert.deepEqual(block.columns, ["Submitted", "Bar Council of Kerala"]);
    assert.equal(block.tone, "warning");
    assert.equal(block.rows.length, 1);
    assert.equal(block.rows[0].term, "Full name");
    // Two names, two scripts, one row: the register's answer carries the register's own
    // tag, never the claimant's, or a screen reader speaks the disagreement in one voice.
    assert.deepEqual(block.rows[0].values, [
      { text: "Meera Suresh", lang: undefined, format: "text" },
      { text: "മീര സുധാകരൻ", lang: "ml", format: "text" },
    ]);
  });

  it("shows before and after as two columns, never a struck-through value", () => {
    const edited = REGISTRATIONS_QUEUE.find((r) => r.id === "adv-191");
    assert.ok(edited);
    const blocks = comparisonBlocks(edited);
    /* Both, now that each sits behind the row that announces it: the register's finding
       opens what the register holds, and "Edited …" opens what the holder changed. They
       answer two questions and are never on screen together unless both are opened. */
    assert.deepEqual(
      blocks.map((block) => block.id),
      ["register", "changed"],
    );
    assert.equal(registerAnswer(edited), "differs");
    assert.ok(registerFindingRow(edited));

    const changed = blocks[1];
    assert.equal(changed.label, "Changed at first login");
    assert.deepEqual(changed.columns, ["Before", "Now"]);
    assert.equal(changed.tone, "plain");
    // Ordered by the Identity block, not by the edit list.
    assert.deepEqual(
      changed.rows.map((row) => row.id),
      ["fullName", "mobile", "email"],
    );
    assert.deepEqual(changed.rows[1].values, [
      { text: "9847051204", format: "figure" },
      { text: edited.mobile, lang: undefined, format: "figure" },
    ]);
    // A value the record never held is words, not an em-dash the officer has to read
    // as "nothing" rather than "unknown".
    const [before] = changed.rows[2].values;
    assert.equal(before.text, "Not given");
    assert.equal(before.absent, true);
  });

  it("folds the register's evidence behind its finding, and leaves the edit open", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const rows = requestRows(request);
      const built = comparisonBlocks(request).map((block) => block.id);
      // The register's finding opens the register's comparison — an exception to look into.
      const register = rows.find((row) => row.id === "register");
      assert.equal(
        register?.detail?.id ?? null,
        built.includes("register") ? "register" : null,
      );
      // The edit is never behind a row: on a profile update it *is* the request, and the
      // screen renders it as a section of its own (owner, 2026-09-11).
      for (const row of rows) assert.notEqual(row.detail?.id, "changed");
      // Nothing in the Identity block opens anything: it is what was typed, full stop.
      for (const row of identityRows(request)) assert.equal(row.detail, undefined);
    }
  });

  it("names every attribute the register disagrees with, in the finding itself", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      const finding = registerFindingRow(request);
      if (registerAnswer(request) !== "differs") continue;
      assert.ok(finding);
      for (const term of mismatchedTerms(request)) {
        assert.ok(
          finding.value.startsWith(term) || finding.value.includes(` ${term}`),
          `${request.applicationNumber}: the finding does not say which value differs`,
        );
      }
    }
  });

  it("gives every row one value per column, on every request", () => {
    for (const request of REGISTRATIONS_QUEUE) {
      for (const block of comparisonBlocks(request)) {
        assert.ok(block.rows.length > 0, `${block.id} rendered an empty table`);
        for (const row of block.rows) {
          assert.equal(
            row.values.length,
            block.columns.length,
            `${request.applicationNumber} ${block.id}/${row.id} has a ragged row`,
          );
          for (const value of row.values) {
            assert.ok(value.text.length > 0, "an empty cell");
          }
        }
      }
    }
  });
});

describe("an advocate clerk's request", () => {
  const clerks = REGISTRATIONS_QUEUE.filter(
    (r) => r.registrantKind === "clerk",
  );

  it("is in the queue, mixed in by wait rather than filed separately", () => {
    assert.equal(clerks.length, 3);
    // The queue stays one list in wait order; there is no clerks-first or clerks-last.
    assert.deepEqual(
      REGISTRATIONS_QUEUE,
      sortByLongestWait(REGISTRATIONS_QUEUE),
    );
  });

  it("says what it is registering as in one word that differs from the other at once", () => {
    // "Clerk", not the sign-up's "Advocate clerk": in a column of two values the eye
    // should not have to reach the end of the cell to tell them apart (owner, 2026-09-11).
    assert.equal(roleLabel("clerk"), "Clerk");
    assert.equal(roleLabel("advocate"), "Advocate");
    assert.notEqual(roleLabel("clerk")[0], roleLabel("advocate")[0]);
    // The account type leads the Request group, as the pill the queue's column shows.
    for (const request of REGISTRATIONS_QUEUE) {
      const [account] = requestRows(request);
      assert.equal(account.id, "accountType");
      assert.equal(account.value, roleLabel(request.registrantKind));
      assert.equal(account.pill, accountTypeVariant(request.registrantKind));
      // …and no other row is a pill: one category, one presentation.
      for (const row of requestRows(request).slice(1)) {
        assert.equal(row.pill, undefined);
      }
    }
  });

  it("asks nothing of a register, so it carries no finding and no comparison", () => {
    for (const clerk of clerks) {
      assert.equal(registerAnswer(clerk), null);
      assert.equal(registerFindingRow(clerk), null);
      assert.equal(
        requestRows(clerk).some((row) => row.id === "register"),
        false,
      );
      assert.equal(
        comparisonBlocks(clerk).some((block) => block.id === "register"),
        false,
      );
    }
  });

  it("names its own number and its own card, never the Bar's", () => {
    for (const clerk of clerks) {
      const terms = identityRows(clerk).map((row) => row.term);
      assert.ok(terms.includes("Clerk registration number"));
      assert.ok(!terms.some((term) => /bar/i.test(term)));
      assert.equal(idPhotoLabel(clerk.registrantKind), "Photo of clerk ID card");
    }
  });

  it("is never a profile update — only Bar Council accounts are pre-created", () => {
    for (const clerk of clerks) assert.notEqual(clerk.requestKind, "edited");
    // …but a clerk is sent back and resubmits like anyone else (`REG-23`).
    assert.ok(clerks.some((clerk) => clerk.requestKind === "resubmission"));
  });

  it("is found by its clerk registration number", () => {
    const rows = filterRegistrations(REGISTRATIONS_QUEUE, {
      query: "CLK/2143",
    });
    assert.deepEqual(
      rows.map((r) => r.applicationNumber),
      ["KL-CLERK-000192-2026"],
    );
  });
});

describe("the next request after a decision", () => {
  const a = row({ id: "a", daysWaiting: 30, applicationNumber: "KL-ADV-000001-2026" });
  const b = row({ id: "b", daysWaiting: 20, applicationNumber: "KL-ADV-000002-2026" });
  const c = row({ id: "c", daysWaiting: 20, applicationNumber: "KL-ADV-000003-2026" });
  const d = row({ id: "d", daysWaiting: 5, applicationNumber: "KL-ADV-000004-2026" });

  it("offers the row below the one just decided, in queue order", () => {
    assert.equal(nextInQueue([a, c, d], b)?.id, "c");
    assert.equal(nextInQueue([a, b, d], c)?.id, "d");
  });

  it("wraps to the top of what is left when the last row was decided", () => {
    assert.equal(nextInQueue([a, b, c], d)?.id, "a");
  });

  it("offers nothing once the list is empty", () => {
    assert.equal(nextInQueue([], d), null);
  });

  it("reads the list it is given, so a narrowed search offers the next match", () => {
    assert.equal(nextInQueue([d], a)?.id, "d");
  });
});

/** A minimal row, for the sort tests — only the fields those tests read are meaningful. */
function row(
  over: Partial<RegistrationRequest> & { id: string },
): RegistrationRequest {
  return {
    applicationNumber: "KL-ADV-000100-2026",
    fullName: "Test Advocate",
    registrationNumber: "KL/0001/2000",
    mobile: "9000000000",
    photo: { src: "/demo/bar-id-card-specimen.svg", filename: "card.jpg" },
    daysWaiting: 1,
    registrantKind: "advocate",
    requestKind: "first",
    lookup: { state: "not-checked" },
    ...over,
  };
}
