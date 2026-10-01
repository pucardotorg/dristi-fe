"use client";

import * as React from "react";

/**
 * Multi-select for the cases list — the seam for bulk "Share access" (add staff to
 * several cases at once, per Mohit's original all-cases design). The row renderers
 * (table + card) read this to show a checkbox; they render none when no provider is
 * present, so the same components stay reusable elsewhere. CasesScreen owns the state
 * and drives the header Share button + dialog from it.
 */
export type CasesSelection = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  /** Select or clear several at once — the header checkbox over a page of rows. */
  setMany: (ids: readonly string[], on: boolean) => void;
  /** True only inside the main all-cases list, where bulk share is offered. */
  enabled: boolean;
};

const CasesSelectionContext = React.createContext<CasesSelection>({
  selected: new Set(),
  toggle: () => {},
  setMany: () => {},
  enabled: false,
});

export const CasesSelectionProvider = CasesSelectionContext.Provider;

export function useCasesSelection(): CasesSelection {
  return React.useContext(CasesSelectionContext);
}
