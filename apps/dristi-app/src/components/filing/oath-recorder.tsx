"use client";

/**
 * In-place camera recorder for the Oath screen — the alternative to picking a video file.
 * Opens a live preview via `getUserMedia`, records with `MediaRecorder`, and hands the
 * finished clip back as a plain `File` so the caller can run it through the exact same
 * `storeUpload` + `oathVideo` assignment path as an uploaded file. Nothing here decides
 * where the recording is stored — that stays the section's job.
 *
 * Every realistic failure (no camera, permission denied, camera busy, unsupported
 * browser) is reported through `onError` with a plain-language message; the caller's
 * job is to fall back to the upload button, which this component never disables.
 */

import * as React from "react";
import { CircleIcon, SquareIcon } from "lucide-react";

import { formatDuration } from "@/lib/filing/files";
import { Button } from "@/components/ui/button";

type Status = "requesting" | "live" | "recording";

/** Preferred recorder output formats, best first; the browser picks the first it supports. */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

function pickMimeType(): string {
  const supported = window.MediaRecorder?.isTypeSupported;
  if (typeof supported !== "function") return "";
  return MIME_CANDIDATES.find((candidate) => {
    try {
      return supported.call(window.MediaRecorder, candidate);
    } catch {
      return false;
    }
  }) ?? "";
}

function messageFor(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access was denied. Allow access in your browser settings, or upload a video instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Please upload a video instead.";
    case "NotReadableError":
      return "The camera is already in use by another application. Close it and try again, or upload a video instead.";
    default:
      return "We couldn't start the camera. Please upload a video instead.";
  }
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

export function OathRecorderPanel({
  maxDurationSeconds,
  onRecorded,
  onCancel,
  onError,
}: {
  maxDurationSeconds: number;
  /** Called once with the finished clip and the exact seconds recorded. */
  onRecorded: (file: File, durationSeconds: number) => void;
  /** User backed out before finishing; the camera has already been released. */
  onCancel: () => void;
  /** A failure occurred; the camera (if it was ever acquired) has been released. */
  onError: (message: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startedAtRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);

  const [status, setStatus] = React.useState<Status>("requesting");
  const [elapsed, setElapsed] = React.useState(0);

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finish = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }, []);

  // Acquire the camera as soon as the panel opens.
  React.useEffect(() => {
    let cancelled = false;

    if (!isRecordingSupported()) {
      onError("Recording isn't supported in this browser. Please upload a video instead.");
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("live");
      })
      .catch((error) => {
        if (cancelled) return;
        onError(messageFor(error));
      });

    return () => {
      cancelled = true;
      clearTimer();
      stopStream();
    };
    // Intentionally run once per mount — the panel is remounted (via `key` at the call
    // site) whenever it needs a fresh camera session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stopStream();
      onError("We couldn't start recording in this browser. Please upload a video instead.");
      return;
    }
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearTimer();
      const type = (mimeType || recorder.mimeType || "video/webm").split(";")[0];
      const ext = type === "video/mp4" ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      stopStream();
      onRecorded(new File([blob], `oath-recording.${ext}`, { type }), durationSeconds);
    };
    recorder.onerror = () => {
      clearTimer();
      stopStream();
      onError("Recording stopped unexpectedly. Please try again, or upload a video instead.");
    };

    recorderRef.current = recorder;
    try {
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start();
    } catch {
      stopStream();
      onError("We couldn't start recording in this browser. Please upload a video instead.");
      return;
    }
    setStatus("recording");

    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) finish();
        return next;
      });
    }, 1000);
  };

  const cancel = () => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stopStream();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-48 w-full max-w-sm rounded-lg bg-surface-sunken object-cover"
      />

      {status === "requesting" ? (
        <p className="text-body-compact text-muted-foreground">Requesting camera access…</p>
      ) : null}

      {status === "recording" ? (
        <div aria-live="polite" className="inline-flex w-fit items-center gap-1.5 text-body-compact text-destructive">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="tabular-nums">
            {formatDuration(elapsed)} / {formatDuration(maxDurationSeconds)}
          </span>
        </div>
      ) : null}

      <div className="flex gap-2">
        {status === "live" ? (
          <Button type="button" onClick={startRecording}>
            <CircleIcon data-icon="inline-start" aria-hidden />
            Start recording
          </Button>
        ) : null}
        {status === "recording" ? (
          <Button type="button" variant="destructive-solid" onClick={finish}>
            <SquareIcon data-icon="inline-start" aria-hidden />
            Stop recording
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
