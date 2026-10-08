"use client";

import * as React from "react";

import {
  STAGE_FADE,
  STAGE_FADE_OUT_MS,
  STAGE_FADE_PANEL,
} from "@/components/chrome/motion";

/**
 * The step of an overlay whose steps differ in height (`STAGE_FADE`): which step is
 * showing, and the classes that fade the window between steps.
 *
 * `setStage` does not swap at once. The window fades out (its content drifting a hint
 * the way the person is going); only once it is clear does the next step mount, taking
 * its own height unseen, and the window fades back in with the new step drifting in
 * from the side it comes from. A second request while one is under way is ignored, so
 * a double press cannot skip a step. Opening the overlay is not a step: the window's
 * own entrance covers it.
 *
 * Direction comes from `order` — later is forward, earlier is back.
 *
 * Reduced motion swaps instantly.
 */
export function useStageFade<S extends string>(initial: S, order: readonly S[]) {
  const [stage, setStageNow] = React.useState<S>(initial);
  const [phase, setPhase] = React.useState<"rest" | "out" | "in">("rest");
  const [direction, setDirection] = React.useState<"forward" | "back">("forward");
  const timer = React.useRef<number | null>(null);
  const reduced = useReducedMotion();

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const setStage = React.useCallback(
    (next: S) => {
      if (timer.current) return;
      setDirection(order.indexOf(next) < order.indexOf(stage) ? "back" : "forward");
      if (reduced) {
        setStageNow(next);
        setPhase("in");
        return;
      }
      setPhase("out");
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setStageNow(next);
        setPhase("in");
      }, STAGE_FADE_OUT_MS);
    },
    [order, stage, reduced]
  );

  /** Back to the first step with no motion, for an overlay being reset or reopened. */
  const resetStage = React.useCallback((to: S) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setStageNow(to);
    setPhase("rest");
  }, []);

  return {
    stage,
    setStage,
    resetStage,
    /** True once the step has changed at least once (focus follows from then on). */
    changed: phase !== "rest",
    /**
     * Put on the overlay's content (the dialog panel) as `style`. Inline because the
     * app chrome's `md:ease-linear` would otherwise flatten the curve; the chrome's
     * own `left` transition (following the sidebar) is kept beside it.
     */
    panelStyle: (phase === "rest"
      ? undefined
      : {
          opacity: phase === "out" ? 0 : 1,
          transition: reduced
            ? "none"
            : `opacity ${phase === "out" ? STAGE_FADE_PANEL.outMs : STAGE_FADE_PANEL.inMs}ms ${STAGE_FADE_PANEL.ease}, left 200ms linear`,
        }) as React.CSSProperties | undefined,
    /** Put on the step's scene inside it. */
    sceneClassName: phase === "rest" ? "" : STAGE_FADE.scene[direction][phase],
  };
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const noServerMotion = () => false;

/** Whether the reader asked for reduced motion, kept current if they change it. */
function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    noServerMotion
  );
}
