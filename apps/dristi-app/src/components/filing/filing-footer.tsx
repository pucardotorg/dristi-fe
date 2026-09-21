"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useInCorrection } from "@/components/filing/posture";
import { SavingIndicator } from "@/components/filing/saving-indicator";

/**
 * Sticky action bar under every filing screen: Back on the left, save state and the one
 * primary action on the right. Pass either `backHref`/`continueHref` (links) or
 * `onBack`/`onContinue` (handlers — used when a screen must validate first).
 */
export function FilingFooter({
  backHref,
  onBack,
  backLabel = "Back",
  continueHref,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  continueBlocked = false,
  continueVariant = "default",
  showSaveState = true,
  leading,
  extra,
  className,
}: {
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  continueHref?: string;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  /**
   * The step is not ready but the action stays focusable and clickable so pressing it can
   * explain why (aria-disabled + dimmed). Use with `onContinue`.
   */
  continueBlocked?: boolean;
  /** "outline" when another control on the screen is the focal action (ration teal). */
  continueVariant?: "default" | "outline";
  showSaveState?: boolean;
  /** Left-side status (e.g. "3 required documents still needed"); replaces Back's slot when Back is absent. */
  leading?: React.ReactNode;
  /** Extra controls between the save state and the primary action. */
  extra?: React.ReactNode;
  className?: string;
}) {
  /*
   * A correction round is not a walk through the filing: there is no Back / Continue,
   * and the one primary action is "Submit corrections to scrutiny" in the queue footer
   * (brief D14 — ration teal). So the walking footer stands down.
   */
  const inCorrection = useInCorrection();
  /* On a phone Back is the arrow alone (the label stays its accessible name), so the
     bar holds one line: Back, the save state, and a primary action wide enough to hit.
     From `sm` up it is the worded button it always was. */
  const backFace = (
    <>
      <ArrowLeftIcon data-icon="inline-start" aria-hidden className="max-sm:hidden" />
      <ArrowLeftIcon aria-hidden className="size-5 sm:hidden" />
      <span className="max-sm:sr-only">{backLabel}</span>
    </>
  );
  const BACK_CLASS = "max-sm:w-11 max-sm:shrink-0 max-sm:gap-0 max-sm:px-0";
  const back =
    backHref !== undefined ? (
      <Button asChild variant="outline" size="lg" className={BACK_CLASS}>
        <Link href={backHref}>{backFace}</Link>
      </Button>
    ) : onBack ? (
      <Button type="button" variant="outline" size="lg" onClick={onBack} className={BACK_CLASS}>
        {backFace}
      </Button>
    ) : null;

  const PRIMARY_CLASS = "max-sm:min-w-0 max-sm:flex-1";
  const primary =
    continueHref !== undefined && !continueDisabled ? (
      <Button asChild size="lg" variant={continueVariant} className={PRIMARY_CLASS}>
        <Link href={continueHref}>
          {continueLabel}
          <ArrowRightIcon data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    ) : (
      <Button
        type="button"
        size="lg"
        variant={continueVariant}
        onClick={onContinue}
        disabled={continueDisabled}
        aria-disabled={continueDisabled || continueBlocked || undefined}
        className={cn(PRIMARY_CLASS, continueBlocked && "opacity-50")}
      >
        {continueLabel}
        <ArrowRightIcon data-icon="inline-end" aria-hidden />
      </Button>
    );

  if (inCorrection) return null;

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-30 border-t border-hairline bg-card px-4 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] sm:px-6",
        className
      )}
    >
      {/* Phone: a status line (when a screen has one) over a single row of Back, the
          save state and the primary action. `contents` lifts Back and the status out of
          their group so the status can take the first line to itself. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:gap-3">
        <div className="contents min-w-0 items-center gap-3 sm:flex">
          {back}
          {leading ? (
            <div className="order-first flex w-full min-w-0 items-center sm:order-none sm:w-auto">
              {leading}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:ml-auto sm:flex-none sm:flex-wrap sm:gap-4">
          {showSaveState ? <SavingIndicator /> : null}
          {extra}
          {primary}
        </div>
      </div>
    </footer>
  );
}
