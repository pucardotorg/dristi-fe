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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  StagedOverlay,
  useStagedFlow,
} from "@/components/chrome/staged-overlay";
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
 * The act's two stages, in the order it moves through them: everything the officer
 * raised, and what happened when they decided on it.
 */
const STAGES = ["review", "done"] as const;

type Stage = (typeof STAGES)[number];

/**
 * A scene each. The outcome is not this list with a mark on it — the list is what the
 * decision was taken *from*, and once it is taken the window has one thing left to say —
 * so the stage travels rather than settling where it stands.
 */
const SCENE: Record<Stage, string> = { review: "review", done: "done" };

/**
 * Review &amp; decide. Everything the officer did, before it leaves their hands.
 *
 * Registering with open items is allowed — never block — but it takes an explicit
 * acknowledgement, which is what gates the primary button.
 *
 * **Both stages are one window** (`StagedOverlay`), the frame every other court-side act
 * moves inside. The decision and its outcome used to be two wholesale swaps inside one
 * `Dialog`, and the confirmation dropped the header entirely to draw its own heading —
 * which is precisely the moment an overlay stops looking like the overlay. Now the chrome
 * holds still and carries the outcome in the line it already had, and only the stage
 * between header and footer travels.
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

  /* Opening the dialog for a new decision starts from a clean slate — back to the list,
     and the acknowledgement is not inherited from the decision before it. The flow makes
     that adjustment during render, against the decision it last showed. */
  const flow = useStagedFlow({
    order: STAGES,
    scene: SCENE,
    record: decision ?? "closed",
    /* The "record" changing here *is* the overlay opening, not a second decision arriving
       in a window that stayed up — so the stage takes the frame's ordinary entrance and
       lets the panel's own rise be the gesture. On the default it would rise inside a
       rise. */
    arrival: "forward",
    onRecordChange: () => setAck(false),
  });

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

  /* What the header says once the decision is taken: the confirmation's own heading and
     sentence, moved up into the chrome. With the frame held still there is no second
     heading to draw, and a title that rewrites itself is how the window says the act is
     done. Send back needs no line under it — the title has said what happened. On
     register, say what the act sets in motion (the Magistrate takes it up) and that the
     queue has moved on, rather than restating the filing number back to them. */
  const settled =
    decision === "send-back"
      ? { title: `Sent back to ${party.advocate}`, body: undefined }
      : {
          title: "Case registered",
          body: total
            ? `Registered with ${total} open item${
                total > 1 ? "s" : ""
              } attached — the Magistrate sees them when taking cognizance. Your next file is ready.`
            : "Registered and sent to the Magistrate for cognizance. Your next file is ready.",
        };

  const needsAck = decision === "register" && total > 0;
  const done = flow.stage === "done";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <StagedOverlay
        /* A long list needs the measure; it does not need the width of a document. No
           definite height, so the stage takes the floor instead: the outcome is a
           fraction of the list's height, and a centred dialog that shrank to it would
           travel up the screen at the moment it is claiming the act settled where it
           stood. */
        className="sm:max-w-2xl"
        floor
        title={done ? settled.title : head.title}
        titleRef={flow.titleRef}
        description={done ? settled.body : head.body}
        sceneKey={flow.sceneKey}
        motion={flow.motion}
        footer={
          done ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Stay here
              </Button>
              <Button onClick={onDone}>Next file</Button>
            </>
          ) : (
            <>
              {/* The gate on the primary, beside the button it gates. It had its own
                  region above the footer before the frame, which has two regions and not
                  three — and it is chrome on either side of that seam, so what it loses
                  is a hairline, not its place in view. */}
              {needsAck ? (
                <Field
                  orientation="horizontal"
                  className="sm:mr-auto sm:w-auto sm:self-center"
                >
                  <Checkbox
                    id="ack"
                    checked={ack}
                    onCheckedChange={(value) => setAck(value === true)}
                  />
                  <FieldLabel htmlFor="ack" className="font-normal">
                    I have seen the open flags and choose to register.
                  </FieldLabel>
                </Field>
              ) : null}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep reviewing
              </Button>
              <Button
                disabled={needsAck && !ack}
                onClick={() => flow.go("done")}
              >
                {decision === "send-back" ? "Send back" : "Register case"}
              </Button>
            </>
          )
        }
      >
        {done ? (
          /* The act, settled. The words are in the header — the title names what
             happened, and on a registration the line under it says what it sets in
             motion — so what is left on the stage is the mark, in the middle of the
             surface the list was read on. */
          <div className="my-auto flex flex-col items-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground">
              <CheckIcon aria-hidden="true" className="size-7" strokeWidth={2.2} />
            </div>
          </div>
        ) : (
          /* Everything raised, in a panel on the stage: a white card with a hairline and
             a lift, because a list laid straight onto the tinted canvas has no edge of
             its own and the sticky group headings would have nothing to sit on. The card
             holds the scroll, so a send-back with twenty items scrolls inside the panel
             and the frame around it does not move. */
          <Card className="min-h-0 border-hairline shadow-raised">
            <CardContent className="min-h-0 overflow-y-auto">
              {total ? (
                GROUP_ORDER.filter((g) => groups[g].length).map((g) => (
                  <section key={g} className="pt-6 first:pt-0">
                    {/*
                     * A heading, set as one: caption size but foreground ink at 600, so
                     * it does not read as one more line of item metadata — and sticky,
                     * because on a send-back with twenty items the kind of grant you are
                     * reading is the thing that scrolls away first. It needs the card's
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
            </CardContent>
          </Card>
        )}
      </StagedOverlay>
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
