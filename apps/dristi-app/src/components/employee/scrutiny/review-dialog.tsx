"use client";

import * as React from "react";
import {
  CircleCheckIcon,
  CornerUpLeftIcon,
  MicIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { docName } from "@/lib/employee/scrutiny/field";
import type {
  Flag,
  FlagMap,
  FlatField,
} from "@/lib/employee/scrutiny/types";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
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
 * **One scene for both stages**, so nothing travels.
 *
 * The outcome *is* this list — it is what the decision was taken from, and the last place
 * those items can be read before the queue moves on. Sending it away to show a tick in an
 * empty field threw the receipt out and said "done" where the act was a hand-off. So the
 * list stays exactly where it was and a band resolves across the top of it, which is the
 * shape the bulk signature already settled on: the second screen is the first screen with
 * a stamp on it. Stages sharing a scene do not remount, so there is no slide and no
 * entrance to replay.
 */
const SCENE: Record<Stage, string> = { review: "review", done: "review" };

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

  /*
   * The act, at three ranges: the title names it, the line under it says what it sets in
   * motion, and the band on the list is the state of the items themselves.
   *
   * **The settled header keeps a line of the same shape as the question's**, and that is
   * structural rather than editorial. The stage has a floor so a shorter stage cannot
   * re-centre the panel — but a *header* that drops from two lines to none moves the whole
   * window by 48px, which is the same fault by another route (measured: 662 → 614 when the
   * settled stage had no line). The frame's other answer is a definite height, and a list
   * of three items does not want 85dvh of white under it. So the line stays, and the band
   * says the one word the colour and the glyph are already saying.
   */
  const settled =
    decision === "send-back"
      ? {
          title: `Sent back to ${party.advocate}`,
          body: `${total} item${
            total > 1 ? "s" : ""
          } went back for the advocate to act on. The file returns to your queue when they resubmit — your next file is ready.`,
          band: "Sent back",
        }
      : {
          title: "Case registered",
          body: total
            ? `Registered with ${total} open item${
                total > 1 ? "s" : ""
              } attached — the Magistrate sees them when taking cognizance. Your next file is ready.`
            : "Registered and sent to the Magistrate for cognizance. Your next file is ready.",
          band: "Registered",
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
        /* The floor is only load-bearing while there is a list. It stops a shorter stage
           re-centring the panel — but with nothing raised both stages are the band alone,
           so there is nothing to shorten, and holding it would put 407px of blank white
           under a band reading "Nothing raised", which looks like a screen that failed to
           load. Off, the window is a 235px confirmation, which is what a clean file
           deserves.

           The one cost, measured: on that path the settled line wraps to one row where the
           question wrapped to two, so the window settles 20px shorter. Writing a sentence
           to fill a line would be worse, and so would the void — the frame's own trade,
           that a window which resizes is a smaller fault than a window with no way out. */
        floor={total > 0}
        /* One long list, not objects on a canvas: a panel the same shape as the surface
           under it is a card inside a card inside a modal (owner, 2026-09-17). The stage
           is the overlay's own white, framed by the header and footer hairlines, and the
           insets are this file's because the band below is full-bleed and the list is
           not. */
        surface="card"
        padded={false}
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Keep reviewing
              </Button>
              <Button
                disabled={needsAck && !ack}
                onClick={() => flow.go("done")}
              >
                {decision === "send-back" ? "Send back" : "Register case"}
              </Button>
              {/* The gate on the primary, beside the button it gates. It had its own
                  region above the footer before the frame, which has two regions and not
                  three — and it is chrome on either side of that seam, so what it loses
                  is a hairline, not its place in view.

                  **Last in the markup, first on screen.** The footer is
                  `flex-col-reverse` on a phone, so a gate written before the buttons
                  renders *under* the disabled primary it explains (measured at 390px).
                  Written after them it reads first on the phone, and `sm:order-first`
                  puts it back on the left of the row once the footer is a row. */}
              {needsAck ? (
                <Field
                  orientation="horizontal"
                  className="sm:order-first sm:mr-auto sm:w-auto sm:self-center"
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
            </>
          )
        }
      >
        {/* One column: the band, then the list, and **only the list scrolls.** The band
            sits outside the scroller deliberately — a status strip that leaves with the
            twentieth item is not a status strip, and the group headings below it need the
            scroller's own top edge to stick to. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            /* Keyed on the act, so the settled band mounts and resolves where the caption
               stood; the list below is not keyed and does not move. **Both states carry a
               1px bottom rule** — transparent under the solid fill — because a band that
               changed height would shift the whole list at the exact moment this design is
               claiming the act settled in place. (Measured on the bulk signature's band
               before it carried one.) */
            key={done ? "settled" : "caption"}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b px-4 py-2.5 text-body-compact sm:px-6",
              !done && "border-hairline text-muted-foreground",
              done &&
                cn(
                  RESOLVE_IN_PLACE,
                  decision === "register"
                    ? /* Registered is a terminal good outcome, so it takes the solid
                         success — the same band the bulk signature resolves to. */
                      "border-transparent bg-success text-success-foreground"
                    : /* A send-back is **not** a success, and not a failure either: it is
                         the ordinary path, and most files take it at least once. Colour
                         carries one meaning on these screens, so an outcome that is
                         neither gets the neutral well — the same fill the acknowledgement
                         toast settled on this week — and an icon that says *returned*
                         rather than *done* (owner, 2026-09-17: "it cannot be like a tick
                         mark… it's basically sending it back again"). */
                      "border-hairline bg-surface-sunken text-foreground",
                ),
            )}
          >
            {done ? (
              <>
                {decision === "register" ? (
                  <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
                ) : (
                  <CornerUpLeftIcon aria-hidden className="size-4 shrink-0" />
                )}
                {/* `role="status"` is what gets the outcome spoken: focus lands on the
                    header title, which announces itself and nothing under it. */}
                <span role="status" className="font-medium">
                  {settled.band}
                </span>
              </>
            ) : (
              /* The list's caption before the act, and the slot the outcome resolves
                 into. It names what is below rather than counting it — the group headings
                 carry their own counts and the header has already said how many travel.
                 With nothing raised it is the empty state as well, which is why no
                 separate empty panel sits below it. */
              <span>{total ? "Everything you raised" : "Nothing raised"}</span>
            )}
          </div>

          {/* No list, no scroller — an inset region with nothing in it is 48px of dead
              strip under the band, and with nothing raised the band has already said so. */}
          {total ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {GROUP_ORDER.filter((g) => groups[g].length).map((g) => (
                <section key={g} className="pt-6 first:pt-0">
                  {/*
                   * A heading, set as one: caption size but foreground ink at 600, so
                   * it does not read as one more line of item metadata — and sticky,
                   * because on a send-back with twenty items the kind of grant you are
                   * reading is the thing that scrolls away first. It needs the stage's
                   * own fill behind it, or items would show through as it passes — and it
                   * bleeds to the scroller's insets so the rule it makes runs full width.
                   */}
                  <h3 className="sticky top-0 z-10 -mx-4 bg-card px-4 pb-2 text-caption font-semibold text-foreground sm:-mx-6 sm:px-6">
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
              ))}
            </div>
          ) : null}
        </div>
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
