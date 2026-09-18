"use client";

import * as React from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ItemChip } from "@/components/advocate/home-bits";
import { courtIdentity, courtNumberFor } from "@/lib/advocate/courts";
import { advHome, fillCopy } from "@/lib/advocate/content";
import type { TimelineHearing } from "@/lib/advocate/home";
import { pick, type Locale } from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";
import "./mobile-hearing.css";
import { LocateHearingIcon } from "./locate-hearing-icon";

/** A phone matter exposes its actions by tap, keeping the docket scannable. */
export function MobileHearingCard({ hearing, locale, selected, onOpenCase, onOpenTasks, onViewInCauseList, time }: {
  time?: React.ReactNode;
  hearing: TimelineHearing;
  locale: Locale;
  selected: boolean;
  onOpenCase: (id: string) => void;
  onOpenTasks: ((id: string, taskIds: string[]) => void) | null;
  onViewInCauseList: ((id: string) => void) | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [pointerMotion, setPointerMotion] = React.useState(true);
  const ongoing = hearing.status === "now";
  const count = hearing.blockers.length;
  const pending = fillCopy(count === 1 ? advHome.blockingOne : advHome.blockingMany, locale, { n: String(count) });
  const court = courtIdentity(hearing.courtLabel, courtNumberFor(hearing.court, hearing.kase.courtNumber));
  const actionClass = "h-auto min-h-10 min-w-0 whitespace-nowrap border-transparent bg-card px-2 py-2 text-caption text-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0" data-pointer-motion={pointerMotion}>
      <CollapsibleTrigger
        aria-label={`${hearing.kase.parties}, ${pick(advHome.colItem, locale)} ${hearing.item}, ${hearing.kase.cnr || hearing.kase.stNumber}, ${hearing.kase.stage}, ${court.name} ${court.number ?? ""}${count ? `, ${pending}` : ""}${hearing.passedOver ? `, ${pick(advHome.statusPassedOver, locale)}` : ""}`}
        onPointerDown={() => setPointerMotion(true)}
        onKeyDown={() => setPointerMotion(false)}
        className={cn("group/hearing relative z-10 flex w-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-left transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", ongoing ? "border-brand-accent/40" : "border-hairline", selected && "ring-2 ring-ring")}
      >
        <span className="flex w-full min-w-0 items-center gap-3">
          <ItemChip item={hearing.item} size="lg" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body-compact font-semibold text-primary">{hearing.kase.parties}</span>
            <span className="text-body-compact wrap-anywhere tabular-nums text-muted-foreground">{hearing.kase.cnr || hearing.kase.stNumber}</span>
          </span>
          {count > 0 ? (
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center self-start rounded-full border border-warning bg-warning-muted text-warning-muted-foreground">
              <TriangleAlert className="size-3" />
            </span>
          ) : null}
        </span>
        <span className="flex w-full items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-caption font-semibold text-muted-foreground" title={hearing.kase.stage}>{hearing.kase.stage}</span>
          {/* ds-typography-allow: owner asked for the court tag a step under caption (11px); the DS has no role below 12px. */}
          <span className="shrink-0 rounded-full border border-border bg-accent-strong px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold text-foreground">
            {court.name} · <span className="tabular-nums">{court.number ?? "N/A"}</span>
          </span>
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-accent-strong text-muted-foreground">
            <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]/hearing:rotate-180 motion-reduce:transition-none" />
          </span>
        </span>
        {time ? <span className="text-caption text-muted-foreground">{time}</span> : null}
        {hearing.passedOver ? <span className="text-caption font-medium text-warning-ink">{pick(advHome.statusPassedOver, locale)}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="hearing-reveal mx-3 overflow-hidden">
        <div className={cn("hearing-actions flex items-center gap-2 rounded-b-xl p-3", ongoing ? "bg-brand-accent/20 text-brand-muted-foreground" : "bg-secondary text-foreground")}>
          {onViewInCauseList ? (
            <Button variant="ghost" size="icon" className={cn("shrink-0 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", ongoing ? "text-brand-muted-foreground hover:bg-brand-accent/20 hover:text-brand-muted-foreground" : "text-foreground hover:bg-accent")} aria-label={pick(advHome.viewOnCauseList, locale)} onClick={() => onViewInCauseList(hearing.kase.id)}>
              <LocateHearingIcon aria-hidden="true" className="size-5" />
            </Button>
          ) : null}
          <Button variant="outline" className={cn(actionClass, "flex-1")} onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onOpenCase(hearing.kase.id); }}>{pick(advHome.viewCase, locale)}</Button>
          {count > 0 && onOpenTasks ? (
            <Button variant="outline" className={cn(actionClass, "shrink-0")} onClick={() => onOpenTasks(hearing.kase.id, hearing.blockers.map(task => task.id))}>
              <TriangleAlert aria-hidden="true" />{pending}
            </Button>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
