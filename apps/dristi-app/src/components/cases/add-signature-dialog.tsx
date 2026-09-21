"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import {
  ChoicePillGroup,
  formatFileSize,
  validateSelectedFiles,
} from "@/components/cases/filing-form-shared";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
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
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  COURT_FEE,
  CourtFeeSummary,
} from "@/components/cases/submission-payment-dialog";
import { downloadGeneratedApplication } from "@/lib/cases/application-document";
import { type ApplicationDraft } from "@/lib/cases/application-draft";
import { applicationsFile } from "@/lib/cases/applications";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { Identifier } from "@/components/chrome/identifier";

const ACCEPTED_FILE_TYPES =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

type SignatureMethod =
  | "aadhaar-esign"
  | "upload-signed"
  | "sign-later"
  | "notify-senior";

/**
 * Two ways to sign now, two ways not to. They share one group because they
 * answer one question — what happens to the signature on this application —
 * and splitting them would ask it twice.
 */
const SIGNATURE_METHODS: { id: SignatureMethod; label: string }[] = [
  { id: "aadhaar-esign", label: "E-sign with Aadhaar" },
  { id: "upload-signed", label: "Upload document with signature" },
  { id: "sign-later", label: "Sign later" },
  { id: "notify-senior", label: "Notify senior" },
];

/** What a route costs or leaves behind, said before Proceed commits to it. */
const METHOD_NOTES: Partial<Record<SignatureMethod, string>> = {
  "aadhaar-esign":
    "Aadhaar e-sign is not connected yet. Choose Upload document with signature to continue.",
  "sign-later":
    "The application is saved unsigned and waits in Applications as Pending signature.",
  "notify-senior":
    "Your senior advocate is asked to sign this application. It waits in Applications until they do.",
};

type SignatureStep =
  | "method"
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
 * Aadhaar e-sign is selectable but gated: the QA review never observed the
 * provider flow, and faking an Aadhaar authentication is exactly the kind of
 * claimed system action the product rails prohibit. The upload path works
 * end to end because everything it does is local.
 *
 * Sign later and Notify senior (product's ask) leave the chain early: neither
 * signs, so neither reaches payment — an unsigned application has nothing to
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
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<SignatureStep>("method");
  const [method, setMethod] = useState<SignatureMethod | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [paid, setPaid] = useState(false);

  /**
   * The next application number this case would allot — existing
   * applications plus one, in the legacy's {case}-AP{n} shape. Dummy, but
   * grounded in what the register already holds rather than invented.
   */
  const submissionId = useMemo(() => {
    const count = applicationsFile(record).submissions.filter(
      (submission) => submission.kind === "application"
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
    setMethod("");
    setFile(null);
    setFileError(undefined);
    setPaid(false);
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

  function chooseFile(files: File[]) {
    if (files.length === 0) return;
    if (files.length > 1) {
      setFileError("Choose one signed document.");
      return;
    }
    const validationError = validateSelectedFiles(files);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setFile(files[0]);
    setFileError(undefined);
  }

  const stepTitle =
    step === "payment"
      ? "Payment"
      : step === "upload"
        ? "Upload signed document"
        : step === "signed"
          ? "Your signature"
          : step === "pending"
            ? method === "notify-senior"
              ? "Sent for signature"
              : "Saved for signature"
            : "Add signature";

  const stepDescription =
    step === "method"
      ? "Choose how this application will be signed, or leave it for later."
      : step === "upload"
        ? "Attach the signed copy of the generated application."
        : step === "signed"
          ? "The application is signed and ready to file."
          : step === "pending"
            ? "This application is not signed yet."
            : "Court fee for filing this application.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ChromeDialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
        // The primitive's small ghost X disappears against the dark surface
        // once there is no title row beside it — the success step swaps it
        // for a full-size outline close above the banner.
        showCloseButton={step !== "success"}
        // Radix's own restore lands on document.body here, so put focus back
        // on the button that opened the chain explicitly.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        {step === "success" ? (
          <SuccessContent
            titleRef={titleRef}
            paid={paid}
            submissionId={submissionId}
          />
        ) : (
          <DialogHeader>
            {/* The chip is the step's own status, so only the two steps that
                report one carry it. */}
            <div className="flex flex-wrap items-center gap-3">
              <DialogTitle
                ref={titleRef}
                tabIndex={-1}
                className="text-title-s font-semibold outline-none"
              >
                {stepTitle}
              </DialogTitle>
              {step === "signed" ? (
                <Badge variant="success">Signed</Badge>
              ) : null}
              {step === "pending" ? (
                <Badge variant="warning">Pending signature</Badge>
              ) : null}
            </div>
            <DialogDescription
              className={step === "signed" ? "sr-only" : "text-body-compact"}
            >
              {stepDescription}
            </DialogDescription>
          </DialogHeader>
        )}

        {step === "method" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <ChoicePillGroup
                legend="Your signature"
                options={SIGNATURE_METHODS}
                value={method}
                orientation="column"
                onChange={(value) => setMethod(value)}
              />
              {method && METHOD_NOTES[method] ? (
                <p className="text-body-compact text-muted-foreground">
                  {METHOD_NOTES[method]}
                </p>
              ) : null}
            </div>

            <p className="text-body text-muted-foreground">
              Want to download this submission?{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => downloadGeneratedApplication(draft, record)}
              >
                <DownloadIcon data-icon="inline-start" aria-hidden />
                Download
              </Button>
            </p>
          </div>
        ) : null}

        {step === "upload" ? (
          <Field data-invalid={Boolean(fileError)}>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(Array.from(event.dataTransfer.files));
              }}
              className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input p-6 text-center group-data-[invalid=true]/field:border-destructive"
            >
              <UploadIcon className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-body text-muted-foreground">
                Drag and drop the signed document, or
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Browse files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                tabIndex={-1}
                className="sr-only"
                aria-label="Choose the signed document"
                onChange={(event) => {
                  chooseFile(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </div>
            <FieldDescription className="text-body-compact">
              PDF, JPG, JPEG or PNG; maximum 10 MB. Upload a clear, straight
              image.
            </FieldDescription>
            <FieldError className="text-body-compact">{fileError}</FieldError>

            {file ? (
              <AttachmentGroup className="flex-col overflow-visible py-0 *:data-[slot=attachment]:w-full">
                <Attachment className="w-full">
                  <AttachmentMedia variant="icon">
                    <FileTextIcon aria-hidden />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {formatFileSize(file.size)} · selected locally
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      type="button"
                      variant="destructive-ghost"
                      size="icon"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFile(null)}
                    >
                      <Trash2Icon aria-hidden />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </AttachmentGroup>
            ) : null}
          </Field>
        ) : null}

        {step === "signed" ? (
          <Banner variant="success">
            Signature added to this application.
          </Banner>
        ) : null}

        {/* The chip above already says Pending signature, so this says only
            what happens next — a second amber block would repeat it louder. */}
        {step === "pending" ? (
          <p className="text-body text-muted-foreground">
            {method === "notify-senior"
              ? "Your senior advocate has been asked to sign it. It waits in Applications as Pending signature until they do."
              : "It waits in Applications as Pending signature. Add signature from there when you are ready."}
          </p>
        ) : null}

        {/* The register's payment dialog shows the same block. */}
        {step === "payment" ? <CourtFeeSummary /> : null}

        <DialogFooter>
          {step === "method" ||
          step === "upload" ||
          step === "signed" ||
          step === "pending" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step === "upload" || step === "pending") setStep("method");
                else if (step === "signed") setStep("upload");
                else {
                  reset();
                  onBack();
                }
              }}
            >
              Back
            </Button>
          ) : null}

          {step === "method" ? (
            <Button
              type="button"
              disabled={method === "" || method === "aadhaar-esign"}
              onClick={() =>
                setStep(method === "upload-signed" ? "upload" : "pending")
              }
            >
              Proceed
            </Button>
          ) : null}

          {step === "pending" ? (
            <Button type="button" onClick={finish}>
              Done
            </Button>
          ) : null}

          {step === "upload" ? (
            <Button
              type="button"
              disabled={!file}
              onClick={() => setStep("signed")}
            >
              Submit signature
            </Button>
          ) : null}

          {step === "signed" ? (
            <Button type="button" onClick={() => setStep("payment")}>
              Proceed to payment
            </Button>
          ) : null}

          {step === "payment" ? (
            <>
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
            </>
          ) : null}

          {step === "success" ? (
            <>
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
            </>
          ) : null}
        </DialogFooter>
      </ChromeDialogContent>
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
      {/* The step's own close — full-size and outlined, where the
          primitive's small ghost X vanished against the dark surface. */}
      <div className="flex justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Done"
          >
            <XIcon aria-hidden />
          </Button>
        </DialogClose>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-success p-6 text-center">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-title-s font-semibold text-success-foreground outline-none"
        >
          You have successfully made a submission
        </DialogTitle>
        <span className="flex size-10 items-center justify-center rounded-full bg-success-foreground">
          <CheckIcon className="size-6 text-success" aria-hidden />
        </span>
      </div>
      <DialogDescription className="sr-only">
        The application has been submitted.
      </DialogDescription>

      {paid ? (
        <Banner variant="success">Court fee of {COURT_FEE} paid.</Banner>
      ) : (
        <Banner variant="warning">
          Payment pending — this application moves forward once the court fee
          is paid.
        </Banner>
      )}

      <DescriptionList className="rounded-lg bg-surface-sunken px-4 py-1">
        <DescriptionRow className="grid-cols-[1fr_auto] items-center">
          <DescriptionTerm className="text-body">
            Submission date
          </DescriptionTerm>
          <DescriptionDetails className="text-body">
            {formatCaseDate(new Date().toISOString())}
          </DescriptionDetails>
        </DescriptionRow>
        <DescriptionRow className="grid-cols-[1fr_auto] items-center">
          <DescriptionTerm className="text-body">Submission ID</DescriptionTerm>
          {/* The value is its own copy control now, so the icon button beside it
              went with the conversion — same confirmation, one thing to hit. */}
          <DescriptionDetails className="flex items-center gap-2 text-body font-medium">
            <Identifier value={submissionId} label="submission id" />
          </DescriptionDetails>
        </DescriptionRow>
      </DescriptionList>
    </div>
  );
}
