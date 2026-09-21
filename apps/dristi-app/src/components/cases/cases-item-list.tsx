"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  formatCaseDate,
  partiesLabel,
  type CaseRecord,
} from "@/lib/cases/types";
import { cn } from "@/lib/utils";

import { BookmarkButton } from "./bookmark-button";
import { PANEL_CLASS } from "@/components/shell/panel";

import { CaseIdentity, CaseStage } from "./case-identity";
import { useCasePeek } from "./use-case-peek";
import { useCasesSelection } from "./use-cases-selection";

type ListProps = {
  rows: CaseRecord[];
  bookmarks: ReadonlySet<string>;
  onToggleBookmark: (id: string) => void;
  className?: string;
  hideStage?: boolean;
  hideLongPendingFlag?: boolean;
};

/**
 * Below `md`: one designed card per case, not the table stood on end.
 *
 * It used to stack every visible column under its own label, so a default row
 * ran to a screen and a half and "Edit columns" decided how tall (owner,
 * Sept 21: "each of these rows has become a big card"). A phone list is for
 * finding the case, so the card carries what identifies it and what is next:
 * number, parties, stage, and the next hearing. Everything else is one tap
 * away in the peek, which the whole card opens and which rises from the
 * bottom on a phone. Column picking stays with the table.
 */
export function CasesItemList({
  rows,
  bookmarks,
  onToggleBookmark,
  className,
  hideStage = false,
  hideLongPendingFlag = false,
}: ListProps) {
  const { record: openRecord } = useCasePeek();
  const { selected, toggle, enabled: selectable } = useCasesSelection();

  return (
    <ItemGroup className={cn("flex flex-col gap-3", className)}>
      {rows.map((record) => {
        const next = record.nextHearing;
        const stageDetail = record.disposal
          ? `Disposed ${formatCaseDate(record.disposal.on)}`
          : record.substage;
        // A hearing is often listed for exactly what the sub stage is called
        // ("Evidence of the complainant", "Plea"). Said twice on one card it
        // read as a mistake, so the purpose shows only when it adds something.
        const purpose =
          next?.purpose && next.purpose !== record.substage
            ? next.purpose
            : undefined;
        return (
          <Item
            key={record.id}
            variant="outline"
            role="listitem"
            className={cn(
              PANEL_CLASS,
              "relative flex-col items-stretch gap-3 rounded-xl p-4 active:bg-accent",
              openRecord?.id === record.id && "border-border bg-accent-strong"
            )}
          >
            <div className="flex items-start gap-3">
              {selectable ? (
                <div
                  className="relative z-10 flex shrink-0 items-center pt-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selected.has(record.id)}
                    onCheckedChange={() => toggle(record.id)}
                    aria-label={`Select ${partiesLabel(record)}`}
                  />
                </div>
              ) : null}
              <ItemContent className="min-w-0 flex-1 gap-1">
                {/* The number is the card's one control: its hit area is the
                    whole card, and it opens the peek. */}
                <CaseIdentity
                  record={record}
                  tone="muted"
                  hideLongPendingFlag={hideLongPendingFlag}
                />
                <ItemTitle className="line-clamp-none text-body-compact font-semibold break-words text-foreground">
                  {partiesLabel(record)}
                </ItemTitle>
              </ItemContent>
              <ItemActions className="relative z-10 -my-1 -mr-2 shrink-0">
                <BookmarkButton
                  caseLabel={partiesLabel(record)}
                  bookmarked={bookmarks.has(record.id)}
                  onToggle={() => onToggleBookmark(record.id)}
                />
              </ItemActions>
            </div>

            {/* One line: the stage as its badge, then where inside it the case
                sits. Disposed cases say when, in the same place. */}
            {hideStage ? null : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CaseStage record={record} detail={false} />
                {stageDetail ? (
                  <span className="text-caption text-muted-foreground">
                    {stageDetail}
                  </span>
                ) : null}
              </div>
            )}

            {next?.on ? (
              <div className="flex flex-col gap-0.5 border-t border-hairline pt-3">
                <span className="text-caption text-muted-foreground">
                  Next hearing
                </span>
                <span className="text-body-compact text-foreground">
                  <span className="font-medium tabular-nums">
                    {formatCaseDate(next.on)}
                  </span>
                  {purpose ? (
                    <span className="text-muted-foreground">
                      <span aria-hidden> · </span>
                      {purpose}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </Item>
        );
      })}
    </ItemGroup>
  );
}
