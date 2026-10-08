"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * A choice drawn as a card: the radio, then what the choice is. The recipe
 * registration's role picker uses (`registration-flow.tsx`), so a choice looks the same
 * wherever the product asks for one: hairline edge at rest, the brand edge and tint
 * once chosen, and the radio's dot saying so without colour.
 */
export function ChoiceCard({
  id,
  value,
  children,
  className,
}: {
  id: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex min-h-10 cursor-pointer items-start gap-3 rounded-lg border border-border p-4 font-normal transition-colors hover:bg-accent",
        "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-brand-muted has-data-[state=checked]:hover:bg-brand-muted-hover",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className,
      )}
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </Label>
  );
}
