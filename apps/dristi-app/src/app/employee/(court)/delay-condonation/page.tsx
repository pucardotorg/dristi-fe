import type { Metadata } from "next";

import { DelayCondonationScreen } from "@/components/employee/delay-condonation-screen";

export const metadata: Metadata = { title: "Delay condonation" };

/**
 * Applications asking this court to condone delay — the screen the rail's
 * "Delay condonation" row leads to.
 *
 * Lives at `/employee/delay-condonation` because it is the Review
 * applications group's work, not a hearing. The Hearings rows nest under
 * `/employee/hearings`; this one does not, the way Register cases and
 * Rescheduling request do not nest under their groups.
 *
 * The screen is a client component throughout: the filters, paging and empty
 * states are all interaction. There is no backend behind it —
 * `lib/employee/delay-condonation.ts` says exactly what the data is and is
 * not.
 */
export default function EmployeeDelayCondonationPage() {
  return <DelayCondonationScreen />;
}
