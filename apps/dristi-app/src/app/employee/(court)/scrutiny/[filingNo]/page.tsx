import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { scrutinyCaseFor } from "@/lib/employee/scrutiny/case";
import { CaseWorkbench } from "@/components/employee/scrutiny/case-workbench";

export const metadata: Metadata = { title: "Case review" };

/**
 * The scrutiny workbench for one filing: filed fields, the document bundle, and the
 * decision to send back or register.
 *
 * Every real filing opens. The one hand-authored case brings its own rich bundle; every
 * other row is assembled from what the queue knows about it (`case.ts`), so no row in the
 * queue is a dead link. Only an id that names no filing at all 404s. When a registry
 * service is real, `scrutinyCaseFor` is where the case is fetched instead of derived.
 */
export default async function EmployeeScrutinyCasePage({
  params,
}: {
  params: Promise<{ filingNo: string }>;
}) {
  const { filingNo } = await params;
  const caseData = scrutinyCaseFor(decodeURIComponent(filingNo));
  if (!caseData) notFound();

  return <CaseWorkbench caseData={caseData} />;
}
