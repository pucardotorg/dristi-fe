"use client";

import * as React from "react";
import {
  CheckIcon,
  MicIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { docName } from "@/lib/employee/scrutiny/field";
import type {
  Flag,
  FlagMap,
  FlatField,
} from "@/lib/employee/scrutiny/types";
import { OVERLAY_RISE, RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import {
  FieldValue,
  RecordLink,
  RecordList,
  RecordRow,
} from "@/components/employee/scrutiny/record-rows";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";

export type Decision = "send-back" | "register";

interface Item {
  field: FlatField;
  flag: Flag;
  where: string;
  /** The partner item this one was raised with, if any. */
  linked: FlatField | null;
  /**
   * A mark on an uploaded document whose own row carries no item — the one error this
   * design knows how to detect, and the last place it can still be caught.
   */
  stranded: string | null;
}

const GROUP_ORDER = [
  "Corrections — advocate confirms",
  "Flags — advocate fixes",
  "Document issues — advocate re-uploads",
] as const;

function group(
  flags: FlagMap,
  allFields: FlatField[],
  fieldById: Record<string, FlatField>,
  docRow: Record<string, string>,
): Record<string, Item[]> {
  const out: Record<string, Item[]> = Object.fromEntries(
    GROUP_ORDER.map((g) => [g, []]),
  );
  for (const field of allFields) {
    const flag = flags[field.id];
    if (!flag) continue;
    const partnerId = flag.linkedTo ?? flag.linkedFrom ?? null;
    const markedDoc = flag.evidence?.doc ?? null;
    const markedRow = markedDoc ? docRow[markedDoc] : null;
    const item: Item = {
      field,
      flag,
      where: `${field.group} · ${field.label}`,
      linked: partnerId ? (fieldById[partnerId] ?? null) : null,
      stranded:
        !field.docrow && markedDoc && markedRow && !flags[markedRow]
          ? markedDoc
          : null,
    };
    if (field.docrow) out[GROUP_ORDER[2]].push(item);
    else if (flag.correction) out[GROUP_ORDER[0]].push(item);
    else out[GROUP_ORDER[1]].push(item);
  }
  return out;
}

/**
 * Review &amp; decide. Everything the officer did, before it leaves their hands.
 *
 * Registering with open items is allowed — never block — but it takes an explicit
 * acknowledgement, which is what gates the primary button.
 */
export function ReviewDialog({
  decision,
  flags,
  onOpenChange,
  onDone,
  onGoToItem,
}: {
  decision: Decision | null;
  flags: FlagMap;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  /** A record you can act on: closes the dialog and lands on the item. */
  onGoToItem: (fieldId: string) => void;
}) {
  const { party, allFields, fieldById, docRow } = useScrutinyCase();
  const [ack, setAck] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  // Opening the dialog for a new decision starts from a clean slate. Adjusted during
  // render against the previous decision rather than in an effect.
  const [prevDecision, setPrevDecision] = React.useState(decision);
  if (decision !== prevDecision) {
    setPrevDecision(decision);
    if (decision) {
      setAck(false);
      setConfirmed(false);
    }
  }

  const groups = React.useMemo(
    () => group(flags, allFields, fieldById, docRow),
    [flags, allFields, fieldById, docRow],
  );
  const total = Object.values(groups).reduce((n, v) => n + v.length, 0);

  if (!decision) return null;

  const head =
    decision === "send-back"
      ? {
          title: "Send back to advocate",
          body: `Goes to ${party.advocate} as recorded. Corrections need confirmation; flags get fixed. Each item unlocks what you marked.`,
        }
      : {
          title: "Register case",
          body: total
            ? `The case moves to the Magistrate's list. ${total} open item${
                total > 1 ? "s travel" : " travels"
              } with it — registering does not clear ${total > 1 ? "them" : "it"}.`
            : "Every field was checked against the bundle. The case moves to the Magistrate's list for cognizance.",
        };

  const needsAck = decision === "register" && total > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* The house long-list overlay: a header, a body that is the only thing that
          scrolls, and a footer, each a region with a hairline seam between it and the
          next — the shell `SignOrderDialog` and `ApplicationReviewOverlay` use. The
          previous build clipped the list at a fixed `52vh` inside a padded box, which
          on a laptop cut the decision the dialog exists to take. */}
      <ChromeDialogContent
        className={cn(
          "flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          OVERLAY_RISE,
        )}
      >
        {confirmed ? (
          <>
            <div className={cn("flex flex-col items-center gap-3 p-6 text-center", RESOLVE_IN_PLACE)}>
              <div className="flex size-14 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground">
                <CheckIcon className="size-7" strokeWidth={2.2} />
              </div>
              <DialogTitle>
                {decision === "send-back"
                  ? `Sent back to ${party.advocate}`
                  : "Case registered"}
              </DialogTitle>
              {/* Send back needs no explanatory line — the title says what happened. On
                  register, say what the FSO's act sets in motion (the Magistrate takes it
                  up) and that the queue has moved on, rather than restating the filing
                  number back to them. */}
              {decision === "register" ? (
                <DialogDescription>
                  {total
                    ? `Registered with ${total} open item${
                        total > 1 ? "s" : ""
                      } attached — the Magistrate sees them when taking cognizance. Your next file is ready.`
                    : "Registered and sent to the Magistrate for cognizance. Your next file is ready."}
                </DialogDescription>
              ) : null}
            </div>
            <DialogFooter className="mx-0 mb-0 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Stay here
              </Button>
              <Button onClick={onDone}>Next file</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* `pr-16` keeps the title clear of the close button the DS places
                top-right. */}
            <DialogHeader className="shrink-0 gap-2 border-b border-hairline p-6 pr-16">
              <DialogTitle className="text-title-s font-semibold">
                {head.title}
              </DialogTitle>
              <DialogDescription className="text-body-compact text-muted-foreground">
                {head.body}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {total ? (
                GROUP_ORDER.filter((g) => groups[g].length).map((g) => (
                  <section key={g} className="pt-6 first:pt-0">
                    {/*
                     * A heading, set as one: caption size but foreground ink at 600, so
                     * it does not read as one more line of item metadata — and sticky,
                     * because on a send-back with twenty items the kind of grant you are
                     * reading is the thing that scrolls away first. It needs the body's
                     * own fill behind it, or items would show through as it passes.
                     */}
                    <h3 className="sticky top-0 z-10 -mx-6 bg-card px-6 pb-2 text-caption font-semibold text-foreground">
                      {g.split(" — ")[0]}{" "}
                      <span className="text-muted-foreground tabular-nums">
                        ({groups[g].length})
                      </span>
                    </h3>
                    <ul>
                      {groups[g].map((item) => (
                        <SummaryItem
                          key={item.field.id}
                          item={item}
                          onGoToItem={(fieldId) => {
                            onOpenChange(false);
                            onGoToItem(fieldId);
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyTitle className="text-title-s font-semibold">
                      Nothing raised
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </div>

            {/* The gate on the primary, in its own region above the footer rather than
                floating between two scrolling things. */}
            {needsAck ? (
              <div className="shrink-0 border-t border-hairline px-6 py-4">
                <Field orientation="horizontal">
                  <Checkbox
                    id="ack"
                    checked={ack}
                    onCheckedChange={(value) => setAck(value === true)}
                  />
                  <FieldLabel htmlFor="ack" className="font-normal">
                    I have seen the open flags and choose to register.
                  </FieldLabel>
                </Field>
              </div>
            ) : null}

            <DialogFooter className="mx-0 mb-0 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep reviewing
              </Button>
              <Button
                disabled={needsAck && !ack}
                onClick={() => setConfirmed(true)}
              >
                {decision === "send-back" ? "Send back" : "Register case"}
              </Button>
            </DialogFooter>
          </>
        )}
      </ChromeDialogContent>
    </Dialog>
  );
}

function SummaryItem({
  item,
  onGoToItem,
}: {
  item: Item;
  onGoToItem: (fieldId: string) => void;
}) {
  const { docById, docRow } = useScrutinyCase();
  const { field, flag } = item;
  const evidenceDoc = flag.evidence ? docById[flag.evidence.doc] : undefined;
  const reuploadApplies = !field.docrow && !!field.doc && !!docRow[field.doc];

  /*
   * The same label/value grammar the workbench record uses, so an item reads the same
   * on both surfaces and a send-back of twenty scans down one left edge instead of
   * twenty differently-shaped paragraphs. `@container` is declared here because this
   * box is what constrains the rows inside a dialog.
   */
  return (
    <li className="@container flex flex-col gap-2 border-b border-hairline py-4 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-body-compact font-semibold">{field.label}</h4>
        <span className="text-caption text-muted-foreground">{field.group}</span>
      </div>

      <RecordList>
        {flag.correction ? (
          <>
            <RecordRow label="Original value">
              <span className="text-muted-foreground line-through">
                <FieldValue field={field} value={field.value} copyable={false} />
              </span>
            </RecordRow>
            <RecordRow label="FSO’s value">
              <span className="font-medium">
                <FieldValue field={field} value={flag.correction} />
              </span>
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
        ) : null}

        {evidenceDoc ? (
          <RecordRow label="Annotation">
            <span className="tabular-nums">Doc {evidenceDoc.no}</span> ·{" "}
            {docName(flag.evidence!.doc, docById)}
          </RecordRow>
        ) : null}

        {reuploadApplies ? (
          <RecordRow label="Re-upload requested">
            {item.linked ? (
              <RecordLink onClick={() => onGoToItem(item.linked!.id)}>
                Yes — {docName(item.linked.docrow ?? "", docById)}
              </RecordLink>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </RecordRow>
        ) : null}

        {field.docrow && item.linked ? (
          <RecordRow label="Raised with">
            <RecordLink onClick={() => onGoToItem(item.linked!.id)}>
              {item.linked.label}
            </RecordLink>
          </RecordRow>
        ) : null}
      </RecordList>

      {/*
       * The last backstop. A mark on an uploaded document with no item on that
       * document's own row means the advocate gets the value unlocked and no re-upload
       * button — the exact miss this feature exists to stop, named here rather than
       * discovered on resubmission. Icon + words + colour, never colour alone.
       */}
      {item.stranded ? (
        <p className="flex flex-wrap items-center gap-2 text-caption text-warning-ink">
          <span className="inline-flex items-center gap-1">
            <TriangleAlertIcon className="size-3" aria-hidden="true" />
            Marked on {docName(item.stranded, docById)} — re-upload is not unlocked.
          </span>
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 [@media(pointer:coarse)]:h-10"
            onClick={() => onGoToItem(field.id)}
          >
            Open the item
          </Button>
        </p>
      ) : null}
    </li>
  );
}
