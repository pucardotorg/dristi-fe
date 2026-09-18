"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  MicIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import { docName } from "@/lib/employee/scrutiny/field";
import type {
  Filing,
  Flag,
  FlagMap,
  FlatField,
} from "@/lib/employee/scrutiny/types";
import { markArrival } from "@/components/employee/use-arrival";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  StagedOverlay,
  useStagedFlow,
} from "@/components/chrome/staged-overlay";
import { MarkThumb } from "@/components/employee/scrutiny/mark-thumb";
import {
  FieldValue,
  RecordLink,
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
 * **A scene each, so the act travels.**
 *
 * The owner asked for exactly this (2026-09-17): *"when you send back to the advocate, I
 * want that information to have a slight motion animation and go to the confirmation
 * stage of either registered or sent back."* A different scene is what makes the frame
 * remount and play its entrance, so the list leaves and the confirmation arrives — one
 * move, in the direction the act is going. A band stamped on the list where it stood was
 * the alternative, and it read as an annotation rather than as a decision taken.
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
 * holds still and only the stage between header and footer travels, from the list to the
 * confirmation.
 */
export function ReviewDialog({
  decision,
  flags,
  onOpenChange,
  nextFiling,
  onGoToItem,
}: {
  decision: Decision | null;
  flags: FlagMap;
  onOpenChange: (open: boolean) => void;
  /**
   * The next file to scrutinise, or `null` at the end of the list — what the settled
   * stage offers instead of the queue. See `nextFilingAfter`.
   */
  nextFiling: Filing | null;
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
   * **The confirmation's own words.**
   *
   * The title stays in the header, because it is the line the frame rewrites and the line
   * focus lands on. Everything else about the outcome lives on the stage, with the mark:
   * a state, and a sentence putting it in context. A glyph and one word was not a
   * confirmation — *"it shouldn't just say send back with an icon, it should have some
   * copy associated with it"* (owner, 2026-09-17) — and splitting the sentence between
   * the header and the stage would have said the same thing twice at two sizes.
   *
   * The register wording changes with the count because a case that travels with open
   * items is a materially different thing from a clean one, and the Magistrate is the
   * reason either way.
   */
  const settled =
    decision === "send-back"
      ? {
          title: `Sent back to ${party.advocate}`,
          state: "Sent back",
          /* One short line. The long version explained that the file comes back and
             that nothing more is needed — reassurance for a first-timer, and this is a
             desk somebody works all day (owner, 2026-09-17: *"that is enough. They'll do
             this on a daily basis. They don't need more reassurance from the system"*).
             "Act on" rather than "correct", because a third of these are re-uploads and a
             third are confirmations. */
          body: `${total} item${total > 1 ? "s" : ""} sent for the advocate to act on.`,
          /* **A return is not a completion.** Green with a tick said the act succeeded
             where it had handed the file on, and this is the ordinary route — most files
             take it at least once — not a failure and not a win. So the mark wears the
             product's neutral state fill (`secondary`, what every pending pill on these
             screens wears; the case history gives a return no colour at all). Colour
             keeps carrying one meaning.

             The glyph is the loop, not a corner arrow: the owner read that one as dated
             (2026-09-18), and it was the weaker reading anyway — an elbow pointing left
             is "back" in the browser sense, while this file has gone round for another
             round, which is the word the case history already uses. */
          tone: "bg-secondary text-secondary-foreground",
          Icon: RotateCcwIcon,
        }
      : {
          title: "Case registered",
          state: "Registered",
          body: total
            ? `On the Magistrate's list, with ${total} open item${
                total > 1 ? "s" : ""
              } attached.`
            : "On the Magistrate's list for cognizance.",
          /* Registering *is* a terminal good outcome, so this one keeps the success
             muted and the tick. */
          tone: "bg-success-muted text-success-muted-foreground",
          Icon: CheckIcon,
        };

  const needsAck = decision === "register" && total > 0;
  const done = flow.stage === "done";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <StagedOverlay
        /* The measure of a long list, and a **definite height** rather than a floor.
           Two things change between the stages now — the list becomes a confirmation, and
           the header's line becomes a shorter one — and a floor only holds the first of
           them: a header dropping a row moves the whole centred panel (measured at 48px,
           and 20px on the empty path). A definite height decouples both, and the stage
           absorbs the difference instead. It is what the registrations overlay and the
           order composer do, and for the same reason: this is a reading surface whose
           content is routinely taller than the window.

           Unconditional, not `md:` — where those two overlays hold long content on every
           stage and so barely move on a phone, this one goes from a list to a short
           confirmation, and at 390px that measured as a collapse from 680 to 422 with the
           panel re-centring 129px down the screen. A phone modal held at 85% height is an
           ordinary sheet; a sheet that shrinks by a third under the reader's thumb is not. */
        className="h-[85dvh] sm:max-w-2xl"
        /* One long list, not objects on a canvas: a panel the same shape as the surface
           under it is a card inside a card inside a modal (owner, 2026-09-17, and
           restated). The stage is the overlay's own white, framed by the header and
           footer hairlines, and the insets belong to this file because the confirmation
           centres itself while the list does not. */
        surface="card"
        padded={false}
        title={done ? settled.title : head.title}
        titleRef={flow.titleRef}
        /* No line under the settled title: the sentence is on the stage with the mark it
           belongs to, and printing it here as well said the same thing twice at two
           sizes. The definite height is what makes that affordable — the header loses two
           rows and the stage absorbs them, so the panel does not move. */
        description={done ? undefined : head.body}
        sceneKey={flow.sceneKey}
        motion={flow.motion}
        footer={
          done ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Stay here
              </Button>
              {/*
               * **Next file opens the next file, not the list.** It used to push back to
               * the queue, which made the officer re-find their place in it for every one
               * of thirty decisions (owner, 2026-09-17: *"can you… bring up the next file
               * instead of taking me back to the list"*).
               *
               * A real `Link` rather than a router push, the way Take cognizance and
               * Register cases already walk their queues: it prefetches, it middle-clicks,
               * and `markArrival("next")` hands the workbench that mounts the entrance to
               * play — the file rising onto the desk, which is the same motion opening one
               * from the queue makes. At the end of the list there is nothing to rise, so
               * the button becomes the way back and says so.
               */}
              <Button asChild>
                {nextFiling ? (
                  <Link
                    href={`/employee/scrutiny/${encodeURIComponent(nextFiling.no)}`}
                    onClick={() => markArrival("next")}
                  >
                    Next file
                  </Link>
                ) : (
                  <Link
                    href="/employee/scrutiny"
                    onClick={() => markArrival("back")}
                  >
                    Back to scrutiny
                  </Link>
                )}
              </Button>
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
        {done ? (
          /* **The confirmation, arriving.** A different scene, so the frame remounts this
             and it enters in the direction the act is going while the chrome holds still
             — the motion the owner asked for, one move rather than a mark appearing over
             a list that stayed. Centred by `my-auto` rather than `justify-center`, so it
             gives way to the scroll if a long advocate name ever grows it past the
             canvas. */
          <div className="my-auto flex flex-col items-center gap-4 p-6 text-center">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                settled.tone,
              )}
            >
              <settled.Icon
                aria-hidden="true"
                className="size-7"
                strokeWidth={2.2}
              />
            </div>
            {/* The state, then what it means. `role="status"` is what gets the outcome
                spoken: focus lands on the header title, which announces itself and
                nothing under it. The measure is held to a readable line length — a
                sentence running the full width of a 2xl dialog under a centred mark
                reads as a paragraph that lost its column. */}
            <div role="status" className="flex max-w-sm flex-col gap-1">
              <p className="text-body font-semibold">{settled.state}</p>
              <p className="text-body-compact text-muted-foreground">
                {settled.body}
              </p>
            </div>
          </div>
        ) : total ? (
          /* The list, and **only the list scrolls** — the frame around it does not move,
             so a send-back with twenty items scrolls inside the stage. The insets are
             here rather than on the frame because the confirmation above centres itself
             and this does not. */
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {GROUP_ORDER.filter((g) => groups[g].length).map((g) => (
                /*
                 * **A band per kind, ruled from the next.** What the advocate has to
                 * *do* differs by band — confirm a correction, fix a flag, re-upload a
                 * document — and the owner asked for that boundary to be visible
                 * (2026-09-18). The rule is the band's; items inside one are separated
                 * by space alone. Two separators would have been one too many, and the
                 * line that means "a different kind of work" should not look like the
                 * line that means "the next row".
                 */
                <section
                  key={g}
                  className="-mx-4 border-t border-hairline px-4 pt-6 first:border-t-0 first:pt-0 sm:-mx-6 sm:px-6"
                >
                  {/*
                   * The band's name, at the same 14px as everything under it and
                   * carrying its weight instead of a size of its own. Sticky, because on
                   * a send-back with twenty items the kind of work you are reading is
                   * what scrolls away first; it needs the stage's fill behind it, and it
                   * bleeds to the scroller's insets so its rule runs the full width.
                   */}
                  <h3 className="sticky top-0 z-10 -mx-4 bg-card px-4 pb-3 text-body-compact font-semibold text-foreground sm:-mx-6 sm:px-6">
                    {g.split(" — ")[0]}{" "}
                    <span className="font-normal text-muted-foreground tabular-nums">
                      ({groups[g].length})
                    </span>
                  </h3>
                  <ul className="flex flex-col gap-6">
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
        ) : (
          /* Nothing raised, which is a state and not an absence: said in the middle of
             the stage, where the confirmation will arrive. */
          <Empty className="my-auto border-0 p-6">
            <EmptyHeader>
              <EmptyTitle className="text-title-s font-semibold">
                Nothing raised
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
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
  const reupload =
    !field.docrow && !!field.doc && !!docRow[field.doc] ? item.linked : null;

  /*
   * **One item, read in one pass: where, what changed, what was said, what is attached.**
   *
   * This was five labelled rows — Original value, FSO's value, FSO's comment,
   * Annotation, Re-upload requested — each with its name in an 8rem gutter. On a
   * send-back of twenty items that is a hundred rows of left-column text weighing more
   * than the facts beside it, and the owner read it as exactly that (2026-09-18).
   *
   * The labels are gone because the *form* now says what each line is, which is cheaper
   * than a word and faster to scan:
   *
   * - the **correction** is one movement, `old → new`, not two rows that the eye has to
   *   pair up. The superseded value is struck and muted; the new one carries the weight.
   * - the **comment** is quoted by a rule down its start, the way a note is quoted
   *   anywhere else. Nothing needs to call it a comment.
   * - **what is attached** is a row of marks, and a mark only appears when it is true.
   *   "Re-upload requested — No" used to print on every correction that did not ask for
   *   one, which is a row spent saying nothing.
   *
   * The annotation shows the **crop of the marked region** rather than the words
   * "Annotation": `MarkThumb` is the same tile the workbench uses, so the officer
   * recognises the mark they drew instead of reading a document number back.
   *
   * ## Why this is not the workbench's `RecordList`
   *
   * It was, and the two are still one *vocabulary* — the same facts under the same
   * names. What differs is the task. The workbench examines one item in a narrow pane,
   * where a label column is the fastest way to find a value. This window is read the
   * other way round: twenty items at once, looking for the one that is wrong. A layout
   * tuned for the first is what made the second a wall.
   */
  return (
    <li className="@container flex flex-col gap-1.5 text-body-compact">
      {/*
       * **`Complainant: Full name`** — the party, then the field, at one size.
       *
       * Naming the group on every item was noise; hiding it left five labels that exist
       * under two parties reading identically; a chevroned path was a third face in a
       * list that already had too many (owner, 2026-09-17 and 2026-09-18). A colon
       * carries containment for two characters and reads as a prefix rather than a
       * second heading. The trailing " Details" comes off: "Complainant Details: Full
       * name" says Details twice.
       */}
      <h4>
        <span className="text-muted-foreground">
          {field.group.replace(/ Details$/, "")}:{" "}
        </span>
        <span className="font-semibold">{field.label}</span>
      </h4>

      {/* The correction, as the one movement it is. `aria-hidden` on the glyph and the
          words in `sr-only`, because an arrow is not a word. */}
      {flag.correction ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-muted-foreground line-through">
            <FieldValue field={field} value={field.value} copyable={false} />
          </span>
          <ArrowRightIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 self-center text-muted-foreground"
          />
          <span className="sr-only">corrected to</span>
          <span className="font-medium">
            <FieldValue field={field} value={flag.correction} />
          </span>
        </p>
      ) : null}

      {/* A document issue has no before and after — the reason *is* the finding, so it
          takes the weight the corrected value carries above. */}
      {field.docrow && flag.reason ? (
        <p className="font-medium">{flag.reason}</p>
      ) : null}

      {flag.comment ? (
        <p className="flex flex-wrap items-center gap-x-2 border-s-2 border-border ps-2.5 text-muted-foreground">
          <span className="break-words">{flag.comment}</span>
          {flag.voice ? (
            <span className="inline-flex items-center gap-1">
              <MicIcon className="size-3.5" aria-hidden="true" /> voice
            </span>
          ) : null}
        </p>
      ) : null}

      {/* What is attached to the item, and only what is. */}
      {evidenceDoc || reupload || (field.docrow && item.linked) ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5 text-muted-foreground">
          {evidenceDoc ? (
            <span className="inline-flex items-center gap-2">
              <MarkThumb evidence={flag.evidence!} />
              <span className="min-w-0">
                <span className="tabular-nums">Doc {evidenceDoc.no}</span> ·{" "}
                {docName(flag.evidence!.doc, docById)}
              </span>
            </span>
          ) : null}

          {reupload ? (
            <RecordLink onClick={() => onGoToItem(reupload.id)}>
              <UploadIcon className="size-3.5 shrink-0" aria-hidden="true" />
              Re-upload {docName(reupload.docrow ?? "", docById)}
            </RecordLink>
          ) : null}

          {field.docrow && item.linked ? (
            <RecordLink onClick={() => onGoToItem(item.linked!.id)}>
              Raised with {item.linked.label}
            </RecordLink>
          ) : null}
        </p>
      ) : null}

      {/*
       * The last backstop. A mark on an uploaded document with no item on that
       * document's own row means the advocate gets the value unlocked and no re-upload
       * button — the exact miss this feature exists to stop, named here rather than
       * discovered on resubmission. Icon + words + colour, never colour alone.
       */}
      {item.stranded ? (
        <p className="flex flex-wrap items-center gap-2 text-warning-ink">
          <span className="inline-flex items-center gap-1.5">
            <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
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
