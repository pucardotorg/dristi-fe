"use client";

import * as React from "react";

import type { YesNo } from "@/lib/filing/types";
import { cn } from "@/lib/utils";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { useFieldReadOnly, useLockedDisabled } from "@/components/filing/posture";
import { ReadOnlyValue } from "@/components/filing/inputs";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * Single-choice segmented control (Yes / No / Maybe…) for filing forms. A thin wrapper
 * over the DS SegmentedControl that adds the filing posture rules: locked answers stay
 * visible but disabled, and read-only renders as a value instead of a control.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  disabled = false,
  size = "default",
  className,
}: {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
  /** `compact` is the DS's sleeker well (top bar, Documents). Same 40px target. */
  size?: "default" | "compact";
  /** The answer is settled by another answer — shown, not hidden, so the person sees why. */
  disabled?: boolean;
  className?: string;
}) {
  const isDisabled = useLockedDisabled(disabled);
  const readOnly = useFieldReadOnly();
  /* Flagged by scrutiny: the chosen answer reads as a value — a toggle group cannot be
     read-only without going inert, and inert is not focusable (brief §15.5). */
  if (readOnly) {
    const chosen = options.find((o) => o.value === value);
    return (
      <ReadOnlyValue value={chosen?.label ?? value ?? ""} ariaLabel={ariaLabel} className="w-fit min-w-32" />
    );
  }
  return (
    <div className="flex">
      <SegmentedControl
        type="single"
        size={size}
        value={value}
        onValueChange={(v) => {
          if (v) onValueChange(v as T);
        }}
        aria-label={ariaLabel}
        disabled={isDisabled}
        className={cn("w-fit", className)}
      >
        {options.map((o) => (
          <SegmentedControlItem key={o.value} value={o.value}>
            {o.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}

const YES_NO: SegmentedOption<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function YesNoSegmented({
  value,
  onValueChange,
  ariaLabel,
  disabled = false,
}: {
  value: YesNo | undefined;
  onValueChange: (value: YesNo) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Segmented
      value={value}
      onValueChange={onValueChange}
      options={YES_NO}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );
}
