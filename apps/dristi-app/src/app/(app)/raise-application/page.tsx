import type { Metadata } from "next";

import { RaiseApplicationCaseChooser } from "@/components/cases/raise-application-case-chooser";
import { CASES, FIXTURE_TODAY } from "@/lib/cases/fixtures";

export const metadata: Metadata = { title: "Raise application" };

/**
 * Raise application from the rail. Reached from a case, the filing already
 * knows its case; reached from here it does not, so choosing the case is the
 * first step and the second is the same page the case's own Make filings menu
 * opens. One flow, two ways in.
 */
export default function RaiseApplicationEntryPage() {
  return (
    <main className="flex flex-1 flex-col">
      <RaiseApplicationCaseChooser
        cases={CASES}
        now={new Date(FIXTURE_TODAY).getTime()}
      />
    </main>
  );
}
