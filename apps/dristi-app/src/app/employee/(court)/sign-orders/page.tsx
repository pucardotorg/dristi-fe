import type { Metadata } from "next";

import { SignOrdersScreen } from "@/components/employee/sign-orders-screen";

export const metadata: Metadata = { title: "Sign orders" };

/**
 * The orders waiting on this bench's signature — the screen the rail's "Sign orders" row
 * leads to.
 *
 * Sits beside `/employee/sign-forms` rather than under a `sign/` segment for the reason
 * the review queues sit beside each other: the rail's Sign group is several views of one
 * body of work, not a hierarchy.
 *
 * The screen is a client component throughout: the filters, the selection, the paging
 * and the act are all interaction. There is no backend behind it — nothing is signed or
 * published, and `lib/employee/sign-orders.ts` says exactly what the data is and is not.
 */
export default function EmployeeSignOrdersPage() {
  return <SignOrdersScreen />;
}
