"use client";

import * as React from "react";
import { CalendarClock, ChevronRight, Info, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { advHome } from "@/lib/advocate/content";
import { courtIdentity, courtNumberFor } from "@/lib/advocate/courts";
import type { TimelineHearing } from "@/lib/advocate/home";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";

/**
 * The "Join hearing" picker. A hearing can only be joined while it is being called,
 * and this button is the advocate's own door: it lists just the hearings that are
 * ongoing *and* theirs. (The cause list is the other door — every ongoing hearing
 * across the courts, hers or not.) When nothing of hers is being called, it says so
 * and points at the cause list rather than showing an empty picker.
 */
export function JoinHearingDialog({
  open,
  onOpenChange,
  hearings,
  onJoin,
  onViewCauseList,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The advocate's own hearings being called now (the timeline's "now" slot). */
  hearings: TimelineHearing[];
  onJoin: (hearing: TimelineHearing) => void;
  onViewCauseList: () => void;
  locale: Locale;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Sizes to its content — as wide as the longest matter/court needs, up to a
          cap where names truncate (an edge case). `w-fit` overrides the dialog's own
          `w-full`; the DS keeps the mobile margin cap. Don't auto-focus the first
          Join button — its focus ring read as a stray box; focus rests on the dialog. */}
      <DialogContent
        className="w-fit max-w-[calc(100%-2rem)] sm:max-w-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{pick(advHome.joinDialogTitle, locale)}</DialogTitle>
          <DialogDescription>{pick(advHome.joinDialogBody, locale)}</DialogDescription>
        </DialogHeader>
        {hearings.length ? (
          // min-w-0: the dialog is a grid, so the list must be allowed to shrink to
          // the dialog width — otherwise a long matter title pushes the cards (and
          // their Join buttons) past the dialog's right edge.
          <div className="flex min-w-0 flex-col gap-3">
            <ul className="flex max-h-[60svh] min-w-0 flex-col gap-2 overflow-y-auto">
              {hearings.map((hearing) => {
                const number = courtNumberFor(hearing.court, hearing.kase.courtNumber);
                const name = courtIdentity(hearing.courtLabel).name;
                return (
                  <li
                    key={hearing.kase.id}
                    className="flex items-center gap-3 rounded-lg border border-hairline bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{hearing.kase.parties}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {name}
                        {number ? ` · ${number}` : ""} · {hearing.kase.stage}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => onJoin(hearing)}
                      aria-label={`${pick(advHome.joinAction, locale)}: ${hearing.kase.parties}`}
                    >
                      <Video aria-hidden="true" />
                      {pick(advHome.joinAction, locale)}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {/* Any other hearing — one that isn't the advocate's, or isn't ongoing —
                lives in the cause list; this note says so and jumps there. */}
            <button
              type="button"
              onClick={onViewCauseList}
              className="flex w-full items-center gap-2 rounded-lg border border-hairline bg-muted px-3 py-2 text-left text-caption text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Info aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{pick(advHome.joinDialogOther, locale)}</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CalendarClock aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="text-body-compact font-medium text-foreground">
                {pick(advHome.joinDialogEmpty, locale)}
              </p>
              <p className="text-caption text-muted-foreground">
                {pick(advHome.joinDialogEmptyHint, locale)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onViewCauseList}>
              {pick(advHome.viewCauseList, locale)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
