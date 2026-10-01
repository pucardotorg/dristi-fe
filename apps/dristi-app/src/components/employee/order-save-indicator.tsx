"use client";

import { CheckIcon } from "lucide-react";

/**
 * "Saved" — the same reassurance `components/filing/saving-indicator.tsx` gives the
 * e-filing screens, for the order composer's own footer (owner, 2026-09-26).
 *
 * No "Saving…" state: a filing draft writes to IndexedDB, asynchronously, so there is a
 * real interval where a write is in flight and the citizen-facing indicator says so. An
 * order draft writes straight into `order-drafts.ts` / a case's own draft store —
 * synchronous, in memory — so there is never a moment between an edit and its being held.
 * What this shares with the reload the filing draft survives and this one does not is
 * left to the composer's own screens to say; this only ever claims what is true of both:
 * nothing typed here is lost while the sitting continues.
 */
export function OrderSaveIndicator() {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-body-compact text-muted-foreground"
    >
      <CheckIcon className="size-4 text-success-ink" aria-hidden />
      <span className="text-success-ink">Saved</span>
    </span>
  );
}
