"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { DocumentPreview } from "@/components/cases/document-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { causeTitle } from "@/lib/employee/hearings";
import {
  buildADiaryDocument,
  downloadADiaryDocument,
  formatADiaryDate,
  type ADiaryDocument,
  type ADiaryEntry,
} from "@/lib/employee/sign-a-diary";
import { Identifier } from "@/components/chrome/identifier";

/**
 * One day's entry, read, corrected, and then signed.
 *
 * The reference titles this overlay "View Document", and it is the one place the
 * reference undersells its own screen: the bench does not come here to view the diary,
 * it comes here to *make* it. Three things happen in this dialog and they are in the
 * order the register is made — read the day's record, correct the words, sign it — so
 * the overlay is laid out as those three and titled for the entry rather than for the
 * furniture. Sentence case is a DS Law in any case, so "View Document" could not have
 * survived unchanged (deviation logged in the build report).
 *
 * The document *is* the task, so it is a `height="fill"` `DocumentPreview` in a tall
 * overlay — the same layout `SignOrderDialog` and `SignFormDialog` use to read a court
 * paper before acting on it. Below it, the two acts, each beside the thing it acts on:
 * **Save** belongs to the business of the day and sits with that field; **Sign** is what
 * the dialog exists for and sits in the footer, the one teal action in view.
 *
 * **The paper shows what is saved, not what is being typed.** The facsimile above renders
 * the recorded business, and the editor holds the draft, so Save is a visible act — the
 * document changes under it — rather than a button whose effect has already happened.
 *
 * **Signing takes the field as it stands.** A bench that corrected the wording and went
 * straight for the signature meant to sign the correction, not to lose it, so Sign
 * records the draft with the signature and the note beside it says so. There is no
 * confirmation step and no dead end: the alternative — refusing to sign while an edit is
 * unsaved — is a disabled primary the bench has to decode.
 *
 * Download is not repeated below. `DocumentPreview` owns a sticky header with Download
 * and Full view in it, and the same control twice in one dialog is one too many — the
 * reference's own "Download Document" link is that header (deviation logged).
 *
 * **Nothing here signs, records or files anything.** Save replaces a string in the demo
 * register and Sign drops the entry from it — see `lib/employee/sign-a-diary.ts`.
 */
export function SignADiaryDialog({
  entry,
  onOpenChange,
  onSave,
  onSign,
  onReturnFocus,
}: {
  entry: ADiaryEntry | null;
  onOpenChange: (entry: ADiaryEntry | null) => void;
  /** Record the corrected business of the day, leaving the entry unsigned. */
  onSave: (entry: ADiaryEntry, business: string) => void;
  /** Sign the entry, recording the business as it stands in the editor. */
  onSign: (entry: ADiaryEntry, business: string) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {entry ? (
        /* Keyed on the entry so opening a second one renders that document from the top
           with its own business in the editor, rather than inheriting the last one's
           scroll and draft. */
        <SignADiaryBody
          key={entry.id}
          entry={entry}
          onSave={onSave}
          onSign={onSign}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function SignADiaryBody({
  entry,
  onSave,
  onSign,
  onReturnFocus,
}: {
  entry: ADiaryEntry;
  onSave: (entry: ADiaryEntry, business: string) => void;
  onSign: (entry: ADiaryEntry, business: string) => void;
  onReturnFocus: () => void;
}) {
  const document = React.useMemo(() => buildADiaryDocument(entry), [entry]);
  /* The draft. It starts as what is recorded and is compared against the entry rather
     than against its own first value, so a Save leaves the editor clean without a second
     piece of state to keep in step. */
  const [draft, setDraft] = React.useState(entry.business);
  const [saved, setSaved] = React.useState("");

  const text = draft.trim();
  const blank = text === "";
  const dirty = text !== entry.business;

  function save() {
    if (blank || !dirty) return;
    onSave(entry, text);
    setSaved("Business of the day saved on this screen. Nothing was filed.");
  }

  return (
    <ChromeDialogContent
      /* Below `md` the whole column scrolls, because a phone cannot hold a document, an
         editor and a footer at once and clipping the act is worse than a scroll. From
         `md` the dialog takes a fixed height and only the document scrolls, inside its
         own well. */
      className="flex max-h-[85dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-4xl md:h-[85dvh] md:overflow-hidden"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
    >
      {/* `pr-16` keeps the title clear of the close button the DS places top-right. */}
      <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
        <DialogTitle className="text-title-s font-semibold">
          A-Diary entry
        </DialogTitle>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(entry)} <span aria-hidden>· </span>
          {/* No copy control inside the dialog's accessible description. */}
          <Identifier value={entry.caseNumber} label="case number" copyable={false} />{" "}
          · Dated{" "}
          <span className="tabular-nums">{formatADiaryDate(entry.dated)}</span>
        </DialogDescription>
      </DialogHeader>
      <Separator />

      <div className="flex min-h-0 flex-1 flex-col p-6">
        <DocumentPreview
          className="min-h-96 md:min-h-0"
          height="fill"
          title={`A-Diary dated ${formatADiaryDate(entry.dated)}`}
          description={`Case no. ${entry.caseNumber}`}
          source={{
            kind: "composed",
            content: <ADiaryFacsimile document={document} />,
          }}
          download={{
            onDownload: () => downloadADiaryDocument(entry),
            label: `Download the A-Diary entry in ${entry.caseNumber}`,
          }}
        />
      </div>
      <Separator />

      {/* The editable record: a band on the dialog's own sheet, bounded by the separator
          above it and the footer's rule below. Not a sunken well — `surface-sunken` is
          the warm 2.5 step and the DS footer under it is cool `muted`, so a well here
          would put two greys of different temperature edge to edge for no gain
          (ui-craft §4, and the neutral-temperature item in §6). */}
      <div className="flex shrink-0 flex-col gap-3 p-6">
        <Field data-invalid={blank}>
          <FieldLabel className="text-body">Business of the day</FieldLabel>
          <Textarea
            value={draft}
            rows={3}
            className="text-body"
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved("");
            }}
          />
          <FieldDescription className="text-body-compact">
            What this court did on {formatADiaryDate(entry.dated)}, in the
            court&apos;s own words. Correct it before you sign.
          </FieldDescription>
          {/* A day the court sat is a day with business. Emptying the record is the one
              edit this field refuses, and it says so where the error belongs rather
              than by disabling Save with no reason given.

              Mounted only while it has something to say. `FieldError` renders null on
              empty children but still registers its id with the `Field`, so leaving it
              mounted points `aria-describedby` at an element that is not there —
              upstream DS quirk, logged in the build report. */}
          {blank ? (
            <FieldError className="text-body-compact">
              The day&apos;s business cannot be left blank.
            </FieldError>
          ) : null}
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* What Save did, for anyone not watching the document above it change. */}
          <p
            className="text-caption text-muted-foreground sm:mr-auto"
            aria-live="polite"
          >
            {saved}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-fit"
            disabled={blank || !dirty}
            onClick={save}
          >
            Save
          </Button>
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 sm:items-center">
        {/* What the act means — said at the moment of the act rather than left for the
            bench to discover. */}
        <p className="text-caption text-muted-foreground sm:mr-auto sm:text-left">
          {dirty && !blank
            ? "Signing records the business of the day as it stands in the editor, including the correction you have not saved."
            : "Signing puts your signature on the day's record and cannot be reversed."}
        </p>
        <Button type="button" disabled={blank} onClick={() => onSign(entry, text)}>
          Sign the entry
        </Button>
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/**
 * The day's entry as paper — the same facsimile treatment the other court-side overlays
 * use, plus the one thing an A-Diary has that an order and a form do not: the appearance
 * table, which is the part of the record that says the hearing happened at all.
 *
 * The table is drawn with the paper tokens rather than the DS `Table`, for the same
 * reason the heading is: this is a facsimile of a court paper, not a product surface, and
 * the paper palette exists so a document does not inherit the screen's chrome.
 */
function ADiaryFacsimile({ document }: { document: ADiaryDocument }) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">
          Case no. {document.caseNumber}
        </p>
        <p className="text-body font-semibold">
          In the matter of {document.matter}
        </p>
        <p className="text-body font-semibold">Dated {document.dated}</p>
      </header>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Appearances in {document.caseNumber}
        </caption>
        <tbody>
          {document.appearances.map(({ label, value }, index) => (
            <tr key={`${label}-${index}`}>
              <th
                scope="row"
                className="w-2/5 border border-paper-border px-4 py-3 align-top text-body font-normal"
              >
                {label}
              </th>
              <td className="border border-paper-border px-4 py-3 align-top text-body">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex flex-col gap-2">
        <h3 className="text-body font-semibold">Business of the day</h3>
        {/* `whitespace-pre-line` because the bench types this: a record broken into
            paragraphs should stay broken where it was broken. */}
        <p className="text-body whitespace-pre-line">{document.business}</p>
      </section>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}
