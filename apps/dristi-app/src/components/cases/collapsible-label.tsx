import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A button label that collapses to nothing when `show` is false — its width, side margin
 * and opacity all ease, so a labelled toolbar button morphs to an icon button and back in
 * step with the case peek rather than snapping at the end of the slide (owner, Sept 11).
 *
 * Pair it with a button that carries `gap-0` (this owns the icon↔label gap through its own
 * margin) and whose horizontal padding eases between the icon and full sizes
 * (`px-2.5` ↔ `px-4`). The button's own `transition-all` animates that padding; this span
 * animates the label. `max-w-40` clears the longest toolbar label.
 */
export function CollapsibleLabel({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden={!show}
      className={cn(
        "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out",
        show ? "ms-1.5 max-w-40 opacity-100" : "ms-0 max-w-0 opacity-0"
      )}
    >
      {children}
    </span>
  );
}
