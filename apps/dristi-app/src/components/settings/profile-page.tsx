"use client";

import * as React from "react";
import { FileTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Identifier } from "@/components/chrome/identifier";
import { formatStructuredAddress } from "@/components/cases/structured-address";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import {
  AddressDialog,
  EmailDialog,
  NameDialog,
  OfficialIdDialog,
} from "@/components/settings/profile-dialogs";
import {
  Missing,
  SettingsBody,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSection,
  useDialogState,
} from "@/components/settings/settings-parts";
import { ChangeMobileDialog, formatMobile } from "@/components/settings/sign-in-dialogs";
import { useSettingsAccount } from "@/components/settings/use-settings-account";
import { idUpload } from "@/lib/join/content";
import { pick } from "@/lib/onboarding/content";
import { settingsCopy } from "@/lib/settings/content";

/**
 * Profile: every identifier in one place (owner, Sept 30), then the details a person
 * keeps up to date. Each row changes through the process the product already has for
 * that value; the dialogs say which.
 */
export function ProfilePage() {
  const { locale } = useLocale();
  const { profileRole } = useProfile();
  const { account, advocateStatus } = useSettingsAccount();
  const p = settingsCopy.profile;
  const c = settingsCopy;

  const name = useDialogState();
  const mobile = useDialogState();
  const email = useDialogState();
  const address = useDialogState();
  const officialId = useDialogState();

  /* An advocate's name is the Bar Council register's, not theirs to edit; a
     litigant's is self-reported, so it is (owner, Sept 30: no approval). */
  const nameLocked = advocateStatus === "approved" && profileRole === "advocate";

  return (
    <>
      <SettingsPageHeader page="profile" />
      <SettingsBody>
        <SettingsSection title={pick(p.accountTitle, locale)} description={pick(p.accountBody, locale)}>
          <SettingsRows>
            <SettingsRow label={pick(p.accountId, locale)}>
              <Identifier value={account.accountId} label={pick(p.accountId, locale)} />
            </SettingsRow>
            <SettingsRow label={pick(p.registeredOn, locale)}>
              <span className="tabular-nums">{account.registeredOn}</span>
            </SettingsRow>
            <SettingsRow label={pick(p.profiles, locale)}>
              <span className="flex flex-wrap gap-2">
                <Badge variant="secondary">{pick(c.accountType.litigant, locale)}</Badge>
                {advocateStatus === "approved" ? (
                  <Badge variant="secondary">{pick(c.accountType.advocateRole, locale)}</Badge>
                ) : null}
              </span>
            </SettingsRow>
            {account.advocate.applicationId && advocateStatus !== "none" ? (
              <SettingsRow label={pick(p.applicationId, locale)}>
                <Identifier value={account.advocate.applicationId} label={pick(p.applicationId, locale)} />
              </SettingsRow>
            ) : null}
          </SettingsRows>
        </SettingsSection>

        <SettingsSection title={pick(p.detailsTitle, locale)} description={pick(p.detailsBody, locale)}>
          <SettingsRows>
            <SettingsRow
              label={pick(p.name, locale)}
              note={nameLocked ? pick(p.nameFromRegister, locale) : undefined}
              action={
                nameLocked ? undefined : (
                  <Button type="button" variant="outline" onClick={name.show}>
                    {pick(c.change, locale)}
                  </Button>
                )
              }
            >
              {account.name}
            </SettingsRow>

            <SettingsRow
              label={pick(p.mobile, locale)}
              note={pick(p.mobileNote, locale)}
              action={
                <Button type="button" variant="outline" onClick={mobile.show}>
                  {pick(c.change, locale)}
                </Button>
              }
            >
              <span className="tabular-nums">{formatMobile(account.mobile)}</span>
            </SettingsRow>

            <SettingsRow
              label={pick(p.email, locale)}
              action={
                <Button type="button" variant="outline" onClick={email.show}>
                  {pick(account.email ? c.change : c.add, locale)}
                </Button>
              }
            >
              {account.email ? (
                <span className="break-all">{account.email}</span>
              ) : (
                <Missing>{pick(c.notAdded, locale)}</Missing>
              )}
            </SettingsRow>

            <SettingsRow
              label={pick(p.officialId, locale)}
              action={
                <Button type="button" variant="outline" onClick={officialId.show}>
                  {pick(account.officialId ? c.replace : c.add, locale)}
                </Button>
              }
            >
              {account.officialId ? (
                <span className="flex min-w-0 items-center gap-2">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block">{pick(idUpload.idTypes[account.officialId.idType], locale)}</span>
                    <span className="block truncate text-body-compact text-muted-foreground">
                      {account.officialId.file.name}
                    </span>
                  </span>
                </span>
              ) : (
                <Missing>{pick(c.notAdded, locale)}</Missing>
              )}
            </SettingsRow>

            <SettingsRow
              label={pick(p.address, locale)}
              action={
                <Button type="button" variant="outline" onClick={address.show}>
                  {pick(account.address ? c.change : c.add, locale)}
                </Button>
              }
            >
              {account.address ? (
                <span className="text-pretty">{formatStructuredAddress(account.address)}</span>
              ) : (
                <Missing>{pick(c.notAdded, locale)}</Missing>
              )}
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </SettingsBody>

      <NameDialog key={`name-${name.key}`} open={name.open} onOpenChange={name.onOpenChange} account={account} />
      <ChangeMobileDialog key={`mobile-${mobile.key}`} open={mobile.open} onOpenChange={mobile.onOpenChange} account={account} />
      <EmailDialog key={`email-${email.key}`} open={email.open} onOpenChange={email.onOpenChange} account={account} />
      <AddressDialog key={`address-${address.key}`} open={address.open} onOpenChange={address.onOpenChange} account={account} target="home" />
      <OfficialIdDialog key={`id-${officialId.key}`} open={officialId.open} onOpenChange={officialId.onOpenChange} account={account} />
    </>
  );
}
