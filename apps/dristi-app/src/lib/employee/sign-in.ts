/**
 * Court-staff sign-in — the roles on offer, the demo directory behind them, and the
 * posting a staff member signs in to.
 *
 * **This is scaffolding for a directory, not an authenticator.** The real screen (the
 * owner's reference, 2026-09-14) asks for a username and a password because every court
 * user is registered in the establishment's own back end — there is no self-registration
 * on the court side and no OTP. Until that endpoint exists, this module stands in for it
 * and does the one thing the screen cannot be judged without: it makes each role a
 * sign-in that a person can actually perform in a demo. Delete it with the endpoint.
 *
 * Two deliberate departures from the reference screen, both owner decisions on
 * 2026-09-14:
 *
 * 1. **The role is chosen, not looked up.** On the real screen the back end knows which
 *    role a username holds and the screen never asks. Here the role is the first step,
 *    because what each seat's product *is* — the feature subset behind it — is the thing
 *    being designed, and a demo has to be able to enter any of the four on purpose. The
 *    directory below still holds the true role for each username, so picking one role and
 *    typing another role's username is a contradiction the screen names rather than
 *    silently resolving.
 * 2. **Any password is accepted.** Same bargain the citizen sign-in makes: there is
 *    nothing to check a password against, and a screen that rejected one would be
 *    inventing a rule. The field is real, required and masked; what it is not is checked.
 */

import { CURRENT_STAFF, type CourtRole } from "./content";

/**
 * The four seats a person can sign in to, in the order the reference screen's own users
 * would scan for themselves: the bench first, then the establishment around it.
 *
 * This is every role in `CourtRole`. `COURT_SEATS` — what the rail's settings control
 * offers — follows it for the same reason: a seat you can sign in to is a seat the rail
 * has to be able to name.
 */
export const COURT_SIGN_IN_ROLES: CourtRole[] = [
  "magistrate",
  "bench-clerk",
  "scrutiny-officer",
  "typist",
];

/**
 * What the seat does, in one line, so a person picking from four rows is choosing on
 * what the work is rather than on a job title they may not use for themselves.
 *
 * Every line is the domain model's own description of that actor
 * (`docs/product/domain/actors.md`), shortened and nothing added. The typist's is the
 * model's *Stenographer / Interpreter* entry — the owner named the role "typist" on
 * 2026-09-07 and an owner naming a role is the one sanctioned source for one; whether it
 * is the same actor under a court's vocabulary is still an open question for `actors.md`.
 */
export const COURT_ROLE_BLURB: Record<CourtRole, string> = {
  magistrate: "Takes cognizance, records evidence and delivers judgment.",
  "bench-clerk": "Keeps the court's daily record, exhibits and order sheet.",
  "scrutiny-officer": "Checks a filed complaint for defects before cognizance.",
  typist: "Records dictation and types the court's orders.",
};

/** One registered account, as the establishment's directory would return it. */
export type CourtAccount = {
  username: string;
  /** The staff member's name, as the rail's foot reports it. No honorific, no rank. */
  name: string;
  role: CourtRole;
};

/**
 * The demo directory — one account per seat.
 *
 * The usernames follow the reference screen's own convention (`michaelGeorgeJudge`,
 * `gCmo`): a given name run into the role, no separator. `michaelGeorgeJudge` is kept
 * verbatim from the reference so the account the owner already demos with still works.
 *
 * The names are demo given names like the court beside them, not a claim about who sits
 * on this bench. `Uddipan` is the bench clerk `CURRENT_STAFF` has always run as and
 * `Biju B` is the officer the scrutiny queue already names (`scrutiny/fixtures.ts`), so
 * signing in as either lands on the identity those screens were built around.
 */
export const COURT_ACCOUNTS: Record<CourtRole, CourtAccount> = {
  magistrate: {
    username: "michaelGeorgeJudge",
    name: "Michael George",
    role: "magistrate",
  },
  "bench-clerk": {
    username: "uddipanBenchClerk",
    name: CURRENT_STAFF.name,
    role: "bench-clerk",
  },
  "scrutiny-officer": {
    username: "bijuScrutinyOfficer",
    name: "Biju B",
    role: "scrutiny-officer",
  },
  typist: {
    username: "sreelathaTypist",
    name: "Sreelatha R",
    role: "typist",
  },
};

/**
 * The account a username names, or `undefined` if the directory does not hold it.
 *
 * Case-insensitive: a username is an identifier the court issued, not a password, and a
 * staff member typing `MichaelGeorgeJudge` has not made a mistake worth a dead end.
 */
export function accountFor(username: string): CourtAccount | undefined {
  const typed = username.trim().toLowerCase();
  if (!typed) return undefined;
  return Object.values(COURT_ACCOUNTS).find(
    (account) => account.username.toLowerCase() === typed,
  );
}

/**
 * Kerala's districts, as the reference screen's first select offers them.
 *
 * Fact, not demo data — the State has these fourteen revenue districts and a district
 * court in each. Which of them this build actually holds cases for is a different
 * question, answered by the fixtures: they are all Kollam.
 */
export const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

/** The district this deployment's fixtures sit in — where both selects start. */
export const DEFAULT_DISTRICT = "Kollam";

/**
 * The court rooms in a district.
 *
 * **Demo data**, and the one place on this screen that is. Every Kerala district has
 * Judicial Magistrate of the First Class courts, so the shape is real; how many, and
 * what each is called, comes from the establishment's directory and is not invented
 * here beyond the two rows a select needs to be a live control rather than a label.
 *
 * `JMFC Court 1, Kollam` is `CURRENT_STAFF.court` — the court every fixture in this
 * build belongs to, and so the row a demo should stay on.
 */
export function courtRoomsIn(district: string): string[] {
  return [`JMFC Court 1, ${district}`, `JMFC Court 2, ${district}`];
}

/** Where the court-room select starts: this deployment's own bench. */
export const DEFAULT_COURT = CURRENT_STAFF.court;
