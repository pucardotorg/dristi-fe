"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, FileTextIcon, ScaleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Identifier } from "@/components/chrome/identifier";
import { formatStructuredAddress } from "@/components/cases/structured-address";
import { PANEL_CLASS } from "@/components/filing/form-card";
import { useLocale } from "@/components/shell/locale";
import { BarCorrectionDialog } from "@/components/settings/advocate-dialogs";
import { AddressDialog } from "@/components/settings/profile-dialogs";
import {
  Missing,
  SettingsBody,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSection,
  fillText,
  useDialogState,
} from "@/components/settings/settings-parts";
import { useSettingsAccount } from "@/components/settings/use-settings-account";
import { pick } from "@/lib/onboarding/content";
import { settingsCopy } from "@/lib/settings/content";
import { settingsHref } from "@/lib/settings/pages";

/**
 * Advocate details: the Bar registration the court verified, and the chamber address.
 * The name and the number are the register's, so the number is *corrected* through the
 * scrutiny officer rather than edited (owner, Sept 30); the address is the advocate's.
 */
export function AdvocatePage() {
  const { locale } = useLocale();
  const { account, advocateStatus } = useSettingsAccount();
  const a = settingsCopy.advocate;
  const c = settingsCopy;
  const correction = useDialogState();
  const chamber = useDialogState();
  const advocate = account.advocate;

  if (advocateStatus !== "approved") {
    return (
      <>
        <SettingsPageHeader page="advocate" />
        <Card className={PANEL_CLASS}>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScaleIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{pick(a.noProfileTitle, locale)}</EmptyTitle>
              <EmptyDescription>{pick(a.noProfileBody, locale)}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href={settingsHref("account-type")}>{pick(a.goToAccountType, locale)}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      </>
    );
  }

  return (
    <>
      <SettingsPageHeader page="advocate" />
      <SettingsBody>
        <SettingsSection title={pick(a.registrationTitle, locale)} description={pick(a.registrationBody, locale)}>
          {advocate.correction ? (
            <Banner variant="info">
              {fillText(pick(a.correctionPending, locale), {
                number: advocate.correction.barNumber,
                date: advocate.correction.submittedOn,
                current: advocate.barNumber,
              })}
            </Banner>
          ) : null}
          <SettingsRows>
            <SettingsRow label={pick(settingsCopy.profile.name, locale)} note={pick(settingsCopy.profile.nameFromRegister, locale)}>
              {account.name}
            </SettingsRow>
            <SettingsRow
              label={pick(a.barNumber, locale)}
              action={
                advocate.correction ? undefined : (
                  <Button type="button" variant="outline" onClick={correction.show}>
                    {pick(a.correct, locale)}
                  </Button>
                )
              }
            >
              <Identifier value={advocate.barNumber} label={pick(a.barNumber, locale)} />
            </SettingsRow>
            <SettingsRow label={pick(a.barCouncil, locale)}>{advocate.barCouncil}</SettingsRow>
            <SettingsRow label={pick(a.barId, locale)}>
              <span className="flex min-w-0 items-center gap-2">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate">{advocate.barIdName}</span>
              </span>
            </SettingsRow>
            <SettingsRow label={pick(a.status, locale)}>
              <Badge variant="success">
                <CheckIcon data-icon="inline-start" aria-hidden />
                {pick(a.verified, locale)}
              </Badge>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection title={pick(a.chamberTitle, locale)} description={pick(a.chamberBody, locale)}>
          <SettingsRows>
            <SettingsRow
              label={pick(settingsCopy.profile.address, locale)}
              action={
                <Button type="button" variant="outline" onClick={chamber.show}>
                  {pick(advocate.chamberAddress ? c.change : c.add, locale)}
                </Button>
              }
            >
              {advocate.chamberAddress ? (
                <span className="text-pretty">{formatStructuredAddress(advocate.chamberAddress)}</span>
              ) : (
                <Missing>{pick(c.notAdded, locale)}</Missing>
              )}
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </SettingsBody>

      <BarCorrectionDialog
        key={`bar-${correction.key}`}
        open={correction.open}
        onOpenChange={correction.onOpenChange}
        account={account}
      />
      <AddressDialog
        key={`chamber-${chamber.key}`}
        open={chamber.open}
        onOpenChange={chamber.onOpenChange}
        account={account}
        target="chamber"
      />
    </>
  );
}
