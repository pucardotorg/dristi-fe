"use client";

/**
 * The act modal: pay and file complete right here — a `Dialog` over the table from `md`
 * (a full-height `Sheet` below it), reusing the act bodies. On completion the toast
 * fires, the modal closes and the row updates in place; nothing navigates. Signing,
 * fixing a scrutiny return and filing-flow drafts do NOT act here — those continue in
 * their own full pages (`/tasks/[id]/sign` · `/fix` · `/continue`) behind a dialog that
 * says so.
 */

import * as React from "react";
import { toast } from "sonner";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { canComplete } from "@/lib/tasks/permissions";
import { useTasks } from "@/lib/tasks/store";
import type { Case, Task, TaskId } from "@/lib/tasks/types";
import { useMinWidth } from "@/hooks/use-min-width";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { type ActContext } from "@/components/tasks/act/shared";
import { type ActMode } from "@/components/tasks/use-task-actions";
import { FileBody } from "@/components/tasks/act/file-page";
import { PayBody } from "@/components/tasks/act/pay-page";
import { Identifier } from "@/components/chrome/identifier";

/** The one quiet line that says what is not real here — pay no longer carries one. */
const SANDBOX: Partial<Record<ActMode, string>> = {
  file: "Sandbox — uploads stay in this browser and the registry's answer is whatever you pick.",
};

/** The document column reads better with room; pay is a summary and stays narrow. */
const WIDTH: Record<ActMode, string> = {
  pay: "sm:max-w-xl",
  file: "sm:max-w-2xl",
};

function Body({ ctx, mode }: { ctx: ActContext; mode: ActMode }) {
  switch (mode) {
    case "pay":
      return <PayBody ctx={ctx} />;
    case "file":
      return <FileBody ctx={ctx} />;
  }
}

export function TaskActModal({
  task,
  kase,
  mode,
  open,
  onOpenChange,
  onFinished,
}: {
  task: Task | null;
  kase: Case | null;
  mode: ActMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the task to flash once a step lands — the created re-filing task, or this one. */
  onFinished?: (taskId: TaskId) => void;
}) {
  const { user, people, online } = useTasks();
  const overlay = useMinWidth(768);

  const finish = React.useCallback(
    (message?: string, taskId?: string) => {
      if (message) toast.success(message);
      onOpenChange(false);
      if (task) onFinished?.(taskId ?? task.id);
    },
    [onOpenChange, onFinished, task]
  );

  if (!task || !kase || !mode) return null;

  const ctx: ActContext = {
    task,
    kase,
    user,
    people,
    online,
    signatory: canComplete(user, kase),
    finish,
  };

  const caseLine = (
    <>
      {kase.parties}
      {kase.stNumber ? (
        <>
          {" · "}
          {/* Inside the dialog's accessible description — a copy control here would be
              announced as part of the description and could take the dialog's first focus,
              so the face is restored without the affordance. */}
          <Identifier value={kase.stNumber} label="case number" copyable={false} />
        </>
      ) : (
        " · Not yet numbered"
      )}
      {" · "}
      {kase.court}
    </>
  );

  if (overlay) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ChromeDialogContent className={`max-h-[85svh] w-full overflow-y-auto ${WIDTH[mode]}`}>
          <DialogHeader className="pr-8">
            <DialogTitle className="text-title-s font-semibold text-balance">{task.title}</DialogTitle>
            <DialogDescription className="text-caption text-muted-foreground">{caseLine}</DialogDescription>
          </DialogHeader>
          {SANDBOX[mode] ? (
            <p className="text-caption text-muted-foreground">{SANDBOX[mode]}</p>
          ) : null}
          <Body ctx={ctx} mode={mode} />
        </ChromeDialogContent>
      </Dialog>
    );
  }

  // A phone has no room for a floating panel: the same content as a full sheet.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-4 overflow-y-auto p-6 data-[side=bottom]:h-svh"
      >
        <div className="flex flex-col gap-2 pr-8">
          <SheetTitle className="text-title-s font-semibold text-balance">{task.title}</SheetTitle>
          <SheetDescription className="text-caption text-muted-foreground">{caseLine}</SheetDescription>
        </div>
        {SANDBOX[mode] ? (
          <p className="text-caption text-muted-foreground">{SANDBOX[mode]}</p>
        ) : null}
        <Body ctx={ctx} mode={mode} />
      </SheetContent>
    </Sheet>
  );
}
