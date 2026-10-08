"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileTextIcon } from "lucide-react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { DocumentSlot } from "@/components/ui/document-slot";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DocumentPreviewDialog,
  DocumentThumbnailButton,
  useObjectUrl,
} from "@/components/document-preview";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import { SettingsDialog, fillText } from "@/components/settings/settings-parts";
import { pick } from "@/lib/onboarding/content";
import { today, updateAdvocate, type AccountState } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";

const REQUIRED = <span className="text-destructive">*</span>;
const ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

/** The Bar Council ID upload Settings already had, lifted out so both flows share it. */
function BarIdField({
  file,
  onFile,
  invalid,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  invalid: boolean;
}) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const url = useObjectUrl(file);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel>
        {pick(settingsCopy.advocate.barId, locale)} {REQUIRED}
      </FieldLabel>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        accept={ACCEPT}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      <DocumentSlot
        status={file ? "filled" : "empty"}
        media={file && url ? "thumbnail" : "icon"}
        label={pick(settingsCopy.advocate.barId, locale)}
        required
        filename={file?.name}
        thumbnail={
          file && url ? (
            <DocumentThumbnailButton
              file={file}
              url={url}
              locale={locale}
              onOpen={() => setPreviewOpen(true)}
              className="size-full"
            />
          ) : (
            <FileTextIcon className="size-5" aria-hidden />
          )
        }
        onChooseFile={() => inputRef.current?.click()}
        copy={{ noFile: pick(d.noFile, locale), chooseFile: pick(d.chooseFile, locale) }}
      />
      <div className="flex items-start justify-between gap-4">
        <FieldDescription>{pick(d.barIdHint, locale)}</FieldDescription>
        {file ? (
          <Button
            type="button"
            variant="link"
            className="h-auto shrink-0 p-0"
            onClick={() => inputRef.current?.click()}
          >
            {pick(d.changeFile, locale)}
          </Button>
        ) : null}
      </div>
      <FieldError>{invalid ? pick(d.barIdError, locale) : null}</FieldError>
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={file}
        url={url}
        locale={locale}
      />
    </Field>
  );
}

function BarNumberField({
  value,
  onChange,
  error,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  label: string;
}) {
  const { locale } = useLocale();
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="settings-bar-number">
        {label} {REQUIRED}
      </FieldLabel>
      <Input
        id="settings-bar-number"
        value={value}
        autoComplete="off"
        className="font-mono"
        placeholder={pick(settingsCopy.dialogs.barPlaceholder, locale)}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/**
 * Correcting a Bar registration number. The number is the court's record of who may
 * appear, so a correction is checked like registration was: it goes to the scrutiny
 * officer with a fresh scan of the ID card, as an edited request (REG-18). Nothing is
 * taken away meanwhile; the advocate keeps working on the number on file.
 */
export function BarCorrectionDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
}) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const current = account.advocate.barNumber;
  const [barNumber, setBarNumber] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [touched, setTouched] = React.useState(false);

  const numberError = !barNumber.trim()
    ? pick(d.barNumberError, locale)
    : barNumber.trim() === current
      ? pick(d.barSame, locale)
      : null;

  function send(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (numberError || !file) return;
    updateAdvocate(account.key, (advocate) => ({
      ...advocate,
      correction: { barNumber: barNumber.trim(), barIdName: file.name, submittedOn: today() },
    }));
    onOpenChange(false);
    toast(pick(d.correctionSent, locale));
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.barTitle, locale)}
      initialFocusId="settings-bar-number"
      description={fillText(pick(d.barBody, locale), { current })}
      dirty={barNumber !== "" || file !== null}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.cancel, locale)}
          </Button>
          <Button type="submit" form="settings-bar-correction">
            {pick(d.sendForReview, locale)}
          </Button>
        </>
      }
    >
      <form id="settings-bar-correction" noValidate className="flex flex-col gap-6" onSubmit={send}>
        <Field>
          <FieldLabel>{pick(settingsCopy.advocate.barNumber, locale)}</FieldLabel>
          <Input value={current} readOnly className="bg-muted font-mono text-muted-foreground" />
        </Field>
        <BarNumberField
          label={pick(d.barCorrected, locale)}
          value={barNumber}
          onChange={(value) => {
            setBarNumber(value);
            setTouched(false);
          }}
          error={touched ? numberError : null}
        />
        <BarIdField
          file={file}
          onFile={(next) => {
            setFile(next);
            setTouched(false);
          }}
          invalid={touched && !file}
        />
      </form>
    </SettingsDialog>
  );
}

/**
 * Asking for an advocate profile, or resubmitting one that was not approved. The
 * resubmission shows the officer's message above the fields and fills in what was sent,
 * as the registration resubmission does.
 */
export function AdvocateRequestDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
}) {
  const { locale } = useLocale();
  const { enableAdvocateProfile } = useProfile();
  const d = settingsCopy.dialogs;
  const resubmitting = account.advocate.status === "not-approved";
  const [barNumber, setBarNumber] = React.useState(resubmitting ? account.advocate.barNumber : "");
  const [file, setFile] = React.useState<File | null>(null);
  const [touched, setTouched] = React.useState(false);
  const numberError = !barNumber.trim() ? pick(d.barNumberError, locale) : null;

  function send(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (numberError || !file) return;
    const name = account.key;
    updateAdvocate(name, (advocate) => ({
      ...advocate,
      status: "pending",
      barNumber: barNumber.trim(),
      barIdName: file.name,
      barIdFile: file,
      applicationId: advocate.applicationId || "KL-ADV-551902-2026",
      submittedOn: today(),
      officerMessage: "",
    }));
    onOpenChange(false);
    toast(pick(d.requestSent, locale));
    // Demo: the officer's approval lands a moment later, as it did before. In
    // production this waits on the scrutiny officer's check against the register.
    window.setTimeout(() => {
      updateAdvocate(name, (advocate) =>
        advocate.status === "pending" ? { ...advocate, status: "approved" } : advocate,
      );
      enableAdvocateProfile();
      toast(pick(d.approved, locale));
    }, 4000);
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(resubmitting ? d.resubmitTitle : d.requestTitle, locale)}
      description={pick(d.requestBody, locale)}
      dirty={(barNumber !== "" && !resubmitting) || file !== null}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.cancel, locale)}
          </Button>
          <Button type="submit" form="settings-advocate-request">
            {pick(d.sendRequest, locale)}
          </Button>
        </>
      }
    >
      <form id="settings-advocate-request" noValidate className="flex flex-col gap-6" onSubmit={send}>
        {resubmitting && account.advocate.officerMessage ? (
          <Banner variant="warning">
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{pick(settingsCopy.accountType.officerSaid, locale)}</span>
              <span>{account.advocate.officerMessage}</span>
            </span>
          </Banner>
        ) : null}
        <BarNumberField
          label={pick(settingsCopy.advocate.barNumber, locale)}
          value={barNumber}
          onChange={(value) => {
            setBarNumber(value);
            setTouched(false);
          }}
          error={touched ? numberError : null}
        />
        <BarIdField
          file={file}
          onFile={(next) => {
            setFile(next);
            setTouched(false);
          }}
          invalid={touched && !file}
        />
      </form>
    </SettingsDialog>
  );
}
