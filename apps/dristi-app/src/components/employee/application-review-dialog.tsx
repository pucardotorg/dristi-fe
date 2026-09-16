"use client";

import type { ReactNode } from "react";

import { DocumentPreview } from "@/components/cases/document-preview";
import { ReviewRow } from "@/components/cases/filing-form-shared";
import { StagedOverlay } from "@/components/chrome/staged-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { DialogDescription } from "@/components/ui/dialog";

/**
 * One application, as paper.
 *
 * Every court-side review queue holds the same object — a party asking this court
 * for something — so they compose the same document: a court heading, the recited
 * particulars, numbered operative paragraphs, a prayer, and who filed it when.
 * `ReschedulingDocument`, `DelayCondonationDocument` and `OtherApplicationDocument`
 * are all this shape, which is why the bench reads one kind of paper across three
 * queues instead of three.
 */
export type CourtApplicationDocument = {
  court: string;
  caseNumber: string;
  matter: string;
  title: string;
  filedFor: string;
  facts: { term: string; value: string }[];
  paragraphs: string[];
  prayer: string;
  dated: string;
};

/**
 * The overlay a bench reviews one application in, and answers.
 *
 * Document-first: the particulars a bench checks first sit in a compact card, and
 * the application itself is a framed page taking the whole height beside them.
 * Stacked, the facts ate the first fold and left the document a strip you had to
 * open Full view to read; from `xl` the two stand side by side, so a page of the
 * application is on screen at once. The split waits for `xl` because the rail takes
 * 17rem off the page column first — below that width neither column gets a usable
 * measure, so they stack. Download is not repeated in the footer — the document's
 * own frame carries Download and Full view in its strip — so the footer carries
 * only the two decisions the overlay exists to take.
 *
 * The shell is shared rather than copied per queue. Three queues asking the same
 * question of the same kind of paper should not drift into three overlays; what
 * each one supplies is its own header line, its own facts, and what happens when
 * the bench answers.
 *
 * It is one stage of `StagedOverlay`, which is not a contradiction: what the frame
 * guarantees — the rise, the chrome that holds still, the tinted stage, the footer
 * in its own register — is how *every* court-side modal opens, and a single-stage
 * act simply never changes scene. Four queues open this overlay (rescheduling,
 * delay condonation, Others, and the application standing in the matter that has
 * just been called), so one frame here is four screens that behave the same.
 *
 * **Approving and rejecting here perform no judicial act.** Every caller drops the
 * row from its demo queue and closes. No order is drawn, no listing moves, nothing
 * is written and nobody is told.
 */
export function ApplicationReviewOverlay({
  title,
  description,
  facts,
  document,
  onDownload,
  approveLabel = "Approve",
  onApprove,
  onReject,
  onReturnFocus,
}: {
  /** What the application is — the head it was filed under. */
  title: string;
  /** The line under it: which case this is, or who sent it. */
  description: ReactNode;
  /** The queue's own `ReviewRow`s, for the facts well. */
  facts: ReactNode;
  document: CourtApplicationDocument;
  /**
   * Omitted where there is nothing to hand over. The review queues offer the file
   * because a bench working through paper between sittings may want it; the order
   * composer does not, for the reason its own preview already gives — this build has
   * no court record, and offering a file would claim one.
   */
  onDownload?: () => void;
  /** "Accept" where a queue's own vocabulary says so. */
  approveLabel?: string;
  onApprove: () => void;
  onReject: () => void;
  onReturnFocus: () => void;
}) {
  return (
    <StagedOverlay
      /* Document-first, so the overlay is as wide as the paper needs and takes a
         definite height rather than a floor: `md:h-[85dvh]` already holds the frame
         still, and a stage floor under it would have nothing to do. */
      className="sm:max-w-4xl md:h-[85dvh] xl:max-w-6xl"
      title={title}
      /* The application's own state — waiting on this bench — stated once, here. The
         queue behind it is entirely pending, so a column of chips would say the same
         thing thirty times. */
      titleAside={<Badge variant="warning">Pending review</Badge>}
      /* A node rather than a string, because every queue's line mixes a number set in
         `tabular-nums` with the cause title — so the caller owns the element the frame
         would otherwise wrap for it. */
      description={
        <DialogDescription className="text-body-compact text-muted-foreground">
          {description}
        </DialogDescription>
      }
      /* **One stage, and it never changes** — reading the application *is* the act, and
         the answer leaves the overlay. It is on the frame anyway: the rise, the white
         chrome over a tinted stage and the `bg-card` footer are how every court-side
         modal opens, and four queues that opted out of it would be four queues that open
         differently from the one beside them. */
      sceneKey="review"
      motion="forward"
      /* The stage is a full-height two-column reading surface that manages its own
         insets and its own scrolling, so the frame's padding stays off it. */
      padded={false}
      footer={
        <>
          <Button type="button" variant="destructive" onClick={onReject}>
            Reject
          </Button>
          <Button type="button" onClick={onApprove}>
            {approveLabel}
          </Button>
        </>
      }
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[auto_auto] gap-6 overflow-y-auto p-6 md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-rows-1">
        {/* The wrapper is the grid cell and the card is its content, so the card keeps
            its own height instead of stretching into a tall empty panel. A queue's facts
            fit the column at the heights a laptop actually has; on a short window, or
            once a label triples in translation, the cell scrolls rather than cropping the
            last fact away.

            Both of those are `xl:` on purpose. Stacked, the rows are `auto` inside a
            container of definite height, and `min-height: 0` is what lets a grid compress
            such a row below its content — the card then ran straight under the document
            below it. Off the split, the cell keeps its automatic minimum. */}
        <div className="xl:min-h-0 xl:overflow-y-auto">
          {/* A lifted card rather than the sunken well this was before the frame: on the
              tinted stage a sunken fill is the stage's own tone and the well loses its
              edge, so the facts sit on a white panel the stage can be seen behind. */}
          <Card size="sm" className="border-hairline shadow-raised">
            <CardContent>
              <DescriptionList>{facts}</DescriptionList>
            </CardContent>
          </Card>
        </div>
        {/* The framed well, for the same reason: a white sheet with a hairline and its
            two actions in a strip above the rule, rather than a sunken well that has no
            edge against the stage. The dialog's own title already names the application,
            so the strip carries the document's name quietly and the page takes everything
            under it. */}
        <DocumentPreview
          variant="quiet"
          surface="card"
          className="min-h-96 shadow-raised md:min-h-0"
          height="fill"
          title={document.title}
          source={{
            kind: "composed",
            content: <ApplicationFacsimile document={document} />,
          }}
          download={
            onDownload
              ? { onDownload, label: `Download ${document.title}` }
              : undefined
          }
        />
      </div>
    </StagedOverlay>
  );
}

/**
 * The application itself, set as the court form it is.
 *
 * Paper tokens rather than the app's own surfaces — this is a document inside the
 * product, not another panel of it.
 */
export function ApplicationFacsimile({
  document,
}: {
  document: CourtApplicationDocument;
}) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground [&_[data-slot=description-details]]:text-paper-foreground [&_[data-slot=description-term]]:text-paper-muted-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body font-semibold">{document.matter}</p>
        <p className="text-body-compact text-paper-muted-foreground">
          Date: {document.dated}
        </p>
      </header>

      <DescriptionList className="rounded-md border border-paper-border px-4">
        {document.facts.map((fact) => (
          <ReviewRow key={fact.term} term={fact.term}>
            {fact.value}
          </ReviewRow>
        ))}
      </DescriptionList>

      <h3 className="text-center text-body font-semibold">{document.title}</h3>

      <ol className="flex list-decimal flex-col gap-3 ps-6">
        {document.paragraphs.map((paragraph, index) => (
          <li key={index} className="text-body whitespace-pre-wrap">
            {paragraph}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2">
        <h4 className="text-body font-semibold">Prayer</h4>
        <p className="text-body whitespace-pre-wrap">{document.prayer}</p>
      </section>

      <footer className="flex flex-col items-end gap-2">
        <p className="text-body-compact text-paper-muted-foreground">
          Filed for {document.filedFor}
        </p>
        <p className="text-body-compact text-paper-muted-foreground">
          Dated this {document.dated}
        </p>
      </footer>
    </article>
  );
}
