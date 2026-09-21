"use client";

import * as React from "react";

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
 *
 * Selecting (owner, Sept 21) works the way a phone's own lists do. The first
 * pick is deliberate: the checkbox, or a long press on the card. While anything
 * is picked, a tap anywhere on a card picks or drops it instead of opening the
 * peek; clearing the last one hands taps back to the peek.
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
  const selecting = selectable && selected.size > 0;
  const longPress = useLongPress(selectable, selecting, toggle);

  return (
    <ItemGroup className={cn("flex flex-col gap-3", className)}>
      {rows.map((record) => {
        const next = record.nextHearing;
        /* No sub stage on the card (owner, Sept 21). A disposed case still
           says when, since nothing else on the card does. */
        const disposedOn = record.disposal
          ? `Disposed ${formatCaseDate(record.disposal.on)}`
          : undefined;
        const picked = selected.has(record.id);
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
              /* A long press must not lift the text or the system menu. */
              selectable && "select-none [-webkit-touch-callout:none]",
              (picked || openRecord?.id === record.id) &&
                "border-border bg-accent-strong"
            )}
            {...longPress(record.id)}
          >
            <div className="flex items-start gap-3">
              {selectable ? (
                <div
                  className="relative z-10 flex shrink-0 items-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* size-5 on the card: a finger's first pick has to land on
                      it. The primitive's inset carries the target to 44px, and
                      the box still sits on the number's 20px line. */}
                  <Checkbox
                    checked={picked}
                    onCheckedChange={() => toggle(record.id)}
                    aria-label={`Select ${partiesLabel(record)}`}
                    className="size-5"
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
                {/* The parties lead and the number follows (owner, Sept 21): the names
                    are what a person scans a list for. `order-first` only: the
                    number stays first in the markup, since it is the control. */}
                <ItemTitle className="order-first line-clamp-none text-body-compact font-semibold break-words text-foreground">
                  {partiesLabel(record)}
                </ItemTitle>
                {/* Under the title and on its edge, so the card reads down one
                    line: number, parties, stage. */}
                {hideStage ? null : (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CaseStage record={record} detail={false} />
                    {disposedOn ? (
                      <span className="text-caption text-muted-foreground">
                        {disposedOn}
                      </span>
                    ) : null}
                  </div>
                )}
              </ItemContent>
              <ItemActions className="relative z-10 -my-1 -mr-2 shrink-0">
                <BookmarkButton
                  caseLabel={partiesLabel(record)}
                  bookmarked={bookmarks.has(record.id)}
                  onToggle={() => onToggleBookmark(record.id)}
                />
              </ItemActions>
            </div>

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

            {/* While picking, the whole card is the toggle. Pointer only: the
                checkbox above is the same control for a keyboard or a screen
                reader, so this stays out of their way. */}
            {selecting ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => toggle(record.id)}
                className="absolute inset-0 z-20 cursor-pointer rounded-xl"
              />
            ) : null}
          </Item>
        );
      })}
    </ItemGroup>
  );
}

const LONG_PRESS_MS = 500;
/** A finger that travels this far is scrolling, not pressing. */
const LONG_PRESS_SLOP = 10;

/**
 * Long press on a touch screen makes the first pick. The click that the lifted
 * finger then sends is swallowed once, or it would open the peek over the card
 * just picked. A mouse never starts it: a mouse has the checkbox.
 */
function useLongPress(
  enabled: boolean,
  /** Already picking: a tap does the work, so a press starts nothing. The
   *  handlers stay on, because the press that made the first pick still has
   *  its click to swallow after this turns true. */
  selecting: boolean,
  onLongPress: (id: string) => void
) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const fired = React.useRef(false);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  return (id: string) =>
    enabled
      ? {
          onPointerDown: (event: React.PointerEvent) => {
            fired.current = false;
            if (selecting || event.pointerType === "mouse") return;
            start.current = { x: event.clientX, y: event.clientY };
            timer.current = setTimeout(() => {
              fired.current = true;
              timer.current = null;
              navigator.vibrate?.(10);
              onLongPress(id);
            }, LONG_PRESS_MS);
          },
          onPointerMove: (event: React.PointerEvent) => {
            const from = start.current;
            if (!from) return;
            if (
              Math.abs(event.clientX - from.x) > LONG_PRESS_SLOP ||
              Math.abs(event.clientY - from.y) > LONG_PRESS_SLOP
            )
              cancel();
          },
          onPointerUp: cancel,
          onPointerCancel: cancel,
          onPointerLeave: cancel,
          onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
          onClickCapture: (event: React.MouseEvent) => {
            if (!fired.current) return;
            fired.current = false;
            event.preventDefault();
            event.stopPropagation();
          },
        }
      : {};
}
