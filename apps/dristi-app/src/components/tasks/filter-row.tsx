"use client";

import * as React from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import { DUE_LABELS, type DueFilter, type Filters } from "@/lib/tasks/selectors";
import type { Person } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { AppliedChip } from "@/components/shell/applied-chip";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DUES: DueFilter[] = ["any", "overdue", "today", "week", "before-hearing"];

/** Radix Select reserves "" for the placeholder, so "all" stands in for it. */
const ALL = "all";

/**
 * The list's own search — local to this screen, not app chrome (owner, 2026-08-24).
 *
 * It used to live in the global top bar and only *render* on this route, which is a
 * local search wearing chrome's clothes: it looked app-wide, sat far from the list it
 * narrowed, and vanished on every other page. Here it sits beside the thing it filters.
 * Typing echoes locally and the URL follows after a pause, so keystrokes never pile up
 * history or jump the page; `/` still focuses it.
 */
function SearchBox({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [text, setText] = React.useState(query);
  // When the URL changes underneath (Clear, back/forward), follow it.
  const [seen, setSeen] = React.useState(query);
  if (seen !== query) {
    setSeen(query);
    setText(query);
  }

  React.useEffect(() => {
    if (text === query) return;
    const t = window.setTimeout(() => onChange(text), 200);
    return () => window.clearTimeout(t);
  }, [text, query, onChange]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      event.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <InputGroup className="w-full sm:w-64">
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        type="search"
        aria-label="Search these tasks"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search case or task"
        autoComplete="off"
        enterKeyHint="search"
      />
      <InputGroupAddon align="inline-end" className={text ? "hidden" : "max-sm:hidden"}>
        <Kbd aria-hidden>/</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** A labelled control inside the peek — label above, full-width control below. */
function PeekField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-body-compact font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * The task list's one control row: search, a way in to the filters, then whatever is
 * currently applied.
 *
 *   · **No sort control.** The list is always most-urgent first (`sortTasks`); the
 *     alternatives it once offered were table conventions, not needs.
 *   · **Search is local**, beside the list it narrows — see `SearchBox`.
 *   · **The three selects live in a peek.** Due · Court · Advocate sat on screen at
 *     their defaults on nearly every visit, costing a row of height for controls almost
 *     nobody had touched.
 *   · **What is applied never hides.** The old row's rule — an applied filter is always
 *     visible — was right: a filter you cannot see is a short list you cannot explain.
 *     The *controls* fold away and the *state* does not: every active filter stays out
 *     here as a removable chip, and the trigger carries a count.
 */
export function FilterRow({
  filters,
  courts,
  people,
  narrowed,
  onChange,
  onClear,
}: {
  filters: Filters;
  courts: string[];
  people: Person[];
  /** Whether anything (including a pressed card or the search) narrows the view. */
  narrowed: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  /* What the peek holds — the pressed card and the search live outside it, so they are
     not counted here; each shows its own chip or its own box. */
  const applied = [
    filters.due !== "any",
    filters.court !== "",
    filters.advocate !== "",
  ].filter(Boolean).length;

  const advocateName = people.find((p) => p.id === filters.advocate)?.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox query={filters.query} onChange={(q) => onChange({ query: q })} />

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" aria-label={`Filters${applied ? `, ${applied} applied` : ""}`}>
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
            Filters
            {applied ? (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-medium tabular-nums text-primary-foreground">
                {applied}
              </span>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-title-s font-semibold">Filters</SheetTitle>
            <SheetDescription className="text-body-compact">
              Narrow the list. Anything you set stays visible on the row behind this.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4">
            <PeekField id="filter-due" label="Due">
              <Select value={filters.due} onValueChange={(v) => onChange({ due: v as DueFilter })}>
                <SelectTrigger id="filter-due" className="w-full" aria-label="Due">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DUE_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PeekField>

            <PeekField id="filter-court" label="Court">
              <Select
                value={filters.court || ALL}
                onValueChange={(v) => onChange({ court: v === ALL ? "" : v })}
              >
                <SelectTrigger id="filter-court" className="w-full" aria-label="Court">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All courts</SelectItem>
                  {courts.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PeekField>

            <PeekField id="filter-advocate" label="Advocate">
              <Select
                value={filters.advocate || ALL}
                onValueChange={(v) => onChange({ advocate: v === ALL ? "" : v })}
              >
                <SelectTrigger
                  id="filter-advocate"
                  className="w-full"
                  aria-label="Advocate on the case"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Anyone on the case</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PeekField>
          </div>

          <SheetFooter>
            {narrowed ? (
              <Button variant="outline" onClick={onClear}>
                Clear all filters
              </Button>
            ) : null}
            <SheetClose asChild>
              <Button>Show the tasks</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Applied state, always out here — the peek hides controls, never what is on.
          The kind is not among these: it has its own pill row directly above, and a
          pressed pill saying "Pay" over a chip saying "Pay" was the same state twice
          (2026-09-15). Everything the sheet hides still reports itself here. */}
      {filters.due !== "any" ? (
        <AppliedChip label={DUE_LABELS[filters.due]} onClear={() => onChange({ due: "any" })} />
      ) : null}
      {filters.court ? (
        <AppliedChip label={filters.court} onClear={() => onChange({ court: "" })} />
      ) : null}
      {filters.advocate ? (
        <AppliedChip
          label={advocateName ?? "Advocate"}
          onClear={() => onChange({ advocate: "" })}
        />
      ) : null}

      {narrowed ? (
        <Button variant="ghost" onClick={onClear} className={cn("text-muted-foreground")}>
          <XIcon data-icon="inline-start" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
