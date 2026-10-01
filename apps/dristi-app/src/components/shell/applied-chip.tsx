"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * One removable chip for an applied filter — shared by every list that folds its
 * controls into a sheet and keeps what is applied out on the row.
 *
 * A chip is a well: sunken fill, no border (`ui-craft` §4 — depth is fill, not strokes,
 * and a filled box with a stroke is the box-in-box the skill bans). The dismiss target is
 * 32px visible and expanded to the 40px floor with `after:-inset-1`.
 */
export function AppliedChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-surface-sunken pl-4 pr-1 text-body-compact font-medium text-foreground">
      {label}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Clear the ${label} filter`}
        onClick={onClear}
        className="relative rounded-full text-muted-foreground after:absolute after:-inset-1 hover:text-foreground"
      >
        <XIcon aria-hidden />
      </Button>
    </span>
  );
}
