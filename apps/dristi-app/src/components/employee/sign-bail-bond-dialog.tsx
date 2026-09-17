"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { DocumentPreview } from "@/components/cases/document-preview";
import { SignMethodDialog } from "@/components/employee/sign-method-dialog";
import { useSignatureChoice } from "@/components/employee/sign-signature-fields";
import {
  useHeld,
  useSignStepHandoff,
} from "@/components/employee/use-sign-step-handoff";
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
  buildSignBailBondDocument,
  downloadSignBailBondDocument,
  formatSignBailBondDate,
  type SignBailBond,
  type SignBailBondDocument,
} from "@/lib/employee/sign-bail-bonds";
import { Identifier } from "@/components/chrome/identifier";

/** What the paper is called in the signature overlay's copy. */
const NOUN = "bail bond";

/**
 * What the bench is about to sign, in one sentence.
 *
 * Named rather than counted, the way `signatureSubject` does it for forms — and here the
 * name is the litigant, because a case can carry two bonds and "2 bail bonds" would not
 * tell the bench which two. Only the single-bond path reaches this: the bulk path signs
 * without a signature step, so it has nothing to caption.
 */
function bondSubject(bond: SignBailBond): string {
  return `You are adding your signature to the bail bond of ${bond.litigant} in ${bond.caseNumber}.`;
}

/**
 * One bail bond, read and then signed or refused — the single-bond path off the queue.
 *
 * Two overlays, and each gets its own size for the reason `SignFormDialog` gives. Reading
 * is the wide step: the document *is* the task, so it is a `height="fill"`
 * `DocumentPreview` in a tall overlay. Signing is the narrow step: a note saying what is
 * about to be signed, the choice of how, and Submit.
 *
 * **The signature overlay is a departure from the reference**, made on the owner's
 * instruction (2026-09-03). The reference took Proceed to sign straight to a Confirm sign
 * modal and asked nothing about how the signature gets on the paper. A bail bond is
 * executed by the accused and the surety before the bench attests it, so "upload the bond
 * they signed" is a real path in a way it is not for an order — which is why this queue
 * follows the forms queue here rather than the orders queue.
 *
 * They are two Dialogs, sequenced, rather than two steps inside one. Swapping the
 * content of an already-open overlay skips the DS enter animation and jumps the box
 * from the document size to the method size in one frame — which is how Add signature
 * used to come up. `useSignStepHandoff` closes the document first, then opens the
 * method dialog after that close has finished, so one focus scope is kept at a time
 * and the second overlay fades and zooms in.
 *
 * **Reject** refuses the bond and it leaves the bench unsigned — no reason is asked for,
 * because the reference asks for none and a reasons taxonomy invented for a demo would be
 * inventing product. It stays on the reading overlay, where the bench can still see what
 * it is refusing.
 *
 * **Submit signs nothing.** It moves the row's status in the demo queue and closes — see
 * `lib/employee/sign-bail-bonds.ts`. Nothing is written, published or sent, and no e-sign
 * provider is called.
 */
export function SignBailBondDialog({
  bond,
  onOpenChange,
  onSign,
  onReject,
  onReturnFocus,
}: {
  bond: SignBailBond | null;
  onOpenChange: (bond: SignBailBond | null) => void;
  onSign: (bond: SignBailBond) => void;
  onReject: (bond: SignBailBond) => void;
  onReturnFocus: () => void;
}) {
  const held = useHeld(bond);
  const handoff = useSignStepHandoff(bond !== null);
  const choice = useSignatureChoice(NOUN);

  React.useEffect(() => {
    if (!bond) return;
    choice.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on identity, not on every choice render
  }, [bond?.id]);

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
        <SignBailBondReadBody
          bond={held}
          onProceed={handoff.goToSign}
          onReject={() => onReject(held)}
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
        noun={NOUN}
        subject={bondSubject(held)}
        warning="Signing publishes this bond and cannot be reversed."
        download={{
          prompt: "Want to read the bond again?",
          onDownload: () => downloadSignBailBondDocument(held),
        }}
        choice={choice}
        onBack={handoff.goToRead}
        onSubmit={() => onSign(held)}
      />
    </>
  );
}

function SignBailBondReadBody({
  bond,
  onProceed,
  onReject,
  onCloseAutoFocus,
}: {
  bond: SignBailBond;
  onProceed: () => void;
  onReject: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const document = React.useMemo(
    () => buildSignBailBondDocument(bond),
    [bond],
  );

  return (
    <ChromeDialogContent
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* `pr-16` keeps the title clear of the close button the DS places top-right.
          The reference titles this overlay with the cause and the paper — "… vs … -
          Bail Bond" — and that is the right pair: the bond has no name of its own. */}
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <DialogTitle className="text-title-s font-semibold">
          {causeTitle(bond)} — Bail bond
        </DialogTitle>
        {/* The litigant leads the supporting line rather than the case number,
            because with two bonds to a case the litigant is the only thing that says
            which of them is open. */}
        <DialogDescription className="text-body-compact text-muted-foreground">
          Executed by {bond.litigant} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={bond.caseNumber} label="case number" copyable={false} />{" "}
          · Added{" "}
          {formatSignBailBondDate(bond.addedOn)}
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
            content: <BailBondFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadSignBailBondDocument(bond),
            label: `Download the bail bond of ${bond.litigant}`,
          }}
        />
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0">
        <Button type="button" variant="outline" onClick={onReject}>
          Reject
        </Button>
        <Button type="button" onClick={onProceed}>
          Proceed to sign
        </Button>
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/**
 * The bond itself as paper — the same facsimile treatment the other court-side overlays
 * use, laid out the way the reference lays this one out.
 *
 * The reference's own order: the case number on its own line, the court as the document's
 * heading, then the register line and the cause, then the bond. The court heading is the
 * one line that steps up a size — it is the paper's own heading, and the paper is its own
 * surface — while everything under it stays body copy, which keeps the facsimile to the
 * two weights ui-craft §1.3 allows.
 */
function BailBondFacsimile({ document }: { document: SignBailBondDocument }) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-4">
        <p className="text-center text-body tabular-nums">
          Case Number: {document.caseNumber}
        </p>
        <h3 className="text-center text-title-s font-semibold">
          {document.court}
        </h3>
        <div className="flex flex-col gap-1">
          <p className="text-body tabular-nums">{document.register}</p>
          <p className="text-body">{document.matter}</p>
        </div>
      </header>

      <h4 className="text-center text-body font-semibold">{document.title}</h4>

      <div className="flex flex-col gap-3">
        {document.recital.map((paragraph, index) => (
          <p key={index} className="text-body">
            {paragraph}
          </p>
        ))}
      </div>

      <ol className="flex list-decimal flex-col gap-3 ps-6">
        {document.undertakings.map((clause, index) => (
          <li key={index} className="text-body">
            {clause}
          </li>
        ))}
      </ol>

      <p className="text-body">Dated this the {document.dated}.</p>

      {/* Who put their hand to it. A description list rather than prose, because the
          reference's paper signs itself in a block and a bench checking a bond checks the
          surety by name. */}
      <dl className="flex flex-col gap-2">
        {document.signatories.map((entry) => (
          <div key={entry.role} className="flex flex-wrap gap-2">
            <dt className="text-body text-paper-muted-foreground">
              {entry.role}:
            </dt>
            <dd className="text-body">{entry.name}</dd>
          </div>
        ))}
      </dl>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}
