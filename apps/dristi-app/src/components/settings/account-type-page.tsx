"use client";

import * as React from "react";
import { BriefcaseIcon, CheckIcon, ScaleIcon, UserRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Identifier } from "@/components/chrome/identifier";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import { AdvocateRequestDialog } from "@/components/settings/advocate-dialogs";
import {
  SettingsBody,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSection,
  useDialogState,
} from "@/components/settings/settings-parts";
import { useSettingsAccount } from "@/components/settings/use-settings-account";
import { pick } from "@/lib/onboarding/content";
import type { AdvocateStatus } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<
  AdvocateStatus,
  { copy: keyof typeof settingsCopy.accountType; variant: "success" | "info" | "destructive" | "secondary" }
> = {
  approved: { copy: "active", variant: "success" },
  pending: { copy: "underReview", variant: "info" },
  "not-approved": { copy: "notApproved", variant: "destructive" },
  none: { copy: "notRequested", variant: "secondary" },
};

/**
 * Account type: the profiles this account holds, the switch between them, and the
 * advocate profile's lifecycle (ask, wait on the scrutiny officer, and, if it is not
 * approved, read why and resubmit: the "appeal" the brief asked for).
 */
export function AccountTypePage() {
  const { locale } = useLocale();
  const { profileRole, switchProfile } = useProfile();
  const { account, advocateStatus } = useSettingsAccount();
  const t = settingsCopy.accountType;
  const request = useDialogState();
  const advocate = account.advocate;

  return (
    <>
      <SettingsPageHeader page="account-type" />
      <SettingsBody>
        <SettingsSection title={pick(t.profilesTitle, locale)} description={pick(t.profilesBody, locale)}>
          <ul className="flex flex-col gap-3">
            <ProfileOption
              icon={UserRoundIcon}
              title={pick(t.litigant, locale)}
              body={pick(t.litigantBody, locale)}
              current={profileRole === "litigant"}
              badge={<Badge variant="success">{pick(t.active, locale)}</Badge>}
              onSwitch={profileRole === "advocate" ? switchProfile : undefined}
            />
            <ProfileOption
              icon={BriefcaseIcon}
              title={pick(t.advocateRole, locale)}
              body={pick(t.advocateBody, locale)}
              current={profileRole === "advocate" && advocateStatus === "approved"}
              badge={
                <Badge variant={STATUS_BADGE[advocateStatus].variant}>
                  {pick(t[STATUS_BADGE[advocateStatus].copy], locale)}
                </Badge>
              }
              onSwitch={
                advocateStatus === "approved" && profileRole === "litigant" ? switchProfile : undefined
              }
            />
          </ul>
        </SettingsSection>

        {advocateStatus === "none" ? (
          <SettingsSection title={pick(t.requestTitle, locale)} description={pick(t.requestBody, locale)}>
            <Button type="button" variant="outline" className="self-start max-sm:self-stretch" onClick={request.show}>
              <ScaleIcon data-icon="inline-start" aria-hidden />
              {pick(t.requestAction, locale)}
            </Button>
          </SettingsSection>
        ) : null}

        {advocateStatus === "pending" || advocateStatus === "not-approved" ? (
          <SettingsSection title={pick(t.requestTitle, locale)}>
            {advocateStatus === "pending" ? (
              <Banner variant="info">{pick(t.pendingNote, locale)}</Banner>
            ) : (
              <div className="flex flex-col gap-4">
                <Banner variant="error">
                  <span className="font-semibold">{pick(t.notApprovedTitle, locale)}</span>
                </Banner>
                <div className="flex flex-col gap-1.5 rounded-lg bg-surface-sunken p-4">
                  <p className="text-body-compact font-semibold">{pick(t.officerSaid, locale)}</p>
                  <p className="text-body text-pretty">{advocate.officerMessage}</p>
                </div>
                <Button type="button" className="self-start max-sm:self-stretch" onClick={request.show}>
                  {pick(t.resubmit, locale)}
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <h3 className="text-body-compact font-semibold text-muted-foreground">
                {pick(t.submittedTitle, locale)}
              </h3>
              <SettingsRows>
                <SettingsRow label={pick(settingsCopy.advocate.barNumber, locale)}>
                  <Identifier value={advocate.barNumber} label={pick(settingsCopy.advocate.barNumber, locale)} />
                </SettingsRow>
                <SettingsRow label={pick(settingsCopy.advocate.barId, locale)}>
                  <span className="break-all">{advocate.barIdName}</span>
                </SettingsRow>
                <SettingsRow label={pick(settingsCopy.profile.applicationId, locale)}>
                  <Identifier value={advocate.applicationId} label={pick(settingsCopy.profile.applicationId, locale)} />
                </SettingsRow>
                <SettingsRow label={pick(t.submittedOn, locale)}>
                  <span className="tabular-nums">{advocate.submittedOn}</span>
                </SettingsRow>
              </SettingsRows>
            </div>
          </SettingsSection>
        ) : null}
      </SettingsBody>

      <AdvocateRequestDialog
        key={`request-${request.key}`}
        open={request.open}
        onOpenChange={request.onOpenChange}
        account={account}
      />
    </>
  );
}

/**
 * One profile. The one in use is marked in words and a tick, not by colour alone; the
 * other offers to switch when it can be used.
 */
function ProfileOption({
  icon: Icon,
  title,
  body,
  badge,
  current,
  onSwitch,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  badge: React.ReactNode;
  current: boolean;
  onSwitch?: () => void;
}) {
  const { locale } = useLocale();
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 @md/settings:flex-row @md/settings:items-center @md/settings:gap-4",
        current ? "border-primary" : "border-border",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-semibold">{title}</span>
            {badge}
          </div>
          <span className="text-body-compact text-muted-foreground">{body}</span>
        </div>
      </div>
      {current ? (
        <span className="flex items-center gap-1.5 text-body-compact font-medium @md/settings:shrink-0">
          <CheckIcon className="size-4 text-success-ink" aria-hidden />
          {pick(settingsCopy.accountType.inUse, locale)}
        </span>
      ) : onSwitch ? (
        <Button type="button" variant="outline" className="@md/settings:shrink-0" onClick={onSwitch}>
          {pick(settingsCopy.accountType.switchTo, locale)}
        </Button>
      ) : null}
    </li>
  );
}
