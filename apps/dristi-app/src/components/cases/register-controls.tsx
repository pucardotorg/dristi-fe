"use client";

import { useCallback, useEffect, useState } from "react";
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
          // On a phone or a tablet held upright the filter fills its grid cell (see `REGISTER_FILTER_ROW`),
          // label and value at the start, chevron at the far end.
          className="h-10 w-full max-w-full justify-between gap-1.5 font-normal md:pointer-fine:h-9 md:pointer-fine:w-auto md:pointer-fine:justify-center md:landscape:h-9 md:landscape:w-auto md:landscape:justify-center"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground">{label}</span>
            <span className="truncate font-medium">{summary}</span>
          </span>
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
    <div
      className={cn(
        "relative w-full md:pointer-fine:w-64 md:landscape:w-64",
        className
      )}
    >
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-10 pl-8 md:pointer-fine:h-9 md:landscape:h-9"
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

/**
 * The row a reader just came back from. Closing a record leaves a teal outline
 * on its row, so the eye finds the place it left, above all after arriving by
 * a link from another tab. It is a pointer, not a state: the next click or key
 * press anywhere clears it.
 */
export function useRecentRow() {
  const [recentId, setRecentId] = useState<string | null>(null);

  useEffect(() => {
    if (recentId === null) return;
    const clear = () => setRecentId(null);
    /* Armed on the next frame, so the click that closed the record does not
       also clear the mark it just set. */
    const frame = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", clear, { once: true });
      document.addEventListener("keydown", clear, { once: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", clear);
      document.removeEventListener("keydown", clear);
    };
  }, [recentId]);

  /** Bring the marked row into view; a long register may have scrolled. */
  const recentRowRef = useCallback((node: HTMLTableRowElement | null) => {
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  return { recentId, markRecent: setRecentId, recentRowRef };
}

/** On the `tr`: an outline draws around the whole row without moving it. */
export const RECENT_ROW =
  "rounded-lg outline -outline-offset-1 outline-primary";
