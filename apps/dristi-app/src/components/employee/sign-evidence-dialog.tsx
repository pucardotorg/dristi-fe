"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { ReviewRow } from "@/components/cases/filing-form-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/description-list";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { causeTitle } from "@/lib/employee/hearings";
import {
  businessOfTheDay,
  evidenceDocumentLabel,
  evidenceNumber,
  exhibitSeries,
  markedThroughWitness,
  parseEvidenceSerial,
  takenSerials,
  witnessLabel,
  type EvidenceMarking,
  type SignEvidence,
} from "@/lib/employee/sign-evidence";

/**
 * One marking, read and then signed — the single-document path off the evidence queue.
 *
 * Two steps, and both are the reference's: the particulars of the marking with the day's
 * business under them, and — behind Edit details — the form that changes what the marking
 * says. The reference draws the second as a modal over the first; here it is a step of the
 * same overlay, because two stacked dialogs put two focus traps on one decision and the
 * DS ships no nested-dialog pattern (ACCESSIBILITY §5). Nothing else about it changes: the
 * same four fields, the same locked prefix, the same Cancel and Proceed.
 *
 * **There is no document here, and that is not an omission.** What waits for signature is
 * the court's endorsement of a document already on the case's own register — the
 * particulars *are* the record being signed. The two signing queues beside this one open a
 * facsimile because there the court wrote the paper; here it did not, and the reference
 * shows none either.
 *
 * **The only act is e-sign.** The forms queue asks how a party will sign — e-sign, or
 * upload the paper they signed — because a form is sworn by somebody who may be standing
 * in the court office. An exhibit is endorsed by the bench that is already logged in, and
 * the reference offers one button.
 *
 * **E-sign signs nothing.** It drops the row from the demo queue and closes — see
 * `lib/employee/sign-evidence.ts`. No signature is applied, no exhibit is endorsed,
 * nothing is written to the A-Diary and no e-sign provider is called.
 */
export function SignEvidenceDialog({
  row,
  rows,
  onOpenChange,
  onMarkingChange,
  onBusinessOfTheDayChange,
  onSign,
  onReturnFocus,
}: {
  row: SignEvidence | null;
  /** The whole queue — an exhibit number has to be checked against its case's others. */
  rows: SignEvidence[];
  onOpenChange: (row: SignEvidence | null) => void;
  onMarkingChange: (id: string, marking: EvidenceMarking) => void;
  onBusinessOfTheDayChange: (id: string, botd: string) => void;
  onSign: (row: SignEvidence) => void;
  onReturnFocus: () => void;
}) {
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {row ? (
        /* Keyed on the marking so opening a second one starts on its particulars rather
           than inheriting the last one's step. */
        <SignEvidenceBody
          key={row.id}
          row={row}
          rows={rows}
          onMarkingChange={onMarkingChange}
          onBusinessOfTheDayChange={onBusinessOfTheDayChange}
          onSign={onSign}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </Dialog>
  );
}

function SignEvidenceBody({
  row,
  rows,
  onMarkingChange,
  onBusinessOfTheDayChange,
  onSign,
  onReturnFocus,
}: {
  row: SignEvidence;
  rows: SignEvidence[];
  onMarkingChange: (id: string, marking: EvidenceMarking) => void;
  onBusinessOfTheDayChange: (id: string, botd: string) => void;
  onSign: (row: SignEvidence) => void;
  onReturnFocus: () => void;
}) {
  const [step, setStep] = React.useState<"details" | "edit">("details");
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const opened = React.useRef(false);

  /* Swapping the step replaces the dialog's content wholesale; landing focus on the new
     title is what announces the change. The initial open keeps Radix's own focus
     handling — this only runs on a step change. */
  React.useEffect(() => {
    if (opened.current) titleRef.current?.focus();
    else opened.current = true;
  }, [step]);

  return (
    <ChromeDialogContent
      className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        onReturnFocus();
      }}
    >
      {step === "details" ? (
        <DetailsStep
          row={row}
          titleRef={titleRef}
          onEdit={() => setStep("edit")}
          onBusinessOfTheDayChange={onBusinessOfTheDayChange}
          onSign={() => onSign(row)}
        />
      ) : (
        <MarkAsEvidenceStep
          row={row}
          rows={rows}
          titleRef={titleRef}
          onCancel={() => setStep("details")}
          onProceed={(marking) => {
            onMarkingChange(row.id, marking);
            setStep("details");
          }}
        />
      )}
    </ChromeDialogContent>
  );
}

/**
 * What the marking says, and the two things to do about it.
 *
 * The four particulars sit in a sunken well — `DescriptionList` inside the panel the
 * dialog already is, which is the DS's own recipe for one record's key-value fields
 * (Laws, "Grouped content gets a border"). The day's business is not one of them: it is
 * the one thing on this overlay the bench writes, so it is a real field below the well
 * rather than a fifth row of read-only text.
 *
 * The chip is the marking's own state — waiting for this bench's signature — in the DS's
 * sentence case. `warning` is the variant the other court-side overlays already spend on
 * a pending state, so the three report one thing the same way.
 *
 * A `Textarea` where the reference draws a single-line input: the day's business runs to
 * two lines (`lib/cases/orders.ts`), and a court that deploys in Malayalam or Tamil sets
 * longer strings in taller glyphs. A one-line field scrolls the sentence out of sight
 * instead of wrapping it (ACCESSIBILITY §10, §13).
 *
 * Emptying that field is the one thing here that stops the signature. The reference
 * validates nothing, but the line is what the day's record carries about this exhibit —
 * signing a blank one endorses an exhibit the register cannot describe. The court's draft
 * is always one step away, so the dead end is never a trap.
 */
function DetailsStep({
  row,
  titleRef,
  onEdit,
  onBusinessOfTheDayChange,
  onSign,
}: {
  row: SignEvidence;
  titleRef: React.Ref<HTMLHeadingElement>;
  onEdit: () => void;
  onBusinessOfTheDayChange: (id: string, botd: string) => void;
  onSign: () => void;
}) {
  const line = businessOfTheDay(row);
  const blank = line.trim() === "";

  return (
    <>
      {/* `pr-16` keeps the title clear of the close button the DS places top-right. */}
      <DialogHeader className="gap-2 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-title-s font-semibold outline-none"
          >
            Evidence details
          </DialogTitle>
          <Badge variant="warning">Pending signature</Badge>
        </div>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(row)} · {row.caseNumber}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-6">
        <div className="rounded-lg bg-surface-sunken p-4">
          <DescriptionList>
            <ReviewRow term="Document title">
              {evidenceDocumentLabel(row.document)}
            </ReviewRow>
            <ReviewRow term="Uploaded by">{row.uploadedBy}</ReviewRow>
            <ReviewRow term="Evidence marked through">
              {witnessLabel(markedThroughWitness(row))}
            </ReviewRow>
            <ReviewRow term="Evidence number">
              <span className="tabular-nums">{evidenceNumber(row)}</span>
            </ReviewRow>
          </DescriptionList>
        </div>

        <Field data-invalid={blank}>
          <FieldLabel className="text-body">Business of the day</FieldLabel>
          <Textarea
            rows={2}
            value={line}
            aria-invalid={blank || undefined}
            onChange={(event) =>
              onBusinessOfTheDayChange(row.id, event.target.value)
            }
          />
          {blank ? (
            <FieldError className="text-body-compact">
              Write what the court did with this document before signing it.
            </FieldError>
          ) : null}
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit details
        </Button>
        <Button type="button" disabled={blank} onClick={onSign}>
          E-sign
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * What the marking says, changed — the reference's Mark as evidence form.
 *
 * Two of its four fields cannot be changed here: the document's own title and who filed
 * it are facts about the filing, not about the court's marking of it. They stay in the
 * form because they say what is being marked, and they are `readOnly` rather than the
 * reference's `disabled` — a disabled control is out of the tab order and unreachable by
 * a voice user naming its label, and there is nothing to disable here, only nothing to
 * type (ACCESSIBILITY §4, §9).
 *
 * The exhibit's series letter is the third thing that cannot be typed, and the reference
 * locks it as a dropdown with one option. Here it is an `InputGroupAddon variant="field"` —
 * the DS's own cell for a value that qualifies what the user types, which is exactly what
 * a series letter does. A select that cannot be opened is a control that keyboard and
 * voice users can reach and not operate; the addon is not a control at all, and the field
 * description says what decides the letter.
 */
function MarkAsEvidenceStep({
  row,
  rows,
  titleRef,
  onCancel,
  onProceed,
}: {
  row: SignEvidence;
  rows: SignEvidence[];
  titleRef: React.Ref<HTMLHeadingElement>;
  onCancel: () => void;
  onProceed: (marking: EvidenceMarking) => void;
}) {
  const [markedThrough, setMarkedThrough] = React.useState(row.markedThrough);
  const [serial, setSerial] = React.useState(String(row.serial));

  const witness =
    row.witnesses.find((entry) => entry.id === markedThrough) ??
    row.witnesses[0];
  const series = exhibitSeries(witness.series);
  const parsed = parseEvidenceSerial(serial);
  const taken = takenSerials(rows, row, series);

  /* One message at a time, and each says what to do rather than that something is
     wrong. The clash is the one a bench can actually hit: renumbering an exhibit onto a
     number this case has already given out. */
  const error =
    parsed === null
      ? "Enter the exhibit number as a whole number, like 1."
      : taken.has(parsed)
        ? `${series}${parsed} is already marked in ${row.caseNumber}.`
        : undefined;

  return (
    <>
      <DialogHeader className="gap-2 pr-16">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-title-s font-semibold outline-none"
        >
          Mark as evidence
        </DialogTitle>
        <DialogDescription className="text-body-compact text-muted-foreground">
          {causeTitle(row)} · {row.caseNumber}
        </DialogDescription>
      </DialogHeader>

      <form
        id="mark-as-evidence"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed === null || error) return;
          onProceed({ markedThrough, serial: parsed });
        }}
      >
        <Field>
          <FieldLabel className="text-body">Document title</FieldLabel>
          <Input readOnly value={evidenceDocumentLabel(row.document)} />
        </Field>

        <Field>
          <FieldLabel className="text-body">Uploaded by</FieldLabel>
          <Input readOnly value={row.uploadedBy} />
        </Field>

        {/* `Label htmlFor` beside a `SelectTrigger id` rather than `Field`: the DS Select
            is a Radix trigger, not a form control `Field` can adopt, so the label points
            at the trigger's own id — the pattern every court-side filter row uses. */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="evidence-marked-through" className="w-fit text-body">
            Evidence marked through
          </Label>
          <Select value={markedThrough} onValueChange={setMarkedThrough}>
            <SelectTrigger id="evidence-marked-through" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {row.witnesses.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {witnessLabel(entry)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Field data-invalid={Boolean(error)}>
          <FieldLabel className="text-body">Evidence number</FieldLabel>
          <InputGroup>
            <InputGroupAddon variant="field">
              <InputGroupText>{series}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
              value={serial}
              aria-invalid={Boolean(error) || undefined}
              onChange={(event) => setSerial(event.target.value)}
            />
          </InputGroup>
          <FieldDescription className="text-body-compact">
            The series follows the witness — P for the complainant&apos;s
            exhibits, D for the accused&apos;s, C for the court&apos;s own.
          </FieldDescription>
          {error ? (
            <FieldError className="text-body-compact">{error}</FieldError>
          ) : null}
        </Field>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form="mark-as-evidence" disabled={Boolean(error)}>
          Proceed
        </Button>
      </DialogFooter>
    </>
  );
}
