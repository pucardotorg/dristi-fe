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
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import type {
  DayTimeline,
  TimelineHearing,
  TimeSlot,
} from "@/lib/advocate/home";
import { cn } from "@/lib/utils";
import { ItemChip } from "@/components/advocate/home-bits";
import { HomeRefreshButton } from "@/components/advocate/refresh-button";
import type { AvatarSurface } from "@/components/tasks/person-avatar";
import { peekExtras } from "@/lib/cases/peek";

/**
 * The pending count a hearing row flags. The peek states the same "Pending
 * before the hearing" list from the case's authored sidecar, so the flag counts
 * that list — the number on the row and the number in the peek then agree. A
 * matter with no authored pending work (the scale and past-day fill) flags
 * nothing. `Case.id` bridges to the peek record as `tw-<id>`.
 */
function pendingCountFor(caseId: string): number {
  return peekExtras(`tw-${caseId}`).tasks?.length ?? 0;
}

/**
 * Clicking a hearing's pending flag opens the tasks rail and traces its tasks.
 * Threaded by context rather than through every slot component down to the row.
 * Null when the screen wires no handler — the flag then renders as a plain tag.
 */
const OpenTasksContext = React.createContext<((caseId: string) => void) | null>(
  null
);

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

/**
 * A court's badge tint, chosen by name so the same court always reads the same.
 * Past four courts the hues cycle; the badge text, not the colour, identifies it.
 */
const COURT_TINTS = [
  "bg-brand-muted text-brand-muted-foreground",
  "bg-info-muted text-info-muted-foreground",
  "bg-success-muted text-success-muted-foreground",
  "bg-secondary text-secondary-foreground",
] as const;

function courtTint(court: string): string {
  let hash = 0;
  for (let i = 0; i < court.length; i += 1) {
    hash = (hash * 31 + court.charCodeAt(i)) >>> 0;
  }
  return COURT_TINTS[hash % COURT_TINTS.length];
}

function CourtBadge({
  court,
  label,
  className,
}: {
  court: string;
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(courtTint(court), className)}>
      {label}
    </Badge>
  );
}

/** The distinct court labels across a set of hearings, in first-seen order. */
function distinctCourts(hearings: TimelineHearing[]): string[] {
  return [...new Set(hearings.map((h) => h.courtLabel))];
}

/**
 * The courts a slot spans on one line, filling the width it is given and folding
 * only the overflow into "+N more" — measured with a hidden span, re-measured on
 * resize. `className` sets its colour for the surface it sits on.
 */
function CourtOverflow({
  labels,
  locale,
  className,
}: {
  labels: string[];
  locale: Locale;
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [count, setCount] = React.useState(labels.length);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;
    const fit = () => {
      const width = wrap.clientWidth;
      if (width <= 0) return;
      let n = labels.length;
      while (n > 1) {
        const shown = labels.slice(0, n).join(" · ");
        const suffix =
          n < labels.length
            ? ` ${fillCopy(advHome.courtFilterMore, locale, { n: String(labels.length - n) })}`
            : "";
        measure.textContent = shown + suffix;
        if (measure.scrollWidth <= width) break;
        n -= 1;
      }
      setCount(n);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [labels, locale]);

  const extra = labels.length - count;
  return (
    <span
      ref={wrapRef}
      className={cn("relative min-w-0 flex-1 truncate text-caption", className)}
    >
      {labels.slice(0, count).join(" · ")}
      {extra > 0
        ? ` ${fillCopy(advHome.courtFilterMore, locale, { n: String(extra) })}`
        : ""}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute left-0 whitespace-nowrap"
      />
    </span>
  );
}

/* ─────────────────────────── summary strip ─────────────────────────── */

/** The day at a glance, inline on the page with hairline dividers — no cards,
 *  so the numbers carry their own weight without wells of empty space. */
function SummaryStrip({
  summary,
  tasksDue,
  locale,
}: {
  summary: DayTimeline["summary"];
  tasksDue: number;
  locale: Locale;
}) {
  const { total, conflictSlots, courts } = summary;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @5xl:gap-x-6">
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
      <Stat
        value={conflictSlots}
        label={pick(
          conflictSlots === 1 ? advHome.statConflictOne : advHome.statConflictMany,
          locale
        )}
        warning={conflictSlots > 0}
      />
      <Sep />
      <Stat
        value={tasksDue}
        label={pick(tasksDue === 1 ? advHome.statDueOne : advHome.statDueMany, locale)}
      />
    </div>
  );
}

function Sep() {
  return <span aria-hidden="true" className="h-4 w-px bg-hairline" />;
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
    <span className="flex items-baseline gap-1.5">
      <span
        className={cn(
          "text-body font-semibold tabular-nums @5xl:text-title-s",
          warning && "text-warning-ink"
        )}
      >
        {value}
      </span>
      <span className="text-caption text-muted-foreground @5xl:text-body">{label}</span>
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
    <div className="flex shrink-0 items-center gap-2">
      <CourtFilter
        courts={courts}
        selected={selected}
        onChange={onCourtsChange}
        locale={locale}
      />
      {/* Only on the tightest board (the rail open with the side nav expanded,
          below @3xl) do the two actions fall to icons; from @3xl up they keep
          their labels — the rail-open-with-nav-collapsed band has room for the
          text once the stats compact. The All-courts filter keeps its label
          throughout. */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewCauseList}
        aria-label={pick(advHome.viewCauseList, locale)}
        className="px-2.5 @4xl:px-3"
      >
        <ScrollText aria-hidden="true" />
        <span className="hidden @4xl:inline">{pick(advHome.viewCauseList, locale)}</span>
      </Button>
      <Button
        size="sm"
        onClick={onJoinCourt}
        aria-label={pick(advHome.joinCourtroom, locale)}
        className="px-2.5 @4xl:px-3"
      >
        <Video aria-hidden="true" />
        <span className="hidden @4xl:inline">{pick(advHome.joinCourtroom, locale)}</span>
      </Button>
      {/* The day's-list refresh — always an icon, to the right of Join, with the
          three-beat gesture and the last-refreshed reveal. */}
      <HomeRefreshButton onRefresh={onRefresh} locale={locale} />
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
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListFilter aria-hidden="true" className="text-muted-foreground" />
          {selected.length === 0 ? (
            pick(advHome.courtFilterAll, locale)
          ) : (
            <span className="flex items-center gap-1.5">
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
      <DropdownMenuContent align="start" className="max-h-80 min-w-52 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
          className="text-caption"
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
            className="text-caption"
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
      <div className="flex w-3 shrink-0 justify-center">
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
  locale,
}: {
  count: number;
  caseId: string;
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
      aria-label={pick(advHome.pendingOpen, locale)}
      onClick={(event) => {
        event.stopPropagation();
        onOpenTasks(caseId);
      }}
      className="relative z-10 inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-warning bg-warning-muted px-1.5 text-caption font-medium text-warning-muted-foreground transition-colors hover:bg-warning-muted-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      {label}
      <ChevronRight aria-hidden="true" className="size-3.5" />
    </button>
  );
}

/**
 * One hearing, two lines beside its cause-list item box: the matter (bold), then
 * the stage and case number. The court badge and time sit on the right, with a
 * pending flag when the matter still owes work.
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
  return (
    <div
      className={cn(
        "group/row relative flex items-start gap-3 px-4 py-3 transition-colors",
        selected && "ring-2 ring-inset ring-brand-accent",
        className
      )}
    >
      <ItemChip item={hearing.item} size="lg" surface={boxSurface} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => onOpenCase(hearing.kase.id)}
          className="text-left text-body font-semibold text-balance after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {hearing.kase.parties}
        </button>
        <span className="truncate text-body-compact text-muted-foreground">
          {hearing.kase.stage}
          {" · "}
          <span className="font-mono">{hearing.kase.cnr || hearing.kase.stNumber}</span>
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 self-center">
        <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:justify-end">
          <PendingChip
            count={pendingCountFor(hearing.kase.id)}
            caseId={hearing.kase.id}
            locale={locale}
          />
          <CourtBadge court={hearing.court} label={hearing.courtLabel} className="relative z-10" />
        </div>
        {showTime ? (
          <HearingTime
            at={hearing.at}
            approx={hearing.approxTime}
            locale={locale}
            className="text-caption text-muted-foreground"
          />
        ) : null}
      </div>
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
    <div className="divide-y divide-hairline overflow-hidden rounded-lg bg-card">
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
function StatusTag({ tone, label }: { tone: "now" | "conflict"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-caption font-medium",
        tone === "now"
          ? "border-brand-accent text-brand-muted-foreground"
          : "border-warning text-warning-ink"
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
  return (
    <div className="flex overflow-hidden rounded-xl bg-brand-muted shadow-raised">
      <span aria-hidden="true" className="w-0.5 shrink-0 bg-brand-accent" />
      <div className="min-w-0 flex-1 p-1.5">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="text-body font-semibold tabular-nums text-brand-muted-foreground">
            {timeOf(slot.at)}
          </span>
          <span className="min-w-0 flex-1 text-body-compact text-brand-muted-foreground">
            {slot.hearings.length}{" "}
            {pick(
              slot.hearings.length === 1 ? advHome.statHearingOne : advHome.statHearingMany,
              locale
            )}
          </span>
          <StatusTag tone="now" label={pick(advHome.ongoingTag, locale)} />
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
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger
            aria-label={fillCopy(advHome.slotExpand, locale, { time: slot.key })}
            className="group/collapsible flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-strong"
          >
            <HearingTime
              at={slot.at}
              approx={slot.approx}
              locale={locale}
              className="shrink-0 text-body-compact font-medium text-foreground"
            />
            <span className="shrink-0 text-caption text-muted-foreground">
              {fillCopy(advHome.conflictPill, locale, { n: String(slot.hearings.length) })}
            </span>
            <CourtOverflow
              labels={distinctCourts(slot.hearings)}
              locale={locale}
              className="text-muted-foreground"
            />
            <StatusTag tone="conflict" label={pick(advHome.conflictTag, locale)} />
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
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
    <div className="overflow-hidden rounded-xl border border-hairline bg-card">
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

  // Each concluded slot is its own white card — a single matter reads like a
  // clear upcoming slot, a cluster opens to its cases — so a day's pile carries
  // the same card-and-gap rhythm, and every row hovers the one light-beige way.
  if (slot.hearings.length === 1) {
    const hearing = slot.hearings[0];
    return (
      <div className="overflow-hidden rounded-lg border border-hairline bg-card">
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
    <div className="overflow-hidden rounded-lg border border-hairline bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group/collapsible flex min-h-10 w-full items-center gap-3 px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-muted">
          <span className="w-16 shrink-0 text-caption tabular-nums">{timeOf(slot.at)}</span>
          <span className="shrink-0 text-caption font-medium">
            {fillCopy(advHome.conflictPill, locale, { n: String(slot.hearings.length) })}
          </span>
          <CourtOverflow
            labels={distinctCourts(slot.hearings)}
            locale={locale}
            className="text-muted-foreground"
          />
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
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
  const hearings = slots.flatMap((s) => s.hearings);
  const courts = new Set(hearings.map((h) => h.court)).size;
  const range =
    hearings.length > 1
      ? `${timeOf(hearings[0].at)} – ${timeOf(hearings[hearings.length - 1].at)}`
      : timeOf(hearings[0].at);
  const summaryLine = [
    range,
    `${hearings.length} ${pick(advHome.concludedWord, locale)}`,
    `${slots.length} ${pick(slots.length === 1 ? advHome.slotOne : advHome.slotMany, locale)}`,
    `${courts} ${pick(courts === 1 ? advHome.statCourtOne : advHome.statCourtMany, locale)}`,
  ].join(" · ");

  return (
    <TimelineRow tone="neutral">
      <Collapsible open={open} onOpenChange={setOpen} className="relative">
        {open ? null : (
          <span
            aria-hidden="true"
            className="absolute inset-x-3 -top-1.5 h-3 rounded-t-xl bg-accent-strong"
          />
        )}
        <CollapsibleTrigger className="group/collapsible relative flex min-h-10 w-full items-center gap-2.5 rounded-xl bg-surface-sunken px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-accent-strong">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-body-compact">{summaryLine}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
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

/** The heading that opens the upcoming zone — a quiet rule extending right. */
function UpcomingSeparator({ label }: { label: string }) {
  return (
    <TimelineRow dot={false}>
      <div className="flex items-center gap-3 pt-2 pb-1">
        <span className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
      </div>
    </TimelineRow>
  );
}

/* ─────────────────────────── the timeline ─────────────────────────── */

export function HearingTimeline({
  timeline,
  tasksDue,
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
  locale,
}: {
  timeline: DayTimeline;
  tasksDue: number;
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
  onOpenTasks: (caseId: string) => void;
  locale: Locale;
}) {
  const { concluded, now, upcoming, summary } = timeline;

  return (
    <OpenTasksContext.Provider value={onOpenTasks}>
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <RailStyles />
      {/* From @xl up the row never wraps: the toolbar keeps the top line
          (shrink-0) and the stats take the rest, so the actions never fall
          under the stats. On a phone it still stacks. The extra bottom margin
          holds the refresh button's hover/refreshed caption clear of the board. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 @xl:flex-nowrap">
        <SummaryStrip summary={summary} tasksDue={tasksDue} locale={locale} />
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

      {timeline.slots.length === 0 ? (
        <Empty className="bg-surface-sunken">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SlidersHorizontal aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{pick(advHome.emptyCourtsTitle, locale)}</EmptyTitle>
            <EmptyDescription>{pick(advHome.emptyCourtsBody, locale)}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => onCourtsChange([])}>
            {pick(advHome.courtFilterAll, locale)}
          </Button>
        </Empty>
      ) : (
        <div className="relative flex flex-col gap-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 bottom-4 left-1.5 w-px -translate-x-1/2 bg-hairline"
          />

          {concluded.length ? (
            // Keyed by phase so the pile re-mounts when the day moves between
            // today and a past day — that is what lets its open-by-default state
            // (expanded on a past day, collapsed on today) take effect.
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
            // "Nothing is being called" only makes sense on a day in progress. A
            // past day is wholly concluded and a future day wholly upcoming, so
            // neither carries a live "now" gap to explain.
            <TimelineRow dot={false}>
              <p className="px-4 py-2 text-body-compact text-muted-foreground">
                {pick(upcoming.length ? advHome.nowEmpty : advHome.noUpcoming, locale)}
              </p>
            </TimelineRow>
          ) : null}

          {upcoming.length ? (
            <>
              <UpcomingSeparator label={pick(advHome.zoneUpcoming, locale)} />
              {upcoming.map((slot) => (
                <TimelineRow
                  key={slot.key}
                  tone={slot.conflict ? "conflict" : "neutral"}
                >
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
      )}
    </div>
    </OpenTasksContext.Provider>
  );
}
