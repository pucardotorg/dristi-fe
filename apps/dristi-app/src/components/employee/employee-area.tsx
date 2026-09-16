"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { ChromeShell } from "@/components/chrome/app-chrome";
import { EmployeeNav } from "@/components/employee/employee-nav";
import { EmployeeTopBar } from "@/components/employee/employee-top-bar";
import { foldsCourtRail } from "@/lib/employee/navigation";

/**
 * The court-staff area wrapper.
 *
 * Court staff do not get the citizen `AppShell` — the rail there is the advocate's product
 * (pending tasks, filings, join a case) and none of it is the bench's. What the two halves
 * of the app *do* share is their chrome, and that now lives in one place:
 * `components/chrome` owns the frame — rail plate, row metrics, bar height, seams — and
 * each area pours its own content into it. `/employee` consumes it here; the advocate's
 * shell migrates onto the same frame next.
 *
 * Two regions, layered the DS way: the charcoal rail down the left, and the white page
 * beside it. The mark sits at the head of the rail, where the page origin is, and the bar
 * runs across the page at every width — see `EmployeeTopBar` for what it carries and what
 * it deliberately does not.
 *
 * `main` is a flex column so a screen that wants to pin a footer (the order composer)
 * can fill the remaining height. Screens that don't opt in still start at the top.
 *
 * A client component for one reason: the rail's width is driven from the route here. It
 * holds no other state, and the screens below it are still rendered on the server.
 *
 * There is no sign-in in front of this: `/employee` is the entry point.
 */
export function EmployeeArea({ children }: { children: React.ReactNode }) {
  /**
   * **The workbench arrives with the rail folded** (owner, 2026-09-16), which is a fact
   * about the route and so is decided here rather than inside the screen: the provider
   * that owns the rail's width lives at the area, and a screen reaching up into it would
   * be a second thing setting a state the chrome already owns.
   *
   * The reader's own last word wins after that. `chosen` is what they set by ⌘B or the
   * bar's trigger, and it is what the rail returns to when they leave the composer — so
   * a clerk who works with a folded rail everywhere does not get it thrown open at them
   * on the way out, and one who opened it on the composer keeps it open there. Only the
   * *arrival* is the route's to decide.
   *
   * A ref, not state: nothing renders from it, and making it state would re-run the
   * effect below on every toggle — which would re-fold the rail a moment after the
   * reader opened it, on the one screen where they had just asked for it.
   */
  const folded = foldsCourtRail(usePathname());
  const chosen = React.useRef(true);
  const [open, setOpen] = React.useState(!folded);
  /* Keyed on the fold alone. `open` is deliberately not a dependency: this runs when the
     route crosses into or out of a folded screen, never when the rail is toggled. */
  React.useEffect(() => {
    setOpen(folded ? false : chosen.current);
  }, [folded]);

  return (
    /* The rail folds to a 4rem strip. The prop is the shell's rather than the rail's
       because the page column's overlays measure their left edge from it too, and one of
       them is portalled out of this tree — see `ChromeShell`. */
    <ChromeShell
      rail={<EmployeeNav />}
      topBar={<EmployeeTopBar />}
      railCollapsible="icon"
      open={open}
      onOpenChange={(next) => {
        chosen.current = next;
        setOpen(next);
      }}
    >
      {/* **The beige canvas, once, for the whole area** (owner, 2026-09-12: *"this base
          change that we added for the surface, can you add it to all other pages also"*).
          It was per-screen while it was an experiment; it is the default now (`ui-craft`
          §1.0), so it belongs to the area's own column rather than to each screen that
          remembers to ask for it. The top bar and the rail keep their own fills, so the
          tint reads as the surface the work sits on. Dark keeps `bg-background`, because
          `muted` sits above `card` there and a tinted canvas would invert the depth. */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted dark:bg-background">
        {children}
      </main>
    </ChromeShell>
  );
}
