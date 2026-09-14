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
 **The username decides the seat, and nothing on the screen can override it** — the
 * same contract the real back end has. A role picker was tried first and cut the same
 * day (owner, 2026-09-14): staff sign in for each other constantly, a bench clerk into
 * the magistrate's account to get a thing done, and asking every one of those sign-ins
 * to declare a role first taxes them for a fact the directory already holds.
 *
 * **Any password is accepted.** The same bargain the citizen sign-in makes: there is
 * nothing to check a password against, and a screen that rejected one would be inventing
 * a rule. The field is real, required and masked; what it is not is checked.
 */

import { CURRENT_STAFF, type CourtRole } from "./content";

/**
 * The four seats a username can land in, in the order the bench is read: the magistrate
 * first, then the establishment around them.
 *
 * This is every role in `CourtRole`. `COURT_SEATS` — what the rail's settings control
 * offers — follows it for the same reason: a seat you can sign in to is a seat the rail
 * has to be able to name. The sign-in screen shows this list nowhere; it uses it only to
 * lay out the prototype's demo accounts.
 */
export const COURT_SIGN_IN_ROLES: CourtRole[] = [
  "magistrate",
  "bench-clerk",
  "scrutiny-officer",
  "typist",
];

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
