"use client";

import * as React from "react";

/**
 * The value, once it has stopped changing for `quietMs`.
 *
 * For things that must not fire on every keystroke — a screen-reader announcement is the
 * case this was written for. It deliberately does **not** debounce the render: the caller
 * keeps using the live value for what is on screen and only feeds this one to the live
 * region, so the list filters as fast as the person types while the announcement waits
 * for them to pause.
 *
 * `useDeferredValue` is not this. It lets React render a stale value while a fast one is
 * in flight, but on a machine that keeps up it still settles once per keystroke — which is
 * exactly the machine-gun a live region must not be.
 */
export function useDebouncedValue<T>(value: T, quietMs: number): T {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), quietMs);
    return () => clearTimeout(timer);
  }, [value, quietMs]);

  return settled;
}
