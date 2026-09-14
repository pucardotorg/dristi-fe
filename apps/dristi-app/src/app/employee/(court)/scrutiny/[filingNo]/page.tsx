import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CASE } from "@/lib/employee/scrutiny/history";
import { findFiling } from "@/lib/employee/scrutiny/queue";
import { CaseWorkbench } from "@/components/employee/scrutiny/case-workbench";

export const metadata: Metadata = { title: "Case review" };

/**
 * The scrutiny workbench for one filing: filed fields, the document bundle, and the
 * decision to send back or register.
 *
 * Only `CASE.filingNo` has a bundle behind it today; every other row in the queue is a
 * filing without documents, so it 404s rather than opening an empty workbench. When a
 * registry service is real, this is where the case is fetched.
 */
export default async function EmployeeScrutinyCasePage({
  params,
}: {
  params: Promise<{ filingNo: string }>;
}) {
  const { filingNo } = await params;
  const decoded = decodeURIComponent(filingNo);
  const filing = findFiling(decoded);
  if (!filing || decoded !== CASE.filingNo) notFound();

  return <CaseWorkbench filingNo={decoded} />;
}
