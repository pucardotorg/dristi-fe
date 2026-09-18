import type { Metadata } from "next";

import { CourtCasesScreen } from "@/components/employee/court-cases-screen";
import { COURT_CASES_PAGE } from "@/lib/employee/navigation";

export const metadata: Metadata = { title: COURT_CASES_PAGE.label };

/**
 * `/employee/cases` — the register. The rail's "All cases" row leads here, and so does
 * every tile on the dashboard, carrying its category in `?priority=`.
 *
 * The title comes from `COURT_CASES_PAGE` rather than being spelled again, so the rail's
 * row and this page cannot end up calling one destination two things.
 *
 * The screen is a client component throughout: the dates it prints are read from the
 * reader's clock, and the filters and paging are all interaction. There is no backend
 * behind it — `lib/employee/cases.ts` says exactly what the data is and is not.
 */
export default function CourtCasesPage() {
  return <CourtCasesScreen />;
}
