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
  buildSignOrderDocument,
  downloadSignOrderDocument,
  formatSignOrderDate,
  signOrderStatusLabel,
  signOrderTypeLabel,
  type SignOrder,
  type SignOrderDocument,
} from "@/lib/employee/sign-orders";
import { Identifier } from "@/components/chrome/identifier";

/** What the paper is called in the signature overlay's copy. */
const NOUN = "order";

/**
 * What the bench is about to sign, in one sentence.
 *
 * Named rather than counted, the way `signatureSubject` does it for forms — and here the
 * name is the title, because a case can carry four orders and "the order in ST/606/2026"
 * would not tell the bench which of them. Only the single-order path reaches this.
 */
function orderSubject(order: SignOrder): string {
  return `You are adding your signature to the ${signOrderTypeLabel(order.type)} order in ${order.caseNumber}.`;
}

/**
 * One order, read and then signed — the single-order path off the signing queue.
 *
 * Two overlays, and each gets its own size for the reason `SignFormDialog` gives. Reading
 * is the wide step: the document *is* the task, so it is a `height="fill"`
 * `DocumentPreview` in a tall overlay. Signing is the narrow step: a note saying what is
 * about to be signed, the choice of how (e-sign or upload), and Submit.
 *
 * **The signature overlay is owner-requested (2026-09-06).** The original build took Sign
 * and publish as the act itself, because an order is signed by the bench already logged
 * in and the 1.0 reference asked nothing about how. The owner now wants the same choice
 * the forms and bail-bond queues ask, reached from that same button — so the first
 * overlay still says Sign and publish, and the second is where the signature is chosen.
 *
 * They are two Dialogs, sequenced, rather than two steps inside one. Swapping the
 * content of an already-open overlay skips the DS enter animation and jumps the box
 * from the document size to the method size in one frame — which is how Add signature
 * used to come up. `useSignStepHandoff` closes the document first, then opens the
 * method dialog after that close has finished, so one focus scope is kept at a time
 * and the second overlay fades and zooms in.
 *
 * A signed order opens here too, read-only. It is the only way to see what was signed
 * without leaving the screen, and offering it costs nothing but the button.
 *
 * **Submit signs nothing.** It marks the row signed in the demo queue and closes — see
 * `lib/employee/sign-orders.ts`. Nothing is written, published, sent or filed, and no
 * e-sign provider is called.
 */
export function SignOrderDialog({
  order,
  onOpenChange,
  onSign,
  onReturnFocus,
}: {
  order: SignOrder | null;
  onOpenChange: (order: SignOrder | null) => void;
  onSign: (order: SignOrder) => void;
  onReturnFocus: () => void;
}) {
  const held = useHeld(order);
  const handoff = useSignStepHandoff(order !== null);
  const choice = useSignatureChoice(NOUN);

  React.useEffect(() => {
    if (!order) return;
    choice.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on identity, not on every choice render
  }, [order?.id]);

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
        <SignOrderReadBody
          order={held}
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
        noun={NOUN}
        subject={orderSubject(held)}
        warning="Signing publishes this order and cannot be reversed."
        download={{
          prompt: "Want to read the order again?",
          onDownload: () => downloadSignOrderDocument(held),
        }}
        choice={choice}
        onBack={handoff.goToRead}
        onSubmit={() => onSign(held)}
      />
    </>
  );
}

function SignOrderReadBody({
  order,
  onProceed,
  onCloseAutoFocus,
}: {
  order: SignOrder;
  onProceed: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const document = React.useMemo(() => buildSignOrderDocument(order), [order]);
  const pending = order.status === "pending-signature";

  return (
    <ChromeDialogContent
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:h-[85dvh]"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* `pr-16` keeps the title clear of the close button the DS places top-right. */}
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-title-s font-semibold">
            {signOrderTypeLabel(order.type)}
          </DialogTitle>
          <Badge variant={pending ? "warning" : "success"}>
            {signOrderStatusLabel(order.status)}
          </Badge>
        </div>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(order)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={order.caseNumber} label="case number" copyable={false} />{" "}
          ·{" "}
          {pending
            ? `Added ${formatSignOrderDate(order.addedOn)}`
            : `Signed ${formatSignOrderDate(order.signedOn ?? order.addedOn)}`}
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
            content: <OrderFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadSignOrderDocument(order),
            label: `Download the ${document.title.toLowerCase()} order`,
          }}
        />
      </div>

      {pending ? (
        <DialogFooter className="mx-0 mb-0 shrink-0">
          <Button type="button" onClick={onProceed}>
            Sign and publish
          </Button>
        </DialogFooter>
      ) : null}
    </ChromeDialogContent>
  );
}

/**
 * The order itself as paper — the same facsimile treatment the two other court-side
 * overlays use, bound to this order's own particulars.
 */
function OrderFacsimile({ document }: { document: SignOrderDocument }) {
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

      <p className="text-body">Dated this the {document.dated}.</p>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}
