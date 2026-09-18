import type { Metadata } from "next";

import { CognizanceScreen } from "@/components/employee/cognizance-screen";

export const metadata: Metadata = { title: "Take cognizance" };

/**
 * Complaints on this court's register that have not been taken cognizance of — the
 * screen the rail's "Take cognizance" row leads to.
 *
 * Lives at `/employee/cognizance` because it is the Actions group's work, beside Register
 * cases rather than under it: registering and taking cognizance are two acts on one
 * complaint, hours apart, and neither is a view of the other.
 *
 * The screen is a client component throughout — the search, the delay filter, paging and
 * the empty states are all interaction. There is no backend behind it;
 * `lib/employee/cognizance.ts` says exactly what the data is and is not.
 */
export default function EmployeeCognizancePage() {
  return <CognizanceScreen />;
}
