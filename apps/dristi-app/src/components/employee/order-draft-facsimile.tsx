/**
 * The draft order as paper — the same facsimile treatment the signing queues use
 * (`sign-order-dialog.tsx`'s `OrderFacsimile`), bound to a listing's or a complaint's own
 * draft rather than a queued, already-added order.
 *
 * Shared between the hearing composer (`order-screen.tsx`, `OrderDocument` from
 * `order-draft.ts`) and the cognizance composite (`cognizance-order-screen.tsx`, which
 * has no `OrderDocument` — a complaint carries no attendance or applications to fold in)
 * on a structural type rather than either one's own: both draw the same six facts and
 * one passage, and duplicating this component per screen would risk the "two answers to
 * what an order says" objection this codebase already states elsewhere.
 *
 * `document.body` is the one passage a composer writes: attendance, applications and the
 * next hearing are folded into it already, where the screen has any of those
 * (`upsertRichTextFact`, `upsertRichTextSentence` in `order-items.ts`), so unlike the
 * signing queue's flat `paragraphs` this only ever has one thing to render, as the rich
 * text it already is.
 */
export type DraftFacsimileDocument = {
  court: string;
  caseNumber: string;
  matter: string;
  title: string;
  body: { html: string; pending: boolean };
  dated: string;
  signature: string;
};

export function OrderDraftFacsimile({
  document,
}: {
  document: DraftFacsimileDocument;
}) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">Case no. {document.caseNumber}</p>
        <p className="text-body font-semibold">{document.matter}</p>
      </header>

      <h3 className="text-center text-body font-semibold">{document.title}</h3>

      {document.body.pending ? (
        <p className="text-body text-paper-muted-foreground">
          No order has been written.
        </p>
      ) : (
        <div
          className="text-body [&_p]:mb-3 [&_p:last-child]:mb-0"
          // The composer's own escaped markup (`richTextFromPlain`), never external HTML.
          dangerouslySetInnerHTML={{ __html: document.body.html }}
        />
      )}

      <p className="text-body">Dated this the {document.dated}.</p>

      <p className="text-body text-paper-muted-foreground">{document.signature}</p>
    </article>
  );
}
