import { useSyncExternalStore } from "react";

/**
 * True on a mouse-driven screen. The identifier's copy affordance announces itself on
 * hover, so on touch (where it would be an invisible tap target inside rows and cards
 * that already do something on tap) identifiers keep the face and drop the control.
 */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(HOVER_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useCanHover(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false
  );
}
