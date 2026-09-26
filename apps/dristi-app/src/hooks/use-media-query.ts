"use client";

import * as React from "react";

/**
 * A media query as state, in the house shape (`useMinWidth`, `useIsMobile`):
 * `useSyncExternalStore` with a `false` server snapshot, so the first client
 * render agrees with the server and the real answer arrives on the next pass.
 * For questions a width alone cannot answer, such as whether the pointer is a
 * finger.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
