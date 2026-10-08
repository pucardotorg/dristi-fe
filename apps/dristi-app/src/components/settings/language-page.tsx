"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { RadioGroup } from "@/components/ui/radio-group";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useLanguagePair, useLocale } from "@/components/shell/locale";
import { ChoiceCard } from "@/components/settings/choice-cards";
import {
  SettingsBody,
  SettingsPageHeader,
  SettingsSection,
} from "@/components/settings/settings-parts";
import {
  isSecondLocale,
  LANGUAGES,
  STATE_SECOND_LOCALE,
  type Locale,
} from "@/lib/i18n/languages";
import { pick } from "@/lib/onboarding/content";
import { settingsCopy } from "@/lib/settings/content";

/**
 * Language. English is always one half of the top-bar toggle (owner, Sept 30); this is
 * where a person picks the other half. Each language is named in its own script, with
 * its English name and one sample line under it, because the person looking for their
 * language may not read the English word for it.
 */
export function LanguagePage() {
  const { locale, setLocale, secondLocale, setSecondLocale } = useLocale();
  const pair = useLanguagePair();
  const t = settingsCopy.language;

  return (
    <>
      <SettingsPageHeader page="language" />
      <SettingsBody>
        <SettingsSection title={pick(t.onScreenTitle, locale)} description={pick(t.onScreenBody, locale)}>
          <SegmentedControl
            type="single"
            value={locale}
            onValueChange={(value) => value && setLocale(value as Locale)}
            aria-label={pick(t.onScreenTitle, locale)}
            className="w-full @md/settings:w-auto @md/settings:self-start"
          >
            {pair.map((entry) => (
              <SegmentedControlItem key={entry.value} value={entry.value} lang={entry.value}>
                {entry.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </SettingsSection>

        <SettingsSection title={pick(t.secondTitle, locale)} description={pick(t.secondBody, locale)}>
          <RadioGroup
            aria-label={pick(t.secondTitle, locale)}
            value={secondLocale}
            onValueChange={(value) => {
              if (isSecondLocale(value)) setSecondLocale(value);
            }}
            className="grid-cols-1 gap-3 @xl/settings:grid-cols-2"
          >
            {LANGUAGES.filter((language) => language.code !== "en").map((language) => (
              <ChoiceCard key={language.code} id={`language-${language.code}`} value={language.code}>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span lang={language.code} className="text-body font-semibold">
                    {language.native}
                  </span>
                  <span className="text-body-compact text-muted-foreground">{language.english}</span>
                  {language.code === STATE_SECOND_LOCALE ? (
                    <Badge variant="secondary">{pick(t.stateDefault, locale)}</Badge>
                  ) : null}
                </span>
                <span lang={language.code} className="text-body-compact text-pretty text-muted-foreground">
                  {language.sample}
                </span>
              </ChoiceCard>
            ))}
          </RadioGroup>
          <Banner variant="neutral">{pick(t.partial, locale)}</Banner>
        </SettingsSection>
      </SettingsBody>
    </>
  );
}
