"use client";

import { LandmarkIcon } from "lucide-react";

import { useCourt } from "@/components/court/court-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { COURT_IDS, courtProfile, isCourtId } from "@/lib/court/profiles";

/**
 * Which state's court the whole app runs as — one quiet icon beside the Settings title in
 * the top bar.
 *
 * It used to be a Settings section of four choice cards, each spelling out what it would
 * change. The owner wanted it kept out of the way (2026-10-08): this is a deployment
 * switch for demos, not something an advocate sets, so it is a court icon beside the
 * Settings title that opens a menu of the four states. The menu names the state alone; the
 * screens behind it say the rest the moment the choice is made.
 *
 * The visible button is 32px, small enough to stay quiet; the `after:` inset widens its
 * hit area to the 40px the DS asks of a touch target.
 *
 * `data-court-raw` keeps the text layer from re-voicing the other states' names into the
 * selected one's.
 */
export function CourtSwitch({
  className,
  side = "bottom",
  align = "end",
}: {
  className?: string;
  side?: "top" | "bottom";
  align?: "start" | "end";
}) {
  const { court, setCourt } = useCourt();
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Switch court"
              className={cn("relative after:absolute after:-inset-1", className)}
            >
              <LandmarkIcon className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={side}>Switch court</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side={side} align={align} className="w-auto min-w-48">
        <DropdownMenuLabel>Court</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          data-court-raw=""
          value={court}
          onValueChange={(next) => {
            if (isCourtId(next)) setCourt(next);
          }}
        >
          {COURT_IDS.map((id) => (
            <DropdownMenuRadioItem key={id} value={id}>
              {courtProfile(id).state}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
