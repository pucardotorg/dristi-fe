"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { useBackCloses, useFlowWindow } from "@/components/chrome/flow-window";
import { DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * `ChromeDialogContent` for a step of a workflow (a form, a generated document,
 * signing, payment, a record or a document in full view). A dialog from `sm`
 * up; on a phone, the full window that slides in from the right. See
 * `useFlowWindow` for why.
 *
 * On a phone its Back asks the dialog to close, the same request the close
 * button makes, so whatever the dialog does about that (a discard warning, a
 * step back) still happens. A flow with real steps wires `useBackCloses` itself
 * to walk them and passes `ownBack`, as do the dialogs it chains into.
 *
 * Confirmations and notices are not workflows and stay on the plain content,
 * which turns them into bottom sheets on a phone.
 */
export function FlowDialogContent({
  className,
  style,
  children,
  ownBack = false,
  ...props
}: React.ComponentProps<typeof ChromeDialogContent> & {
  /** The flow handles the phone's Back itself. */
  ownBack?: boolean;
}) {
  const flow = useFlowWindow();
  // A simple dialog is a plain grid: header, body, DS footer. Stretched to a
  // phone's height that left the footer floating under the last field with its
  // rounded card corners, mid-screen. In the window such a dialog stacks as a
  // column and its footer goes to the bottom edge, squared, clear of the home
  // indicator. Dialogs that lay themselves out (`flex`, `grid-rows-*`) already
  // place their own footer and are left alone.
  const selfLaidOut = /(^|\s)(flex|grid-rows-\S+)(\s|$)/.test(className ?? "");
  const closeRef = React.useRef<HTMLButtonElement>(null);
  useBackCloses(flow.phone && !ownBack, () => closeRef.current?.click());
  return (
    <ChromeDialogContent
      className={cn(
        className,
        flow.className,
        flow.phone && !selfLaidOut && "flex flex-col",
        flow.phone &&
          "[&>[data-slot=dialog-footer]]:mt-auto [&>[data-slot=dialog-footer]]:rounded-none [&>[data-slot=dialog-footer]]:pb-[calc(--spacing(6)+env(safe-area-inset-bottom))]"
      )}
      style={{ ...style, ...flow.style }}
      {...props}
    >
      {children}
      {/* What Back presses. Not shown and not in the tab order: the visible
          close control is the one people and screen readers use. */}
      <DialogClose ref={closeRef} tabIndex={-1} aria-hidden className="hidden" />
    </ChromeDialogContent>
  );
}
