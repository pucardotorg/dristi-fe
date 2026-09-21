import type { ReactNode } from "react";

import { PAGE_BACK_COLUMN, PAGE_BACK_ROW } from "@/components/shell/page-back-button";
import { derivedAccessPeople } from "@/lib/access/derived";
import {
  caseNumberHistory,
  secondaryStageLabel,
  secondaryStages,
} from "@/lib/cases/header";
import { viewerAccess } from "@/lib/cases/viewer";
import {
  counselFor,
  formatCaseDate,
  partiesLabel,
  type CaseRecord,
  type CounselSide,
} from "@/lib/cases/types";

import { CaseAdvocates } from "./case-advocates";
import { CaseHeaderActions } from "./case-header-actions";
import { CaseFlags, CaseStage } from "./case-identity";
import {
  CaseBackButton,
  CaseNumberLine,
  CaseStageBadges,
} from "./case-header-parts";

const COUNSEL_LABEL: Record<CounselSide, string> = {
  complainant: "Complainant advocates",
  accused: "Accused advocates",
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
  const numberHistory = caseNumberHistory(record);
  const hasParties =
    record.parties.complainant.length > 0 && record.parties.accused.length > 0;
  const title = hasParties ? partiesLabel(record) : record.caseNumber;
  const complainantCounsel = counselFor(record, "complainant");
  const accusedCounsel = counselFor(record, "accused");

  return (
    <header className="flex flex-col gap-4">
      {/* Identity and actions share the top row, so the actions anchor the far
          end without costing the header a row of their own. */}
      {/* Centred on the number-and-title block, so the actions sit on the plane
          between the two lines rather than hanging off the number (owner, Sept 18). */}
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* The way back in its own column, on the title's line. The case
            number sits UNDER the title (owner, Sept 21): the parties are what
            the person looks for, the number confirms it. */}
        <div className={PAGE_BACK_ROW}>
          <div className={PAGE_BACK_COLUMN}>
            <CaseBackButton />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <h1 className="text-title font-semibold">{title}</h1>
              {hideLongPendingFlag ? null : <CaseFlags record={record} />}
            </span>
            {/* Without parties the title already *is* the number. Only the latest
                number shows (DET-01); the older ones sit behind the icon. */}
            {hasParties ? (
              <div className="flex min-h-6 items-center">
                <CaseNumberLine
                  caseNumber={record.caseNumber}
                  history={numberHistory}
                />
              </div>
            ) : (
              <p className="text-body-compact text-muted-foreground">
                Parties not yet recorded
              </p>
            )}
          </div>
        </div>

        <CaseHeaderActions
          accessCase={{
            id: record.id,
            title,
            caseNumber: record.caseNumber,
            court: record.court,
            nextHearing: record.nextHearing?.on ?? "—",
          }}
          disposed={Boolean(record.disposal)}
          shareReadOnly={viewerAccess(record).kind === "office"}
          shareExtraPeople={derivedAccessPeople(record)}
        />
      </div>

      {/* Fixed 16rem columns from `md:`. Packed at 2rem apart the facts read
          as crammed; as equal thirds of the row they drifted apart. This is
          the owner's middle ground (Sept 18). */}
      <dl className="flex min-w-0 flex-col divide-y divide-hairline border-y border-hairline md:divide-y-0 md:border-y-0 md:gap-x-8 md:grid md:auto-cols-[minmax(0,16rem)] md:grid-flow-col md:justify-start">
        {hasParties ? null : (
          <HeaderFact label="Case number">
            <CaseNumberLine
              caseNumber={record.caseNumber}
              history={numberHistory}
              className="text-foreground"
            />
          </HeaderFact>
        )}
        <HeaderFact label="Stage">
          <CaseStageBadges
            stage={<CaseStage record={record} detail={false} />}
            subStages={secondaryStages(record).map(secondaryStageLabel)}
          />
        </HeaderFact>
        {/* A live case has its date on Overview; a disposed one has no
            date left, and the day it ended is identity. */}
        {record.disposal ? (
          <HeaderFact label="Disposed">
            <span className="tabular-nums">
              {formatCaseDate(record.disposal.on)}
            </span>
          </HeaderFact>
        ) : null}
        {complainantCounsel.length > 0 ? (
          <HeaderFact label={COUNSEL_LABEL.complainant}>
            <CaseAdvocates
              record={record}
              side="complainant"
              more="text"
              className="font-medium"
            />
          </HeaderFact>
        ) : null}
        {accusedCounsel.length > 0 ? (
          <HeaderFact label={COUNSEL_LABEL.accused}>
            <CaseAdvocates
              record={record}
              side="accused"
              more="text"
              className="font-medium"
            />
          </HeaderFact>
        ) : null}
      </dl>
    </header>
  );
}

/** Caption label over a compact value, the app's dense key-value pair. */
function HeaderFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    /* Below `md`: a row, label left and value right, ruled off from its
       neighbours. Wrapped as loose label-over-value pairs, two landed on one
       line and the third alone, and the block read as jumbled (owner, Sept 21). */
    <div className="flex min-w-0 items-center justify-between gap-4 py-2 md:flex-col md:items-stretch md:justify-start md:gap-1 md:py-0">
      <dt className="shrink-0 text-caption font-medium text-muted-foreground">
        {label}
      </dt>
      {/* min-h-6 keeps every value on one baseline; the counsel +N chip
          reaches its 40px target through its own `after:` inset. */}
      <dd className="flex min-h-6 min-w-0 items-center gap-1 text-body-compact font-medium text-foreground max-md:justify-end">
        {children}
      </dd>
    </div>
  );
}
