import type { Metadata } from "next";

import { ApplicationTasksScreen } from "@/components/employee/application-tasks-screen";

export const metadata: Metadata = { title: "Onboard applications" };

/**
 * Onboard applications — the court's Review application tasks
 * (`handovers/application-lifecycle.md`). Client-side: the tasks come from the
 * applications store in this browser — see `lib/employee/application-tasks.ts`.
 */
export default function Page() {
  return <ApplicationTasksScreen kind="review" />;
}
