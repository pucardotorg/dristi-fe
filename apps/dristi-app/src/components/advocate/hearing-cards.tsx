"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import { teamOf, type HomeHearing } from "@/lib/advocate/home";
import type { Task } from "@/lib/tasks/types";
import type { World } from "@/lib/tasks/selectors";
import { verbFor } from "@/lib/tasks/permissions";
import { cn } from "@/lib/utils";
import {
  AdvocateStack,
  HomeTaskRow,
  ItemChip,
  RowAction,
  SELECTED_BAR,
} from "@/components/advocate/home-bits";
import { Identifier } from "@/components/chrome/identifier";

function timeOf(at: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(at));
}


/**
 * The hearing currently being called — one per court section, cards view only.
 * Joining the courtroom is not here: the whole court is live, not this item.
 */
export function NowHearingCard({
  world,
  locale,
  hearing,
  selected,
  onOpenCase,
  onAct,
}: {
  world: World;
  locale: Locale;
  hearing: HomeHearing;
  selected: boolean;
  onOpenCase: () => void;
  onAct: (task: Task) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* "Now", and only that. The item number is on the chip and the listed
          time is in the row's rest cell, so each fact appears exactly once. */}
      <p className="flex items-center gap-2 text-caption font-semibold text-success-ink">
        <span aria-hidden="true" className="size-2 rounded-full bg-success" />
        {pick(advHome.nowLabel, locale)}
      </p>
      <Card
        className={cn(
          "relative cursor-pointer gap-4 overflow-visible rounded-2xl border-transparent bg-brand-muted p-6 shadow-raised",
          selected && SELECTED_BAR
        )}
      >
        <div className="group/row relative flex flex-wrap items-start gap-4">
          <ItemChip item={hearing.item} size="lg" surface="brand" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* `h3`, not `h2`: the court's own heading is the section's `h2`
                now, so the matter sits under it — the same level the queue
                cards below take. Size is not level. */}
            <h3 className="text-title font-semibold text-balance">
              <button
                type="button"
                onClick={onOpenCase}
                className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {hearing.kase.parties}
              </button>
            </h3>
            {/* Parties and posting, and nothing else: the numbers and the
                vakalatnama sentence were a wall of dimmed type on a tinted card.
                The number is one click away in the peek; who holds the
                vakalatnama is in the avatars beside it, by name, on hover. */}
            <p className="truncate text-body text-brand-muted-foreground">
              {hearing.kase.stage}
            </p>
          </div>
          {/* The day's live matter is a repeated row like any other: the listed
              time at rest, the verb under the pointer. Six patterns and one
              exception teaches the exception, not the pattern. */}
          <div className="relative z-10 flex shrink-0 items-center gap-3">
            <AdvocateStack
              locale={locale}
              team={teamOf(world, hearing.kase)}
              surface="brand"
              includeSelf
            />
            <RowAction
              label={pick(advHome.viewCase, locale)}
              onClick={onOpenCase}
              rest={
                <span className="text-body-compact tabular-nums text-brand-muted-foreground">
                  {timeOf(hearing.at)}
                </span>
              }
            />
          </div>
        </div>

        {hearing.blockers.length ? (
          <div className="relative z-10 flex flex-col gap-1.5 rounded-md bg-card p-1.5">
            {/* A white well full of sentences does not announce itself as a list
                of things owed. The heading says what it is. */}
            <h4 className="px-4 pt-2 text-caption font-semibold text-muted-foreground">
              {pick(advHome.blockersHeading, locale)}
            </h4>
            {hearing.blockers.map((task) => (
              <HomeTaskRow
                key={task.id}
                task={task}
                now={world.now}
                action={verbFor(world.user, task, hearing.kase)}
                onOpen={() => onAct(task)}
                className="rounded-sm"
              />
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  );
}

/**
 * An upcoming item in the day's cause list — a quiet beige card. The queue
 * recedes on the sunken fill so the one brand-tinted "now" card is the view's
 * sole focal surface; fill is the separation, so the border goes. Hover
 * deepens the fill a step — a sunken surface darkens, it does not lift.
 */
export function HearingCard({
  world,
  locale,
  hearing,
  selected,
  onOpenCase,
  onAct,
}: {
  world: World;
  locale: Locale;
  hearing: HomeHearing;
  selected: boolean;
  onOpenCase: () => void;
  onAct: (task: Task) => void;
}) {
  const blocker = hearing.blockers[0];
  return (
    <li>
      <Card
        className={cn(
          "relative cursor-pointer gap-3 overflow-visible rounded-2xl border-transparent bg-surface-sunken p-4 transition-colors hover:bg-accent-strong has-focus-visible:bg-accent-strong",
          selected && SELECTED_BAR
        )}
      >
        <div className="group/row relative flex flex-wrap items-center gap-x-4 gap-y-2">
          <ItemChip item={hearing.item} surface="sunken" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-body font-semibold text-balance">
              <button
                type="button"
                onClick={onOpenCase}
                className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {hearing.kase.parties}
              </button>
            </h3>
            {/* A matter with something owed shows the blocker well below; a
                matter with nothing owed is silent. "Ready" marked the norm on
                fourteen of today's seventeen cards, which is no information at
                all — only the exception is worth a mark, and it leads the line. */}
            <p className="truncate text-body-compact text-muted-foreground">
              {hearing.kase.stage} ·{" "}
              {/* The card title's `after:inset-0` covers the whole card, so a copy
                  control here could never be clicked — the face only. */}
              <Identifier value={hearing.kase.cnr} label="CNR" copyable={false} />
            </p>
          </div>
          {/* Everyone on the matter, the viewer included, and each disc styled
              by whether they hold the vakalatnama — so the stack says who may
              act and shows the viewer their own standing, in one place. */}
          <AdvocateStack
            locale={locale}
            team={teamOf(world, hearing.kase)}
            surface="sunken"
            includeSelf
          />
          {/* The cell holds the listed time at rest, so reserving room for the
              button costs nothing and the row gains the fact it was missing. */}
          <RowAction
            label={pick(advHome.viewCase, locale)}
            onClick={onOpenCase}
            className="relative z-10"
            rest={
              <span className="text-body-compact tabular-nums text-muted-foreground">
                {timeOf(hearing.at)}
              </span>
            }
          />
        </div>

        {blocker ? (
          // A white well on the beige card, as on the brand-tinted hero — the
          // sunken fill would vanish into a card that is itself sunken.
          <div className="relative z-10 rounded-md bg-card">
            <HomeTaskRow
              task={blocker}
              now={world.now}
              action={verbFor(world.user, blocker, hearing.kase)}
              onOpen={() => onAct(blocker)}
              className="rounded-md"
            />
          </div>
        ) : null}
      </Card>
    </li>
  );
}

/**
 * Items whose listed window has passed, collapsed behind one strip. The world
 * records no outcome for them yet, so the row recalls the listed time and stage
 * rather than inventing a result.
 */
export function ConcludedStrip({
  locale,
  concluded,
  onOpenCase,
}: {
  locale: Locale;
  concluded: HomeHearing[];
  onOpenCase: (caseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col">
      <div className="relative">
        {/* The stack illusion — a second card's rounded top edge peeking out
            behind the strip — is the *closed* state's promise. Opened, the pile
            lies flat: the peek goes, and the strip becomes the flat sheet's
            header row. */}
        {open ? null : (
          <span
            aria-hidden="true"
            className="absolute inset-x-4 -top-2 h-4 rounded-t-xl bg-surface-sunken"
          />
        )}
        <CollapsibleTrigger
          className={cn(
            "group/concluded relative flex w-full items-center gap-2.5 bg-surface-sunken px-4 py-2 text-muted-foreground transition-colors hover:bg-accent",
            open ? "rounded-t-xl" : "rounded-xl"
          )}
        >
          <CircleCheck aria-hidden="true" className="size-4" />
          <span className="flex-1 text-left text-body-compact">
            {fillCopy(advHome.concludedStrip, locale, {
              n: String(concluded.length),
              items: concluded.map((h) => h.item).join(", "),
            })}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-data-open/concluded:rotate-180"
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <ul className="flex flex-col divide-y divide-hairline rounded-b-xl bg-surface-sunken">
          {concluded.map((h) => (
            <li
              key={h.kase.id}
              className="group/row relative flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-accent has-focus-visible:bg-accent"
            >
              <span className="w-16 shrink-0 font-mono text-caption whitespace-nowrap text-muted-foreground">
                {fillCopy(advHome.itemN, locale, { n: String(h.item) })}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => onOpenCase(h.kase.id)}
                  className="text-left text-body-compact font-medium after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {h.kase.parties}
                </button>
                <span className="text-caption text-muted-foreground">
                  {/* The row title's `after:inset-0` covers the row. */}
                  <Identifier
                    value={h.kase.cnr || h.kase.stNumber}
                    label={h.kase.cnr ? "CNR" : "case number"}
                    copyable={false}
                  />
                </span>
              </span>
              <RowAction
                label={pick(advHome.viewCase, locale)}
                onClick={() => onOpenCase(h.kase.id)}
                className="relative z-10"
                rest={
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {timeOf(h.at)}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
