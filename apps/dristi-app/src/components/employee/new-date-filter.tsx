"use client";

import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCourtDay, formatListingDate } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/** How many hearings, said the way every count on this screen is said. */
function hearings(count: number): string {
  return `${count} ${count === 1 ? "hearing" : "hearings"}`;
}

/**
 * **Which of the session's new dates the record is showing — asked from the column
 * header that holds them.**
 *
 * A session can move matters to more than one day: a court that is not sitting on the
 * 15th sends that board to the 17th, then looks at the fortnight after and sends eight
 * more to 9 October. The record used to cut itself into one table per day to say so. It
 * is one table now, and this is how the bench gets to a single date inside it (owner,
 * 2026-09-16).
 *
 * **The header *is* the control, and it is drawn as one.** Not a label with a button
 * beside it: a second element in a 40px strip either bloats the strip or shrinks below the
 * touch floor, and a filter that sits next to the column it filters rather than on it
 * needs a second label saying which column it means.
 *
 * It began as the column name in the header's own caption type with a chevron after it,
 * and that was too quiet to find: *"it is not prominent that I can do a drop down and see
 * what other days are there"* (owner, 2026-09-16). The strip is 12px muted type where
 * nothing else on the row does anything, so a chevron alone asks the bench to notice a
 * convention this product does not otherwise have — no other table header here is
 * interactive. So it takes the DS `outline` button: a white `card` fill and an `input`
 * border on the strip's warm `surface-sunken`, which reads as pressable without a second
 * label, and `aria-expanded:bg-accent-strong` gives it a held-open state while the menu
 * is up.
 *
 * **The label stays the column name, filtered or not.** The `th`'s text is what names
 * every cell under it, so it cannot become the chosen date — the column would lose its
 * name exactly when the table is hardest to read. What the filter is set to is said by
 * the line above the table, by the menu's own checked item, and by every row in the
 * column reading one date.
 *
 * The rejected alternatives, both the owner's calls: a row of date chips under the tabs
 * (it reads as a second, nested tab strip) and a control at the far end of the tab row
 * (read as a third tab on sight, which is the answer to whether it would have been).
 *
 * **The 40px hit area comes back without changing what is drawn.** The button is ~18px of
 * text; the transparent `after:` inset takes the press target out to the full height of
 * the cell, which is the same trick the range field's clear uses (ACCESSIBILITY §8).
 *
 * **One date is not a filter.** With a single day in the record there is nothing to
 * choose, so this renders the plain header text — no chevron promising a menu with one
 * item in it, and no control for a bench to wonder about.
 *
 * **What tells you a filter is on**, in the order a reader meets them: every row in the
 * column reads one date, the control's ink is full rather than muted, the menu shows
 * which item is checked, and `QueueAnnouncer` speaks "Showing 1–35 of 41".
 *
 * Two louder signals were tried and both came out. A line above the table saying
 * *Showing 35 of 41 — Tuesday, 22 September 2026* was read as redundant, and the 6px dot
 * that replaced it did not earn a permanent mark in the header either (owner,
 * 2026-09-16). What each was guarding is a bench that leaves the tab and comes back to a
 * filter it forgot it set — real, but weak twice over: nobody reads a row count against a
 * tab badge, and this record is a receipt with no act on it, so the cost of the
 * misreading is a moment rather than a mistake. If that moment ever matters, the cheap
 * cure is upstream — clear `shownDay` when the tab is left, so the state cannot outlive
 * the reader's memory of setting it — not another mark on the control.
 *
 * **The tally lives in the menu, not in the header** (owner's question, 2026-09-16). A
 * number beside a column name reads as a row count for the whole table and would be
 * wrong the moment a filter was applied; a number beside each date is the fact that
 * decides which date to open. So the header stays a header and the counts sit where the
 * choosing happens.
 */
export function NewDateFilter({
  days,
  value,
  onChange,
}: {
  /** Every day this session moved matters to, ascending, with its tally. */
  days: { day: string; count: number }[];
  /** The day on screen, or `null` for all of them. */
  value: string | null;
  onChange: (day: string | null) => void;
}) {
  if (days.length < 2) return <>New hearing date</>;

  const total = days.reduce((sum, entry) => sum + entry.count, 0);
  const showing = value === null ? null : days.find((d) => d.day === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          /* **32px, which is the size the strip has room for.** `sm` (36px) left 2px of
             air inside a 40px strip and looked wedged in; `xs` is the DS's own step for
             compact chrome — the same 32px an `icon-xs` button draws inside a field's
             padding — and with the cell's `py-1` it sits in 4px either side. The header's
             own caption role is kept over the one the button scale would set (both draw
             12px; this one is semibold) so the label still reads as the column's name. */
          size="xs"
          className={cn(
            /* **Pulled left by its own padding**, so the *label* lands where the column's
               dates land rather than 10px right of them. A column header and its values
               share a left edge; a control in a header cell has to give that edge back,
               because `px-2.5` of button padding would otherwise push the words in while
               every other header in the strip starts at the cell's own `px-4`. */
            "-ml-2.5 gap-1 text-caption font-semibold",
            /* **`relative` is load-bearing.** The hit-area pseudo-element below is
               absolutely positioned, and the DS `Table` wraps itself in a `relative`
               container — so without a positioning context of its own the inset stretched
               from that container's edges instead of the button's, adding 8px of width
               and 10px of height to the table's scrollable area. That is where the owner's
               two scrollbars came from on a table that needed neither (2026-09-16):
               measured `scrollWidth` 918 against `clientWidth` 910, and 1462 against
               1452. The numbers were exactly `inset-x-2` and `inset-y-[0.625rem]`. */
            "relative after:absolute after:-inset-y-1 after:content-['']",
            showing ? "text-foreground" : "text-muted-foreground",
          )}
          /* The accessible name carries the state the drawn button leaves to the rows and
             the count line: what is being filtered, and what it is filtered to. */
          aria-label={
            showing
              ? `New hearing date, showing ${formatCourtDay(showing.day)} only. Change which date is showing`
              : `New hearing date, showing all ${days.length} dates. Filter by date`
          }
        >
          New hearing date
          {/* Sized by the button scale rather than overridden: the compact step draws its
              glyphs at 12px, which is the chevron a 32px control wants. */}
          <ChevronDownIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuRadioGroup
          value={value ?? "all"}
          onValueChange={(next) => onChange(next === "all" ? null : next)}
        >
          <DropdownMenuRadioItem value="all">
            All dates
            <span className="ml-auto pl-4 text-caption tabular-nums text-muted-foreground">
              {hearings(total)}
            </span>
          </DropdownMenuRadioItem>
          {days.map((entry) => (
            <DropdownMenuRadioItem key={entry.day} value={entry.day}>
              {/* The court's own register writes the day, weekday and all — the same
                  words the signing card and the board's headings use. */}
              <span className="tabular-nums">{formatCourtDay(entry.day)}</span>
              <span className="ml-auto pl-4 text-caption tabular-nums text-muted-foreground">
                {hearings(entry.count)}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The same choice, standing on its own — what the phone gets, where there is no column
 * header to put it in.
 *
 * Below `md` the record is a stack of items rather than a table, so the filter needs a
 * place of its own and a label that says which date it means. It is the same menu: one
 * control, one vocabulary, two placements.
 */
export function NewDateFilterField({
  days,
  value,
  onChange,
}: {
  days: { day: string; count: number }[];
  value: string | null;
  onChange: (day: string | null) => void;
}) {
  if (days.length < 2) return null;

  const showing = value === null ? null : days.find((d) => d.day === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* A field-shaped trigger, because here it is a control on a page rather than a
            header that happens to open: outline, the DS control height, and it names its
            own value the way a select does. */}
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between gap-2 text-left font-normal"
        >
          {/* Plainly "All dates": the line under this field already says how many there
              are ("7 hearings rescheduled to 2 dates"), and a tally on the trigger as
              well reads as a count of something else. The per-date tallies are in the
              menu, where they are what decides the choice. */}
          <span className="truncate">
            {showing ? formatListingDate(showing.day) : "All dates"}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-56">
        <DropdownMenuRadioGroup
          value={value ?? "all"}
          onValueChange={(next) => onChange(next === "all" ? null : next)}
        >
          <DropdownMenuRadioItem value="all">All dates</DropdownMenuRadioItem>
          {days.map((entry) => (
            <DropdownMenuRadioItem key={entry.day} value={entry.day}>
              <span className="tabular-nums">{formatCourtDay(entry.day)}</span>
              <span className="ml-auto pl-4 text-caption tabular-nums text-muted-foreground">
                {hearings(entry.count)}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
