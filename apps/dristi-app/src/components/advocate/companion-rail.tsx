"use client";

import * as React from "react";
import {
  Archive,
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
  railCaseLineOf,
  railGroups,
  railTasks,
  type RailGroup,
} from "@/lib/advocate/home";
import { dueCueOf } from "@/lib/tasks/format";
import { summaryOf, type World } from "@/lib/tasks/selectors";
import type { Task, TaskKind } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { RowAction } from "@/components/advocate/home-bits";

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

export type RailSection = "tasks";

/** A request to trace a case's tasks in the rail; the nonce re-triggers it. */
export type TaskHighlight = { caseId: string; taskIds: string[]; nonce: number } | null;

type TaskPanelGroup = { key: RailGroup["key"] | "related"; tasks: Task[] };

function matchesHighlight(task: Task, highlight: TaskHighlight): boolean {
  return !!highlight && task.caseId === highlight.caseId && highlight.taskIds.includes(task.id);
}

/**
 * The stroke that traces a highlighted task's card. A rounded rect drawn once
 * around the boundary (`stroke-dashoffset` off `pathLength`), held, then faded —
 * a deliberate "look here", so it runs longer than routine UI motion. The draw
 * uses a strong ease-out; reduced-motion drops the travel for a plain fade.
 */
function TaskTraceStyles() {
  return (
    <style>{`
      @keyframes task-trace-draw {
        /* A short delay lets the rail settle and the eye arrive; then the stroke
           travels at a steady, gentle pace (soft start, not a fast ease-out that
           is already half-drawn before it is noticed), holds, and fades. */
        0%   { stroke-dashoffset: 100; opacity: 1; animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
        55%  { stroke-dashoffset: 0;   opacity: 1; }
        74%  { stroke-dashoffset: 0;   opacity: 1; animation-timing-function: ease-out; }
        100% { stroke-dashoffset: 0;   opacity: 0; }
      }
      @keyframes task-trace-fade {
        0% { opacity: 0; } 20% { opacity: 1; } 72% { opacity: 1; } 100% { opacity: 0; }
      }
      .task-trace-rect {
        x: 1.5px; y: 1.5px;
        width: calc(100% - 3px);
        height: calc(100% - 3px);
        rx: 7px;
        fill: none;
        stroke: var(--brand-accent);
        stroke-width: 2px;
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        animation: task-trace-draw 2000ms 60ms forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .task-trace-rect {
          stroke-dashoffset: 0;
          animation: task-trace-fade 1500ms 60ms ease forwards;
        }
      }
    `}</style>
  );
}

/** The rounded stroke overlay for one traced card; `nonce` re-mounts it to replay. */
function TaskTraceRing({ nonce }: { nonce: number }) {
  return (
    <svg
      key={nonce}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible"
    >
      <rect className="task-trace-rect" pathLength={100} />
    </svg>
  );
}

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

const MIN_WIDTH = 70;
const MAX_WIDTH = 120;
/** Widths are multiples of the DS spacing unit. The default is a comfortable
 *  reading width — wide enough for a task title on one line, short of the full
 *  pull the reader can drag to. It is never the panel's full width. */
const DEFAULT_WIDTH = 100;

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
const RAIL_WIDTH_KEY = "dristi.advocate-rail-width-spacing-v2";

/** The closed rail, written down — `null` is not a storable value. */
const CLOSED = "closed";

export function useRailSection(): [
  RailSection | null,
  (next: RailSection | null) => void,
] {
  // Server render and hydration agree on the default (the store's server
  // snapshot is null); the stored choice takes over immediately after.
  const stored = useLocalStorageValue(RAIL_SECTION_KEY);
  const section: RailSection | null = stored === CLOSED ? null : "tasks";

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

function groupLabel(locale: Locale, group: TaskPanelGroup): string {
  if (group.key === "related") return pick({ en: "Other tasks for this hearing", ml: "ഈ ഹിയറിങ്ങിന്റെ മറ്റ് ജോലികൾ" }, locale);
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
    <CollapsibleTrigger className="group/bucket flex h-9 w-full shrink-0 items-center gap-1.5 rounded-lg px-1.5 transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
  onArchive,
  traceNonce,
}: {
  world: World;
  task: Task;
  verb: string;
  onAct: (task: Task) => void;
  /** Put the task away — revealed beside the action on hover. */
  onArchive?: (task: Task) => void;
  /** When set, this card is being traced — the stroke runs, keyed by the nonce. */
  traceNonce?: number | null;
}) {
  const Icon = KIND_ICON[task.kind];
  const due = dueCueOf(task, new Date(world.now));
  const dense = RAIL_VARIANT === "B";

  return (
    <div
      className={dense ? ROW_B : CARD_A}
      data-task-trace={traceNonce != null ? "1" : undefined}
    >
      {traceNonce != null ? <TaskTraceRing nonce={traceNonce} /> : null}
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
          destructive budget before the count is read. The archive control sits
          to the right of the action, both revealed together on hover. */}
      <div className="flex shrink-0 items-center gap-1">
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
        {onArchive ? (
          <button
            type="button"
            aria-label={`Archive: ${task.title}`}
            title="Archive"
            onClick={(event) => {
              event.stopPropagation();
              onArchive(task);
            }}
            className="relative z-10 hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover/row:flex group-focus-within/row:flex hover:bg-accent-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Archive aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** One due-date bucket. Opens on its own when a trace lands inside it. */
function TaskBucket({
  group,
  world,
  locale,
  verbOf,
  onAct,
  onArchive,
  highlight,
}: {
  group: TaskPanelGroup;
  world: World;
  locale: Locale;
  verbOf: (task: Task) => string;
  onAct: (task: Task) => void;
  onArchive: (task: Task) => void;
  highlight: TaskHighlight;
}) {
  const hasTrace = group.tasks.some((task) => matchesHighlight(task, highlight));
  const traceNonce = hasTrace ? highlight?.nonce : undefined;
  // A reader's choice lasts until a new targeted alert arrives. Deriving this
  // from the request avoids a post-paint reopen and still permits manual collapse.
  const [manual, setManual] = React.useState<{ nonce: number | undefined; open: boolean } | null>(null);
  const open = manual && manual.nonce === traceNonce
    ? manual.open
    : group.key === "today" || hasTrace;

  return (
    <Collapsible
      open={open}
      onOpenChange={(open) => setManual({ nonce: traceNonce, open })}
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
                onArchive={onArchive}
                traceNonce={
                  highlight && matchesHighlight(task, highlight)
                    ? highlight.nonce
                    : null
                }
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TasksPanel({
  world,
  locale,
  verbOf,
  onAct,
  onArchive,
  onClose,
  onViewAll,
  highlight,
}: {
  world: World;
  locale: Locale;
  verbOf: (task: Task) => string;
  onAct: (task: Task) => void;
  onArchive: (task: Task) => void;
  onClose: () => void;
  onViewAll: () => void;
  highlight: TaskHighlight;
}) {
  const now = Number(new Date(world.now));
  const groups: TaskPanelGroup[] = railGroups(world, now);
  const visibleIds = new Set(groups.flatMap((group) => group.tasks.map((task) => task.id)));
  const related = railTasks(world).filter((task) => matchesHighlight(task, highlight) && !visibleIds.has(task.id));
  if (related.length) groups.unshift({ key: "related", tasks: related });
  const count = summaryOf(world).action;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Once a trace is requested — and its bucket has had a moment to open — bring
  // the first traced card into view so its stroke is not off-screen.
  const nonce = highlight?.nonce;
  React.useEffect(() => {
    if (nonce == null) return;
    const timer = window.setTimeout(() => {
      scrollRef.current
        ?.querySelector("[data-task-trace]")
        ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [nonce]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <TaskTraceStyles />
      <PanelHeader
        title={pick(advHome.railTitle, locale)}
        caption={related.length ? pick({ en: "Due in the next 7 days and tasks for this hearing", ml: "അടുത്ത 7 ദിവസത്തെ ജോലികളും ഈ ഹിയറിങ്ങിന്റെ ജോലികളും" }, locale) : pick(advHome.railScope, locale)}
        locale={locale}
        onClose={onClose}
      />

      {groups.length ? (
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-3 pb-3"
        >
          {groups.map((group) => (
            <TaskBucket
              key={group.key}
              group={group}
              world={world}
              locale={locale}
              verbOf={verbOf}
              onAct={onAct}
              onArchive={onArchive}
              highlight={highlight}
            />
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
            "relative flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  highlight,
  verbOf,
  onAct,
  onArchive,
  onViewAllTasks,
}: {
  world: World;
  locale: Locale;
  /** Which panel is open; null = strip only. */
  section: RailSection | null;
  /** The shell top bar's height — the rail hangs below it. */
  topOffset: string;
  onSectionChange: (section: RailSection | null) => void;
  /** A pending-flag click asking the tasks panel to trace a case's tasks. */
  highlight: TaskHighlight;
  /** The viewer's verb for a task — resolved by the screen that owns the world. */
  verbOf: (task: Task) => string;
  onAct: (task: Task) => void;
  onArchive: (task: Task) => void;
  onViewAllTasks: () => void;
}) {
  const tasksCount = summaryOf(world).action;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const dragFrom = React.useRef<{ x: number; width: number; unit: number } | null>(null);

  const clamp = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

  // The stored width is the resting truth; `dragging` holds the live value only
  // while the pointer is down, so a drag is one write on release rather than one
  // per pixel of travel.
  const stored = useLocalStorageValue(RAIL_WIDTH_KEY);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const restingWidth = clamp(Number(stored) || DEFAULT_WIDTH);
  const width = dragging ?? restingWidth;

  const commitWidth = React.useCallback((w: number) => {
    writeLocalStorageValue(RAIL_WIDTH_KEY, String(w));
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !panelRef.current) return;
    dragFrom.current = { x: e.clientX, width, unit: panelRef.current.getBoundingClientRect().width / width };
    setDragging(width);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragFrom.current) return;
    // The panel sits on the right, so dragging left grows it.
    setDragging(clamp(dragFrom.current.width + (dragFrom.current.x - e.clientX) / dragFrom.current.unit));
  }
  function onPointerUp() {
    if (dragFrom.current && dragging !== null) commitWidth(dragging);
    dragFrom.current = null;
    setDragging(null);
  }
  function cancelResize() {
    dragFrom.current = null;
    setDragging(null);
  }
  function onHandleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const next = e.key === "ArrowLeft" ? width + 4
      : e.key === "ArrowRight" ? width - 4
      : e.key === "Home" ? MIN_WIDTH
      : e.key === "End" ? MAX_WIDTH : null;
    if (e.key === "Escape") cancelResize();
    if (next !== null) {
      e.preventDefault();
      commitWidth(clamp(next));
    }
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
        <div
          // Keyed by section so opening the strip — or switching panels — plays a
          // short slide-and-fade rather than snapping in, the same easing the case
          // peek uses. Motion is suppressed for reduced-motion readers.
          key={section}
          ref={panelRef}
          className="relative flex h-full duration-200 ease-out animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none"
          style={{ width: `calc(var(--spacing) * ${width})` }}
        >
          {/* The resize handle: an invisible grab strip on the panel's edge with
              a visible thumb on hover — drag, or arrows when focused. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            aria-valuenow={width}
            aria-label={pick(advHome.railResize, locale)}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelResize}
            onLostPointerCapture={cancelResize}
            onKeyDown={onHandleKeyDown}
            className="group/handle absolute inset-y-0 left-0 z-10 w-2 touch-none cursor-col-resize outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-0.5 bg-transparent transition-colors group-hover/handle:bg-brand-accent group-focus-visible/handle:bg-brand-accent"
            />
          </div>

          <TasksPanel
            world={world}
            locale={locale}
            verbOf={verbOf}
            onAct={onAct}
            onArchive={onArchive}
            onClose={close}
            onViewAll={onViewAllTasks}
            highlight={highlight}
          />
        </div>
      ) : null}

      {/* The strip — always present, the one section's icon. The seam only
          appears once the panel stands beside it. */}
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
      </div>
    </aside>
  );
}
