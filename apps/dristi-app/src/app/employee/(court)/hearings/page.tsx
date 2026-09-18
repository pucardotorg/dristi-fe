import type { Metadata } from "next";

import { HearingsScreen } from "@/components/employee/hearings-screen";

export const metadata: Metadata = { title: "Today’s hearings" };

/**
 * The court's cause list for the day it is sitting — the first real screen on the
 * employee side, and the one the rail's "Today's hearings" row leads to.
 *
 * The screen is a client component throughout: the day it shows is read from the reader's
 * clock, and the filters, paging and row menus are all interaction. There is no backend
 * behind it — `lib/employee/hearings.ts` says exactly what the data is and is not.
 */
export default function EmployeeHearingsPage() {
  return <HearingsScreen />;
}
