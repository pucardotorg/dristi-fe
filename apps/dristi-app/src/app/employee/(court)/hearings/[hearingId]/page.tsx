import type { Metadata } from "next";

import { HearingOverviewScreen } from "@/components/employee/hearing-overview-screen";

export const metadata: Metadata = { title: "Case overview" };

/**
 * What is in the case — opened by the cause title on today's cause list, and by any
 * link, bookmark or tab that names this listing. Start hearing does not come here: it
 * opens the same overview over the list it was pressed on
 * (`components/employee/hearing-overview-dialog.tsx`).
 *
 * The screen is a client component because the marks this sitting has made live on
 * the client (`lib/employee/hearing-session.ts`) and the day is read from the
 * reader's clock, not the server's. It reads only: nothing on it is filed, and the
 * one action it offers is not connected to anything — `hearing-overview-screen.tsx`
 * says exactly what it is and is not.
 */
export default async function EmployeeHearingOverviewPage({
  params,
}: {
  params: Promise<{ hearingId: string }>;
}) {
  const { hearingId } = await params;
  return <HearingOverviewScreen hearingId={hearingId} />;
}
