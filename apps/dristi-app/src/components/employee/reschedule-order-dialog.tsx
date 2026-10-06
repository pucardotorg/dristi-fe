"use client";

import * as React from "react";
import { CircleCheckIcon, DownloadIcon } from "lucide-react";

import { DocumentPreview } from "@/components/cases/document-preview";
import {
  SignatureActions,
  SignatureStage,
} from "@/components/employee/sign-method-stage";
import { useSignatureChoice } from "@/components/employee/sign-signature-fields";

import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import {
  StagedOverlay,
  useStagedFlow,
} from "@/components/chrome/staged-overlay";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  RESCHEDULE_REASONS,
  buildRescheduleOrder,
  downloadRescheduleOrder,
  hearingSlotLabel,
  rescheduleReason,
  type Listing,
  type ReschedulableHearing,
  type RescheduleOrder,
  type RescheduleReasonId,
} from "@/lib/employee/bulk-reschedule";
import { formatListingDate } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

export type RescheduleRun = { row: ReschedulableHearing; to: Listing }[];

/** Sorts "day|slot" keys by day, then morning before afternoon. */
const slotOrder = (key: string) => key.replace("|morning", "|0").replace("|afternoon", "|1");

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

/** Matters on the first page, under the heading and the operative words; then per page. */
const FIRST_PAGE = 8;
const NEXT_PAGES = 16;

/** The order's matters cut into the pages the printed order falls into. */
export function orderPages(order: RescheduleOrder) {
  const pages: RescheduleOrder["matters"][] = [order.matters.slice(0, FIRST_PAGE)];
  for (let at = FIRST_PAGE; at < order.matters.length; at += NEXT_PAGES) {
    pages.push(order.matters.slice(at, at + NEXT_PAGES));
  }
  return pages;
}

const CELL = "border border-paper-border px-2 py-1.5";

function MattersTable({ matters }: { matters: RescheduleOrder["matters"] }) {
  return (
    /* Wide on purpose — six columns of court paper. It scrolls inside the page rather
       than pushing the dialog off a phone (RESPONSIVE.md 5). */
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-compact">
        <thead>
          <tr>
            {["Case number", "Cause title", "Listed for", "Adjourned from", "New date", "Slot"].map(
              (head) => (
                <th
                  key={head}
                  scope="col"
                  className={cn(CELL, "text-left font-semibold whitespace-nowrap")}
                >
                  {head}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {matters.map((matter) => (
            <tr key={matter.caseNumber}>
              <td className={cn(CELL, "tabular-nums whitespace-nowrap")}>{matter.caseNumber}</td>
              <td className={cn(CELL, "min-w-48")}>{matter.matter}</td>
              <td className={cn(CELL, "min-w-32")}>{matter.listedFor}</td>
              <td className={cn(CELL, "tabular-nums whitespace-nowrap")}>{matter.from}</td>
              <td className={cn(CELL, "font-semibold tabular-nums whitespace-nowrap")}>
                {matter.to}
              </td>
              <td className={cn(CELL, "whitespace-nowrap")}>{matter.slot}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The order as the court's paper, page by page — one table for every new date, sorted by
 * the day and slot each matter goes to, cut where the printed order breaks. A day's
 * board can run to two or three pages, and the preview reads as that document rather
 * than as one long sheet (owner, 2026-10-06). Drawn on the paper surface the other court
 * orders use (`OrderDraftFacsimile`).
 */
export function RescheduleOrderPaper({ order }: { order: RescheduleOrder }) {
  const pages = orderPages(order);
  return (
    <div className="flex flex-col gap-4">
      {pages.map((matters, index) => (
        <article
          key={index}
          aria-label={`Page ${index + 1} of ${pages.length}`}
          className="flex flex-col gap-6 rounded-md border border-paper-border bg-paper p-6 text-paper-foreground shadow-raised"
        >
          {index === 0 ? (
            <>
              <header className="flex flex-col gap-2 text-center">
                <p className="text-body font-semibold">{order.court}</p>
                <h3 className="text-body font-semibold">{order.title}</h3>
              </header>
              <p className="text-body tabular-nums">Dated {order.dated}</p>
              <ol className="flex list-decimal flex-col gap-3 ps-6 text-body">
                {order.paragraphs.map((paragraph) => (
                  <li key={paragraph}>{paragraph}</li>
                ))}
              </ol>
            </>
          ) : null}
          <MattersTable matters={matters} />
          {index === pages.length - 1 ? (
            <p className="text-body text-paper-muted-foreground">{order.signature}</p>
          ) : null}
          <p className="text-right text-caption tabular-nums text-paper-muted-foreground">
            Page {index + 1} of {pages.length}
          </p>
        </article>
      ))}
    </div>
  );
}

const STAGES = ["reason", "read", "sign", "signed"] as const;
type Stage = (typeof STAGES)[number];
const SCENES: Record<Stage, string> = {
  reason: "reason",
  read: "read",
  sign: "sign",
  signed: "signed",
};

/** "7 Oct – 14 Oct 2026", or one day. */
function spanOf(days: string[]) {
  const sorted = [...days].sort();
  if (!sorted.length) return "";
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last
    ? formatListingDate(first)
    : `${formatListingDate(first)} – ${formatListingDate(last)}`;
}

/**
 * Sign the rescheduling order — the court's own signing convention, in one window.
 *
 * **Reason → read → sign → signed**, as Sign order does it (`sign-order-dialog.tsx`):
 * the bench reads the paper in the standard document preview before it signs, and signs
 * through the shared signature step, not a bespoke button (owner, 2026-10-06: "it's
 * breaking the convention of how we usually show preview"). The one step before the
 * paper is the reason, because the order recites it — so the paper is never shown with
 * a hole in it, and the reason is a deliberate choice rather than a field merged into
 * the preview.
 *
 * The window holds one height on every step (`h-[85dvh]`, the Sign order frame), so
 * moving between them never resizes it. The last step is the product's settled card —
 * a success band over the facts of what happened — so the outcome reads at a glance.
 */
export function SignRescheduleDialog({
  open,
  onOpenChange,
  session,
  run,
  unplanned,
  today,
  onSign,
  onSignedClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped on every open, so each opening starts from the reason. */
  session: number;
  run: RescheduleRun;
  /** Hearings in the range that have no new date — they stay where they are. */
  unplanned: number;
  today: string;
  onSign: (reason: RescheduleReasonId) => void;
  /**
   * Where focus goes once a signed order is closed. Signing spends the plan, so the
   * button that opened this window is disabled or gone.
   */
  onSignedClose: () => void;
}) {
  const [reason, setReason] = React.useState<RescheduleReasonId | null>(null);
  const [signed, setSigned] = React.useState<{
    order: RescheduleOrder;
    run: RescheduleRun;
    reason: RescheduleReasonId;
  } | null>(null);
  const choice = useSignatureChoice("order");
  const flow = useStagedFlow<Stage>({
    order: STAGES,
    scene: SCENES,
    record: session,
    onRecordChange: () => {
      setReason(null);
      setSigned(null);
      choice.reset();
    },
  });
  const reasonsId = React.useId();

  const current = signed?.run ?? run;
  const order = signed?.order ?? buildRescheduleOrder(run, reason, today);
  const count = current.length;
  const newDays = [...new Set(current.map(({ to }) => to.day))];
  const fromDays = [...new Set(current.map(({ row }) => row.date))];
  const byDaySlot = new Map<string, number>();
  for (const { to } of current) {
    const key = `${to.day}|${to.slot}`;
    byDaySlot.set(key, (byDaySlot.get(key) ?? 0) + 1);
  }
  const pages = orderPages(order).length;
  const hearings = `${count} ${plural(count, "hearing", "hearings")}`;

  const titles: Record<Stage, string> = {
    reason: "Why are these hearings being moved?",
    read: "Rescheduling order",
    sign: "Sign the order",
    signed: "Order signed",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StagedOverlay
        className="h-[85dvh] sm:max-w-4xl"
        title={titles[flow.stage]}
        titleRef={flow.titleRef}
        titleAside={
          flow.stage === "read" || flow.stage === "sign" ? (
            <Badge variant="warning">Unsigned</Badge>
          ) : flow.stage === "signed" ? (
            <Badge variant="success">Signed</Badge>
          ) : undefined
        }
        description={
          flow.stage === "reason" || flow.stage === "signed"
            ? undefined
            : `${hearings} · ${newDays.length} new ${plural(newDays.length, "date", "dates")}${reason ? ` · ${rescheduleReason(reason).label}` : ""}`
        }
        sceneKey={flow.sceneKey}
        motion={flow.motion}
        onCloseAutoFocus={(event) => {
          if (flow.stage !== "signed") return;
          event.preventDefault();
          onSignedClose();
        }}
        footer={
          flow.stage === "reason" ? (
            <>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={reason === null}
                onClick={() => flow.go("read")}
              >
                Preview order
              </Button>
            </>
          ) : flow.stage === "read" ? (
            <>
              <Button type="button" variant="outline" onClick={() => flow.go("reason")}>
                Back
              </Button>
              <Button type="button" onClick={() => flow.go("sign")}>
                Sign order
              </Button>
            </>
          ) : flow.stage === "sign" ? (
            <SignatureActions
              choice={choice}
              onBack={() => flow.go("read")}
              onSubmit={() => {
                if (reason === null) return;
                setSigned({
                  order: buildRescheduleOrder(run, reason, today, today),
                  run,
                  reason,
                });
                onSign(reason);
                flow.go("signed");
              }}
            />
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => downloadRescheduleOrder(order)}
              >
                <DownloadIcon data-icon="inline-start" aria-hidden />
                Download order
              </Button>
              <DialogClose asChild>
                <Button type="button">Done</Button>
              </DialogClose>
            </>
          )
        }
      >
        {flow.stage === "reason" ? (
          <div className="mx-auto my-auto flex w-full max-w-xl flex-col gap-4">
            {unplanned > 0 ? (
              <Banner variant="info" className="items-start">
                {unplanned} {plural(unplanned, "hearing has", "hearings have")} no new
                date and will stay where {plural(unplanned, "it is", "they are")}.
              </Banner>
            ) : null}
            {/* What this order covers, stated once as facts. */}
            <div className="rounded-xl border border-hairline bg-card px-4">
              <DescriptionList>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>Hearings</DescriptionTerm>
                  <DescriptionDetails className="tabular-nums">{count}</DescriptionDetails>
                </DescriptionRow>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>Listed on</DescriptionTerm>
                  <DescriptionDetails className="tabular-nums">{spanOf(fromDays)}</DescriptionDetails>
                </DescriptionRow>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>Moving to</DescriptionTerm>
                  <DescriptionDetails className="tabular-nums">
                    {newDays.length} {plural(newDays.length, "day", "days")}, {spanOf(newDays)}
                  </DescriptionDetails>
                </DescriptionRow>
              </DescriptionList>
            </div>
            <section
              aria-labelledby={reasonsId}
              className="flex flex-col gap-3 rounded-xl border border-hairline bg-card p-4"
            >
              <h3 id={reasonsId} className="text-body font-semibold">
                Reason for rescheduling
              </h3>
              <RadioGroup
                value={reason ?? ""}
                onValueChange={(value) => setReason(value as RescheduleReasonId)}
                aria-labelledby={reasonsId}
                className="flex flex-col gap-2"
              >
                {RESCHEDULE_REASONS.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 text-body-compact transition-colors hover:bg-accent",
                      reason === option.id &&
                        "border-brand-accent bg-brand-muted hover:bg-brand-muted",
                    )}
                  >
                    <RadioGroupItem value={option.id} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
              <p className="text-body-compact text-muted-foreground">
                The order states this as the ground for rescheduling.
              </p>
            </section>
          </div>
        ) : flow.stage === "read" ? (
          <DocumentPreview
            className="min-h-0 flex-1"
            height="fill"
            title="Rescheduling order"
            description={`${pages} ${plural(pages, "page", "pages")}`}
            source={{ kind: "composed", content: <RescheduleOrderPaper order={order} /> }}
            download={{
              onDownload: () => downloadRescheduleOrder(order),
              label: "Download the rescheduling order",
            }}
          />
        ) : flow.stage === "sign" ? (
          <SignatureStage
            noun="order"
            subject={`You are adding your signature to the order rescheduling ${hearings}.`}
            warning="Signing moves these hearings to their new dates."
            download={{
              prompt: "Want to read the order again?",
              onDownload: () => downloadRescheduleOrder(order),
            }}
            choice={choice}
          />
        ) : (
          /* The settled card: the band says it is done, the facts say what was done. */
          <div className="mx-auto my-auto flex w-full max-w-xl flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-hairline bg-card">
              <div
                className={cn(
                  "flex items-center gap-2 bg-success-muted px-4 py-2.5 text-body-compact text-success-muted-foreground",
                  RESOLVE_IN_PLACE,
                )}
              >
                <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
                <span role="status" className="font-medium">
                  {hearings} rescheduled
                </span>
              </div>
              <div className="px-4">
                <DescriptionList>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>New dates</DescriptionTerm>
                    <DescriptionDetails>
                      <ul className="flex flex-col gap-1">
                        {[...byDaySlot]
                          .sort(([a], [b]) => slotOrder(a).localeCompare(slotOrder(b)))
                          .map(([key, n]) => {
                            const [day, slot] = key.split("|");
                            return (
                              <li key={key} className="tabular-nums">
                                {formatListingDate(day)}, {hearingSlotLabel(slot as Listing["slot"]).toLowerCase()}{" "}
                                <span className="text-muted-foreground">
                                  · {n} {plural(n, "hearing", "hearings")}
                                </span>
                              </li>
                            );
                          })}
                      </ul>
                    </DescriptionDetails>
                  </DescriptionRow>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>Reason</DescriptionTerm>
                    <DescriptionDetails>
                      {signed ? rescheduleReason(signed.reason).label : null}
                    </DescriptionDetails>
                  </DescriptionRow>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>Signed on</DescriptionTerm>
                    <DescriptionDetails className="tabular-nums">
                      {order.dated}
                    </DescriptionDetails>
                  </DescriptionRow>
                </DescriptionList>
              </div>
            </div>
            <p className="text-body-compact text-muted-foreground">
              No notification has gone to the parties yet.
            </p>
          </div>
        )}
      </StagedOverlay>
    </Dialog>
  );
}

/** A signed order, read again from the record — in the same preview it was signed from. */
export function ViewRescheduleOrderDialog({
  order,
  number,
  onOpenChange,
}: {
  order: RescheduleOrder | null;
  number: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={order !== null} onOpenChange={onOpenChange}>
      {order ? (
        <StagedOverlay
          className="h-[85dvh] sm:max-w-4xl"
          title={`Rescheduling order ${number}`}
          titleAside={<Badge variant="success">Signed</Badge>}
          description={`${order.matters.length} ${plural(order.matters.length, "hearing", "hearings")} · signed ${order.dated}`}
          sceneKey="view"
          motion="arrive"
          footer={
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          }
        >
          <DocumentPreview
            className="min-h-0 flex-1"
            height="fill"
            title={`Rescheduling order ${number}`}
            description={`${orderPages(order).length} ${plural(orderPages(order).length, "page", "pages")}`}
            source={{ kind: "composed", content: <RescheduleOrderPaper order={order} /> }}
            download={{
              onDownload: () => downloadRescheduleOrder(order),
              label: `Download rescheduling order ${number}`,
            }}
          />
        </StagedOverlay>
      ) : null}
    </Dialog>
  );
}
