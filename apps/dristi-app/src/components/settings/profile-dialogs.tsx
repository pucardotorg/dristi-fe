"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  emptyStructuredAddress,
  StructuredAddressFields,
  structuredAddressComplete,
  type StructuredAddress,
} from "@/components/cases/structured-address";
import { AddIdForm } from "@/components/home/add-id-dialog";
import { useLocale } from "@/components/shell/locale";
import { SettingsDialog } from "@/components/settings/settings-parts";
import { pick } from "@/lib/onboarding/content";
import { contactStep } from "@/lib/registration/content";
import { updateAccount, updateAdvocate, type AccountState } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED = <span className="text-destructive">*</span>;

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
};

function Footer({ formId, onCancel, submit }: { formId: string; onCancel: () => void; submit?: string }) {
  const { locale } = useLocale();
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel}>
        {pick(settingsCopy.cancel, locale)}
      </Button>
      <Button type="submit" form={formId}>
        {submit ?? pick(settingsCopy.save, locale)}
      </Button>
    </>
  );
}

/** A litigant's name is their own to correct; it needs no approval (owner, Sept 30). */
export function NameDialog({ open, onOpenChange, account }: DialogProps) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const [name, setName] = React.useState(account.name);
  const [touched, setTouched] = React.useState(false);
  const empty = !name.trim();

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (empty) return;
    updateAccount(account.key, (state) => ({ ...state, name: name.trim() }));
    onOpenChange(false);
    toast(pick(d.nameSaved, locale));
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.nameTitle, locale)}
      description={pick(d.nameBody, locale)}
      dirty={name !== account.name}
      footer={<Footer formId="settings-name" onCancel={() => onOpenChange(false)} />}
    >
      <form id="settings-name" noValidate onSubmit={save}>
        <Field data-invalid={touched && empty}>
          <FieldLabel htmlFor="settings-name-input">
            {pick(d.nameLabel, locale)} {REQUIRED}
          </FieldLabel>
          <Input
            id="settings-name-input"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setTouched(false);
            }}
          />
          <FieldError>{touched && empty ? pick(d.nameError, locale) : null}</FieldError>
        </Field>
      </form>
    </SettingsDialog>
  );
}

/** Email is optional at registration, so it is optional here, with the same check. */
export function EmailDialog({ open, onOpenChange, account }: DialogProps) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const [email, setEmail] = React.useState(account.email);
  const [touched, setTouched] = React.useState(false);
  const invalid = email.trim() !== "" && !EMAIL.test(email.trim());

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    updateAccount(account.key, (state) => ({ ...state, email: email.trim() }));
    onOpenChange(false);
    toast(pick(d.emailSaved, locale));
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.emailTitle, locale)}
      description={pick(d.emailBody, locale)}
      dirty={email !== account.email}
      footer={<Footer formId="settings-email" onCancel={() => onOpenChange(false)} />}
    >
      <form id="settings-email" noValidate className="flex flex-col gap-4" onSubmit={save}>
        <Field data-invalid={touched && invalid}>
          <FieldLabel htmlFor="settings-email-input">{pick(contactStep.email, locale)}</FieldLabel>
          <Input
            id="settings-email-input"
            type="email"
            autoComplete="email"
            value={email}
            placeholder={pick(contactStep.emailPlaceholder, locale)}
            onChange={(event) => {
              setEmail(event.target.value);
              setTouched(false);
            }}
          />
          <FieldError>{touched && invalid ? pick(contactStep.emailError, locale) : null}</FieldError>
        </Field>
        {account.email ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto self-start p-0 text-destructive-ink"
            onClick={() => setEmail("")}
          >
            {pick(d.emailRemove, locale)}
          </Button>
        ) : null}
      </form>
    </SettingsDialog>
  );
}

/**
 * The address grammar the case screens use (`StructuredAddressFields`), for the
 * person's own address or an advocate's chamber. No approval: the case screens change
 * an address the same way.
 */
export function AddressDialog({
  open,
  onOpenChange,
  account,
  target,
}: DialogProps & { target: "home" | "chamber" }) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const initial =
    (target === "home" ? account.address : account.advocate.chamberAddress) ?? emptyStructuredAddress();
  const [address, setAddress] = React.useState<StructuredAddress>(initial);
  const [touched, setTouched] = React.useState(false);
  const incomplete = !structuredAddressComplete(address);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (incomplete) return;
    if (target === "home") {
      updateAccount(account.key, (state) => ({ ...state, address }));
    } else {
      updateAdvocate(account.key, (advocate) => ({ ...advocate, chamberAddress: address }));
    }
    onOpenChange(false);
    toast(pick(d.addressSaved, locale));
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={pick(target === "home" ? d.addressTitle : settingsCopy.advocate.chamberTitle, locale)}
      description={pick(target === "home" ? d.addressBody : d.chamberBody, locale)}
      dirty={JSON.stringify(address) !== JSON.stringify(initial)}
      footer={<Footer formId="settings-address" onCancel={() => onOpenChange(false)} />}
    >
      <form id="settings-address" noValidate className="flex flex-col gap-4" onSubmit={save}>
        <StructuredAddressFields
          value={address}
          onChange={(next) => {
            setAddress(next);
            setTouched(false);
          }}
          idPrefix={`settings-${target}`}
        />
        {touched && incomplete ? (
          <p className="text-body-compact text-destructive" role="alert">
            {pick(d.addressError, locale)}
          </p>
        ) : null}
      </form>
    </SettingsDialog>
  );
}

/**
 * The profile's ID upload, the same form and scan check as before, now in a dialog.
 * Uploading replaces the ID on file; litigant IDs are not reviewed, so it takes effect
 * at once.
 */
export function OfficialIdDialog({ open, onOpenChange, account }: DialogProps) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const [dirty, setDirty] = React.useState(false);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.idTitle, locale)}
      description={pick(d.idBody, locale)}
      dirty={dirty}
      footer={
        <Footer
          formId="settings-official-id"
          onCancel={() => onOpenChange(false)}
          submit={pick(d.idSubmit, locale)}
        />
      }
    >
      <AddIdForm
        locale={locale}
        formId="settings-official-id"
        hideActions
        onDirtyChange={setDirty}
        onCancel={() => onOpenChange(false)}
        onSubmitted={(submission) => {
          updateAccount(account.key, (state) => ({ ...state, officialId: submission }));
          onOpenChange(false);
          toast(pick(d.idSaved, locale));
        }}
      />
    </SettingsDialog>
  );
}
