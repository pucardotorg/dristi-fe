"use client";

import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The quiet controls every case register shares: filters, search and the row
 * action. They sit at the DS compact control height (36px, the Select and
 * Button `sm` size) and return to the 40px touch floor on phones.
 */
export const REGISTER_ALL = "all";

/** The label rides inside the trigger, so the filter names itself without a
 *  row of labels above the bar (ACCESSIBILITY 12: a visible label). */
export function RegisterFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className="w-auto max-w-full gap-1.5 max-sm:h-10"
      >
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={REGISTER_ALL}>All</SelectItem>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The DS Input has no `sm` size yet (docs/design/ds-requests.md), so the
 * compact height is set here, once, to match the filters beside it.
 */
export function RegisterSearch({
  label,
  value,
  onChange,
  className,
}: {
  /** Both the accessible name and the placeholder. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-9 pl-9 max-sm:h-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Outlined, so it stays readable on a hovered row, whose fill is close to a
 *  ghost button's own hover. */
export function RowViewButton({
  label,
  onClick,
}: {
  /** What the row is, for the accessible name: "View: Bail, 4 August 2025". */
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="-my-1.5"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      View<span className="sr-only">: {label}</span>
    </Button>
  );
}
