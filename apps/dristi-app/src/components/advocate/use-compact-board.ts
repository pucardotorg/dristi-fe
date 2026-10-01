import { useSyncExternalStore } from "react";

/**
 * The advocate home reads as its phone composition below `lg`: a phone, and a
 * tablet held upright, where the side nav leaves the board too narrow for the
 * desktop rows. Deliberately separate from the DS `useIsMobile` (768px), which
 * still decides the shell's own behaviour (the nav sheet, drawers).
 */
const COMPACT_QUERY = "(max-width: 1023px)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useCompactBoard(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false
  );
}
