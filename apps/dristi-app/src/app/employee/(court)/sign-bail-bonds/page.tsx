import type { Metadata } from "next";

import { SignBailBondsScreen } from "@/components/employee/sign-bail-bonds-screen";

export const metadata: Metadata = { title: "Sign bail bonds" };

/**
 * Bail bonds executed in this court and not yet signed by the bench — the screen the
 * rail's "Sign bail bonds" row leads to.
 *
 * Lives at `/employee/sign-bail-bonds` because it is the Sign group's work, not a
 * hearing, the same way `/employee/sign-forms` and `/employee/sign-orders` do.
 *
 * The screen is a client component throughout: selection, the search, paging, the two
 * signing paths, refusing a bond and the empty states are all interaction. There is no
 * backend behind it, and nothing on it signs or publishes anything —
 * `lib/employee/sign-bail-bonds.ts` says exactly what the data is and is not, including
 * that the bond text is demo wording rather than a court-approved form.
 */
export default function EmployeeSignBailBondsPage() {
  return <SignBailBondsScreen />;
}
