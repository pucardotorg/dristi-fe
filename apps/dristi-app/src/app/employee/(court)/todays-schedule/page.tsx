import type { Metadata } from "next";

import { TodaysScheduleScreen } from "@/components/employee/todays-schedule-screen";

export const metadata: Metadata = { title: "Today’s schedule" };

/**
 * `/employee/todays-schedule` — the "schedule" combined rail layout's one row, opened.
 *
 * The rail only links here while it is set to the "schedule" layout (`nav-layout.ts`);
 * "grouped" has no row that points here, and "actions" points to
 * `/employee/todays-actions` instead. Not a guard — see that page's own note.
 */
export default function TodaysSchedulePage() {
  return <TodaysScheduleScreen />;
}
