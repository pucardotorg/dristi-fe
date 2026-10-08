/**
 * The signed-in account, as Settings shows and changes it. Demo data.
 *
 * What someone changes here holds while they move between Settings pages and the rest
 * of the product, and a refresh brings every account back to its seed (owner rule,
 * Sept 24: demo actions reset on refresh, so a demo never runs out of states). It is a
 * module store for that reason, not localStorage. Preferences (theme, text size,
 * language) are the person's own and live in `preferences.ts` and the locale provider.
 *
 * Every change mirrors a process the product already has (spec:
 * `docs/design/features/settings.md`): a new mobile is verified by a code sent to it,
 * a password follows REG-40 to 44, an advocate request and a Bar number correction go
 * to the scrutiny officer, and a request that was not approved is resubmitted.
 */

import { useSyncExternalStore } from "react";

import type { StructuredAddress } from "@/components/cases/structured-address";
import type { SubmittedId } from "@/components/home/add-id-dialog";

export type AdvocateStatus = "none" | "pending" | "approved" | "not-approved";

export type AdvocateRecord = {
  status: AdvocateStatus;
  barNumber: string;
  barCouncil: string;
  /** The Bar Council ID card on file: a name only for seeded accounts, a real file once
   *  the person uploads one in this visit. */
  barIdName: string;
  barIdFile: File | null;
  applicationId: string;
  submittedOn: string;
  /** The one message the scrutiny officer typed when the request was not approved. */
  officerMessage: string;
  chamberAddress: StructuredAddress | null;
  /** A Bar number correction waiting on the scrutiny officer. The number above stays
   *  in use until it is approved. */
  correction: { barNumber: string; barIdName: string; submittedOn: string } | null;
};

export type Device = {
  id: string;
  kind: "laptop" | "phone" | "tablet";
  /** "Chrome on Mac" */
  name: string;
  place: string;
  /** "Active now", "2 hours ago" */
  lastActive: string;
  current: boolean;
};

export type ProblemReport = {
  reference: string;
  topic: string;
  sentOn: string;
};

export type AccountState = {
  /** The account's store key (the name sign-in stashed). Stays put if the name changes. */
  key: string;
  name: string;
  mobile: string;
  email: string;
  accountId: string;
  registeredOn: string;
  officialId: SubmittedId | null;
  address: StructuredAddress | null;
  password: { set: boolean; changedOn: string };
  advocate: AdvocateRecord;
  devices: Device[];
  reports: ProblemReport[];
};

const KOLLAM_ADDRESS: StructuredAddress = {
  door: "TC 14/882",
  building: "Lakshmi Nivas",
  locality: "Kadappakada, Near Asramam Maidan",
  city: "Kollam",
  district: "Kollam",
  state: "Kerala",
  pin: "691008",
};

const CHAMBER_ADDRESS: StructuredAddress = {
  door: "Room 12",
  building: "Advocates' Chamber Complex",
  locality: "District Court Compound, Chinnakada",
  city: "Kollam",
  district: "Kollam",
  state: "Kerala",
  pin: "691001",
};

const OTHER_DEVICES: Device[] = [
  {
    id: "d-phone",
    kind: "phone",
    name: "Chrome on Android phone",
    place: "Kollam, Kerala",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "d-tablet",
    kind: "tablet",
    name: "Safari on iPad",
    place: "Thiruvananthapuram, Kerala",
    lastActive: "Yesterday",
    current: false,
  },
];

const NO_ADVOCATE: AdvocateRecord = {
  status: "none",
  barNumber: "",
  barCouncil: "Bar Council of Kerala",
  barIdName: "",
  barIdFile: null,
  applicationId: "",
  submittedOn: "",
  officerMessage: "",
  chamberAddress: null,
  correction: null,
};

/** The officer's message on a request that was not approved (demo). */
export const DEMO_OFFICER_MESSAGE =
  "The Bar Council ID uploaded is not readable; the registration number and photograph cannot be made out from the scan. Upload a clear and complete scan with the registration number visible, and resubmit.";

/**
 * Seeds, keyed by the account name the sign-in stashes (`ACCOUNT_NAME_KEY`). The two
 * demo numbers in `lib/sign-in/demo-accounts.ts`: an advocate who also holds a
 * litigant profile, and a base litigant who can ask for an advocate profile.
 */
function seed(name: string): AccountState {
  if (name === "Rajan K. Nair") {
    return {
      key: name,
      name,
      mobile: "7007663437",
      email: "",
      accountId: "DR-LIT-2026-004417",
      registeredOn: "12 August 2026",
      officialId: null,
      address: KOLLAM_ADDRESS,
      password: { set: false, changedOn: "" },
      advocate: NO_ADVOCATE,
      devices: [
        { ...currentDevice(), id: "d-this" },
        OTHER_DEVICES[0],
      ],
      reports: [],
    };
  }
  return {
    key: name,
    name,
    mobile: "8009460966",
    email: "anjali.nair@example.in",
    accountId: "DR-ADV-2025-001286",
    registeredOn: "3 March 2025",
    officialId: null,
    address: KOLLAM_ADDRESS,
    password: { set: true, changedOn: "14 June 2026" },
    advocate: {
      ...NO_ADVOCATE,
      status: "approved",
      barNumber: "K/1462/2011",
      barIdName: "bar-council-id.pdf",
      applicationId: "KL-ADV-104728-2025",
      submittedOn: "3 March 2025",
      chamberAddress: CHAMBER_ADDRESS,
    },
    devices: [{ ...currentDevice(), id: "d-this" }, ...OTHER_DEVICES],
    reports: [],
  };
}

/** This browser, named the way the device list names the others. */
function currentDevice(): Device {
  let name = "This browser";
  let kind: Device["kind"] = "laptop";
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua)
      ? "Edge"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
    const system = /iPad/.test(ua)
      ? "iPad"
      : /iPhone/.test(ua)
        ? "iPhone"
        : /Android/.test(ua)
          ? "Android phone"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Windows/.test(ua)
              ? "Windows"
              : "computer";
    name = `${browser} on ${system}`;
    kind = /iPad/.test(ua) ? "tablet" : /iPhone|Android/.test(ua) ? "phone" : "laptop";
  }
  return {
    id: "d-this",
    kind,
    name,
    place: "Kollam, Kerala",
    lastActive: "Active now",
    current: true,
  };
}

const accounts = new Map<string, AccountState>();
const listeners = new Set<() => void>();

function stateOf(name: string): AccountState {
  let state = accounts.get(name);
  if (!state) {
    state = seed(name);
    accounts.set(name, state);
  }
  return state;
}

/* The server and the hydration render see the seed with no browser detail in it, so
   both agree; the device name fills in right after. */
const serverSnapshots = new Map<string, AccountState>();
function serverSnapshot(name: string): AccountState {
  let state = serverSnapshots.get(name);
  if (!state) {
    state = { ...seed(name), devices: [] };
    serverSnapshots.set(name, state);
  }
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount(name: string): AccountState {
  return useSyncExternalStore(
    subscribe,
    () => stateOf(name),
    () => serverSnapshot(name),
  );
}

export function updateAccount(
  name: string,
  change: (state: AccountState) => AccountState,
) {
  accounts.set(name, change(stateOf(name)));
  listeners.forEach((listener) => listener());
}

export function updateAdvocate(
  name: string,
  change: (advocate: AdvocateRecord) => AdvocateRecord,
) {
  updateAccount(name, (state) => ({ ...state, advocate: change(state.advocate) }));
}

/**
 * The demo's `?advocate=` states, for reviewing the request lifecycle without waiting
 * on an officer: `pending` and `not-approved`. Applied once per visit.
 */
export function applyAdvocateDemo(name: string, status: AdvocateStatus) {
  if (status !== "pending" && status !== "not-approved") return;
  updateAdvocate(name, (advocate) => ({
    ...advocate,
    status,
    barNumber: advocate.barNumber || "K/2218/2024",
    barIdName: advocate.barIdName || "bar-council-id.jpg",
    applicationId: advocate.applicationId || "KL-ADV-551902-2026",
    submittedOn: advocate.submittedOn || "26 September 2026",
    officerMessage: status === "not-approved" ? DEMO_OFFICER_MESSAGE : "",
  }));
}

/** Today, as the product writes dates in prose. */
export function today(): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/** A reference for a problem report, e.g. "DR-SUP-48213". */
export function newReference(): string {
  return `DR-SUP-${Math.floor(10000 + Math.random() * 90000)}`;
}
