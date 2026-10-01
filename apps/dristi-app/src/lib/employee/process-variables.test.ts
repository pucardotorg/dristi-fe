import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { accusedHasJoined } from "./case-people";
import { fillPartyVariables, orderTemplate } from "./order-templates";
import {
  channelsFor,
  defaultProcessVariables,
  processesFor,
  processParties,
  processVariablesComplete,
  selectedChannels,
  selectedRecipients,
  type ProcessVariables,
} from "./process-variables";

/* §5.1 of `handovers/process-handover.md` — what the issue-process pop-up opens on. */

const NOT_JOINED = {
  caseNumber: "ST/249/2026",
  parties: { complainant: "Arjun Nair", accused: "Gill Steel Fabricators" },
  counsel: [],
  stage: "process" as const,
};
const ONE_UNEXAMINED = {
  caseNumber: "ST/241/2026",
  parties: { complainant: "Sunil Varghese", accused: "Anand Traders" },
  counsel: [{ name: "Adv. Rekha Pillai", side: "accused" as const }],
  stage: "evidence" as const,
};
const TWO_UNEXAMINED = {
  caseNumber: "ST/250/2026",
  parties: { complainant: "Fathima Beevi", accused: "Nithin Jose" },
  counsel: [{ name: "Adv. Feroz Hameed", side: "accused" as const }],
  stage: "evidence" as const,
};

const ids = (variables: ProcessVariables) =>
  selectedRecipients(variables).map((entry) => entry.id);
const channels = (variables: ProcessVariables) =>
  selectedChannels(variables).map((entry) => entry.id);

describe("who the pop-up pre-selects", () => {
  it("selects every accused until the accused has joined (AUT-05)", () => {
    const variables = defaultProcessVariables("issue-of-summons", NOT_JOINED);
    assert.equal(variables.reason, "accused-not-joined");
    assert.deepEqual(ids(variables), ["accused-1", "accused-2"]);
  });

  it("selects the one unexamined witness once the accused has joined (AUT-06)", () => {
    const variables = defaultProcessVariables("issue-of-summons", ONE_UNEXAMINED);
    assert.equal(variables.reason, "one-witness-unexamined");
    assert.deepEqual(ids(variables), ["pw-2"]);
  });

  it("leaves the choice open when more than one witness is unexamined (AUT-06)", () => {
    const variables = defaultProcessVariables("issue-of-summons", TWO_UNEXAMINED);
    assert.equal(variables.reason, "open");
    assert.deepEqual(ids(variables), []);
  });

  it("selects every address on every recipient (AUT-07)", () => {
    const variables = defaultProcessVariables("issue-of-summons", NOT_JOINED);
    for (const recipient of variables.recipients) {
      assert.ok(recipient.addresses.every((place) => place.selected));
    }
  });

  it("never treats the accused as joined at cognizance", () => {
    assert.equal(accusedHasJoined({ ...ONE_UNEXAMINED, stage: "cognizance" }), false);
  });
});

describe("which channels the pop-up pre-selects (AUT-08)", () => {
  it("SMS, Email and RPAD for notice and summons", () => {
    for (const template of ["issue-of-notice", "issue-of-summons"] as const) {
      assert.deepEqual(channels(defaultProcessVariables(template, NOT_JOINED)), [
        "sms",
        "email",
        "rpad",
      ]);
    }
  });

  it("Police (NSTEP) for warrant, proclamation and attachment", () => {
    for (const template of [
      "issue-of-warrants",
      "issue-of-proclamation",
      "issue-of-attachment",
    ] as const) {
      assert.deepEqual(channels(defaultProcessVariables(template, NOT_JOINED)), [
        "police-nstep",
      ]);
    }
  });

  it("offers a warrant police channels only, and a notice none (§6.3)", () => {
    assert.ok(channelsFor("issue-of-warrants").every((channel) => channel.police));
    assert.ok(channelsFor("issue-of-notice").every((channel) => !channel.police));
  });
});

describe("what confirming creates (§3, AUT-09)", () => {
  it("is one process per recipient, per channel, per address", () => {
    /* Accused 1: two addresses, mobile, email. Accused 2: one address, mobile only.
       SMS 2 + Email 1 + RPAD 3 = 6. */
    const variables = defaultProcessVariables("issue-of-summons", NOT_JOINED);
    const processes = processesFor(variables);
    assert.equal(processes.length, 6);
    assert.equal(processes.filter((entry) => entry.channel === "email").length, 1);
  });

  it("pre-selects a police station from each address, and blocks on one it cannot resolve", () => {
    const resolved = defaultProcessVariables("issue-of-warrants", NOT_JOINED);
    assert.ok(processVariablesComplete(resolved));
    const open = defaultProcessVariables("issue-of-warrants", TWO_UNEXAMINED);
    const dw = { ...open, recipients: open.recipients.map((entry) => ({ ...entry, selected: entry.id === "dw-1" })) };
    assert.equal(processesFor(dw)[0].policeStation, "");
    assert.equal(processVariablesComplete(dw), false);
  });
});

describe("the order's words follow who was selected", () => {
  it("names the selected witness, and their own side takes steps (AUT-02)", () => {
    const variables = defaultProcessVariables("issue-of-summons", ONE_UNEXAMINED);
    const text = fillPartyVariables(
      orderTemplate("issue-of-summons").botd,
      "issue-of-summons",
      processParties(variables),
    );
    assert.match(text, /Issue summons to the witness Branch Manager, Federal Bank, Chinnakada\./);
    assert.match(text, /The complainant is directed/);
  });

  it("names every accused, with the complainant taking steps", () => {
    const variables = defaultProcessVariables("issue-of-warrants", NOT_JOINED);
    const text = fillPartyVariables(
      orderTemplate("issue-of-warrants").botd,
      "issue-of-warrants",
      processParties(variables),
    );
    assert.match(text, /Issue warrant to the accused Gill Steel Fabricators and Harpreet Gill\./);
    assert.match(text, /The complainant is directed/);
  });

  it("leaves the party taking steps in brackets when the selection spans sides (AUT-03)", () => {
    const open = defaultProcessVariables("issue-of-summons", TWO_UNEXAMINED);
    const mixed = {
      ...open,
      recipients: open.recipients.map((entry) => ({
        ...entry,
        selected: entry.id === "pw-2" || entry.id === "dw-1",
      })),
    };
    const text = fillPartyVariables(
      orderTemplate("issue-of-summons").botd,
      "issue-of-summons",
      processParties(mixed),
    );
    assert.match(text, /The \[Party Type\] is directed/);
  });
});
