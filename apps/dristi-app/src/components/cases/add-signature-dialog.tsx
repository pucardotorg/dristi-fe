"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  SignatureIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";

import { FlowDialogContent } from "@/components/chrome/flow-dialog";

import { SignMethodCard } from "@/components/cases/party-application";
import {
  UPLOAD_HELP,
  UploadedDocField,
} from "@/components/cases/uploaded-doc-field";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  COURT_FEE,
  CourtFeeSummary,
} from "@/components/cases/submission-payment-dialog";
import { downloadGeneratedApplication } from "@/lib/cases/application-document";
import { type ApplicationDraft } from "@/lib/cases/application-draft";
import { applicationTypeGuide } from "@/lib/cases/application-type-guide";
import { applicationsFile } from "@/lib/cases/applications";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { Identifier } from "@/components/chrome/identifier";
import { cn } from "@/lib/utils";

type SignatureStep =
  | "method"
  | "aadhaar"
  | "upload"
  | "signed"
  | "payment"
  | "success"
  /** Signed by nobody yet — Sign later and Notify senior both land here. */
  | "pending";

/**
 * The chain after Generate application, mirroring the legacy portal's
 * modals: choose a signature method → upload the signed copy → signed
 * confirmation → court-fee payment → submission confirmation. One dialog,
 * one step union — the legacy's separate modals are steps of the same task.
 *
 * The signing step is the party applications' own (owner, Sept 21): method
 * cards that proceed on click, the shared upload slot, the warm footer band.
 * Aadhaar e-sign runs the same labelled sandbox round trip those use, so the
 * screen never claims a real authentication; its failure screen is reachable.
 *
 * Sign later leaves the chain early: it does not
 * sign, so it never reaches payment — an unsigned application has nothing to
 * file yet. Both end on the same confirmation, which states the one thing
 * that is true of each, that the application waits in Applications as Pending
 * signature. Nothing here persists, so nothing claims a signature was taken.
 *
 * Payment is deliberately not designed: Make payment marks the fee paid on
 * the spot (product's ask), and Skip leaves the submission pending payment —
 * the same state the Applications register already models.
 */
export function AddSignatureDialog({
  open,
  onOpenChange,
  draft,
  record,
  onBack,
  onComplete,
  onReturnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ApplicationDraft;
  record: CaseRecord;
  /** Return to the generated-application dialog. */
  onBack: () => void;
  /** The chain is done — leave for the Applications register. */
  onComplete: () => void;
  onReturnFocus: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<SignatureStep>("method");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [paid, setPaid] = useState(false);
  const [aadhaar, setAadhaar] = useState<"authenticating" | "failure">(
    "authenticating",
  );

  /**
   * Aadhaar e-sign: in the live service the person is taken to the e-sign
   * provider and the system is told when they finish. Here that round trip is
   * stood in for, the way the party applications do it, and labelled as a
   * sandbox on the screen itself. The failure path is reachable so that screen
   * exists for when the service says no.
   */
  useEffect(() => {
    if (!open || step !== "aadhaar" || aadhaar !== "authenticating") return;
    const timer = setTimeout(() => setStep("signed"), 2000);
    return () => clearTimeout(timer);
  }, [open, step, aadhaar]);

  /**
   * The next application number this case would allot — existing
   * applications plus one, in the legacy's {case}-AP{n} shape. Dummy, but
   * grounded in what the register already holds rather than invented.
   */
  const submissionId = useMemo(() => {
    const count = applicationsFile(record).submissions.filter(
      (submission) => submission.kind === "application",
    ).length;
    return `${record.caseNumber}-AP${count + 1}`;
  }, [record]);

  /**
   * Swapping the step replaces the dialog's content wholesale; landing focus
   * on the new title is what announces the change. Initial open keeps
   * Radix's own focus handling — this only runs on a step change.
   */
  useEffect(() => {
    if (step !== "method") titleRef.current?.focus();
  }, [step]);

  /** Every path out of the dialog runs through an event handler — reset there. */
  function reset() {
    setStep("method");
    setFile(null);
    setFileError(undefined);
    setPaid(false);
    setAadhaar("authenticating");
  }

  function finish() {
    reset();
    onComplete();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Once a confirmation is up, closing is finishing — dropping back into
      // the filled form after the screen said the application was submitted,
      // saved, or sent to a senior would contradict what was just shown.
      if (step === "success" || step === "pending") {
        finish();
        return;
      }
      reset();
    }
    onOpenChange(next);
  }

  const stepTitle =
    step === "payment"
      ? "Payment"
      : step === "upload"
        ? "Upload a signed copy"
        : step === "signed"
          ? "Your signature"
          : "How is this application signed?";

  const stepDescription =
    step === "method"
      ? "An unsigned application cannot be submitted to the court."
      : step === "upload"
        ? "The application, signed on paper or with a Digital Signature Certificate."
        : step === "signed"
          ? "The application is signed and ready to file."
          : "Court fee for filing this application.";

  const FOOTER =
    "flex shrink-0 flex-col-reverse gap-2 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between";

  function backToMethods() {
    setFileError(undefined);
    setStep("method");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FlowDialogContent
        ownBack
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        // Radix's own restore lands on document.body here, so put focus back
        // on the button that opened the chain explicitly.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        {step === "success" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <SuccessContent
              titleRef={titleRef}
              paid={paid}
              submissionId={submissionId}
            />
          </div>
        ) : step === "pending" ? (
          /*
            Saved for later, in the confirmation grammar the party applications
            end on: the mark, what happened, then the facts of the thing saved.
            Amber, not green: nothing is filed yet, and the register will call
            this Pending signature in the same colour.
          */
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 pr-12">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-warning-muted text-warning-muted-foreground"
              >
                <ClockIcon className="size-7" />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-body font-semibold text-balance outline-none"
                >
                  Saved. Waiting for your signature
                </DialogTitle>
                <DialogDescription>
                  Nothing has gone to the court yet. Sign it from the
                  case&apos;s Applications tab when you are ready.
                </DialogDescription>
              </div>
            </div>

            <dl className="flex flex-col rounded-lg bg-surface-sunken px-4 py-1 text-body-compact">
              <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5">
                <dt className="text-muted-foreground">Application</dt>
                <dd className="min-w-0 text-right font-medium">
                  {
                    applicationTypeGuide(draft.type || "application-others")
                      .label
                  }
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5">
                <dt className="text-muted-foreground">Case</dt>
                <dd className="font-medium">
                  <Identifier value={record.caseNumber} label="case number" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="warning">Pending signature</Badge>
                </dd>
              </div>
            </dl>
          </div>
        ) : step === "aadhaar" && aadhaar === "authenticating" ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <Spinner className="size-8 text-primary" />
            <div className="flex flex-col gap-1.5">
              <DialogTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-body font-semibold outline-none"
              >
                Signing with Aadhaar
              </DialogTitle>
              <DialogDescription>
                Complete the signature in the Aadhaar e-sign service. We record
                it here as soon as it is done.
              </DialogDescription>
            </div>
            <p className="text-caption text-muted-foreground">
              Sandbox. This completes automatically in a moment.
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-caption"
              onClick={() => setAadhaar("failure")}
            >
              Simulate a failed signature
            </Button>
          </div>
        ) : step === "aadhaar" ? (
          <>
            <div className="flex flex-1 flex-col items-center gap-4 px-6 py-12 text-center">
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-destructive-muted text-destructive-ink"
              >
                <XCircleIcon className="size-7" />
              </span>
              <div className="flex flex-col gap-1.5">
                <DialogTitle
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-body font-semibold text-balance outline-none"
                >
                  Signature not completed
                </DialogTitle>
                <DialogDescription className="text-balance">
                  The Aadhaar e-sign service could not complete the signature.
                  Nothing was recorded. Try again, or upload a signed copy
                  instead.
                </DialogDescription>
              </div>
            </div>
            <footer className={FOOTER}>
              <Button type="button" variant="outline" onClick={backToMethods}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setAadhaar("authenticating")}
              >
                Try again
              </Button>
            </footer>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0 gap-1.5 border-b border-hairline px-6 py-4 pr-12 text-left">
              {/* The chip is the step's own status, so only the two steps that
                  report one carry it. */}
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-body font-semibold text-balance outline-none"
                >
                  {stepTitle}
                </DialogTitle>
                {step === "signed" ? (
                  <Badge variant="success">Signed</Badge>
                ) : null}
              </div>
              <DialogDescription>{stepDescription}</DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-6",
                // Payment: the body is the well and the fees are the white
                // sheet on it, as in the View Case payment dialog.
                step === "payment" && "bg-surface-sunken",
              )}
            >
              {step === "method" ? (
                <>
                  {/* Two ways to sign now, two ways not to. One list, because
                      they answer one question: what happens to the signature
                      on this application. Choosing a card is what proceeds. */}
                  <SignMethodCard
                    icon={<SignatureIcon className="size-5" />}
                    tone="info"
                    title="E-Sign with Aadhaar OTP"
                    description="You are taken to the Aadhaar e-sign service. The signature is recorded here as soon as it is done."
                    onClick={() => {
                      setAadhaar("authenticating");
                      setStep("aadhaar");
                    }}
                  />
                  <SignMethodCard
                    icon={<UploadIcon className="size-5" />}
                    tone="warning"
                    title="Upload a signed copy"
                    description="One file that already carries the signature, on paper or by DSC."
                    onClick={() => {
                      setFileError(undefined);
                      setStep("upload");
                    }}
                  />
                  <SignMethodCard
                    icon={<ClockIcon className="size-5" />}
                    tone="neutral"
                    title="Sign later"
                    description="Saved unsigned. It waits in Applications as Pending signature."
                    onClick={() => {
                      setStep("pending");
                    }}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="mt-3 h-auto self-start p-0"
                    onClick={() => downloadGeneratedApplication(draft, record)}
                  >
                    <DownloadIcon data-icon="inline-start" aria-hidden />
                    Download this application
                  </Button>
                </>
              ) : null}

              {step === "upload" ? (
                <>
                  <Field data-invalid={Boolean(fileError) && !file}>
                    <FieldLabel className="block w-full font-semibold leading-snug">
                      Signed application
                    </FieldLabel>
                    <UploadedDocField
                      label="Signed application"
                      required
                      file={file}
                      onFileChange={(next) => {
                        setFile(next);
                        setFileError(undefined);
                      }}
                    />
                    <FieldDescription>{UPLOAD_HELP}</FieldDescription>
                  </Field>
                  <FieldError>{fileError}</FieldError>
                </>
              ) : null}

              {step === "signed" ? (
                <Banner variant="success">
                  Signature added to this application.
                </Banner>
              ) : null}

              {/* The register's payment dialog shows the same block. */}
              {step === "payment" ? <CourtFeeSummary /> : null}
            </div>
          </>
        )}

        {/* The signing flow's warm footer band; see `FLOW_FOOTER` in
            party-application.tsx. */}
        {step === "method" ? (
          <footer className={FOOTER}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onBack();
              }}
            >
              Back
            </Button>
          </footer>
        ) : null}

        {step === "upload" ? (
          <footer className={FOOTER}>
            <Button type="button" variant="outline" onClick={backToMethods}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!file) {
                  setFileError("Upload the signed application to continue.");
                  return;
                }
                setStep("signed");
              }}
            >
              Submit signature
            </Button>
          </footer>
        ) : null}

        {step === "signed" ? (
          <footer className={FOOTER}>
            <Button type="button" variant="outline" onClick={backToMethods}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep("payment")}>
              Proceed to payment
            </Button>
          </footer>
        ) : null}

        {step === "pending" ? (
          <footer className={FOOTER}>
            {/* Changing your mind is one click: back to the ways of signing. */}
            <Button type="button" variant="outline" onClick={backToMethods}>
              Sign now
            </Button>
            <Button type="button" onClick={finish}>
              Done
            </Button>
          </footer>
        ) : null}

        {step === "payment" ? (
          <footer className={cn(FOOTER, "bg-background")}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPaid(false);
                setStep("success");
              }}
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPaid(true);
                setStep("success");
              }}
            >
              Make payment
            </Button>
          </footer>
        ) : null}

        {step === "success" ? (
          <footer className={FOOTER}>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadGeneratedApplication(draft, record)}
            >
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Download submission
            </Button>
            {paid ? (
              <Button type="button" onClick={finish}>
                Done
              </Button>
            ) : (
              <Button type="button" onClick={() => setPaid(true)}>
                Make payment
              </Button>
            )}
          </footer>
        ) : null}
      </FlowDialogContent>
    </Dialog>
  );
}

/**
 * The submission confirmation, mirroring the legacy's final modal: solid
 * success banner, payment note, and the allotted submission ID. The banner
 * carries the DialogTitle so the confirmation is what a screen reader hears.
 */
function SuccessContent({
  titleRef,
  paid,
  submissionId,
}: {
  titleRef: React.Ref<HTMLHeadingElement>;
  paid: boolean;
  submissionId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* The bail dialog's done header: the mark in a tinted disc, then what
          happened. The legacy's solid green slab was the one screen in the
          chain that did not look like the rest of it. */}
      <div className="flex items-center gap-4 pr-8">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground"
        >
          <CheckCircle2Icon className="size-7" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-body font-semibold text-balance outline-none"
          >
            Application submitted
          </DialogTitle>
          <DialogDescription>
            It is with the court now. Track it in the case&apos;s Applications
            tab.
          </DialogDescription>
        </div>
      </div>

      {paid ? (
        <Banner variant="success">Court fee of {COURT_FEE} paid.</Banner>
      ) : (
        <Banner variant="warning">
          Payment pending — this application moves forward once the court fee is
          paid.
        </Banner>
      )}

      <DescriptionList className="rounded-lg bg-surface-sunken px-4 py-1">
        <DescriptionRow className="grid-cols-[1fr_auto] items-center">
          <DescriptionTerm className="text-body-compact">
            Submission date
          </DescriptionTerm>
          <DescriptionDetails className="text-body-compact">
            {formatCaseDate(new Date().toISOString())}
          </DescriptionDetails>
        </DescriptionRow>
        <DescriptionRow className="grid-cols-[1fr_auto] items-center">
          <DescriptionTerm className="text-body-compact">
            Submission ID
          </DescriptionTerm>
          {/* The value is its own copy control now, so the icon button beside it
              went with the conversion — same confirmation, one thing to hit. */}
          <DescriptionDetails className="flex items-center gap-2 text-body-compact font-medium">
            <Identifier value={submissionId} label="submission id" />
          </DescriptionDetails>
        </DescriptionRow>
      </DescriptionList>
    </div>
  );
}
