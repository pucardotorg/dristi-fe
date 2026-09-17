"use client";

import * as React from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FileClock,
  FileUp,
  Gavel,
  IndianRupee,
  ListChecks,
  MailQuestion,
  PenLine,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  useLocalStorageValue,
  writeLocalStorageValue,
} from "@/hooks/use-local-storage-value";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import {
  prepAhead,
  prepGroups,
  railCaseLineOf,
  railGroups,
  type PrepGroup,
  type PrepItem,
  type RailGroup,
} from "@/lib/advocate/home";
import { dueCueOf } from "@/lib/tasks/format";
import { summaryOf, type World } from "@/lib/tasks/selectors";
import type { Task, TaskKind } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { RowAction } from "@/components/advocate/home-bits";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The companion rail — Gmail's model. A persistent icon strip on the far right
 * holds one entry per section: Pending tasks (what is owed) and Hearing prep (the
 * substantial postings coming, which need lead time rather than a deadline).
 * Clicking an icon opens that section's panel beside the strip; clicking it
 * again — or the panel's own close button — returns to the strip alone.
 *
 * The rail sits one step off the page so the cards inside it read as panels in a
 * container rather than white-on-white — and that step runs in opposite
 * directions per theme, because depth does. In light the rail *sinks*
 * (`surface-sunken`) under white cards; in dark, where elevation is lightness and
 * `surface-sunken` is in fact *lighter* than the page, the rail holds the page
 * colour and the cards rise to `surface-raised` instead. Get that backwards and
 * every card in here reads as a hole.
 *
 * The hover follows the same logic: in light a card lifts with a shadow (a
 * darker fill would sink it below its own container); in dark it lifts by
 * going a step lighter, since shadows do not read on near-black. The rail's own
 * chrome hovers to `accent-strong`, plain `accent` being invisible on a sunken fill.
 */

export type RailSection = "tasks" | "prep";

/** What the task asks for, at a glance — one icon per kind, all muted. */
const KIND_ICON: Record<TaskKind, LucideIcon> = {
  sign: PenLine,
  pay: IndianRupee,
  file: FileUp,
  returned: Undo2,
  review: MailQuestion,
  hearing: Gavel,
  draft: FileClock,
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 460;
export const RAIL_DEFAULT_WIDTH = 320;

/**
 * The rail remembers itself, per user, across loads.
 *
 * Which panel is open is a working preference, not a per-visit question: someone
 * who closes the rail should find it closed next time, and today they did not.
 * Width goes with it, since resizing it is the same kind of choice. On first run
 * the tasks panel opens — §138 runs on clocks a missed day does not give back,
 * so the obligation surface is what an unconfigured rail shows.
 */
const RAIL_SECTION_KEY = "dristi.advocate-rail-section";
const RAIL_WIDTH_KEY = "dristi.advocate-rail-width";

/** The closed rail, written down — `null` is not a storable value. */
const CLOSED = "closed";

export function useRailSection(): [
  RailSection | null,
  (next: RailSection | null) => void,
] {
  // Server render and hydration agree on the default (the store's server
  // snapshot is null); the stored choice takes over immediately after.
  const stored = useLocalStorageValue(RAIL_SECTION_KEY);
  const section: RailSection | null =
    stored === CLOSED ? null : stored === "prep" ? "prep" : "tasks";

  const setSection = React.useCallback((next: RailSection | null) => {
    writeLocalStorageValue(RAIL_SECTION_KEY, next ?? CLOSED);
  }, []);

  return [section, setSection];
}

/**
 * Which rail treatment ships. Two candidates, one committed default; the
 * orchestrator flips this and screenshots both for the owner, and the loser is
 * deleted after the pick — there is no user-facing toggle.
 *
 *   A — "breathing card, overdue-anchored": the card container kept but fixed —
 *       a smaller kind icon, a full-width one-line title, the case name muted
 *       under it, and a compact right tag *only when overdue*. ~7 cards visible.
 *   B — "dense cause-list rows": the card containers dropped for a tight
 *       `divide-hairline` list on one panel surface; overdue as a small inline
 *       ink tag. ~40% more rows, reading as a worklist.
 */
const RAIL_VARIANT: "A" | "B" = "A";

/**
 * The two panels share one row frame, whichever variant is on — a task card and
 * a prep card were drifting apart one local `cn()` at a time, and that is the
 * defect the owner named. Both are top-aligned and let content set the height:
 * `min-h-24` (the old floor) held a 96px card around ~64px of content, which is
 * the sag the redesign removes. Nothing here reserves a fixed right column, so
 * the title spans nearly the full width and stops truncating at ~20 characters.
 */
const CARD_A =
  "group/row relative flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-card px-3 py-2.5 transition dark:bg-surface-raised hover:shadow-raised has-focus-visible:shadow-raised dark:hover:bg-accent dark:has-focus-visible:bg-accent";

const ROW_B =
  "group/row relative flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent has-focus-visible:bg-accent";

/** The bucket's item list: gapped cards (A) or one divided panel surface (B). */
const LIST_A = "flex flex-col gap-2 pb-2";
const LIST_B =
  "flex flex-col divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-card pb-0 dark:bg-surface-raised";

/** Variant A's kind-icon tile — smaller than the old one, a small well inside the card. */
const CARD_ICON_A =
  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-muted-foreground";

/** The row title: one line, truncating, and the whole card's hit area. */
const CARD_TITLE =
  "truncate text-left text-body-compact font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50";

/**
 * When something matters, in the place every repeated row on this screen puts
 * its time: the row-action cell, at rest.
 *
 * Two lines by construction — the relative phrase over the date — so the string
 * that used to wrap at a 320px rail ("6 days overdue · 22 Aug") cannot. Overdue
 * speaks in destructive ink and nothing else on the panel does, which is how the
 * worst item leads without a badge: `railTasks` sorts blocking-first to stay in
 * step with /tasks, so position cannot carry it and colour has to.
 *
 * Used by both panels. That is the entire point of it existing.
 */
function WhenBlock({
  lead,
  sub,
  tone,
}: {
  lead: string;
  sub?: string;
  tone: "muted" | "overdue";
}) {
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span
        className={cn(
          "text-caption font-medium whitespace-nowrap tabular-nums",
          tone === "overdue" ? "text-destructive-ink" : "text-muted-foreground"
        )}
      >
        {lead}
      </span>
      {sub ? (
        <span className="text-caption whitespace-nowrap tabular-nums text-muted-foreground">
          {sub}
        </span>
      ) : null}
    </span>
  );
}

function groupLabel(locale: Locale, group: RailGroup): string {
  if (group.key === "today") return pick(advHome.groupToday, locale);
  if (group.key === "soon") return pick(advHome.groupSoon, locale);
  return pick(advHome.groupWeek, locale);
}

/**
 * The panel's own header: the title and the way out. No icon (the strip beside it
 * already carries one, lit) and no caption unless the section's contents need
 * explaining — "Pending tasks" does not.
 */
function PanelHeader({
  title,
  caption,
  locale,
  onClose,
}: {
  title: string;
  /** Only where the selection rule is not obvious from the title. */
  caption?: string;
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-title-s font-semibold">{title}</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={pick(advHome.railClose, locale)}
          className="-mr-1 hover:bg-accent-strong"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {caption ? (
        <p className="text-caption text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}

/** A collapsible bucket header — the Slack move, shared by both panels. */
function BucketTrigger({
  label,
  count,
  lead,
}: {
  label: string;
  count: number;
  /** The nearest bucket, whose header carries the warning ink. */
  lead?: boolean;
}) {
  return (
    <CollapsibleTrigger className="group/bucket flex h-9 w-full shrink-0 items-center gap-1.5 rounded-lg px-1.5 transition-colors hover:bg-accent-strong">
      <span
        className={cn(
          "text-caption font-semibold",
          lead ? "text-warning-ink" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="text-caption font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
      <ChevronDown
        aria-hidden="true"
        className="ml-auto size-4 text-muted-foreground transition-transform group-data-open/bucket:rotate-180"
      />
    </CollapsibleTrigger>
  );
}

/* ───────────────────────────── pending tasks ───────────────────────────── */

/**
 * One pending task: a single-line title over the matter line. The kind icon
 * carries the what; the hover action carries the verb this viewer holds.
 *
 * Only overdue carries a per-card time signal — the bucket header already says
 * "Due today", so repeating it on every card inside was duplication that also
 * cost the title its width. An on-time card therefore has no right-hand tag, and
 * the title runs nearly full width.
 */
function TaskCard({
  world,
  task,
  verb,
  onAct,
}: {
  world: World;
  task: Task;
  verb: string;
  onAct: (task: Task) => void;
}) {
  const Icon = KIND_ICON[task.kind];
  const due = dueCueOf(task, new Date(world.now));
  const dense = RAIL_VARIANT === "B";

  return (
    <div className={dense ? ROW_B : CARD_A}>
      {dense ? (
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
          <Icon className="size-4" />
        </span>
      ) : (
        <span aria-hidden="true" className={CARD_ICON_A}>
          <Icon className="size-3.5" />
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5">
        <button
          type="button"
          onClick={() => onAct(task)}
          title={task.title}
          className={CARD_TITLE}
        >
          {task.title}
        </button>
        <span className="w-full truncate text-caption text-muted-foreground">
          {railCaseLineOf(world, task)}
        </span>
      </div>

      {/* Overdue is the only time signal on a task card, and it is ink, not a
          badge: a red chip on every overdue row would spend the panel's whole
          destructive budget before the count is read. */}
      <RowAction
        label={verb}
        onClick={() => onAct(task)}
        rest={
          due.overdue ? (
            dense ? (
              <span className="text-caption font-medium whitespace-nowrap tabular-nums text-destructive-ink">
                {due.primary}
              </span>
            ) : (
              <WhenBlock lead={due.primary} sub={due.date} tone="overdue" />
            )
          ) : undefined
        }
      />
    </div>
  );
}

function TasksPanel({
  world,
  locale,
  verbOf,
  onAct,
  onClose,
  onViewAll,
}: {
  world: World;
  locale: Locale;
  verbOf: (task: Task) => string;
  onAct: (task: Task) => void;
  onClose: () => void;
  onViewAll: () => void;
}) {
  const now = Number(new Date(world.now));
  const groups = railGroups(world, now);
  const count = summaryOf(world).action;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <PanelHeader
        title={pick(advHome.railTitle, locale)}
        caption={pick(advHome.railScope, locale)}
        locale={locale}
        onClose={onClose}
      />

      {groups.length ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-3 pb-3">
          {groups.map((group) => (
            <Collapsible
              key={group.key}
              defaultOpen={group.key === "today"}
              className="flex flex-col gap-2"
            >
              <BucketTrigger
                label={groupLabel(locale, group)}
                count={group.tasks.length}
                lead={group.key === "today"}
              />
              <CollapsibleContent>
                <ul className={RAIL_VARIANT === "B" ? LIST_B : LIST_A}>
                  {group.tasks.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        world={world}
                        task={task}
                        verb={verbOf(task)}
                        onAct={onAct}
                      />
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-8 text-center">
          <p className="text-body-compact font-medium">
            {pick(advHome.railEmptyTitle, locale)}
          </p>
          <p className="text-caption text-muted-foreground">
            {pick(advHome.railEmptyBody, locale)}
          </p>
        </div>
      )}

      <div className="border-t border-hairline px-4 py-3">
        <Button variant="link" size="sm" className="px-0" onClick={onViewAll}>
          {fillCopy(advHome.railViewAll, locale, { n: String(count) })}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────────── hearing prep ───────────────────────────── */

/**
 * One substantial posting ahead.
 *
 * The card leads with the matter and what the posting is *for* — evidence, cross,
 * the plea, arguments — because that is what decides how much work the week
 * holds. How far away it is sits on the right, relative first ("In 6 days") and
 * dated under it, since lead time is the whole point of the section. Open
 * blocking work is a second cue on the stage line, not the reason the card
 * exists: an evidence posting three weeks out belongs here with nothing pending.
 */
function PrepCard({
  locale,
  item,
  onOpenCase,
}: {
  locale: Locale;
  item: PrepItem;
  onOpenCase: (caseId: string) => void;
}) {
  const date = new Intl.DateTimeFormat(locale === "ml" ? "ml-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(item.at));
  const away =
    item.inDays === 1
      ? pick(advHome.prepTomorrow, locale)
      : fillCopy(advHome.prepInDays, locale, { n: String(item.inDays) });
  const pending = item.blockers.length
    ? item.blockers.length === 1
      ? pick(advHome.prepPendingOne, locale)
      : fillCopy(advHome.prepPendingMany, locale, {
          n: String(item.blockers.length),
        })
    : null;

  const dense = RAIL_VARIANT === "B";

  return (
    <div className={dense ? ROW_B : CARD_A}>
      {dense ? (
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
          <Gavel className="size-4" />
        </span>
      ) : (
        <span aria-hidden="true" className={CARD_ICON_A}>
          <Gavel className="size-3.5" />
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5">
        <button
          type="button"
          onClick={() => onOpenCase(item.kase.id)}
          title={item.kase.parties}
          className={CARD_TITLE}
        >
          {item.kase.parties}
        </button>
        {/* A matter you are meant to prepare for has to be identifiable: the
            number you would quote at the counter, and the posting it is for. */}
        <span className="w-full truncate text-caption text-muted-foreground">
          {/* The card title's `after:inset-0` covers the whole card. */}
          <Identifier value={item.kase.stNumber} label="case number" copyable={false} /> ·{" "}
          {item.kase.stage}
        </span>
        {/* Only when something is owed. A "Ready" badge on every card is a mark
            of the norm, and the card is here for its lead time either way. */}
        {pending ? (
          <span className="truncate text-caption font-medium text-warning-ink">
            {pending}
          </span>
        ) : null}
      </div>

      {/* Prep keeps its relative day in both variants: lead time is the whole
          point of this section, so "In 6 days" adds precision the group header
          ("Next 7 days") does not. */}
      <RowAction
        label={pick(advHome.viewCase, locale)}
        onClick={() => onOpenCase(item.kase.id)}
        rest={
          dense ? (
            <span className="text-caption whitespace-nowrap tabular-nums text-muted-foreground">
              {away}
            </span>
          ) : (
            <WhenBlock lead={away} sub={date} tone="muted" />
          )
        }
      />
    </div>
  );
}

function prepGroupLabel(locale: Locale, group: PrepGroup): string {
  return group.key === "week"
    ? pick(advHome.prepGroupWeek, locale)
    : pick(advHome.prepGroupLater, locale);
}

function PrepPanel({
  world,
  locale,
  onClose,
  onOpenCase,
}: {
  world: World;
  locale: Locale;
  onClose: () => void;
  onOpenCase: (caseId: string) => void;
}) {
  const groups = prepGroups(world, Number(new Date(world.now)));

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <PanelHeader
        title={pick(advHome.prepTitle, locale)}
        caption={pick(advHome.prepCaption, locale)}
        locale={locale}
        onClose={onClose}
      />

      {groups.length ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-3 pb-3">
          {groups.map((group) => (
            <Collapsible
              key={group.key}
              defaultOpen={group.key === "week"}
              className="flex flex-col gap-2"
            >
              <BucketTrigger
                label={prepGroupLabel(locale, group)}
                count={group.items.length}
                lead={group.key === "week"}
              />
              <CollapsibleContent>
                <ul className={RAIL_VARIANT === "B" ? LIST_B : LIST_A}>
                  {group.items.map((item) => (
                    <li key={item.kase.id}>
                      <PrepCard
                        locale={locale}
                        item={item}
                        onOpenCase={onOpenCase}
                      />
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-8 text-center">
          <p className="text-body-compact font-medium">
            {pick(advHome.prepEmptyTitle, locale)}
          </p>
          <p className="text-caption text-muted-foreground">
            {pick(advHome.prepEmptyBody, locale)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── the strip ───────────────────────────── */

/** One entry on the strip: icon, count, active state — like Gmail's side apps. */
function StripButton({
  icon: Icon,
  label,
  count,
  countTone,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  /** Only a count that reports a *status* is coloured; a tally is neutral. */
  countTone: "destructive" | "neutral";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-brand-muted text-brand-muted-foreground"
              : "text-muted-foreground hover:bg-accent-strong"
          )}
        >
          {/* The open section is marked twice over: the tinted tile, and a brand
              bar on the strip's edge — the same marker a mail client puts against
              the row you are in, readable at a glance down the whole strip. */}
          {active ? (
            <span
              aria-hidden="true"
              className="absolute -left-2 h-6 w-0.5 rounded-full bg-brand-accent"
            />
          ) : null}
          <Icon aria-hidden="true" className="size-5" />
          {count ? (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-caption tabular-nums",
                countTone === "destructive"
                  ? "bg-destructive text-destructive-foreground"
                  : // Substantial hearings ahead is a tally, not a warning. On the
                    // rail's own sunken fill a neutral pill has to rise to read at
                    // all — the card step, with a hairline to hold its edge.
                    "bg-card font-medium text-muted-foreground ring-1 ring-hairline dark:bg-surface-raised"
              )}
            >
              {count}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

export function CompanionRail({
  world,
  locale,
  section,
  topOffset,
  onSectionChange,
  verbOf,
  onAct,
  onOpenCase,
  onViewAllTasks,
}: {
  world: World;
  locale: Locale;
  /** Which panel is open; null = strip only. */
  section: RailSection | null;
  /** The shell top bar's height — the rail hangs below it. */
  topOffset: string;
  onSectionChange: (section: RailSection | null) => void;
  /** The viewer's verb for a task — resolved by the screen that owns the world. */
  verbOf: (task: Task) => string;
  onAct: (task: Task) => void;
  onOpenCase: (caseId: string) => void;
  onViewAllTasks: () => void;
}) {
  const tasksCount = summaryOf(world).action;
  const prepCount = prepAhead(world, Number(new Date(world.now))).length;
  const dragFrom = React.useRef<{ x: number; width: number } | null>(null);

  const clamp = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

  // The stored width is the resting truth; `dragging` holds the live value only
  // while the pointer is down, so a drag is one write on release rather than one
  // per pixel of travel.
  const stored = useLocalStorageValue(RAIL_WIDTH_KEY);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const restingWidth = clamp(Number(stored) || RAIL_DEFAULT_WIDTH);
  const width = dragging ?? restingWidth;

  const commitWidth = React.useCallback((w: number) => {
    writeLocalStorageValue(RAIL_WIDTH_KEY, String(w));
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragFrom.current = { x: e.clientX, width };
    setDragging(width);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragFrom.current) return;
    // The panel sits on the right, so dragging left grows it.
    setDragging(clamp(dragFrom.current.width + (dragFrom.current.x - e.clientX)));
  }
  function onPointerUp() {
    if (dragFrom.current && dragging !== null) commitWidth(dragging);
    dragFrom.current = null;
    setDragging(null);
  }
  function onHandleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Discrete steps, so each one is worth writing down on its own.
    if (e.key === "ArrowLeft") commitWidth(clamp(width + 16));
    if (e.key === "ArrowRight") commitWidth(clamp(width - 16));
  }

  const toggle = (next: RailSection) =>
    onSectionChange(section === next ? null : next);
  const close = () => onSectionChange(null);

  return (
    <aside
      aria-label={pick(advHome.railTitle, locale)}
      style={{ top: topOffset, height: `calc(100svh - ${topOffset})` }}
      className="sticky hidden shrink-0 self-start border-l border-hairline bg-surface-sunken md:flex dark:bg-background"
    >
      {section ? (
        <div className="relative flex h-full" style={{ width }}>
          {/* The resize handle: an invisible grab strip on the panel's edge with
              a visible thumb on hover — drag, or arrows when focused. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={pick(advHome.railResize, locale)}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onHandleKeyDown}
            className="group/handle absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors group-hover/handle:bg-brand-accent group-focus-visible/handle:bg-brand-accent"
            />
          </div>

          {section === "tasks" ? (
            <TasksPanel
              world={world}
              locale={locale}
              verbOf={verbOf}
              onAct={onAct}
              onClose={close}
              onViewAll={onViewAllTasks}
            />
          ) : (
            <PrepPanel
              world={world}
              locale={locale}
              onClose={close}
              onOpenCase={onOpenCase}
            />
          )}
        </div>
      ) : null}

      {/* The strip — always present, one icon per section, like Gmail's side
          apps. The seam only appears once a panel stands beside it. */}
      <div
        className={cn(
          "flex w-14 flex-col items-center gap-2 pt-4",
          section && "border-l border-hairline"
        )}
      >
        <StripButton
          icon={ListChecks}
          label={fillCopy(advHome.railOpen, locale, { n: String(tasksCount) })}
          count={tasksCount}
          countTone="destructive"
          active={section === "tasks"}
          onClick={() => toggle("tasks")}
        />
        <StripButton
          icon={CalendarClock}
          label={fillCopy(advHome.prepOpen, locale, { n: String(prepCount) })}
          count={prepCount}
          countTone="neutral"
          active={section === "prep"}
          onClick={() => toggle("prep")}
        />
      </div>
    </aside>
  );
}
