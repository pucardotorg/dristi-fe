import type { Metadata } from "next";

import { CognizanceCaseScreen } from "@/components/employee/cognizance-case-screen";

export const metadata: Metadata = { title: "Complaint" };

/**
 * One registered complaint waiting for cognizance — opened by the cause title on Take
 * cognizance, and by any link, bookmark or tab that names it.
 *
 * Nested under the queue rather than sitting beside it, so the rail's Take cognizance row
 * stays current and the top bar's trail leads back to the list
 * (`lib/employee/navigation.ts`). That is also why the screen carries no back control of
 * its own: on the court side the trail is the way back.
 *
 * The screen is a client component because the day is read from the reader's clock rather
 * than the server's — a complaint's whole date chain, and every check run over it, is
 * worked backwards from how long it has waited.
 */
export default async function EmployeeCognizanceCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <CognizanceCaseScreen caseId={caseId} />;
}
