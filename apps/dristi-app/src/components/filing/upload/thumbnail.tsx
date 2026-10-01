"use client";

/**
 * The preview control for a document on file — one implementation, now three callers.
 *
 * It began on the case-documents row (`slot-row.tsx`); the scrutiny inset needed the same
 * thing (the officer's evidence and the flagged scan itself, brief §15.2); and the
 * court's complaint file needs it a third time, for the documents a §138 filing carried
 * (`employee/register-case-file.tsx`). Two copies of a control that opens a document is
 * how a product ends up with two ways to do the same thing, so it lives here.
 *
 * Always a `<button>`: a PDF with no image preview must still be openable by keyboard and
 * by voice. "You can enlarge this" cannot live on hover alone (`ACCESSIBILITY.md` §7), so
 * the scrim is revealed on hover *and* on keyboard focus, and stays visible where there is
 * no hover at all. It is decoration over the one control, not a second control.
 *
 * The DS media well is `overflow-hidden`, which would clip a focus ring, so focus is an
 * inset outline in the same `ring` colour.
 */

import * as React from "react";
import { Maximize2Icon } from "lucide-react";

import { useFilePreview } from "@/lib/filing/files";
import type { StoredFileRef } from "@/lib/filing/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The control itself, without an opinion about where the picture comes from.
 *
 * Split out of `SlotThumbnail` on 2026-09-11 so the court side can share it. The filing
 * callers reach a stored file through `useFilePreview`; the court's complaint file has no
 * document store at all and shows a drawn facsimile instead, so it has nothing to hand a
 * `StoredFileRef`-shaped API. The *control* is what both need to be the same — one
 * button, one scrim, one focus treatment, one voice label — and that is exactly what is
 * here. `SlotThumbnail` below composes it and renders byte-identical markup to before.
 */
export function ThumbnailButton({
  label,
  onPreview,
  children,
}: {
  /** The whole accessible name, spoken. Callers own the verb. */
  label: string;
  onPreview: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPreview}
      aria-label={label}
      className="group/thumb relative size-full cursor-pointer rounded-md outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {children}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-scrim opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100 pointer-coarse:opacity-100"
      >
        {/* The glyph rides its own card-on-scrim chip: `scrim` is a 50% black wash in both
            themes, and no foreground token stays light in both. */}
        <span className="flex size-6 items-center justify-center rounded-full bg-card text-foreground">
          <Maximize2Icon className="size-3.5" />
        </span>
      </span>
    </button>
  );
}

export function SlotThumbnail({
  file,
  label,
  onPreview,
}: {
  file: StoredFileRef | undefined;
  /** What this document is, for the accessible name when the file has no name. */
  label: string;
  onPreview: () => void;
}) {
  const preview = useFilePreview(file);
  return (
    <ThumbnailButton
      label={`Preview ${file?.name ?? label}`}
      onPreview={onPreview}
    >
      {preview.status === "loading" ? (
        <Skeleton className="size-full rounded-md" />
      ) : preview.status === "ready" && preview.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={preview.imageUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-caption font-semibold text-muted-foreground">
          {file?.ext ?? "File"}
        </span>
      )}
    </ThumbnailButton>
  );
}

/**
 * The page-shaped box the thumbnail sits in, for callers outside the upload row — where
 * `DocumentSlot` provides its own media well. Page-shaped rather than square: a square
 * crop of a cheque or an AD card is noise.
 *
 * It carries a `hairline` edge inside a sunken inset, which is the DS's stated exception
 * for thumbnails (`foundations/elevation`) — the picture needs a boundary the fill cannot
 * give it.
 */
export function ThumbnailWell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-12 w-16 shrink-0 overflow-hidden rounded-md border border-hairline bg-card sm:h-14 sm:w-20",
        className
      )}
    >
      {children}
    </div>
  );
}
