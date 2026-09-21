import { JoinPage } from "@/app/join/[[...token]]/join-flow";

/**
 * `/citizen` — everyone outside the court: advocates, clerks, litigants, parties in
 * person, PoA-holders.
 *
 * This is the sign-in that used to sit at `/`. It moved here when the landing page took
 * the front door (2026-09-14), which is what this file's own comment always said would
 * happen: the URL existed so the role split had both halves, and nothing that links to
 * `/citizen` had to change when the screens arrived.
 *
 * It renders the same block `/join/<token>` does, with no token — so there is no summons
 * modal on load, which is right for someone who arrived through the front door rather
 * than off a paper summons.
 */
export default function CitizenPage() {
  return <JoinPage />;
}
