"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MonitorSmartphoneIcon, MoonIcon, SunIcon } from "lucide-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { useLocale } from "@/components/shell/locale";
import { useTextSize } from "@/components/shell/text-size";
import { ChoiceCard } from "@/components/settings/choice-cards";
import {
  SettingsBody,
  SettingsPageHeader,
  SettingsSection,
  fillText,
} from "@/components/settings/settings-parts";
import {
  useLocalStorageValue,
  writeLocalStorageValue,
} from "@/hooks/use-local-storage-value";
import { pick } from "@/lib/onboarding/content";
import { settingsCopy } from "@/lib/settings/content";
import {
  isSignOutAfter,
  SIGN_OUT_AFTER,
  SIGN_OUT_AFTER_KEY,
  TEXT_SIZE_KEY,
  type SignOutAfter,
  type TextSize,
} from "@/lib/settings/preferences";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/** Theme is known only in the browser; until then no card claims to be chosen. */
function useMounted() {
  return React.useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Display and accessibility. Every choice applies the moment it is made, with no Save:
 * a person checking whether Larger is enough should see it at once, on this page.
 */
export function DisplayPage() {
  const { locale } = useLocale();
  const t = settingsCopy.display;
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const textSize = useTextSize();
  const storedSignOut = useLocalStorageValue(SIGN_OUT_AFTER_KEY);
  const signOutAfter: SignOutAfter = isSignOutAfter(storedSignOut) ? storedSignOut : "15";

  const themes = [
    { value: "light", icon: SunIcon, label: t.light },
    { value: "dark", icon: MoonIcon, label: t.dark },
    { value: "system", icon: MonitorSmartphoneIcon, label: t.system },
  ] as const;

  const sizes: { value: TextSize; label: string; sample: string }[] = [
    { value: "default", label: pick(t.textDefault, locale), sample: "text-body-compact font-semibold" },
    { value: "large", label: pick(t.textLarge, locale), sample: "text-body font-semibold" },
    { value: "larger", label: pick(t.textLarger, locale), sample: "text-title-s font-semibold" },
  ];

  return (
    <>
      <SettingsPageHeader page="display" />
      <SettingsBody>
        <SettingsSection title={pick(t.themeTitle, locale)} description={pick(t.themeBody, locale)}>
          <RadioGroup
            aria-label={pick(t.themeTitle, locale)}
            value={mounted ? (theme ?? "light") : ""}
            onValueChange={setTheme}
            className="grid-cols-1 gap-3 @md/settings:grid-cols-3"
          >
            {themes.map((option) => {
              const Icon = option.icon;
              return (
                <ChoiceCard key={option.value} id={`theme-${option.value}`} value={option.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="text-body font-medium">{pick(option.label, locale)}</span>
                  </span>
                </ChoiceCard>
              );
            })}
          </RadioGroup>
        </SettingsSection>

        <SettingsSection title={pick(t.textTitle, locale)} description={pick(t.textBody, locale)}>
          <RadioGroup
            aria-label={pick(t.textTitle, locale)}
            value={textSize}
            onValueChange={(value) => writeLocalStorageValue(TEXT_SIZE_KEY, value)}
            className="grid-cols-1 gap-3 @md/settings:grid-cols-3"
          >
            {sizes.map((option) => (
              <ChoiceCard key={option.value} id={`text-${option.value}`} value={option.value}>
                {/* The letter at the size it stands for, so the step is seen, not read. */}
                <span className="flex items-baseline gap-2">
                  <span aria-hidden className={cn("w-8 shrink-0 leading-none", option.sample)}>
                    Aa
                  </span>
                  <span className="text-body font-medium">{option.label}</span>
                </span>
              </ChoiceCard>
            ))}
          </RadioGroup>
          <div className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-4">
            <span className="text-caption text-muted-foreground">{pick(t.previewLabel, locale)}</span>
            <p className="text-body text-pretty">{pick(t.textPreview, locale)}</p>
          </div>
        </SettingsSection>

        <SettingsSection title={pick(t.signOutTitle, locale)} description={pick(t.signOutBody, locale)}>
          <RadioGroup
            aria-label={pick(t.signOutTitle, locale)}
            value={signOutAfter}
            onValueChange={(value) => writeLocalStorageValue(SIGN_OUT_AFTER_KEY, value)}
            className="gap-3"
          >
            {SIGN_OUT_AFTER.map((minutes) => (
              <ChoiceCard key={minutes} id={`sign-out-${minutes}`} value={minutes}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-medium tabular-nums">
                    {minutes === "60"
                      ? pick(t.oneHour, locale)
                      : fillText(pick(t.minutes, locale), { n: minutes })}
                  </span>
                  {minutes === "15" ? (
                    <span className="text-body-compact text-muted-foreground">{pick(t.recommended, locale)}</span>
                  ) : null}
                </span>
              </ChoiceCard>
            ))}
          </RadioGroup>
        </SettingsSection>
      </SettingsBody>
    </>
  );
}
