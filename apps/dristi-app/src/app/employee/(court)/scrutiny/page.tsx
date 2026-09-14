import type { Metadata } from "next";

import { ScrutinyQueue } from "@/components/employee/scrutiny/scrutiny-queue";

export const metadata: Metadata = { title: "Scrutinise submitted cases" };

/**
 * Complaints waiting to be checked against the documents filed with them — the screen
 * the rail's "Scrutinise submitted cases" row leads to.
 *
 * First of the Actions group because it is first in the life of a filing: an advocate
 * files, the complaint lands here, and only what survives scrutiny reaches Register
 * cases. Opening a row crosses into the workbench at `/employee/scrutiny/[filingNo]`.
 */
export default function EmployeeScrutinyPage() {
  return <ScrutinyQueue />;
}
