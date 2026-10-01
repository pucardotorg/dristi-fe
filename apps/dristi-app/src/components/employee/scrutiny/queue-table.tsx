"use client";

import Link from "next/link";

import { waitTone } from "@/lib/employee/scrutiny/queue";
import type { Filing } from "@/lib/employee/scrutiny/types";
import { rowActivation, rowOpener } from "@/lib/employee/row-activation";
import { markArrival } from "@/components/employee/use-arrival";
import { cn } from "@/lib/utils";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Identifier } from "@/components/chrome/identifier";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** How many columns the spacer row has to span. */
const COLUMN_COUNT = 7;

/**
 * The ageing cell.
 *
 * One presentation for one datum: the wait is always plain `tabular-nums` text, and
 * escalation is carried by ink on that same text. A red chip on the 16-day row beside
 * plain text on the 1-day row would be two treatments of one column — and it is the
 * default sort key, so it is already the most-read number on the screen. The number
 * itself says the thing; the colour only says how loudly.
 */
export function WaitingCell({ filing }: { filing: Filing }) {
  const tone = waitTone(filing);
  return (
    <span
      className={cn(
        "tabular-nums",
        tone === "destructive" && "font-medium text-destructive-ink",
        tone === "warning" && "font-medium text-warning-ink",
        tone === "muted" && "text-muted-foreground",
      )}
    >
      {filing.days} d
    </span>
  );
}

/**
 * The filing number — the link into the workbench.
 *
 * Every filing opens: the one hand-authored case brings its own rich bundle, and every
 * other row is assembled from what the queue knows about it (`scrutiny/case.ts`), so no
 * row is a dead line. A real `Link` rather than a row-level `onClick` restores what a
 * hand-rolled handler took away — middle-click, ⌘-click and open-in-new-tab.
 */
/**
 * **The cause is the row's opener, and the filing number is a value you can take.**
 *
 * This queue used to lead with the number and make the number the link. Every other
 * court queue leads with the case name and carries the number second, and the owner
 * called the exception out (2026-09-18): there was no reason for it, and it cost the
 * screen the copy affordance, because a control cannot nest another. With the cause
 * holding the link, the number is free to be an identifier like everywhere else.
 */
function CauseLink({ filing }: { filing: Filing }) {
  return (
    <Link
      href={`/employee/scrutiny/${encodeURIComponent(filing.no)}`}
      onClick={() => markArrival("next")}
      {...rowOpener}
      className="flex min-h-10 w-full items-center rounded-sm font-medium underline-offset-4 outline-none group-hover/row:underline focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:underline"
    >
      <span className="sr-only">Scrutinise </span>
      {filing.parties}
    </Link>
  );
}

/**
 * The scrutiny queue as a table.
 *
 * Seven columns. There is no Type column: it was `hidden xl:table-cell` with nothing in
 * its place below that width, so the instrument now rides under the parties as a caption
 * — one fact, one place, readable at every width.
 *
 * There is no Stage chip either. `stageVariant` keyed off who holds the ball, which is
 * exactly what the tab above the table already filters by, so a chip on every row of a
 * tab said one thing thirty times in colour. The words stay; the badge goes.
 *
 * The whole row opens the filing — the same clickable row every other court queue carries
 * (`rowActivation`), now that every filing opens a real workbench and none is a dead line.
 * The filing number is the named opener; the row is the pointer shortcut on top of it.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table
 * is one panel rather than a box inside a box.
 */
export function ScrutinyQueueTable({ rows }: { rows: Filing[] }) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Parties
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Filing no.
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Stage
          </TableHead>
          {/* Where Reason used to be. The case type was the quiet second line under the
              parties, which is a column's worth of fact hiding inside another column's
              cell — the owner asked for the swap on 2026-09-17: the type earns a heading,
              and "1 item open" was saying in prose what Stage and Waiting already say in
              their own columns. */}
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case type
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Advocate
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            With
          </TableHead>
          <TableHead
            className={cn(TABLE_HEAD, "text-right whitespace-nowrap")}
          >
            Waiting
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={COLUMN_COUNT} className="h-2 p-0" />
        </tr>
        {rows.map((filing) => (
          <TableRow key={filing.no} {...rowActivation(tableRowClass())}>
            {/* The row's one emphasised cell, and the control that opens it. */}
            <TableCell className={cn(TABLE_CELL, "min-w-64 whitespace-normal")}>
              <CauseLink filing={filing} />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier value={filing.no} label="filing number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              {filing.stage}
            </TableCell>
            {/* Foreground ink, not muted: as a second line under the parties this was
                subordinate to them, and as its own column it is a fact of the same
                standing as Stage. */}
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              {filing.type}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "max-w-44 truncate")}>
              {filing.advocate}
            </TableCell>
            <TableCell
              className={cn(
                TABLE_CELL,
                "whitespace-nowrap",
                filing.self ? "font-medium" : "text-muted-foreground",
              )}
            >
              {filing.who}
            </TableCell>
            {/* Right-aligned because it is a compared number, and it is the sort key. */}
            <TableCell
              className={cn(TABLE_CELL, "text-right whitespace-nowrap")}
            >
              <WaitingCell filing={filing} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * Seven columns do not survive a phone — the answer the rest of the court side already
 * gives. The filing number stays the one link, and every column that lost its header
 * spells out what it is.
 */
export function ScrutinyQueueItemList({ rows }: { rows: Filing[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((filing) => (
        <QueueItemRow key={filing.no} className="flex flex-col gap-2">
          <div className="text-body-compact">
            <CauseLink filing={filing} />
          </div>
          <p className="min-w-0 text-body-compact text-muted-foreground">
            <Identifier value={filing.no} label="filing number" />
          </p>
          <p className="text-caption text-muted-foreground">
            {filing.type}
            {" · "}
            {filing.stage}
          </p>
          <p className="text-caption text-muted-foreground">
            {filing.advocate}
            {" · with "}
            {filing.who}
            {" · waiting "}
            <WaitingCell filing={filing} />
          </p>
        </QueueItemRow>
      ))}
    </ul>
  );
}
