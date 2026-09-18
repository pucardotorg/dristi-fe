"use client";

import * as React from "react";
import {
  FlagIcon,
  MousePointer2Icon,
  SquareDashedIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { collectMarks, rectStyle } from "@/lib/employee/scrutiny/field";
import type { BundleTool, Rect } from "@/lib/employee/scrutiny/types";
import type { ScrutinyController } from "@/lib/employee/scrutiny/use-scrutiny-state";
import {
  useLocalStorageValue,
  writeLocalStorageValue,
} from "@/hooks/use-local-storage-value";
import { cn } from "@/lib/utils";
import { GENERATED_PAGES } from "@/components/employee/scrutiny/generated-pages";
import { PageSheet, SHEET_BOX } from "@/components/employee/page-facsimile";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ZOOM_STEPS = [50, 67, 80, 100, 125, 150, 200, 300, 400];
const ZOOM_KEY = "employee-scrutiny-zoom";

export interface BundleHandle {
  goToDoc: (docId: string) => void;
}

export function BundleView({
  controller,
  aiOn,
  spot,
  onOpenFlag,
  ref,
}: {
  controller: ScrutinyController;
  aiOn: boolean;
  /** The AI evidence region for the selected field, if it has one. */
  spot: { doc: string; rect: Rect } | null;
  onOpenFlag: (fieldId: string) => void;
  ref?: React.Ref<BundleHandle>;
}) {
  const { bundle } = useScrutinyCase();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bundleRef = React.useRef<HTMLDivElement>(null);
  const [zoomBase, setZoomBase] = React.useState(880);
  const [hint, setHint] = React.useState<string | null>(null);

  const { tool, evidenceTarget, flags, draft } = controller;

  /*
   * Zoom is persisted state, so it lives in localStorage and not in `useState`: the
   * server and the hydration render both see the 100% default, and React re-renders once
   * after hydration if a stored zoom differs. Reading it in an effect instead would be
   * the `react-hooks/set-state-in-effect` cascade the repo rules out.
   */
  const storedZoom = Number(useLocalStorageValue(ZOOM_KEY));
  const zoom = ZOOM_STEPS.includes(storedZoom) ? storedZoom : 100;
  const setZoom = React.useCallback(
    (next: number) => writeLocalStorageValue(ZOOM_KEY, String(next)),
    [],
  );

  /*
   * Zoom. Measure the column at 1× ONLY: once zoomed, a horizontal scrollbar changes
   * `clientWidth`, and measuring then compounds the scale on every step.
   */
  const measureBase = React.useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const cs = getComputedStyle(sc);
    const avail =
      sc.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    setZoomBase(Math.max(320, Math.min(940, Math.round(avail * 0.96))));
  }, []);

  React.useLayoutEffect(() => {
    measureBase();
    let timer: number;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measureBase, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [measureBase]);

  /** Keep the point under the cursor pinned while the scale changes. */
  const zoomTo = React.useCallback(
    (next: number, cx?: number, cy?: number) => {
      const sc = scrollRef.current;
      if (!sc) return;
      const z0 = zoom / 100;
      const z1 = next / 100;
      const ax = cx ?? sc.clientWidth / 2;
      const ay = cy ?? sc.clientHeight / 2;
      const px = (sc.scrollLeft + ax) / z0;
      const py = (sc.scrollTop + ay) / z0;
      setZoom(next);
      requestAnimationFrame(() => {
        sc.scrollLeft = px * z1 - ax;
        sc.scrollTop = py * z1 - ay;
      });
    },
    [zoom, setZoom],
  );

  const stepZoom = React.useCallback(
    (delta: number, cx?: number, cy?: number) => {
      let i = 0;
      ZOOM_STEPS.forEach((z, n) => {
        if (Math.abs(z - zoom) < Math.abs(ZOOM_STEPS[i] - zoom)) i = n;
      });
      const next =
        ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + delta))];
      zoomTo(next, cx, cy);
    },
    [zoom, zoomTo],
  );

  // ⌘/Ctrl + wheel zooms about the pointer; ⌘/Ctrl +/-/0 from the keyboard.
  React.useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const box = sc.getBoundingClientRect();
      stepZoom(
        event.deltaY < 0 ? 1 : -1,
        event.clientX - box.left,
        event.clientY - box.top,
      );
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => sc.removeEventListener("wheel", onWheel);
  }, [stepZoom]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        stepZoom(1);
      } else if (event.key === "-") {
        event.preventDefault();
        stepZoom(-1);
      } else if (event.key === "0") {
        event.preventDefault();
        zoomTo(100);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stepZoom, zoomTo]);

  /* ── navigation ────────────────────────────────────────────────────────── */

  const goToDoc = React.useCallback((docId: string) => {
    document
      .getElementById(`doc-${docId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  React.useImperativeHandle(ref, () => ({ goToDoc }), [goToDoc]);

  /* ── panning (Select tool, zoomed in) ──────────────────────────────────── */

  const pan = React.useRef<[number, number, number, number] | null>(null);
  const [panning, setPanning] = React.useState(false);

  function onScrollPointerDown(event: React.PointerEvent) {
    const sc = scrollRef.current;
    if (!sc || tool !== "select" || zoom <= 100) return;
    if ((event.target as HTMLElement).closest("button,[data-mark]")) return;
    pan.current = [event.clientX, event.clientY, sc.scrollLeft, sc.scrollTop];
    setPanning(true);
    try {
      sc.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already captured elsewhere */
    }
  }
  function onScrollPointerMove(event: React.PointerEvent) {
    const sc = scrollRef.current;
    if (!sc || !pan.current) return;
    sc.scrollLeft = pan.current[2] - (event.clientX - pan.current[0]);
    sc.scrollTop = pan.current[3] - (event.clientY - pan.current[1]);
  }
  function onScrollPointerUp(event: React.PointerEvent) {
    const sc = scrollRef.current;
    if (!pan.current) return;
    pan.current = null;
    setPanning(false);
    try {
      sc?.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  /*
   * Drawing a box. Pointer capture keeps the whole gesture on the bundle even when the
   * pointer crosses a child, leaves the page, or ends outside the window. `touch-none`
   * on the pages stops the scroller claiming the gesture as a pan and cancelling it —
   * the two ways this silently failed on trackpads.
   */
  const drag = React.useRef<{
    x: number;
    y: number;
    page: HTMLElement;
    box: DOMRect;
  } | null>(null);
  const [live, setLive] = React.useState<{ page: string; rect: Rect } | null>(
    null,
  );

  function pageUnder(event: React.PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(event.clientX, event.clientY);
    return (el as HTMLElement | null)?.closest("[data-page]") ?? null;
  }

  function onBundlePointerDown(event: React.PointerEvent) {
    if (tool !== "rect" || event.button !== 0) return;
    const page =
      (event.target as HTMLElement).closest<HTMLElement>("[data-page]") ??
      pageUnder(event);
    if (!page) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      page,
      box: page.getBoundingClientRect(),
    };
    try {
      bundleRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* capture unavailable */
    }
    event.preventDefault();
  }

  function onBundlePointerMove(event: React.PointerEvent) {
    if (tool !== "rect" || !drag.current) return;
    setLive({
      page: drag.current.page.dataset.doc ?? "",
      rect: rectFrom(drag.current, event),
    });
    event.preventDefault();
  }

  const endDraw = React.useCallback(
    (event: PointerEvent | React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      setLive(null);
      try {
        bundleRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      const raw = rectFrom(d, event);
      if (raw[2] < 0.8 || raw[3] < 0.8) return;
      const left = Math.max(0, Math.min(100, raw[0]));
      const top = Math.max(0, Math.min(100, raw[1]));
      const rect: Rect = [
        round(left),
        round(top),
        round(Math.min(raw[2], 100 - left)),
        round(Math.min(raw[3], 100 - top)),
      ];

      const docId = d.page.dataset.doc;
      if (!docId) return;
      const outcome = controller.commitRect(docId, rect);
      if (outcome === "declined") {
        // Generated pages ARE the fields; the refusal stays up until the next tool
        // action rather than blinking.
        setHint("Generated page — flag the field instead");
      } else {
        setHint(null);
      }
    },
    [controller],
  );

  React.useEffect(() => {
    const onUp = (event: PointerEvent) => {
      if (drag.current) endDraw(event);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [endDraw]);

  /*
   * The refusal clears the moment the officer changes tool or re-arms — adjusted during
   * render against the previous values, which is React's own answer to "reset state when
   * a prop changes" and avoids a second render pass.
   */
  const toolKey = `${tool}:${evidenceTarget ?? ""}`;
  const [prevToolKey, setPrevToolKey] = React.useState(toolKey);
  if (toolKey !== prevToolKey) {
    setPrevToolKey(toolKey);
    setHint(null);
  }

  const drawHint =
    hint ??
    (evidenceTarget
      ? "Drag to annotate the error"
      : "Drag to annotate — this asks the advocate to re-upload the document");

  const marks = React.useMemo(() => collectMarks(flags), [flags]);
  const drawing = tool === "rect";

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface-sunken @container">
      {/* Chrome: white bar, hairline seam. */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-card px-4">
        {/*
         * `flex-1` alone let the tools take everything and collapse this to "C…"; the
         * floor keeps the title readable and the subtitle drops out first.
         */}
        <b className="me-auto min-w-0 flex-1 truncate text-body-compact font-semibold">
          Case bundle
        </b>

        {/* No segmented outline: the default variant is borderless — transparent at rest,
            `accent-strong` on the pressed tool — so Select and Mark read as the same plain
            ghost icon buttons as the zoom controls beside them, the active one filled
            rather than boxed (owner, 2026-09-15). */}
        <ToggleGroup
          type="single"
          value={tool}
          onValueChange={(value) => value && controller.setTool(value as BundleTool)}
          aria-label="Bundle tool"
        >
          {/* Icon-only, 40px square — the same compact treatment as the zoom controls
              beside them. The label lives in the tooltip and the accessible name; 40px is
              the touch floor the registry's tablets need. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="select"
                className="size-10"
                aria-label="Select"
              >
                <MousePointer2Icon />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Select</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="rect" className="size-10" aria-label="Mark">
                <SquareDashedIcon />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Mark</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* `bg-border` is the darkest non-text mark in the system, and a chrome bar is
            the last place it belongs — hairline is the seam role (ui-craft §1.1). */}
        {/* `self-center` is not optional: the DS separator ships
            `data-vertical:self-stretch`, so an explicit height pins the rule to the top
            of the flex line and it fuses with the bar's own seam. Both need `!`: the
            primitive's are `data-vertical:` variants, and an attribute selector outranks
            a plain utility. The court top bar carries the same override, for the same
            reason. */}
        <Separator
          orientation="vertical"
          className="h-5! self-center! bg-hairline"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            {/* Default size, like every other control on a court screen: the registry
                works on tablets and the DS floor for a control is 40px. */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => stepZoom(-1)}
              disabled={zoom <= ZOOM_STEPS[0]}
              aria-label="Zoom out"
            >
              <ZoomOutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          className="tabular-nums"
          onClick={() => zoomTo(100)}
          aria-label={`Zoom is ${zoom} percent — reset to 100 percent`}
        >
          {zoom}%
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => stepZoom(1)}
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              aria-label="Zoom in"
            >
              <ZoomInIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={scrollRef}
        className={cn("flex-1 overflow-auto p-4 pb-12", panning && "cursor-grabbing")}
        onPointerDown={onScrollPointerDown}
        onPointerMove={onScrollPointerMove}
        onPointerUp={onScrollPointerUp}
        onPointerCancel={onScrollPointerUp}
      >
        {drawing ? (
          <div className="pointer-events-none sticky top-0 z-8 mb-2 flex justify-center">
            {/* Guidance is neutral. The workbench spends its one teal on Register case
                (the Ration Teal Law), and a brand-filled pill floating over the bundle
                was competing with it for the same meaning. */}
            <Badge variant="secondary">{drawHint}</Badge>
          </div>
        ) : null}

        <div
          ref={bundleRef}
          className={cn("mx-auto flex flex-col gap-4", drawing && "cursor-crosshair")}
          style={
            {
              width: zoomBase,
              // Digital zoom: no reflow, and real overflow to pan around.
              zoom: zoom / 100,
            } as React.CSSProperties
          }
          onPointerDown={onBundlePointerDown}
          onPointerMove={onBundlePointerMove}
          onPointerUp={endDraw}
          onDragStart={(event) => drawing && event.preventDefault()}
        >
          {bundle.map((doc) => {
            /* A derived filing draws every page as an illegible facsimile; the authored
               case has real scans and legible generated pages. The facsimile is a
               `size-full` SVG with no intrinsic height, so — unlike an `<img>`, which
               sizes its own box — its page needs an explicit aspect ratio from the kind's
               own `SHEET_BOX`, the same frame the read-only scroller uses. */
            const sheet = doc.kind === "facsimile" ? doc.sheet : undefined;
            const box = sheet ? SHEET_BOX[sheet] : null;
            const Generated = sheet ? undefined : GENERATED_PAGES[doc.id];
            const docMarks = marks.filter((m) => m.evidence.doc === doc.id);
            const draftMark =
              draft?.evidence?.doc === doc.id ? draft.evidence : null;
            return (
              <div
                className="flex scroll-mt-3 flex-col gap-1.5"
                id={`doc-${doc.id}`}
                key={doc.id}
              >
                {/* The only navigational anchor in a scroll this long, so it reads as
                    one: caption size, but foreground ink at 600 rather than grey. */}
                <div className="text-caption font-semibold text-foreground">
                  <span className="tabular-nums">{doc.no}</span> · {doc.name}
                </div>
                <div
                  data-page=""
                  data-doc={doc.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl bg-paper shadow-raised",
                    drawing && "touch-none select-none [&_*]:touch-none",
                  )}
                  style={box ? { aspectRatio: `${box.w} / ${box.h}` } : undefined}
                >
                  {doc.kind === "image" && doc.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.src}
                      alt={doc.name}
                      className="block h-auto w-full select-none"
                      draggable={false}
                    />
                  ) : sheet ? (
                    <PageSheet kind={sheet} />
                  ) : Generated ? (
                    <Generated />
                  ) : null}

                  {/* Where AI read the selected field from — a halo, never a mark. */}
                  {aiOn && spot?.doc === doc.id ? (
                    <div
                      className="pointer-events-none absolute z-2 rounded-md border-2 border-primary bg-halo ring-3 ring-halo transition-all"
                      style={rectStyle(spot.rect)}
                      aria-hidden="true"
                    />
                  ) : null}

                  {docMarks.map((mark) => (
                    <button
                      key={mark.fieldId}
                      type="button"
                      data-mark=""
                      className={MARK_CLASS}
                      style={rectStyle(mark.evidence.rect)}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenFlag(mark.fieldId);
                      }}
                      aria-label={
                        mark.count > 1
                          ? `Mark on ${doc.name}, ${mark.count} items — open the item it belongs to`
                          : `Mark on ${doc.name} — open the item it belongs to`
                      }
                    >
                      {/*
                       * One box per defect. A linked document item copies its field
                       * item's rectangle, and two identical stacked boxes read as two
                       * defects — so the tag counts instead. The tag is already
                       * `min-w-5` for exactly this.
                       */}
                      <span className={MARK_TAG} aria-hidden="true">
                        {mark.count > 1 ? (
                          <span className="tabular-nums">{mark.count}</span>
                        ) : (
                          <FlagIcon className="size-3" strokeWidth={2.4} />
                        )}
                      </span>
                    </button>
                  ))}

                  {/*
                   * The mark in the open composer has no saved flag yet — without this,
                   * the box just drawn disappears on release.
                   */}
                  {draftMark ? (
                    <div
                      data-mark=""
                      className={cn(MARK_CLASS, "ring-3 ring-focus-ring-destructive")}
                      style={rectStyle(draftMark.rect)}
                      aria-hidden="true"
                    >
                      <span className={MARK_TAG}>
                        <FlagIcon className="size-3" strokeWidth={2.4} />
                      </span>
                    </div>
                  ) : null}

                  {live?.page === doc.id ? (
                    <div
                      className="pointer-events-none absolute z-5 border-2 border-dashed border-destructive"
                      style={rectStyle(live.rect)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * A saved mark. The 1px `paper-border` ring inside and out is what keeps a red box
 * legible on both a white generated page and a dark scan — the DS names that ink, so it
 * is not a local invention.
 */
const MARK_CLASS =
  "absolute z-2 cursor-pointer rounded-sm border-2 border-destructive bg-transparent ring-1 ring-paper-border transition-shadow hover:ring-3 hover:ring-focus-ring-destructive";

const MARK_TAG =
  "absolute -top-2.5 -end-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-caption font-semibold text-destructive-foreground shadow-raised";

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function rectFrom(
  d: { x: number; y: number; box: DOMRect },
  event: { clientX: number; clientY: number },
): Rect {
  return [
    ((Math.min(d.x, event.clientX) - d.box.left) / d.box.width) * 100,
    ((Math.min(d.y, event.clientY) - d.box.top) / d.box.height) * 100,
    (Math.abs(event.clientX - d.x) / d.box.width) * 100,
    (Math.abs(event.clientY - d.y) / d.box.height) * 100,
  ];
}

