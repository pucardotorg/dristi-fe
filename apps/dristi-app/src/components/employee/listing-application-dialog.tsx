"use client";

import { useMemo } from "react";

import { ReviewRow } from "@/components/cases/filing-form-shared";
import { ApplicationReviewOverlay } from "@/components/employee/application-review-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  causeTitle,
  courtCaseStageLabel,
  formatCourtDay,
  type CourtHearing,
} from "@/lib/employee/hearings";
import {
  buildListingApplicationDocument,
  listingApplicationFiler,
  listingApplicationLabel,
  type ListingApplication,
} from "@/lib/employee/listing-applications";
import { Identifier } from "@/components/chrome/identifier";

/**
 * An application pending on the matter in front of the bench, read and then answered.
 *
 * The same overlay the three review queues use, on the same kind of paper — because it
 * is the same job. What changes is only when the bench meets it: the queues are the
 * work between sittings, this is the application standing in the matter that has just
 * been called. A court-side screen that invented its own review surface for that would
 * be asking a magistrate to learn a second way to read one document.
 *
 * The queue's own vocabulary comes with it: Accept and Reject on the controls, because
 * that is what every other court-side review says. The *order* prints "is allowed" /
 * "is dismissed" (`listingApplicationSentence`) — a button and a finding are not
 * obliged to use the same word, and neither one should be bent to the other.
 *
 * **Answering here performs no judicial act.** Both decisions write one sentence into
 * the draft order and close. No bail is granted, no hearing moves, nothing is filed,
 * signed, or notified.
 */
export function ListingApplicationDialog({
  hearing,
  application,
  onOpenChange,
  onAllow,
  onDismiss,
  onReturnFocus,
}: {
  hearing: CourtHearing;
  application: ListingApplication | null;
  onOpenChange: (application: ListingApplication | null) => void;
  onAllow: (application: ListingApplication) => void;
  onDismiss: (application: ListingApplication) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog
      open={application !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {application ? (
        /* Keyed on the application so opening the second one starts fresh rather than
           inheriting the first's scroll position — the pattern the Others queue set. */
        <ApplicationBody
          key={application.id}
          hearing={hearing}
          application={application}
          onAllow={onAllow}
          onDismiss={onDismiss}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function ApplicationBody({
  hearing,
  application,
  onAllow,
  onDismiss,
  onReturnFocus,
}: {
  hearing: CourtHearing;
  application: ListingApplication;
  onAllow: (application: ListingApplication) => void;
  onDismiss: (application: ListingApplication) => void;
  onReturnFocus: () => void;
}) {
  const document = useMemo(
    () => buildListingApplicationDocument(hearing, application),
    [hearing, application],
  );

  return (
    <ApplicationReviewOverlay
      title={listingApplicationLabel(application)}
      description={
        <>
          {/* The overlay renders this as its accessible description. */}
          <Identifier
            value={application.number}
            label="application number"
            copyable={false}
          />
          {" · item "}
          <span className="tabular-nums">{hearing.item}</span>
          {" · "}
          {causeTitle(hearing)}
        </>
      }
      facts={
        <>
          <ReviewRow term="Application type">
            {listingApplicationLabel(application)}
          </ReviewRow>
          <ReviewRow term="Application number">
            <Identifier value={application.number} label="application number" />
          </ReviewRow>
          <ReviewRow term="Case number">
            <Identifier value={hearing.caseNumber} label="case number" />
          </ReviewRow>
          <ReviewRow term="Stage">
            {courtCaseStageLabel(hearing.stage)}
          </ReviewRow>
          <ReviewRow term="Date of application">
            <span className="tabular-nums">
              {formatCourtDay(application.filedOn)}
            </span>
          </ReviewRow>
          <ReviewRow term="Application filer">
            {listingApplicationFiler(hearing, application)}
          </ReviewRow>
        </>
      }
      document={document}
      /* No download, unlike the queues: this build has no court record to hand over,
         and the composer's own preview already refuses to claim one. */
      approveLabel="Accept"
      onApprove={() => onAllow(application)}
      onReject={() => onDismiss(application)}
      onReturnFocus={onReturnFocus}
    />
  );
}
