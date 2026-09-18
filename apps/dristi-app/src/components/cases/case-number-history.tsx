"use client";

import { HistoryIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Identifier } from "@/components/chrome/identifier";
import type { PastCaseNumber } from "@/lib/cases/header";
import { formatCaseDate } from "@/lib/cases/types";

/**
 * The older numbers this case has carried (DET-02). Renders nothing when the
 * case has only ever had one number. The icon keeps the number line's height;
 * the `after:` inset gives it the 40px target.
 */
export function CaseNumberHistory({ history }: { history: PastCaseNumber[] }) {
  if (history.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Earlier case numbers"
          className="relative size-6 text-muted-foreground after:absolute after:-inset-2"
        >
          <HistoryIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-body-compact">
        <PopoverHeader className="border-b border-hairline pb-2">
          <PopoverTitle className="text-body-compact font-semibold">
            Earlier case numbers
          </PopoverTitle>
        </PopoverHeader>
        <ul className="flex flex-col gap-3">
          {history.map((entry) => (
            <li key={entry.number} className="flex flex-col gap-0.5">
              <Identifier
                value={entry.number}
                label="earlier case number"
                className="self-start text-caption font-medium text-foreground"
              />
              {entry.generatedOn ? (
                <span className="text-caption text-muted-foreground">
                  Generated on {formatCaseDate(entry.generatedOn)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
