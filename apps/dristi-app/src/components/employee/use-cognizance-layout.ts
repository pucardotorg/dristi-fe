"use client";

import * as React from "react";

import {
  type CognizanceLayout,
  readCognizanceLayout,
  serverCognizanceLayout,
  setCognizanceLayout,
  subscribeToCognizanceLayout,
} from "@/lib/employee/cognizance-layout";

/**
 * The Take cognizance layout setting and its setter, live across every component that
 * reads it — `useCourtNavLayout`'s shape, over `cognizance-layout.ts` instead.
 */
export function useCognizanceLayout(): [
  CognizanceLayout,
  (layout: CognizanceLayout) => void,
] {
  const layout = React.useSyncExternalStore(
    subscribeToCognizanceLayout,
    readCognizanceLayout,
    serverCognizanceLayout,
  );
  return [layout, setCognizanceLayout];
}
