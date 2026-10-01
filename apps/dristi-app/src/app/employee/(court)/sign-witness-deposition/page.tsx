import type { Metadata } from "next";

import { SignWitnessDepositionScreen } from "@/components/employee/sign-witness-deposition-screen";

export const metadata: Metadata = { title: "Sign witness deposition" };

/**
 * The evidence this court has recorded and not yet signed — the screen the rail's
 * "Sign witness deposition" row leads to.
 *
 * Lives at `/employee/sign-witness-deposition` because it is the Sign group's work, not
 * a hearing. The Hearings rows nest under `/employee/hearings`; this one does not, the
 * same way the other signing queues and the review queues do not.
 *
 * The screen is a client component throughout: selection, the search, paging, the two
 * signing paths and the empty states are all interaction. There is no backend behind it,
 * and nothing on it signs or publishes anything —
 * `lib/employee/sign-witness-deposition.ts` says exactly what the data is and is not.
 */
export default function EmployeeSignWitnessDepositionPage() {
  return <SignWitnessDepositionScreen />;
}
