/**
 * Who a process goes to and how — what the issue-process pop-up asks for, and what it
 * opens on.
 *
 * `PRC-03` (`handovers/process-handover.md`): the recipient and the delivery channels
 * are entered on the order screen, and for a police channel the police station.
 * `ITM-11` (`handovers/order-generation.md`): that is input the order item needs beyond
 * its template variables, asked for as part of adding the item.
 *
 * **What it opens on is §5.1 of the handover**, and lives here so it is one place to
 * read and one place to test:
 *
 * - `AUT-05` until the accused has joined, every accused is pre-selected;
 * - `AUT-06` after, the one witness not yet examined is — and if there is not exactly
 *   one, nobody is;
 * - `AUT-07` every address on a selected recipient's record is pre-selected;
 * - `AUT-08` channels by process type — SMS, Email and RPAD for notice and summons,
 *   Police (NSTEP) for warrant, proclamation and attachment;
 * - `AUT-04` the police station, from each address.
 *
 * **Several recipients at once is the screen's convenience only** (`AUT-09`). What the
 * order triggers is still one process per recipient, per channel, per address (§3) —
 * `processesFor` below is that resolution, and the pop-up shows its count so the
 * drafter can see what confirming will create.
 */

import {
  formatStructuredAddress,
  type StructuredAddress,
} from "@/components/cases/structured-address";

import {
  casePeopleFor,
  policeStationFor,
  type CaseMatter,
  type CasePerson,
} from "./case-people";
import type { OrderTemplateId } from "./order-templates";

export type ProcessChannel =
  | "sms"
  | "email"
  | "rpad"
  | "epost"
  | "police-rpad"
  | "police-nstep"
  | "police-icops";

/** What on a recipient's record a channel delivers to (`PRC-05`). */
type Destination = "mobile" | "email" | "address";

export const PROCESS_CHANNELS: {
  id: ProcessChannel;
  label: string;
  destination: Destination;
  /** A police channel goes to a police station, which is entered alongside (`PRC-03`). */
  police: boolean;
}[] = [
  { id: "sms", label: "SMS", destination: "mobile", police: false },
  { id: "email", label: "Email", destination: "email", police: false },
  { id: "rpad", label: "RPAD", destination: "address", police: false },
  { id: "epost", label: "e-Post", destination: "address", police: false },
  { id: "police-rpad", label: "Police (RPAD)", destination: "address", police: true },
  { id: "police-nstep", label: "Police (NSTEP)", destination: "address", police: true },
  { id: "police-icops", label: "Police (iCOPS)", destination: "address", police: true },
];

/**
 * The channels this deployment offers (`PRC-04`). A deployment runs Police (NSTEP) or
 * Police (iCOPS), not both; this one runs NSTEP, as the owner specified the default
 * (2026-10-01). A Kerala deployment swaps the one for the other here, and `AUT-08`'s
 * police default follows it.
 */
export const DEPLOYMENT_CHANNELS: ProcessChannel[] = [
  "sms",
  "email",
  "rpad",
  "epost",
  "police-rpad",
  "police-nstep",
];

/** The process templates the pop-up is asked for — every one in the Process group. */
export type ProcessTemplateId = Extract<
  OrderTemplateId,
  | "issue-of-notice"
  | "issue-of-summons"
  | "issue-of-warrants"
  | "issue-of-proclamation"
  | "issue-of-attachment"
  | "issue-of-miscellaneous-process"
>;

const ALL: ProcessChannel[] = PROCESS_CHANNELS.map((channel) => channel.id);
const POLICE: ProcessChannel[] = ["police-rpad", "police-nstep", "police-icops"];

/** Which process type allows which channel — §6.3 of the handover. */
const PERMITTED: Record<ProcessTemplateId, ProcessChannel[]> = {
  "issue-of-notice": ["sms", "email", "rpad", "epost"],
  "issue-of-summons": ALL,
  "issue-of-warrants": POLICE,
  "issue-of-proclamation": POLICE,
  "issue-of-attachment": POLICE,
  "issue-of-miscellaneous-process": ALL,
};

/** The deployment's digital police channel — whichever of NSTEP and iCOPS it runs. */
const DIGITAL_POLICE: ProcessChannel = DEPLOYMENT_CHANNELS.includes("police-icops")
  ? "police-icops"
  : "police-nstep";

/**
 * What each type opens with ticked — `AUT-08`. Custom process has no default in the
 * handover, so it opens with none.
 */
const PRESELECTED: Record<ProcessTemplateId, ProcessChannel[]> = {
  "issue-of-notice": ["sms", "email", "rpad"],
  "issue-of-summons": ["sms", "email", "rpad"],
  "issue-of-warrants": [DIGITAL_POLICE],
  "issue-of-proclamation": [DIGITAL_POLICE],
  "issue-of-attachment": [DIGITAL_POLICE],
  "issue-of-miscellaneous-process": [],
};

export function isProcessTemplate(id: string): id is ProcessTemplateId {
  return id in PERMITTED;
}

/** The channels the pop-up offers for this type: permitted by type and by deployment. */
export function channelsFor(template: ProcessTemplateId) {
  return PROCESS_CHANNELS.filter(
    (channel) =>
      PERMITTED[template].includes(channel.id) && DEPLOYMENT_CHANNELS.includes(channel.id),
  );
}

export type ProcessAddress = {
  id: string;
  address: StructuredAddress;
  selected: boolean;
  /** For a police channel. Pre-selected from the address, or empty if it does not
   *  resolve to one station (`AUT-04`). */
  policeStation: string;
};

/** One person the process could go to, and whether this confirmation carries them. */
export type ProcessRecipient = Omit<CasePerson, "addresses"> & {
  selected: boolean;
  addresses: ProcessAddress[];
};

/** Why the pop-up opened on the recipients it did — said in the pop-up. */
export type PreselectionReason =
  | "accused-not-joined"
  | "one-witness-unexamined"
  | "open";

/** What the drafter confirmed before the process sentence was written in. */
export type ProcessVariables = {
  template: ProcessTemplateId;
  recipients: ProcessRecipient[];
  channels: Readonly<Record<ProcessChannel, boolean>>;
  reason: PreselectionReason;
};

/** What the pop-up opens on, for this type of process on this case — §5.1. */
export function defaultProcessVariables(
  template: ProcessTemplateId,
  matter: CaseMatter,
): ProcessVariables {
  const { people, accusedJoined } = casePeopleFor(matter);
  const unexamined = people.filter(
    (entry) => entry.kind === "witness" && entry.examined === false,
  );

  let reason: PreselectionReason;
  let chosen: (entry: CasePerson) => boolean;
  if (!accusedJoined) {
    reason = "accused-not-joined";
    chosen = (entry) => entry.kind === "accused";
  } else if (unexamined.length === 1) {
    reason = "one-witness-unexamined";
    chosen = (entry) => entry.id === unexamined[0].id;
  } else {
    reason = "open";
    chosen = () => false;
  }

  const offered = channelsFor(template).map((channel) => channel.id);
  return {
    template,
    reason,
    recipients: people.map((entry) => ({
      ...entry,
      selected: chosen(entry),
      addresses: entry.addresses.map((place) => ({
        ...place,
        selected: true,
        policeStation: policeStationFor(place.address) ?? "",
      })),
    })),
    channels: ALL.reduce(
      (channels, id) => ({
        ...channels,
        [id]: offered.includes(id) && PRESELECTED[template].includes(id),
      }),
      {} as Record<ProcessChannel, boolean>,
    ),
  };
}

/** The recipients this confirmation actually carries — the ticked rows, not every row. */
export function selectedRecipients(variables: ProcessVariables): ProcessRecipient[] {
  return variables.recipients.filter((entry) => entry.selected);
}

export function selectedChannels(variables: ProcessVariables) {
  return channelsFor(variables.template).filter(
    (channel) => variables.channels[channel.id],
  );
}

/** One process the order will create: one recipient, one channel, one destination. */
export type ResolvedProcess = {
  recipientId: string;
  channel: ProcessChannel;
  /** For an address channel. */
  addressId?: string;
  /** For a police channel. */
  policeStation?: string;
};

/**
 * What confirming creates — one process per recipient, per channel, per address (§3,
 * `PRC-02`). A recipient whose record holds no destination of a channel's kind gets no
 * process on it (`PRC-05`).
 */
export function processesFor(variables: ProcessVariables): ResolvedProcess[] {
  const channels = selectedChannels(variables);
  return selectedRecipients(variables).flatMap((recipient) =>
    channels.flatMap((channel): ResolvedProcess[] => {
      if (channel.destination === "mobile") {
        return recipient.mobile ? [{ recipientId: recipient.id, channel: channel.id }] : [];
      }
      if (channel.destination === "email") {
        return recipient.email ? [{ recipientId: recipient.id, channel: channel.id }] : [];
      }
      return recipient.addresses
        .filter((place) => place.selected)
        .map((place) => ({
          recipientId: recipient.id,
          channel: channel.id,
          addressId: place.id,
          ...(channel.police ? { policeStation: place.policeStation } : {}),
        }));
    }),
  );
}

/** The selected channels this recipient's record cannot take — said beside them. */
export function unreachableChannels(
  variables: ProcessVariables,
  recipient: ProcessRecipient,
): string[] {
  return selectedChannels(variables)
    .filter((channel) =>
      channel.destination === "mobile"
        ? !recipient.mobile
        : channel.destination === "email"
          ? !recipient.email
          : !recipient.addresses.some((place) => place.selected),
    )
    .map((channel) => channel.label);
}

/** Whether any selected channel goes through the police, so stations are asked for. */
export function needsPoliceStation(variables: ProcessVariables): boolean {
  return selectedChannels(variables).some((channel) => channel.police);
}

/**
 * Whether this confirmation can be saved: at least one recipient and one channel
 * (`PRC-03`), at least one process actually resolving from them, and a police station
 * on every police process.
 */
export function processVariablesComplete(variables: ProcessVariables): boolean {
  const processes = processesFor(variables);
  return (
    selectedRecipients(variables).length > 0 &&
    selectedChannels(variables).length > 0 &&
    processes.length > 0 &&
    processes.every((entry) => entry.policeStation !== "")
  );
}

/** Names joined the way a sentence names more than one party: "A" · "A and B" · "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The channels chosen, as the "Pulled into this order" row states them. */
export function channelSummary(variables: ProcessVariables): string {
  const chosen = selectedChannels(variables).map((channel) => channel.label);
  return chosen.length > 0 ? chosen.join(", ") : "No channel selected";
}

/**
 * Who the process is to and who takes steps, for the template's `[Party Type]` and
 * `[Party Name]` tokens (`fillPartyVariables` in `order-templates.ts`).
 *
 * The party taking steps follows `AUT-02`: for the accused, the complainant; for the
 * complainant, the accused; for a witness, their own side. Where the recipients
 * selected resolve to different parties, it is left `undefined` and the token stays in
 * brackets for the drafter (`AUT-03`).
 */
export function processParties(variables: ProcessVariables): {
  type?: string;
  names: string;
  takingSteps?: string;
} {
  const recipients = selectedRecipients(variables);
  const kinds = new Set(recipients.map((entry) => entry.kind));
  const steps = new Set(
    recipients.map((entry) =>
      entry.kind === "accused"
        ? "complainant"
        : entry.kind === "complainant"
          ? "accused"
          : entry.side,
    ),
  );
  const [kind] = [...kinds];
  return {
    type: kinds.size === 1 ? (kind === "witness" && recipients.length > 1 ? "witnesses" : kind) : undefined,
    names: joinNames(recipients.map((entry) => entry.name)),
    takingSteps: steps.size === 1 ? [...steps][0] : undefined,
  };
}

export { formatStructuredAddress };
