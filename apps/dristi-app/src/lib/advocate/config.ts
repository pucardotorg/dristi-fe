/**
 * Advocate home — launch configuration.
 *
 * The home screen is built for the full picture: hearings grouped by clock time
 * across courts, approximate-time marking, and conflict (double-booking)
 * detection. Version 1.0 launches with a narrower court feed — one sitting a day,
 * no per-matter times, no conflict signal — so those surfaces are *turned off*
 * here rather than removed. The selectors still compute everything from the
 * backend day; this config only decides what the screen surfaces, so a later
 * release re-enables the fuller view by flipping one preset, with no code to
 * rebuild.
 *
 * What each flag gates:
 * - `showHearingTimes` — each hearing's listed time (and the "~approx" marking).
 *   The *sitting* keeps its time range regardless; that range is what labels a
 *   slot tab and the summary's slot stat. Off for v1: a matter is a list item.
 * - `showConflicts` — the conflict tag, the amber slot treatment, and the
 *   conflict count in the summary. Off for v1: no time means no double-booking to
 *   show.
 * - `groupByTime` — group upcoming and concluded matters into shared time slots
 *   (the full view) versus a flat list with only the ongoing matters grouped
 *   (v1). Ongoing is always one group: those are the matters being called now.
 * - `sittings` — the day's court sittings. Each becomes a tab at the top of the
 *   board with its own timeline; a day with one sitting shows no tab bar. v1
 *   ships one all-day sitting, so the tab machinery is present but dormant. This
 *   stands in for a court-calendar feed the backend will supply.
 */

/** A court sitting — a continuous block of the court day, in local "HH:MM". */
export type Sitting = { start: string; end: string };

export type AdvocateHomeConfig = {
  showHearingTimes: boolean;
  showConflicts: boolean;
  groupByTime: boolean;
  /** The day's sittings, in order. One entry → no tabs; two or more → a tab each. */
  sittings: Sitting[];
};

/** The whole day as one 9-to-5 sitting — the launch default. */
const ONE_SITTING: Sitting[] = [{ start: "09:00", end: "17:00" }];

/**
 * Version 1.0 launch: one sitting, no per-matter times, no conflict signal, flat
 * lists with only the ongoing matters grouped.
 */
export const V1_LAUNCH: AdvocateHomeConfig = {
  showHearingTimes: false,
  showConflicts: false,
  groupByTime: false,
  sittings: ONE_SITTING,
};

/**
 * The full picture the screen was designed for — times, conflicts, and
 * time-slot grouping. Flip `ADVOCATE_HOME_CONFIG` to this to restore it.
 */
export const V3_FULL: AdvocateHomeConfig = {
  showHearingTimes: true,
  showConflicts: true,
  groupByTime: true,
  sittings: ONE_SITTING,
};

/**
 * A v1 day split into a morning and an afternoon sitting — for previewing the
 * (dormant) slot-tab design without turning any of the fuller surfaces back on.
 */
export const V1_TWO_SITTINGS: AdvocateHomeConfig = {
  ...V1_LAUNCH,
  sittings: [
    { start: "09:00", end: "13:00" },
    { start: "14:00", end: "17:00" },
  ],
};

/** The active configuration. Launch ships v1. */
export const ADVOCATE_HOME_CONFIG: AdvocateHomeConfig = V1_LAUNCH;
