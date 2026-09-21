"use client";

import * as React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DownloadIcon,
  Maximize2Icon,
  PenLineIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import {
  ChromeAlertDialogContent,
  ChromeDialogContent,
} from "@/components/chrome/app-chrome";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { useBackCloses, useFlowWindow } from "@/components/chrome/flow-window";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
  DescriptionDetails,
} from "@/components/ui/description-list";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_RICH_TEXT,
  RichTextField,
  RichTextValueView,
  type RichTextValue,
} from "@/components/cases/rich-text-field";
import {
  DocumentPreviewDialog,
  DocumentThumbnailButton,
  useObjectUrl,
} from "@/components/document-preview";
import { pick, type Locale } from "@/lib/onboarding/content";
import { joinDialog } from "@/lib/join/content";
import type { AccessCase } from "@/lib/access/content";
import {
  APPLICATION_TYPES,
  BAIL_FEE,
  BAIL_PETITIONERS,
  BAIL_SUBMISSION_DATE,
  BAIL_SUBMISSION_ID,
  bailDialog,
  fillCopy,
} from "@/lib/filing/content";
import { ADVOCATE_PROFILE_NAME } from "@/lib/advocate/content";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * Raise an application → bail. Staged dialog, same shell as the join flows:
 * details → sureties → (generate) review → signature → court fee → submitted.
 *
 * The legacy "Make a Submission" page is the reference for structure and copy
 * scope; the surface and sequencing follow this app's staged-dialog pattern.
 * The unpaid court fee never blocks the submission; it lands in pending
 * tasks, the same decision the join flow made for the vakalatnama fee.
 */

type Stage = "details" | "sureties" | "review" | "sign" | "payment" | "done";
type YesNo = "yes" | "no";

export type BailApplicationResult = {
  caseNumber: string;
  submissionId: string;
  paid: boolean;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload slot with the app's standard uploaded-document affordances (the Add-ID
 * pattern): thumbnail that opens the large preview, plus change and remove
 * links. Local copy of the join dialogs' helper. The copy it speaks is this
 * flow's own. Exported for the bail bond dialog, which shares the pattern.
 */
export function UploadedDocField({
  label,
  required = false,
  file,
  onFileChange,
  locale,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  locale: Locale;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const url = useObjectUrl(file);
  const previewCopy = {
    title: pick(bailDialog.docPreviewTitle, locale),
    description: pick(bailDialog.docPreviewBody, locale),
    alt: pick(bailDialog.docPreviewAlt, locale),
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next && next.size <= MAX_FILE_SIZE) onFileChange(next);
          // The same file can be picked again after a remove.
          event.target.value = "";
        }}
      />
      <DocumentSlot
        status={file ? "filled" : "empty"}
        media={file ? "thumbnail" : "icon"}
        label={label}
        required={required}
        filename={file?.name}
        meta={file ? fileSize(file.size) : undefined}
        thumbnail={
          file ? (
            <DocumentThumbnailButton
              file={file}
              url={url}
              locale={locale}
              onOpen={() => setPreviewOpen(true)}
              className="size-full rounded-md"
            />
          ) : undefined
        }
        onChooseFile={() => inputRef.current?.click()}
        // C3 (see Integration feedback log): filled-state Change/Remove buttons
        // need an `actions` slot on the DS document-slot, which does not exist yet.
        // Pending a DS change (Mohit to raise). Using the standard box for now —
        // buttons temporarily omitted rather than hand-editing the DS primitive.
        copy={{
          optional: pick(bailDialog.optional, locale),
          noFile: locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല" : "No file chosen yet",
          chooseFile: locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുക്കുക" : "Choose file",
        }}
      />
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={file}
        url={url}
        locale={locale}
        copy={previewCopy}
      />
    </>
  );
}

type SuretyDraft = {
  id: number;
  name: string;
  father: string;
  phone: string;
  email: string;
  address1: string;
  city: string;
  pincode: string;
  district: string;
  state: string;
  idProof: File | null;
  solvency: File | null;
  other: File | null;
};

let suretySeq = 0;
function blankSurety(): SuretyDraft {
  suretySeq += 1;
  return {
    id: suretySeq,
    name: "",
    father: "",
    phone: "",
    email: "",
    address1: "",
    city: "",
    pincode: "",
    district: "",
    state: "",
    idProof: null,
    solvency: null,
    other: null,
  };
}

function suretyComplete(surety: SuretyDraft) {
  return (
    surety.name.trim() !== "" &&
    surety.father.trim() !== "" &&
    surety.phone.length === 10 &&
    surety.address1.trim() !== "" &&
    surety.city.trim() !== "" &&
    surety.pincode.length === 6 &&
    surety.district.trim() !== "" &&
    surety.state.trim() !== "" &&
    surety.idProof !== null &&
    surety.solvency !== null
  );
}

/**
 * The generated application is structured content rather than an uploaded
 * file, so it cannot use DocumentPreviewDialog. This composition keeps the
 * inline and full-screen representations identical while continuing to use
 * the shared Dialog and Button primitives.
 */
function ApplicationDraft({
  accessCase,
  grounds,
  locale,
  expanded = false,
  onExpand,
}: {
  accessCase: AccessCase;
  /** Rich text, so the generated draft keeps the filer's emphasis and lists. */
  grounds: RichTextValue;
  locale: Locale;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg bg-surface-sunken",
        expanded ? "min-h-0 flex-1 overflow-y-auto p-6" : "p-3",
      )}
    >
      {onExpand ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-4 right-4 z-10 bg-surface"
          aria-label={pick(bailDialog.reviewTitle, locale)}
          onClick={onExpand}
        >
          <Maximize2Icon aria-hidden />
        </Button>
      ) : null}
      <article
        className={cn(
          "mx-auto flex flex-col gap-4 rounded-md bg-surface px-5 py-6",
          expanded && "min-h-full max-w-3xl px-8 py-10",
          onExpand && "pr-14",
        )}
      >
        <p className="text-caption text-muted-foreground">
          {pick(bailDialog.draftPageLabel, locale)}
        </p>
        <p className="text-center text-body-compact font-semibold text-balance">
          {pick(bailDialog.draftCourtLine, locale)}
        </p>
        <p className="text-center text-body-compact font-medium tabular-nums">
          {fillCopy(bailDialog.draftCaseLine, locale, {
            caseNumber: accessCase.caseNumber,
          })}
        </p>
        <p className="text-center text-body-compact text-pretty">
          {fillCopy(bailDialog.draftMatterLine, locale, { title: accessCase.title })}
        </p>
        <RichTextValueView
          value={grounds}
          className="text-body-compact text-pretty text-muted-foreground"
        />
      </article>
    </div>
  );
}

export function BailApplicationDialog({
  open,
  onOpenChange,
  accessCase,
  locale,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The case file the flow started from. */
  accessCase: AccessCase;
  locale: Locale;
  onSubmitted?: (result: BailApplicationResult) => void;
}) {
  const [stage, setStage] = React.useState<Stage>("details");

  const [petitionerId, setPetitionerId] = React.useState("");
  const [father, setFather] = React.useState("");
  // The father's name arrives machine-prefilled from the case record when a
  // petitioner is picked; editing clears the prefilled (amber) state.
  const [fatherPrefilled, setFatherPrefilled] = React.useState(false);
  // Formatted, like the reason fields of every other application type; the
  // plain text alongside it is what "is it filled in" is asked of.
  const [groundsRich, setGroundsRich] = React.useState<RichTextValue>(EMPTY_RICH_TEXT);
  const grounds = groundsRich.text;
  const [comments, setComments] = React.useState("");
  const [detailsTouched, setDetailsTouched] = React.useState(false);

  // The magistrate usually asks for two sureties, so the yes-branch starts
  // with two forms; both can be removed down to one, or more added.
  const [suretyChoice, setSuretyChoice] = React.useState<YesNo>("yes");
  const [sureties, setSureties] = React.useState<SuretyDraft[]>(() => [
    blankSurety(),
    blankSurety(),
  ]);
  const [suretiesTouched, setSuretiesTouched] = React.useState(false);

  const [generating, setGenerating] = React.useState(false);
  const generateTimerRef = React.useRef<number | null>(null);
  const [reviewFullscreen, setReviewFullscreen] = React.useState(false);

  const [signTab, setSignTab] = React.useState<"esign" | "upload">("esign");
  const [signedFile, setSignedFile] = React.useState<File | null>(null);
  const [esigned, setEsigned] = React.useState(false);
  const [signTouched, setSignTouched] = React.useState(false);
  const [downloadNotice, setDownloadNotice] = React.useState(false);

  const [paid, setPaid] = React.useState(false);
  const [doneDownloadNotice, setDoneDownloadNotice] = React.useState(false);

  const petitioner = BAIL_PETITIONERS.find((entry) => entry.id === petitionerId);
  const signed = esigned || signedFile !== null;
  const activeSureties = suretyChoice === "yes" ? sureties : [];

  React.useEffect(
    () => () => {
      if (generateTimerRef.current !== null) window.clearTimeout(generateTimerRef.current);
    },
    [],
  );

  function reset() {
    setStage("details");
    setPetitionerId("");
    setFather("");
    setFatherPrefilled(false);
    setGroundsRich(EMPTY_RICH_TEXT);
    setComments("");
    setDetailsTouched(false);
    setSuretyChoice("yes");
    setSureties([blankSurety(), blankSurety()]);
    setSuretiesTouched(false);
    setGenerating(false);
    setReviewFullscreen(false);
    if (generateTimerRef.current !== null) window.clearTimeout(generateTimerRef.current);
    generateTimerRef.current = null;
    setSignTab("esign");
    setSignedFile(null);
    setEsigned(false);
    setSignTouched(false);
    setDownloadNotice(false);
    setPaid(false);
    setDoneDownloadNotice(false);
  }

  /*
    Closing midway asks first, as every other filing dialog does, and on the
    same terms: only when something has been entered, and never once the
    application is filed, since by then there is nothing left to lose.
  */
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const entered =
    stage !== "done" &&
    (stage !== "details" ||
      petitionerId !== "" ||
      grounds.trim() !== "" ||
      comments.trim() !== "" ||
      (father.trim() !== "" && !fatherPrefilled));

  function closeNow() {
    setDiscardOpen(false);
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (entered) setDiscardOpen(true);
    else closeNow();
  }

  /* On a phone this is a window that slid in, and the phone's own Back works
     the way the footer does: Cancel on the first step (so the discard warning
     still guards typed work), the previous step after that. A filed
     application has nothing to go back to, so Back closes it. */
  const { phone } = useFlowWindow();
  useBackCloses(phone && open, () => {
    if (discardOpen) setDiscardOpen(false);
    else if (reviewFullscreen) setReviewFullscreen(false);
    else if (stage === "sureties") setStage("details");
    else if (stage === "review") setStage("sureties");
    else if (stage === "sign") setStage("review");
    else if (stage === "payment") setStage("sign");
    else handleOpenChange(false);
  });

  function choosePetitioner(id: string) {
    setPetitionerId(id);
    const entry = BAIL_PETITIONERS.find((option) => option.id === id);
    // Prefill only when the advocate has not already typed something.
    if (entry && (father.trim() === "" || fatherPrefilled)) {
      setFather(entry.father);
      setFatherPrefilled(true);
    }
    setDetailsTouched(false);
  }

  function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDetailsTouched(true);
    if (!petitionerId || !father.trim() || !grounds.trim()) return;
    setDetailsTouched(false);
    setStage("sureties");
  }

  function updateSurety(id: number, patch: Partial<SuretyDraft>) {
    setSureties((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
    setSuretiesTouched(false);
  }

  function startGenerate() {
    setGenerating(true);
    setStage("review");
    generateTimerRef.current = window.setTimeout(() => setGenerating(false), 1400);
  }

  function submitSureties(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuretiesTouched(true);
    if (suretyChoice === "yes" && !sureties.every(suretyComplete)) return;
    setSuretiesTouched(false);
    startGenerate();
  }

  function submitSign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignTouched(true);
    if (!signed) return;
    setSignTouched(false);
    setStage("payment");
  }

  function finish(didPay: boolean) {
    setPaid(didPay);
    setStage("done");
    onSubmitted?.({
      caseNumber: accessCase.caseNumber,
      submissionId: BAIL_SUBMISSION_ID,
      paid: didPay,
    });
  }

  const headerCopy: { title: string; body: string } =
    stage === "details"
      ? { title: pick(bailDialog.title, locale), body: pick(bailDialog.detailsBody, locale) }
      : stage === "sureties"
        ? { title: pick(bailDialog.suretiesTitle, locale), body: pick(bailDialog.suretiesBody, locale) }
        : stage === "review"
          ? { title: pick(bailDialog.reviewTitle, locale), body: pick(bailDialog.reviewBody, locale) }
          : stage === "sign"
            ? { title: pick(bailDialog.signTitle, locale), body: pick(bailDialog.signBody, locale) }
            : { title: pick(bailDialog.payTitle, locale), body: pick(bailDialog.payBody, locale) };

  // Each stage arrives scrolled to its top; without this the container keeps
  // the previous stage's scroll offset and the new stage opens mid-form.
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [stage]);

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FlowDialogContent
        ownBack
        lang={locale}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        {stage === "done" ? (
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-5 pr-14 text-left">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground">
                <CheckCircle2Icon className="size-7" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="text-title-s font-semibold text-balance">
                  {pick(bailDialog.doneTitle, locale)}
                </DialogTitle>
                <DialogDescription className="text-pretty">
                  {pick(bailDialog.doneBody, locale)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        ) : (
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-title-s font-semibold text-balance">
              {headerCopy.title}
            </DialogTitle>
            <DialogDescription className="text-pretty">{headerCopy.body}</DialogDescription>
            {/* The case this filing belongs to is constant across stages. */}
            <p className="text-caption text-muted-foreground">
              <Identifier value={accessCase.caseNumber} label="case number" />
              <span aria-hidden> · </span>
              {accessCase.title}
            </p>
          </DialogHeader>
        )}

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* -------------------------------------------- application details */}
          {stage === "details" ? (
            <form id="bail-details" noValidate className="flex flex-col gap-6" onSubmit={submitDetails}>
                <>
                  <Field data-invalid={detailsTouched && !petitionerId}>
                    <FieldLabel>{pick(bailDialog.petitionerLabel, locale)}</FieldLabel>
                    <Select value={petitionerId} onValueChange={choosePetitioner}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={pick(bailDialog.petitionerPlaceholder, locale)} />
                      </SelectTrigger>
                      <SelectContent>
                        {BAIL_PETITIONERS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>
                      {detailsTouched && !petitionerId
                        ? pick(bailDialog.petitionerError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field data-invalid={detailsTouched && !father.trim()}>
                    <FieldLabel htmlFor="bail-father">
                      {pick(bailDialog.fatherLabel, locale)}
                    </FieldLabel>
                    <Input
                      id="bail-father"
                      value={father}
                      prefilled={fatherPrefilled}
                      onChange={(event) => {
                        setFather(event.target.value);
                        setFatherPrefilled(false);
                        setDetailsTouched(false);
                      }}
                    />
                    <FieldError>
                      {detailsTouched && !father.trim()
                        ? pick(bailDialog.fatherError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field data-invalid={detailsTouched && !grounds.trim()}>
                    {/* A contentEditable region is not labelable, so the
                        label is tied to it by id. */}
                    <FieldLabel id="bail-grounds-label">
                      {pick(bailDialog.groundsLabel, locale)}
                    </FieldLabel>
                    <RichTextField
                      labelId="bail-grounds-label"
                      value={groundsRich}
                      compact
                      onChange={(value) => {
                        setGroundsRich(value);
                        setDetailsTouched(false);
                      }}
                    />
                    <FieldDescription>{pick(bailDialog.groundsHint, locale)}</FieldDescription>
                    <FieldError>
                      {detailsTouched && !grounds.trim()
                        ? pick(bailDialog.groundsError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="bail-comments">
                      {pick(bailDialog.commentsLabel, locale)}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({pick(bailDialog.optional, locale)})
                      </span>
                    </FieldLabel>
                    <Textarea
                      id="bail-comments"
                      value={comments}
                      rows={3}
                      onChange={(event) => setComments(event.target.value)}
                    />
                  </Field>
                </>
            </form>
          ) : null}

          {/* ----------------------------------------------------- sureties */}
          {stage === "sureties" ? (
            <form id="bail-sureties" noValidate className="flex flex-col gap-6" onSubmit={submitSureties}>
              <Field>
                <FieldLabel className="block w-full text-body font-semibold leading-snug">
                  {pick(bailDialog.suretyQuestion, locale)}
                </FieldLabel>
                <RadioGroup
                  value={suretyChoice}
                  onValueChange={(value) => {
                    setSuretyChoice(value as YesNo);
                    setSuretiesTouched(false);
                  }}
                  className="flex flex-col gap-1"
                >
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="yes" id="bail-surety-yes" />
                    <Label htmlFor="bail-surety-yes">{pick(bailDialog.yes, locale)}</Label>
                  </div>
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="no" id="bail-surety-no" />
                    <Label htmlFor="bail-surety-no">{pick(bailDialog.no, locale)}</Label>
                  </div>
                </RadioGroup>
              </Field>

              {suretyChoice === "yes" ? (
                <>
                  {/* One consolidated note instead of legacy's per-field warning:
                      what the contact details are for, and the caution. */}
                  <Banner variant="info">{pick(bailDialog.contactNote, locale)}</Banner>

                  {sureties.map((surety, index) => {
                    const n = String(index + 1);
                    const showInvalid = suretiesTouched;
                    return (
                      /* A sunken well per surety, not a bordered card-in-card.
                         depth is fill, and each well groups one person's fields.
                         min-w-0 overrides the fieldset default min-inline-size:
                         min-content, which otherwise blocks phone-width shrink. */
                      <fieldset
                        key={surety.id}
                        className="flex min-w-0 flex-col gap-5 rounded-lg bg-surface-sunken p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <legend className="float-left text-body font-semibold">
                            {fillCopy(bailDialog.suretyTitle, locale, { n })}
                          </legend>
                          {sureties.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive-ink hover:text-destructive-ink"
                              aria-label={fillCopy(bailDialog.removeSurety, locale, { n })}
                              onClick={() =>
                                setSureties((current) =>
                                  current.filter((entry) => entry.id !== surety.id),
                                )
                              }
                            >
                              <Trash2Icon aria-hidden />
                            </Button>
                          ) : null}
                        </div>

                        <Field data-invalid={showInvalid && !surety.name.trim()}>
                          <FieldLabel htmlFor={`surety-${surety.id}-name`}>
                            {pick(bailDialog.fullNameLabel, locale)}
                          </FieldLabel>
                          <Input
                            id={`surety-${surety.id}-name`}
                            value={surety.name}
                            onChange={(event) => updateSurety(surety.id, { name: event.target.value })}
                          />
                          <FieldError>
                            {showInvalid && !surety.name.trim()
                              ? pick(bailDialog.requiredError, locale)
                              : null}
                          </FieldError>
                        </Field>

                        <Field data-invalid={showInvalid && !surety.father.trim()}>
                          <FieldLabel htmlFor={`surety-${surety.id}-father`}>
                            {pick(bailDialog.suretyFatherLabel, locale)}
                          </FieldLabel>
                          <Input
                            id={`surety-${surety.id}-father`}
                            value={surety.father}
                            onChange={(event) => updateSurety(surety.id, { father: event.target.value })}
                          />
                          <FieldError>
                            {showInvalid && !surety.father.trim()
                              ? pick(bailDialog.requiredError, locale)
                              : null}
                          </FieldError>
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field data-invalid={showInvalid && surety.phone.length !== 10}>
                            <FieldLabel htmlFor={`surety-${surety.id}-phone`}>
                              {pick(bailDialog.phoneLabel, locale)}
                            </FieldLabel>
                            <Input
                              id={`surety-${surety.id}-phone`}
                              type="tel"
                              inputMode="numeric"
                              autoComplete="off"
                              value={surety.phone}
                              onChange={(event) =>
                                updateSurety(surety.id, {
                                  phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                                })
                              }
                            />
                            <FieldError>
                              {showInvalid && surety.phone.length !== 10
                                ? pick(bailDialog.phoneError, locale)
                                : null}
                            </FieldError>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`surety-${surety.id}-email`}>
                              {pick(bailDialog.emailLabel, locale)}{" "}
                              <span className="font-normal text-muted-foreground">
                                ({pick(bailDialog.optional, locale)})
                              </span>
                            </FieldLabel>
                            <Input
                              id={`surety-${surety.id}-email`}
                              type="email"
                              autoComplete="off"
                              value={surety.email}
                              onChange={(event) => updateSurety(surety.id, { email: event.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="flex flex-col gap-5">
                          <p className="text-caption font-semibold text-muted-foreground">
                            {pick(bailDialog.addressHeading, locale)}
                          </p>

                          <Field data-invalid={showInvalid && !surety.address1.trim()}>
                            <FieldLabel htmlFor={`surety-${surety.id}-address1`}>
                              {pick(bailDialog.address1Label, locale)}
                            </FieldLabel>
                            <Input
                              id={`surety-${surety.id}-address1`}
                              value={surety.address1}
                              onChange={(event) =>
                                updateSurety(surety.id, { address1: event.target.value })
                              }
                            />
                            <FieldError>
                              {showInvalid && !surety.address1.trim()
                                ? pick(bailDialog.requiredError, locale)
                                : null}
                            </FieldError>
                          </Field>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={showInvalid && !surety.city.trim()}>
                              <FieldLabel htmlFor={`surety-${surety.id}-city`}>
                                {pick(bailDialog.cityLabel, locale)}
                              </FieldLabel>
                              <Input
                                id={`surety-${surety.id}-city`}
                                value={surety.city}
                                onChange={(event) => updateSurety(surety.id, { city: event.target.value })}
                              />
                              <FieldError>
                                {showInvalid && !surety.city.trim()
                                  ? pick(bailDialog.requiredError, locale)
                                  : null}
                              </FieldError>
                            </Field>

                            <Field data-invalid={showInvalid && surety.pincode.length !== 6}>
                              <FieldLabel htmlFor={`surety-${surety.id}-pincode`}>
                                {pick(bailDialog.pincodeLabel, locale)}
                              </FieldLabel>
                              <Input
                                id={`surety-${surety.id}-pincode`}
                                inputMode="numeric"
                                value={surety.pincode}
                                onChange={(event) =>
                                  updateSurety(surety.id, {
                                    pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                                  })
                                }
                              />
                              <FieldError>
                                {showInvalid && surety.pincode.length !== 6
                                  ? pick(bailDialog.pincodeError, locale)
                                  : null}
                              </FieldError>
                            </Field>
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={showInvalid && !surety.district.trim()}>
                              <FieldLabel htmlFor={`surety-${surety.id}-district`}>
                                {pick(bailDialog.districtLabel, locale)}
                              </FieldLabel>
                              <Input
                                id={`surety-${surety.id}-district`}
                                value={surety.district}
                                onChange={(event) =>
                                  updateSurety(surety.id, { district: event.target.value })
                                }
                              />
                              <FieldError>
                                {showInvalid && !surety.district.trim()
                                  ? pick(bailDialog.requiredError, locale)
                                  : null}
                              </FieldError>
                            </Field>

                            <Field data-invalid={showInvalid && !surety.state.trim()}>
                              <FieldLabel htmlFor={`surety-${surety.id}-state`}>
                                {pick(bailDialog.stateLabel, locale)}
                              </FieldLabel>
                              <Input
                                id={`surety-${surety.id}-state`}
                                value={surety.state}
                                onChange={(event) => updateSurety(surety.id, { state: event.target.value })}
                              />
                              <FieldError>
                                {showInvalid && !surety.state.trim()
                                  ? pick(bailDialog.requiredError, locale)
                                  : null}
                              </FieldError>
                            </Field>
                          </div>
                        </div>

                        <Field data-invalid={showInvalid && !surety.idProof}>
                          <div className="flex flex-col gap-2">
                            <UploadedDocField
                              label={pick(bailDialog.idProofLabel, locale)}
                              required
                              file={surety.idProof}
                              onFileChange={(file) => updateSurety(surety.id, { idProof: file })}
                              locale={locale}
                            />
                            {!surety.idProof ? (
                              <FieldDescription>{pick(bailDialog.docHelp, locale)}</FieldDescription>
                            ) : null}
                          </div>
                          <FieldError>
                            {showInvalid && !surety.idProof
                              ? pick(bailDialog.idProofError, locale)
                              : null}
                          </FieldError>
                        </Field>

                        <Field data-invalid={showInvalid && !surety.solvency}>
                          <div className="flex flex-col gap-2">
                            <UploadedDocField
                              label={pick(bailDialog.solvencyLabel, locale)}
                              required
                              file={surety.solvency}
                              onFileChange={(file) => updateSurety(surety.id, { solvency: file })}
                              locale={locale}
                            />
                            {!surety.solvency ? (
                              <FieldDescription>{pick(bailDialog.solvencyHint, locale)}</FieldDescription>
                            ) : null}
                          </div>
                          <FieldError>
                            {showInvalid && !surety.solvency
                              ? pick(bailDialog.solvencyError, locale)
                              : null}
                          </FieldError>
                        </Field>

                        <Field>
                          <UploadedDocField
                            label={pick(bailDialog.otherDocsLabel, locale)}
                            file={surety.other}
                            onFileChange={(file) => updateSurety(surety.id, { other: file })}
                            locale={locale}
                          />
                        </Field>
                      </fieldset>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    data-icon="inline-start"
                    onClick={() => setSureties((current) => [...current, blankSurety()])}
                  >
                    <PlusIcon aria-hidden />
                    {pick(bailDialog.addSurety, locale)}
                  </Button>
                </>
              ) : null}
            </form>
          ) : null}

          {/* ------------------------------------------------------- review */}
          {stage === "review" ? (
            generating ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
                <Spinner className="size-6 text-primary" />
                <p className="text-body-compact font-medium">
                  {pick(bailDialog.generating, locale)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <DescriptionList>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>{pick(bailDialog.summaryType, locale)}</DescriptionTerm>
                    <DescriptionDetails>
                      {pick(APPLICATION_TYPES.find((entry) => entry.id === "bail")!.label, locale)}
                    </DescriptionDetails>
                  </DescriptionRow>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>{pick(bailDialog.summaryDate, locale)}</DescriptionTerm>
                    <DescriptionDetails className="tabular-nums">
                      {BAIL_SUBMISSION_DATE}
                    </DescriptionDetails>
                  </DescriptionRow>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>{pick(bailDialog.summaryPetitioner, locale)}</DescriptionTerm>
                    <DescriptionDetails>{petitioner?.name}</DescriptionDetails>
                  </DescriptionRow>
                  <DescriptionRow className="border-hairline">
                    <DescriptionTerm>{pick(bailDialog.summarySureties, locale)}</DescriptionTerm>
                    <DescriptionDetails>
                      {activeSureties.length
                        ? fillCopy(bailDialog.suretiesCount, locale, {
                            count: String(activeSureties.length),
                          })
                        : pick(bailDialog.suretiesNone, locale)}
                    </DescriptionDetails>
                  </DescriptionRow>
                </DescriptionList>

                <ApplicationDraft
                  accessCase={accessCase}
                  grounds={groundsRich}
                  locale={locale}
                  onExpand={() => setReviewFullscreen(true)}
                />

                <Dialog open={reviewFullscreen} onOpenChange={setReviewFullscreen}>
                  <ChromeDialogContent
                    lang={locale}
                    className="inset-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none"
                    onInteractOutside={(event) => event.preventDefault()}
                  >
                    <DialogHeader className="shrink-0 border-b border-hairline px-6 py-5 pr-14 text-left">
                      <DialogTitle className="text-title-s font-semibold text-balance">
                        {pick(bailDialog.reviewTitle, locale)}
                      </DialogTitle>
                      <DialogDescription className="text-pretty">
                        {pick(bailDialog.reviewBody, locale)}
                      </DialogDescription>
                    </DialogHeader>
                    <ApplicationDraft
                      accessCase={accessCase}
                      grounds={groundsRich}
                      locale={locale}
                      expanded
                    />
                  </ChromeDialogContent>
                </Dialog>
              </div>
            )
          ) : null}

          {/* ---------------------------------------------------- signature */}
          {stage === "sign" ? (
            <form id="bail-sign" noValidate className="flex flex-col gap-5" onSubmit={submitSign}>
              {/* The signed confirmation lives inside the tab it happened in,
                  never on a replacement screen — the upload slot must stay in
                  reach so a wrong file can be changed or removed. */}
              <Field data-invalid={signTouched && !signed}>
                <Tabs
                  value={signTab}
                  onValueChange={(value) => {
                    setSignTab(value as "esign" | "upload");
                    setSignTouched(false);
                  }}
                >
                  <TabsList className="w-full border border-hairline bg-surface-sunken">
                    <TabsTrigger value="esign" className="flex-1">
                      {pick(bailDialog.tabEsign, locale)}
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex-1">
                      {pick(bailDialog.tabUploadSigned, locale)}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="esign" className="flex flex-col gap-4 pt-3">
                    {esigned ? (
                      <Banner variant="success">
                        {fillCopy(bailDialog.signedNote, locale, { name: ADVOCATE_PROFILE_NAME })}
                      </Banner>
                    ) : (
                      <Banner variant="info">{pick(bailDialog.esignNote, locale)}</Banner>
                    )}
                  </TabsContent>
                  <TabsContent value="upload" className="flex flex-col gap-4 pt-3">
                    {signedFile ? (
                      <Banner variant="success">
                        {fillCopy(bailDialog.signedNote, locale, { name: ADVOCATE_PROFILE_NAME })}
                      </Banner>
                    ) : (
                      <>
                        {/* The download step belongs to this path only — the
                            Aadhaar tab signs the document in place. */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-body-compact font-medium text-pretty text-foreground">
                            {pick(bailDialog.uploadSignedHint, locale)}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            data-icon="inline-start"
                            onClick={() => setDownloadNotice(true)}
                          >
                            <DownloadIcon aria-hidden />
                            {pick(bailDialog.downloadDraft, locale)}
                          </Button>
                        </div>
                        {downloadNotice ? (
                          <Banner variant="info">
                            {pick(bailDialog.downloadDraftPrototype, locale)}
                          </Banner>
                        ) : null}
                      </>
                    )}
                    <div className="flex flex-col gap-2">
                      <UploadedDocField
                        label={pick(bailDialog.signedDocLabel, locale)}
                        required
                        file={signedFile}
                        onFileChange={(file) => {
                          setSignedFile(file);
                          setSignTouched(false);
                        }}
                        locale={locale}
                      />
                      {/* Format guidance is for choosing a file — once one is
                          in, it has done its job. */}
                      {!signedFile ? (
                        <FieldDescription>{pick(bailDialog.docHelp, locale)}</FieldDescription>
                      ) : null}
                    </div>
                  </TabsContent>
                </Tabs>
                <FieldError>
                  {signTouched && !signed ? pick(bailDialog.signError, locale) : null}
                </FieldError>
              </Field>
            </form>
          ) : null}

          {/* ------------------------------------------------------ court fee */}
          {stage === "payment" ? (
            <div className="flex flex-col gap-5">
              <DescriptionList>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>{pick(bailDialog.feeLine, locale)}</DescriptionTerm>
                  <DescriptionDetails className="text-right tabular-nums">
                    {BAIL_FEE}
                  </DescriptionDetails>
                </DescriptionRow>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm className="font-medium text-foreground">
                    {pick(bailDialog.totalLine, locale)}
                  </DescriptionTerm>
                  <DescriptionDetails className="text-right font-medium tabular-nums">
                    {BAIL_FEE}
                  </DescriptionDetails>
                </DescriptionRow>
              </DescriptionList>
              <Banner variant="info">{pick(bailDialog.offlineNote, locale)}</Banner>
            </div>
          ) : null}

          {/* ------------------------------------------------------ submitted */}
          {stage === "done" ? (
            <div className="flex flex-col gap-5">
              <DescriptionList>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>{pick(bailDialog.submittedOn, locale)}</DescriptionTerm>
                  <DescriptionDetails className="tabular-nums">
                    {BAIL_SUBMISSION_DATE}
                  </DescriptionDetails>
                </DescriptionRow>
                {/* items-center so the label and the ID share one midline. The ID
                    is its own copy control now, so the icon button beside it went
                    with the conversion. */}
                <DescriptionRow className="items-center border-hairline">
                  <DescriptionTerm>{pick(bailDialog.submissionIdLabel, locale)}</DescriptionTerm>
                  <DescriptionDetails className="flex items-center gap-2">
                    <Identifier value={BAIL_SUBMISSION_ID} label="submission id" />
                  </DescriptionDetails>
                </DescriptionRow>
                <DescriptionRow className="border-hairline">
                  <DescriptionTerm>{pick(bailDialog.paymentLabel, locale)}</DescriptionTerm>
                  <DescriptionDetails>
                    {paid
                      ? fillCopy(bailDialog.paymentPaid, locale, { fee: BAIL_FEE })
                      : pick(bailDialog.paymentDeferred, locale)}
                  </DescriptionDetails>
                </DescriptionRow>
              </DescriptionList>

              {!paid ? (
                <Banner variant="info">
                  {fillCopy(bailDialog.feeTaskNote, locale, { fee: BAIL_FEE })}
                </Banner>
              ) : null}

              {activeSureties.length ? (
                <p className="text-body-compact text-pretty text-muted-foreground">
                  {pick(bailDialog.suretySentNote, locale)}
                </p>
              ) : null}

              {doneDownloadNotice ? (
                <Banner variant="info">
                  {pick(bailDialog.downloadApplicationPrototype, locale)}
                </Banner>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ footer */}
        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {stage === "details" ? (
            <>
              <span aria-hidden className="hidden sm:block" />
              <Button type="submit" form="bail-details" data-icon="inline-end">
                {pick(joinDialog.continue, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "sureties" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => {
                  setSuretiesTouched(false);
                  setStage("details");
                }}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button type="submit" form="bail-sureties" data-icon="inline-end">
                {pick(bailDialog.generateApplication, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={generating}
                data-icon="inline-start"
                onClick={() => setStage("sureties")}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button
                type="button"
                disabled={generating}
                data-icon="inline-end"
                onClick={() => setStage("sign")}
              >
                {pick(bailDialog.signTitle, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "sign" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => {
                  setSignTouched(false);
                  setStage("review");
                }}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              {signTab === "esign" && !esigned ? (
                <Button
                  type="button"
                  data-icon="inline-start"
                  onClick={() => {
                    // Prototype: the Aadhaar e-sign round trip succeeds.
                    setEsigned(true);
                    setSignTouched(false);
                  }}
                >
                  <PenLineIcon aria-hidden />
                  {pick(bailDialog.esignAction, locale)}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="bail-sign"
                  disabled={!signed}
                  data-icon="inline-end"
                >
                  {pick(joinDialog.continue, locale)}
                  <ArrowRightIcon aria-hidden />
                </Button>
              )}
            </>
          ) : null}

          {stage === "payment" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => setStage("sign")}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" onClick={() => finish(false)}>
                  {pick(bailDialog.payLater, locale)}
                </Button>
                <Button type="button" onClick={() => finish(true)}>
                  {fillCopy(bailDialog.payNow, locale, { fee: BAIL_FEE })}
                </Button>
              </div>
            </>
          ) : null}

          {stage === "done" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => setDoneDownloadNotice(true)}
              >
                <DownloadIcon aria-hidden />
                {pick(bailDialog.downloadApplication, locale)}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {pick(bailDialog.doneClose, locale)}
              </Button>
            </>
          ) : null}
        </footer>
      </FlowDialogContent>
    </Dialog>

    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <ChromeAlertDialogContent lang={locale}>
        <AlertDialogHeader>
          <AlertDialogTitle>{pick(bailDialog.discardTitle, locale)}</AlertDialogTitle>
          <AlertDialogDescription>
            {pick(bailDialog.discardBody, locale)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{pick(bailDialog.discardKeep, locale)}</AlertDialogCancel>
          <AlertDialogAction variant="destructive-solid" onClick={closeNow}>
            {pick(bailDialog.discardConfirm, locale)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </ChromeAlertDialogContent>
    </AlertDialog>
    </>
  );
}
