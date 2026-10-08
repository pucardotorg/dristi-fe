import type { Metadata } from "next";

import { ApplicationTasksScreen } from "@/components/employee/application-tasks-screen";

export const metadata: Metadata = { title: "Decide on applications" };

/**
 * Decide on applications — the court's Decide application tasks
 * (`handovers/application-lifecycle.md`). Client-side: the tasks come from the
 * applications store in this browser — see `lib/employee/application-tasks.ts`.
 */
export default function Page() {
  return <ApplicationTasksScreen kind="decide" />;
}
