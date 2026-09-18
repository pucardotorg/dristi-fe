import * as React from "react";

import { rowActivation } from "@/lib/employee/row-activation";
import { cn } from "@/lib/utils";

/**
 * One line item in a court-side queue, below `md` — the stacked form the tables take when
 * their columns cannot survive a phone.
 *
 * Every queue's stacked list is the same well: the warm sunken fill, one radius, one
 * padding, the same hover, and the row-level click that presses the row's opener
 * (`rowActivation`). They had drifted — one carried a stray border, the gaps wandered — so
 * the shell lives here now and each list only says how its own contents stack inside it
 * (owner, 2026-09-15). The shell is identical by construction; `className` is for the
 * inner layout (`flex flex-col gap-2`, or `flex items-start gap-3` where a checkbox leads),
 * never for the surface.
 *
 * The desktop rows already share their shell through `table-plate` + `rowActivation`; this
 * is that same treatment for the stacked list, so a row reads and behaves the same at every
 * width and on every screen.
 */
export function QueueItemRow({
  className,
  children,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      {...rowActivation(
        cn(
          "rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
          className,
        ),
      )}
      {...props}
    >
      {children}
    </li>
  );
}
