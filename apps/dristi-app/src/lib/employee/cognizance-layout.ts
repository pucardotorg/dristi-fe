/**
 * Whether Take cognizance shows as one row with two tabs inside it, or as two rows of
 * its own in the rail — a per-browser preference, exactly like `nav-layout.ts`'s rail
 * shape, and deliberately not folded into that module: this is a setting about one row's
 * own shape, not about the rail's.
 *
 * `"tabs"` is the default and today's built behaviour, unchanged: `Without delay` and
 * `With delay` live inside the one `/employee/cognizance` screen (`CognizanceScreen`),
 * as two tabs. `"split"` gives each its own row under `Take cognizance` in the rail —
 * `/employee/cognizance/without-delay` and `/employee/cognizance/with-delay` — sharing
 * the same queue logic (`cognizance.ts`) and the same panel content
 * (`CognizanceQueuePanel`), so the two layouts never drift into two answers about what a
 * tab actually shows.
 *
 * Modelled on `nav-layout.ts`: an in-memory value, restored from `localStorage` once and
 * lazily, safe to import from the server render.
 */

const KEY = "dristi.cognizance-layout";

export type CognizanceLayout = "tabs" | "split";

/** Where the setting stands with nothing stored yet — today's built behaviour. */
export const DEFAULT_COGNIZANCE_LAYOUT: CognizanceLayout = "tabs";

const COGNIZANCE_LAYOUTS: readonly CognizanceLayout[] = ["tabs", "split"];

function isCognizanceLayout(value: string | null): value is CognizanceLayout {
  return (COGNIZANCE_LAYOUTS as readonly (string | null)[]).includes(value);
}

let layout: CognizanceLayout = DEFAULT_COGNIZANCE_LAYOUT;
let restored = false;
const listeners = new Set<() => void>();

/** Bring the stored preference in, once, on the client. */
function restore(): void {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isCognizanceLayout(stored)) layout = stored;
  } catch {
    // Private mode or a cleared quota. The default stands.
  }
}

export function subscribeToCognizanceLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The live setting. Safe as a `useSyncExternalStore` snapshot — it only ever changes. */
export function readCognizanceLayout(): CognizanceLayout {
  restore();
  return layout;
}

/** What the server rendered, and what hydration must agree with. Always the default. */
export function serverCognizanceLayout(): CognizanceLayout {
  return DEFAULT_COGNIZANCE_LAYOUT;
}

/** Switch. Naming the one already live is not a change and notifies nobody. */
export function setCognizanceLayout(next: CognizanceLayout): void {
  if (readCognizanceLayout() === next) return;
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
export function clearCognizanceLayout(): void {
  setCognizanceLayout(DEFAULT_COGNIZANCE_LAYOUT);
}
