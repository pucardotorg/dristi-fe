"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import {
  HearingDetail,
  HearingsList,
} from "@/components/cases/hearings-register";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hearingRecords } from "@/lib/cases/hearing-record";
import { orderHref } from "@/lib/cases/sections";
import type { CaseRecord } from "@/lib/cases/types";

/**
 * The hearings pop-up (§5.4), opened from Overview's "View All Hearings". One
 * dialog, two steps: the list, then one hearing. Escape and the back control
 * step out of the hearing before they close the dialog.
 */
export function CaseHearingsDialog({
  record,
  open,
  onOpenChange,
  triggerRef,
}: {
  record: CaseRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLAnchorElement | null>;
}) {
  const hearings = useMemo(() => hearingRecords(record), [record]);
  const [openId, setOpenId] = useState<string | null>(null);
  const openHearing = hearings.find((item) => item.id === openId) ?? null;
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  /* A step change inside one dialog is invisible to a screen reader, so the
     hearing's heading takes focus on arrival (ACCESSIBILITY 5). */
  useEffect(() => {
    if (open && openId) headingRef.current?.focus();
  }, [open, openId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setOpenId(null);
      }}
    >
      <ChromeDialogContent
        className="flex max-h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onCloseAutoFocus={(event) => {
          const trigger = triggerRef.current;
          if (!trigger?.isConnected) return;
          event.preventDefault();
          trigger.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (!openHearing) return;
          event.preventDefault();
          setOpenId(null);
        }}
      >
        <DialogHeader className="gap-1 border-b border-hairline px-6 py-4 text-left">
          <DialogTitle className="text-title-s font-semibold">
            Hearings
          </DialogTitle>
          <p className="font-mono text-caption font-medium text-muted-foreground">
            {record.caseNumber}
          </p>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {openHearing ? (
            <HearingDetail
              hearing={openHearing}
              orderHref={
                openHearing.order
                  ? orderHref(record.id, openHearing.order.id)
                  : undefined
              }
              headingRef={headingRef}
              onBack={() => setOpenId(null)}
            />
          ) : (
            <HearingsList
              hearings={hearings}
              onOpen={(hearing) => setOpenId(hearing.id)}
            />
          )}
        </div>
      </ChromeDialogContent>
    </Dialog>
  );
}
