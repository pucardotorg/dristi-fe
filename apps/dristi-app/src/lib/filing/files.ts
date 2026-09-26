"use client";

/**
 * Reading uploaded files back for display: object URLs for images, page-1 renders for
 * PDFs, and a hook that gives a screen a displayable image for any stored file.
 * Everything is browser-only and cached by file id for the life of the tab.
 */

import * as React from "react";

import { getRepository } from "./data";
import type { StoredFileRef } from "./types";

export function isPdfRef(ref: StoredFileRef | null | undefined): boolean {
  return !!ref && (ref.type === "application/pdf" || ref.ext === "PDF");
}

/** "2.1 MB" / "640 KB" from bytes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "1:07" from seconds. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A video file's own duration, read from its metadata via a throwaway `<video>` element.
 * `null` when the browser cannot determine it (unsupported codec, corrupt file) — the
 * caller falls back to a file-size cap in that case, since duration cannot be enforced.
 */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

const blobCache = new Map<string, Promise<Blob | null>>();

export function getFileBlob(id: string): Promise<Blob | null> {
  let p = blobCache.get(id);
  if (!p) {
    p = getRepository()
      .getFile(id)
      .then((f) => f?.blob ?? null)
      .catch(() => null);
    blobCache.set(id, p);
  }
  return p;
}

export function forgetFile(id: string) {
  blobCache.delete(id);
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  pageCache.delete(id);
}

const urlCache = new Map<string, string>();

/** Object URL for the raw bytes (images render directly; PDFs open in an iframe). */
export async function getFileUrl(id: string): Promise<string | null> {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const blob = await getFileBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

/* ───────────────────────────── PDF rendering ───────────────────────────── */

export type RenderedPage = {
  /** PNG data URL of page 1. */
  dataUrl: string;
  width: number;
  height: number;
  /** Text layer of page 1, when the PDF has one (empty for scans). */
  text: string;
  /** Text items with positions, in page pixel space at the render scale. */
  items: { str: string; x: number; y: number; w: number; h: number }[];
};

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((m) => {
      m.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
      return m;
    });
  }
  return pdfjsPromise;
}

const pageCache = new Map<string, Promise<RenderedPage | null>>();

/**
 * Render page 1 of a PDF to a PNG (long edge ≈ `maxEdge`px) and pull its text layer.
 * Cached per file id when one is given.
 */
export function renderPdfFirstPage(
  blob: Blob,
  opts: { maxEdge?: number; cacheId?: string } = {}
): Promise<RenderedPage | null> {
  const { maxEdge = 1600, cacheId } = opts;
  if (cacheId) {
    const hit = pageCache.get(cacheId);
    if (hit) return hit;
  }
  const p = (async () => {
    try {
      const lib = await pdfjs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const task = lib.getDocument({ data });
      const doc = await task.promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(4, maxEdge / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const content = await page.getTextContent();
      const items: RenderedPage["items"] = [];
      const lines: string[] = [];
      for (const it of content.items) {
        if (!("str" in it)) continue;
        const [a, , , d, e, f] = it.transform as number[];
        const h = Math.abs(d || a) * scale;
        const x = e * scale;
        const y = viewport.height - f * scale - h;
        items.push({ str: it.str, x, y, w: (it.width ?? 0) * scale, h });
        lines.push(it.str + (it.hasEOL ? "\n" : " "));
      }
      const text = lines.join("").replace(/[ \t]+\n/g, "\n").trim();
      const out: RenderedPage = {
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
        text,
        items,
      };
      await task.destroy();
      return out;
    } catch {
      return null;
    }
  })();
  if (cacheId) pageCache.set(cacheId, p);
  return p;
}

/* ───────────────────────────── Preview hook ────────────────────────────── */

export type FilePreview =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; kind: "image" | "pdf" | "other"; imageUrl: string | null; fileUrl: string | null };

/**
 * A displayable picture of a stored file: the image itself, page 1 of a PDF, or nothing
 * (unsupported type). `fileUrl` is the raw object URL for "open original".
 */
export function useFilePreview(ref: StoredFileRef | null | undefined): FilePreview {
  const id = ref?.id ?? null;
  const type = ref?.type ?? "";
  const ext = ref?.ext ?? "";
  // Keyed by file id so a new ref reads as "loading" without resetting state in the effect.
  const [result, setResult] = React.useState<{ id: string; preview: FilePreview } | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const blob = await getFileBlob(id);
      if (cancelled) return;
      if (!blob) {
        setResult({ id, preview: { status: "missing" } });
        return;
      }
      const fileUrl = await getFileUrl(id);
      if (cancelled) return;
      if (type.startsWith("image/")) {
        setResult({ id, preview: { status: "ready", kind: "image", imageUrl: fileUrl, fileUrl } });
        return;
      }
      if (type === "application/pdf" || ext === "PDF") {
        const page = await renderPdfFirstPage(blob, { cacheId: id });
        if (cancelled) return;
        setResult({
          id,
          preview: { status: "ready", kind: "pdf", imageUrl: page?.dataUrl ?? null, fileUrl },
        });
        return;
      }
      setResult({ id, preview: { status: "ready", kind: "other", imageUrl: null, fileUrl } });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, type, ext]);

  if (!id) return { status: "missing" };
  return result && result.id === id ? result.preview : { status: "loading" };
}
