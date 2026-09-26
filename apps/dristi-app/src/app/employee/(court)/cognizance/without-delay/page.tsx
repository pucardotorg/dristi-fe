import type { Metadata } from "next";

import { CognizanceTabScreen } from "@/components/employee/cognizance-tab-screen";

export const metadata: Metadata = { title: "Take cognizance — Without delay" };

/**
 * The "split" reading of Take cognizance (`cognizance-layout.ts`) — complaints filed in
 * time, as their own row in the rail rather than a tab inside `/employee/cognizance`.
 */
export default function EmployeeCognizanceWithoutDelayPage() {
  return <CognizanceTabScreen tab="without-delay" />;
}
