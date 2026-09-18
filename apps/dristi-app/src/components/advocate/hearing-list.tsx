"use client";


import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { advHome } from "@/lib/advocate/content";
import { teamOf, type HomeHearing } from "@/lib/advocate/home";
import type { World } from "@/lib/tasks/selectors";
import { cn } from "@/lib/utils";
import {
  AdvocateStack,
  RowAction,
  SELECTED_BAR,
} from "@/components/advocate/home-bits";
import { Identifier } from "@/components/chrome/identifier";

/**
 * Only the exception. A row with work owed says so; a row with nothing owed says
 * nothing, because a green "Ready" on almost every row is a mark of the norm.
 */
function statusCell(hearing: HomeHearing) {
  if (!hearing.blockers.length) return null;
  return (
    <Badge variant="warning">
      {hearing.blockers.length} blocking{" "}
      {hearing.blockers.length === 1 ? "task" : "tasks"}
    </Badge>
  );
}

/** Dense list view of the same items — the day's cause list, one row per matter. */
export function HearingList({
  world,
  locale,
  hearings,
  selectedId,
  onOpenCase,
}: {
  world: World;
  locale: Locale;
  hearings: HomeHearing[];
  selectedId: string | null;
  onOpenCase: (caseId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-4xl border-collapse text-left">
        <caption className="sr-only">Listed matters in this court</caption>
        <thead>
          <tr className="bg-surface-sunken text-caption text-muted-foreground">
            <th scope="col" className="w-16 px-4 py-2 font-medium">
              Item
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Parties and stage
            </th>
            <th scope="col" className="w-48 px-4 py-2 font-medium">
              CNR
            </th>
            <th scope="col" className="w-24 px-4 py-2 font-medium">
              Advocates
            </th>
            <th scope="col" className="w-40 px-4 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="w-32 px-4 py-2">
              <span className="sr-only">Open case</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {hearings.map((hearing) => {
            const selected = hearing.kase.id === selectedId;
            return (
              <tr
                key={hearing.kase.id}
                className={cn(
                  "group/row",
                  "border-b border-hairline transition-colors last:border-b-0 hover:bg-accent has-focus-visible:bg-accent",
                  // Brand fill is the live "now" row and nothing else. Selection
                  // is the same quiet bar the cards carry — one treatment for
                  // one fact, whichever layout is on.
                  hearing.status === "now" && "bg-brand-muted"
                )}
              >
                <td
                  className={cn(
                    "relative px-4 py-3 text-body-compact font-medium tabular-nums text-muted-foreground",
                    // `left-0`, not the cards' `-left-2`: the table scrolls
                    // horizontally, and anything outside its box is clipped.
                    selected && cn(SELECTED_BAR, "before:inset-y-2 before:left-0")
                  )}
                >
                  {hearing.item}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenCase(hearing.kase.id)}
                    className="flex flex-col gap-0.5 text-left"
                  >
                    <span className="text-body-compact font-semibold">
                      {hearing.kase.parties}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {hearing.kase.stage}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-caption text-muted-foreground">
                  {hearing.kase.cnr ? (
                    <Identifier value={hearing.kase.cnr} label="CNR" />
                  ) : (
                    "—"
                  )}
                </td>
                {/* Everyone on the matter, the viewer included, each disc styled
                    by vakalatnama standing — the stack carries who may act. */}
                <td className="px-4 py-3">
                  <AdvocateStack
                    locale={locale}
                    team={teamOf(world, hearing.kase)}
                    max={3}
                    surface={hearing.status === "now" ? "brand" : "card"}
                    includeSelf
                  />
                </td>
                <td className="px-4 py-3">{statusCell(hearing)}</td>
                <td className="w-32 px-4 py-3">
                  <RowAction
                    label={pick(advHome.viewCase, locale)}
                    onClick={() => onOpenCase(hearing.kase.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
