"use client";

import * as React from "react";
import {
  CameraIcon,
  CheckIcon,
  FileUpIcon,
  MicIcon,
  SquareIcon,
} from "lucide-react";

import {
  canSaveDraft,
  docName,
  isCorrected,
  isDraftDirty,
  saysSomething,
} from "@/lib/employee/scrutiny/field";
import { DOC_REASONS } from "@/lib/employee/scrutiny/sections";
import type { FlatField } from "@/lib/employee/scrutiny/types";
import type { ScrutinyController } from "@/lib/employee/scrutiny/use-scrutiny-state";
import { cn } from "@/lib/utils";
import { MarkThumb } from "@/components/employee/scrutiny/mark-thumb";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The composer.
 *
 * Correction-first: the root problem is not unclear comment boxes, it is that officers
 * leave one-word remarks and advocates travel to court to decode them. So the primary
 * act is proposing the right value; the note is secondary, and the advocate confirms the
 * correction — the officer proposes, never overwrites.
 *
 * It renders as a third grid item spanning both columns of its description row, so it
 * gets the whole panel width instead of the ~380px the value column can spare.
 *
 * Three strips below the fields, in a fixed order: what is attached, what it will grant,
 * and what to do about it. The action bar used to mix "attach a mark" with "save" — two
 * different verbs in one row.
 */
export function FlagComposer({
  field,
  controller,
  onGoToItem,
}: {
  field: FlatField;
  controller: ScrutinyController;
  onGoToItem: (fieldId: string) => void;
}) {
  const { docById } = useScrutinyCase();
  const { draft, pendingFocus, recordingSeconds } = controller;
  const correctionRef = React.useRef<HTMLTextAreaElement>(null);
  const noteRef = React.useRef<HTMLTextAreaElement>(null);


  React.useEffect(() => {
    if (!pendingFocus) return;
    const el =
      pendingFocus === "correction" ? correctionRef.current : noteRef.current;
    if (el) {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
    controller.clearPendingFocus();
  }, [pendingFocus, controller]);

  if (!draft) return null;

  const isDocRow = !!field.docrow;
  const corrected = isCorrected(field, draft);
  const canSave = canSaveDraft(field, draft);
  /*
   * The seeded value is real text the officer can edit, but until it differs from what
   * was filed it is not a correction — so it is set in the muted ink that says
   * "already here, untouched" rather than the foreground ink of something authored.
   */
  const untouched = !draft.prefilled && draft.value === (field.value ?? "");
  const multiline =
    !isDocRow && ((field.value || "").length > 40 || !!field.long);

  /*
   * The save gate, said out loud. Evidence alone no longer counts as saying something —
   * a red box with no words is the one-word remark, drawn instead of typed — so the
   * permanent description turns into the reason the button is dead. It has to be text
   * beside the field: a disabled control is not focusable, so a tooltip on it is
   * unreachable for exactly the people who need the reason.
   */
  const speechless = isDraftDirty(field, draft) && !saysSomething(field, draft);


  /** ⌘/Ctrl+Enter saves anywhere; on a single-line field plain Enter saves. */
  function onKeyDown(event: React.KeyboardEvent, single: boolean) {
    if (event.key !== "Enter") return;
    if (event.metaKey || event.ctrlKey || (single && !event.shiftKey)) {
      event.preventDefault();
      if (canSave) controller.saveFlag();
    }
  }

  return (
    /*
     * A sunken well: editing is a mode, and the well is what says so. The DS textareas
     * keep their own card fill, so the fields read as paper on the work surface.
     */
    <div
      className={cn(
        "col-span-full my-1 flex flex-col gap-4 rounded-lg border border-hairline bg-surface-sunken p-3",
        // Unfolds in place when the row opens — the same short expand Register cases uses
        // for a section opening, rather than snapping into the layout.
        "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <FieldGroup className="gap-4">
        {isDocRow ? null : (
          <>
            <Field>
              {/* No "AI" badge. The DS `Textarea` already draws the amber fill and the
                  dashed edge for `prefilled` and announces it, so a third amber mark on
                  the same control said the same thing twice — and it said *which*
                  document only in a `title`, which touch and keyboard never reach. The
                  fact moved into the description below, in words. */}
              <FieldLabel htmlFor={`corr-${field.id}`}>
                FSO&rsquo;s correction
              </FieldLabel>
              {/*
               * `prefilled` is a first-class prop on the DS Textarea: it draws the
               * dashed warning edge AND announces "machine filled, not yet verified"
               * to assistive tech. Never re-implement that with a data attribute.
               */}
              <Textarea
                id={`corr-${field.id}`}
                ref={correctionRef}
                className={cn(
                  "max-h-56",
                  multiline ? "min-h-24" : "min-h-10",
                  untouched && "text-muted-foreground",
                )}
                prefilled={draft.prefilled}
                placeholder={field.value || undefined}
                value={draft.value}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => onKeyDown(event, !multiline)}
                onChange={(event) =>
                  controller.updateDraft({
                    value: event.target.value,
                    prefilled: false,
                  })
                }
              />
              {/*
               * The filed value lives in the field's own description slot — the DS
               * anatomy for "context about this control" — instead of a second
               * pseudo-field above. Once the text differs it reads as superseded, and
               * the way back is one word in the same line, not a button drifting
               * right of the box.
               */}
              {/*
               * Only when the text differs: "Filed as Prateek Agrawal" directly under an
               * input reading "Prateek Agrawal" is the same string twice and zero
               * information. The line appears the moment the officer changes something,
               * which is also the moment "Restore" means anything.
               */}
              {draft.prefilled ? (
                <FieldDescription>
                  Read by AI from{" "}
                  {field.doc ? docById[field.doc]?.name : "the document"} —
                  check it before saving.
                </FieldDescription>
              ) : null}
              {corrected ? (
                <FieldDescription>
                  Filed as <span className="line-through">{field.value || "—"}</span>
                  {" · "}
                  <button
                    type="button"
                    className="underline underline-offset-2 transition-colors hover:text-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      controller.updateDraft({
                        value: field.value ?? "",
                        prefilled: false,
                      });
                      correctionRef.current?.focus();
                    }}
                  >
                    Restore
                  </button>
                </FieldDescription>
              ) : null}
            </Field>
          </>
        )}

        {(
          <Field data-invalid={speechless}>
            {/*
             * A visible label whenever the box is visible: placeholder-only fields are a
             * listed accessibility defect, and a voice user says the label.
             */}
            <FieldLabel>
              {isDocRow ? "What’s wrong with this document?" : "Note for the advocate"}
            </FieldLabel>

            {/* The mic lives inside the note field — it should not cost a 40px column. */}
            <div className="relative flex">
              <Textarea
                ref={noteRef}
                className="max-h-32 min-h-10 pe-11"
                placeholder={
                  isDocRow
                    ? "e.g. Only the address side was uploaded — please upload the front."
                    : "Type a note, or record one with the mic"
                }
                value={draft.text}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => onKeyDown(event, false)}
                onChange={(event) =>
                  controller.updateDraft({ text: event.target.value })
                }
              />
              {/* `top-0.5` centres the 36px mic in the 40px single-line field (2px each
                  side); on a grown note it stays anchored near the top, where it belongs. */}
              <div className="absolute end-1.5 top-0.5 flex items-center gap-1.5">
                {draft.recording ? (
                  <span className="inline-flex items-center gap-1.5 text-caption text-destructive tabular-nums">
                    <span
                      className="size-2 animate-pulse rounded-full bg-destructive"
                      aria-hidden="true"
                    />
                    0:{String(recordingSeconds).padStart(2, "0")}
                  </span>
                ) : null}
                {/* The mic sits inside the note field, so it cannot be a 40px box —
                    it would overflow the control it lives in. The hit area grows
                    instead of the button: `after:-inset-1` takes a 36px control to
                    44px, the repo's own idiom for a control nested in another
                    (`tasks/act/shared.tsx`). Visually 36, reachable at 44. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={draft.recording ? "destructive" : "ghost"}
                      size="icon-sm"
                      className="relative after:absolute after:-inset-1 after:content-['']"
                      onClick={(event) => {
                        event.stopPropagation();
                        controller.toggleRecording();
                      }}
                      aria-label={
                        draft.recording ? "Stop recording" : "Record a voice note"
                      }
                    >
                      {draft.recording ? <SquareIcon /> : <MicIcon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {draft.recording ? "Stop recording" : "Record a voice note"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Structured reasons qualify the note; the note comes first. */}
            {isDocRow ? (
              <ReasonChips
                value={draft.reason}
                onChange={(reason) => controller.updateDraft({ reason })}
              />
            ) : null}

            {/*
             * The save gate, said out loud, only when it is actually holding the save:
             * a permanently visible helper was one more line on every open.
             */}
            {speechless ? (
              <FieldError>
                {isDocRow
                  ? "Say what’s wrong — pick a reason or write a line."
                  : "Say what’s wrong — one line is enough. Type it or use the mic."}
              </FieldError>
            ) : null}
          </Field>
        )}
      </FieldGroup>

      {/*
       * The toolbar: everything optional, in one quiet row of the same voice. The note
       * opener and the mic disappear into the note field once it is open; the mark
       * swaps to its labelled tile once one is drawn.
       */}
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
        {draft.evidence ? (
          <>
            <MarkThumb evidence={draft.evidence} />
            <span className="min-w-0 flex-1 truncate text-body-compact">
              <span className="tabular-nums">
                Doc {docById[draft.evidence.doc]?.no}
              </span>{" "}
              · {docName(draft.evidence.doc, docById)}
            </span>
            {/* The composer's inline row keeps its density; a coarse pointer still gets
                the 40px floor (DS Laws — the registry works on tablets). */}
            <Button
              variant="destructive-ghost"
              size="xs"
              className="[@media(pointer:coarse)]:h-10"
              onClick={(event) => {
                event.stopPropagation();
                /*
                 * The linked block was born from this mark, so an unsaved one goes with
                 * it. A saved document item keeps its own copy of the rectangle and is
                 * left alone — removing a mark is not removing a grant.
                 */
                controller.updateDraft({ evidence: null, askReupload: null });
                if (draft.linked && !controller.flags[draft.linked.rowId]) {
                  controller.clearLinked();
                }
              }}
              aria-label="Remove mark"
            >
              Remove mark
            </Button>
          </>
        ) : (
          /*
           * Attaching evidence is silent: arming the tool and drawing one box saves it.
           * No second comment box for the same thought.
           */
          <Button
            variant="link"
            size="xs"
            className="[@media(pointer:coarse)]:h-10"
            aria-pressed={controller.evidenceTarget === field.id}
            onClick={(event) => {
              event.stopPropagation();
              controller.armEvidence(field.id);
            }}
          >
            <CameraIcon />
            {controller.evidenceTarget === field.id
              ? "Drag to annotate the error"
              : "Annotate error on the document"}
          </Button>
        )}
      </div>

      {/*
       * The commit zone. One hairline separates what the officer authors from what
       * saving it means — the consequence, the question a mark raises, or the linked
       * second item — and the buttons that commit it.
       */}
      <div className="flex flex-col gap-3 border-t border-hairline pt-3">
      <ConsequenceStrip
        field={field}
        controller={controller}
        onGoToItem={onGoToItem}
      />

      {/* The two controls that commit the officer's work: default size, like every act
          on a court screen. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => controller.closeComposer()}>
          Cancel
        </Button>
        <Button
          disabled={!canSave}
          aria-label={
            draft.linked ? "Save the flag and the document issue" : undefined
          }
          onClick={() => controller.saveFlag()}
        >
          {draft.linked
            ? "Save both"
            : corrected
              ? "Save correction"
              : isDocRow
                ? "Save issue"
                : "Save flag"}
        </Button>
      </div>
      </div>
    </div>
  );
}

/**
 * The three structured reasons a document itself can be wrong.
 *
 * A `ToggleGroup`, not three buttons wearing `aria-pressed`: exactly one reason can be
 * chosen, and the primitive is what makes the set one tab stop with arrow keys inside it
 * rather than three separate stops the officer has to walk past.
 */
function ReasonChips({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (reason: string | null) => void;
}) {
  return (
    /*
     * Selection is a mark, not a fill. The DS on-state for an outline toggle is
     * `accent-strong` — 235 against the card's 255, a 20-unit step on a neutral ramp
     * whose whole light half spans 255→229. Measured on the render it read as "slightly
     * greyer", which is not a selected state. So the chip states differ three ways at
     * once: a check appears, the fill goes to `secondary`, and the label takes 500.
     * Unset chips drop their white fill and let the well show through — four white
     * boxes on a grey well was most of why this region read as muddled.
     */
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(next) => onChange(next || null)}
      className="flex flex-wrap gap-1.5"
      aria-label="What is wrong with the document"
    >
      {DOC_REASONS.map((reason) => (
        <ToggleGroupItem
          key={reason}
          value={reason}
          variant="outline"
          className="h-10 gap-1.5 bg-transparent data-[state=on]:bg-secondary data-[state=on]:font-medium"
          onClick={(event) => event.stopPropagation()}
        >
          {value === reason ? (
            <CheckIcon className="size-3.5" aria-hidden="true" />
          ) : null}
          {reason}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * One region, three states: what this item will grant, the question that a mark on an
 * uploaded document raises, and the second item it can grant instead.
 *
 * The unlock sentence is the primary fix and it sits here at rest, always. A prompt only
 * teaches the officer who drew a mark; the officer who simply types "re-upload the front
 * side of the Aadhaar" into a field flag never sees one, and the transcripts say that is
 * exactly what they do.
 */
function ConsequenceStrip({
  field,
  controller,
  onGoToItem,
}: {
  field: FlatField;
  controller: ScrutinyController;
  onGoToItem: (fieldId: string) => void;
}) {
  const { docById, docRow } = useScrutinyCase();
  const draft = controller.draft;
  if (!draft) return null;

  if (draft.linked) {
    return <LinkedBlock controller={controller} />;
  }

  if (draft.askReupload) {
    return (
      <ReuploadQuestion
        field={field}
        docId={draft.askReupload}
        controller={controller}
      />
    );
  }

  // The field's own source document, when that document is an upload someone could be
  // asked to send again. Generated pages ARE the fields, so they have no row to flag.
  const sourceDoc = field.doc ?? null;
  const rowId = sourceDoc ? docRow[sourceDoc] : null;
  const raised = !!rowId && !!controller.flags[rowId];

  if (!sourceDoc || !rowId) return null;

  /*
   * The question, not the rule. "Lets the advocate edit this value only" stated the
   * boundary in the abstract; the officer's actual decision is whether the document
   * itself is the problem, so ask that and make the answer a button.
   */
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-caption text-muted-foreground">
        {raised
          ? `${docName(sourceDoc, docById)} is already flagged for re-upload.`
          : "Is something wrong with the entire document?"}
      </span>
      <Button
        variant={raised ? "ghost" : "outline"}
        size="xs"
        className="[@media(pointer:coarse)]:h-10"
        onClick={(event) => {
          event.stopPropagation();
          /*
           * Also the accessibility answer: a rectangle can only be drawn with a pointer
           * drag, so a keyboard-only officer can never reach the question. This reaches
           * the same outcome in one click, always.
           */
          if (raised) onGoToItem(rowId);
          else controller.linkDoc(sourceDoc);
        }}
      >
        {raised ? "Open that flag" : "Flag the entire document instead"}
      </Button>
    </div>
  );
}

/**
 * The question, asked in place.
 *
 * A non-modal `Alert` rather than a dialog: the gesture behind it is one officers repeat,
 * and the answer is not irreversible. `role="alert"` is the DS component's own, and it is
 * right here — the officer's eyes are on the bundle, having just finished a drag, so an
 * assertive announcement is how a screen-reader user learns the question arrived. Focus
 * is deliberately NOT moved: that would steal the pointer from someone about to draw a
 * second box.
 *
 * No tint. This is a question, not a status report — and amber inside this composer
 * already means `prefilled`, on this very field.
 */
function ReuploadQuestion({
  field,
  docId,
  controller,
}: {
  field: FlatField;
  docId: string;
  controller: ScrutinyController;
}) {
  const { docById } = useScrutinyCase();
  const doc = docById[docId];
  return (
    <Alert className="rounded-md border-hairline">
      <FileUpIcon />
      <AlertTitle>
        Does the advocate need to re-upload {docName(docId, docById)}?
      </AlertTitle>
      <AlertDescription>
        This mark stays with {field.label}. Re-upload only opens if you raise it
        on the document too.
        {doc?.poorScan
          ? " This upload is already marked as a poor scan."
          : null}
      </AlertDescription>
      {/* The Alert grid drops a third child into column 1 unless it is told otherwise. */}
      <div className="col-start-2 mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            controller.answerReupload(true);
          }}
        >
          Yes — flag the upload
        </Button>
        <Button
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            controller.answerReupload(false);
          }}
        >
          No
        </Button>
      </div>
    </Alert>
  );
}

/**
 * The second item, written here rather than somewhere else.
 *
 * Nothing exists until Save, and Save writes both. The reason is required — it is what
 * makes the item legible on the advocate's side, and one click satisfies the save gate.
 * It is never pre-selected, not even on a poor scan: pre-filling a defect assertion on
 * the officer's behalf is the machine making the claim.
 */
function LinkedBlock({ controller }: { controller: ScrutinyController }) {
  const { docById } = useScrutinyCase();
  const linked = controller.draft?.linked;
  if (!linked) return null;
  const missing = !linked.reason;

  return (
    /*
     * Not a box in the box: the commit zone's hairline already introduced this section,
     * and a card-filled block inside a sunken well was surface-on-surface noise. The
     * header row and the undo carry it.
     */
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FileUpIcon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-body-compact font-medium">
          Also raising: {docName(linked.docId, docById)} — re-upload
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="[@media(pointer:coarse)]:h-10"
          onClick={(event) => {
            event.stopPropagation();
            controller.clearLinked();
          }}
        >
          Undo
        </Button>
      </div>

      {/*
       * No `data-invalid` here, deliberately: what is missing is a reason chip, not the
       * note — marking the note `aria-invalid` before the officer has typed in it would
       * be a false statement about the wrong control. The message still carries
       * `role="alert"` and still says why Save is dead.
       */}
      <Field>
        {/*
         * One Field for the chip row and the note: the label is visible and belongs to
         * both, which is what keeps the note out of placeholder-only territory.
         */}
        <FieldLabel>What&rsquo;s wrong with the document?</FieldLabel>
        <ReasonChips
          value={linked.reason}
          onChange={(reason) => controller.updateLinked({ reason })}
        />
        <Textarea
          className="max-h-32 min-h-16"
          placeholder="Note for the advocate (optional)"
          value={linked.note}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            controller.updateLinked({ note: event.target.value })
          }
        />
        {/*
         * A description, not an error: the officer just chose to open this block and
         * has attempted nothing yet — red on arrival reads as a scolding. The dead
         * Save button plus this quiet line carry the requirement; the screen-reader
         * announcement already happened when the question appeared.
         */}
        {missing ? (
          <FieldDescription>
            Pick what&rsquo;s wrong to enable Save.
          </FieldDescription>
        ) : null}
      </Field>
    </div>
  );
}
