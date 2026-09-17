"use client";

import { useEffect, useRef, useState } from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import {
  ChoicePillGroup,
  FileField,
} from "@/components/cases/filing-form-shared";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import {
  batchAction,
  filingStatusLabel,
  filingStatusVariant,
  submissionTypeLabel,
  submittedByName,
  submittedBySideLabel,
  type AttentionGroupEntry,
  type SubmissionPerson,
} from "@/lib/cases/applications";
import { formatCaseDate } from "@/lib/cases/types";

type SignatureMethod = "aadhaar-esign" | "upload-signed";

/** The same two routes the Raise application chain offers, in its words. */
const SIGNATURE_METHODS: { id: SignatureMethod; label: string }[] = [
  { id: "aadhaar-esign", label: "E-sign with Aadhaar" },
  { id: "upload-signed", label: "Upload document with signature" },
];

type BatchStep = "review" | "method" | "upload" | "signed";

/**
 * What the one CTA of a grouped attention entry covers, named in full before
 * it is taken — a batch that hides its members is a batch you cannot check —
 * and then the signing itself, as steps of the same dialog.
 *
 * The chain mirrors Raise application's signature dialogs, because it is the
 * same job done for a set: choose a method → attach the signed copy of each
 * submission → signed confirmation. Aadhaar e-sign is selectable but gated
 * there and here: the provider flow is not connected, and faking an Aadhaar
 * authentication is exactly the kind of claimed system action the product
 * rails prohibit. The upload path works end to end because everything it
 * does is local.
 *
 * Payment is deliberately not part of this chain: a batch cannot state a
 * total (see BATCH_ACTIONS). Signing hands each submission back to the
 * register as Pending payment, where it carries its own fee and its own CTA.
 */
export function SubmissionBatchDialog({
  peopleById,
  group,
  onOpenChange,
  onSigned,
}: {
  peopleById: Map<string, SubmissionPerson>;
  group: AttentionGroupEntry | null;
  onOpenChange: (group: AttentionGroupEntry | null) => void;
  /** The set is signed — the register moves those filings on from the well. */
  onSigned: (submissionIds: string[]) => void;
}) {
  return (
    <Dialog
      open={group !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {group ? (
        <BatchBody
          key={group.key}
          group={group}
          peopleById={peopleById}
          onSigned={onSigned}
          onClose={() => onOpenChange(null)}
        />
      ) : null}
    </Dialog>
  );
}

function BatchBody({
  group,
  peopleById,
  onSigned,
  onClose,
}: {
  group: AttentionGroupEntry;
  peopleById: Map<string, SubmissionPerson>;
  onSigned: (submissionIds: string[]) => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<BatchStep>("review");
  const [method, setMethod] = useState<SignatureMethod | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  /**
   * Swapping the step replaces the dialog's content wholesale; landing focus
   * on the new title is what announces the change. Initial open keeps Radix's
   * own focus handling — this only runs on a step change.
   */
  useEffect(() => {
    if (step !== "review") titleRef.current?.focus();
  }, [step]);

  const action = batchAction(group.status);
  if (!action) return null;

  const [lead] = group.submissions;
  const count = group.submissions.length;
  const signable = files.length > 0;

  function finish() {
    onSigned(group.submissions.map((submission) => submission.id));
    onClose();
  }

  return (
    <ChromeDialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-title-s font-semibold outline-none"
          >
            {step === "review"
              ? action.confirm(count)
              : step === "method"
                ? action.cta
                : step === "upload"
                  ? "Upload signed document"
                  : "Your signatures"}
          </DialogTitle>
          <Badge
            variant={
              step === "signed" ? "success" : filingStatusVariant(group.status)
            }
          >
            {step === "signed" ? "Signed" : filingStatusLabel(group.status)}
          </Badge>
        </div>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {step === "review"
            ? `${submittedBySideLabel(lead, peopleById)} · ${submittedByName(
                lead,
                peopleById
              )}`
            : step === "method"
              ? count === 1
                ? "Choose how this application will be signed."
                : "Choose how these applications will be signed."
              : step === "upload"
                ? count === 1
                  ? "Upload the signed copy."
                  : `One signed copy signs all ${count} applications.`
                : count === 1
                  ? "This application is signed. Payment is next."
                  : "These applications are signed. Payment is next."}
        </DialogDescription>
      </DialogHeader>
      <Separator />
      {/*
        The content scrolls, the footer does not: the control for the step
        stays in view with what it acts on, including at 200% text zoom. Same
        structure as the record dialogs; DialogFooter's -mx-6/-mb-6 assume a
        p-6 parent, and this content is flush, so those are cancelled here.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {step === "review" ? (
            <ItemGroup className="gap-2">
              {group.submissions.map((submission) => (
                <Item
                  key={submission.id}
                  role="listitem"
                  variant="outline"
                  className="items-start gap-3 p-4 hover:bg-card"
                >
                  <ItemContent className="min-w-0 gap-1">
                    <ItemTitle className="line-clamp-none">
                      {submissionTypeLabel(submission.type)}
                    </ItemTitle>
                    <ItemDescription className="line-clamp-none text-body-compact text-muted-foreground">
                      Created {formatCaseDate(submission.addedOn)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          ) : null}

          {step === "method" ? (
            <div className="flex flex-col gap-2">
              <ChoicePillGroup
                legend="Your signature"
                options={SIGNATURE_METHODS}
                value={method}
                onChange={(value) => setMethod(value)}
              />
              {method === "aadhaar-esign" ? (
                <p className="text-body-compact text-muted-foreground">
                  Aadhaar e-sign is not connected yet. Choose Upload document
                  with signature to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          {/*
            One upload for the set: signing is one act here, so what is
            attached is registered against every submission the batch covers.
            The list under the field is what says which those are — the field
            alone cannot, and a batch that hides its members is a batch you
            cannot check.
          */}
          {step === "upload" ? (
            <div className="flex flex-col gap-4">
              <FileField
                required
                label="Signed document"
                description="Attached to every submission listed below."
                files={files}
                error={error}
                onFilesChange={setFiles}
                onErrorChange={setError}
              />
              <ul
                aria-label="Submissions this signature is added to"
                className="flex flex-col gap-1"
              >
                {group.submissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="text-body-compact text-muted-foreground"
                  >
                    {submission.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "signed" ? (
            <div className="flex flex-col gap-4">
              <Banner variant="success">
                Signatures added to {count} submissions.
              </Banner>
              <p className="text-body-compact text-muted-foreground">
                Each one moves to Pending payment in the register, where the
                court fee finishes the filing.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0">
          {step === "review" ? (
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setStep(
                  step === "method"
                    ? "review"
                    : step === "upload"
                      ? "method"
                      : "upload"
                )
              }
            >
              Back
            </Button>
          )}

          {step === "review" ? (
            <Button type="button" onClick={() => setStep("method")}>
              {action.cta}
            </Button>
          ) : null}

          {step === "method" ? (
            <Button
              type="button"
              disabled={method !== "upload-signed"}
              onClick={() => setStep("upload")}
            >
              Proceed
            </Button>
          ) : null}

          {step === "upload" ? (
            <Button
              type="button"
              disabled={!signable}
              onClick={() => setStep("signed")}
            >
              Submit signatures
            </Button>
          ) : null}

          {step === "signed" ? (
            <Button type="button" onClick={finish}>
              Done
            </Button>
          ) : null}
        </DialogFooter>
      </div>
    </ChromeDialogContent>
  );
}
