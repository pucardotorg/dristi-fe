/**
 * Which language sits beside English in the language switcher. A deployment setting,
 * not a filer's choice: one second language per deployment (owner, 2026-10-08).
 *
 * Hindi is the default. Hindi text does not exist yet — every string carries English
 * and Malayalam — so with Hindi chosen, any string without a Hindi version shows in
 * English until translations are supplied (`pick` falls back).
 */
export type SecondLanguage = "hi" | "ml";

export const SECOND_LANGUAGE: SecondLanguage = "hi";

/** Each language named in its own script, so it is findable by someone who reads only that. */
export const LANGUAGE_NAME: Record<"en" | SecondLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  ml: "മലയാളം",
};
