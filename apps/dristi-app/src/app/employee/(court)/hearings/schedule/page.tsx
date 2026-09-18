import type { Metadata } from "next";

import { ScheduleScreen } from "@/components/employee/schedule-screen";

export const metadata: Metadata = { title: "Schedule hearing" };

/**
 * The matters this court has not listed yet — the sibling of the day's cause list, and the
 * screen the rail's "Schedule hearing" row leads to.
 *
 * Nested under `/employee/hearings` because it is the same group of work the rail puts it
 * in; "Bulk reschedule hearing" belongs beside it when it is built.
 *
 * The screen is a client component throughout: the filters, paging and row menus are all
 * interaction. There is no backend behind it — `lib/employee/schedule.ts` says exactly what
 * the data is and is not.
 */
export default function EmployeeScheduleHearingPage() {
  return <ScheduleScreen />;
}
