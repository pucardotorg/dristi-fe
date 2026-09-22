/**
 * Which shape the court rail takes — a per-browser preference, not a product decision.
 *
 * Three options, kept side by side (owner, 2026-09-21) so they can be judged against
 * each other rather than from memory: `"grouped"` is the rail as it stands, four
 * disclosures transcribed from the reference; `"actions"` keeps Today's hearings a tab
 * of its own and folds everything else except Bulk reschedule hearings and Sign process
 * into one "Today's actions" row; `"schedule"` folds hearings in with that same
 * everything-else instead, and gives them a prominent block inside the one combined
 * screen rather than a row of their own. The rows any of them renders are derived from
 * `COURT_NAV_GROUPS` in `navigation.ts`, never a second copy of what a rail row is.
 *
 * Modelled on `session.ts`: an in-memory value, restored from `localStorage` once and
 * lazily — this module is imported by the server render too, and only the browser side
 * of that can be sure it is safe to ask storage for anything. A demo preference is not
 * court data, so it lives nowhere else and survives nothing but a reload on this
 * browser.
 *
 * Read it through `components/employee/use-court-nav-layout.ts`, never directly from a
 * render — the hook is what subscribes, and what keeps the server's first paint and the
 * browser's hydration agreeing on the default before the stored preference replaces it.
 */

const KEY = "dristi.court-nav-layout";

export type CourtNavLayout = "grouped" | "actions" | "schedule";

/** Where the rail stands with nothing stored yet — also the server's own snapshot. */
export const DEFAULT_COURT_NAV_LAYOUT: CourtNavLayout = "grouped";

function isCourtNavLayout(value: string | null): value is CourtNavLayout {
  return value === "grouped" || value === "actions" || value === "schedule";
}

let layout: CourtNavLayout = DEFAULT_COURT_NAV_LAYOUT;
let restored = false;
const listeners = new Set<() => void>();

/** Bring the stored preference in, once, on the client. */
function restore(): void {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isCourtNavLayout(stored)) layout = stored;
  } catch {
    // Private mode or a cleared quota. The default stands.
  }
}

export function subscribeToCourtNavLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The live layout. Safe as a `useSyncExternalStore` snapshot — it only ever changes. */
export function readCourtNavLayout(): CourtNavLayout {
  restore();
  return layout;
}

/** What the server rendered, and what hydration must agree with. Always the default. */
export function serverCourtNavLayout(): CourtNavLayout {
  return DEFAULT_COURT_NAV_LAYOUT;
}

/** Switch layouts. Naming the one already live is not a change and notifies nobody. */
export function setCourtNavLayout(next: CourtNavLayout): void {
  if (readCourtNavLayout() === next) return;
  layout = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Blocked storage loses persistence, not the switch — listeners still fire.
    }
  }
  for (const listener of listeners) listener();
}

/** Back to the default. Used by tests; there is no reset control in the rail. */
export function clearCourtNavLayout(): void {
  setCourtNavLayout(DEFAULT_COURT_NAV_LAYOUT);
}
