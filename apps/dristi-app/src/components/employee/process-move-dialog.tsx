"use client";

import * as React from "react";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import { ChromeAlertDialogContent } from "@/components/chrome/app-chrome";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  landedLine,
  refusedLine,
  type CourtProcess,
  type ProcessAct,
} from "@/lib/employee/sign-process";
import { cn } from "@/lib/utils";

/**
 * Confirming an act on the process line — the product's plain confirmation, as the copy
 * applications queue has it: the question, one line saying where the rows go, and Back
 * or the act (owner, 2026-10-07: "a very simple modal… straight to the point").
 *
 * **Then it settles, in the same window** (owner, 2026-10-07): the title says what was
 * done, and the product's success band — solid fill and a tick — says where the rows are
 * now. A send its channel refused is said on its own line under the band, never inside
 * it. Done closes.
 */
export function ProcessMoveDialog({
  act,
  count,
  line,
  landed,
  open,
  onOpenChange,
  onConfirm,
  onDownload,
  triggerRef,
  onReturnFocus,
}: {
  act: ProcessAct;
  count: number;
  /** Where the rows are going — `moveLine`. */
  line: string;
  /** The rows the act took, live — read once it has run. */
  landed: CourtProcess[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Offered once signed: a signed paper is worth having in hand (owner, 2026-09-07). */
  onDownload?: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onReturnFocus: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <MoveConfirmBody
          act={act}
          count={count}
          line={line}
          landed={landed}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
          onDownload={onDownload}
          triggerRef={triggerRef}
          onReturnFocus={onReturnFocus}
        />
      ) : null}
    </AlertDialog>
  );
}

function MoveConfirmBody({
  act,
  count: givenCount,
  line: givenLine,
  landed,
  onClose,
  onConfirm,
  onDownload,
  triggerRef,
  onReturnFocus,
}: {
  act: ProcessAct;
  count: number;
  line: string;
  landed: CourtProcess[];
  onClose: () => void;
  onConfirm: () => void;
  onDownload?: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onReturnFocus: () => void;
}) {
  /* Captured on opening: the act empties the selection, and the question must not
     change under the clerk. */
  const [count] = React.useState(givenCount);
  const [line] = React.useState(givenLine);
  const [done, setDone] = React.useState(false);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const noun = act.noun ?? { one: "process", many: "processes" };
  const one = count === 1;
  const refused = done ? refusedLine(landed) : "";

  React.useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  return (
    <ChromeAlertDialogContent
      onCloseAutoFocus={(event) => {
        /* Back returns to the bar button; the act disabled it, so the search takes the
           keyboard instead. */
        event.preventDefault();
        const trigger = triggerRef.current;
        if (!done && trigger?.isConnected && !trigger.disabled) {
          trigger.focus();
          return;
        }
        onReturnFocus();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>
          {done
            ? act.done(one ? noun.one : `${count} ${noun.many}`)
            : act.question(one ? `this ${noun.one}` : `${count} ${noun.many}`)}
        </AlertDialogTitle>
        {done ? (
          <AlertDialogDescription
            role="status"
            className={cn(
              "flex w-full items-start gap-2 rounded-lg bg-success px-4 py-3 text-body text-success-foreground",
              RESOLVE_IN_PLACE,
            )}
          >
            <CircleCheckIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>{landedLine(landed)}</span>
          </AlertDialogDescription>
        ) : (
          <AlertDialogDescription className="text-body">{line}</AlertDialogDescription>
        )}
        {refused ? (
          <p className="flex items-start gap-2 text-body-compact text-warning-ink">
            <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {refused}
          </p>
        ) : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        {done ? (
          <>
            {onDownload ? (
              <Button type="button" variant="outline" onClick={onDownload}>
                Download {count} {one ? "document" : "documents"}
              </Button>
            ) : null}
            <Button ref={doneRef} type="button" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <AlertDialogCancel>Back</AlertDialogCancel>
            {/* A plain button, not the primitive's Action, which would close the window
                before the outcome could show. */}
            <Button
              type="button"
              onClick={() => {
                onConfirm();
                setDone(true);
              }}
            >
              {act.confirm}
            </Button>
          </>
        )}
      </AlertDialogFooter>
    </ChromeAlertDialogContent>
  );
}
