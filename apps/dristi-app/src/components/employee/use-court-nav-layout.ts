"use client";

import * as React from "react";

import {
  type CourtNavLayout,
  readCourtNavLayout,
  serverCourtNavLayout,
  setCourtNavLayout,
  subscribeToCourtNavLayout,
} from "@/lib/employee/nav-layout";

/**
 * The rail layout and its setter, live across every component that reads it —
 * `useCourtRole`'s shape, over `nav-layout.ts` instead of the session.
 */
export function useCourtNavLayout(): [
  CourtNavLayout,
  (layout: CourtNavLayout) => void,
] {
  const layout = React.useSyncExternalStore(
    subscribeToCourtNavLayout,
    readCourtNavLayout,
    serverCourtNavLayout,
  );
  return [layout, setCourtNavLayout];
}
