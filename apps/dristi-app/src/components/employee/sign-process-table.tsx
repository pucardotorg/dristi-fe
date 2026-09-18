"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { causeTitle } from "@/lib/employee/hearings";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import {
  courtProcessTypeInline,
  courtProcessTypeLabel,
  formatProcessDate,
  processChannelLabel,
  type CourtProcess,
  type ProcessStage,
} from "@/lib/employee/sign-process";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/** Seven columns on every stage — the checkbox and the reference's six. */
const COLUMNS = 7;

/**
 * One stage of the process line as a table: which rows are picked, the cause, its
 * number, which instrument it is, the day this stage is about, how it will be
 * delivered, and the listing it is returnable for.
 *
 * **The stage is not a column.** The tab above the table already says it, and a status
 * cell repeating "Pending sign" down eleven rows would be the loudest thing in the row
 * saying the one thing the bench already knows. What varies instead is the *date* column:
 * the reference names its fourth column for the moment the stage is about — "Payment
 * made" while a registered-post cover is still being collected, "Issued date" once the
 * process has been drawn up — and the three stages the reference does not draw follow
 * the same rule (`ProcessStage.dateColumn`).
 *
 * **Selection is the first column on every stage, including the two with no act.**
 * Download reaches every tab, so a record tab is still a tab you select rows on. On the
 * three working stages the same checkboxes also feed the act in the bar.
 *
 * **The case name opens the row**, matching the four signing queues beside it. The
 * instrument stays in its own column as plain text, because a case can carry three
 * separate processes and it is the fact that tells them apart — so the accessible name
 * of the opener carries it too, and three rows of one case are not read out as the same
 * link three times (ACCESSIBILITY §2, §9).
 *
 * **A pointer on the rest of the row opens it too.** The checkbox still selects, and
 * keyboard still lands on the case name — a row that was itself a button would steal the
 * checkbox's target and add a second tab stop.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function SignProcessTable({
  stage,
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpen,
}: {
  stage: ProcessStage;
  rows: CourtProcess[];
  selectedIds: ReadonlySet<string>;
  onToggle: (process: CourtProcess) => void;
  /** Select or clear every row currently in view — the header checkbox. */
  onToggleAll: (select: boolean) => void;
  onOpen: (process: CourtProcess) => void;
}) {
  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "w-12")}>
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              disabled={rows.length === 0}
              onCheckedChange={(next) => onToggleAll(next === true)}
              /* Names what the control does to what is on screen, not to the whole
                 stage — it reaches this page of rows only, and a label promising "all"
                 would be a promise the control does not keep once the list is paged. */
              aria-label={
                allSelected
                  ? "Clear the processes on this page"
                  : "Select the processes on this page"
              }
            />
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-56 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-40 whitespace-normal")}>
            Process type
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            {stage.dateColumn}
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Delivery channel
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Hearing date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass({ selectable: true })}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={COLUMNS} className="h-2 p-0" />
        </tr>
        {rows.map((process) => {
          const selected = selectedIds.has(process.id);
          const type = courtProcessTypeLabel(process.type);
          const inline = courtProcessTypeInline(process.type);
          const day = stage.dateOf(process);
          return (
            <TableRow
              key={process.id}
              data-state={selected ? "selected" : undefined}
              {...rowActivation(tableRowClass({ selectable: true }))}
            >
              <TableCell className={cn(TABLE_CELL, "w-12")}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggle(process)}
                  aria-label={`Select the ${inline} in ${process.caseNumber}`}
                />
              </TableCell>
              {/* The row's opener. Quiet `text-foreground` rather than a teal underline:
                  the teal is rationed for the one strong action on the screen, and a
                  column of underlined teal names is the colour ui-craft §4 spends it on
                  instead. The underline now arrives on the *row's* hover, wherever the
                  pointer sits, and on this control's own focus — see `rowOpenerClass`. */}
              <TableCell
                className={cn(TABLE_CELL, "min-w-56 font-medium whitespace-normal")}
              >
                <button
                  type="button"
                  onClick={() => onOpen(process)}
                  {...rowOpener}
                className={rowOpenerClass}
                >
                  <span className="sr-only">Read the {inline} in </span>
                  {causeTitle(process)}
                </button>
              </TableCell>
              <TableCell
                className={cn(TABLE_CELL, "whitespace-nowrap")}
              >
                <Identifier value={process.caseNumber} label="case number" />
              </TableCell>
              {/* Which instrument this is — the fact that tells three rows of one case
                  apart. Plain text: the opener already carries the row's weight. */}
              <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
                {type}
              </TableCell>
              <TableCell
                className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}
              >
                {/* A stage always stamps its own day, so this is never empty in practice.
                    An em dash rather than a blank cell is what a row that somehow reached
                    a stage without its date should say. */}
                {day ? formatProcessDate(day) : "—"}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                {processChannelLabel(process.channel)}
              </TableCell>
              <TableCell
                className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}
              >
                {formatProcessDate(process.hearingDate)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
