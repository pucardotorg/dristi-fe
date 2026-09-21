import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterCaseScreen } from "@/components/employee/register-case-screen";

export const metadata: Metadata = { title: "Complaint" };

/**
 * One waiting complaint — opened by the cause title on Register cases, and by any link,
 * bookmark or tab that names it.
 *
 * Nested under the queue rather than sitting beside it, so the rail's Register cases row
 * stays current and the top bar's trail leads back to the list
 * (`lib/employee/navigation.ts`). That is also why the screen carries no back control of
 * its own: on the court side the trail is the way back, and the page is never a step in
 * it.
 *
 * **This is the only route a complaint has** (brief D25). The whole file used to be a
 * second page at `./file`; it is now a disclosure of this one, held in the query as
 * `?file=1` so that Back still closes it and a finding's deep link still opens it. The
 * trail therefore ends at the case number again, on both states.
 *
 * `Suspense` because the screen reads that query to decide whether the file is open, and
 * `useSearchParams` opts a route into client rendering unless a boundary says where the
 * server may stop.
 *
 * The screen is a client component because the day is read from the reader's clock
 * rather than the server's: a complaint's whole date chain, and every check run over it,
 * is worked backwards from how long it has waited.
 */
export default async function EmployeeRegisterCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return (
    <Suspense>
      <RegisterCaseScreen caseId={caseId} />
    </Suspense>
  );
}
