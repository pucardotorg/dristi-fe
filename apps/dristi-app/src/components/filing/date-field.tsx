"use client";

import * as React from "react";
import { CalendarDaysIcon } from "lucide-react";

import { dateToIso, isoToDate, toDisplayDate } from "@/lib/filing/format";
import type { ISODate } from "@/lib/filing/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useFieldReadOnly, useLockedDisabled } from "@/components/filing/posture";
import { ReadOnlyValue, SourceField, useSourceDocked } from "@/components/filing/inputs";

/**
 * Date control bound to an ISO string. Uses the DS DatePicker to pick. When the value was
 * machine-read (`prefilled`): docked (desktop) it stays the button that opens the source
 * rail and is corrected there, as it always has been; undocked (phone, tablet) it shows
 * the amber fill and edits, with the adjacent source button opening the sheet.
 */
export function DateField({
  value,
  onChange,
  prefilled = false,
  onViewSource,
  placeholder = "Pick date",
  ariaLabel,
  className,
  id,
}: {
  value: ISODate;
  onChange: (iso: ISODate) => void;
  prefilled?: boolean;
  onViewSource?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  id?: string;
}) {
  const disabled = useLockedDisabled();
  const readOnly = useFieldReadOnly();
  const docked = useSourceDocked();
  /* Flagged by scrutiny: a date picker has no read-only state, so the date reads as a
     value and the correction is made in the inset beneath it (brief §15.5). */
  if (readOnly) {
    return (
      <ReadOnlyValue
        id={id}
        value={toDisplayDate(value) || ""}
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }
  const amber = prefilled && !!value;
  /* Docked (desktop): the machine-read date is a button that opens the rail; the value is
     corrected from the source panel, unchanged from before. */
  if (amber && onViewSource && docked) {
    return (
      <Button
        id={id}
        type="button"
        variant="outline"
        onClick={onViewSource}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-description="Machine filled, not yet verified. Opens the source document."
        className={cn(
          "w-full justify-start gap-2 border-dashed border-warning-ink bg-prefilled font-normal hover:bg-prefilled",
          className
        )}
      >
        <CalendarDaysIcon data-icon="inline-start" aria-hidden />
        <span className="truncate">{toDisplayDate(value) || placeholder}</span>
      </Button>
    );
  }
  return (
    <SourceField onViewSource={amber && !docked ? onViewSource : undefined} disabled={disabled}>
    <DatePicker
      value={isoToDate(value)}
      onValueChange={(d) => onChange(dateToIso(d))}
      disabled={disabled}
      placeholder={placeholder}
      /* Locked in a correction round: the same quiet sunken fill as every other locked
         control (the correction screen restores full opacity; see its centre pane). */
      className={cn("w-full", amber && "border-dashed border-warning-ink bg-prefilled hover:bg-prefilled", disabled && "disabled:bg-surface-sunken", className)}
    />
    </SourceField>
  );
}
