/**
 * The addressee and delivery-channel confirmation a process order asks for.
 *
 * `PRC-03` (`handovers/process-handover.md`): the judge selects the delivery channels,
 * per addressee, on the order screen — at least one channel, several may be selected.
 * `ITM-11` (`handovers/order-generation.md`): that is input the order item needs beyond
 * its template variables, asked for as part of adding the item. Until this, selecting
 * "Issue of summons" or "Issue of notice" from the catalogue just placed the template's
 * words in the box with `[Party Type]`/`[Party Name]` standing in brackets — nobody had
 * confirmed who the process actually goes to.
 *
 * Only three channels are offered here — RPAD, SMS, police — the ones the owner named
 * (2026-09-26), pre-selecting RPAD and SMS and leaving police for the drafter to add.
 * The source's full six-channel list (`process-handover.md` §6.1: SMS, WhatsApp,
 * physical post, e-post, police via post, police via digital system) is not built out
 * here; RPAD stands in for the physical-post channel's registered-with-acknowledgement
 * service, which is the one a court actually asks for by that name.
 */

import {
  formatStructuredAddress,
  type StructuredAddress,
} from "@/components/cases/structured-address";

export type ProcessChannel = "rpad" | "sms" | "police";

export const PROCESS_CHANNELS: {
  id: ProcessChannel;
  label: string;
  defaultOn: boolean;
}[] = [
  { id: "rpad", label: "RPAD", defaultOn: true },
  { id: "sms", label: "SMS", defaultOn: true },
  { id: "police", label: "Police", defaultOn: false },
];

/** One person the process is addressed to, and whether this confirmation carries them. */
export type ProcessAddressee = {
  id: string;
  name: string;
  address: StructuredAddress;
  selected: boolean;
};

/** What the drafter confirmed before the summons/notice sentence was written in. */
export type ProcessVariables = {
  addressees: ProcessAddressee[];
  channels: Readonly<Record<ProcessChannel, boolean>>;
};

/**
 * A stable synthetic address per name, for the accused this employee-side fixture pack
 * does not carry one for yet.
 *
 * The same pattern `components/cases/edit-litigant-dialog.tsx`'s `demoAddress` uses for
 * the advocate-side register, and a separate copy rather than an import of it: the
 * employee side stays self-contained (`order-draft.ts`), so its stand-in fixtures are
 * its own. The real seam is the party record, and this goes when it lands.
 */
export function demoAccusedAddress(name: string): StructuredAddress {
  let hash = 5;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  const surname = name.trim().split(/\s+/).at(-1) ?? "Kollam";
  return {
    door: String((hash % 48) + 1),
    building: `${surname} House`,
    locality: "Chinnakada",
    city: "Kollam",
    district: "Kollam",
    state: "Kerala",
    pin: "691001",
  };
}

/**
 * What the confirmation opens on: the accused, address filled in, every channel at its
 * default — RPAD and SMS on, police off (owner, 2026-09-26).
 *
 * One addressee, because that is everything today's case model carries
 * (`CourtHearing.parties` / `CognizanceCase.parties`, both a single accused name). The
 * confirmation itself is written to show a list — see `ProcessVariables["addressees"]`
 * — for the day a matter's accused is more than one name; there is no second row to
 * pre-select until that data exists.
 */
export function defaultProcessVariables(accusedName: string): ProcessVariables {
  return {
    addressees: [
      {
        id: "accused",
        name: accusedName,
        address: demoAccusedAddress(accusedName),
        selected: true,
      },
    ],
    channels: PROCESS_CHANNELS.reduce(
      (channels, channel) => ({ ...channels, [channel.id]: channel.defaultOn }),
      {} as Record<ProcessChannel, boolean>,
    ),
  };
}

/** The addressees this confirmation actually carries — the ticked rows, not every row. */
export function selectedAddressees(variables: ProcessVariables): ProcessAddressee[] {
  return variables.addressees.filter((addressee) => addressee.selected);
}

/** Names joined the way a sentence names more than one party: "A" · "A and B" · "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Whether this confirmation can be saved: at least one addressee and one channel (`PRC-03`). */
export function processVariablesComplete(variables: ProcessVariables): boolean {
  return (
    selectedAddressees(variables).length > 0 &&
    PROCESS_CHANNELS.some((channel) => variables.channels[channel.id])
  );
}

/** The channels chosen, as the "Pulled into this order" row states them. */
export function channelSummary(variables: ProcessVariables): string {
  const chosen = PROCESS_CHANNELS.filter(
    (channel) => variables.channels[channel.id],
  ).map((channel) => channel.label);
  return chosen.length > 0 ? chosen.join(", ") : "No channel selected";
}

export { formatStructuredAddress };
