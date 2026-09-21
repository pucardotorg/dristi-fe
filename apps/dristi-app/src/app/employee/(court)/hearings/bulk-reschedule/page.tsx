import type { Metadata } from "next";

import { BulkRescheduleScreen } from "@/components/employee/bulk-reschedule-screen";

export const metadata: Metadata = { title: "Bulk reschedule hearings" };

/**
 * Moving a span of this court's board onto a new date in one act — the third row in the
 * rail's Hearings group, and the sibling of today's cause list and scheduling.
 *
 * A client component throughout: the range it opens on is read from the reader's clock,
 * and the selection, the date and the confirmation are all interaction. There is no
 * backend behind it, and it commits nothing — `lib/employee/bulk-reschedule.ts` says
 * exactly what the data is and is not.
 */
export default function EmployeeBulkReschedulePage() {
  return <BulkRescheduleScreen />;
}
