"use client";

import * as React from "react";
import { TriangleAlertIcon } from "lucide-react";

import { StagedOverlay } from "@/components/chrome/staged-overlay";
import { PlannerCalendar } from "@/components/employee/planner-calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  HEARING_SLOTS,
  loadOn,
  nextSittingDay,
  placeOf,
  suggestDay,
  usualDayLoad,
  type HearingSlot,
  type Listing,
  type ReschedulableHearing,
  type RescheduleDraft,
} from "@/lib/employee/bulk-reschedule";
import {
  courtHearingPurposeLabel,
  formatCourtDay,
  formatListingDate,
  isSittingDay,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/**
 * Setting a date by hand — for the ticked rows, or for one row from its own New date.
 *
 * A full view rather than a small calendar (owner, 2026-10-06): the bench is deciding
 * where hearings go, and that needs the day's load across the month, the scheduler's
 * suggestion, and the day it picks laid out — its slots before and after, and the
 * hearings already on it. It opens on the suggestion, or on the row's own new date when
 * it has one; any other day can be picked.
 *
 * Counts leave out the hearings being moved, so a row already drafted onto a day is not
 * counted twice when it is moved within it.
 */
export function RescheduleDateDialog({
  rows,
  board,
  draft,
  floor,
  children,
  onSet,
  onClear,
}: {
  rows: ReschedulableHearing[];
  board: ReschedulableHearing[];
  draft: RescheduleDraft;
  /** The first day that may be picked. */
  floor: string;
  /** The trigger. */
  children: React.ReactElement;
  onSet: (place: Listing) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [day, setDay] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<HearingSlot>("morning");
  const [month, setMonth] = React.useState(floor);
  const titleId = React.useId();
  const slotId = React.useId();

  const count = rows.length;
  const moving = new Set(rows.map((row) => row.id));
  const others = board.filter((row) => !moving.has(row.id));
  const loadFor = (on: string, inSlot?: HearingSlot) =>
    loadOn(others, draft, on, inSlot);
  const lighter = (on: string): HearingSlot =>
    loadFor(on, "morning") <= loadFor(on, "afternoon") ? "morning" : "afternoon";
  const suggestion = open ? suggestDay(board, draft, rows, floor) : null;
  const cap = usualDayLoad(board, floor);
  const drafted = rows.some((row) => draft[row.id] !== undefined);

  function choose(on: string, inSlot?: HearingSlot) {
    setDay(on);
    setSlot(inSlot ?? lighter(on));
    setMonth(on);
  }

  /* Each hearing type on the day: how many are listed, and how many these add. */
  const typeCounts = new Map<ReschedulableHearing["purpose"], [number, number]>();
  if (day) {
    for (const row of others) {
      if (placeOf(row, draft).day !== day) continue;
      const [listed, adding] = typeCounts.get(row.purpose) ?? [0, 0];
      typeCounts.set(row.purpose, [listed + 1, adding]);
    }
    for (const row of rows) {
      const [listed, adding] = typeCounts.get(row.purpose) ?? [0, 0];
      typeCounts.set(row.purpose, [listed, adding + 1]);
    }
  }
  const byType = [...typeCounts]
    .map(([purpose, [listed, adding]]) => [purpose, listed, adding] as const)
    .sort((a, b) => b[2] - a[2] || b[1] - a[1]);
  const before = day ? loadFor(day) : 0;
  const over = day !== null && before + count > cap;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) return;
        const own = rows.length === 1 ? draft[rows[0].id] : undefined;
        if (own) choose(own.day, own.slot);
        else choose(suggestDay(board, draft, rows, floor).day);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <StagedOverlay
        className="sm:max-w-5xl"
        title={
          count === 1
            ? `New date for ${rows[0].caseNumber}`
            : `New date for ${count} hearings`
        }
        description={`Any sitting day from ${formatListingDate(isSittingDay(floor) ? floor : nextSittingDay(floor))}.`}
        sceneKey="date"
        motion="arrive"
        footer={
          <>
            {drafted ? (
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear date
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={day === null}
              onClick={() => {
                if (day === null) return;
                onSet({ day, slot });
                setOpen(false);
              }}
            >
              Set date for {count} {plural(count, "hearing", "hearings")}
            </Button>
          </>
        }
      >
        <div className="grid w-full gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-start">
          <section
            aria-label="Pick a day"
            className="rounded-xl border border-hairline bg-card p-4"
          >
            <PlannerCalendar
              month={month}
              onMonthChange={setMonth}
              firstMonth={floor}
              selected={day}
              onSelect={(on) => choose(on)}
              isDisabled={(on) => on < floor || !isSittingDay(on)}
              label="Sitting days, with the hearings each already has"
              cell={(on) => {
                const now = loadFor(on);
                const suggested = on === suggestion?.day;
                const picked = on === day;
                return {
                  body: picked ? `${now} → ${now + count}` : `${now} ${plural(now, "hearing", "hearings")}`,
                  tag: suggested ? "Suggested" : undefined,
                  label: `${formatCourtDay(on)}, ${now} ${plural(now, "hearing", "hearings")} listed${suggested ? `, suggested — ${suggestion?.fits ? "the earliest day with room" : "the lightest day"}` : ""}`,
                };
              }}
            />
          </section>

          {day ? (
            <div className="flex min-w-0 flex-col gap-4">
              {/* 1 — the slot, chosen deliberately, each with what it holds now. */}
              <section
                aria-labelledby={slotId}
                className="flex flex-col gap-3 rounded-xl border border-hairline bg-card p-4"
              >
                <h3 id={slotId} className="text-body font-semibold">
                  Slot on {formatListingDate(day)}
                </h3>
                <RadioGroup
                  value={slot}
                  onValueChange={(next) => setSlot(next as HearingSlot)}
                  aria-labelledby={slotId}
                  className="grid grid-cols-2 gap-2"
                >
                  {HEARING_SLOTS.map((option) => {
                    const now = loadFor(day, option.id);
                    const chosen = slot === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3 transition-colors hover:bg-accent",
                          chosen && "border-brand-accent bg-brand-muted hover:bg-brand-muted",
                        )}
                      >
                        <RadioGroupItem value={option.id} className="mt-0.5" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-body-compact font-medium">{option.label}</span>
                          <span className="text-body-compact tabular-nums text-muted-foreground">
                            {chosen ? `${now} → ${now + count}` : `${now} listed`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </section>

              {/* 2 — the day as a whole, before and after. */}
              <section
                aria-labelledby={titleId}
                className="flex flex-col gap-2 rounded-xl border border-hairline bg-card p-4"
              >
                <h3 id={titleId} className="text-body font-semibold">
                  {formatCourtDay(day)}
                </h3>
                <p className="flex items-baseline gap-3 tabular-nums">
                  <span className="flex flex-col">
                    <span className="text-body-compact text-muted-foreground">Now</span>
                    <span className="text-title-s font-semibold">{before}</span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">→</span>
                  <span className="flex flex-col">
                    <span className="text-body-compact text-muted-foreground">After</span>
                    <span className="text-title-s font-semibold">{before + count}</span>
                  </span>
                  <span className="sr-only">hearings</span>
                </p>
                {over ? (
                  <p className="flex items-start gap-2 text-body-compact text-warning-ink">
                    <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                    More than this court takes on its busiest day ({cap}).
                  </p>
                ) : null}
              </section>

              {/* 3 — what the day is listed for, and what these add to each. */}
              <section
                aria-label="By hearing type"
                className="flex flex-col gap-2 rounded-xl border border-hairline bg-card p-4"
              >
                <h3 className="text-body font-semibold">By hearing type</h3>
                <table className="w-full text-body-compact tabular-nums">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Hearing type</th>
                      <th scope="col">Listed</th>
                      <th scope="col">Being added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byType.map(([purpose, listed, adding]) => (
                      <tr key={purpose} className="border-t border-hairline first:border-t-0">
                        <th scope="row" className="py-2 pr-2 text-left font-normal">
                          {courtHearingPurposeLabel(purpose)}
                        </th>
                        <td className="w-10 py-2 text-right text-muted-foreground">{listed}</td>
                        <td className="w-12 py-2 text-right font-semibold text-brand-muted-foreground">
                          {adding ? `+${adding}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}
        </div>
      </StagedOverlay>
    </Dialog>
  );
}
