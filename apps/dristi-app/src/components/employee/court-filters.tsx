"use client";

import * as React from "react";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";

import { QueueSearchField } from "@/components/employee/queue-search-field";
import { AppliedChip } from "@/components/shell/applied-chip";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CSSProperties } from "react";

/**
 * The court side's one filter surface — search inline, everything else behind a Filters
 * button that opens a right-hand sheet (owner, 2026-09-15). It is the advocate Cases pattern
 * (`components/cases/cases-filters.tsx`) generalised for the court queues, so every list
 * folds its controls the same way: the free text stays on the row where it is typed and
 * filters live; the structured filters — a handful of single selects, and on some screens a
 * date — fold into the sheet, which edits a draft and hands the whole draft over on Apply so
 * the list does not reshuffle under the sheet on every change. What is applied is spelled out
 * in removable chips on the row, because a folded control must never hide a narrowed list.
 *
 * A screen wires its own filter state through `fields` (and optionally `date`); the component
 * owns the button, the count, the sheet, the draft and the chips. The button's badge counts
 * what is applied, not the draft.
 */
export type CourtFilterOption = { value: string; label: string };

export type CourtFilterField = {
  /** Stable id — the control's `id`/`htmlFor`, and the draft key. */
  id: string;
  /** Visible label, e.g. "Status". */
  label: string;
  /** The applied value. */
  value: string;
  /** The value that means "no filter" — usually `"all"`, sometimes `"any"`. */
  all: string;
  /** The all-option's label, e.g. "All statuses". */
  allLabel: string;
  /** Options *excluding* the all-option (which is rendered from `allLabel`). */
  options: CourtFilterOption[];
  /** Commit this field's value (called on Apply with the draft value). */
  onApply: (value: string) => void;
};

export type CourtFilterDate = {
  label: string;
  /** The applied date; seeds the draft. */
  value: Date | undefined;
  /** Is a date applied right now — drives the chip and the count. */
  active: boolean;
  /** Chip text when active. */
  chipLabel: string;
  /** Does this draft value count as an active filter (for the in-sheet count)? */
  draftActive: (value: Date | undefined) => boolean;
  /** What the draft date becomes when the sheet's Clear is pressed. */
  cleared: Date | undefined;
  /** Commit the chosen date. */
  onApply: (value: Date | undefined) => void;
};

/** The case peek's motion: a full slide from the right, no dissolve (matches the advocate). */
const SHEET_MOTION = {
  "--tw-enter-opacity": "1",
  "--tw-exit-opacity": "1",
  "--tw-enter-translate-x": "100%",
  "--tw-exit-translate-x": "100%",
} as CSSProperties;

export function CourtFilters({
  search,
  searchRef,
  fields,
  date,
  onClearAll,
}: {
  search: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Enter in the box — a screen's fast path (e.g. sign process' reconcile-by-number). */
    onSubmit?: () => void;
  };
  /** The search input's ref — a top-level prop, not a field of `search`: the react-hooks/refs
      lint reads any object holding a ref as a ref and flags every access to it during render,
      so the ref is forwarded on its own where passing it to a child `ref=` is allowed. */
  searchRef?: React.Ref<HTMLInputElement>;
  fields: CourtFilterField[];
  date?: CourtFilterDate;
  /** Reset every filter (fields, date and the search) back to the screen's default. */
  onClearAll: () => void;
}) {
  const appliedFields = fields.filter((field) => field.value !== field.all);
  const applied = appliedFields.length + (date?.active ? 1 : 0);
  const controls = fields.length + (date ? 1 : 0);

  /* Wrapped in a form only where Enter is a fast path — a lone search input inside a
     `<form>` submits implicitly, so screens without an `onSubmit` render the box bare rather
     than swallow an Enter that would reload the page. */
  const searchNode = search.onSubmit ? (
    <form
      className="min-w-0 sm:w-80"
      onSubmit={(event) => {
        event.preventDefault();
        search.onSubmit?.();
      }}
    >
      <QueueSearchField
        label={search.label}
        className="w-full"
        ref={searchRef}
        value={search.value}
        onChange={search.onChange}
        placeholder={search.placeholder}
      />
    </form>
  ) : (
    <QueueSearchField
      label={search.label}
      className="sm:w-80"
      ref={searchRef}
      value={search.value}
      onChange={search.onChange}
      placeholder={search.placeholder}
    />
  );

  /* One filter is not worth a button and a sheet: a control hidden behind a click when it is
     the only one is a worse pattern than just showing it (owner, 2026-09-15). At a single
     control (or none) the filter sits on the row beside the search and applies as it is
     changed — no draft, no chips; the sheet, its count and the chips only earn their place
     once there are two or more to fold away. Screens whose control count varies by state —
     sign process, by stage — cross this line on their own. */
  if (controls <= 1) {
    const only = fields[0];
    return (
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        {searchNode}
        {only ? (
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={only.id} className="text-body-compact">
              {only.label}
            </Label>
            <Select value={only.value} onValueChange={only.onApply}>
              <SelectTrigger id={only.id} className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={only.all}>{only.allLabel}</SelectItem>
                {only.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : date ? (
          <div className="flex min-w-0 flex-col gap-2">
            <span
              id="court-filter-date"
              className="w-fit text-body-compact font-medium"
            >
              {date.label}
            </span>
            <div role="group" aria-labelledby="court-filter-date">
              <DatePicker
                key={date.active ? "set" : "any"}
                value={date.value}
                onValueChange={(next) => date.onApply(next ?? undefined)}
                className="w-full sm:w-52"
              />
            </div>
          </div>
        ) : null}
        {applied > 0 || search.value !== "" ? (
          <Button type="button" variant="ghost" onClick={onClearAll}>
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        {searchNode}
        <CourtFiltersSheet fields={fields} date={date} applied={applied} />
      </div>

      {/* What is applied stays out on the row as removable chips — a folded control must not
          hide a narrowed list. Search is not a chip; it sits in its own box above. */}
      {applied > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Applied filters"
        >
          {appliedFields.map((field) => (
            <AppliedChip
              key={field.id}
              label={
                field.options.find((option) => option.value === field.value)
                  ?.label ?? field.value
              }
              onClear={() => field.onApply(field.all)}
            />
          ))}
          {date?.active ? (
            <AppliedChip
              label={date.chipLabel}
              onClear={() => date.onApply(undefined)}
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            <XIcon data-icon="inline-start" aria-hidden />
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CourtFiltersSheet({
  fields,
  date,
  applied,
}: {
  fields: CourtFilterField[];
  date?: CourtFilterDate;
  applied: number;
}) {
  const seed = React.useCallback(
    () => ({
      fields: Object.fromEntries(fields.map((field) => [field.id, field.value])),
      date: date?.value,
    }),
    [fields, date],
  );

  const [draft, setDraft] = React.useState(seed);
  /* The DS `DatePicker` treats `value === undefined` as "uncontrolled, keep my own", so a
     draft set back to no date cannot clear it by prop alone — the control is remounted with
     a bumped key, the sign screens' own trick. */
  const [dateKey, setDateKey] = React.useState(0);

  const draftFieldCount = fields.filter(
    (field) => (draft.fields[field.id] ?? field.all) !== field.all,
  ).length;
  const draftCount =
    draftFieldCount + (date && date.draftActive(draft.date) ? 1 : 0);

  function apply() {
    for (const field of fields) {
      const next = draft.fields[field.id] ?? field.all;
      if (next !== field.value) field.onApply(next);
    }
    if (date) date.onApply(draft.date);
  }

  function clearDraft() {
    setDraft({
      fields: Object.fromEntries(fields.map((field) => [field.id, field.all])),
      date: date?.cleared,
    });
    setDateKey((key) => key + 1);
  }

  return (
    <Sheet onOpenChange={(next) => next && setDraft(seed())}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          aria-label={`Filters${applied ? `, ${applied} applied` : ""}`}
        >
          <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
          Filters
          {applied ? (
            <span className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-medium tabular-nums text-primary-foreground">
              {applied}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="w-full duration-300 ease-out sm:max-w-sm"
        style={SHEET_MOTION}
      >
        <SheetHeader>
          <SheetTitle className="text-title-s font-semibold">Filters</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          {fields.map((field) => (
            <div key={field.id} className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={field.id} className="text-body-compact">
                {field.label}
              </Label>
              <Select
                value={draft.fields[field.id] ?? field.all}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    fields: { ...current.fields, [field.id]: value },
                  }))
                }
              >
                <SelectTrigger id={field.id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={field.all}>{field.allLabel}</SelectItem>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {date ? (
            // `DatePicker` owns its trigger and takes no `id`, so the label names a group
            // around it rather than pointing `htmlFor` at a control that does not exist.
            <div className="flex min-w-0 flex-col gap-2">
              <span
                id="court-filter-date"
                className="w-fit text-body-compact font-medium"
              >
                {date.label}
              </span>
              <div role="group" aria-labelledby="court-filter-date">
                <DatePicker
                  key={dateKey}
                  value={draft.date}
                  onValueChange={(next) =>
                    setDraft((current) => ({ ...current, date: next ?? undefined }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-hairline">
          {draftCount ? (
            <Button type="button" variant="ghost" onClick={clearDraft}>
              Clear filters
            </Button>
          ) : (
            <span />
          )}
          <SheetClose asChild>
            <Button type="button" onClick={apply}>
              Apply filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
