import type { Metadata } from "next";

import { ApproveCopyApplicationScreen } from "@/components/employee/approve-copy-application-screen";

export const metadata: Metadata = { title: "Approve copy application" };

/**
 * Every application for a certified copy in front of this court — the screen the rail's
 * "Approve copy application" row leads to.
 *
 * Lives under `/employee/approve-copy-application` rather than nesting inside its Actions
 * group, for the reason Register cases sits beside it: the group is how the rail sorts the
 * bench's work, not a hierarchy the URLs owe anything to.
 *
 * The screen is a client component throughout: the search, paging, selection and the two
 * decisions are all interaction. There is no backend behind it —
 * `lib/employee/approve-copy-application.ts` says exactly what the data is and is not,
 * and that Accept and Reject perform no judicial act.
 */
export default function EmployeeApproveCopyApplicationPage() {
  return <ApproveCopyApplicationScreen />;
}
