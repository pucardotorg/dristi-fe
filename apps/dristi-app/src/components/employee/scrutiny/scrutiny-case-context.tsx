"use client";

import * as React from "react";

import type { ScrutinyCase } from "@/lib/employee/scrutiny/types";

/**
 * The one case the workbench is reviewing, made available to every panel under it.
 *
 * The bundle view, the fields, the composer, the index, the review dialog and the history
 * sheet all need the same case, and threading it as a prop through six levels would bury
 * the components that actually use it. Context keeps each read local — `useScrutinyCase()`
 * where the data is needed — while the workbench stays the single place a case is chosen.
 */
const ScrutinyCaseContext = React.createContext<ScrutinyCase | null>(null);

export function ScrutinyCaseProvider({
  value,
  children,
}: {
  value: ScrutinyCase;
  children: React.ReactNode;
}) {
  return (
    <ScrutinyCaseContext.Provider value={value}>
      {children}
    </ScrutinyCaseContext.Provider>
  );
}

export function useScrutinyCase(): ScrutinyCase {
  const value = React.useContext(ScrutinyCaseContext);
  if (!value) {
    throw new Error("useScrutinyCase must be used within a ScrutinyCaseProvider");
  }
  return value;
}
