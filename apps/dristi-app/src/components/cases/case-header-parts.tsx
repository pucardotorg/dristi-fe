"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";

import { Identifier } from "@/components/chrome/identifier";
import type { PastCaseNumber } from "@/lib/cases/header";
import { cn } from "@/lib/utils";
import { CaseNumberHistory } from "./case-number-history";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Back to the cases list. Full-strength ink, so it reads as the way out. */
export function CaseBackButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            asChild
            className="relative -ml-2 text-foreground after:absolute after:-inset-1 [&_svg]:size-4"
          >
            <Link href="/cases" aria-label="Back to cases">
              <ArrowLeftIcon aria-hidden />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to cases</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * The case number with its history icon riding right behind it.
 *
 * `Identifier` reserves a 14px box after the value for its copy glyph, so a
 * sibling placed after it reads as detached from the number. The history icon
 * rests pulled back over that empty box, and steps aside by the same 14px when
 * the number is hovered, focused or showing its "Copied" tick, which is exactly
 * when the glyph needs the room.
 *
 * Transform only, 180ms on a strong ease-out: the icon should already be out of
 * the way by the time the glyph has faded in, and settle rather than stop. The
 * pull-back only applies when the number rendered as a button. Without a
 * clipboard it is a plain span with no reserved box, and the icon sits where
 * the layout puts it.
 */
export function CaseNumberLine({
  caseNumber,
  history,
  className,
}: {
  caseNumber: string;
  history: PastCaseNumber[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-body-compact font-medium text-muted-foreground",
        className
      )}
    >
      <Identifier
        value={caseNumber}
        label="case number"
        className="peer/number"
      />
      <span
        className={cn(
          "flex transition-transform duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          "peer-[:is(button)]/number:-translate-x-3.5",
          "peer-[:is(button):hover]/number:translate-x-0",
          "peer-[:is(button):focus-visible]/number:translate-x-0",
          "peer-[:is(button)[title=Copied]]/number:translate-x-0"
        )}
      >
        <CaseNumberHistory history={history} />
      </span>
    </span>
  );
}

/**
 * The main stage and any sub stages, each naming what it is on hover. The
 * "Stage" label above already says it without a pointer, so the tooltip only
 * tells the two kinds apart.
 */
export function CaseStageBadges({
  stage,
  subStages,
}: {
  stage: ReactNode;
  subStages: string[];
}) {
  return (
    <TooltipProvider>
      <span className="flex flex-wrap items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{stage}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Case stage</TooltipContent>
        </Tooltip>
        {/* A chevron, not a slash: a slash reads as "either", a chevron as
            "inside". One is enough; the sub stages after it are siblings. */}
        {subStages.length > 0 ? (
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        ) : null}
        {subStages.map((label) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Badge variant="outline">{label}</Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">Case sub stage</TooltipContent>
          </Tooltip>
        ))}
      </span>
    </TooltipProvider>
  );
}
