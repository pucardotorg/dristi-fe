"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  continueHint,
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
  /**
   * Why it is not ready, on the control itself rather than as a sentence beside it — on
   * hover and on focus (owner, 2026-09-24). It needs `continueBlocked`, because a
   * `disabled` button fires no pointer events and would never show it.
   */
  continueHint?: string;
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
  const back =
    backHref !== undefined ? (
      <Button asChild variant="outline" size="lg">
        <Link href={backHref}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          {backLabel}
        </Link>
      </Button>
    ) : onBack ? (
      <Button type="button" variant="outline" size="lg" onClick={onBack}>
        <ArrowLeftIcon data-icon="inline-start" aria-hidden />
        {backLabel}
      </Button>
    ) : null;

  const blockedPrimary = (
    <Button
      type="button"
      size="lg"
      variant={continueVariant}
      onClick={onContinue}
      aria-disabled
      className="opacity-50"
    >
      {continueLabel}
      <ArrowRightIcon data-icon="inline-end" aria-hidden />
    </Button>
  );

  const primary =
    continueBlocked && continueHint ? (
      /* Radix opens it on focus as well as hover, and describes the button with it while
         it is open, so a keyboard reader hears the reason on the way past. */
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{blockedPrimary}</TooltipTrigger>
          <TooltipContent side="top">{continueHint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : continueHref !== undefined && !continueDisabled ? (
      <Button asChild size="lg" variant={continueVariant}>
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
        className={cn(continueBlocked && "opacity-50")}
      >
        {continueLabel}
        <ArrowRightIcon data-icon="inline-end" aria-hidden />
      </Button>
    );

  if (inCorrection) return null;

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-30 border-t border-hairline bg-card px-4 py-3 sm:px-6",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {back}
          {leading}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4">
          {showSaveState ? <SavingIndicator /> : null}
          {extra}
          {primary}
        </div>
      </div>
    </footer>
  );
}
