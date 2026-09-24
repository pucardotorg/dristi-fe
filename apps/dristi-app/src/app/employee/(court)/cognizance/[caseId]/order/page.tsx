import type { Metadata } from "next";

import { CognizanceOrderScreen } from "@/components/employee/cognizance-order-screen";
import { isCognizanceAct } from "@/lib/employee/cognizance";

export const metadata: Metadata = { title: "Order" };

/**
 * The order one cognizance act draws up — reached from the act buttons on a complaint's
 * own file, never from the rail.
 *
 * Nested under the complaint rather than beside the hearing composer, because that is
 * what it is about: a complaint on the register, not a matter on today's list. The
 * hearing composer stays where it is (`/employee/hearings/<id>/order`) and is reached
 * from a sitting; both draw an order, and which of the two you are in is a fact about
 * the subject, not about the screen (`lib/employee/order-subject.ts`).
 *
 * The act rides in the query string rather than the path. It is not a second thing the
 * URL identifies — one complaint has one order being drawn at a time — and an act the
 * complaint's tab does not offer would be a path that resolved to nothing. An unknown
 * or missing act falls back to the act this complaint's tab offers.
 */
export default async function EmployeeCognizanceOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ act?: string }>;
}) {
  const { caseId } = await params;
  const { act } = await searchParams;
  return (
    <CognizanceOrderScreen
      caseId={caseId}
      act={isCognizanceAct(act) ? act : null}
    />
  );
}
