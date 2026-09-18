import type { Metadata } from "next";

import { SignFormsScreen } from "@/components/employee/sign-forms-screen";

export const metadata: Metadata = { title: "Sign forms" };

/**
 * Forms this court has drawn up and not yet signed — the screen the rail's "Sign forms"
 * row leads to.
 *
 * Lives at `/employee/sign-forms` because it is the Sign group's work, not a hearing.
 * The Hearings rows nest under `/employee/hearings`; this one does not, the same way
 * Register cases and the two review queues do not.
 *
 * The screen is a client component throughout: selection, the filters, paging, the two
 * signing paths and the empty states are all interaction. There is no backend behind
 * it, and nothing on it signs anything — `lib/employee/sign-forms.ts` says exactly what
 * the data is and is not.
 */
export default function EmployeeSignFormsPage() {
  return <SignFormsScreen />;
}
