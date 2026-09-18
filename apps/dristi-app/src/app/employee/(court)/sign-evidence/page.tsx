import type { Metadata } from "next";

import { SignEvidenceScreen } from "@/components/employee/sign-evidence-screen";

export const metadata: Metadata = { title: "Sign evidence" };

/**
 * Documents marked as evidence and waiting on this bench's signature — the screen the
 * rail's "Sign evidence" row leads to.
 *
 * Sits beside `/employee/sign-forms` and `/employee/sign-orders` rather than under a
 * `sign/` segment, for the reason the review queues sit beside each other: the rail's Sign
 * group is several views of one body of work, not a hierarchy.
 *
 * The screen is a client component throughout: the search, the selection, the paging, the
 * marking and the act are all interaction. There is no backend behind it — nothing is
 * signed or endorsed, and `lib/employee/sign-evidence.ts` says exactly what the data is
 * and is not.
 */
export default function EmployeeSignEvidencePage() {
  return <SignEvidenceScreen />;
}
