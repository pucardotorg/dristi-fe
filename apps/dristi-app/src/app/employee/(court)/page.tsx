import type { Metadata } from "next";

import { CourtDashboardScreen } from "@/components/employee/court-dashboard-screen";
import { COURT_DASHBOARD } from "@/lib/employee/navigation";

export const metadata: Metadata = { title: COURT_DASHBOARD.label };

/**
 * `/employee` — the court's dashboard, over its own register.
 *
 * It replaces the "Court home" placeholder that used to sit here: an empty state nothing
 * linked to, reachable only through a breadcrumb root that no longer exists. What the
 * bench actually wants at this address is the six priority categories from the owner's
 * Gujarat research, and — the owner's call on 2026-09-14 — the searchable register they
 * filter. Both live in `CourtDashboardScreen`.
 *
 * The title comes from `COURT_DASHBOARD` rather than being spelled again, so the rail's
 * row and this page cannot end up calling one destination two things.
 *
 * The screen is a client component throughout: the day it reports is read from the
 * reader's clock, and the tiles, filters and paging are all interaction. There is no
 * backend behind it — `lib/employee/cases.ts` says exactly what the data is and is not.
 */
export default function CourtDashboardPage() {
  return <CourtDashboardScreen />;
}
