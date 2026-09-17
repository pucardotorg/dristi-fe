"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

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
