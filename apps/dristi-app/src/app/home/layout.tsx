import type { Metadata } from "next";

import { TasksProvider } from "@/lib/tasks/store";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Home",
};

/** The litigant home area: the one shared app shell wraps the home body. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <TasksProvider>
      <AppShell>{children}</AppShell>
    </TasksProvider>
  );
}
