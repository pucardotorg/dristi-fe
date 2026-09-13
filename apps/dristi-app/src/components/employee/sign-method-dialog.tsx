"use client";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import {
  SignatureFields,
  type SignatureChoice,
} from "@/components/employee/sign-signature-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Add signature — the second overlay on the single-document path.
 *
 * Its own Dialog, not a step inside the document overlay, so it comes up with the
 * DS enter animation (`fade-in` + `zoom-in-95`) after that overlay has left. The
 * document overlay is wide because the paper *is* the task; this one is the narrow
 * method choice, and jumping between those sizes in one already-open box is what
 * made the step feel like it snapped into place.
 *
 * Back closes this overlay and re-opens the document on the two-step queues;
 * the composer omits it because this overlay is already the first step. Submit
 * is the act. Neither is invented here — each queue passes its own noun,
 * subject, download and warning.
 */
export function SignMethodDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  noun,
  subject,
  warning,
  download,
  choice,
  onBack,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  /** What the paper is called — form, order, bail bond. */
  noun: string;
  subject: string;
  /**
   * What the act means, said at the moment of the act. Omitted where the queue
   * already said it on the document overlay.
   */
  warning?: string;
  /**
   * Offered where the paper is off-screen and there is one document to offer.
   * Optional when the caller already has the paper on screen — the composer
   * does, and offering a file of an unissued order would claim a court
   * record. The queues still pass it.
   */
  download?: { prompt: string; onDownload: () => void };
  choice: SignatureChoice;
  /**
   * Returns to the document overlay on the two-step queues. Omitted when this
   * overlay is the first step — there is nothing to go back to, and a Back
   * that only closes would compete with the close button for the same job.
   */
  onBack?: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ChromeDialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className="text-title-s font-semibold">
            Add signature
          </DialogTitle>
          <DialogDescription className="text-body-compact">
            Choose how you will sign this {noun}.
          </DialogDescription>
        </DialogHeader>

        <SignatureFields
          choice={choice}
          noun={noun}
          subject={subject}
          download={download}
        />

        {warning ? (
          <p className="text-caption text-muted-foreground">{warning}</p>
        ) : null}

        <DialogFooter>
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={!choice.canSubmit}
            onClick={onSubmit}
          >
            Submit
          </Button>
        </DialogFooter>
      </ChromeDialogContent>
    </Dialog>
  );
}
