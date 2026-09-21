"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type OverflowTab = {
  value: string;
  /** What the tab shows. */
  label: React.ReactNode;
  /** Anything that changes the tab's width (a count, a locale), so it is measured again. */
  measure?: string;
};

/** Never a real tab's value. Radix calls `onValueChange` with it when More is
 *  pressed while it stands for no tab; callers ignore values they do not know. */
export const MORE_TAB_VALUE = "__more";

/**
 * A line `TabsList` that never scrolls sideways (owner, Sept 21). The tabs that
 * fit stay in the row; the rest fold into a "More" menu at the row's end, behind
 * a hairline, the way GitHub's repository nav does it. Inside the menu the
 * current tab carries a bar on its leading edge, and while the current tab is
 * folded away, More itself wears the row's active underline.
 *
 * More is a real `TabsTrigger`. While a folded tab is current it takes that
 * tab's value, so the tablist still has a selected tab pointing at the visible
 * panel (a tablist with no selected tab is a WAI-ARIA defect; see
 * `case-section-tabs.tsx`). Otherwise it holds `MORE_TAB_VALUE`, which no panel
 * answers to.
 *
 * Fit is measured, not guessed from breakpoints: every tab is drawn once, its
 * width kept, and the split follows the row's own width from then on. The row
 * keeps its order; nothing is promoted out of the menu, so a tab is always
 * where it was last time.
 */
export function OverflowTabsList({
  items,
  value,
  onSelect,
  className,
  triggerClassName,
  dividerClassName,
  chevronClassName,
  moreLabel = "More",
  "aria-label": ariaLabel,
}: {
  items: OverflowTab[];
  value: string;
  onSelect: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  /** Optical nudges for a row whose labels do not sit on the box's centre
   *  (Pending tasks hangs its labels off the baseline over a padded foot). */
  dividerClassName?: string;
  chevronClassName?: string;
  moreLabel?: string;
  "aria-label"?: string;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const measureKey = items.map((item) => `${item.value}:${item.measure ?? ""}`).join("|");
  const [measured, setMeasured] = React.useState<{
    key: string;
    tabs: number[];
    more: number;
    gap: number;
  } | null>(null);
  const [room, setRoom] = React.useState(0);
  const widths = measured?.key === measureKey ? measured : null;

  // Every tab and More are in the row while `widths` is null: read them once,
  // before paint, then draw the split.
  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || widths) return;
    const tabs = [...list.querySelectorAll<HTMLElement>("[data-overflow-tab]")].map(
      (node) => node.getBoundingClientRect().width
    );
    const more = list.querySelector<HTMLElement>("[data-overflow-more]");
    setMeasured({
      key: measureKey,
      tabs,
      more: more?.getBoundingClientRect().width ?? 0,
      gap: parseFloat(getComputedStyle(list).columnGap) || 0,
    });
    setRoom(list.clientWidth);
  }, [measureKey, widths]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => setRoom(list.clientWidth));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const fit = React.useMemo(() => {
    if (!widths || room === 0) return items.length;
    const total = widths.tabs.reduce((sum, w) => sum + w, 0) + widths.gap * (items.length - 1);
    if (total <= room) return items.length;
    // More and its divider (one measured group) and the gap before them are
    // paid for first.
    let used = widths.more + widths.gap;
    let count = 0;
    for (const width of widths.tabs) {
      used += width + (count ? widths.gap : 0);
      if (used > room) break;
      count += 1;
    }
    return Math.max(1, count);
  }, [items.length, room, widths]);

  const measuring = !widths;
  const shown = measuring ? items : items.slice(0, fit);
  const folded = measuring ? [] : items.slice(fit);
  const currentFolded = folded.some((item) => item.value === value);

  return (
    <TabsList
      ref={listRef}
      variant="line"
      aria-label={ariaLabel}
      className={cn("flex-nowrap overflow-x-clip", className)}
    >
      {shown.map((item) => (
        <TabsTrigger
          key={item.value}
          value={item.value}
          data-overflow-tab
          className={triggerClassName}
        >
          {item.label}
        </TabsTrigger>
      ))}
      {measuring || folded.length ? (
        <div
          data-overflow-more
          // At the row's far end, GitHub's place for it: More is about the row,
          // not the next tab in it.
          className="ml-auto flex shrink-0 items-center gap-3 self-stretch"
        >
          <span aria-hidden className={cn("h-5 w-px shrink-0 bg-border", dividerClassName)} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TabsTrigger
                value={currentFolded ? value : MORE_TAB_VALUE}
                // The menu trigger writes its own open/closed `data-state` over
                // the tab's, and the row's active styling reads that attribute.
                // A prop set here outranks both, so the tab's answer is restated.
                data-state={currentFolded ? "active" : "inactive"}
                className={triggerClassName}
              >
                {moreLabel}
                <ChevronDownIcon
                  aria-hidden
                  className={cn("self-center text-muted-foreground", chevronClassName)}
                />
              </TabsTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {folded.map((item) => {
                const current = item.value === value;
                return (
                  <DropdownMenuItem
                    key={item.value}
                    aria-current={current ? "true" : undefined}
                    onSelect={() => onSelect(item.value)}
                    className={cn(
                      "relative min-h-10 gap-1.5 pl-3 text-body-compact",
                      current &&
                        "font-semibold before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-accent"
                    )}
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </TabsList>
  );
}
