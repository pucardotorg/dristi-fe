import type { Metadata } from "next";

import { TodaysActionsScreen } from "@/components/employee/todays-actions-screen";

export const metadata: Metadata = { title: "Today’s actions" };

/**
 * `/employee/todays-actions` — the "actions" combined rail layout's one row, opened.
 *
 * The rail only links here while it is set to the "actions" layout (`nav-layout.ts`);
 * "grouped" has no row that points here, and "schedule" points to
 * `/employee/todays-schedule` instead. Not a guard — the layout is a `localStorage`
 * preference, not a permission — so this route renders the same whatever the rail is
 * currently doing.
 */
export default function TodaysActionsPage() {
  return <TodaysActionsScreen />;
}
