/**
 * Display and accessibility preferences (Settings › Display and accessibility).
 *
 * These are the person's own choices about how the product reads, so they are
 * remembered across visits, unlike demo actions, which reset on refresh. Theme lives
 * with next-themes (it already persists under its own key); the rest live here.
 */

/**
 * Text size scales the page's root size, so every rem-based token (type, spacing,
 * controls) grows together and the layout keeps its proportions (owner, Sept 30).
 * The steps stop at 125%: the WCAG 200% zoom requirement is met by the browser's own
 * zoom, and this is a comfort setting on top of it, not a replacement for it.
 */
export const TEXT_SIZES = [
  { id: "default", scale: "100%" },
  { id: "large", scale: "112.5%" },
  { id: "larger", scale: "125%" },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]["id"];

export function isTextSize(value: string | null): value is TextSize {
  return TEXT_SIZES.some((size) => size.id === value);
}

export function textScale(size: TextSize): string {
  return TEXT_SIZES.find((entry) => entry.id === size)?.scale ?? "100%";
}

/**
 * How long a quiet session lasts before sign-out. A longer limit is the WCAG 2.2.1
 * "timing adjustable" remedy for people who read or type slowly; the warning before it
 * is the DS `SessionTimeout` dialog. The product has no live session yet, so this is
 * stored and shown, and takes effect when sign-in does.
 */
export const SIGN_OUT_AFTER = ["15", "30", "60"] as const;

export type SignOutAfter = (typeof SIGN_OUT_AFTER)[number];

export function isSignOutAfter(value: string | null): value is SignOutAfter {
  return (SIGN_OUT_AFTER as readonly string[]).includes(value ?? "");
}

export const TEXT_SIZE_KEY = "dristi-text-size";
export const SIGN_OUT_AFTER_KEY = "dristi-sign-out-after";
