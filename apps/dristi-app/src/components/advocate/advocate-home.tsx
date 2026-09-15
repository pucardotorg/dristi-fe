"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CauseListRow } from "@/lib/advocate/home";
import { CloudAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome, fillCopy } from "@/lib/advocate/content";
import {
  caseRecordFor,
  courtLabelsOf,
  courtRooms,
  dayKeyOf,
  nextHearingDayAfter,
  timelineOn,
  weekOf,
} from "@/lib/advocate/home";
import { useTasks } from "@/lib/tasks/store";
import { TASKS_HOME } from "@/lib/tasks/routes";
import { caseOf, type World } from "@/lib/tasks/selectors";
import type { Task } from "@/lib/tasks/types";
import { archive } from "@/lib/tasks/transitions";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { verbFor } from "@/lib/tasks/permissions";
import { useTaskAct } from "@/components/tasks/task-act-layer";
import { CasePeekSurface } from "@/components/cases/case-peek";
import { CasePeekProvider, useCasePeek } from "@/components/cases/use-case-peek";
import { HomeGreeting } from "@/components/advocate/home-greeting";
import {
  CompanionRail,
  useRailSection,
} from "@/components/advocate/companion-rail";
import {
  HearingTimeline,
  type CourtOption,
} from "@/components/advocate/hearing-timeline";
import { CauseListDialog } from "@/components/advocate/cause-list-dialog";

/** The shell top bar is `h-14`; the sticky rail hangs below it. */
const TOP_BAR = "3.5rem";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Where the court filter is remembered — cleared when the calendar day turns. */
const COURTS_KEY = "advocate-home:courts";

/**
 * The home's clock. The sandbox lists a normal court day (10:00–17:00); pinning
 * the clock to mid-afternoon makes the day always read as one in progress — a
 * morning already concluded, a slot being called now, an afternoon still to come —
 * whatever the wall-clock hour the demo is opened at. The calendar date stays
 * real, so the greeting and week strip are still today. Drop the `setHours` line
 * to run on the live clock.
 */
function useNow(): number {
  const [now] = React.useState(() => {
    const d = new Date();
    d.setHours(14, 10, 0, 0);
    return d.getTime();
  });
  return now;
}

/**
 * The court filter, backed by localStorage so it survives a refresh and clears
 * when the day turns.
 *
 * It reads through `useSyncExternalStore` rather than an effect that sets state:
 * that keeps the server render (no selection) and the client's stored value from
 * disagreeing at hydration, and same-tab writes announce themselves with a
 * `storage` event so the read re-runs. The raw string is the stable snapshot;
 * parsing happens in the component, cached against it.
 */
function subscribeCourts(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function courtsSnapshot(): string {
  try {
    return window.localStorage.getItem(COURTS_KEY) ?? "";
  } catch {
    return "";
  }
}

function useStoredCourts(todayKey: string): [string[], (next: string[]) => void] {
  const raw = React.useSyncExternalStore(subscribeCourts, courtsSnapshot, () => "");
  const courts = React.useMemo(() => {
    try {
      const parsed = raw ? (JSON.parse(raw) as { day?: string; courts?: unknown }) : null;
      if (parsed && parsed.day === todayKey && Array.isArray(parsed.courts)) {
        return parsed.courts.filter((c): c is string => typeof c === "string");
      }
    } catch {
      /* A corrupt entry just reads as no filter. */
    }
    return [];
  }, [raw, todayKey]);

  const setCourts = React.useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(
          COURTS_KEY,
          JSON.stringify({ day: todayKey, courts: next })
        );
        // A same-tab write does not fire `storage` on its own — announce it so
        // the store subscription re-reads and the view updates at once.
        window.dispatchEvent(new StorageEvent("storage", { key: COURTS_KEY }));
      } catch {
        /* No store, no persistence — the selection simply will not survive a refresh. */
      }
    },
    [todayKey]
  );

  return [courts, setCourts];
}

/**
 * The advocate home — the day in court, and what stands in its way.
 *
 * One world, three surfaces: the unified cause-list timeline (from
 * `Case.nextHearingAt`, grouped by time across every court), the pending-tasks
 * rail (the coming week of the Needs-action tab), and the case peek — the same
 * peek Your Cases uses, over the bridged record. Acting on a task happens in
 * place, through the same modal-and-flow table /tasks runs.
 */
export function AdvocateHome(props: {
  locale: Locale;
  profileFirstName: string;
}) {
  const now = useNow();
  return (
    // Docked: the redesigned full-height panel that slides in from the right and
    // sits over the screen, the same shape the cases landing uses — not the older
    // inset floating card.
    <CasePeekProvider now={now} docked>
      <HomeBody {...props} now={now} />
    </CasePeekProvider>
  );
}

function HomeBody({
  locale,
  profileFirstName,
  now,
}: {
  locale: Locale;
  profileFirstName: string;
  now: number;
}) {
  const store = useTasks();
  const { state, people, cases, tasks, user, reload } = store;
  const router = useRouter();
  const { run: actOn, layer: actLayer } = useTaskAct();
  const { act: runTaskAction } = useTaskActions();

  // Archive a task straight from the rail — it drops out of Pending and lands in
  // the Archived tab on the tasks page (restorable there).
  const onArchiveTask = React.useCallback(
    (task: Task) => {
      void runTaskAction(
        task.id,
        archive,
        "Archived — find it under the Archived tab"
      );
    },
    [runTaskAction]
  );
  const peek = useCasePeek();

  const world = React.useMemo<World>(
    () => ({ people, cases, tasks, user, now: new Date(now) }),
    [people, cases, tasks, user, now]
  );

  const todayKey = dayKeyOf(now);
  const [selectedDay, setSelectedDay] = React.useState<string>(todayKey);
  /** Which week the strip shows — pages independently of today. */
  const [weekAnchor, setWeekAnchor] = React.useState<number>(now);
  // Not `useState`: which panel stands open is remembered per user, so a rail
  // closed last week is still closed. First run opens the tasks panel.
  const [railSection, setRailSection] = useRailSection();

  // Clicking a hearing's "pending" flag opens the tasks rail and traces a stroke
  // around that case's tasks. The nonce lets the same case re-trigger the trace.
  // (One of two competing patterns on show — the peek also lists pending work —
  // to be resolved with the team.)
  const [taskHighlight, setTaskHighlight] = React.useState<{
    caseId: string;
    taskIds: string[];
    nonce: number;
  } | null>(null);
  const openTasksForCase = React.useCallback(
    (caseId: string, taskIds: string[]) => {
      setRailSection("tasks");
      setTaskHighlight({ caseId, taskIds, nonce: Date.now() });
    },
    [setRailSection]
  );

  // The court filter. No selection means every court; a chosen set narrows the
  // timeline. It survives a refresh (localStorage) but resets when the day turns:
  // yesterday's filter is not today's day.
  const [selectedCourts, changeCourts] = useStoredCourts(todayKey);

  const week = React.useMemo(
    () => weekOf(world, now, weekAnchor),
    [world, now, weekAnchor]
  );

  // The full day cause list opens in a near-fullscreen modal over the board.
  const [causeListOpen, setCauseListOpen] = React.useState(false);
  const onViewCauseList = React.useCallback(() => setCauseListOpen(true), []);
  // No courtroom URL is supplied yet. Keep the selected hearing explicit.
  const onJoinHearing = React.useCallback((row: CauseListRow) => {
    toast.info(pick({ en: "Hearing link unavailable", ml: "വിചാരണ ലിങ്ക് ലഭ്യമല്ല" }, locale), {
      description: `${row.parties} · ${row.courtLabel} · ${row.courtNumber ?? "N/A"}`,
    });
  }, [locale]);
  const onJoinCourt = React.useCallback(() => {
    toast.info(pick({ en: "Choose a hearing from the cause list", ml: "കോസ് ലിസ്റ്റിൽ നിന്ന് ഒരു വിചാരണ തിരഞ്ഞെടുക്കുക" }, locale));
    setCauseListOpen(true);
  }, [locale]);

  // The courts the filter offers: those with a matter listed on the day. A court
  // with nothing today is not worth offering — selecting it would only empty the
  // view. Labels share the establishment run so the option reads "CJM Court", not
  // "CJM Court, Kollam".
  const courtOptions = React.useMemo<CourtOption[]>(() => {
    const rooms = courtRooms(world, selectedDay, now).filter((r) => r.count > 0);
    const labels = courtLabelsOf(rooms.map((r) => r.court));
    return rooms.map((room) => ({
      court: room.court,
      label: labels.shortOf(room.court),
      count: room.count,
    }));
  }, [world, selectedDay, now]);

  const timeline = React.useMemo(
    () => timelineOn(world, selectedDay, now, selectedCourts),
    [world, selectedDay, now, selectedCourts]
  );

  // The selected day's due count — the same number the week strip's amber dot
  // stands for, now stated in the summary strip rather than under the greeting.
  const tasksDue = React.useMemo(
    () => week.find((c) => c.key === selectedDay)?.due ?? 0,
    [week, selectedDay]
  );

  // Where the selected day sits relative to today. `dayKeyOf` is a zero-padded
  // YYYY-MM-DD, so a plain string compare orders the days. A past day is wholly
  // concluded; a future day is wholly upcoming — the timeline drops the
  // "nothing is being called" line off today and opens the concluded pile behind.
  const dayPhase: "past" | "today" | "future" =
    selectedDay === todayKey ? "today" : selectedDay < todayKey ? "past" : "future";

  const jump = React.useMemo(() => {
    const next = nextHearingDayAfter(world, selectedDay);
    if (!next) return null;
    const label = new Intl.DateTimeFormat(locale === "ml" ? "ml-IN" : "en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(new Date(`${next.key}T12:00:00`));
    return { ...next, label };
  }, [world, selectedDay, locale]);

  function selectDay(key: string) {
    setSelectedDay(key);
    peek.close();
    // Selecting a day in another week re-anchors the strip to it.
    setWeekAnchor(new Date(`${key}T12:00:00`).getTime());
  }

  /** Open the shared case peek for any matter in the world, via the bridge. */
  const openCase = React.useCallback(
    (caseId: string) => {
      const kase = cases.find((c) => c.id === caseId);
      if (!kase) return;
      const record = caseRecordFor(kase, kase.nextHearingAt);
      if (record) peek.open(record);
    },
    [cases, peek]
  );

  /** The viewer's verb for a task — what the rail's hover overlay names. */
  const verbOf = React.useCallback(
    (task: (typeof tasks)[number]) => {
      const kase = caseOf({ cases }, task);
      return kase ? verbFor(user, task, kase) : "Open";
    },
    [cases, user]
  );

  const selectedCaseId = React.useMemo(() => {
    const id = peek.record?.id;
    return id?.startsWith("tw-") ? id.slice(3) : null;
  }, [peek.record]);

  // A failure and a slow load are not the same screen. One spinner stood for
  // both, so a failed load spun forever with no way out of it.
  if (state === "error") {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudAlert aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{pick(advHome.loadErrorTitle, locale)}</EmptyTitle>
            <EmptyDescription>
              {pick(advHome.loadErrorBody, locale)}
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            <RotateCw aria-hidden="true" />
            {pick(advHome.retry, locale)}
          </Button>
        </Empty>
      </main>
    );
  }

  // A reload keeps the board on screen (stale while it re-reads) rather than
  // dropping to a spinner: the store holds the last data through the load, so a
  // refresh updates the list in place instead of blanking the whole page. The
  // spinner is only for the very first load, when there is nothing to show yet.
  if (state !== "ready" && cases.length === 0) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </main>
    );
  }

  const hasDay = courtOptions.length > 0;

  return (
    <CasePeekSurface className="flex min-h-0 min-w-0 flex-1">
      {/* A container, not just a column: the rail narrows the board without
          narrowing the viewport, so what the timeline puts on one line has to
          answer to its own width. */}
      <main className="@container flex min-w-0 flex-1 flex-col">
        <div className="px-4 pt-6 pb-6 md:px-8">
          <HomeGreeting
            locale={locale}
            firstName={profileFirstName}
            now={now}
            week={week}
            selectedDay={selectedDay}
            onSelectDay={selectDay}
            onShiftWeek={(delta) => setWeekAnchor((a) => a + delta * 7 * DAY_MS)}
            onPickDate={(date) => selectDay(dayKeyOf(date))}
          />
        </div>

        {/* A hairline closes the header off from the board's controls and stats,
            inset to the content margins rather than running edge to edge. */}
        <div className="px-4 md:px-8" aria-hidden="true">
          <div className="border-b border-hairline" />
        </div>

        {hasDay ? (
          <div className="px-4 pt-4 md:px-8">
            <HearingTimeline
              timeline={timeline}
              tasksDue={tasksDue}
              dayPhase={dayPhase}
              courts={courtOptions}
              selectedCourts={selectedCourts}
              onCourtsChange={changeCourts}
              onViewCauseList={onViewCauseList}
              onJoinCourt={onJoinCourt}
              onRefresh={() => void reload()}
              selectedCaseId={selectedCaseId}
              onOpenCase={openCase}
              onOpenTasks={openTasksForCase}
              locale={locale}
            />
          </div>
        ) : (
          <div className="px-4 pt-4 pb-8 md:px-8">
            <Empty className="bg-surface-sunken">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CloudAlert aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{pick(advHome.emptyDayTitle, locale)}</EmptyTitle>
                <EmptyDescription>
                  {pick(advHome.emptyDayBody, locale)}
                </EmptyDescription>
              </EmptyHeader>
              {jump ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectDay(jump.key)}
                >
                  {fillCopy(advHome.jumpNext, locale, {
                    day: jump.label,
                    n: String(jump.count),
                  })}
                </Button>
              ) : null}
            </Empty>
          </div>
        )}
      </main>

      <CompanionRail
        world={world}
        locale={locale}
        section={railSection}
        topOffset={TOP_BAR}
        onSectionChange={(section) => {
          setTaskHighlight(null);
          setRailSection(section);
        }}
        highlight={taskHighlight}
        verbOf={verbOf}
        onAct={actOn}
        onArchive={onArchiveTask}
        onViewAllTasks={() => router.push(TASKS_HOME)}
      />

      <CauseListDialog
        open={causeListOpen}
        onOpenChange={setCauseListOpen}
        world={world}
        now={now}
        day={selectedDay}
        onJoin={onJoinHearing}
        locale={locale}
      />

      {actLayer}
    </CasePeekSurface>
  );
}
