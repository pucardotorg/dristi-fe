"use client";

import * as React from "react";
import NextImage from "next/image";
import {
  FileTextIcon,
  Maximize2Icon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentSlot } from "@/components/ui/document-slot";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pick, type Locale } from "@/lib/onboarding/content";
import { idUpload } from "@/lib/join/content";

/**
 * Add-your-ID is a profile task, not part of registration. The local clarity check
 * prevents an unreadable file from being submitted; submission itself is final and
 * does not start a registry verification workflow.
 */

type IdType = keyof typeof idUpload.idTypes;
export type SubmittedId = { idType: IdType; file: File };
type UploadStatus = "empty" | "processing" | "filled";
type ScanQuality = "good" | "poor" | null;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddIdForm({
  locale,
  onSubmitted,
  onCancel,
  formId,
  hideActions = false,
  onDirtyChange,
}: {
  locale: Locale;
  onSubmitted: (submission: SubmittedId) => void;
  onCancel: () => void;
  /** Lets a dialog footer submit the form (Settings). */
  formId?: string;
  /** The host renders its own Cancel and Submit. */
  hideActions?: boolean;
  /** Tells the host something has been chosen, for its discard guard. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [idType, setIdType] = React.useState<IdType | "">("");
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<UploadStatus>("empty");
  const [quality, setQuality] = React.useState<ScanQuality>(null);
  const [fileError, setFileError] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const previewUrlRef = React.useRef("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const dirty = idType !== "" || file !== null;
  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  React.useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );
  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const valid =
      ALLOWED_FILE_TYPES.has(nextFile.type) && nextFile.size <= MAX_FILE_SIZE;
    if (!valid) {
      setFile(null);
      setStatus("empty");
      setQuality(null);
      setFileError(true);
      return;
    }
    setFileError(false);
    setTouched(false);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(nextFile);
    setPreviewUrl(previewUrlRef.current);
    setFile(nextFile);
    setStatus("processing");
    setQuality(null);

    // Same scan check as registration: PDFs pass, images must be sharp enough to read.
    if (nextFile.type === "application/pdf") {
      window.setTimeout(() => {
        setQuality("good");
        setStatus("filled");
      }, 700);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const clearEnough = Math.min(image.naturalWidth, image.naturalHeight) >= 600;
      window.setTimeout(() => {
        setQuality(clearEnough ? "good" : "poor");
        setStatus("filled");
      }, 700);
    };
    image.onerror = () => {
      setQuality("poor");
      setStatus("filled");
    };
    image.src = previewUrlRef.current;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!idType || !file || status !== "filled" || quality !== "good") return;
    onSubmitted({ idType, file });
  }

  return (
    <>
      <form
        id={formId}
        lang={locale}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={submit}
      >
              <Field data-invalid={touched && !idType}>
                <FieldLabel className="text-foreground">
                  {pick(idUpload.typeLabel, locale)}
                </FieldLabel>
                <Select
                  value={idType}
                  onValueChange={(value) => {
                    setIdType(value as IdType);
                    setTouched(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={pick(idUpload.typePlaceholder, locale)} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(idUpload.idTypes) as IdType[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {pick(idUpload.idTypes[value], locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                data-invalid={
                  fileError || (touched && (!file || quality !== "good"))
                }
              >
                <FieldLabel className="text-foreground">
                  {pick(idUpload.uploadLabel, locale)}
                </FieldLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                  disabled={!idType}
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
                <DocumentSlot
                  disabled={!idType}
                  status={
                    status === "processing"
                      ? "processing"
                      : status === "filled" && quality === "poor"
                        ? "filled-poor"
                        : status === "filled"
                          ? "filled"
                          : "empty"
                  }
                  media={previewUrl ? "thumbnail" : "icon"}
                  label={pick(idUpload.uploadLabel, locale)}
                  required
                  filename={file?.name}
                  meta={
                    status === "processing"
                      ? pick(idUpload.processing, locale)
                      : file
                        ? fileSize(file.size)
                        : undefined
                  }
                  quality={status === "filled" ? (quality ?? undefined) : undefined}
                  thumbnail={
                    previewUrl ? (
                      <button
                        type="button"
                        className="group relative flex size-full items-center justify-center bg-cover bg-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={file?.type.startsWith("image/") ? { backgroundImage: `url(${JSON.stringify(previewUrl)})` } : undefined}
                        aria-label={pick(idUpload.expandPreview, locale)}
                        onClick={() => setPreviewOpen(true)}
                      >
                        {file?.type === "application/pdf" ? <FileTextIcon className="size-5 text-muted-foreground" aria-hidden /> : null}
                        <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/15" />
                        <Maximize2Icon className="absolute inset-0 m-auto size-4 text-background opacity-0 drop-shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                      </button>
                    ) : (
                      <FileTextIcon className="size-5" aria-hidden />
                    )
                  }
                  onChooseFile={idType ? () => fileInputRef.current?.click() : undefined}
                  copy={{
                    optional: locale === "ml" ? "നിർബന്ധമല്ല" : "Optional",
                    noFile:
                      locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല" : "No file chosen yet",
                    goodScan: pick(idUpload.goodScan, locale),
                    poorScan: pick(idUpload.poorScan, locale),
                    chooseFile: pick(idUpload.choose, locale),
                  }}
                />
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  {touched && (!idType || !file) ? null : (
                    <FieldDescription className="min-w-0 flex-1">
                      {!idType
                        ? pick(idUpload.chooseTypeFirst, locale)
                        : quality === "poor"
                          ? pick(idUpload.poorScanHelp, locale)
                          : pick(idUpload.fileHelp, locale)}
                    </FieldDescription>
                  )}
                  {file ? (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto shrink-0 p-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {pick(idUpload.change, locale)}
                    </Button>
                  ) : null}
                </div>
                <FieldError>
                  {fileError
                    ? pick(idUpload.badFile, locale)
                    : touched && (!idType || !file)
                      ? pick(idUpload.missing, locale)
                      : touched && quality === "poor"
                        ? pick(idUpload.poorScanHelp, locale)
                        : null}
                </FieldError>
              </Field>
        {hideActions ? null : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{pick(idUpload.submit, locale)}</Button>
          </div>
        )}
      </form>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <ChromeDialogContent
          lang={locale}
          className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none sm:max-w-none"
        >
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{pick(idUpload.previewTitle, locale)}</DialogTitle>
            <DialogDescription>
              {pick(idUpload.previewDescription, locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface-sunken p-4">
            {previewUrl && file?.type === "application/pdf" ? (
              <iframe src={previewUrl} title={pick(idUpload.previewAlt, locale)} className="h-full w-full rounded-md bg-surface" />
            ) : previewUrl ? (
              <NextImage
                src={previewUrl}
                alt={pick(idUpload.previewAlt, locale)}
                width={1200}
                height={1600}
                unoptimized
                className="mx-auto h-full w-auto max-w-full rounded-md object-contain"
              />
            ) : null}
          </div>
        </ChromeDialogContent>
      </Dialog>
    </>
  );
}

export function SubmittedIdSummary({ submission, locale }: { submission: SubmittedId; locale: Locale }) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl] = React.useState(() => URL.createObjectURL(submission.file));

  React.useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <>
      <div className="flex items-center gap-4 rounded-lg bg-muted p-4 text-body-compact">
        <button
          type="button"
          className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface bg-cover bg-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={submission.file.type.startsWith("image/") ? { backgroundImage: `url(${JSON.stringify(previewUrl)})` } : undefined}
          aria-label={pick(idUpload.expandPreview, locale)}
          onClick={() => setPreviewOpen(true)}
        >
          {submission.file.type === "application/pdf" ? <FileTextIcon className="size-6 text-muted-foreground" aria-hidden /> : null}
          <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/15" />
          <Maximize2Icon className="absolute inset-0 m-auto size-4 text-background opacity-0 drop-shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
        </button>
        <div className="min-w-0">
          <p className="truncate font-medium">{submission.file.name}</p>
          <p className="text-muted-foreground">{pick(idUpload.idTypes[submission.idType], locale)} · {fileSize(submission.file.size)}</p>
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setPreviewOpen(true)}>View ID</Button>
        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <ChromeDialogContent lang={locale} className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none sm:max-w-none">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{pick(idUpload.previewTitle, locale)}</DialogTitle>
            <DialogDescription>{pick(idUpload.previewDescription, locale)}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface-sunken p-4">
            {submission.file.type === "application/pdf" ? (
              <iframe src={previewUrl} title={pick(idUpload.previewAlt, locale)} className="h-full w-full rounded-md bg-surface" />
            ) : (
              <NextImage src={previewUrl} alt={pick(idUpload.previewAlt, locale)} width={1200} height={1600} unoptimized className="mx-auto h-full w-auto max-w-full rounded-md object-contain" />
            )}
          </div>
        </ChromeDialogContent>
      </Dialog>
    </>
  );
}
