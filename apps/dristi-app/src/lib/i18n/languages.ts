/**
 * The languages DRISTI can speak, and the pair the top bar offers.
 *
 * English is always the first half of the language toggle (owner, 2026-09-30). The
 * second half is the person's choice, from the Indian languages below, and defaults to
 * the state's own language: this deployment is Kerala, so Malayalam. A state is a
 * deployment, not a setting, so the default lives here as a constant rather than in
 * anything the person can change.
 *
 * Copy is written as a per-language map with English as the fallback (see
 * `Copy` in `lib/onboarding/content.ts`). A language with no line for a string shows
 * the English line, so choosing a language never leaves a blank on the page.
 *
 * Right-to-left scripts (Urdu, Kashmiri) are left out on purpose: they need a
 * direction pass across the whole shell of their own.
 */

export const LOCALE_CODES = [
  "en",
  "hi",
  "ml",
  "ta",
  "te",
  "kn",
  "mr",
  "gu",
  "bn",
  "pa",
  "or",
] as const;

export type Locale = (typeof LOCALE_CODES)[number];

/** Every language except English: the ones that can be the toggle's second half. */
export type SecondLocale = Exclude<Locale, "en">;

export type Language = {
  code: Locale;
  /** The language's name in English, for the person who does not read its script. */
  english: string;
  /** The language's name in its own script, which is how people find their language. */
  native: string;
  /** One line in the language, so the person can see it is the one they read. */
  sample: string;
  /** The tag `Intl` formats dates and numbers with. */
  intl: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", english: "English", native: "English", sample: "Your cases and hearings, in one place.", intl: "en-IN" },
  { code: "hi", english: "Hindi", native: "हिन्दी", sample: "आपके मामले और सुनवाई, एक ही जगह।", intl: "hi-IN" },
  { code: "ml", english: "Malayalam", native: "മലയാളം", sample: "നിങ്ങളുടെ കേസുകളും വാദങ്ങളും ഒരിടത്ത്.", intl: "ml-IN" },
  { code: "ta", english: "Tamil", native: "தமிழ்", sample: "உங்கள் வழக்குகளும் விசாரணைகளும் ஒரே இடத்தில்.", intl: "ta-IN" },
  { code: "te", english: "Telugu", native: "తెలుగు", sample: "మీ కేసులు, విచారణలు ఒకే చోట.", intl: "te-IN" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ", sample: "ನಿಮ್ಮ ಪ್ರಕರಣಗಳು ಮತ್ತು ವಿಚಾರಣೆಗಳು ಒಂದೇ ಕಡೆ.", intl: "kn-IN" },
  { code: "mr", english: "Marathi", native: "मराठी", sample: "तुमचे खटले आणि सुनावण्या, एकाच ठिकाणी.", intl: "mr-IN" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી", sample: "તમારા કેસ અને સુનાવણી, એક જ જગ્યાએ.", intl: "gu-IN" },
  { code: "bn", english: "Bengali", native: "বাংলা", sample: "আপনার মামলা ও শুনানি, এক জায়গায়।", intl: "bn-IN" },
  { code: "pa", english: "Punjabi", native: "ਪੰਜਾਬੀ", sample: "ਤੁਹਾਡੇ ਕੇਸ ਅਤੇ ਸੁਣਵਾਈਆਂ, ਇੱਕ ਥਾਂ ਤੇ।", intl: "pa-IN" },
  { code: "or", english: "Odia", native: "ଓଡ଼ିଆ", sample: "ଆପଣଙ୍କ ମାମଲା ଓ ଶୁଣାଣି, ଗୋଟିଏ ସ୍ଥାନରେ।", intl: "or-IN" },
];

/** The state's own language, the toggle's second half until the person picks another. */
export const STATE_SECOND_LOCALE: SecondLocale = "ml";

/** Languages with more than a handful of lines written, for the demo (owner, Sept 30). */
export const DEMO_TRANSLATED: Locale[] = ["en", "ml", "hi", "ta", "bn"];

export function isLocale(value: string | null | undefined): value is Locale {
  return (LOCALE_CODES as readonly string[]).includes(value ?? "");
}

export function isSecondLocale(value: string | null | undefined): value is SecondLocale {
  return isLocale(value) && value !== "en";
}

export function languageOf(code: Locale): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

/** Storage keys. Language is a preference, so it is remembered (unlike demo actions). */
export const LOCALE_KEY = "dristi-locale";
export const SECOND_LOCALE_KEY = "dristi-second-locale";
