"use client";

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { useFlowWindow } from "@/components/chrome/flow-window";
import { cn } from "@/lib/utils";

/**
 * `ChromeDialogContent` for a step of a workflow (a form, a generated document,
 * signing, payment). A dialog from `sm` up; on a phone, the full window that
 * slides in from the right. See `useFlowWindow` for why.
 *
 * Confirmations and notices are not workflows and stay on the plain content.
 */
export function FlowDialogContent({
  className,
  style,
  ...props
}: React.ComponentProps<typeof ChromeDialogContent>) {
  const flow = useFlowWindow();
  return (
    <ChromeDialogContent
      className={cn(className, flow.className)}
      style={{ ...style, ...flow.style }}
      {...props}
    />
  );
}
