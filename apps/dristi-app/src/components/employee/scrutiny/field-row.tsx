"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowUpRightIcon,
  CheckIcon,
  FileTextIcon,
  FlagIcon,
  MicIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { docName } from "@/lib/employee/scrutiny/field";
import type {
  Flag as FlagType,
  FlatField,
} from "@/lib/employee/scrutiny/types";
import type { ScrutinyController } from "@/lib/employee/scrutiny/use-scrutiny-state";
import { cn } from "@/lib/utils";
import { FlagComposer } from "@/components/employee/scrutiny/flag-composer";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import { MarkThumb } from "@/components/employee/scrutiny/mark-thumb";
import {
  RecordLink,
  RecordList,
  RecordRow,
} from "@/components/employee/scrutiny/record-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * One filed field = one `DescriptionRow`, made interactive.
 *
 * The row carries NO border radius: its own bottom border IS the divider between rows,
 * and rounding the box rounds the ends of that 1px rule.
 *
 * The loudness ladder, spent once: hover is the accent fill, and selection is a leading
 * inset bar. Selection used to take `accent-strong` as well, which left the record inside
 * it with no fill of its own to sit on — beige on beige — and stacked two cues on the
 * same row. One quiet persistent mark is the whole allowance.
 */
export function FieldRow({
  field,
  controller,
  aiOn,
  onGoToDoc,
  onGoToItem,
}: {
  field: FlatField;
  controller: ScrutinyController;
  aiOn: boolean;
  onGoToDoc: (docId: string) => void;
  onGoToItem: (fieldId: string) => void;
}) {
  const { docById } = useScrutinyCase();
  const flag = controller.flags[field.id];
  const selected = controller.selectedId === field.id;
  const composing = controller.composeField === field.id;
  const flagTitle = flag
    ? "Edit this flag"
    : field.docrow
      ? "Flag document"
      : "Correct or flag";

  return (
    <DescriptionRow
      id={`row-${field.id}`}
      className={cn(
        // `border-hairline` overrides the DS row default (`border-border`, a darker rule)
        // so the divider between rows matches the lighter hairline the case file uses
        // (owner, 2026-09-15).
        "group/frow relative -mx-2 cursor-pointer grid-cols-[minmax(5.5rem,9rem)_1fr] border-hairline px-2 transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "hover:bg-accent",
        // A machine observation carries no row fill. The `HintLine` under the value —
        // icon, words, and the warning pair's own ink — is the complete signal, and
        // washing the row as well made every unread field a tinted band. Status text on
        // a neutral ground, never a fill.
        selected &&
          "before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-primary before:content-['']",
        // While composing, the composer's well is the surface; a row fill under it
        // would stack two greys and blur the well's edge.
        composing && "bg-transparent hover:bg-transparent",
      )}
      role="option"
      tabIndex={0}
      aria-selected={selected}
      data-flagged={flag ? true : undefined}
      onClick={() => controller.selectField(field.id)}
      onKeyDown={(event) => {
        // Only the row itself: a Space typed into the composer's textarea bubbles
        // here, and swallowing it made "Not a clear document" come out as
        // "Notacleardocument".
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          controller.selectField(field.id);
        }
      }}
    >
      <DescriptionTerm>{field.label}</DescriptionTerm>
      <DescriptionDetails>
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/*
             * While the composer is open the row says nothing of its own: the composer's
             * "Filed" block carries the old value and its AI badge carries the machine
             * reading, so repeating them here stated the same two numbers three times —
             * the exact "all over the place" the redesign removes.
             */}
            {composing ? null : (
              <>
                <ValueLines field={field} flag={flag} />
                <Hints field={field} flag={flag} aiOn={aiOn} />
              </>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {/*
             * A persistent source glyph, not a hover-gated one: structure is shown by
             * form, and hover-only affordances are unreachable by keyboard and touch.
             */}
            {field.doc && !field.thumb ? (
              /* The glyph says "this value came from a document"; the tooltip names which,
                 and the same text stays in `sr-only` so it is not a hover-only fact. */
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                    <span className="sr-only">
                      {`Read from Doc ${docById[field.doc]?.no}, ${docById[field.doc]?.name}${
                        field.srcnote ? ` — ${field.srcnote}` : ""
                      }`}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {`Read from Doc ${docById[field.doc]?.no}, ${docById[field.doc]?.name}${
                    field.srcnote ? ` — ${field.srcnote}` : ""
                  }`}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive-ghost"
                  size="icon-sm"
                  /* Dense by design inside the record, but never below the touch floor:
                     the registry works on tablets, so a coarse pointer gets the full 40px
                     (DS Laws, ACCESSIBILITY §5). */
                  className="[@media(pointer:coarse)]:size-10"
                  aria-label={`${flagTitle}: ${field.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    controller.openComposer(field.id);
                  }}
                >
                  <FlagIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{flagTitle}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </DescriptionDetails>

      {/*
       * The record and the composer occupy the same box, spanning both columns. At the
       * panel's 24% floor the value column can spare about 140px — not enough for a
       * badge, a claim and two buttons — and editing an item now unfolds it in place
       * instead of moving it.
       */}
      {composing ? (
        <FlagComposer field={field} controller={controller} onGoToItem={onGoToItem} />
      ) : flag ? (
        <RaisedItem
          field={field}
          flag={flag}
          controller={controller}
          onGoToDoc={onGoToDoc}
          onGoToItem={onGoToItem}
        />
      ) : null}
    </DescriptionRow>
  );
}

/**
 * A saved correction shows the proposed value as THE value, with the filed value on one
 * quiet line beneath — no strikethrough noise in the primary position.
 */
function ValueLines({ field, flag }: { field: FlatField; flag?: FlagType }) {
  if (flag?.correction) {
    // Only the proposed value — the current truth of the row. The filed value lives in
    // the raised item's well below, beside the note and the actions, so the whole
    // record of "what changed and why" reads as one block instead of three.
    return (
      <div className="text-body-compact font-medium break-words">
        {flag.correction}
      </div>
    );
  }
  if (!field.value) return null;
  return (
    <div
      className={cn(
        "text-body-compact break-words",
        field.long ? "text-muted-foreground" : "font-medium",
      )}
    >
      {field.value}
    </div>
  );
}

/**
 * Only real signals appear here. Rows with nothing to say say nothing — an interface
 * that narrates itself is an interface that isn't legible.
 *
 * Once a human has acted, the machine goes quiet: every machine-origin observation moves
 * inside the item's well as grey provenance, so a settled row carries one cue, not three.
 * `nodoc` is the exception because it is not a machine reading — it is a standing fact
 * about the bundle that renders with AI off and is already grey.
 */
function Hints({
  field,
  flag,
  aiOn,
}: {
  field: FlatField;
  flag?: FlagType;
  aiOn: boolean;
}) {
  const { docById } = useScrutinyCase();
  const lines: React.ReactNode[] = [];
  const flagged = !!flag;
  const thumbId = field.thumb ?? field.docrow;
  const thumbDoc = thumbId ? docById[thumbId] : undefined;
  // The item's crop is strictly more specific than the row's source thumbnail. Showing
  // both stacks two sunken boxes of the same document in one row.
  const croppedHere = flag?.evidence?.doc === thumbId;

  if (thumbDoc?.src && !croppedHere) {
    lines.push(
      <div
        key="thumb"
        className="inline-flex items-center gap-2 self-start rounded-md bg-surface-sunken p-1 pe-2.5 text-caption text-muted-foreground"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbDoc.src}
          alt=""
          className="h-8 w-12 rounded-sm object-cover"
        />
        <span className="tabular-nums">Doc {thumbDoc.no}</span>
      </div>,
    );
  }
  if (aiOn && field.docread && !flagged) {
    lines.push(
      <HintLine key="docread" tone="warning" icon={<TriangleAlertIcon />}>
        Document shows a different value.
      </HintLine>,
    );
  }
  if (aiOn && field.ocrfail && !flagged) {
    lines.push(
      <HintLine key="ocrfail" tone="warning" icon={<TriangleAlertIcon />}>
        Couldn&rsquo;t read this in the document.
      </HintLine>,
    );
  }
  if (aiOn && field.aiok && !flagged) {
    lines.push(
      <HintLine key="aiok" tone="success" icon={<CheckIcon />}>
        {field.aiok}
      </HintLine>,
    );
  }
  if (field.nodoc) {
    lines.push(
      <HintLine key="nodoc" tone="muted" icon={<FileTextIcon />}>
        {field.nodoc}
      </HintLine>,
    );
  }
  if (field.scannote && !flagged) {
    lines.push(
      <HintLine key="scannote" tone="warning" icon={<TriangleAlertIcon />}>
        {field.scannote}
      </HintLine>,
    );
  }
  return <>{lines}</>;
}

/** Each tone takes the ink of its own status pair — never grey text on a status line. */
const HINT_TONE = {
  muted: "text-muted-foreground",
  warning: "text-warning-muted-foreground",
  success: "text-success-muted-foreground",
} as const;

function HintLine({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof HINT_TONE;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-1.5 text-caption", HINT_TONE[tone])}>
      <span className="mt-px shrink-0 [&>svg]:size-3.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * The record. Reading it answers four questions without a click: what kind, what is
 * wrong, what backs it up, and what it unlocks — in that fixed order.
 *
 * The Edit/Remove pair reveals on hover, selection and focus-within, and stays visible
 * on touch: a hover-only control is no control at all on a tablet, which is what the
 * registry actually uses.
 */
function RaisedItem({
  field,
  flag,
  controller,
  onGoToDoc,
  onGoToItem,
}: {
  field: FlatField;
  flag: FlagType;
  controller: ScrutinyController;
  onGoToDoc: (docId: string) => void;
  onGoToItem: (fieldId: string) => void;
}) {
  const { docById, docRow, fieldById } = useScrutinyCase();
  const evidence = flag.evidence;
  const evidenceDoc = evidence ? docById[evidence.doc] : undefined;
  const partnerId = flag.linkedTo ?? flag.linkedFrom ?? null;
  const partner = partnerId ? fieldById[partnerId] : undefined;
  // A field sourced from an uploaded document could have had a re-upload requested,
  // so the row states the answer either way. Generated pages have nothing to re-upload.
  const reuploadApplies = !field.docrow && !!field.doc && !!docRow[field.doc];
  const silent = !flag.comment && !flag.correction && !flag.reason;

  /*
   * The record is a small table: one label column, one value column, rows only where
   * they apply. That is what makes it scannable at a glance and scalable as items grow
   * more kinds of fact — the owner's call, replacing the earlier stack of unlike lines.
   *
   * A sunken well inside the card, carrying a hairline. The stroke is what keeps it
   * legible when the row behind it is hovered or selected: row hover is `accent` (243)
   * and the well is `surface-sunken` (245), so on a ramp this tight the two fills all
   * but merge and the record loses its edge exactly when the officer is pointing at it.
   * DS Laws sanction the stroke here — a well holding interactive content (Edit /
   * Remove) takes a hairline.
   */
  return (
    <div
      className={cn(
        "col-span-full my-1 flex flex-col gap-3 rounded-lg border border-hairline bg-surface-sunken p-3 @container",
        // The item settles into place when it is saved — the same resolve the case file
        // uses for a fact taking its outcome (`motion.ts`).
        RESOLVE_IN_PLACE,
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant={flag.correction ? "info" : "destructive"}>
          {flag.correction
            ? "FSO’s correction"
            : field.docrow
              ? "Document issue"
              : "Flag"}
        </Badge>
        <span className="ms-auto -my-1 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/frow:opacity-100 group-focus-within/frow:opacity-100 group-aria-selected/frow:opacity-100 [@media(hover:none)]:opacity-100">
          {/* `xs` is the record's own density — two words inside a well inside a row —
              but a coarse pointer still gets the 40px floor. */}
          <Button
            variant="ghost"
            size="xs"
            className="[@media(pointer:coarse)]:h-10"
            onClick={(event) => {
              event.stopPropagation();
              controller.openComposer(field.id);
            }}
          >
            Edit
          </Button>
          <Button
            variant="destructive-ghost"
            size="xs"
            className="[@media(pointer:coarse)]:h-10"
            onClick={(event) => {
              event.stopPropagation();
              const stranded = controller.removeFlag(field.id);
              if (!stranded) return;
              /*
               * Removal never cascades: a bad scan is still a bad scan. Say what stayed
               * behind, and offer the second removal rather than performing it.
               */
              toast(
                `Flag removed. The document issue on ${docName(
                  fieldById[stranded]?.docrow ?? "",
                  docById,
                )} stays.`,
                {
                  action: {
                    label: "Remove it too",
                    onClick: () => controller.removeFlag(stranded),
                  },
                },
              );
            }}
          >
            Remove
          </Button>
        </span>
      </div>

      <RecordList>
        {flag.correction ? (
          <>
            {/* Original first, then the correction under it — the reader sees what was
                filed, then what it becomes (owner, 2026-09-15). */}
            <RecordRow label="Original value">
              <span className="text-muted-foreground line-through">
                {field.value || "—"}
              </span>
            </RecordRow>
            <RecordRow label="FSO’s value">
              <span className="font-medium">{flag.correction}</span>
            </RecordRow>
          </>
        ) : null}

        {field.docrow && flag.reason ? (
          <RecordRow label="Reason">{flag.reason}</RecordRow>
        ) : null}

        {flag.comment ? (
          <RecordRow label="FSO’s comment">
            <span className="break-words">{flag.comment}</span>
            {flag.voice ? (
              <span className="ms-2 inline-flex items-center gap-1 text-caption text-muted-foreground">
                <MicIcon className="size-3" aria-hidden="true" /> voice
              </span>
            ) : null}
          </RecordRow>
        ) : silent ? (
          <RecordRow label="FSO’s comment">
            <span className="text-warning-ink">{SILENT_FALLBACK}</span>
          </RecordRow>
        ) : null}

        {evidence && evidenceDoc ? (
          <RecordRow label="Annotation">
            <button
              type="button"
              className="-m-1 flex items-center gap-2 rounded-md p-1 pe-2 text-start transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={(event) => {
                event.stopPropagation();
                onGoToDoc(evidence.doc);
              }}
              aria-label={`Go to the annotation on Doc ${evidenceDoc.no}, ${docName(evidence.doc, docById)}`}
            >
              <MarkThumb evidence={evidence} />
              <span className="min-w-0 truncate">
                <span className="tabular-nums">Doc {evidenceDoc.no}</span> ·{" "}
                {docName(evidence.doc, docById)}
              </span>
              <ArrowUpRightIcon
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          </RecordRow>
        ) : null}

        {reuploadApplies ? (
          <RecordRow label="Re-upload requested">
            {partner ? (
              <RecordLink onClick={() => onGoToItem(partner.id)}>
                Yes — {docName(partner.docrow ?? "", docById)}
                {controller.flags[partner.id]?.reason
                  ? ` · ${controller.flags[partner.id]?.reason}`
                  : ""}
              </RecordLink>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </RecordRow>
        ) : null}

        {field.docrow && partner ? (
          <RecordRow label="Raised with">
            <RecordLink onClick={() => onGoToItem(partner.id)}>
              {partner.label}
            </RecordLink>
          </RecordRow>
        ) : null}
      </RecordList>
    </div>
  );
}

/** Defensive only — D1 stops a new item ever reaching it. */
const SILENT_FALLBACK = "No note — the advocate won't know what to fix.";
