"use client";

import * as React from "react";
import { toast } from "sonner";
import { LaptopIcon, SmartphoneIcon, TabletIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChromeAlertDialogContent } from "@/components/chrome/app-chrome";
import { useLocale } from "@/components/shell/locale";
import {
  SettingsBody,
  SettingsPageHeader,
  SettingsRow,
  SettingsRows,
  SettingsSection,
  fillText,
  useDialogState,
} from "@/components/settings/settings-parts";
import {
  ChangeMobileDialog,
  PasswordDialog,
  formatMobile,
  passwordLine,
} from "@/components/settings/sign-in-dialogs";
import { useSettingsAccount } from "@/components/settings/use-settings-account";
import { pick } from "@/lib/onboarding/content";
import { updateAccount, type Device } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";

const DEVICE_ICON = { laptop: LaptopIcon, phone: SmartphoneIcon, tablet: TabletIcon } as const;

/**
 * Sign-in and security: the two ways in (mobile with a code, or a password), and where
 * the account is open now. Devices are demo data; nothing tracks sessions yet.
 */
export function SecurityPage() {
  const { locale } = useLocale();
  const { account } = useSettingsAccount();
  const t = settingsCopy.security;
  const mobile = useDialogState();
  const password = useDialogState();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const others = account.devices.filter((device) => !device.current);

  function signOut(device: Device) {
    updateAccount(account.key, (state) => ({
      ...state,
      devices: state.devices.filter((entry) => entry.id !== device.id),
    }));
    toast(fillText(pick(t.signedOutOne, locale), { device: device.name }));
  }

  function signOutOthers() {
    updateAccount(account.key, (state) => ({
      ...state,
      devices: state.devices.filter((entry) => entry.current),
    }));
    setConfirmOpen(false);
    toast(pick(t.signedOutOthers, locale));
  }

  return (
    <>
      <SettingsPageHeader page="security" />
      <SettingsBody>
        <SettingsSection title={pick(t.signInTitle, locale)} description={pick(t.signInBody, locale)}>
          <SettingsRows>
            <SettingsRow
              label={pick(settingsCopy.profile.mobile, locale)}
              action={
                <Button type="button" variant="outline" onClick={mobile.show}>
                  {pick(settingsCopy.change, locale)}
                </Button>
              }
            >
              <span className="tabular-nums">{formatMobile(account.mobile)}</span>
            </SettingsRow>
            <SettingsRow
              label={pick(t.password, locale)}
              action={
                <Button type="button" variant="outline" onClick={password.show}>
                  {pick(account.password.set ? t.changePassword : t.setPassword, locale)}
                </Button>
              }
            >
              <span className={account.password.set ? undefined : "text-muted-foreground"}>
                {account.password.set ? "••••••••" : null}
                <span className={account.password.set ? "block text-body-compact text-muted-foreground" : undefined}>
                  {passwordLine(account, locale)}
                </span>
              </span>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection title={pick(t.devicesTitle, locale)} description={pick(t.devicesBody, locale)}>
          <ul className="flex flex-col divide-y divide-hairline">
            {account.devices.map((device) => {
              const Icon = DEVICE_ICON[device.kind];
              return (
                <li
                  key={device.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 @md/settings:flex-row @md/settings:items-center @md/settings:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-medium">{device.name}</span>
                        {device.current ? <Badge variant="success">{pick(t.thisDevice, locale)}</Badge> : null}
                      </span>
                      <span className="text-body-compact text-muted-foreground">
                        {device.place} · {device.lastActive}
                      </span>
                    </div>
                  </div>
                  {device.current ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      className="@md/settings:shrink-0"
                      onClick={() => signOut(device)}
                    >
                      {pick(t.signOut, locale)}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {others.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              className="self-start max-sm:self-stretch"
              onClick={() => setConfirmOpen(true)}
            >
              {pick(t.signOutOthers, locale)}
            </Button>
          ) : (
            <p className="text-body-compact text-muted-foreground">{pick(t.onlyThisDevice, locale)}</p>
          )}
        </SettingsSection>
      </SettingsBody>

      <ChangeMobileDialog key={`mobile-${mobile.key}`} open={mobile.open} onOpenChange={mobile.onOpenChange} account={account} />
      <PasswordDialog key={`password-${password.key}`} open={password.open} onOpenChange={password.onOpenChange} account={account} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ChromeAlertDialogContent lang={locale}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick(t.signOutOthersTitle, locale)}</AlertDialogTitle>
            <AlertDialogDescription>{pick(t.signOutOthersBody, locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pick(settingsCopy.cancel, locale)}</AlertDialogCancel>
            <AlertDialogAction variant="destructive-solid" onClick={signOutOthers}>
              {pick(t.signOut, locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </ChromeAlertDialogContent>
      </AlertDialog>
    </>
  );
}
