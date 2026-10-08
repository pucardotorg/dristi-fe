"use client";

import * as React from "react";

import {
  useLocalStorageValue,
  writeLocalStorageValue,
} from "@/hooks/use-local-storage-value";
import {
  isLocale,
  isSecondLocale,
  languageOf,
  LOCALE_KEY,
  SECOND_LOCALE_KEY,
  STATE_SECOND_LOCALE,
  type Locale,
  type SecondLocale,
} from "@/lib/i18n/languages";

/**
 * App-wide language. The old Portal shell carried locale as a prop pair; on the one
 * shared shell it is context, so the top-bar toggle and every screen read the same
 * source. Citizen-facing screens (home, join, bond) render translated copy; professional
 * screens simply ignore it.
 *
 * Both halves are remembered: the language on screen, and the language the toggle
 * offers beside English (Settings › Language). They are preferences, not demo actions,
 * so they survive a refresh.
 */
type LocaleValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** The toggle's second half: English is always the first. */
  secondLocale: SecondLocale;
  setSecondLocale: (locale: SecondLocale) => void;
};

const LocaleContext = React.createContext<LocaleValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const storedLocale = useLocalStorageValue(LOCALE_KEY);
  const secondLocale = useSecondLocale();
  const locale: Locale = isLocale(storedLocale) ? storedLocale : initialLocale;

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    writeLocalStorageValue(LOCALE_KEY, next);
  }, []);

  /* Choosing a new second language while reading the old one moves the page with it:
     the toggle no longer offers the old language, so staying on it would leave the
     page in a language neither half of the toggle names. */
  const setSecondLocale = React.useCallback(
    (next: SecondLocale) => {
      if (locale !== "en") writeLocalStorageValue(LOCALE_KEY, next);
      writeLocalStorageValue(SECOND_LOCALE_KEY, next);
    },
    [locale],
  );

  const value = React.useMemo<LocaleValue>(
    () => ({ locale, setLocale, secondLocale, setSecondLocale }),
    [locale, setLocale, secondLocale, setSecondLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = React.useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside <LocaleProvider>");
  return value;
}

function useSecondLocale(): SecondLocale {
  const stored = useLocalStorageValue(SECOND_LOCALE_KEY);
  return isSecondLocale(stored) ? stored : STATE_SECOND_LOCALE;
}

/**
 * The two languages a toggle offers: English, then the person's chosen language, each
 * named in its own script so someone who cannot read "Language" can still find theirs.
 * Standalone (it reads storage, not context) so screens with their own local locale,
 * like bond signing, offer the same pair.
 */
export function useLanguagePair(): { value: Locale; label: string }[] {
  const second = useSecondLocale();
  return [
    { value: "en", label: languageOf("en").native },
    { value: second, label: languageOf(second).native },
  ];
}
