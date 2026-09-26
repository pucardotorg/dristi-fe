"use client";

import { Columns3Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleLabel } from "./collapsible-label";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  canonicalOrder,
  isToggleableTableColumn,
  TABLE_COLUMNS,
} from "@/lib/cases/table-columns";

import { useCasesTableColumns } from "./use-cases-table-columns";

/**
 * Which columns show. Only that: a tick per column, Show all, Reset. Order is
 * not decided here — the arrows this menu used to carry made a visibility list
 * read as a sorting puzzle, and order already has a better home: the grip on
 * each column heading, which drags. The list runs in the table's current order,
 * so it also reads as a map of what is on screen.
 *
 * Case number is locked (row link). Bookmark is an action and is not listed. A
 * folder omits Stage — offering it here would put the folder's own category back
 * on every row. Reset restores order and visibility both.
 */
export function CasesTableColumnsMenu({
  hideStage = false,
  compact = false,
}: {
  hideStage?: boolean;
  /** Morph the trigger to the icon alone — used when the case peek squeezes the toolbar
   *  and the label would push the row onto a second line. The label collapses rather than
   *  swapping, so it eases with the peek. */
  compact?: boolean;
}) {
  const { isVisible, toggle, showAll, reset, isDefault, isAllVisible, order } =
    useCasesTableColumns();
  const columns = canonicalOrder(order)
    .map((id) => TABLE_COLUMNS.find((column) => column.id === id)!)
    .filter((column) => !(hideStage && column.id === "stage"));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={"shrink-0 gap-0 duration-300 " + (compact ? "px-2.5" : "px-4")}
          aria-label={compact ? "Edit columns" : undefined}
        >
          <Columns3Icon aria-hidden />
          {/* A verb, like Share access beside it: "Columns" named a thing and
              left what the button does to be guessed (owner, Sept 18). */}
          <CollapsibleLabel show={!compact}>Edit columns</CollapsibleLabel>
        </Button>
      </PopoverTrigger>
      {/* align="start" hangs the menu under the trigger's left edge so it sits under
          Columns rather than reaching back under Share access (owner, Sept 11). */}
      <PopoverContent align="start" className="w-64">
        {/* Title, list and footer all share the items' 2-step inset so the menu reads
            as one aligned column; the title drops to the item size (owner, Sept 11).
            The how-to line is gone — the checkboxes and the heading grips say it. A touch
            more air above the title than the content padding alone gives. */}
        <PopoverHeader className="px-2 pt-1">
          <PopoverTitle className="text-body-compact font-medium">
            Show or hide columns
          </PopoverTitle>
        </PopoverHeader>
        <ul className="flex flex-col">
          {columns.map((column) => {
            const checkboxId = `cases-column-${column.id}`;
            return (
              <li key={column.id}>
                <Label
                  htmlFor={checkboxId}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-body-compact font-normal hover:bg-accent has-disabled:cursor-default has-disabled:hover:bg-transparent"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={isVisible(column.id)}
                    disabled={column.locked}
                    onCheckedChange={() => {
                      if (isToggleableTableColumn(column.id)) toggle(column.id);
                    }}
                  />
                  {column.label}
                </Label>
              </li>
            );
          })}
        </ul>
        <Separator />
        {/* Show all turns every column on; there is deliberately no "hide all" —
            a table with only the case number is not a state anyone asks for. The
            buttons sit at the items' inset (px-2) so the whole menu shares one left
            edge, and the pair reads at the item size. */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 text-body-compact"
            disabled={isAllVisible}
            onClick={() => showAll()}
          >
            Show all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 text-body-compact"
            disabled={isDefault}
            onClick={() => reset()}
          >
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
