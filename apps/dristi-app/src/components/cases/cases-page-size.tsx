"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_PAGE_SIZE,
  PAGE_SIZES,
  isCasesPageSize,
  type CasesPageSize,
} from "@/lib/cases/query";

const ALL = "all";
const CUSTOM = "custom";

/**
 * How many rows the list shows at once. Lives next to the row count — that range is
 * what this changes. Changing it returns to page 1.
 *
 * Five presets, then **All** (one page, so the pagination goes away) and **Custom**,
 * which opens a small number box beside the select; a typed size is applied on Enter
 * or when the box loses focus, and shows as the select's own value from then on.
 */
export function CasesPageSizeSelect({
  value,
  onChange,
  id = "cases-page-size",
}: {
  value: CasesPageSize;
  onChange: (pageSize: CasesPageSize) => void;
  id?: string;
}) {
  const isPreset =
    typeof value === "number" && (PAGE_SIZES as readonly number[]).includes(value);
  const [customOpen, setCustomOpen] = React.useState(
    typeof value === "number" && !isPreset
  );
  const [draft, setDraft] = React.useState(
    typeof value === "number" ? String(value) : ""
  );

  const selected =
    value === ALL ? ALL : isPreset && !customOpen ? String(value) : CUSTOM;

  function commit() {
    const size = Number.parseInt(draft, 10);
    if (isCasesPageSize(size) && size !== value) onChange(size);
    else if (!isCasesPageSize(size)) setDraft(typeof value === "number" ? String(value) : "");
  }

  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className="text-body-compact font-normal text-muted-foreground"
      >
        Per page
      </Label>
      <Select
        value={selected}
        onValueChange={(next) => {
          if (next === ALL) {
            setCustomOpen(false);
            onChange(ALL);
            return;
          }
          if (next === CUSTOM) {
            setCustomOpen(true);
            setDraft(typeof value === "number" ? String(value) : "");
            return;
          }
          setCustomOpen(false);
          const size = Number.parseInt(next, 10);
          if (isCasesPageSize(size)) onChange(size);
        }}
      >
        <SelectTrigger id={id} className="text-body">
          <SelectValue>
            {selected === CUSTOM && typeof value === "number" && !isPreset
              ? value
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
          <SelectItem value={ALL}>All</SelectItem>
          <SelectItem value={CUSTOM}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {customOpen ? (
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_PAGE_SIZE}
          value={draft}
          aria-label="Rows per page"
          className="w-20 text-body tabular-nums"
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
      ) : null}
    </div>
  );
}
