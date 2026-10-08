/**
 * Kerala's words and numbers, re-voiced for another state's court.
 *
 * Every fixture, document and seed in this app is written in Kerala's terms — that is
 * the state it was designed against, and the owner keeps it as the baseline. Rather than
 * fork a thousand-odd fixtures per state, the screens show them through this function:
 * the same case, numbered and headed the way the selected state's court would.
 *
 * It is a display transform, never a data one. Lookups, filters and the sandbox store
 * keep the Kerala value; only what a reader sees passes through here. For Kerala it is
 * the identity, so the designed screens are exactly as they were.
 *
 * What changes, and from which source (owner's documents, 2026-10-08):
 *
 * - **Court and product names.** "24×7 ON Court(s)" becomes the state's placeholder,
 *   "Gujarat Court(s)", until the states send their own; a bench gains its state
 *   ("JMFC Court 1, Gujarat") where Kerala's demo left the district out.
 * - **Filing number.** Kerala's `KL-000049-2025` — Gujarat's e-filing number keeps the
 *   platform's shape with its own tenant; Punjab & Haryana's is `NACT/49/2025`.
 * - **Registration (CMP).** Gujarat allots `eCC`, `eCR EN` or `eCR MA` by the case's
 *   classification at scrutiny; Punjab & Haryana allot the `NACT` case number.
 * - **Cognizance (ST).** Gujarat's case number is always `eCC`; Punjab & Haryana's case
 *   number was allotted at registration and carries on.
 * - **CNR.** The state, district and establishment prefix changes; the sequence and
 *   year do not.
 * - **Signing.** Punjab's filing step is "Sign", where the others' is "Sign and oath".
 */

import { courtProfile, type CourtId, type CourtProfile } from "./profiles";

/**
 * Gujarat classifies a case at scrutiny into one of three types. The fixtures carry no
 * such field, so the type is read off the registration sequence — stable for a given
 * case, and mostly eCC, as a cheque-dishonour docket would be.
 */
function gujaratRegistrationType(sequence: number): string {
  const slot = sequence % 5;
  if (slot === 3) return "eCR EN";
  if (slot === 4) return "eCR MA";
  return "eCC";
}

type Rule = [RegExp, (profile: CourtProfile, ...groups: string[]) => string];

const NAME_RULES: Rule[] = [
  // The scrutiny packet's heading and its prose twin name the seat as well; another
  // state's court is not in Ahmedabad by default.
  [/24[×x]7 ON COURT AT AHMEDABAD/g, (p) => `${p.state.toUpperCase()} COURT`],
  [/24[×x]7 ON Court, Ahmedabad/g, (p) => `${p.state} Court`],
  [/24[×x]7 ON Courts/g, (p) => `${p.state} Courts`],
  [/24[×x]7 ON Court/g, (p) => `${p.state} Court`],
  [/24[×x]7 ON COURTS/g, (p) => `${p.state.toUpperCase()} COURTS`],
  [/24[×x]7 ON COURT/g, (p) => `${p.state.toUpperCase()} COURT`],
  [/\bON Courts\b/g, (p) => `${p.state} Courts`],
  [/\bON Court\b/g, (p) => `${p.state} Court`],
  // Punjab's filing is signed, not sworn: its step is "Sign" (owner, 2026-10-08).
  [/\bSign and oath\b/g, (p) => (p.signWithOath ? "Sign and oath" : "Sign")],
  // The complaint's own label for its registration number, before one is allotted.
  [
    /Criminal Complaint \(CMP\) No\./g,
    (p) => `Criminal Complaint (${p.numbering.kind === "nact" ? "NACT" : "eCC"}) No.`,
  ],
  // A bench names its state; one that already names a place is left alone.
  [/\bJMFC Court (\d+)\b(?!,)/g, (p, n) => `JMFC Court ${n}, ${p.state}`],
  [/\bJMFC COURT (\d+)\b(?!,)/g, (p, n) => `JMFC COURT ${n}, ${p.state.toUpperCase()}`],
];

const NUMBER_RULES: Rule[] = [
  [
    /\bKL-(\d{6})-(\d{4})\b/g,
    (p, seq, year) =>
      p.numbering.kind === "nact"
        ? `NACT/${Number(seq)}/${year}`
        : `${p.cnrPrefix.slice(0, 2)}-${seq}-${year}`,
  ],
  [
    /\bCMP[ /](\d+)\/(\d{4})\b/g,
    (p, seq, year) =>
      p.numbering.kind === "nact"
        ? `NACT/${seq}/${year}`
        : `${gujaratRegistrationType(Number(seq))}/${seq}/${year}`,
  ],
  [
    /\bST[ /](\d+)\/(\d{4})\b/g,
    (p, seq, year) =>
      p.numbering.kind === "nact" ? `NACT/${seq}/${year}` : `eCC/${seq}/${year}`,
  ],
  [/\bKLKM52(\d{10})\b/g, (p, rest) => `${p.cnrPrefix}${rest}`],
];

function apply(text: string, rules: Rule[], profile: CourtProfile): string {
  let out = text;
  for (const [pattern, to] of rules) {
    out = out.replace(pattern, (_match, ...groups: unknown[]) =>
      to(profile, ...(groups.filter((g) => typeof g === "string") as string[]))
    );
  }
  return out;
}

/** A case number, CNR or filing number, as the selected state allots it. */
export function localizeCaseNumber(value: string, court: CourtId): string {
  const profile = courtProfile(court);
  if (profile.numbering.kind === "kerala") return value;
  return apply(value, NUMBER_RULES, profile);
}

/**
 * Any text a reader sees — a heading, a table cell, a document's HTML. Names first,
 * then numbers, so a court name never contains a number rule's match.
 */
export function localizeCourtText(text: string, court: CourtId): string {
  const profile = courtProfile(court);
  if (profile.numbering.kind === "kerala") return text;
  return apply(apply(text, NAME_RULES, profile), NUMBER_RULES, profile);
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * A whole record re-voiced: every string in it, through plain objects and arrays. Built
 * for court documents, whose heading, numbers and body all have to agree — re-voicing
 * the heading and missing the body would put two states on one page.
 *
 * Anything that is not a plain object or array — a `Date`, a `File`, a React element —
 * passes through as it is. For Kerala the value comes back untouched, identity and all.
 */
export function localizeDeep<T>(value: T, court: CourtId): T {
  if (courtProfile(court).numbering.kind === "kerala") return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return localizeCourtText(v, court);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && isPlainObject(v) && !("$$typeof" in v)) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value) as T;
}

/**
 * A search query, ready to match the stored Kerala records — lower-cased and trimmed,
 * with any state's number spelled back into something the record contains.
 *
 * Screens show `NACT/241/2026` or `eCR EN/58/2025` while the row underneath still says
 * `ST 241/2026`, so a clerk typing what they read would find nothing. Every table's
 * search reads its query through here instead: the state's prefix is dropped, leaving
 * the `241/2026` that every stage's number shares, and another state's CNR or filing
 * prefix goes back to Kerala's. It needs no court — no Kerala query is touched, so it
 * is safe whichever state is selected.
 */
export function caseSearchKey(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\b(?:e\s*cr\s*(?:en|ma)|e\s*cc|nact)\s*\//g, "")
    .replace(/\b(?:gj|pb|hr)-(?=\d)/g, "kl-")
    .replace(/\b(?:gjah01|hrpk03|pbxx03)/g, "klkm52");
}
