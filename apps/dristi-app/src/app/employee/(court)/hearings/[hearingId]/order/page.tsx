import type { Metadata } from "next";

import { OrderScreen } from "@/components/employee/order-screen";

export const metadata: Metadata = { title: "Order" };

/**
 * Compose the order of one listing — opened from the cause-list orders icon.
 *
 * The screen is a client component throughout: attendance, directions, next listing
 * and the preview are all interaction. There is no backend behind it, and it issues
 * nothing — `lib/employee/order-draft.ts` says exactly what the data is and is not.
 */
export default async function EmployeeHearingOrderPage({
  params,
}: {
  params: Promise<{ hearingId: string }>;
}) {
  const { hearingId } = await params;
  return <OrderScreen hearingId={hearingId} />;
}
