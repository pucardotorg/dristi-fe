import { type CaseRecord } from "./types";

/**
 * Notice/Process Status (PRD §7): every process the court has issued on the
 * case, grouped by the person it was issued to, then by round, then by the
 * channels each round went out on.
 *
 * The channel types and their status words are not specified yet (SVC-15,
 * open question Q-3). What is here is a working guess taken from the legacy
 * product, kept in one place so it is one edit to correct.
 */
export type ProcessType =
  | "Notice"
  | "Summons"
  | "Warrant"
  | "Proclamation"
  | "Attachment";

export type ChannelType = "Registered post" | "Police" | "SMS" | "Email";

export type ChannelStatus =
  | "pending-dispatch"
  | "sent"
  | "delivered"
  | "not-delivered";

const CHANNEL_STATUS: Record<
  ChannelStatus,
  { label: string; variant: "secondary" | "info" | "success" | "warning" }
> = {
  "pending-dispatch": { label: "Pending dispatch", variant: "secondary" },
  sent: { label: "Sent", variant: "info" },
  delivered: { label: "Delivered", variant: "success" },
  "not-delivered": { label: "Not delivered", variant: "warning" },
};

export function channelStatusView(status: ChannelStatus) {
  return CHANNEL_STATUS[status];
}

export type ProcessChannel = {
  type: ChannelType;
  /** Postal address, mobile number or email, by channel type (SVC-11). */
  destination: string;
  status: ChannelStatus;
  /** When the status was last updated (SVC-13). */
  statusOn: string;
  /** Delivery confirmation, a note, or the reason for non-delivery (SVC-14). */
  remarks?: string;
};

/** All the processes triggered by one order, or issued together (SVC-04). */
export type ProcessRound = {
  id: string;
  processes: ProcessType[];
  hearing?: { purpose: string; on: string };
  order?: { id?: string; title: string; on: string };
  /** Absent while the process fee is still unpaid (SVC-09). */
  feePaidOn?: string;
  channels: ProcessChannel[];
};

export type ProcessPerson = {
  id: string;
  name: string;
  /** Role on the case: "Accused 2", "PW-1", "Complainant" (SVC-03). */
  role: string;
  /** Newest round first (SVC-06). */
  rounds: ProcessRound[];
};

const PACK: Partial<Record<string, ProcessPerson[]>> = {
  "c-1001": [
    {
      id: "anand-traders",
      name: "Anand Traders",
      role: "Accused",
      rounds: [
        {
          id: "r3",
          processes: ["Proclamation", "Attachment"],
          hearing: { purpose: "Appearance of accused", on: "29 July 2026" },
          order: { title: "Proclamation and attachment", on: "2 July 2026" },
          feePaidOn: "1 July 2026",
          channels: [
            {
              type: "Police",
              destination: "Punalur police station",
              status: "sent",
              statusOn: "3 July 2026",
              remarks:
                "Affixture at the address is recorded. The public reading is awaited.",
            },
          ],
        },
        {
          id: "r2",
          processes: ["Warrant"],
          hearing: { purpose: "Appearance of accused", on: "14 June 2026" },
          order: { title: "Bailable warrant", on: "10 May 2026" },
          feePaidOn: "8 May 2026",
          channels: [
            {
              type: "Police",
              destination: "Punalur police station",
              status: "not-delivered",
              statusOn: "14 June 2026",
              remarks:
                "Returned unexecuted. The accused was not found at the address on record.",
            },
          ],
        },
        {
          id: "r1",
          processes: ["Summons"],
          hearing: { purpose: "Appearance of accused", on: "6 April 2026" },
          order: { title: "Order issuing summons", on: "2 March 2026" },
          feePaidOn: "1 March 2026",
          channels: [
            {
              type: "Registered post",
              destination: "14 Market Road, Punalur, Kollam 691305",
              status: "not-delivered",
              statusOn: "20 March 2026",
              remarks: "Returned to sender. Addressee left.",
            },
            {
              type: "SMS",
              destination: "+91 98470 •• 214",
              status: "delivered",
              statusOn: "3 March 2026",
            },
            {
              type: "Email",
              destination: "accounts@anandtraders.example",
              status: "delivered",
              statusOn: "3 March 2026",
            },
          ],
        },
      ],
    },
    {
      id: "priya-nair",
      name: "Priya Nair",
      role: "PW-2",
      rounds: [
        {
          id: "r1",
          processes: ["Summons"],
          hearing: { purpose: "Evidence of PW-2", on: "19 August 2026" },
          order: {
            title: "Summon bank official and produce account records",
            on: "24 July 2026",
          },
          channels: [
            {
              type: "Registered post",
              destination: "Kerala Mercantile Bank, Kollam Market Branch",
              status: "pending-dispatch",
              statusOn: "24 July 2026",
              remarks: "Waiting for the process fee.",
            },
            {
              type: "Email",
              destination: "kollam.market@kmbank.example",
              status: "pending-dispatch",
              statusOn: "24 July 2026",
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Everyone with process history, accused first, then witnesses, then the
 * complainant (SVC-01, SVC-02). Empty when no process has ever issued; a
 * disposed case keeps its history.
 */
export function processStatus(record: CaseRecord): ProcessPerson[] {
  return (PACK[record.id] ?? []).filter((person) => person.rounds.length > 0);
}
