"use client";

import { LandmarkIcon } from "lucide-react";

import { useCourt } from "@/components/court/court-provider";
import { cn } from "@/lib/utils";

/**
 * The 24×7 ON Courts brand marks — or, when Settings runs the app as another state's
 * court, that state's placeholder (`PlaceholderMark`).
 *
 * These are product brand assets, not design-system primitives — the SVGs live in
 * `public/brand`. Two files per mark so the artwork itself carries the right ink in
 * each theme; the wrong-theme copy stays in the DOM but is hidden with the `dark:`
 * variant (class-based dark mode), so no runtime theme read is needed.
 *
 * `BrandLockup` is the full wordmark (used wherever there is room); `BrandGlyph` is
 * the mark alone (used in the collapsed sidebar rail). Size is set by the caller via
 * height utilities so both stay crisp at any scale. `onDark` pins the light-ink
 * artwork for surfaces that stay dark in both themes (the sign-in canvas plate),
 * where the theme-driven swap would otherwise show the dark-ink copy in light mode.
 */

const LABEL = "24×7 ON Courts";

function Mark({
  base,
  onDark,
  className,
}: {
  base: string;
  onDark: boolean;
  className?: string;
}) {
  return (
    <span role="img" aria-label={LABEL} className={cn("inline-flex", className)}>
      {onDark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${base}-dark.svg`} alt="" aria-hidden className="block h-full w-auto" />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}.svg`} alt="" aria-hidden className="block h-full w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}-dark.svg`}
            alt=""
            aria-hidden
            className="hidden h-full w-auto dark:block"
          />
        </>
      )}
    </span>
  );
}

/**
 * Another state's mark, until that state sends its own (owner, 2026-10-08): a dashed
 * square standing where the logo will go, and the state's name as the wordmark.
 *
 * Drawn in `currentColor` throughout, so it takes the ink of whatever plate it sits on —
 * the charcoal rail, the brand canvas, a light header — with no `onDark` artwork of its
 * own to keep in step. The dashed edge is what says "placeholder": a filled tile would
 * read as a finished logo, and a stakeholder screenshot must not mistake it for one.
 */
function PlaceholderGlyph() {
  return (
    <span className="flex aspect-square h-full shrink-0 items-center justify-center rounded-md border-2 border-dashed border-current">
      <LandmarkIcon className="size-3/5" aria-hidden />
    </span>
  );
}

function PlaceholderMark({
  state,
  wordmark,
  className,
}: {
  state: string;
  wordmark: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${state} Courts`}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <PlaceholderGlyph />
      {wordmark ? (
        <span aria-hidden className="text-title-s font-semibold whitespace-nowrap">
          {state}
        </span>
      ) : null}
    </span>
  );
}

export function BrandLockup({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { profile } = useCourt();
  if (profile.placeholderBrand) {
    return <PlaceholderMark state={profile.state} wordmark className={className} />;
  }
  return <Mark base="/brand/on-courts-logo" onDark={onDark} className={className} />;
}

export function BrandGlyph({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { profile } = useCourt();
  if (profile.placeholderBrand) {
    return <PlaceholderMark state={profile.state} wordmark={false} className={className} />;
  }
  return <Mark base="/brand/on-courts-glyph" onDark={onDark} className={className} />;
}
