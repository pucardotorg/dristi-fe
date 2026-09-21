"use client";

import * as React from "react";

import type { CourtRole } from "@/lib/employee/content";
import {
  readCourtRole,
  serverCourtRole,
  subscribeToCourtRole,
} from "@/lib/employee/court-role";
import {
  readCourtSession,
  serverCourtSession,
  subscribeToCourtSession,
  type CourtSession,
} from "@/lib/employee/session";

/**
 * The seat the court side is being worked from, from wherever on it the screen stands.
 *
 * `useSyncExternalStore` over a provider for the same reason `useHearingSession` uses
 * one: the store outlives every screen in `/employee`, and the rail is not the only
 * thing entitled to read it.
 *
 * The server snapshot is deliberately a *different* function from the client's. The
 * session is restored from `localStorage`, so the two cannot be the same read: the
 * server — and the hydration render with it — sees the default seat, and React swaps in
 * the stored one with a single re-render after hydration. That is the same visible
 * sequence the citizen side's storage hook describes, and the reason there is no
 * hydration mismatch to suppress.
 */
export function useCourtRole(): CourtRole {
  return React.useSyncExternalStore(
    subscribeToCourtRole,
    readCourtRole,
    serverCourtRole,
  );
}

/**
 * The whole signed-in identity — name, seat, district and bench.
 *
 * The rail's foot is the one thing that needs all of it; everything else wants the seat
 * alone and should use `useCourtRole`.
 */
export function useCourtSession(): CourtSession {
  return React.useSyncExternalStore(
    subscribeToCourtSession,
    readCourtSession,
    serverCourtSession,
  );
}
