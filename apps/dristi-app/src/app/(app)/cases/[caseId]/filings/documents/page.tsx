import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseBreadcrumbs } from "@/components/cases/case-breadcrumbs";
import { SubmitDocumentsForm } from "@/components/cases/submit-documents-form";
import { PAGE_GROUND, PAGE_GUTTER } from "@/components/shell/page-frame";
import { CASES } from "@/lib/cases/fixtures";
import { partiesLabel } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

function findCase(caseId: string) {
  return CASES.find((record) => record.id === caseId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseId: string }>;
}): Promise<Metadata> {
  const { caseId } = await params;
  const record = findCase(caseId);
  return {
    title: record ? `Submit documents · ${record.caseNumber}` : "Submit documents",
  };
}

export default async function SubmitDocumentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const record = findCase(caseId);
  if (!record) notFound();

  return (
    <main className={cn("flex flex-1 flex-col", PAGE_GROUND, PAGE_GUTTER)}>
      <CaseBreadcrumbs
        caseId={record.id}
        caseNumber={record.caseNumber}
        trail={[{ label: "Submit documents" }]}
      />
      <SubmitDocumentsForm
        caseId={record.id}
        caseLine={`${record.caseNumber} · ${partiesLabel(record)}`}
      />
    </main>
  );
}
