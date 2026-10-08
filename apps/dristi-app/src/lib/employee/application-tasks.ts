/**
 * Application tasks — the court side of the application lifecycle.
 *
 * Every application filed (signed and paid) on the citizen side raises a **Review
 * application** task due the next working day; onboarding it raises a **Decide
 * application** task (`handovers/application-lifecycle.md`, `ALC-03`, `ALC-21`). Both
 * read the same record from `lib/applications/store.ts`, so what an advocate files in
 * this browser is what the bench sees here. Nothing is seeded: the queue holds only
 * what has actually been filed.
 */
import { decodeDraft } from "@/lib/applications/form-codec";
import {
  formatCaseDate,
  partiesLabel,
  type CaseRecord,
} from "@/lib/cases/types";
import { buildGeneratedApplication } from "@/lib/cases/application-document";
import { CASES } from "@/lib/cases/fixtures";
import type { LifecycleApplication } from "@/lib/applications/lifecycle";

import type { CourtApplicationDocument } from "@/components/employee/application-review-dialog";

export function caseOf(app: LifecycleApplication): CaseRecord | undefined {
  return CASES.find((record) => record.id === app.caseId);
}

export function causeTitleOf(app: LifecycleApplication): string {
  const record = caseOf(app);
  return record ? partiesLabel(record) : app.caseId;
}

/** The application as paper, from what the filer entered. */
export function courtDocumentOf(
  app: LifecycleApplication,
): CourtApplicationDocument | null {
  const record = caseOf(app);
  if (!record) return null;
  const generated = buildGeneratedApplication(decodeDraft(app.form), record, app.side);
  if (!generated) return null;
  return {
    ...generated,
    dated: formatCaseDate(app.submittedOn ?? app.createdOn),
  };
}

export type DueState = "overdue" | "today" | "later";

export function dueState(dueOn: string, today: string): DueState {
  if (dueOn < today) return "overdue";
  if (dueOn === today) return "today";
  return "later";
}
