"use client";

import * as React from "react";
import { CircleHelpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";

/**
 * The officer's standing checks. Visible in the case bar, never hover-gated, with
 * progress on the button itself — this is the paper notepad the interface has to
 * replace, so it cannot be hidden behind a menu.
 */
export function ChecksPopover() {
  const { checks } = useScrutinyCase();
  const [checked, setChecked] = React.useState<Set<number>>(() => new Set());

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Popover>
      {/* An icon button, not a labelled one: the checklist is a reference the officer
          reaches for, not a primary action, so it sits as a quiet "?" beside the history
          button and opens the same popover. The progress lives inside; the tooltip names
          it, since a label-less button must (owner, 2026-09-15). */}
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="What to check">
              <CircleHelpIcon />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>What to check</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72">
        <FieldGroup data-slot="checkbox-group" className="gap-2.5">
          {checks.map((check, i) => (
            <Field key={check} orientation="horizontal">
              <Checkbox
                id={`check-${i}`}
                checked={checked.has(i)}
                onCheckedChange={() => toggle(i)}
              />
              <FieldLabel htmlFor={`check-${i}`} className="font-normal">
                {check}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
