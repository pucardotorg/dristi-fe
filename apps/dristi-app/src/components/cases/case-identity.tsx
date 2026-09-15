"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  formatCaseDate,
  outcomeLabel,
  partiesLabel,
  stageLabel,
  type CaseRecord,
} from "@/lib/cases/types";
import { cn } from "@/lib/utils";

import { CASE_PEEK_ID, useCasePeek } from "./use-case-peek";

/**
 * How loudly the registered number reads. `muted` keeps table weight but drops
 * to muted ink (stacked list).
 */
export type IdentityTone = "default" | "muted";

const IDENTITY_TONE: Record<IdentityTone, string> = {
  default: "text-body-compact font-medium text-foreground",
  muted: "text-body-compact font-medium text-muted-foreground",
};

/**
 * Rows open the case peek. The control covers its container via `after:`
 * rather than wrapping the bookmark — one preview per row, bookmark still
 * reachable. The peek is not a dialog, so another row stays the switcher.
 * Open case file lives in the peek.
 */
export function CasePeekTrigger({
  record,
  tone = "default",
  hideLongPendingFlag = false,
}: {
  record: CaseRecord;
  tone?: IdentityTone;
  hideLongPendingFlag?: boolean;
}) {
  const { open, record: openRecord } = useCasePeek();
  const label = partiesLabel(record);
  const expanded = openRecord?.id === record.id;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={expanded ? CASE_PEEK_ID : undefined}
      onClick={() => open(record, { hideLongPendingFlag })}
      className={cn(
        "w-fit cursor-pointer rounded-sm p-0 text-left font-sans outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-focus-ring",
        IDENTITY_TONE[tone]
      )}
    >
      <span className="sr-only">Preview </span>
      {record.caseNumber}
      <span className="sr-only">{`, ${label}`}</span>
    </button>
  );
}

export function CaseTitle({
  record,
}: {
  record: CaseRecord;
}) {
  return (
    <span className="text-body-compact font-medium text-foreground">
      {partiesLabel(record)}
    </span>
  );
}

/** A Badge is safe here only because the flag is two words and never localised long. */
export function CaseFlags({ record }: { record: CaseRecord }) {
  if (!record.longPending) return null;
  return (
    <Badge variant="warning" className="shrink-0">
      Long pending
    </Badge>
  );
}

/**
 * Number + LPR flag. Case name is its own column. `hideLongPendingFlag` drops
 * the flag inside the long pending register itself — every row there is
 * already long pending, so the badge repeats the register's own heading.
 */
export function CaseIdentity({
  record,
  tone = "default",
  hideLongPendingFlag = false,
}: {
  record: CaseRecord;
  tone?: IdentityTone;
  hideLongPendingFlag?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
      <CasePeekTrigger
        record={record}
        tone={tone}
        hideLongPendingFlag={hideLongPendingFlag}
      />
      {hideLongPendingFlag ? null : <CaseFlags record={record} />}
    </div>
  );
}

/**
 * Stage / outcome as a Badge. The label is the meaning (Laws: never colour
 * alone). Live stages use info; disposed outcomes use secondary — not a
 * per-stage palette (status ≠ category). Keep the primitive's h-6 + nowrap
 * (wrapping in a squeezed column is what made the pills look broken).
 */
export function CaseStage({
  record,
  detail = true,
}: {
  record: CaseRecord;
  /** Substage / disposed date under the stage. Off on the dense table. */
  detail?: boolean;
}) {
  const label = record.disposal
    ? outcomeLabel(record.disposal.outcome)
    : stageLabel(record.stage);
  const secondary = detail
    ? record.disposal
      ? `Disposed ${formatCaseDate(record.disposal.on)}`
      : record.substage
    : undefined;

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        variant={record.disposal ? "secondary" : "info"}
        className="shrink-0"
      >
        {label}
      </Badge>
      {secondary ? (
        <span className="text-caption text-muted-foreground">{secondary}</span>
      ) : null}
    </div>
  );
}

export function CasePlain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (children == null || children === "") return null;
  return (
    <span className={cn("text-body-compact text-foreground", className)}>
      {children}
    </span>
  );
}

export function CaseDate({
  iso,
  emphasize = false,
}: {
  iso?: string;
  emphasize?: boolean;
}) {
  if (!iso) return null;
  return (
    <span
      className={cn(
        "text-body-compact tabular-nums text-foreground",
        emphasize && "font-medium"
      )}
    >
      {formatCaseDate(iso)}
    </span>
  );
}
