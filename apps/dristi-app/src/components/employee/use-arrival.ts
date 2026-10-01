"use client";

import * as React from "react";

import type { Arrival } from "@/components/chrome/motion";

/**
 * Which way the reader just travelled, so the screen they land on can say so.
 *
 * A route change in Next is instant and silent: the complaint the magistrate asked for
 * simply *is* there, and the one they were reading simply is not. The owner read that as
 * abrupt on both directions of this queue's loop (2026-09-12) — *"it should convey to the
 * user that something new has come up"* going forward, and *"it should feel like I went
 * back"* returning.
 *
 * The direction cannot be read off the URL: `/register-cases` is both where the queue
 * lives and where Back leads, and two complaints look identical from the outside. So the
 * control that starts the navigation says which it is, and the screen that mounts takes
 * it. A module variable rather than the URL or storage: it is one hop, it must not
 * survive a reload (a refreshed page has not travelled anywhere), and nothing else should
 * be able to read it.
 */
let pending: Arrival | null = null;

/** Called by the control that navigates, just before it does. */
export function markArrival(kind: Arrival): void {
  pending = kind;
}

/**
 * Taken once, by the screen that arrives. `null` on a fresh load, a refresh, a typed URL
 * or a bookmark — none of those is a journey, and none of them should animate.
 */
export function useArrival(): Arrival | null {
  const [arrival] = React.useState(() => {
    const kind = pending;
    pending = null;
    return kind;
  });
  return arrival;
}
