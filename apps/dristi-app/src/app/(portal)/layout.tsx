import type { Metadata } from "next";

import { TasksProvider } from "@/lib/tasks/store";
import { AccessProvider } from "@/components/access/access-state";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Dristi",
};

/**
 * The portal area — advocate home, Your Cases, People. One shared app shell, one
 * TasksProvider (the shell footer reads it), one AccessProvider so grants made on the
 * People page persist when you step into a case file and back. Each screen is a
 * placeholder body a designer can swap without touching this frame.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <TasksProvider>
      <AccessProvider>
        <AppShell>{children}</AppShell>
      </AccessProvider>
    </TasksProvider>
  );
}
