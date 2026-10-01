"use client";

import * as React from "react";

import { KIND_LABELS, KIND_ORDER } from "@/lib/tasks/selectors";
import type { PillKind } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * The kind filter: one single-select row of pills, "Everything" first.
 *
 * This replaced six count cards (2026-09-15). The cards were a summary and a control at
 * once — pressing one filtered the table, and the pressed kind was then named a second
 * time as a chip in the filter row below. A card cannot be both; the owner had already
 * struck the same pattern off the court dashboard. The counts a card carried now live
 * where they answer something: the pill's own number is what pressing it yields, the
 * overdue count is in the header line, and the next dates are the bands inside the list.
 *
 * Six panels also cost the phone its entire first screen. One line of pills scrolls
 * sideways instead, so the first task is visible where it matters.
 *
 * `ToggleGroup type="single"` gives the DS's own single-select: radio semantics, one tab
 * stop and arrow keys between pills. The chosen pill wears the brand tint by the owner's
 * ruling (2026-09-16) — worth noting against ui-craft §2's "brand fill means current, not
 * selected", since on this row the chosen kind *is* what the list is currently showing.
 */
export function KindPills({
  counts,
  active,
  loading,
  onSelect,
}: {
  counts: Record<PillKind, number> | null;
  /** The pressed kinds; none pressed is Everything. */
  active: readonly PillKind[];
  loading?: boolean;
  onSelect: (kinds: PillKind[]) => void;
}) {
  const total = counts ? KIND_ORDER.reduce((sum, k) => sum + counts[k], 0) : null;
  return (
    <ToggleGroup
      type="multiple"
      size="lg"
      /* `default`, not `outline`: an outlined row gives every pill a card fill, and a
         tinted chosen pill among six filled ones reads softer than its neighbours — it
         looked disabled (render, 2026-09-15). Transparent pills leave the chosen one as
         the only fill on the row. */
      variant="default"
      value={active.length ? [...active] : ["all"]}
      onValueChange={(values) => {
        // Kinds add up (owner, Sept 21: any combination). Everything is the
        // empty set: pressing it clears the rest, and pressing a kind lifts it.
        const kinds = values.filter((value) => value !== "all") as PillKind[];
        const pressedEverything = values.includes("all") && active.length > 0;
        onSelect(pressedEverything ? [] : kinds);
      }}
      aria-label="Kinds of work"
      /* The row scrolls sideways on a phone; the padding keeps a focus ring off the
         clipping edge and gives the widened touch target room. */
      className="-m-1 w-full max-w-full flex-nowrap overflow-x-auto p-1"
    >
      <Pill value="all" label="Everything" count={total} loading={loading} />
      {KIND_ORDER.map((kind) => (
        <Pill
          key={kind}
          value={kind}
          label={KIND_LABELS[kind]}
          count={counts?.[kind] ?? null}
          loading={loading}
          /* A kind with nothing in it cannot narrow anything — but the pill you are
             standing on stays pressable, so clearing it is never a dead end. */
          disabled={!loading && counts?.[kind] === 0 && !active.includes(kind)}
        />
      ))}
    </ToggleGroup>
  );
}

function Pill({
  value,
  label,
  count,
  loading,
  disabled,
}: {
  value: string;
  label: string;
  count: number | null;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <ToggleGroupItem
      value={value}
      disabled={disabled || loading}
      aria-label={count === null ? label : `${label}, ${count}`}
      className={cn(
        /* h-9 of visible pill, widened to the 40px touch floor by a transparent ring —
           the same trick the row verbs use, so a pill is as tappable as a button. */
        "relative rounded-full border border-border px-3 after:absolute after:-inset-0.5",
        /* Chosen: the brand tint — the owner's ruling (2026-09-16), after a neutral
           fill read as disabled beside the quiet pills and a near-black one read as a
           button. `brand-muted` is the tint pair, not the rationed `primary` the row
           verbs wear, so a chosen filter says "brand" without impersonating an action. */
        "data-[state=on]:border-brand-accent data-[state=on]:bg-brand-muted data-[state=on]:font-semibold data-[state=on]:text-brand-muted-foreground",
        "data-[state=on]:hover:bg-brand-muted-hover data-[state=on]:hover:text-brand-muted-foreground"
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-brand-muted-foreground">
        {loading || count === null ? "–" : count}
      </span>
    </ToggleGroupItem>
  );
}
