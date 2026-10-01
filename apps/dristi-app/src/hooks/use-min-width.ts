"use client";

import * as React from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server — the standard guard that
 * lets a measurement run before the browser paints without tripping React's
 * "useLayoutEffect does nothing on the server" warning during SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Viewport width check, mirroring the DS `useIsMobile` pattern for the breakpoints that
 * hook does not cover. `false` on the server and before mount.
 */
export function useMinWidth(minWidth: number): boolean {
  const query = `(min-width: ${minWidth}px)`;

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * Is there room for `rem` worth of *this page's own text* across the viewport?
 *
 * A media query cannot answer that. `min-width: 80rem` measures the browser's default
 * font size, which browser text zoom changes but a user stylesheet or an enlarged root
 * size does not; a pixel query misses both. So this measures what is actually true —
 * viewport width divided by the computed root font size — and re-measures whenever the
 * document relayouts, which covers a resize, a page zoom and a font-size change alike.
 *
 * Multi-pane layouts need it: at 200% text zoom a 1280px viewport holds forty rem, not
 * eighty, and three panes sized for eighty leave a rail too narrow to read a word in.
 * Folding on *effective* width is what keeps the labels whole (`ACCESSIBILITY.md` §10).
 *
 * `false` before mount. The measurement runs in a layout effect, not a passive one, so on
 * a wide viewport the correct layout lands on the first paint after hydration rather than
 * a frame of the narrow layout snapping to the wide one.
 */
export function useRoomInRem(rem: number): boolean {
  const [fits, setFits] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    /*
     * A one-rem probe, because there is no event for "the root font size changed".
     * Observing the document element does not work — its box is the viewport, which does
     * not move when the text does. A box sized in `rem` does.
     */
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:1rem;height:1rem;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);

    const measure = () => {
      const base = probe.getBoundingClientRect().width || 16;
      setFits(window.innerWidth / base >= rem);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      probe.remove();
    };
  }, [rem]);

  return fits;
}

/**
 * Width thresholds for the filing chrome. The flow can show four columns at once — main
 * nav, sections rail, form, source rail — so each surface has a width it is allowed to
 * take a column at, and below it becomes an overlay instead of squeezing the form.
 *
 * Budget (chrome at its widest): nav 16rem + sections 18rem + source 20rem = 54rem.
 * The form column needs ~40rem to keep its two-up field rows; 54 + 40 = 94rem, past
 * `2xl`. Hence: below `2xl` the nav gives up its labels rather than the form its width.
 */

/** From `lg`: the sections rail is a column. Below it, a sheet. */
export function useSectionsDock() {
  return useMinWidth(1024);
}

/** From `xl`: the source rail is a column beside the form. Below it, a sheet. */
export function useSourceDock() {
  return useMinWidth(1280);
}

/** From `2xl`: room for a labelled main nav *and* both rails at once. */
export function useRoomForLabelledNav() {
  return useMinWidth(1536);
}

/** True from `lg` up — the board can give up width to an in-flow case peek. */
export function useIsDesktop(): boolean {
  return useMinWidth(1024);
}

/** True from `xl` up — the case peek and the tasks rail can coexist. */
export function useIsWide(): boolean {
  return useMinWidth(1280);
}
