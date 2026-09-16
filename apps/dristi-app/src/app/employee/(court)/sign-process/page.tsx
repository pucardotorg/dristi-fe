import type { Metadata } from "next";

import { SignProcessScreen } from "@/components/employee/sign-process-screen";

export const metadata: Metadata = { title: "Sign process" };

/**
 * The process this court has issued and has still to get out of the building — the
 * screen the rail's "Sign process" row leads to.
 *
 * Sits beside `/employee/sign-orders` rather than under a `sign/` segment, for the reason
 * the review queues sit beside each other: the rail's Sign group is several views of one
 * body of work, not a hierarchy. The five stages are tabs inside this one route rather
 * than five routes, because a row moves between them and the bench works the line by
 * moving along it, not by navigating.
 *
 * The screen is a client component throughout: the tabs, the filters, the selection, the
 * paging and the acts are all interaction. There is no backend behind it — nothing is
 * signed, printed, posted or served, and `lib/employee/sign-process.ts` says exactly what
 * the data is and is not.
 */
export default function EmployeeSignProcessPage() {
  return <SignProcessScreen />;
}
