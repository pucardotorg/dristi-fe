"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Same worker the filing flow loads, copied to public/vendor at dev/build. */
function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/**
 * The app's own PDF surface: pages on a sunken well, in the app's theme,
 * instead of the browser's built-in viewer in an iframe. It zooms by pinch and
 * by ctrl/cmd + scroll; the two buttons are the same zoom for keyboard and
 * single-pointer users (WCAG 2.5.1). Download and full view stay with the
 * caller, so every place a document shows decides its own actions.
 */
export function PdfViewer({
  src,
  title,
  initialPage = 1,
  className,
}: {
  src: string;
  /** Names the document for assistive tech. */
  title: string;
  /** 1-based page to open at. */
  initialPage?: number;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  /** Page 1's width over height; the placeholder shape for unrendered pages. */
  const [aspect, setAspect] = useState(1 / Math.SQRT2);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | null = null;
    setDoc(null);
    setFailed(false);
    (async () => {
      try {
        const lib = await pdfjs();
        const task = lib.getDocument({ url: src });
        destroy = () => task.destroy();
        const next = await task.promise;
        if (cancelled) return;
        const first = await next.getPage(1);
        const base = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setAspect(base.width / base.height);
        setDoc(next);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [src]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* A trackpad pinch arrives as a wheel event with ctrlKey set, the same as
     ctrl/cmd + scroll. Registered by hand because React's wheel listener is
     passive and cannot stop the browser zooming the whole page. */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => clampZoom(current * Math.exp(-event.deltaY / 300)));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!doc || initialPage <= 1) return;
    scrollRef.current
      ?.querySelector(`[data-page="${initialPage}"]`)
      ?.scrollIntoView({ block: "start" });
  }, [doc, initialPage]);

  /* p-4 each side, so the page never touches the well's edge at fit. */
  const pageWidth = Math.max(0, (width - 32) * zoom);

  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-xl bg-surface-sunken",
        className
      )}
    >
      <div
        ref={scrollRef}
        role="document"
        aria-label={title}
        tabIndex={0}
        className="absolute inset-0 overflow-auto overscroll-contain rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {failed ? (
          <p className="p-6 text-body-compact text-muted-foreground">
            This document could not be shown. Try downloading it instead.
          </p>
        ) : !doc ? (
          <div
            role="status"
            className="flex h-full items-center justify-center gap-2 text-body-compact text-muted-foreground"
          >
            <Spinner aria-hidden />
            Loading document
          </div>
        ) : (
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
            {Array.from({ length: doc.numPages }, (_, index) => (
              <PdfPage
                key={index}
                doc={doc}
                number={index + 1}
                width={pageWidth}
                aspect={aspect}
                root={scrollRef}
              />
            ))}
          </div>
        )}
      </div>

      {doc ? (
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border border-hairline bg-card p-0.5 shadow-raised">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
          >
            <MinusIcon aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="w-12 tabular-nums"
            aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to fit`}
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
          >
            <PlusIcon aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One page. It holds its shape from the start and only draws once it nears the
 * viewport, so a two-hundred-page case file opens as fast as a one-page order.
 * While a zoom gesture runs the old bitmap stretches; the sharp one replaces
 * it once the width settles.
 */
function PdfPage({
  doc,
  number,
  width,
  aspect,
  root,
}: {
  doc: PDFDocumentProxy;
  number: number;
  width: number;
  aspect: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [near, setNear] = useState(false);
  const [ratio, setRatio] = useState(aspect);

  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: root.current, rootMargin: "100% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [root]);

  const draw = useCallback(
    async (signal: { cancelled: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas || width <= 0) return;
      const page = await doc.getPage(number);
      if (signal.cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.width / base.height);
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({
        scale: (width / base.width) * density,
      });
      const buffer = document.createElement("canvas");
      buffer.width = Math.ceil(viewport.width);
      buffer.height = Math.ceil(viewport.height);
      const context = buffer.getContext("2d");
      if (!context) return;
      await page.render({ canvas: buffer, canvasContext: context, viewport })
        .promise;
      if (signal.cancelled) return;
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      canvas.getContext("2d")?.drawImage(buffer, 0, 0);
    },
    [doc, number, width]
  );

  useEffect(() => {
    if (!near) return;
    const signal = { cancelled: false };
    const timer = window.setTimeout(() => {
      draw(signal).catch(() => undefined);
    }, 120);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(timer);
    };
  }, [near, draw]);

  return (
    <div
      ref={holderRef}
      data-page={number}
      className="shrink-0 overflow-hidden rounded-sm bg-paper shadow-raised"
      style={{ width, height: width / ratio }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`Page ${number}`}
        role="img"
        className="block size-full"
      />
    </div>
  );
}
