"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COURT_CASE_FLAG_LABEL,
  courtCaseTitle,
  nextHearingDay,
  type CourtCase,
} from "@/lib/employee/cases";
import { courtCaseStageLabel, formatListingDate } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * This court's register as a table: the file, the cause, where it has reached, when it is
 * next up, and any priority it carries.
 *
 * Five columns, and the Priority column is the reason the other four are this short. It
 * is empty on most rows by design — only the four flagged categories print there, because
 * the two stage-derived ones (pending cognizance, process awaited) are already in the
 * Stage column and a chip repeating it would say the same thing twice on the same row.
 * Empty on most rows is what makes the flagged ones findable while scrolling.
 *
 * **The flags are one colour, and it is no colour.** Four tinted chips down a column
 * would make the reader learn four hues to read a word that is already printed beside
 * them, and the DS rations colour to one meaning per view — which on this screen is the
 * pressed tile above. So the chips are the neutral outline and the text carries all of
 * it (`ACCESSIBILITY` §3: status is never colour alone).
 *
 * Rows are inert: `hover: false`, and the cause title is plain text rather than a link.
 * There is no court-side case file to open yet, and a lit row or an underline would
 * promise a screen that does not exist — the same call `schedule-table` made.
 *
 * The panel shell lives on the screen around this, so the table is one panel rather than
 * a box inside a box.
 */
export function CourtCasesTable({
  rows,
  today,
}: {
  rows: CourtCase[];
  today: string;
}) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Stage
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Next hearing
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-40 whitespace-normal")}>
            Priority
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass({ hover: false })}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={5} className="h-2 p-0" />
        </tr>
        {rows.map((record) => {
          const next = nextHearingDay(record, today);
          return (
            <TableRow key={record.id} className={tableRowClass({ hover: false })}>
              <TableCell
                className={cn(
                  TABLE_CELL,
                  "font-medium tabular-nums whitespace-nowrap",
                )}
              >
                {record.caseNumber}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "min-w-64 whitespace-normal")}>
                {courtCaseTitle(record)}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                {courtCaseStageLabel(record.stage)}
              </TableCell>
              {/* "No date fixed" rather than a dash: a case waiting for cognizance has
                  no date because none has been given, which is a fact about it and not
                  a hole in the row. */}
              <TableCell
                className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}
              >
                {next ? (
                  formatListingDate(next)
                ) : (
                  <span className="text-muted-foreground">No date fixed</span>
                )}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
                {record.flags.length === 0 ? null : (
                  <span className="flex flex-wrap gap-1.5">
                    {record.flags.map((flag) => (
                      <Badge key={flag} variant="outline">
                        {COURT_CASE_FLAG_LABEL[flag]}
                      </Badge>
                    ))}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * The same rows below `md`, where five columns do not survive.
 *
 * A well per case rather than a card: these sit inside the register's own lifted panel,
 * and a second lifted box inside it would be the box-in-box the layering model rules out.
 * The order is the order the clerk reads — the file number and its stage on one band, the
 * cause, then when it is next up, then anything that makes it urgent.
 */
export function CourtCaseItemList({
  rows,
  today,
}: {
  rows: CourtCase[];
  today: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((record) => {
        const next = nextHearingDay(record, today);
        return (
          <li
            key={record.id}
            className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface-sunken p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-body-compact font-medium tabular-nums">
                {record.caseNumber}
              </span>
              <span className="text-body-compact text-muted-foreground">
                {courtCaseStageLabel(record.stage)}
              </span>
            </div>
            <span className="text-body font-semibold">
              {courtCaseTitle(record)}
            </span>
            <span className="text-body-compact text-muted-foreground tabular-nums">
              {next ? `Next hearing ${formatListingDate(next)}` : "No date fixed"}
            </span>
            {record.flags.length === 0 ? null : (
              <div className="flex flex-wrap gap-1.5">
                {record.flags.map((flag) => (
                  <Badge key={flag} variant="outline">
                    {COURT_CASE_FLAG_LABEL[flag]}
                  </Badge>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
