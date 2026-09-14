import type { Metadata } from "next";

import { RegisterCasesScreen } from "@/components/employee/register-cases-screen";

export const metadata: Metadata = { title: "Register cases" };

/**
 * Complaints this court has not yet taken on the register — the screen the rail's
 * "Register cases" row leads to.
 *
 * Lives at `/employee/register-cases` because it is the Actions group's work, not a
 * hearing. The Hearings rows nest under `/employee/hearings`; this one does not.
 *
 * The screen is a client component throughout: the search, paging and empty states
 * are all interaction. There is no backend behind it — `lib/employee/register-cases.ts`
 * says exactly what the data is and is not.
 */
export default function EmployeeRegisterCasesPage() {
  return <RegisterCasesScreen />;
}
