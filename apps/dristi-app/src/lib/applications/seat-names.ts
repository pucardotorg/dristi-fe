/**
 * The name a sandbox seat acts under on a case. The case fixtures name the parties
 * and their counsel; the signed-in advocate is the demo identity in `viewer.ts`. A
 * clerk has no name of their own in the fixtures, so they act as their advocate's
 * clerk.
 */
import { counselFor, type CaseRecord } from "@/lib/cases/types";
import { viewerSides } from "@/lib/cases/viewer";

import type { FilerSeat } from "./lifecycle";

const VIEWER = "Adv. Anjali Nair";

export function advocateFor(record: CaseRecord, side: FilerSeat["side"]): string {
  /* The signed-in advocate only where they are on the vakalatnama; a case reached
     through office access was filed by its counsel of record. */
  if (viewerSides(record).includes(side)) return VIEWER;
  return counselFor(record, side)[0] ?? `Counsel for the ${side}`;
}

export function seatPersonName(record: CaseRecord, seat: FilerSeat): string {
  switch (seat.role) {
    case "advocate":
      return advocateFor(record, seat.side);
    case "clerk":
      return `Clerk to ${advocateFor(record, seat.side)}`;
    case "litigant":
      return record.parties[seat.side];
    case "poa":
      return `PoA holder for ${record.parties[seat.side]}`;
  }
}
