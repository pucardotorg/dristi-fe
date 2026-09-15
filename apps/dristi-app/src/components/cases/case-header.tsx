import type { ReactNode } from "react";

import { derivedAccessPeople } from "@/lib/access/derived";
import { peekExtras } from "@/lib/cases/peek";
import { viewerAccess } from "@/lib/cases/viewer";
import {
  counselFor,
  formatCaseDate,
  partiesLabel,
  type CaseRecord,
  type CounselSide,
} from "@/lib/cases/types";
import { cn } from "@/lib/utils";

import { CaseAdvocates } from "./case-advocates";
import { CaseHeaderActions } from "./case-header-actions";
import { CaseFlags, CaseStage } from "./case-identity";

const COUNSEL_LABEL: Record<CounselSide, string> = {
  complainant: "Complainant counsel",
  accused: "Accused counsel",
};

/**
 * Page chrome for a case file — shared by every tab once those exist.
 * Identity and status sit here so Overview does not repeat them. Pipes
 * and unlabeled numbers are the thing this replaces.
 *
 * Not a Card. These facts are intrinsically narrow, so a full-width
 * panel is a box they can never fill — and its edge lands directly on
 * top of the card edges the tab content already draws. Unbordered, and
 * with the actions holding the far end, the row spans the width because
 * something sits at both edges; the tab list's own rule closes it.
 *
 * Which case this is, where it stands, and who is on record. Counsel
 * stays here: the header is the only chrome that survives a tab change,
 * and Parties is three clicks from Orders or Documents.
 *
 * The next posting is deliberately not here. It reads as one fact with
 * the sitting it came out of — the court heard evidence, went part-heard,
 * and listed it again for cross — so Overview's Hearings card holds both
 * halves rather than the strip holding a date with no cause.
 *
 * The case number reads above the party name. It used to sit in the strip
 * below as one of six facts at identical weight, which gave that row no
 * focal point and sent the eye to the party name instead.
 */
export function CaseHeader({
  record,
  hideLongPendingFlag = false,
}: {
  record: CaseRecord;
  /** Set when the case detail link was reached from the long pending
   *  register — that register already established the flag, so the
   *  header doesn't need to repeat it. */
  hideLongPendingFlag?: boolean;
}) {
  const extras = peekExtras(record.id);
  const hasParties =
    record.parties.complainant.length > 0 && record.parties.accused.length > 0;
  const title = hasParties ? partiesLabel(record) : record.caseNumber;
  const complainantCounsel = counselFor(record, "complainant");
  const accusedCounsel = counselFor(record, "accused");

  return (
    <header className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        {/* Without parties the title already *is* the number, so printing it
            here too would just say it twice. Position and the mono face carry
            the label, the way a record number does above a document title;
            the sr-only text keeps the semantics the strip's <dt> gave. */}
        {hasParties ? (
          <p className="font-sans text-title-s font-semibold text-foreground">
            <span className="sr-only">Case number </span>
            {record.caseNumber}
            {/* The registry's other number for the same matter, on the same
                line. It is the number the other side of the courthouse
                quotes, so it belongs with the one this side quotes rather
                than four columns away in the fact strip. The dot divides
                them; muted, because it is punctuation between two numbers
                and not a third thing to read. Each number keeps its own
                spoken label — read as one string they are one number. */}
            {extras.altCaseNumber ? (
              <>
                <span aria-hidden className="text-muted-foreground">
                  {" · "}
                </span>
                <span className="sr-only">, other number </span>
                {extras.altCaseNumber}
              </>
            ) : null}
          </p>
        ) : null}
        <span className="flex flex-wrap items-center gap-2">
          <h1 className="text-title-l font-semibold">{title}</h1>
          {hideLongPendingFlag ? null : <CaseFlags record={record} />}
        </span>
        {hasParties ? null : (
          <p className="text-body text-muted-foreground">
            Parties not yet recorded
          </p>
        )}
      </div>

      {/* Facts and actions share the row. The buttons anchor its right end,
          so the strip has two edges instead of trailing off — and they align
          to the values, not the labels, which is why this is items-end. */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <dl className="flex min-w-0 flex-wrap gap-x-8 gap-y-4">
          {/* Only when the lede above could not carry it. */}
          {hasParties ? null : (
            <HeaderFact label="Case number" mono>
              {record.caseNumber}
            </HeaderFact>
          )}
          {/* Only in the branch where the lede could not carry it — with no
              parties the title is the case number itself, so neither number
              has a line above to sit on. */}
          {extras.altCaseNumber && !hasParties ? (
            <HeaderFact label="Other number" mono>
              {extras.altCaseNumber}
            </HeaderFact>
          ) : null}
          <HeaderFact label="Stage">
            <CaseStage record={record} detail={false} />
          </HeaderFact>
          {/* A live case has its date on Overview; a disposed one has no
              date left, and the day it ended is identity. */}
          {record.disposal ? (
            <HeaderFact label="Disposed">
              {formatCaseDate(record.disposal.on)}
            </HeaderFact>
          ) : null}
          {complainantCounsel.length > 0 ? (
            <HeaderFact label={COUNSEL_LABEL.complainant}>
              <CaseAdvocates
                record={record}
                side="complainant"
                className="text-body font-medium"
              />
            </HeaderFact>
          ) : null}
          {accusedCounsel.length > 0 ? (
            <HeaderFact label={COUNSEL_LABEL.accused}>
              <CaseAdvocates
                record={record}
                side="accused"
                className="text-body font-medium"
              />
            </HeaderFact>
          ) : null}
        </dl>

        <CaseHeaderActions
          accessCase={{
            id: record.id,
            title,
            caseNumber: record.caseNumber,
            court: record.court,
            nextHearing: record.nextHearing?.on ?? "—",
          }}
          shareReadOnly={viewerAccess(record).kind === "office"}
          shareExtraPeople={derivedAccessPeople(record)}
        />
      </div>
    </header>
  );
}

/**
 * Same type roles as OverviewRow / PeekRow: Card's compact type is control
 * chrome, not screen copy. Caption is too small for identity facts.
 */
function HeaderFact({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-body text-muted-foreground">{label}</dt>
      {/* min-h-10 keeps every value on one baseline and gives the counsel
          +N trigger its 40px target (Laws: accessibility floor). */}
      <dd
        className={cn(
          "flex min-h-10 items-center text-body font-medium text-foreground",
          mono && "font-sans"
        )}
      >
        {children}
      </dd>
    </div>
  );
}
