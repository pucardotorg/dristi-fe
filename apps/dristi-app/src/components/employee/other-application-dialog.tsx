"use client";

import { useMemo } from "react";

import { ReviewRow } from "@/components/cases/filing-form-shared";
import { ApplicationReviewOverlay } from "@/components/employee/application-review-dialog";
import { Dialog } from "@/components/ui/dialog";
import { causeTitle } from "@/lib/employee/hearings";
import {
  buildOtherApplicationDocument,
  downloadOtherApplicationDocument,
  formatOtherApplicationLongDate,
  otherApplicationFiler,
  otherApplicationStageLabel,
  otherApplicationTypeLabel,
  type OtherApplication,
} from "@/lib/employee/other-applications";
import { Identifier } from "@/components/chrome/identifier";

/**
 * One application off the Others queue, read and then allowed or refused.
 *
 * The same overlay as the two narrower queues, and for the same reason: fourteen heads
 * of application are still one job — somebody asked this court for something and the
 * bench has to answer. What the head changes is the paper, not the review, so the type
 * is the overlay's title and the document composes itself from it.
 *
 * **Approve and Reject perform no judicial act.** Both drop the row from the demo queue
 * and close. No order is drawn, no document is released, no bail is granted, nothing is
 * written and nobody is told.
 */
export function OtherApplicationDialog({
  application,
  onOpenChange,
  onApprove,
  onReject,
  onReturnFocus,
}: {
  application: OtherApplication | null;
  onOpenChange: (application: OtherApplication | null) => void;
  onApprove: (application: OtherApplication) => void;
  onReject: (application: OtherApplication) => void;
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
        /* Keyed on the application so opening a second one starts fresh rather than
           inheriting the last one's scroll position. */
        <ApplicationBody
          key={application.id}
          application={application}
          onApprove={onApprove}
          onReject={onReject}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function ApplicationBody({
  application,
  onApprove,
  onReject,
  onReturnFocus,
}: {
  application: OtherApplication;
  onApprove: (application: OtherApplication) => void;
  onReject: (application: OtherApplication) => void;
  onReturnFocus: () => void;
}) {
  const document = useMemo(
    () => buildOtherApplicationDocument(application),
    [application],
  );

  return (
    <ApplicationReviewOverlay
      title={otherApplicationTypeLabel(application.type)}
      description={
        <>
          {/* The overlay renders this as its accessible description. */}
          <Identifier value={application.caseNumber} label="case number" copyable={false} />
          {" · "}
          {causeTitle(application)}
        </>
      }
      facts={
        <>
          <ReviewRow term="Application type">
            {otherApplicationTypeLabel(application.type)}
          </ReviewRow>
          <ReviewRow term="Case number">
            <Identifier value={application.caseNumber} label="case number" />
          </ReviewRow>
          <ReviewRow term="Stage">
            {otherApplicationStageLabel(application.stage)}
          </ReviewRow>
          <ReviewRow term="Date of application">
            <span className="tabular-nums">
              {formatOtherApplicationLongDate(application.appliedOn)}
            </span>
          </ReviewRow>
          <ReviewRow term="Application filer">
            {otherApplicationFiler(application)}
          </ReviewRow>
        </>
      }
      document={document}
      onDownload={() => downloadOtherApplicationDocument(application)}
      onApprove={() => onApprove(application)}
      onReject={() => onReject(application)}
      onReturnFocus={onReturnFocus}
    />
  );
}
