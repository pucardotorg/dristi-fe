import { pick, type Locale } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "./content";

/** "Passed over", with the day when the matter was carried over from an earlier one. */
export function passedOverLabel(on: string | null, locale: Locale): string {
  if (!on) return pick(advHome.statusPassedOver, locale);
  const date = new Intl.DateTimeFormat(locale === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(on));
  return fillCopy(advHome.statusPassedOverOn, locale, { date });
}
