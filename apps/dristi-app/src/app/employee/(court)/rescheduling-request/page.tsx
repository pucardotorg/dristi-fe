import type { Metadata } from "next";

import { ReschedulingRequestScreen } from "@/components/employee/rescheduling-request-screen";

export const metadata: Metadata = { title: "Rescheduling request" };

/**
 * Applications asking this court to move a listed hearing date — the screen
 * the rail's "Rescheduling request" row leads to.
 *
 * Lives at `/employee/rescheduling-request` because it is the Review
 * applications group's work, not a hearing. The Hearings rows nest under
 * `/employee/hearings`; this one does not, the way Register cases does not
 * nest under Actions.
 *
 * The screen is a client component throughout: the search, paging, the review
 * dialog and empty states are all interaction. There is no backend behind it
 * — `lib/employee/rescheduling-request.ts` says exactly what the data is and
 * is not.
 */
export default function EmployeeReschedulingRequestPage() {
  return <ReschedulingRequestScreen />;
}
