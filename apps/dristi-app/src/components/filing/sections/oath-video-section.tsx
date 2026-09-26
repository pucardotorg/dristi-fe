"use client";

/**
 * Oath video — an optional recording of each complainant reciting the oath, kept beside
 * the wording so there is nothing to remember before pressing record.
 *
 * One card per complainant, in the same order as the Complainant screen. An institution
 * complainant's authorised representative takes the oath in their place. The recording is
 * a normal filing upload: it is stored with the draft, travels with it like any other
 * document, and is not part of the generated complaint PDF (§16.7) — a video cannot be
 * embedded in a printed document.
 *
 * Duration is the primary limit, read from the file's own metadata once it is chosen; a
 * file whose duration cannot be read (unsupported codec, corrupt upload) falls back to a
 * size cap instead, since duration cannot be enforced without it.
 */

import * as React from "react";
import { RefreshCwIcon, Trash2Icon, TriangleAlertIcon, UploadIcon } from "lucide-react";

import { storeUpload, getRepository } from "@/lib/filing/data";
import {
  formatBytes,
  formatDuration,
  forgetFile,
  getFileUrl,
  readVideoDuration,
} from "@/lib/filing/files";
import { complainantLabel } from "@/lib/filing/selectors";
import { neighbours } from "@/lib/filing/steps";
import { useFiling } from "@/lib/filing/store";
import type { OathVideoUpload, StoredFileRef } from "@/lib/filing/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/filing/confirm-dialog";
import { FilingFooter } from "@/components/filing/filing-footer";
import { FilingPageHeader } from "@/components/filing/filing-page-header";
import { FilingMain } from "@/components/filing/filing-shell";
import { FormCard } from "@/components/filing/form-card";
import { SectionNotice } from "@/components/filing/notices";

/** Read as an affirmation (Oaths Act, 1969) — religion-neutral, no invocation required. */
const OATH_TEXT =
  "I solemnly affirm that the contents of this complaint, and everything I have stated " +
  "in support of it, are true to the best of my knowledge and belief, and that I have " +
  "not concealed anything material to this case.";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ACCEPT_ATTR = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

/** Enforced when duration can be read. */
const MAX_DURATION_SECONDS = 120;
/** Fallback only — used when the browser cannot read the file's duration at all. */
const MAX_FALLBACK_BYTES = 200 * 1024 * 1024;

type PickOutcome =
  | { ok: true; file: File; durationSeconds: number | null }
  | { ok: false; message: string };

async function validate(file: File): Promise<PickOutcome> {
  const okType =
    ACCEPTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
  if (!okType) {
    return { ok: false, message: "Please choose an MP4, WebM or MOV video." };
  }

  const durationSeconds = await readVideoDuration(file);
  if (durationSeconds !== null) {
    if (durationSeconds > MAX_DURATION_SECONDS) {
      return {
        ok: false,
        message: `That recording is longer than ${formatDuration(MAX_DURATION_SECONDS)}. Please trim it and try again.`,
      };
    }
    return { ok: true, file, durationSeconds };
  }

  // Duration could not be read — fall back to the size cap.
  if (file.size > MAX_FALLBACK_BYTES) {
    return { ok: false, message: "That file is larger than 200 MB. Please choose a smaller recording." };
  }
  return { ok: true, file, durationSeconds: null };
}

function OathVideoPlayer({ file }: { file: StoredFileRef }) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void getFileUrl(file.id).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  if (!url) return <Skeleton className="h-48 w-full max-w-sm rounded-lg" />;
  return (
    <video
      src={url}
      controls
      className="h-48 w-full max-w-sm rounded-lg bg-surface-sunken object-contain"
    />
  );
}

function ComplainantOathCard({
  label,
  upload,
  onPick,
  onRemove,
  busy,
}: {
  label: string;
  upload: OathVideoUpload | null;
  onPick: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  return (
    <FormCard
      title={`Oath video — ${label}`}
      description="Optional. Read the wording below aloud on camera."
    >
      <blockquote className="rounded-lg bg-surface-sunken p-4 text-body-compact italic text-foreground">
        {OATH_TEXT}
      </blockquote>

      {upload ? (
        <div className="flex flex-col gap-3">
          <OathVideoPlayer file={upload.file} />
          <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
            <span className="truncate">{upload.file.name}</span>
            <span className="tabular-nums">{formatBytes(upload.file.size)}</span>
            {upload.durationSeconds !== null ? (
              <span className="tabular-nums">{formatDuration(upload.durationSeconds)}</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPick} disabled={busy}>
              <RefreshCwIcon data-icon="inline-start" aria-hidden />
              Replace video
            </Button>
            <Button
              type="button"
              variant="destructive-ghost"
              onClick={onRemove}
              disabled={busy}
              aria-label={`Remove oath video for ${label}`}
            >
              <Trash2Icon data-icon="inline-start" aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={onPick} disabled={busy} className="w-fit">
          <UploadIcon data-icon="inline-start" aria-hidden />
          Upload oath video
        </Button>
      )}

      <p className="text-caption text-muted-foreground">
        Up to {formatDuration(MAX_DURATION_SECONDS)}, in MP4, WebM or MOV.
      </p>
    </FormCard>
  );
}

export function OathVideoSection() {
  const { draft, update, hrefFor } = useFiling();
  const { prev, next } = neighbours("oath-video");

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const targetIndex = React.useRef<number | null>(null);
  const [busyIndex, setBusyIndex] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [removeIndex, setRemoveIndex] = React.useState<number | null>(null);

  const pick = (index: number) => {
    targetIndex.current = index;
    setError(null);
    const el = inputRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const index = targetIndex.current;
    targetIndex.current = null;
    if (!file || index === null) return;

    setBusyIndex(index);
    const outcome = await validate(file);
    if (!outcome.ok) {
      setError(outcome.message);
      setBusyIndex(null);
      return;
    }

    const previous = draft.complainants[index]?.oathVideo ?? null;
    let ref: StoredFileRef;
    try {
      ref = await storeUpload(outcome.file);
    } catch {
      setError("We couldn't store that file in this browser. Please try again.");
      setBusyIndex(null);
      return;
    }

    update((d) => {
      const c = d.complainants[index];
      if (!c) return;
      c.oathVideo = { file: ref, durationSeconds: outcome.durationSeconds };
    });
    if (previous) {
      forgetFile(previous.file.id);
      void getRepository().deleteFile(previous.file.id);
    }
    setBusyIndex(null);
  };

  const confirmRemove = () => {
    const index = removeIndex;
    setRemoveIndex(null);
    if (index === null) return;
    const previous = draft.complainants[index]?.oathVideo ?? null;
    update((d) => {
      const c = d.complainants[index];
      if (c) c.oathVideo = null;
    });
    if (previous) {
      forgetFile(previous.file.id);
      void getRepository().deleteFile(previous.file.id);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFileChosen}
      />

      <FilingMain>
        <FilingPageHeader
          title="Oath video"
          description="Optional — a recorded oath from each complainant, kept with the case file."
        />

        <SectionNotice variant="info">
          This is optional. If uploaded, the video is stored with your filing and is
          visible to the court like any other document you submit.
        </SectionNotice>

        {draft.complainants.map((c, i) => (
          <ComplainantOathCard
            key={c.id}
            label={complainantLabel(c, i)}
            upload={c.oathVideo}
            onPick={() => pick(i)}
            onRemove={() => setRemoveIndex(i)}
            busy={busyIndex === i}
          />
        ))}
      </FilingMain>

      <FilingFooter
        backHref={prev ? hrefFor(prev) : undefined}
        continueHref={next ? hrefFor(next) : undefined}
      />

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-16 z-40 w-72 max-w-full sm:right-6"
      >
        {error ? (
          <Alert variant="warning" className="shadow-overlay">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <ConfirmDialog
        open={removeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveIndex(null);
        }}
        title="Remove this oath video?"
        description="Are you sure you want to remove this recording? This cannot be undone."
        confirmLabel="Yes, remove"
        onConfirm={confirmRemove}
      />
    </>
  );
}
