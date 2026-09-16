import type { Metadata } from "next";

import { OtherApplicationsScreen } from "@/components/employee/other-applications-screen";

export const metadata: Metadata = { title: "Others" };

/**
 * Every application in front of this court — the screen the rail's "Others" row leads to.
 *
 * Lives at `/employee/other-applications` rather than `/employee/others` because the
 * route says what the queue holds while the rail says what the court calls it. It sits
 * beside Rescheduling request and Delay condonation for the same reason they do not nest
 * under their group: the Review applications rows are three views of one body of work,
 * not a hierarchy.
 *
 * The screen is a client component throughout: the filters, paging and empty states are
 * all interaction. There is no backend behind it — `lib/employee/other-applications.ts`
 * says exactly what the data is and is not.
 */
export default function EmployeeOtherApplicationsPage() {
  return <OtherApplicationsScreen />;
}
