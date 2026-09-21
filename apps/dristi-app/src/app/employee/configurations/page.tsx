import type { Metadata } from "next";

import { ConfigurationsScreen } from "@/components/employee/configurations-screen";

export const metadata: Metadata = { title: "Configurations" };

/**
 * Order template configuration — the magistrate's view of the template catalogue.
 *
 * A two-column screen: order types grouped by category on the left, and the selected
 * order type's template, variables, workflow, hearing associations, and category on the
 * right. No runtime persistence — edits here are a visual demonstration of what the
 * configuration screen will do when wired to MDMS.
 */
export default function ConfigurationsPage() {
  return <ConfigurationsScreen />;
}
