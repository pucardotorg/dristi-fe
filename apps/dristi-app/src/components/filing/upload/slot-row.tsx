"use client";

/**
 * One document row on the case-documents screen.
 *
 * The DS `DocumentSlot` is the row; everything here composes *around* it rather than
 * restyling it. The slot's `label` takes a ReactNode, so the guidance ("The memo your
 * bank issued when this cheque bounced.") and the read status both live *inside* the row
 * as quiet lines under the title. Nothing about a row's state floats underneath it as an
 * orphan paragraph — that is what used to leave the re-upload button aligned to nothing.
 *
 * Every action sits in one right-aligned cluster at the end of the row, delete always
 * last, so the final control lines up down the column whether a row offers re-upload,
 * delete, or only the slot's own "Choose file". The thumbnail is the preview control.
 */

import * as React from "react";
import { CircleCheckIcon, RefreshCwIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";

import { formatBytes } from "@/lib/filing/files";
import { defectState } from "@/lib/tasks/defects";
import { cn } from "@/lib/utils";
import type { IntakeSlot } from "@/lib/filing/types";
import { Button } from "@/components/ui/button";
import { DocumentSlot } from "@/components/ui/document-slot";
import { Progress } from "@/components/ui/progress";
import { useCorrection } from "@/components/filing/posture";
import { SlotThumbnail } from "@/components/filing/upload/thumbnail";
import { readOutcome, readToneClass } from "@/components/filing/upload/read-status";
import {
  useDropTarget,
  type DroppedFiles,
} from "@/components/filing/upload/use-drop-target";

/**
 * The DS status variant. Never `filled-poor`: that variant forces the "Poor scan" badge,
 * and low confidence is not the outcome — a poor scan that filled seven fields is a read,
 * not a failure. What reading produced is said in words on the row's status line, which
 * is the row's single status cue. See `read-status.ts`.
 */
function slotStatus(
  slot: IntakeSlot
): "processing" | "filled" | "empty" | "empty-optional" {
  if (slot.processing) return "processing";
  if (slot.file) return "filled";
  return slot.required ? "empty" : "empty-optional";
}

/**
 * The media well, page-shaped rather than the DS square — a square crop of a cheque or an
 * Aadhaar card is noise, which is the same conclusion the uploaded-documents drawer
 * reached. The same box empty or filled, so a row does not jump when a file lands.
 * Overridden from the row because `DocumentSlot` fixes it at `size-16` / `size-10`.
 */
const MEDIA_CLASS = [
  "[&_[data-slot=document-slot-media]]:h-12",
  "[&_[data-slot=document-slot-media]]:w-16",
  "sm:[&_[data-slot=document-slot-media]]:h-14",
  "sm:[&_[data-slot=document-slot-media]]:w-20",
].join(" ");

/* ───────────────────────────── The row ─────────────────────────────────── */

export function IntakeSlotRow({
  slot,
  onChoose,
  onPreview,
  onDelete,
  onFiles,
  onOverChange,
}: {
  slot: IntakeSlot;
  onChoose: () => void;
  onPreview: () => void;
  onDelete: () => void;
  /** Files dropped on this row: the first fills this slot, the rest spill onward. */
  onFiles: (dropped: DroppedFiles) => void;
  onOverChange?: (over: boolean) => void;
}) {
  const ids = React.useId();
  const titleId = `${ids}-title`;
  const { isOver, dropProps } = useDropTarget({ onFiles, onOverChange });

  /*
   * In a correction round a document is either the one scrutiny flagged — and then it is
   * replaced from the panel's card (v3.2) — or it is not this round's business. `inert` is
   * the honest lock: the subtree stops taking pointer and keyboard both, rather than
   * looking live and refusing.
   */
  const correction = useCorrection();
  const defect = correction ? correction.defectForSlot(correction.step, slot.key) : null;
  const locked = !!correction && !defect;

  /* The card holds the Replace action but this row owns the picker, so lend it out. */
  const register = correction?.registerReplace;
  React.useEffect(() => {
    if (!register || !defect) return;
    return register(slot.key, onChoose);
  }, [register, defect, slot.key, onChoose]);

  const status = slotStatus(slot);
  const pct = Math.round(slot.progress ?? 0);
  const showGuidance = !slot.file && !slot.processing && !!slot.desc;

  const outcome = readOutcome(slot);
  /* While the read is running the slot's meta line and the progress bar already say so;
     a third "Reading…" line would be the same fact three times. In a correction round the
     machine-read outcome ("nothing to pre-fill — type the details in the form") is intake
     advice about a form that is now read-only, so it stands down entirely. */
  const statusLine =
    !correction && outcome && outcome.kind !== "reading" ? outcome : null;
  const StatusIcon = statusLine?.tone === "success" ? CircleCheckIcon : TriangleAlertIcon;

  const body = (
    <div
      role="group"
      aria-labelledby={titleId}
      {...(locked ? {} : dropProps)}
      inert={locked || undefined}
      /* Locked in a correction round: the row is inert, and the DS disabled fill on its
         controls says so. It does not fade — the point of listing the documents scrutiny
         did *not* flag is that the advocate can read them. */
      className={cn(
        "flex flex-col gap-2",
        locked && "[&_button]:bg-disabled-fill [&_button]:text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg transition-shadow",
          // Same fill as the DS filled slot, so the slot and its actions read as one pill.
          slot.file && "bg-surface-sunken pr-4",
          isOver && "ring-3 ring-focus-ring"
        )}
      >
        <DocumentSlot
          status={status}
          media={slot.file ? "thumbnail" : "icon"}
          label={
            <span className="flex flex-col gap-1">
              <span id={titleId}>
                {slot.label}
                {/* Phone: "optional" as the form fields say it, a quiet word after the
                    name. The DS badge wrapped under the guidance and split the block. */}
                {!slot.required && !slot.file ? (
                  <span className="font-normal text-muted-foreground sm:hidden"> optional</span>
                ) : null}
              </span>
              {showGuidance ? (
                <span className="text-caption text-muted-foreground">{slot.desc}</span>
              ) : null}
              {statusLine ? (
                <span
                  className={cn(
                    "flex items-start gap-1.5 text-caption",
                    readToneClass(statusLine.tone)
                  )}
                >
                  {statusLine.tone === "muted" ? null : (
                    <StatusIcon className="size-4 shrink-0" aria-hidden />
                  )}
                  <span>{statusLine.text}</span>
                </span>
              ) : null}
            </span>
          }
          filename={slot.file?.name}
          meta={
            slot.processing
              ? `Reading document… ${pct}%`
              : slot.file
                ? formatBytes(slot.file.size)
                : undefined
          }
          thumbnail={
            slot.file ? (
              <SlotThumbnail file={slot.file} label={slot.label} onPreview={onPreview} />
            ) : undefined
          }
          onChooseFile={onChoose}
          /* h-10: the slot's own Choose file button is `size="sm"` (36px), under the DS
             40×40 touch floor (ACCESSIBILITY.md §8). Height only — see the build report.
             The empty well is the one place its icon is the primary content, so it takes
             the 24px step, on `surface-sunken` because `muted` is invisible on a card. */
          className={cn(
            "min-w-0 flex-1 items-center [&>button]:h-10",
            /* Phone, empty slot: the name, its guidance and the state read as one block
               the full width of the slot, and Choose file goes under them edge to edge.
               The file glyph goes: beside three lines of text it was a grey square
               holding nothing, and it cost the text a quarter of the row. */
            !slot.file &&
              "max-sm:flex-wrap max-sm:gap-3 max-sm:p-3 max-sm:[&>button]:w-full max-sm:[&_[data-slot=document-slot-media]]:hidden max-sm:[&_[data-slot=badge]]:hidden",
            MEDIA_CLASS,
            slot.file
              ? "[&_[data-slot=document-slot-media]]:bg-card"
              : "[&_[data-slot=document-slot-media]]:bg-surface-sunken [&_[data-slot=document-slot-media]_svg]:size-6"
          )}
        />

        {/* One cluster, vertically centred, delete always last — so the right edge of the
            row's actions is the same on every row whatever a row can do. */}
        {slot.file ? (
          <div className="flex shrink-0 items-center gap-1">
            {/* A flagged row carries no action of its own. The sanctity that keeps a
                flagged *field* read-only extends to documents: the scan the Registry saw
                stays as it is on the row, and the replacement is made in the inset
                beneath it (brief §15.4). The thumbnail still opens the full view. */}
            {defect ? null : statusLine?.reupload ? (
              /* Labelled where there is room; a 40×40 icon button on a phone, where a
                 118px label would leave the status line about fifty pixels to wrap in.
                 The accessible name carries the label at every width. */
              <Button
                type="button"
                variant="outline"
                onClick={onChoose}
                aria-label={`Re-upload ${slot.label}`}
                className="max-sm:w-10 max-sm:gap-0 max-sm:px-0 max-sm:has-data-[icon=inline-start]:pl-0"
              >
                <RefreshCwIcon data-icon="inline-start" aria-hidden />
                <span className="max-sm:sr-only">Re-upload</span>
              </Button>
            ) : null}
            {/* No delete in a correction round. Removing a filed document is not a way to
                answer a defect — replacement is the only path — and an empty slot where
                the Registry saw a document is a worse filing, not a corrected one. */}
            {correction ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                aria-label={`Remove the file added for ${slot.label}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon aria-hidden />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {slot.processing ? (
        <Progress value={pct} aria-label={`Reading ${slot.label}`} />
      ) : null}
    </div>
  );

  if (defect) {
    /* Flagged: a rule down the left, matching a flagged field. The scan the Registry saw
       stays as it is; the replacement is made in the panel's card (v3.2). */
    const resolved = defectState(defect, correction?.valueOf(defect)) === "resolved";
    const active = correction?.activeDefect === defect.n;
    return (
      <div
        id={`defect-${defect.n}`}
        data-defect-group
        data-defect={defect.n}
        className={cn(
          "scroll-mt-6 border-l-2 pl-3 transition-colors",
          resolved ? "border-l-success-ink" : active ? "border-l-primary" : "border-l-border"
        )}
      >
        {body}
      </div>
    );
  }
  /* Untouched by scrutiny: off the screen unless the header's "show full filing" toggle
     brings it back — and then visibly out of play. */
  if (locked && !correction?.showAll) return null;
  return <div className={cn(locked && "opacity-45")}>{body}</div>;
}
