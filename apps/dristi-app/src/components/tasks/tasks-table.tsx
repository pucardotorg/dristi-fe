"use client";

import * as React from "react";
import { CircleCheckIcon, SearchXIcon } from "lucide-react";

import { dueCueOf, outcomeOf, secondLineOf, waitingOnOf } from "@/lib/tasks/format";
import { canArchive, verbFor } from "@/lib/tasks/permissions";
import type { Case, Person, Task, TaskId, TaskView, Verb } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { useMinWidth } from "@/hooks/use-min-width";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PANEL_CLASS } from "@/components/shell/panel";
import { AdvocateStack } from "@/components/tasks/advocate-stack";

/* ───────────────────────────── cells ───────────────────────────── */

/** "24×7 ON Court" — the court without the town the whole list shares. */
function courtShort(court: string): string {
  return court.replace(/,\s*Kollam$/, "");
}

function CaseCell({ kase }: { kase: Case }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-body-compact text-foreground">{kase.parties}</span>
      <span className="text-caption text-muted-foreground">
        {kase.stNumber ? (
          <span className="font-sans tabular-nums">{kase.stNumber}</span>
        ) : (
          "Not yet numbered"
        )}
        <span aria-hidden> · </span>
        {courtShort(kase.court)}
      </span>
    </div>
  );
}

/** Relative primary ("2 days overdue", "Due in 3 days") over the absolute date. */
function DueCell({ task, now }: { task: Task; now: Date }) {
  const due = dueCueOf(task, now);
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "text-body-compact tabular-nums",
          due.overdue
            ? "font-medium text-destructive-ink"
            : due.date
              ? "text-foreground"
              : "text-muted-foreground"
        )}
      >
        {due.primary}
      </span>
      {due.date ? <span className="text-caption tabular-nums text-muted-foreground">{due.date}</span> : null}
    </div>
  );
}

/**
 * The verb: 32px of visible button widened to one shared width (`w-24`) so a column of
 * verbs reads as one rail, expanded to the 40px DS touch floor. "View" — nothing to do
 * but look — is a quiet ghost, never a disabled finalising verb.
 */
function VerbButton({
  verb,
  disabled,
  onClick,
  size = "xs",
}: {
  verb: Verb;
  disabled: boolean;
  onClick: () => void;
  size?: "xs" | "default";
}) {
  const button = (
    <Button
      variant={verb === "View" ? "ghost" : "outline"}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-24 justify-center whitespace-nowrap",
        size === "xs" && "relative after:absolute after:-inset-1"
      )}
    >
      {verb}
    </Button>
  );
  if (!disabled) return button;
  return (
    <Tooltip>
      {/* A disabled button swallows pointer events; the wrapper carries the tooltip. */}
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-lg">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>You are offline — read only</TooltipContent>
    </Tooltip>
  );
}

/** The fifth column: nothing on Needs action, who it waits on, or how it ended. */
function fifthCellOf(view: TaskView, task: Task, kase: Case, people: Person[]): string | null {
  if (view === "needs-action") return null;
  if (view === "waiting") return waitingOnOf(task, kase, people);
  return outcomeOf(task);
}

const FIFTH_HEAD: Record<TaskView, string | null> = {
  "needs-action": null,
  waiting: "Waiting on",
  completed: "Outcome",
  archived: "Outcome",
};

/* ───────────────────────────── the table ───────────────────────────── */

export type TasksTableProps = {
  rows: Task[];
  cases: Case[];
  people: Person[];
  user: Person;
  now: Date;
  view: TaskView;
  query?: string;
  openId: string | null;
  selected: Set<TaskId>;
  offline: boolean;
  emptyKind: "none" | "filtered";
  onClearFilters: () => void;
  onOpen: (task: Task) => void;
  onVerb: (task: Task, verb: Verb) => void;
  onToggleSelect: (task: Task) => void;
};

/**
 * One lifted panel: a DS `Table` from `md`, stacked labelled rows below it. Every cell
 * is one fact in one column; the verb — one shared width — carries the status a Needs-
 * action row would otherwise repeat; Waiting rows say who they wait on, Completed and
 * Archived rows how they ended. Clicking a row (not its controls) opens the detail;
 * ↑/↓ move between rows, Enter opens.
 */
export function TasksTable(props: TasksTableProps) {
  const { rows, emptyKind, query, view, onClearFilters } = props;
  const wide = useMinWidth(768);
  const listRef = React.useRef<HTMLDivElement>(null);

  const focusRow = React.useCallback((index: number) => {
    const root = listRef.current;
    if (!root) return;
    const buttons = root.querySelectorAll<HTMLButtonElement>("[data-task-title]");
    const target = buttons[Math.max(0, Math.min(index, buttons.length - 1))];
    target?.focus();
    target?.scrollIntoView({ block: "nearest" });
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches("[data-task-title]")) return;
    const row = target.closest<HTMLElement>("[data-task-row]");
    const index = Number(row?.dataset.index ?? -1);
    if (index < 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusRow(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusRow(rows.length - 1);
    }
  };

  if (rows.length === 0) {
    return (
      <Card className={cn(PANEL_CLASS, "py-0")}>
        {emptyKind === "filtered" ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{query?.trim() ? `Nothing matches “${query.trim()}”` : "No tasks match"}</EmptyTitle>
              <EmptyDescription>
                {query?.trim()
                  ? "Try another spelling or a party name, or clear the search."
                  : "Clear a filter or the pressed card to see more."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success-muted text-success-ink">
                <CircleCheckIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>
                {view === "needs-action"
                  ? "Nothing needs you"
                  : view === "waiting"
                    ? "Nothing waiting on anyone"
                    : view === "completed"
                      ? "Nothing completed yet"
                      : "Nothing archived"}
              </EmptyTitle>
              <EmptyDescription>
                {view === "needs-action"
                  ? "Every case you are on is up to date."
                  : view === "waiting"
                    ? "Filings with the court, payments confirming, and items that need a vakalatnama holder will wait here."
                    : view === "completed"
                      ? "Done, expired and no-longer-needed tasks are kept here with why they closed."
                      : "Tasks put away with Archive are kept here and can be restored."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
    );
  }

  return (
    // A container, not just a panel: the push panel narrows the table without narrowing
    // the viewport, so which columns fit has to answer to the table's own width.
    <Card className={cn(PANEL_CLASS, "@container gap-0 overflow-clip py-0")}>
      <div ref={listRef} onKeyDown={onKeyDown}>
        {wide ? <WideTable {...props} /> : <StackedRows {...props} />}
      </div>
    </Card>
  );
}

function WideTable({
  rows,
  cases,
  people,
  user,
  now,
  view,
  openId,
  selected,
  offline,
  onOpen,
  onVerb,
  onToggleSelect,
}: TasksTableProps) {
  const caseById = React.useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  // The select column exists wherever a listed task can still be acted on outside the
  // system — marked done by hand or archived. Closed and archived rows have neither.
  const anySelectable = rows.some((t) => {
    const k = caseById.get(t.caseId);
    return k && canArchive(user, t, k);
  });
  const fifthHead = FIFTH_HEAD[view];
  const headClass = "h-10 px-4 text-caption font-semibold text-muted-foreground";

  return (
    <Table className="text-body-compact">
      <TableHeader className="bg-surface-sunken [&_tr]:border-hairline">
        <TableRow className="hover:bg-surface-sunken">
          {anySelectable ? (
            <TableHead className={cn(headClass, "w-10 pr-0")}>
              <span className="sr-only">Select</span>
            </TableHead>
          ) : null}
          <TableHead className={headClass}>Task</TableHead>
          <TableHead className={headClass}>Case</TableHead>
          {/* The rows are always most-urgent first (`sortTasks`); the headers no longer
              re-sort — a task queue has one order, and offering others was table
              convention, not a need (owner, 2026-08-24). */}
          <TableHead className={headClass}>Due</TableHead>
          {/* The panel names the advocates itself; when it narrows the table past
              the full width, this column stands down rather than wrapping every
              other cell to three lines. */}
          <TableHead className={cn(headClass, "hidden @4xl:table-cell")}>Owners</TableHead>
          {fifthHead ? <TableHead className={headClass}>{fifthHead}</TableHead> : null}
          <TableHead className={cn(headClass, "text-right")}>
            <span className="sr-only">Action</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((task, index) => {
          const kase = caseById.get(task.caseId);
          if (!kase) return null;
          const verb = verbFor(user, task, kase);
          const selectable = canArchive(user, task, kase);
          const open = openId === task.id;
          const isSelected = selected.has(task.id);
          const fifth = fifthCellOf(view, task, kase, people);
          const note = secondLineOf(task, user, people);
          return (
            <TableRow
              key={task.id}
              data-task-row
              data-task-id={task.id}
              data-index={index}
              data-state={isSelected ? "selected" : undefined}
              aria-current={open ? "true" : undefined}
              className={cn("cursor-pointer border-hairline", open && !isSelected && "bg-accent")}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, a, [role=checkbox], label")) return;
                onOpen(task);
              }}
            >
              {anySelectable ? (
                <TableCell className="w-10 py-3 pl-4 pr-0 align-middle">
                  {selectable ? (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(task)}
                      aria-label={`Select: ${task.title}`}
                    />
                  ) : null}
                </TableCell>
              ) : null}
              <TableCell className="min-w-44 max-w-md whitespace-normal px-4 py-3 align-middle">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    data-task-title
                    onClick={() => onOpen(task)}
                    className="rounded-sm text-left text-body-compact font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {task.title}
                  </button>
                  {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
                </div>
              </TableCell>
              <TableCell className="min-w-32 max-w-xs whitespace-normal px-4 py-3 align-middle">
                <CaseCell kase={kase} />
              </TableCell>
              <TableCell className="px-4 py-3 align-middle">
                <DueCell task={task} now={now} />
              </TableCell>
              <TableCell className="hidden px-4 py-3 align-middle @4xl:table-cell">
                <AdvocateStack kase={kase} people={people} user={user} />
              </TableCell>
              {fifthHead ? (
                <TableCell className="min-w-28 max-w-56 whitespace-normal px-4 py-3 align-middle text-body-compact text-foreground">
                  {fifth}
                </TableCell>
              ) : null}
              <TableCell className="px-4 py-3 text-right align-middle">
                <VerbButton verb={verb} disabled={offline} onClick={() => onVerb(task, verb)} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Below `md`: the same columns as labelled stacked rows — one fact per line. */
function StackedRows({
  rows,
  cases,
  people,
  user,
  now,
  view,
  openId,
  selected,
  offline,
  onOpen,
  onVerb,
  onToggleSelect,
}: TasksTableProps) {
  const caseById = React.useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const fifthHead = FIFTH_HEAD[view];
  return (
    <ul className="divide-y divide-hairline">
      {rows.map((task, index) => {
        const kase = caseById.get(task.caseId);
        if (!kase) return null;
        const verb = verbFor(user, task, kase);
        const selectable = canArchive(user, task, kase);
        const open = openId === task.id;
        const isSelected = selected.has(task.id);
        const fifth = fifthCellOf(view, task, kase, people);
        const note = secondLineOf(task, user, people);
        return (
          <li
            key={task.id}
            data-task-row
            data-task-id={task.id}
            data-index={index}
            aria-current={open ? "true" : undefined}
            className={cn(
              "flex flex-col gap-3 px-4 py-4 transition-colors",
              isSelected ? "bg-accent-strong" : open ? "bg-accent" : "bg-transparent"
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button, a, [role=checkbox], label")) return;
              onOpen(task);
            }}
          >
            <div className="flex items-start gap-3">
              {selectable ? (
                <span className="flex size-10 shrink-0 items-center justify-center -my-2.5 -ml-2.5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(task)}
                    aria-label={`Select: ${task.title}`}
                  />
                </span>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <button
                  type="button"
                  data-task-title
                  onClick={() => onOpen(task)}
                  className="rounded-sm text-left text-body-compact font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {task.title}
                </button>
                {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
              </div>
            </div>
            <dl className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
              <dt className="text-caption text-muted-foreground">Case</dt>
              <dd>
                <CaseCell kase={kase} />
              </dd>
              <dt className="text-caption text-muted-foreground">Due</dt>
              <dd>
                <DueCell task={task} now={now} />
              </dd>
              <dt className="text-caption text-muted-foreground">Owners</dt>
              <dd>
                <AdvocateStack kase={kase} people={people} user={user} />
              </dd>
              {fifthHead && fifth ? (
                <>
                  <dt className="text-caption text-muted-foreground">{fifthHead}</dt>
                  <dd className="text-body-compact text-foreground">{fifth}</dd>
                </>
              ) : null}
            </dl>
            <div className="flex justify-end">
              <VerbButton verb={verb} size="default" disabled={offline} onClick={() => onVerb(task, verb)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────────────────────── loading ───────────────────────────── */

/** Rows still arriving: chrome intact, the table as calm placeholders. */
export function TasksTableSkeleton() {
  return (
    <Card className={cn(PANEL_CLASS, "gap-0 py-0")} aria-busy="true" aria-label="Loading tasks">
      <div className="flex h-10 items-center gap-6 bg-surface-sunken px-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10" />
      </div>
      <ul className="divide-y divide-hairline">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="flex min-h-16 items-center gap-6 px-4 py-3">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3 max-w-96" />
              <Skeleton className="h-3 w-1/3 max-w-48" />
            </div>
            <Skeleton className="hidden h-3 w-20 md:block" />
            <Skeleton className="hidden size-6 rounded-full md:block" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
