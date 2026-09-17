"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The quiet controls every case register shares: filters, search and the row
 * action. They sit at the DS compact control height (36px, the Select and
 * Button `sm` size) and return to the 40px touch floor on phones.
 */
/**
 * One filter. The label rides inside the trigger, so the filter names itself
 * without a row of labels above the bar (ACCESSIBILITY 12: a visible label).
 * Any number of values can be on at once, so a reader can combine them freely;
 * none on means everything. The menu stays open while ticking.
 */
export function RegisterFilter({
  label,
  values,
  onChange,
  options,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const summary =
    values.length === 0
      ? "All"
      : values.length === 1
        ? (options.find((item) => item.value === values[0])?.label ?? "1")
        : `${values.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-full gap-1.5 font-normal max-sm:h-10"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="truncate font-medium">{summary}</span>
          <ChevronDownIcon
            aria-hidden
            className="text-muted-foreground"
            data-icon="inline-end"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-max min-w-44 overflow-y-auto whitespace-nowrap"
      >
        {options.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.value}
            checked={values.includes(item.value)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...values, item.value]
                  : values.filter((value) => value !== item.value)
              )
            }
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-9 pl-8 max-sm:h-10"
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
