"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { DocumentPreview } from "@/components/cases/document-preview";
import { SignMethodDialog } from "@/components/employee/sign-method-dialog";
import {
  signatureSubject,
  useSignatureChoice,
} from "@/components/employee/sign-signature-fields";
import {
  useHeld,
  useSignStepHandoff,
} from "@/components/employee/use-sign-step-handoff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { causeTitle } from "@/lib/employee/hearings";
import {
  buildSignFormDocument,
  downloadSignFormDocument,
  signFormProcessLabel,
  type SignForm,
  type SignFormDocument,
} from "@/lib/employee/sign-forms";
import { Identifier } from "@/components/chrome/identifier";

/**
 * One form, read and then signed — the single-document path off the signing queue.
 *
 * Two overlays, and the reference gives each its own size for a reason. Reading is the
 * wide step: the document *is* the task, so it is a `height="fill"` `DocumentPreview`
 * in a tall dialog, the same layout `ReschedulingRequestDialog` already uses to review
 * an application. Signing is the narrow step: a note saying what is about to be signed,
 * the choice of how, and Submit.
 *
 * They are two Dialogs, sequenced, rather than two steps inside one. Swapping the
 * content of an already-open overlay skips the DS enter animation and jumps the box
 * from the document size to the method size in one frame — which is how Add signature
 * used to come up. Closing the document first, then opening the method dialog after
 * that close has finished, keeps one focus scope at a time and lets the second overlay
 * fade and zoom in. `useSignStepHandoff` is that sequence.
 *
 * Download does not sit in the footer as the reference draws it. `DocumentPreview` owns
 * a sticky header with Download and Full view in it, and repeating Download below would
 * be the same control twice in one dialog — so the footer keeps only the act the dialog
 * exists to complete. The signing overlay has no preview, so Download comes back there,
 * which is where the reference puts it too.
 *
 * **Submit signs nothing.** It drops the row from the demo queue and closes — see
 * `lib/employee/sign-forms.ts`. Nothing is written, sent, or filed, and no e-sign
 * provider is called.
 */
export function SignFormDialog({
  form,
  onOpenChange,
  onSign,
  onReturnFocus,
}: {
  form: SignForm | null;
  onOpenChange: (form: SignForm | null) => void;
  onSign: (form: SignForm) => void;
  onReturnFocus: () => void;
}) {
  const held = useHeld(form);
  const handoff = useSignStepHandoff(form !== null);
  const choice = useSignatureChoice();

  React.useEffect(() => {
    if (!form) return;
    choice.reset();
    // Opening a form (or a different form) starts with an empty method. The handoff
    // keeps `form` set, so this does not run between the document and Add signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on identity, not on every choice render
  }, [form?.id]);

  if (!held) return null;

  function dismiss() {
    onOpenChange(null);
  }

  return (
    <>
      <Dialog
        open={handoff.readOpen}
        onOpenChange={(open) => handoff.onReadOpenChange(open, dismiss)}
      >
        <SignFormReadBody
          form={held}
          onProceed={handoff.goToSign}
          onCloseAutoFocus={(event) =>
            handoff.onReadCloseAutoFocus(event, onReturnFocus)
          }
        />
      </Dialog>

      <SignMethodDialog
        open={handoff.signOpen}
        onOpenChange={(open) => handoff.onSignOpenChange(open, dismiss)}
        onCloseAutoFocus={(event) =>
          handoff.onSignCloseAutoFocus(event, onReturnFocus)
        }
        noun="form"
        subject={signatureSubject([held])}
        download={{
          prompt: "Want to read the form again?",
          onDownload: () => downloadSignFormDocument(held),
        }}
        choice={choice}
        onBack={handoff.goToRead}
        onSubmit={() => onSign(held)}
      />
    </>
  );
}

function SignFormReadBody({
  form,
  onProceed,
  onCloseAutoFocus,
}: {
  form: SignForm;
  onProceed: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const document = React.useMemo(() => buildSignFormDocument(form), [form]);
  const process = signFormProcessLabel(form.process);

  return (
    <ChromeDialogContent
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-title-s font-semibold">
            {process}
          </DialogTitle>
          {/* The form's own state — waiting for this bench's signature — in the
              DS's sentence case rather than the reference's `PENDING_REVIEW`.
              `warning` is the variant `ReschedulingRequestDialog` already spends on
              a pending application, so the two court-side review overlays report a
              pending state the same way. */}
          <Badge variant="warning">Pending signature</Badge>
        </div>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(form)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={form.caseNumber} label="case number" copyable={false} />
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col p-6">
        <DocumentPreview
          className="min-h-96 md:min-h-0"
          height="fill"
          title={document.title}
          source={{
            kind: "composed",
            content: <FormFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadSignFormDocument(form),
            label: `Download ${document.title}`,
          }}
        />
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0">
        <Button type="button" onClick={onProceed}>
          Proceed to sign
        </Button>
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/**
 * The form itself as paper — the same facsimile treatment the rescheduling review
 * overlay uses, bound to this form's own particulars.
 */
function FormFacsimile({ document }: { document: SignFormDocument }) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body font-semibold">{document.matter}</p>
      </header>

      <h3 className="text-center text-body font-semibold">{document.title}</h3>

      <ol className="flex list-decimal flex-col gap-3 ps-6">
        {document.paragraphs.map((paragraph, index) => (
          <li key={index} className="text-body">
            {paragraph}
          </li>
        ))}
      </ol>

      <p className="text-body">{document.closing}</p>
      <p className="text-body">Dated this the {document.dated}.</p>

      <section className="flex flex-col gap-1">
        <h4 className="text-body font-semibold">Deponent</h4>
        <p className="text-body">{document.deponent.name}</p>
        <p className="text-body-compact text-paper-muted-foreground">
          {document.deponent.capacity}
        </p>
      </section>

      <p className="text-body">{document.attestation}</p>

      {document.advocate ? (
        <section className="flex flex-col gap-1">
          <h4 className="text-body font-semibold">Advocate</h4>
          <p className="text-body">{document.advocate}</p>
        </section>
      ) : null}
    </article>
  );
}
