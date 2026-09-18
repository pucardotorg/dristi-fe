"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ListFilter,
  ScrollText,
  SlidersHorizontal,
  TriangleAlert,
  Video,
} from "lucide-react";

import { useCompactBoard } from "./use-compact-board";
import { useCanHover } from "./use-can-hover";
import { Identifier } from "@/components/chrome/identifier";
import { LocateHearingIcon } from "./locate-hearing-icon";
import { MobileHearingCard } from "@/components/advocate/mobile-hearing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import type {
  DaySlot,
  DayTimeline,
  TimelineHearing,
  TimeSlot,
} from "@/lib/advocate/home";
import { cn } from "@/lib/utils";
import { ItemChip } from "@/components/advocate/home-bits";
import { HomeRefreshButton } from "@/components/advocate/refresh-button";
import type { AvatarSurface } from "@/components/tasks/person-avatar";
import { courtIdentity, courtNumberFor } from "@/lib/advocate/courts";
import { passedOverLabel } from "@/lib/advocate/passed-over";

/**
 * Clicking a hearing's pending flag opens the tasks rail and traces its tasks.
 * Threaded by context rather than through every slot component down to the row.
 * Null when the screen wires no handler — the flag then renders as a plain tag.
 */
const OpenTasksContext = React.createContext<((caseId: string, taskIds: string[]) => void) | null>(
  null
);

/**
 * Whether the board surfaces listed times. Off in the launch view: a hearing is a
 * plain list item and the slot headers drop their clock label. Threaded by context
 * so every row and slot header need not take the flag as a prop. On (the full
 * view) it restores the times everywhere.
 */
const ShowTimesContext = React.createContext<boolean>(true);
function useShowTimes(): boolean {
  return React.useContext(ShowTimesContext);
}

/**
 * Opens the cause list and traces this matter's row there — the per-hearing "where
 * does my matter stand in the docket?" jump. Threaded by context so every row can
 * reach it. Null when the screen wires no handler (the icon then does not render).
 */
const ViewInCauseListContext = React.createContext<((caseId: string) => void) | null>(null);

/** A court the filter can offer — its full name, short label, and day count. */
export type CourtOption = { court: string; label: string; count: number };

function timeOf(at: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(
    new Date(at)
  );
}

/**
 * A listed time, marked when it is only approximate. Courts rarely fix a clock
 * time, so an upcoming matter's slot is a rough order, not a promise: it shows
 * with a "~" and an "approx" tag so it can never be read as exact. Concluded and
 * ongoing times have happened or are happening, and a specially-rescheduled
 * upcoming matter carries a court-given slot, so those show plainly.
 */
function HearingTime({
  at,
  approx,
  locale,
  className,
}: {
  at: string;
  approx: boolean;
  locale: Locale;
  className?: string;
}) {
  if (!approx) {
    return <span className={cn("tabular-nums", className)}>{timeOf(at)}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="tabular-nums">~{timeOf(at)}</span>
      <span className="font-medium text-muted-foreground">
        {pick(advHome.approxLabel, locale)}
      </span>
    </span>
  );
}

function CourtBadge({ court, label, number, className }: {
  court: string;
  label: string;
  number?: string;
  className?: string;
}) {
  const identity = courtIdentity(court, courtNumberFor(court, number));
  return (
    <Badge variant="secondary" title={court} className={cn("max-w-full border border-border bg-accent-strong", className)}>
      <span className="truncate">{identity.number ? courtIdentity(label, number).name : label}</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0 tabular-nums">{identity.number ?? "N/A"}</span>
    </Badge>
  );
}

function SlotCount({ slot, locale, className, padded = false }: { slot: TimeSlot; locale: Locale; className?: string; padded?: boolean }) {
  // Stays one unit ("N hearings across M courts") rather than shrinking to wrap
  // mid-phrase; on a narrow slot header it drops to its own line intact. The
  // nouns are pluralised for the counts so it reads right at one ("1 hearing
  // across 1 court").
  const n = slot.hearings.length;
  const c = slot.courts.length;
  return <span className={cn("text-body-compact text-muted-foreground lg:whitespace-nowrap", className)}>
    {fillCopy(advHome.slotAcrossCourts, locale, {
      n: padded ? String(n).padStart(2, "0") : String(n),
      hw: pick(n === 1 ? advHome.statHearingOne : advHome.statHearingMany, locale),
      c: padded ? String(c).padStart(2, "0") : String(c),
      cw: pick(c === 1 ? advHome.statCourtOne : advHome.statCourtMany, locale),
    })}
  </span>;
}

/* ─────────────────────────── summary strip ─────────────────────────── */

/** The day at a glance, inline on the page with hairline dividers — no cards,
 *  so the numbers carry their own weight without wells of empty space. */
function SummaryStrip({
  total,
  courts,
  slots,
  blocking,
  showConflicts,
  conflictSlots,
  locale,
}: {
  total: number;
  courts: number;
  /** The count of the day's sittings — the exact range lives in the slot tab. */
  slots: number;
  /** Matters that owe blocking work before their hearing today. */
  blocking: number;
  /** The full view states conflicts here; the launch view states the slot count. */
  showConflicts: boolean;
  conflictSlots: number;
  locale: Locale;
}) {
  // Phone: the two middle columns run narrower, which draws the short-labelled
  // middle pair (courts, slot) together while every other centre-to-centre
  // distance stays what it was.
  return (
    <div data-oneline={locale === "en"} className="group/stats grid w-full min-w-0 grid-cols-[1.1fr_0.9fr_0.9fr_1.1fr] gap-1 pr-6 pl-2 lg:flex lg:w-auto lg:px-0 lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-1.5 lg:@5xl:gap-x-6">
      <Stat
        value={total}
        label={pick(total === 1 ? advHome.statHearingOne : advHome.statHearingMany, locale)}
      />
      <Sep />
      <Stat
        value={courts}
        label={pick(courts === 1 ? advHome.statCourtOne : advHome.statCourtMany, locale)}
      />
      <Sep />
      {showConflicts ? (
        <Stat
          value={conflictSlots}
          label={pick(
            conflictSlots === 1 ? advHome.statConflictOne : advHome.statConflictMany,
            locale
          )}
          warning={conflictSlots > 0}
        />
      ) : (
        <Stat value={slots} label={pick(slots === 1 ? advHome.slotOne : advHome.slotMany, locale)} />
      )}
      <Sep />
      <Stat
        value={blocking}
        label={pick(blocking === 1 ? advHome.statBlockingOne : advHome.statBlockingMany, locale)}
      />
    </div>
  );
}

function Sep() {
  return <span aria-hidden="true" className="hidden h-4 w-px bg-hairline lg:block" />;
}

function Stat({
  value,
  label,
  warning = false,
}: {
  value: number;
  label: string;
  warning?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1 text-center lg:flex-row lg:text-left lg:items-baseline lg:gap-1.5">
      <span
        className={cn(
          // An upright tablet has the room for a step larger than the phone.
          "text-body font-semibold tabular-nums md:max-lg:text-title-s lg:@5xl:text-title-s",
          warning && "text-warning-ink"
        )}
      >
        <span className="lg:hidden">{String(value).padStart(2, "0")}</span><span className="hidden lg:inline">{value}</span>
      </span>
      {/* English labels hold one line: a wrapped label changes the block's width,
          which would throw off the optical centring the asymmetric padding sets
          up. Malayalam labels run longer and must wrap to stay in their column. */}
      <span className="text-caption wrap-anywhere text-muted-foreground group-data-[oneline=true]/stats:whitespace-nowrap md:max-lg:text-body-compact lg:@5xl:text-body">{label}</span>
    </span>
  );
}

/* ─────────────────────────── toolbar ─────────────────────────── */

/** The court filter and the two per-court actions, gathered under the week strip. */
function Toolbar({
  courts,
  selected,
  onCourtsChange,
  onViewCauseList,
  onJoinCourt,
  onRefresh,
  locale,
}: {
  courts: CourtOption[];
  selected: string[];
  onCourtsChange: (next: string[]) => void;
  onViewCauseList: () => void;
  onJoinCourt: () => void;
  onRefresh: () => void;
  locale: Locale;
}) {
  return (
    // On a phone the actions wrap onto a second line rather than overflowing the
    // screen; from @xl (the board wide enough to hold them) they stay one line and
    // hold their size beside the stats, as the rail-open desktop header needs.
    <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:@xl:flex-nowrap lg:@xl:shrink-0">
      <div className="grid w-full grid-cols-2 gap-2 lg:contents">
      <CourtFilter
        courts={courts}
        selected={selected}
        onChange={onCourtsChange}
        locale={locale}
      />
      {/* In the compact band — the rail open on a desktop, so the board is @xl–@4xl
          wide — the two actions drop to icons with a tooltip, keeping the stats and
          actions on one line. They keep their labels on a phone (below @xl, no hover
          to reveal a tooltip) and on a wide board (@4xl up). The All-courts filter
          keeps its label throughout. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCauseList}
            aria-label={pick(advHome.viewCauseList, locale)}
            className="border-border h-auto min-h-10 min-w-0 gap-1.5 px-3 py-2 text-body-compact whitespace-normal lg:h-9 lg:py-0 lg:whitespace-nowrap lg:min-h-9 lg:text-caption lg:@xl:gap-0 lg:@xl:px-2.5 lg:@4xl:gap-1.5 lg:@4xl:px-3"
          >
            <ScrollText aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere lg:@xl:hidden lg:@4xl:inline">{pick(advHome.viewCauseList, locale)}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{pick(advHome.viewCauseList, locale)}</TooltipContent>
      </Tooltip>
      </div>
      <div className="flex w-full items-center gap-2 lg:contents">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            onClick={onJoinCourt}
            aria-label={pick(advHome.joinCourtroom, locale)}
            className="flex-1 lg:flex-none h-auto min-h-10 min-w-0 gap-1.5 px-3 py-2 text-body-compact whitespace-normal lg:h-9 lg:py-0 lg:whitespace-nowrap lg:min-h-9 lg:text-caption lg:@xl:gap-0 lg:@xl:px-2.5 lg:@4xl:gap-1.5 lg:@4xl:px-3"
          >
            <Video aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere lg:@xl:hidden lg:@4xl:inline">{pick(advHome.joinCourtroom, locale)}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{pick(advHome.joinCourtroom, locale)}</TooltipContent>
      </Tooltip>
      {/* The day's-list refresh — always an icon, to the right of Join, with the
          three-beat gesture and the last-refreshed reveal. */}
      <HomeRefreshButton onRefresh={onRefresh} locale={locale} />
      </div>
    </div>
  );
}

function CourtFilter({
  courts,
  selected,
  onChange,
  locale,
}: {
  courts: CourtOption[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  locale: Locale;
}) {
  const labelOf = React.useCallback(
    (court: string) => courts.find((c) => c.court === court)?.label ?? court,
    [courts]
  );

  const toggle = (court: string) => {
    onChange(
      selected.includes(court)
        ? selected.filter((c) => c !== court)
        : [...selected, court]
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto min-h-10 min-w-0 gap-1.5 border-border py-2 text-body-compact whitespace-normal lg:h-9 lg:py-0 lg:whitespace-nowrap lg:min-h-9 lg:text-caption">
          <ListFilter aria-hidden="true" className="text-muted-foreground" />
          {selected.length === 0 ? (
            pick(advHome.courtFilterAll, locale)
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{labelOf(selected[0])}</span>
              {selected.length > 1 ? (
                <span className="text-muted-foreground">
                  {fillCopy(advHome.courtFilterMore, locale, {
                    n: String(selected.length - 1),
                  })}
                </span>
              ) : null}
            </span>
          )}
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 max-w-[calc(100vw-2rem)] min-w-52 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
          className="min-h-10 text-body-compact lg:min-h-0 lg:text-caption"
        >
          {pick(advHome.courtFilterAll, locale)}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {courts.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.court}
            checked={selected.includes(option.court)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(option.court)}
            className="min-h-10 text-body-compact lg:min-h-0 lg:text-caption"
          >
            <span className="flex-1 truncate">{option.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {option.count}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────────────────────────── rail ─────────────────────────────── */

type RailTone = "neutral" | "conflict" | "now";

/** The keyframes for the "now" dot's pulse — scoped here, off under reduced motion. */
function RailStyles() {
  return (
    <style>{`
      .now-dot { box-shadow: 0 0 0 3px var(--halo); }
      @keyframes pucar-now-pulse {
        0%, 100% { box-shadow: 0 0 0 2px var(--halo); }
        50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--halo) 45%, transparent); }
      }
      @media (prefers-reduced-motion: no-preference) {
        .now-dot { animation: pucar-now-pulse 2.5s ease-in-out infinite; }
      }
    `}</style>
  );
}

function Dot({ tone }: { tone: RailTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-4 shrink-0 rounded-full",
        tone === "now"
          ? "size-2.5 bg-primary now-dot"
          : tone === "conflict"
            ? "size-2 bg-warning ring-4 ring-background"
            : "size-2 bg-muted-foreground ring-4 ring-background"
      )}
    />
  );
}

function TimelineRow({
  tone = "neutral",
  dot = true,
  children,
}: {
  tone?: RailTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-3">
      <div className="hidden w-3 shrink-0 justify-center lg:flex">
        {dot ? <Dot tone={tone} /> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ─────────────────────────── hearing row ─────────────────────────── */

/**
 * The flag for a hearing that still owes work before it is called — "N blocking
 * tasks". When the screen wires an open-tasks handler it is an alert-toned
 * BUTTON (a border, a hover fill and a trailing chevron say it is pressable, the
 * warning tint says it is a warning); it opens the tasks rail and traces this
 * case's tasks. Without a handler it falls back to a plain alert tag.
 */
function PendingChip({
  count,
  caseId,
  taskIds,
  locale,
}: {
  count: number;
  caseId: string;
  taskIds: string[];
  locale: Locale;
}) {
  const onOpenTasks = React.useContext(OpenTasksContext);
  if (count <= 0) return null;
  const label = fillCopy(
    count === 1 ? advHome.blockingOne : advHome.blockingMany,
    locale,
    { n: String(count) }
  );

  if (!onOpenTasks) {
    return (
      <Badge variant="warning" className="gap-1">
        <TriangleAlert aria-hidden="true" />
        {label}
      </Badge>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label}: ${pick(advHome.pendingOpen, locale)}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpenTasks(caseId, taskIds);
      }}
      className="relative z-10 inline-flex min-h-10 shrink-0 items-center lg:min-h-6 gap-1 rounded-md border border-warning bg-warning-muted px-2 text-caption lg:px-1.5 font-medium text-warning-muted-foreground transition-colors hover:bg-warning-muted-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      {label}
      <ChevronRight aria-hidden="true" className="size-3.5" />
    </button>
  );
}

/**
 * The quiet bordered icon button at a hearing's right edge that opens the cause
 * list and traces this matter's row there — so an advocate can jump from the board
 * to where the matter stands in the day's full docket, without hunting for it. The
 * hairline stroke marks it as pressable. Renders nothing when no handler is wired.
 */
function ViewInCauseListButton({ caseId, locale }: { caseId: string; locale: Locale }) {
  const onView = React.useContext(ViewInCauseListContext);
  if (!onView) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={pick(advHome.viewOnCauseList, locale)}
          onClick={(event) => {
            event.stopPropagation();
            onView(caseId);
          }}
          className="relative z-10 col-start-2 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 justify-self-start self-center px-3 text-caption lg:size-7 lg:min-h-0 lg:px-0 rounded-md border border-hairline bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LocateHearingIcon aria-hidden="true" className="size-4" />
          <span className="lg:hidden">{pick(advHome.causeListTitle, locale)}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{pick(advHome.viewOnCauseList, locale)}</TooltipContent>
    </Tooltip>
  );
}

/**
 * One hearing, two lines beside its cause-list item box: the matter (bold), then
 * the stage and case number. The court badge and time sit on the right, with a
 * pending flag when the matter still owes work, and a quiet cause-list jump at the
 * top-right corner.
 */
function HearingRow({
  hearing,
  onOpenCase,
  locale,
  selected,
  showTime = false,
  boxSurface = "card",
  className,
}: {
  hearing: TimelineHearing;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
  selected: boolean;
  showTime?: boolean;
  /** The surface the row sits on, so the item box insets the right way. */
  boxSurface?: AvatarSurface;
  className?: string;
}) {
  const showTimes = useShowTimes();
  const isMobile = useCompactBoard();
  const canHover = useCanHover();
  const onOpenTasks = React.useContext(OpenTasksContext);
  const onViewInCauseList = React.useContext(ViewInCauseListContext);
  if (isMobile) return <MobileHearingCard hearing={hearing} locale={locale} selected={selected} onOpenCase={onOpenCase} onOpenTasks={onOpenTasks} onViewInCauseList={onViewInCauseList} time={showTime && showTimes ? <HearingTime at={hearing.at} approx={hearing.approxTime} locale={locale} /> : null} />;
  return (
    <div
      className={cn(
        "group/row relative grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 px-3 py-4 transition-colors active:bg-accent lg:flex lg:gap-3 lg:px-4 lg:py-3",
        selected && "ring-2 ring-inset ring-brand-accent",
        className
      )}
    >
      <ItemChip item={hearing.item} size="lg" surface={boxSurface} />
      {/* When the board is narrow — a phone, or a tablet with the nav open — the
          matter takes the full width and its flag + court badge sit on their own
          line below it; once the board itself is wide enough (@xl) they return to a
          right-hand column centred against the two-line matter. The threshold is the
          board's own width (a container query), not the viewport, because the rail
          and side nav narrow the board without narrowing the screen. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:@xl:flex-row lg:@xl:items-center lg:@xl:justify-between lg:@xl:gap-3">
        {/* No top pad and no gap: the name (24px) and the detail line (20px) then
            total the item box's 44px exactly, so the two share a top and a bottom. */}
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={() => onOpenCase(hearing.kase.id)}
              className="text-left text-body font-semibold text-balance after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {hearing.kase.parties}
            </button>
            {/* A matter that was called and passed over, today or on an earlier day
                (then with that day), wears the tag wherever it now sits. */}
            {hearing.passedOver ? (
              <span className="inline-flex shrink-0 items-center rounded-full border border-warning px-2 py-0.5 text-caption font-medium text-warning-ink">
                {passedOverLabel(hearing.passedOverOn, locale)}
              </span>
            ) : null}
          </div>
          {/* The case number is never cut short: when the line runs out of room it is
              the stage that truncates. The number is an Identifier (mono, and on a
              mouse-driven screen click-to-copy); it sits above the row's full-bleed
              click target so copying it does not open the case. */}
          <span className="flex h-5 min-w-0 items-baseline text-body-compact text-muted-foreground">
            <span className="min-w-0 truncate" title={hearing.kase.stage}>{hearing.kase.stage}</span>
            <span aria-hidden="true" className="shrink-0 whitespace-pre"> · </span>
            <Identifier
              value={hearing.kase.cnr || hearing.kase.stNumber}
              label="case number"
              copyable={canHover}
              className="relative z-10 shrink-0 whitespace-nowrap"
            />
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 lg:@xl:items-end">
          <div className="flex flex-wrap items-center gap-1.5 lg:@xl:flex-nowrap lg:@xl:justify-end">
            <PendingChip
              count={hearing.blockers.length}
              taskIds={hearing.blockers.map((task) => task.id)}
              caseId={hearing.kase.id}
              locale={locale}
            />
            <CourtBadge court={hearing.court} label={hearing.courtLabel} number={hearing.kase.courtNumber} className="relative z-10" />
          </div>
          {showTime && showTimes ? (
            <HearingTime
              at={hearing.at}
              approx={hearing.approxTime}
              locale={locale}
              className="text-caption text-muted-foreground"
            />
          ) : null}
        </div>
      </div>
      {/* Center-right, in flow so it never overlaps the badge: a bordered icon
          button (the stroke says it is pressable) that jumps to this matter's row
          in the cause list. */}
      <ViewInCauseListButton caseId={hearing.kase.id} locale={locale} />
    </div>
  );
}

/** The rows of a slot as a white inner card, divided by hairlines. */
function HearingBody({
  hearings,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  hearings: TimelineHearing[];
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-2 lg:block lg:gap-0 lg:divide-y lg:divide-hairline lg:overflow-hidden lg:rounded-lg lg:bg-card">
      {hearings.map((hearing) => (
        <HearingRow
          key={hearing.kase.id}
          hearing={hearing}
          onOpenCase={onOpenCase}
          locale={locale}
          selected={hearing.kase.id === selectedCaseId}
          boxSurface="card"
          className="hover:bg-muted has-focus-visible:bg-muted"
        />
      ))}
    </div>
  );
}

/** A small status tag — "Ongoing" (teal) or "Conflict" (amber) — on white so it
 *  reads on the slot's own tint without adding to it. */
function StatusTag({ tone, label, className }: { tone: "now" | "conflict"; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-caption font-medium",
        tone === "now"
          ? "border-brand-accent text-brand-muted-foreground"
          : "border-warning text-warning-ink",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          tone === "now" ? "bg-primary" : "bg-warning"
        )}
      />
      {label}
    </span>
  );
}

/**
 * The now slot — a teal-framed card with a sleek strip, an "Ongoing" tag, and the
 * hearing(s) in a white body. Always open: what is being called needs no click.
 */
function NowSlot({
  slot,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  slot: TimeSlot;
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  const showTimes = useShowTimes();
  const isMobile = useCompactBoard();
  const [pointerMotion, setPointerMotion] = React.useState(true);
  if (isMobile) return (
    <Collapsible defaultOpen data-pointer-motion={pointerMotion} className="relative overflow-hidden rounded-xl bg-brand-muted">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-brand-accent" />
      <CollapsibleTrigger onPointerDown={() => setPointerMotion(true)} onKeyDown={() => setPointerMotion(false)} className="group/ongoing flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-brand-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span aria-hidden="true" className="now-dot size-2.5 shrink-0 rounded-full bg-primary" />
        <span className="sr-only">{pick(advHome.ongoingTag, locale)}: </span>
        {showTimes ? <span className="text-body-compact font-semibold tabular-nums">{timeOf(slot.at)}</span> : null}
        <SlotCount padded slot={slot} locale={locale} className="flex-1 text-body-compact font-semibold text-brand-muted-foreground" />
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-data-[state=closed]/ongoing:-rotate-90 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className="hearing-reveal overflow-hidden">
        <div className="px-2 pb-2"><HearingBody hearings={slot.hearings} selectedCaseId={selectedCaseId} onOpenCase={onOpenCase} locale={locale} /></div>
      </CollapsibleContent>
    </Collapsible>
  );
  return (
    <div className="flex overflow-hidden rounded-xl bg-brand-muted shadow-raised">
      <span aria-hidden="true" className="w-0.5 shrink-0 bg-brand-accent" />
      <div className="min-w-0 flex-1 p-0 lg:p-1.5">
        <div className="flex flex-col items-start gap-2 px-3 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-1 lg:py-2.5">
          {showTimes ? (
            <>
              <span className="shrink-0 text-body font-semibold tabular-nums text-brand-muted-foreground">
                {timeOf(slot.at)}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <SlotCount slot={slot} locale={locale} />
            </>
          ) : (
            // With times off, the count is the heading, so it carries the weight.
            <SlotCount
              slot={slot}
              locale={locale}
              className="text-body font-semibold text-brand-muted-foreground"
            />
          )}
          <StatusTag tone="now" label={pick(advHome.ongoingTag, locale)} className="lg:ml-auto" />
        </div>
        <HearingBody
          hearings={slot.hearings}
          selectedCaseId={selectedCaseId}
          onOpenCase={onOpenCase}
          locale={locale}
        />
      </div>
    </div>
  );
}

/**
 * A conflict slot — quiet when collapsed: a sunken card with a thin amber strip
 * and a "Conflict" tag, not a wall of yellow. Expands to the hearings in a white
 * body so a cluster of them stays scannable rather than chaotic.
 */
function ConflictSlot({
  slot,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  slot: TimeSlot;
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  const [open, setOpen] = React.useState(false);
  const [pointerMotion, setPointerMotion] = React.useState(true);
  return (
    // The amber strip is an overlay, not a flex sibling, so the header trigger
    // spans the full card width and its hover reaches the card's boundary rather
    // than stopping short of the strip.
    <div className="relative overflow-hidden rounded-xl bg-surface-sunken">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-warning"
      />
      <div className="min-w-0 flex-1">
        <Collapsible data-pointer-motion={pointerMotion} onPointerDownCapture={() => setPointerMotion(true)} onKeyDownCapture={() => setPointerMotion(false)} open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger
            aria-label={fillCopy(advHome.slotExpand, locale, { time: slot.key })}
            className="group/collapsible flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors hover:bg-accent-strong"
          >
            <HearingTime
              at={slot.at}
              approx={slot.approx}
              locale={locale}
              className="shrink-0 text-body-compact font-medium text-foreground"
            />
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <SlotCount slot={slot} locale={locale} />
            <StatusTag tone="conflict" label={pick(advHome.conflictTag, locale)} className="ml-auto" />
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="hearing-reveal overflow-hidden">
            <div className="p-1.5 pt-0">
              <HearingBody
                hearings={slot.hearings}
                selectedCaseId={selectedCaseId}
                onOpenCase={onOpenCase}
                locale={locale}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/** A clear upcoming slot — one matter, a quiet white card with a hairline. */
function ClearSlotRow({
  slot,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  slot: TimeSlot;
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  const hearing = slot.hearings[0];
  return (
    <div className="lg:overflow-hidden lg:rounded-xl lg:border lg:border-hairline lg:bg-card">
      <HearingRow
        hearing={hearing}
        onOpenCase={onOpenCase}
        locale={locale}
        selected={hearing.kase.id === selectedCaseId}
        showTime
        boxSurface="card"
        className="cursor-pointer hover:bg-muted has-focus-visible:bg-muted"
      />
    </div>
  );
}

/* ─────────────────────────── concluded block ─────────────────────────── */

/** One concluded time slot inside the pile — consolidated, opening to its cases. */
function ConcludedSlot({
  slot,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  slot: TimeSlot;
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  const [open, setOpen] = React.useState(false);
  const [pointerMotion, setPointerMotion] = React.useState(true);

  // Each concluded slot is its own white card — a single matter reads like a
  // clear upcoming slot, a cluster opens to its cases — so a day's pile carries
  // the same card-and-gap rhythm, and every row hovers the one light-beige way.
  if (slot.hearings.length === 1) {
    const hearing = slot.hearings[0];
    return (
      <div className="lg:overflow-hidden lg:rounded-lg lg:border lg:border-hairline lg:bg-card">
        <HearingRow
          hearing={hearing}
          onOpenCase={onOpenCase}
          locale={locale}
          selected={hearing.kase.id === selectedCaseId}
          showTime
          boxSurface="card"
          className="cursor-pointer hover:bg-muted has-focus-visible:bg-muted"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-card">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-input" />
      <Collapsible data-pointer-motion={pointerMotion} onPointerDownCapture={() => setPointerMotion(true)} onKeyDownCapture={() => setPointerMotion(false)} open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group/collapsible flex min-h-10 w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-muted">
          <span className="w-16 shrink-0 text-caption font-semibold tabular-nums text-foreground">{timeOf(slot.at)}</span>
          <span aria-hidden="true">·</span>
          <SlotCount slot={slot} locale={locale} />
          <ChevronDown
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="hearing-reveal overflow-hidden">
          <div className="border-t border-hairline">
            <HearingBody
              hearings={slot.hearings}
              selectedCaseId={selectedCaseId}
              onOpenCase={onOpenCase}
              locale={locale}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/** The concluded pile: one summary row, opening to the day's earlier slots. */
function ConcludedBlock({
  slots,
  dayPhase,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  slots: TimeSlot[];
  dayPhase: "past" | "today" | "future";
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  // A past day is nothing but its concluded list, so it opens expanded and wears
  // a "Concluded" tag. On today the pile is just the morning behind the live
  // slot, so it stays collapsed until asked for.
  const isPast = dayPhase === "past";
  const [open, setOpen] = React.useState(isPast);
  const [pointerMotion, setPointerMotion] = React.useState(true);
  const showTimes = useShowTimes();
  const hearings = slots.flatMap((s) => s.hearings);
  const courts = new Set(hearings.map((h) => h.court)).size;
  const concludedPart = `${hearings.length} ${pick(advHome.concludedWord, locale)}`;
  const courtsPart = `${courts} ${pick(courts === 1 ? advHome.statCourtOne : advHome.statCourtMany, locale)}`;
  // The full view leads with the time range and slot count; the launch view has
  // neither (no times, one matter per slot), so it states just the two counts.
  const summaryLine = showTimes
    ? [
        hearings.length > 1
          ? `${timeOf(hearings[0].at)} – ${timeOf(hearings[hearings.length - 1].at)}`
          : timeOf(hearings[0].at),
        concludedPart,
        `${slots.length} ${pick(slots.length === 1 ? advHome.slotOne : advHome.slotMany, locale)}`,
        courtsPart,
      ].join(" · ")
    : [concludedPart, courtsPart].join(" · ");

  return (
    <TimelineRow tone="neutral">
      <Collapsible data-pointer-motion={pointerMotion} onPointerDownCapture={() => setPointerMotion(true)} onKeyDownCapture={() => setPointerMotion(false)} open={open} onOpenChange={setOpen} className="relative">
        {open ? null : (
          <span
            aria-hidden="true"
            className="absolute inset-x-3 -top-1.5 h-3 rounded-t-xl bg-accent-strong"
          />
        )}
        <CollapsibleTrigger className="group/collapsible relative flex min-h-10 w-full items-center gap-2.5 rounded-xl bg-surface-sunken px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-accent-strong">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 text-body-compact lg:truncate">{summaryLine}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="hearing-reveal overflow-hidden">
          <div className="mt-1 flex flex-col gap-2 rounded-lg bg-surface-sunken p-2">
            {slots.map((slot) => (
              <ConcludedSlot
                key={slot.key}
                slot={slot}
                selectedCaseId={selectedCaseId}
                onOpenCase={onOpenCase}
                locale={locale}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TimelineRow>
  );
}

/** The heading that opens the upcoming zone — a quiet rule extending right, with
 *  a count of how many matters sit under it. */
function UpcomingSeparator({ label, count }: { label: string; count: number }) {
  return (
    <TimelineRow dot={false}>
      <div className="flex items-center gap-2.5 pt-2 pb-1">
        <span className="text-caption font-semibold text-muted-foreground lg:tracking-wide lg:uppercase">
          {label}
        </span>
        <Badge variant="secondary" className="tabular-nums">{count}</Badge>
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
      </div>
    </TimelineRow>
  );
}

/* ─────────────────────────── the board ─────────────────────────── */

/**
 * One sitting's timeline: the concluded pile, the ongoing group, then upcoming.
 * The same board whether it stands alone (one sitting) or under a slot tab.
 */
function Board({
  board,
  dayPhase,
  selectedCaseId,
  onOpenCase,
  locale,
}: {
  board: DayTimeline;
  dayPhase: "past" | "today" | "future";
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  locale: Locale;
}) {
  const { concluded, now, upcoming } = board;
  return (
    <div className="relative flex flex-col gap-2 lg:gap-3">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-4 bottom-4 left-1.5 hidden lg:block w-px -translate-x-1/2 bg-hairline"
      />

      {concluded.length ? (
        // Keyed by phase so the pile re-mounts when the day moves between today
        // and a past day — that is what lets its open-by-default state (expanded
        // on a past day, collapsed on today) take effect.
        <ConcludedBlock
          key={dayPhase}
          slots={concluded}
          dayPhase={dayPhase}
          selectedCaseId={selectedCaseId}
          onOpenCase={onOpenCase}
          locale={locale}
        />
      ) : null}

      {now.length ? (
        now.map((slot) => (
          <TimelineRow key={slot.key} tone="now">
            <NowSlot
              slot={slot}
              selectedCaseId={selectedCaseId}
              onOpenCase={onOpenCase}
              locale={locale}
            />
          </TimelineRow>
        ))
      ) : dayPhase === "today" ? (
        // "Nothing is being called" only makes sense on a day in progress. A past
        // day is wholly concluded and a future day wholly upcoming, so neither
        // carries a live "now" gap to explain.
        <TimelineRow dot={false}>
          <p className="px-4 py-2 text-body-compact text-muted-foreground">
            {pick(upcoming.length ? advHome.nowEmpty : advHome.noUpcoming, locale)}
          </p>
        </TimelineRow>
      ) : null}

      {upcoming.length ? (
        <>
          <UpcomingSeparator
            label={pick(advHome.zoneUpcoming, locale)}
            count={upcoming.reduce((n, s) => n + s.hearings.length, 0)}
          />
          {upcoming.map((slot) => (
            <TimelineRow key={slot.key} tone={slot.conflict ? "conflict" : "neutral"}>
              {slot.conflict ? (
                <ConflictSlot
                  slot={slot}
                  selectedCaseId={selectedCaseId}
                  onOpenCase={onOpenCase}
                  locale={locale}
                />
              ) : (
                <ClearSlotRow
                  slot={slot}
                  selectedCaseId={selectedCaseId}
                  onOpenCase={onOpenCase}
                  locale={locale}
                />
              )}
            </TimelineRow>
          ))}
        </>
      ) : null}
    </div>
  );
}

/** Shown when a court filter narrows the day to nothing. */
function EmptyBoard({ locale, onClear }: { locale: Locale; onClear: () => void }) {
  return (
    <Empty className="bg-surface-sunken">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SlidersHorizontal aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{pick(advHome.emptyCourtsTitle, locale)}</EmptyTitle>
        <EmptyDescription>{pick(advHome.emptyCourtsBody, locale)}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm" onClick={onClear}>
        {pick(advHome.courtFilterAll, locale)}
      </Button>
    </Empty>
  );
}

/* ─────────────────────────── the timeline ─────────────────────────── */

export function HearingTimeline({
  daySlots,
  showTimes,
  showConflicts,
  dayPhase,
  courts,
  selectedCourts,
  onCourtsChange,
  onViewCauseList,
  onJoinCourt,
  onRefresh,
  selectedCaseId,
  onOpenCase,
  onOpenTasks,
  onViewInCauseList,
  locale,
}: {
  /** The day's sittings — one tab each. Version 0 has one. */
  daySlots: DaySlot[];
  /** Surface each hearing's listed time (full view) or not (launch). */
  showTimes: boolean;
  /** State conflicts in the summary (full view) or the slot count instead (launch). */
  showConflicts: boolean;
  /** Where the selected day sits relative to today. */
  dayPhase: "past" | "today" | "future";
  courts: CourtOption[];
  selectedCourts: string[];
  onCourtsChange: (next: string[]) => void;
  onViewCauseList: () => void;
  onJoinCourt: () => void;
  onRefresh: () => void;
  selectedCaseId: string | null;
  onOpenCase: (caseId: string) => void;
  /** Open the tasks rail and trace this case's tasks (the pending-flag click). */
  onOpenTasks: (caseId: string, taskIds: string[]) => void;
  /** Open the cause list and trace this matter's row (the per-hearing icon). */
  onViewInCauseList: (caseId: string) => void;
  locale: Locale;
}) {
  // The day at a glance, aggregated across every sitting.
  const total = daySlots.reduce((n, s) => n + s.board.summary.total, 0);
  const courtCount = new Set(
    daySlots.flatMap((s) => s.board.slots.flatMap((slot) => slot.courts))
  ).size;
  const conflictSlots = daySlots.reduce((n, s) => n + s.board.summary.conflictSlots, 0);
  const hasHearings = daySlots.some((s) => s.board.slots.length > 0);
  // Matters that owe blocking work before their hearing today, across the board.
  const blocking = daySlots.reduce(
    (n, s) =>
      n +
      s.board.slots.reduce(
        (m, slot) => m + slot.hearings.reduce((k, h) => k + h.blockers.length, 0),
        0
      ),
    0
  );

  // The sitting being called now leads; on a past or future day, the first.
  const liveSlot = daySlots.find((s) => s.live) ?? daySlots[0];

  return (
    <OpenTasksContext.Provider value={onOpenTasks}>
      <ShowTimesContext.Provider value={showTimes}>
      <ViewInCauseListContext.Provider value={onViewInCauseList}>
        <div className="flex flex-col gap-4 pb-16 lg:gap-3 lg:pt-2 lg:pb-8">
          <RailStyles />
          {/* From @xl up the row never wraps: the toolbar keeps the top line
              (shrink-0) and the stats take the rest, so the actions never fall
              under the stats. On a phone it still stacks. The extra bottom margin
              holds the refresh button's hover/refreshed caption clear of the board. */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-4 lg:gap-y-3 lg:@xl:flex-nowrap">
            <SummaryStrip
              total={total}
              courts={courtCount}
              slots={daySlots.length}
              blocking={blocking}
              showConflicts={showConflicts}
              conflictSlots={conflictSlots}
              locale={locale}
            />
            <Toolbar
              courts={courts}
              selected={selectedCourts}
              onCourtsChange={onCourtsChange}
              onViewCauseList={onViewCauseList}
              onJoinCourt={onJoinCourt}
              onRefresh={onRefresh}
              locale={locale}
            />
          </div>

          {!hasHearings ? (
            <EmptyBoard locale={locale} onClear={() => onCourtsChange([])} />
          ) : (
            // The day's sittings as underline tabs at the top of the board, the
            // live one throbbing. Version 0 has one sitting, so one tab naming its
            // hours; when a day is split, switching a tab shows that sitting's own
            // timeline.
            <Tabs key={dayPhase} defaultValue={liveSlot.key} className="gap-6">
              <TabsList variant="line" className="flex-wrap">
                {daySlots.map((slot) => (
                  <TabsTrigger
                    key={slot.key}
                    value={slot.key}
                    className="flex-none gap-2 px-3"
                  >
                    <span className="tabular-nums">{slot.label}</span>
                    {slot.live ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="now-dot size-2 shrink-0 rounded-full bg-primary"
                        />
                        <span className="sr-only">{pick(advHome.slotLive, locale)}</span>
                      </>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {daySlots.map((slot) => (
                <TabsContent key={slot.key} value={slot.key}>
                  <Board
                    board={slot.board}
                    dayPhase={dayPhase}
                    selectedCaseId={selectedCaseId}
                    onOpenCase={onOpenCase}
                    locale={locale}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </ViewInCauseListContext.Provider>
      </ShowTimesContext.Provider>
    </OpenTasksContext.Provider>
  );
}
