/**
 * Advocate home — pure selectors over the tasks world.
 *
 * The home screen is a *view* of the same world `/tasks` reads (`useTasks()` →
 * `World`), never a second data source: the cause-list board derives from
 * `Case.nextHearingAt`, the rail from `tasksInView`, and the blockers shown on a
 * hearing are the very tasks the rail lists — one world, two angles. Everything here
 * is pure over `(world, now)` so the tests can pin the clock.
 *
 * What is deliberately NOT here: outcomes of concluded items, cause-list item numbers
 * from the court, and "the court is in session" — none of those exist in the world
 * yet. Item numbers are derived from time order (the honest stand-in), "now" is a
 * hearing whose listed time window covers the clock, and concluded items state no
 * outcome rather than inventing one.
 */

import { CASES as CASE_RECORDS } from "@/lib/cases/fixtures";
import type { CaseRecord } from "@/lib/cases/types";
import type { Case, Person, PersonId, Task } from "@/lib/tasks/types";
import { caseOf, tasksInView, sortTasks, type World } from "@/lib/tasks/selectors";
import { ACTIONABLE, advocatesOf, canView } from "@/lib/tasks/permissions";
import { compareUrgency, consequenceAt } from "@/lib/tasks/urgency";

/** How long a listed item is treated as live once its time arrives. */
const HEARING_WINDOW_MS = 90 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ───────────────────────────── days ───────────────────────────── */

/** Local calendar day, "2026-08-28" — the key the week strip and board share. */
export function dayKeyOf(when: string | number | Date): string {
  const d = new Date(when);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export type WeekCell = {
  key: string;
  /** Noon local on that day — safe to format without timezone edges. */
  at: Date;
  today: boolean;
  /** Listed matters that day, across courts (viewable cases only). */
  hearings: number;
  /** Needs-action tasks whose consequence date lands that day. */
  due: number;
};

/**
 * Monday-to-Sunday of the week containing `anchor` (today's week by default),
 * with the day dots filled in. `now` only decides which cell is "today", so the
 * strip can page to other weeks without moving the today marker.
 */
export function weekOf(
  world: World,
  now: number | Date = Date.now(),
  anchor: number | Date = now
): WeekCell[] {
  const base = new Date(anchor);
  base.setHours(12, 0, 0, 0);
  // getDay(): Sunday 0 — the week here runs Monday to Sunday, as courts do.
  const monday = base.getTime() - ((base.getDay() + 6) % 7) * DAY_MS;

  const hearingDays = new Map<string, number>();
  for (const c of viewableCases(world)) {
    if (!c.nextHearingAt) continue;
    const key = dayKeyOf(c.nextHearingAt);
    hearingDays.set(key, (hearingDays.get(key) ?? 0) + 1);
  }

  const dueDays = new Map<string, number>();
  for (const task of tasksInView(world, "needs-action")) {
    const at = consequenceAt(task);
    if (!at) continue;
    const key = dayKeyOf(at);
    dueDays.set(key, (dueDays.get(key) ?? 0) + 1);
  }

  const todayKey = dayKeyOf(now);
  return Array.from({ length: 7 }, (_, i) => {
    const at = new Date(monday + i * DAY_MS);
    const key = dayKeyOf(at);
    return {
      key,
      at,
      today: key === todayKey,
      hearings: hearingDays.get(key) ?? 0,
      due: dueDays.get(key) ?? 0,
    };
  });
}

/* ───────────────────────────── hearings ───────────────────────────── */

export type HearingStatus = "now" | "upcoming" | "concluded";

export type HomeHearing = {
  kase: Case;
  /** Cause-list position for the day in this court — derived from time order. */
  item: number;
  /** The listed time (`Case.nextHearingAt`). */
  at: string;
  status: HearingStatus;
  /**
   * The listed time is approximate — an upcoming matter with no court-given
   * fixed slot. A concluded or ongoing hearing is exact; a rescheduled upcoming
   * one (`Case.timeFixed`) is exact too.
   */
  approxTime: boolean;
  /** Actionable blocking tasks on the case, most urgent first. */
  blockers: Task[];
  /** No open blocking task stands between the case and the hearing. */
  ready: boolean;
};

function viewableCases(world: World): Case[] {
  return world.cases.filter((c) => canView(world.user, c));
}

function statusOf(at: string, now: number): HearingStatus {
  const start = new Date(at).getTime();
  if (now < start) return "upcoming";
  if (now < start + HEARING_WINDOW_MS) return "now";
  return "concluded";
}

function blockersOf(world: World, kase: Case, now: number): Task[] {
  return world.tasks
    .filter((t) => t.caseId === kase.id && t.isBlocking && ACTIONABLE.has(t.status))
    .sort((a, b) => compareUrgency(a, b, new Date(now)));
}

/** Every listed matter on `dayKey` in one court, numbered in time order. */
export function hearingsOn(
  world: World,
  court: string,
  dayKey: string,
  now: number = Date.now()
): HomeHearing[] {
  return viewableCases(world)
    .filter(
      (c) => c.court === court && c.nextHearingAt && dayKeyOf(c.nextHearingAt) === dayKey
    )
    .sort(
      (a, b) =>
        new Date(a.nextHearingAt!).getTime() - new Date(b.nextHearingAt!).getTime() ||
        a.stNumber.localeCompare(b.stNumber)
    )
    .map((kase, index) => {
      const at = kase.nextHearingAt!;
      const blockers = blockersOf(world, kase, now);
      const status = statusOf(at, now);
      return {
        kase,
        item: index + 1,
        at,
        status,
        approxTime: status === "upcoming" && !kase.timeFixed,
        blockers,
        ready: blockers.length === 0,
      };
    });
}

export type CourtRoom = {
  court: string;
  /** Listed matters on the selected day. */
  count: number;
  /** An item's listed window covers the clock right now. */
  live: boolean;
};

/**
 * The day's courts: every court the user can see, the flagship ON court first,
 * each with its day count and whether it is live at the moment. The board stacks
 * one section per court that has matters; the rest are named in one line.
 */
export function courtRooms(
  world: World,
  dayKey: string,
  now: number = Date.now()
): CourtRoom[] {
  const courts = [...new Set(viewableCases(world).map((c) => c.court))].sort((a, b) => {
    const aOn = a.startsWith("24×7") ? 0 : 1;
    const bOn = b.startsWith("24×7") ? 0 : 1;
    return aOn - bOn || a.localeCompare(b);
  });
  return courts.map((court) => {
    const listed = hearingsOn(world, court, dayKey, now);
    return {
      court,
      count: listed.length,
      live: listed.some((h) => h.status === "now"),
    };
  });
}

export type CourtLabels = {
  /** The trailing run every court name shares — "Kollam" — or null. */
  establishment: string | null;
  /** The court name with that shared run removed. Identity when there is none. */
  shortOf: (court: string) => string;
};

/**
 * The part of the court names that is the same on all of them, said once.
 *
 * Four courts reading "…, Kollam" spend forty characters on one fact, and the
 * fact belongs above the stack rather than on every heading. This computes it
 * from the data instead of matching a literal: an English `.replace(", Kollam")`
 * silently no-ops in a Malayalam or Gujarati deployment, and how a court is named
 * is a state-layer concern (`product-foundation.md` §2), not a view's edit.
 *
 * The rule is the longest common *trailing* run of `", "`-separated segments that
 * still leaves every court at least one leading segment of its own — so a court
 * called only "Kollam" stops the run rather than being erased by it. No run, one
 * court, or unrelated names all fall through to the full label, which is always
 * correct. The `", "` split is itself a punctuation assumption; it is safe rather
 * than durable, and the durable fix is structured court data (brief §15.11 Q7).
 */
export function courtLabelsOf(courts: string[]): CourtLabels {
  const identity = (court: string) => court;
  const names = [...new Set(courts)];
  if (names.length < 2) return { establishment: null, shortOf: identity };

  const parts = names.map((name) => name.split(", "));
  // Every court keeps a leading segment, so the run is always shorter than the
  // shortest name — that guard is what makes a bare "Kollam" fall through.
  const limit = Math.min(...parts.map((p) => p.length)) - 1;

  let run = 0;
  while (run < limit) {
    const segment = parts[0][parts[0].length - 1 - run];
    if (!parts.every((p) => p[p.length - 1 - run] === segment)) break;
    run += 1;
  }
  if (run === 0) return { establishment: null, shortOf: identity };

  const establishment = parts[0].slice(parts[0].length - run).join(", ");
  const suffix = `, ${establishment}`;
  return {
    establishment,
    shortOf: (court) =>
      court.endsWith(suffix) ? court.slice(0, -suffix.length) : court,
  };
}

/** An advocate the day's board can be seen through, with their share of it. */
export type AdvocateOption = {
  person: Person;
  /** Matters listed on the selected day where this advocate is on the case. */
  count: number;
  /** The signed-in account — always first, always present. */
  you: boolean;
};

/**
 * Everyone with a matter listed on the day, for the board's advocate switcher.
 *
 * The signed-in advocate leads and the rest follow alphabetically — not by
 * descending count, because a roster that reorders day to day costs the muscle
 * memory that makes a repeat-user control fast. Counts are "on the case"
 * (`canView`), not "on the vakalatnama": being on the case is what puts a matter
 * on someone's board.
 *
 * Honest limitation, stated where it is implemented: the world is already scoped
 * to one viewer, so choosing a colleague shows the matters you *share* with them,
 * never their own board. An office scope is a product question (brief §15.11 Q8).
 */
export function advocateRosterOn(
  world: World,
  dayKey: string,
  now: number = Date.now()
): AdvocateOption[] {
  const meId: PersonId =
    typeof world.user === "string" ? world.user : world.user.id;
  const tally = new Map<PersonId, { person: Person; count: number }>();

  for (const room of courtRooms(world, dayKey, now)) {
    for (const hearing of hearingsOn(world, room.court, dayKey, now)) {
      for (const person of advocatesOf(hearing.kase, world.people)) {
        if (!canView(person.id, hearing.kase)) continue;
        const entry = tally.get(person.id) ?? { person, count: 0 };
        entry.count += 1;
        tally.set(person.id, entry);
      }
    }
  }

  // The viewer is on the control even on a day that lists nothing of theirs —
  // it is the default, and a switcher missing its own default cannot reset.
  const me =
    world.people.find((p) => p.id === meId) ??
    (typeof world.user === "string" ? null : world.user);
  const self = tally.get(meId) ?? (me ? { person: me, count: 0 } : null);

  return [
    ...(self ? [{ ...self, you: true }] : []),
    ...[...tally.values()]
      .filter((entry) => entry.person.id !== meId)
      .sort((a, b) => a.person.name.localeCompare(b.person.name))
      .map((entry) => ({ ...entry, you: false })),
  ];
}

export type Board = {
  now: HomeHearing | null;
  upcoming: HomeHearing[];
  concluded: HomeHearing[];
};

/**
 * The board below one court tab, split by where the day has got to.
 *
 * Listed windows overlap — two items posted an hour apart are both "live" for a
 * stretch — but only one matter is being called. The earliest live item is the
 * one on the hero; the rest are still to come, so they join `upcoming`. (They
 * used to match none of the three filters and drop off the board entirely, count
 * and all.)
 */
export function boardOf(
  world: World,
  court: string,
  dayKey: string,
  now: number = Date.now()
): Board {
  const listed = hearingsOn(world, court, dayKey, now);
  const live = listed.find((h) => h.status === "now") ?? null;
  return {
    now: live,
    upcoming: listed.filter((h) => h !== live && h.status !== "concluded"),
    concluded: listed.filter((h) => h.status === "concluded"),
  };
}

/* ───────────────────────────── timeline ───────────────────────────── */

/** One hearing on the unified timeline — a `HomeHearing` with its court's short label. */
export type TimelineHearing = HomeHearing & { court: string; courtLabel: string };

/**
 * One time slot on the day's unified timeline.
 *
 * A slot groups every matter listed at the same clock time, across courts. Two
 * or more in one slot is the thing the home screen exists to surface: a
 * double-booking, matters an advocate is due in at once, which the old
 * court-tabbed view could only reveal by cross-referencing tabs by hand.
 */
export type TimeSlot = {
  /** The slot's clock label, "10:30" — what "the same time" means to a reader. */
  key: string;
  /** The listed time the slot's hearings share (ISO). */
  at: string;
  /** Every hearing in the slot, in court then cause-list order. */
  hearings: TimelineHearing[];
  /** Two or more hearings share this time — a conflict. */
  conflict: boolean;
  /** Where the day has got to relative to this slot. */
  phase: HearingStatus;
  /**
   * The slot's time is only a rough listing order, not a fixed clock time —
   * true for an upcoming slot unless every hearing in it has a court-given fixed
   * slot. Concluded and now slots are exact (they have happened / are happening).
   */
  approx: boolean;
  /** Distinct courts represented in the slot. */
  courts: string[];
};

/** The four counts the timeline's summary strip states. */
export type TimelineSummary = {
  /** Total hearings on the (filtered) timeline. */
  total: number;
  /** Slots holding two or more hearings. */
  conflictSlots: number;
  /** Hearings caught up in those conflict slots. */
  overlap: number;
  /** Slots holding exactly one hearing. */
  clearSlots: number;
  /** Distinct courts with a hearing on the (filtered) timeline. */
  courts: number;
};

export type DayTimeline = {
  /** Every slot, chronological. */
  slots: TimeSlot[];
  concluded: TimeSlot[];
  now: TimeSlot[];
  upcoming: TimeSlot[];
  /** The first upcoming slot — the "next hearing" hint. */
  next: TimeSlot | null;
  summary: TimelineSummary;
};

/** The clock label a slot groups on — local "HH:MM", the honest "same time". */
function slotKeyOf(at: string): string {
  const d = new Date(at);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * The whole day as one chronological timeline across every court, grouped into
 * time slots.
 *
 * This is the home screen's answer to "where do I need to be, and when am I
 * double-booked?" — a question the per-court board could not answer without the
 * advocate assembling it tab by tab. `courts`, when non-empty, narrows the
 * timeline to a chosen set; the summary follows the filtered view. Numbering
 * stays the court's own: an item keeps its cause-list position, so a filtered
 * slot still reads "item 7".
 *
 * Phase is decided per slot at read time: any hearing being called makes the slot
 * "now"; all past makes it "concluded"; otherwise it is still to come.
 */
export function timelineOn(
  world: World,
  dayKey: string,
  now: number = Date.now(),
  courts?: readonly string[]
): DayTimeline {
  const rooms = courtRooms(world, dayKey, now);
  const labels = courtLabelsOf(rooms.map((r) => r.court));
  const wanted = courts && courts.length ? new Set(courts) : null;

  const byKey = new Map<string, TimeSlot>();
  for (const room of rooms) {
    if (wanted && !wanted.has(room.court)) continue;
    for (const h of hearingsOn(world, room.court, dayKey, now)) {
      const key = slotKeyOf(h.at);
      const hearing: TimelineHearing = {
        ...h,
        court: room.court,
        courtLabel: labels.shortOf(room.court),
      };
      const slot = byKey.get(key);
      if (slot) {
        slot.hearings.push(hearing);
        // The earliest listing in the slot carries its time — a minute's drift
        // inside one slot should not reorder it against another.
        if (new Date(h.at).getTime() < new Date(slot.at).getTime()) slot.at = h.at;
      } else {
        byKey.set(key, {
          key,
          at: h.at,
          hearings: [hearing],
          conflict: false,
          phase: h.status,
          approx: false,
          courts: [],
        });
      }
    }
  }

  const slots = [...byKey.values()].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  // "Now" is one moment, not every hearing inside a window. The court calls one
  // time-block at a time, so the now slot is the latest block that has started and
  // is still within the live window; earlier started blocks have been called and
  // are concluded, later ones are still to come. This is what keeps three separate
  // clusters from all claiming to be "now".
  let nowKey: string | null = null;
  for (const slot of slots) {
    const at = new Date(slot.at).getTime();
    if (at <= now && now - at <= HEARING_WINDOW_MS) nowKey = slot.key;
  }

  for (const slot of slots) {
    slot.hearings.sort((a, b) => a.court.localeCompare(b.court) || a.item - b.item);
    slot.conflict = slot.hearings.length > 1;
    slot.courts = [...new Set(slot.hearings.map((h) => h.court))];
    const at = new Date(slot.at).getTime();
    slot.phase =
      slot.key === nowKey ? "now" : at > now ? "upcoming" : "concluded";
    // Upcoming slots read as approximate unless every matter in them holds a
    // court-given fixed slot; concluded and now slots are always exact.
    slot.approx =
      slot.phase === "upcoming" && !slot.hearings.every((h) => h.kase.timeFixed);
  }

  const conflictSlots = slots.filter((s) => s.conflict);
  const summary: TimelineSummary = {
    total: slots.reduce((n, s) => n + s.hearings.length, 0),
    conflictSlots: conflictSlots.length,
    overlap: conflictSlots.reduce((n, s) => n + s.hearings.length, 0),
    clearSlots: slots.filter((s) => s.hearings.length === 1).length,
    courts: new Set(slots.flatMap((s) => s.courts)).size,
  };

  return {
    slots,
    concluded: slots.filter((s) => s.phase === "concluded"),
    now: slots.filter((s) => s.phase === "now"),
    upcoming: slots.filter((s) => s.phase === "upcoming"),
    next: slots.find((s) => s.phase === "upcoming") ?? null,
    summary,
  };
}

/** One row of the day's full cause list — every matter listed, across courts. */
export type CauseListRow = {
  /** Stable key + the case behind the row. */
  id: string;
  /** The matter's cause-list position in its own court. */
  item: number;
  parties: string;
  court: string;
  courtLabel: string;
  /** Advocates on the matter, by name, lead first. */
  advocates: string;
  /** The number to quote at the counter — CNR, else the ST number. */
  caseNumber: string;
  /** What the matter is listed for (its stage). */
  hearingType: string;
  status: HearingStatus;
  /** The listed time is a rough order, not a fixed slot (upcoming, unrescheduled). */
  approxTime: boolean;
  /** A matter this advocate is on — marked in the list so hers stand out. */
  mine: boolean;
};

/**
 * The day's full cause list across every court — the whole docket, not only the
 * advocate's own matters, the way the court publishes it. Hers are flagged
 * (`mine`) so they read out of the list at a glance. Ordered by court, then by
 * each court's own cause-list position. `courts`, when given, narrows to a set.
 */
export function causeListOn(
  world: World,
  dayKey: string,
  now: number = Date.now(),
  courts?: readonly string[]
): CauseListRow[] {
  const rooms = courtRooms(world, dayKey, now);
  const labels = courtLabelsOf(rooms.map((r) => r.court));
  const wanted = courts && courts.length ? new Set(courts) : null;
  const nameOf = (id: PersonId) =>
    world.people.find((p) => p.id === id)?.name ?? id;

  const rows: CauseListRow[] = [];
  for (const room of rooms) {
    if (wanted && !wanted.has(room.court)) continue;
    for (const h of hearingsOn(world, room.court, dayKey, now)) {
      rows.push({
        id: h.kase.id,
        item: h.item,
        parties: h.kase.parties,
        court: room.court,
        courtLabel: labels.shortOf(room.court),
        advocates: h.kase.advocates.map(nameOf).join(", "),
        caseNumber: h.kase.cnr || h.kase.stNumber || "—",
        hearingType: h.kase.stage,
        status: h.status,
        approxTime: h.approxTime,
        // Demo stand-in for "an advocate's own matter": the hand-authored set is
        // hers; the scale and past-day fill stand in for the rest of the docket.
        mine: !h.kase.id.startsWith("c-sd") && !h.kase.id.startsWith("c-pd"),
      });
    }
  }
  rows.sort(
    (a, b) => a.courtLabel.localeCompare(b.courtLabel) || a.item - b.item
  );
  return rows;
}

/** Total listed matters on a day across every court — the greeting's number. */
export function matterCountOn(
  world: World,
  dayKey: string,
  now: number = Date.now()
): number {
  return courtRooms(world, dayKey, now).reduce((sum, c) => sum + c.count, 0);
}

/**
 * The next day after `fromKey` with anything listed — where the empty board's
 * "jump ahead" goes. Looks across all viewable cases, not just one court.
 */
export function nextHearingDayAfter(
  world: World,
  fromKey: string
): { key: string; count: number } | null {
  const days = new Map<string, number>();
  for (const c of viewableCases(world)) {
    if (!c.nextHearingAt) continue;
    const key = dayKeyOf(c.nextHearingAt);
    if (key > fromKey) days.set(key, (days.get(key) ?? 0) + 1);
  }
  if (days.size === 0) return null;
  const key = [...days.keys()].sort()[0];
  return { key, count: days.get(key)! };
}

/* ───────────────────────────── rail ───────────────────────────── */

/**
 * The pending-tasks rail: exactly the Needs-action tab of `/tasks`, in the one
 * canonical order — blocking first, then overdue, then by date. Not sliced: the
 * rail scrolls, and an abridged list would silently disagree with its own count.
 */
export function railTasks(world: World): Task[] {
  return sortTasks(world, tasksInView(world, "needs-action"));
}

/** The matter line under a rail task — the case it belongs to. */
export function railCaseLineOf(world: World, task: Task): string {
  return caseOf(world, task)?.parties ?? "";
}

/**
 * The rail's week view: needs-action tasks bucketed by when their consequence
 * lands — overdue, today, tomorrow, then one bucket per day for the rest of the
 * coming week. The bucket header carries the date, so the cards inside do not
 * repeat it. Tasks due beyond the week (or with no date) are left to /tasks;
 * the rail's footer names the full count.
 */
export type RailGroupKey = "today" | "soon" | "week";

export type RailGroup = {
  key: RailGroupKey;
  tasks: Task[];
};

/**
 * Three buckets, no more: due today (overdue folded in — an overdue task is due
 * today most of all, and its card keeps the day count), the next three days,
 * and the rest of the week. The bucket header carries the date words, so the
 * cards inside do not repeat them; past the week is /tasks' business.
 */
export function railGroups(world: World, now: number = Date.now()): RailGroup[] {
  const buckets: Record<RailGroupKey, Task[]> = { today: [], soon: [], week: [] };
  const todayKey = dayKeyOf(now);
  const soonEnd = dayKeyOf(now + 3 * DAY_MS);
  const weekEnd = dayKeyOf(now + 7 * DAY_MS);

  for (const task of railTasks(world)) {
    const at = consequenceAt(task);
    if (!at) continue;
    const key = dayKeyOf(at);
    if (key > weekEnd) continue;
    if (key <= todayKey) buckets.today.push(task);
    else if (key <= soonEnd) buckets.soon.push(task);
    else buckets.week.push(task);
  }

  return (Object.keys(buckets) as RailGroupKey[])
    .map((key) => ({ key, tasks: buckets[key] }))
    .filter((g) => g.tasks.length > 0);
}

/* ───────────────────────────── preparation ───────────────────────────── */

/**
 * What a posting is *for*, in the only terms that change how an advocate spends
 * the week before it.
 *
 * A **substantial** posting is one where something is recorded or decided and the
 * advocate has to arrive with material: evidence is led or a witness is
 * cross-examined, the accused answers the charge, arguments are heard, judgment is
 * pronounced. A **procedural** one moves the file along — appearance and service,
 * cognizance, a posting for compliance — and needs the advocate present, not
 * prepared.
 *
 * The stage names are the world's own (`Case.stage`); this only reads them.
 */
export type HearingWeight = "substantial" | "procedural";

/** Stage words that mean evidence, the plea, arguments, or judgment. */
const SUBSTANTIAL_WORDS = [
  "evidence",
  "cross",
  "examination",
  "argument",
  "judgment",
  "judgement",
  "plea",
  "sworn statement",
];

export function weightOf(stage: string): HearingWeight {
  const s = stage.toLowerCase();
  return SUBSTANTIAL_WORDS.some((w) => s.includes(w)) ? "substantial" : "procedural";
}

/** Whole calendar days from `now`'s day to `at`'s day — 1 is tomorrow. */
export function daysAhead(at: string | number | Date, now: number | Date): number {
  const to = new Date(at);
  to.setHours(12, 0, 0, 0);
  const from = new Date(now);
  from.setHours(12, 0, 0, 0);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export type PrepItem = {
  kase: Case;
  /** The listed hearing being prepared for. */
  at: string;
  /** Whole days away — 1 is tomorrow. Never 0: today's list is the board. */
  inDays: number;
  /** Actionable blocking tasks on the case — a second cue, not the reason it is here. */
  blockers: Task[];
};

export type PrepGroupKey = "week" | "later";
export type PrepGroup = { key: PrepGroupKey; items: PrepItem[] };

/** How far ahead preparation is worth surfacing — three court weeks. */
const PREP_HORIZON_DAYS = 21;

/**
 * The hearings worth preparing for: substantial postings ahead of today, soonest
 * first, inside the horizon.
 *
 * The point of this list is lead time. An evidence posting three weeks out needs
 * the witness lined up now; it belongs here whether or not a task happens to be
 * open on the case, and an appearance posting tomorrow does not belong here at
 * all — nothing is prepared for it. That is why it is not the blocking-task list
 * wearing a different hat: those live in Pending tasks, and appear on a card here
 * only as a second cue.
 *
 * Today is excluded on purpose: today's matters are the board, in full.
 */
export function prepAhead(world: World, now: number = Date.now()): PrepItem[] {
  const todayKey = dayKeyOf(now);
  const horizon = dayKeyOf(now + PREP_HORIZON_DAYS * DAY_MS);
  return viewableCases(world)
    .filter((c) => {
      if (!c.nextHearingAt) return false;
      const key = dayKeyOf(c.nextHearingAt);
      return key > todayKey && key <= horizon && weightOf(c.stage) === "substantial";
    })
    .map((kase) => ({
      kase,
      at: kase.nextHearingAt!,
      inDays: daysAhead(kase.nextHearingAt!, now),
      blockers: blockersOf(world, kase, now),
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * The same list under two headers: the next seven days, then the rest of the
 * horizon. Two groups, because the only cut that changes behaviour is "this week
 * — start now" against "on the horizon".
 */
export function prepGroups(world: World, now: number = Date.now()): PrepGroup[] {
  const items = prepAhead(world, now);
  const groups: PrepGroup[] = [
    { key: "week", items: items.filter((i) => i.inDays <= 7) },
    { key: "later", items: items.filter((i) => i.inDays > 7) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

/* ───────────────────────────── access ───────────────────────────── */

/**
 * Everyone on a matter, vakalatnama holders first — a case is rarely one
 * advocate's, and the row has to say whose it is. `acts` is the line between
 * signing/paying/filing and preparing; `you` marks the signed-in account.
 */
export type TeamMember = { person: Person; acts: boolean; you: boolean };

export function teamOf(world: World, kase: Case): TeamMember[] {
  const id = typeof world.user === "string" ? world.user : world.user.id;
  return advocatesOf(kase, world.people).map((person) => ({
    person,
    acts: kase.signatories.includes(person.id),
    you: person.id === id,
  }));
}

/**
 * Whether the user holds the vakalatnama on a case — the line between matters
 * they act in and matters they can only watch. Signatories may sign, pay and
 * file; everyone else on the case prepares and follows.
 */
export function holdsVakalatnama(world: World, kase: Case): boolean {
  const id = typeof world.user === "string" ? world.user : world.user.id;
  return kase.signatories.includes(id);
}

/**
 * The cases-world record for a sandbox matter — the bridge that lets the home
 * screen open the same case peek and case file as Your Cases. Records live in
 * `lib/cases/fixtures` under id `tw-<sandbox id>`; the hearing being looked at
 * overrides the record's placeholder next-hearing with the real listing.
 */
export function caseRecordFor(kase: Case, hearingAt?: string): CaseRecord | null {
  const record = CASE_RECORDS.find((r) => r.id === `tw-${kase.id}`);
  if (!record) return record ?? null;
  if (!hearingAt) return record;
  return {
    ...record,
    nextHearing: { on: dayKeyOf(hearingAt), purpose: kase.stage },
  };
}
