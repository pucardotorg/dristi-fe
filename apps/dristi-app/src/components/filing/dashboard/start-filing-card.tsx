"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, CreditCardIcon, FilePlusIcon, SearchIcon } from "lucide-react";

import { CASE_TYPE } from "@/lib/filing/options";
import { NEW_FILING } from "@/lib/filing/steps";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { PANEL_CLASS } from "@/components/filing/form-card";

/**
 * Case types DRISTI does not file yet.
 *
 * The wireframe listed 21 pressable types with personal filing counts. DRISTI files one,
 * so these are a *reference* list, not an inventory: no chevron, no action, and a heading
 * that says what they are. Twenty buttons that cannot be pressed is the defect this
 * screen was redesigned to remove, and it does not improve by being searchable.
 */
const NOT_YET: string[] = [
  "Civil money suit",
  "Consumer dispute",
  "Rent control: eviction / rent recovery",
  "Money recovery",
  "Maintenance (S-125 BNSS)",
  "Domestic violence (PWDVA)",
  "Motor accident claim (MACT)",
  "Succession certificate",
  "Land / property dispute",
  "Execution petition",
  "Partition suit",
  "Injunction suit",
  "Guardianship",
  "Divorce / matrimonial",
  "Bail application",
  "Private criminal complaint",
  "Company / commercial dispute",
  "Labour / industrial dispute",
  "Probate",
  "Arbitration petition",
];

/**
 * The one filing that can actually be started, and an honest account of what cannot.
 *
 * `filedCount` is the person's own filed cheque-bounce complaints — a real number off
 * their drafts, not the wireframe's "128 filed by you", which had no source.
 */
export function StartFilingCard({ filedCount }: { filedCount: number | null }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? NOT_YET.filter((name) => name.toLowerCase().includes(q)) : NOT_YET;
  }, [query]);

  return (
    <Card className={cn(PANEL_CLASS, "gap-0 pb-3")}>
      <CardHeader className="flex flex-row items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground"
        >
          <FilePlusIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-body font-semibold">Start a new filing</CardTitle>
          <CardDescription className="text-body-compact">
            Step by step: parties, documents, then the court fee.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-1 pt-4">
        {/* The row and the trigger below carry 12px of their own padding; pulled out by
            the same 12px, their icon and label stand on the header icon's edge. */}
        <Link
          href={NEW_FILING}
          className="group -mx-3 flex items-center gap-3 rounded-lg bg-brand-muted/50 p-3 ring-1 ring-transparent transition-[background-color,box-shadow] ring-inset hover:bg-brand-muted/75 hover:ring-primary/40 active:bg-brand-muted/75 active:ring-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-brand-muted-foreground"
          >
            <CreditCardIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-semibold">{CASE_TYPE.title}</span>
            <span className="text-caption text-muted-foreground">
              {/* A zero here is noise — "0 filed by you" tells nobody anything. */}
              {filedCount ? (
                <>
                  <span className="tabular-nums">{filedCount}</span> filed by you · takes about 40
                  minutes
                </>
              ) : (
                "Takes about 40 minutes"
              )}
            </span>
          </span>
          <ChevronRightIcon
            aria-hidden
            className="size-4.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        {/* A menu over the page, not a fold in it. Folding open, the list grew this card,
            the grid stretched Bulk filing to match, and the whole queue dropped a screen
            (owner, Sept 22). It is a reference list nobody acts on, so it opens over the
            page and leaves everything where it was. */}
        <div className="mt-2 border-t border-hairline pt-3">
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="-mx-3 w-[calc(100%+--spacing(6))] justify-between px-3 text-muted-foreground"
              >
                Case types not on DRISTI yet ({NOT_YET.length})
                <ChevronDownIcon
                  aria-hidden
                  data-icon="inline-end"
                  className={cn(
                    "transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                    open && "rotate-180"
                  )}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-(--radix-popover-trigger-width) gap-2 p-2"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                searchRef.current?.focus();
              }}
            >
              <p className="px-2 pt-1 text-caption text-muted-foreground">
                File these at the court counter for now.
              </p>
              <div className="relative">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search case types"
                  aria-label="Search case types not yet on DRISTI"
                  className="pl-8"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {matches.length === 0 ? (
                  <li className="p-2 text-body-compact text-muted-foreground">
                    No case type matches your search.
                  </li>
                ) : (
                  matches.map((name) => (
                    <li
                      key={name}
                      className="truncate rounded-md px-2 py-2 text-body-compact text-muted-foreground"
                    >
                      {name}
                    </li>
                  ))
                )}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
