"use client";

import * as React from "react";

import {
  draftRows,
  registeredRows,
  returnedRows,
  scrutinyRows,
  type QueueTab,
} from "@/lib/filing/queue";
import { firstNameOf, useProfile } from "@/lib/filing/profile";
import { useMounted } from "@/lib/filing/store";
import { useDrafts } from "@/lib/filing/use-drafts";
import { useTasks } from "@/lib/tasks/store";
import { ConfirmDialog } from "@/components/filing/confirm-dialog";

import { BulkImportCard, type BulkBatch } from "./bulk-import-card";
import { FilingsQueue, type QueueData } from "./filings-queue";
import { StartFilingCard } from "./start-filing-card";
import {
  PAGE_GROUND,
  PAGE_GUTTER,
  PAGE_SUBTITLE,
  PAGE_TITLE,
} from "@/components/shell/page-frame";
import { cn } from "@/lib/utils";

/**
 * No client has pushed a batch across, because nothing in the app can receive one yet.
 * The card renders its empty state until that question is answered — see
 * docs/design/proposals/e-filing.md, W4. Do not seed this with an example batch: the
 * screen would then claim a capability the product does not have.
 */
const BATCH: BulkBatch | null = null;

/**
 * File a case — the entry to e-filing and the state of everything already filed.
 *
 * Two decisions shape this screen. The entry points sit above the fold and are the only
 * place a new filing starts; below them, one work queue answers "where has everything I
 * filed got to", with the status carried by the tab rather than repeated on every row.
 * Nothing here holds its own data: drafts, cases and returned-defect tasks all come from
 * the stores that already own them.
 */
export function FilingsDashboard() {
  const mounted = useMounted();
  const { profile } = useProfile();
  const { ready, error, readAt, drafts, filed, discard } = useDrafts();
  const { tasks, cases: taskCases } = useTasks();
  // The drafts awaiting a discard confirmation — one from a row's bin, several from
  // the selection. Empty means the dialog is closed.
  const [confirmIds, setConfirmIds] = React.useState<string[]>([]);

  const showData = mounted && ready;
  const firstName = firstNameOf(profile?.name ?? "");
  const today = new Date(readAt).toISOString().slice(0, 10);

  const data = React.useMemo<QueueData>(
    () => ({
      drafts: draftRows(drafts),
      scrutiny: scrutinyRows(today),
      returned: returnedRows(tasks, taskCases),
      registered: registeredRows(today),
    }),
    [drafts, tasks, taskCases, today]
  );

  return (
    <div className={cn("flex w-full flex-1 flex-col gap-6", PAGE_GROUND, PAGE_GUTTER)}>
      <header className="flex flex-col gap-1">
        <h1 className={cn(PAGE_TITLE, "text-foreground")}>
          {firstName ? `File a case, ${firstName}` : "File a case"}
        </h1>
        <p className={PAGE_SUBTITLE}>
          Start a new e-filing, import a batch from your client&apos;s system, or track
          what you have already filed.
        </p>
      </header>

      {error ? <p className="text-body text-destructive-ink">{error}</p> : null}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <StartFilingCard filedCount={showData ? filed.length : null} />
        <BulkImportCard batch={BATCH} />
      </div>

      {/* Gated on the drafts read only. Cases are a static import and the tasks store
          fills the "returned" tab whenever it finishes; waiting for all three would blank
          the whole table because one tab is not ready yet. */}
      <FilingsQueue data={data} ready={showData} onDiscard={setConfirmIds} />

      <ConfirmDialog
        open={confirmIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setConfirmIds([]);
        }}
        title={
          confirmIds.length === 1
            ? "Discard this draft?"
            : `Discard these ${confirmIds.length} drafts?`
        }
        description={
          confirmIds.length === 1
            ? "Everything entered and uploaded for this filing will be removed. This cannot be undone."
            : `Everything entered and uploaded for these ${confirmIds.length} filings will be removed. This cannot be undone.`
        }
        confirmLabel={
          confirmIds.length === 1 ? "Discard draft" : `Discard ${confirmIds.length} drafts`
        }
        onConfirm={() => {
          for (const id of confirmIds) void discard(id);
          setConfirmIds([]);
        }}
      />
    </div>
  );
}

export type { QueueTab };
