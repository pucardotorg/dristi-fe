/**
 * Which state's court the app runs as — the deployment switch in Settings.
 *
 * DRISTI is one shared core deployed per state (`docs/product/national-vs-state.md`).
 * Kerala is what every screen was designed against, so its profile changes nothing: the
 * fixtures, documents and fees already speak Kerala. The other three re-voice the same
 * screens with what the stakeholders' documents say differs (owner, 2026-10-08): the
 * court's name and logo, the case numbers, the fees, and — for Punjab only — that the
 * filing step is signing alone, with no oath.
 *
 * The interface does not change between them. Nothing here adds a step, a field or a
 * queue; a Gujarat case already carries its eCC / eCR type rather than asking the clerk
 * to pick one.
 *
 * Sources: "Case Numbering System" sheets for Kerala, Gujarat and Punjab & Haryana, and
 * "Payment Logic" (schedule 1 Kerala, 2 Gujarat, 3 Punjab and Haryana), shared in the
 * owner's chat on 2026-10-08. Logos and court names are placeholders until the states
 * send theirs: the state's name stands in for both.
 */

import type { FeeSchedule } from "./fees";
import { GUJARAT_FEES, KERALA_FEES, PUNJAB_HARYANA_FEES } from "./fees";

export type CourtId = "kerala" | "gujarat" | "punjab" | "haryana";

/** How a state numbers a case, in terms of the Kerala numbers the fixtures carry. */
export type NumberingScheme =
  /** Kerala's own: filing number, CMP at registration, ST at cognizance. */
  | { kind: "kerala" }
  /**
   * Gujarat (CIS): a registration number in one of three case types, then an eCC case
   * number once cognizance is taken. Each stage runs its own sequence.
   */
  | { kind: "gujarat" }
  /** Punjab & Haryana: NACT filing and case numbers; the case number holds after cognizance. */
  | { kind: "nact" };

export type CourtProfile = {
  id: CourtId;
  /** The state, as the placeholder name and in document headings. */
  state: string;
  /** Under the option in Settings: the case number a reader will recognise it by. */
  example: string;
  numbering: NumberingScheme;
  /**
   * The six characters a CNR opens with: state, district, establishment. The sixteen
   * characters after them are the sequence and year, carried over unchanged.
   */
  cnrPrefix: string;
  /** `false` keeps the product's 24×7 ON Courts marks; `true` shows the placeholder. */
  placeholderBrand: boolean;
  /** Whether the filing's signing step carries an oath — Punjab's does not. */
  signWithOath: boolean;
  fees: FeeSchedule;
};

export const COURT_PROFILES: Record<CourtId, CourtProfile> = {
  kerala: {
    id: "kerala",
    state: "Kerala",
    example: "ST/6/2025",
    numbering: { kind: "kerala" },
    cnrPrefix: "KLKM52",
    placeholderBrand: false,
    signWithOath: true,
    fees: KERALA_FEES,
  },
  gujarat: {
    id: "gujarat",
    state: "Gujarat",
    example: "eCC/3/2026",
    numbering: { kind: "gujarat" },
    // GJAH + 2-digit court ID, per the Gujarat sheet's example (GJAH010001252026).
    cnrPrefix: "GJAH01",
    placeholderBrand: true,
    signWithOath: true,
    fees: GUJARAT_FEES,
  },
  punjab: {
    id: "punjab",
    state: "Punjab",
    example: "NACT/566/2026",
    numbering: { kind: "nact" },
    // PLACEHOLDER — the sheet gives only Haryana's Panchkula prefix. "XX" marks the
    // district code no document has supplied yet.
    cnrPrefix: "PBXX03",
    placeholderBrand: true,
    signWithOath: false,
    fees: PUNJAB_HARYANA_FEES,
  },
  haryana: {
    id: "haryana",
    state: "Haryana",
    example: "NACT/566/2026",
    numbering: { kind: "nact" },
    // Panchkula Special NI Act Court, per the Punjab & Haryana sheet.
    cnrPrefix: "HRPK03",
    placeholderBrand: true,
    signWithOath: true,
    fees: PUNJAB_HARYANA_FEES,
  },
};

/** In the order Settings offers them: the designed baseline first. */
export const COURT_IDS: CourtId[] = ["kerala", "gujarat", "punjab", "haryana"];

export const DEFAULT_COURT: CourtId = "kerala";

/** The cookie the choice lives in, so the server renders the right court first time. */
export const COURT_COOKIE = "dristi-court";

export function isCourtId(value: unknown): value is CourtId {
  return typeof value === "string" && Object.hasOwn(COURT_PROFILES, value);
}

export function courtProfile(id: CourtId): CourtProfile {
  return COURT_PROFILES[id];
}
