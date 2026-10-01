"use client";

import { useMemo } from "react";

import { ReviewRow } from "@/components/cases/filing-form-shared";
import { ApplicationReviewOverlay } from "@/components/employee/application-review-dialog";
import { Dialog } from "@/components/ui/dialog";
import { courtHearingPurposeLabel } from "@/lib/employee/hearings";
import {
  APPLICATION_TYPE_LABEL,
  buildReschedulingDocument,
  consentLabel,
  downloadReschedulingDocument,
  formatProposedDates,
  formatRequestLongDate,
  senderLine,
  type ReschedulingRequest,
} from "@/lib/employee/rescheduling-request";
import { Identifier } from "@/components/chrome/identifier";

/**
 * One rescheduling application, in the shared court-side review overlay, with the
 * Approve / Reject the bench needs.
 *
 * The document is the thing being reviewed, so it fills the overlay's `1fr` row;
 * the facts sit in a compact sunken well above it, not a nine-row list that ate
 * the paper. The overlay itself is `ApplicationReviewOverlay`, shared with the
 * delay-condonation and Others queues — this file is now only what is particular
 * to a request to move a date. Approve and Reject only leave the demo queue.
 */
export function ReschedulingRequestDialog({
  request,
  onOpenChange,
  onApprove,
  onReject,
  onReturnFocus,
}: {
  request: ReschedulingRequest | null;
  onOpenChange: (request: ReschedulingRequest | null) => void;
  onApprove: (request: ReschedulingRequest) => void;
  onReject: (request: ReschedulingRequest) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {request ? (
        <RequestBody
          key={request.id}
          request={request}
          onApprove={onApprove}
          onReject={onReject}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function RequestBody({
  request,
  onApprove,
  onReject,
  onReturnFocus,
}: {
  request: ReschedulingRequest;
  onApprove: (request: ReschedulingRequest) => void;
  onReject: (request: ReschedulingRequest) => void;
  onReturnFocus: () => void;
}) {
  const document = useMemo(
    () => buildReschedulingDocument(request),
    [request],
  );
  const listedOn = formatRequestLongDate(request.listedOn);
  const purpose = courtHearingPurposeLabel(request.purpose);
  const currentHearing = `${listedOn} · ${purpose}`;

  return (
    <ApplicationReviewOverlay
      title={APPLICATION_TYPE_LABEL}
      description={senderLine(request)}
      facts={
        <>
          <ReviewRow term="Case number">
            <Identifier value={request.caseNumber} label="case number" />
          </ReviewRow>
          <ReviewRow term="Application sent on">
            {formatRequestLongDate(request.appliedOn)}
          </ReviewRow>
          <ReviewRow term="Current hearing">{currentHearing}</ReviewRow>
          <ReviewRow term="Proposed hearing date">
            {formatProposedDates(request.proposedOn)}
          </ReviewRow>
          <ReviewRow term="Consent of other parties">
            {consentLabel(request.partiesAgreed)}
          </ReviewRow>
        </>
      }
      document={document}
      onDownload={() => downloadReschedulingDocument(request)}
      onApprove={() => onApprove(request)}
      onReject={() => onReject(request)}
      onReturnFocus={onReturnFocus}
    />
  );
}
