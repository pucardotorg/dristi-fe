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
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { courtCaseStageLabel, formatListingDate } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

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
 * **The case number opens the file — which is not built yet, so it lands on the shared
 * "not built" end state** (owner, 2026-09-15). The row is the same clickable row every
 * other court queue carries; it is no longer left inert (which read as a dead line), and
 * is honest instead about where it goes.
 *
 * The panel shell lives on the screen around this, so the table is one panel rather than
 * a box inside a box.
 */
export function CourtCasesTable({
  rows,
  today,
  onOpen,
}: {
  rows: CourtCase[];
  today: string;
  onOpen: (record: CourtCase) => void;
}) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          {/* Name first, number second — the order every other court queue uses. The
              exception here cost the screen its copy affordance, because the number was
              the row's opener and a control cannot nest another (owner, 2026-09-18). */}
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
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
      <TableBody className={tableBodyClass()}>
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
            <TableRow key={record.id} {...rowActivation(tableRowClass())}>
              {/* The cause is the opener; the number beside it is a value to take. */}
              <TableCell
                className={cn(TABLE_CELL, "min-w-64 whitespace-normal")}
              >
                <button
                  type="button"
                  onClick={() => onOpen(record)}
                  {...rowOpener}
                  className={cn(rowOpenerClass, "font-medium")}
                >
                  <span className="sr-only">Open </span>
                  {courtCaseTitle(record)}
                </button>
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                <Identifier value={record.caseNumber} label="case number" />
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
  onOpen,
}: {
  rows: CourtCase[];
  today: string;
  onOpen: (record: CourtCase) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((record) => {
        const next = nextHearingDay(record, today);
        return (
          <QueueItemRow
            key={record.id}
            className="flex flex-col gap-2"
          >
            {/* Same order as the table above it: the cause opens the record, the number
                sits under it as a value to take. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => onOpen(record)}
                {...rowOpener}
                className={cn(rowOpenerClass, "w-fit text-body font-semibold")}
              >
                <span className="sr-only">Open </span>
                {courtCaseTitle(record)}
              </button>
              <span className="text-body-compact text-muted-foreground">
                {courtCaseStageLabel(record.stage)}
              </span>
            </div>
            <span className="text-body-compact text-muted-foreground">
              <Identifier value={record.caseNumber} label="case number" />
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
          </QueueItemRow>
        );
      })}
    </ul>
  );
}
