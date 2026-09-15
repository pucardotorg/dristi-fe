"use client";

import * as React from "react";
import { type ElementType, type ReactNode } from "react";
import { ChevronDownIcon, ExternalLinkIcon, FileTextIcon, XIcon } from "lucide-react";

import {
  dateTime,
  dueCueOf,
  longDate,
  nameOf,
  outcomeOf,
  rupees,
  secondLineOf,
  shortDate,
  viewOnlyLineOf,
  waitingOnOf,
} from "@/lib/tasks/format";
import {
  ACTIONABLE,
  advocatesOf,
  canArchive,
  canMarkDone,
  PAGED_KINDS,
  TERMINAL,
  verbFor,
  WAITING,
} from "@/lib/tasks/permissions";
import { formatBytes } from "@/lib/tasks/data";
import { resolutionSatisfies } from "@/lib/tasks/defects";
import { consequenceAt } from "@/lib/tasks/urgency";
import type { Case, Person, Task, Verb } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-min-width";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonAvatar } from "@/components/tasks/person-avatar";

function Block({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
        {title}
        {count !== undefined ? (
          <Badge variant="secondary" className="tabular-nums">
            {count}
          </Badge>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

/**
 * The panel's one focal mark: the consequence date as a day-over-month chip. A task
 * the court left undated gets a quiet sunken dash instead — no date is not a brand
 * moment.
 */
function DateChip({ iso }: { iso?: string }) {
  if (!iso) {
    return (
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-body font-semibold text-muted-foreground"
      >
        —
      </span>
    );
  }
  const [day, mon] = shortDate(iso).split(" ");
  return (
    <span
      aria-hidden
      className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground"
    >
      <span className="text-body font-semibold tabular-nums">{day}</span>
      <span className="text-caption">{mon}</span>
    </span>
  );
}

function FileList({ files }: { files: Task["files"] }) {
  if (!files?.length) return null;
  return (
    <ul className="flex flex-col gap-1">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-body-compact">
          <FileTextIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="text-caption text-muted-foreground">
            {f.ext} · {formatBytes(f.size)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type TaskDetailProps = {
  task: Task;
  kase: Case;
  user: Person;
  people: Person[];
  now: Date;
  offline: boolean;
  busy: boolean;
  onVerb: (verb: Verb) => void;
  /** Open the task's act modal for a look — waiting and closed paged tasks. */
  onOpenFlow: () => void;
  /** Both confirmed and executed by the screen. */
  onMarkDone: () => void;
  onArchive: () => void;
};

/**
 * The detail itself, minus its container — enough context to act, nothing more: the
 * case line, why + what to do, the money and the deadline, who is on the case, what was
 * prepared, and the history folded away. `Title` / `Description` are element types
 * because the Sheet presentation must render Radix's own title and description nodes
 * for its ARIA wiring, while the push panel is plain markup with no dialog semantics.
 */
function TaskDetail({
  task,
  kase,
  user,
  people,
  now,
  offline,
  busy,
  close,
  onVerb,
  onOpenFlow,
  onMarkDone,
  onArchive,
  Title = "h2",
  Description = "p",
}: TaskDetailProps & {
  close: ReactNode;
  Title?: ElementType;
  Description?: ElementType;
}) {
  const verb = verbFor(user, task, kase);
  const due = dueCueOf(task, now);
  const closed = TERMINAL.has(task.status);
  const waiting = WAITING.has(task.status);
  const actionable = ACTIONABLE.has(task.status);
  const markable = canMarkDone(user, task, kase);
  const archivable = canArchive(user, task, kase);
  const paged = PAGED_KINDS.has(task.kind);
  const advocates = advocatesOf(kase, people);
  // On the case but the move is a vakalatnama holder's — the quiet sentence says so.
  const viewOnly = actionable && verb === "View";

  // The one primary action of the view. Waiting and closed tasks of a paged kind still
  // open their flow — that is where the sandbox court/gateway controls and the record
  // live — but as a quiet secondary, not the teal verb.
  let primary: { label: string; run: () => void } | null = null;
  let secondary: { label: string; run: () => void } | null = null;
  if (verb === "Mark done") {
    primary = { label: "Mark as done", run: onMarkDone };
  } else if (verb !== "View") {
    primary = { label: verb, run: () => onVerb(verb) };
  } else if (paged && (waiting || viewOnly)) {
    secondary = { label: "Open", run: onOpenFlow };
  } else if (paged && closed) {
    secondary = { label: "View record", run: onOpenFlow };
  }

  // The one status caption of the panel — what the row's fifth column would say. It
  // rides in the Deadline card, under the relative cue it qualifies.
  const statusLine =
    task.status === "archived" || closed
      ? outcomeOf(task)
      : waiting || viewOnly
        ? waitingOnOf(task, kase, people)
        : secondLineOf(task, user, people);

  const history = [...task.history].reverse();
  const preparedBy = task.status === "ready" ? task.prepared : null;
  const draftBy = task.status === "draft" ? task.draft : null;
  // The instruction often already names the documents; list only what it does not.
  const extraDocs = (task.documentsNeeded ?? []).filter(
    (d) => !task.whatToDo.toLowerCase().includes(d.toLowerCase())
  );

  // The Deadline card's anchor: the earlier of due date and hearing — the same date the
  // due cue counts from. The next hearing is repeated only when it is a different day.
  const consequence = consequenceAt(task);
  const active = !closed && task.status !== "archived";
  const deadlineContext = statusLine ?? (active && task.closesWhen ? task.closesWhen : undefined);
  const showNextHearing = !!kase.nextHearingAt && kase.nextHearingAt !== task.hearingAt;
  const blocking = active && task.isBlocking && !!task.hearingAt;
  /*
   * Read from the recorded resolution, not from a tick: a defect whose suggestion was
   * overridden without a reason is still open (see `lib/tasks/defects`). The panel cannot
   * see the filing draft, so it uses the task-side half of the same rule.
   */
  const defects = React.useMemo(() => task.returned?.defects ?? [], [task.returned]);
  const unresolved = defects.filter((d) => !resolutionSatisfies(d)).length;
  const done = defects.length - unresolved;
  /* The sections still carrying work — the shape of the job, in place of its wording. */
  const sectionsAffected = React.useMemo(
    () =>
      Array.from(
        new Set(
          defects
            .filter((d) => !resolutionSatisfies(d))
            .map((d) => d.target.sectionLabel)
        )
      ),
    [defects]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 border-b border-hairline px-4 pt-4 pb-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-semibold text-muted-foreground">Task</p>
          {close}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {/* Focus lands here when a row opens the panel; Escape returns it to the row. */}
            <Title
              tabIndex={-1}
              data-task-detail-title
              className="rounded-sm text-title-s font-semibold text-balance outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {task.title}
            </Title>
            <Description className="text-caption text-muted-foreground">
              {kase.parties}
              {kase.stNumber ? (
                <>
                  {" · "}
                  <span className="font-sans tabular-nums">{kase.stNumber}</span>
                </>
              ) : (
                " · Not yet numbered"
              )}
              {" · "}
              {kase.court}
            </Description>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            <ExternalLinkIcon aria-hidden />
            Open case file
          </Button>
        </div>
      </div>

      {/* `*:shrink-0`: the Cards' own overflow-hidden zeroes their automatic minimum
          height, so as flex children of this scroller they would be crushed to fit
          instead of letting the panel scroll. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:px-6 *:shrink-0">
        {/* The deadline leads — the one card with the brand-tinted date chip. */}
        <Card size="sm" className="gap-3">
          <div className="flex items-center gap-3 px-4">
            <DateChip iso={consequence} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p
                className={cn(
                  "text-body-compact font-semibold tabular-nums",
                  due.overdue && "text-destructive-ink"
                )}
              >
                {due.primary === "No date" ? "No date set" : due.primary}
              </p>
              {task.amountPaise !== undefined ? (
                <p className="text-body-compact">
                  <span className="font-semibold tabular-nums">{rupees(task.amountPaise)}</span>
                  {task.feeHead ? <span className="text-muted-foreground"> · {task.feeHead}</span> : null}
                </p>
              ) : null}
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">
                  {consequence ? longDate(consequence) : "The court did not fix one"}
                </span>
                {deadlineContext ? <> · {deadlineContext}</> : null}
              </p>
              {showNextHearing ? (
                <p className="text-caption text-muted-foreground">
                  Next hearing <span className="tabular-nums">{dateTime(kase.nextHearingAt!)}</span>
                </p>
              ) : null}
            </div>
          </div>
          {task.completion ? (
            <div className="mx-4 flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
              <p className="text-caption font-semibold text-muted-foreground">
                {task.completion.how === "manual" ? "Marked done" : "Closed"}
              </p>
              <p className="text-body-compact">
                <span className="tabular-nums">{dateTime(task.completion.at)}</span>
                {task.completion.by ? (
                  <span className="text-muted-foreground"> · {nameOf(people, task.completion.by)}</span>
                ) : null}
              </p>
              {task.completion.receipt ? (
                <p className="font-mono text-caption tabular-nums text-muted-foreground">
                  Receipt {task.completion.receipt}
                </p>
              ) : null}
            </div>
          ) : null}
          {blocking ? (
            <div className="mx-4 flex flex-col gap-1 rounded-lg bg-warning-muted p-3">
              <p className="text-caption font-semibold text-warning-ink">
                The hearing cannot proceed without this
              </p>
              {task.deadlineNote ? (
                <p className="text-body-compact leading-relaxed text-pretty">{task.deadlineNote}</p>
              ) : null}
              {task.redate ? (
                <p className="text-caption text-warning-muted-foreground">
                  Moved from <span className="tabular-nums">{longDate(task.redate.from)}</span> —{" "}
                  {task.redate.reason}
                </p>
              ) : null}
            </div>
          ) : task.deadlineNote || task.redate ? (
            <div className="mx-4 flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
              {task.deadlineNote ? (
                <p className="text-body-compact leading-relaxed text-pretty">{task.deadlineNote}</p>
              ) : null}
              {task.redate ? (
                <p className="text-caption text-muted-foreground">
                  Moved from <span className="tabular-nums">{longDate(task.redate.from)}</span> —{" "}
                  {task.redate.reason}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* The creating event, dated, then the instruction in its well — no repeats. */}
        <Block title="What to do">
          <Card size="sm" className="gap-3">
            <div className="flex flex-col gap-0.5 px-4">
              <p className="text-body-compact font-semibold text-pretty">{task.why.event}</p>
              {/dated|on \d/.test(task.why.event) ? null : (
                <p className="text-caption tabular-nums text-muted-foreground">{longDate(task.why.at)}</p>
              )}
            </div>
            <div className="mx-4 rounded-lg bg-surface-sunken p-3">
              <p className="text-body-compact leading-relaxed text-pretty">{task.whatToDo}</p>
            </div>
          </Card>
        </Block>

        {task.returned?.defects.length ? (
          /*
           * How much is left, and where — not every defect's wording (owner, 2026-08-24).
           *
           * This panel exists so the advocate can *decide what to pick up*, and that
           * decision needs a size and a shape: eight defects, three done, spread over
           * these sections. Reading each officer's remark is the correction round's job,
           * and the correction screen shows them one at a time beside the field they
           * belong to. Reproducing all eight here made the panel the longest thing on the
           * screen and duplicated a surface that does the job better.
           */
          <Block title="Scrutiny return">
            <Card size="sm" className="gap-3 px-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-body-compact font-semibold">
                  {done} of {defects.length} corrected
                </p>
                <p className="text-caption tabular-nums text-muted-foreground">
                  Returned {longDate(task.returned.at)}
                </p>
              </div>

              {/* One chunk per defect — countable at a glance, same vocabulary as the
                  correction screen's own progress. */}
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={defects.length}
                aria-valuenow={done}
                aria-label={`${done} of ${defects.length} defects corrected`}
                className="flex gap-1"
              >
                {defects.map((d, i) => (
                  <span
                    key={d.n}
                    className={cn(
                      "h-1.5 min-w-0 flex-1 rounded-full",
                      i < done ? "bg-primary" : "bg-track"
                    )}
                  />
                ))}
              </div>

              {unresolved > 0 ? (
                <p className="text-caption text-muted-foreground">
                  {/* Where the work sits, so the size of the job is legible without
                      reading it: the sections, not the remarks. */}
                  {`${unresolved} left in ${sectionsAffected.join(" · ")}`}
                </p>
              ) : (
                <p className="text-caption font-medium text-success-ink">
                  Everything is corrected — ready to re-file.
                </p>
              )}
            </Card>
          </Block>
        ) : null}

        {extraDocs.length ? (
          <Block title="Documents needed">
            <ul className="flex flex-col gap-1 text-body-compact">
              {extraDocs.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <FileTextIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {preparedBy ? (
          <Block title="Prepared by">
            <Card size="sm" className="gap-3">
              <div className="flex items-center gap-3 px-4">
                {(() => {
                  const p = people.find((x) => x.id === preparedBy.by);
                  return p ? <PersonAvatar person={p} you={p.id === user.id} /> : null;
                })()}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-body-compact font-semibold">{nameOf(people, preparedBy.by)}</p>
                  <p className="text-caption tabular-nums text-muted-foreground">
                    {dateTime(preparedBy.at)}
                  </p>
                </div>
              </div>
              <p className="px-4 text-body-compact leading-relaxed text-pretty">
                {preparedBy.note || <span className="text-muted-foreground">No note.</span>}
              </p>
              {(preparedBy.files ?? task.files)?.length ? (
                <div className="mx-4">
                  <FileList files={preparedBy.files ?? task.files} />
                </div>
              ) : null}
            </Card>
          </Block>
        ) : null}

        {draftBy ? (
          <Block title="Draft">
            <Card size="sm" className="gap-3">
              <div className="flex items-center gap-3 px-4">
                {(() => {
                  const p = people.find((x) => x.id === draftBy.by);
                  return p ? <PersonAvatar person={p} you={p.id === user.id} /> : null;
                })()}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-body-compact font-semibold">
                    {draftBy.by === user.id ? "You" : nameOf(people, draftBy.by)}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Saved · <span className="tabular-nums">{dateTime(draftBy.savedAt)}</span>
                  </p>
                </div>
              </div>
              {draftBy.note ? (
                <p className="px-4 text-body-compact leading-relaxed text-pretty">{draftBy.note}</p>
              ) : null}
              {task.files?.length ? (
                <div className="mx-4">
                  <FileList files={task.files} />
                </div>
              ) : null}
            </Card>
          </Block>
        ) : null}

        {!preparedBy && !draftBy && task.files?.length ? (
          <Block title="Files">
            <FileList files={task.files} />
          </Block>
        ) : null}

        <Block title="Advocates on this case" count={advocates.length}>
          <ul className="flex flex-col gap-2">
            {advocates.map((p, i) => {
              const signatory = i < kase.signatories.length;
              return (
                <li key={p.id} className="flex items-center gap-3 text-body-compact">
                  <PersonAvatar person={p} you={p.id === user.id} />
                  <span className="min-w-0 flex-1">
                    {p.name}
                    {p.id === user.id ? <span className="text-muted-foreground"> (you)</span> : null}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {signatory ? "Vakalatnama" : "On the case"}
                  </span>
                </li>
              );
            })}
          </ul>
          {viewOnly ? (
            <p className="text-body-compact text-muted-foreground">{viewOnlyLineOf(kase, people)}</p>
          ) : null}
        </Block>

        {/* The audit trail matters when questioned, not on every glance — folded away. */}
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger className="group flex h-10 w-full items-center justify-between gap-2 rounded-lg text-left text-caption font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <span className="tabular-nums">History · {history.length}</span>
            <ChevronDownIcon
              aria-hidden
              className="size-4 transition-transform group-data-[state=open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Timeline>
              {history.map((h, i) => (
                <TimelineItem
                  key={`${h.at}-${i}`}
                  status={i === 0 ? "current" : "past"}
                  // The primitive's title slot takes a string; the date sits alone on
                  // its line, so the missing tabular-nums cannot misalign anything.
                  title={dateTime(h.at)}
                >
                  <p className="mt-0.5 text-body-compact leading-relaxed text-pretty text-muted-foreground">
                    {h.text}
                  </p>
                  {h.by
                    ? (() => {
                        const p = people.find((x) => x.id === h.by);
                        return p ? (
                          <p className="mt-1.5 flex items-center gap-1.5 text-caption text-muted-foreground">
                            <PersonAvatar person={p} you={p.id === user.id} className="size-5" />
                            {p.id === user.id ? "You" : p.name}
                          </p>
                        ) : null;
                      })()
                    : null}
                </TimelineItem>
              ))}
            </Timeline>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Actions: the ONE teal action of the view is here; the table's row verbs are outline. */}
      {primary || secondary || markable || archivable ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3 md:px-6">
          {primary ? (
            offline ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex rounded-lg">
                    <Button disabled>{primary.label}</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>You are offline — read only</TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={primary.run} disabled={busy}>
                {primary.label}
              </Button>
            )
          ) : null}
          {secondary ? (
            <Button variant="outline" onClick={secondary.run}>
              {secondary.label}
            </Button>
          ) : null}
          {markable && verb !== "Mark done" ? (
            <Button variant="ghost" disabled={offline || busy} onClick={onMarkDone}>
              Mark as done
            </Button>
          ) : null}
          {archivable ? (
            <Button variant="ghost" disabled={offline || busy} onClick={onArchive}>
              Archive
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Task detail.
 *
 * From `lg` up it is an in-flow, non-modal panel that pushes the table left: no scrim, no
 * focus trap, the table stays live — so clicking another row swaps this content in place.
 * Below `lg` the table has no width to give and the detail falls back to the Sheet
 * overlay, full width on a phone.
 */
export function TaskDetailPanel({
  open,
  onOpenChange,
  ...detail
}: Omit<TaskDetailProps, "task" | "kase"> & {
  task: Task | null;
  kase: Case | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pushes = useIsDesktop();
  const { task, kase } = detail;

  // The Sheet brings its own Escape handling; the push panel is plain markup, so it
  // needs its own — closing on Escape is not optional.
  React.useEffect(() => {
    if (!pushes || !open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[role=dialog], [role=alertdialog], [data-slot=select-content]")) return;
      onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pushes, open, onOpenChange]);

  if (pushes) {
    return (
      <aside
        aria-label="Task detail"
        className={cn(
          "sticky top-14 h-[calc(100svh-3.5rem)] shrink-0 overflow-hidden border-l border-hairline bg-card transition-[width] duration-200 ease-out",
          open ? "w-md 2xl:w-lg" : "w-0 border-l-0"
        )}
      >
        {/* Held at the open width so the content does not reflow mid-slide. */}
        <div className="flex h-full w-md flex-col 2xl:w-lg">
          {task && kase ? (
            <TaskDetail
              key={task.id}
              {...detail}
              task={task}
              kase={kase}
              close={
                /* 32px visible, expanded to the 40px touch floor. */
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onOpenChange(false)}
                  className="relative after:absolute after:-inset-1"
                >
                  <XIcon aria-hidden />
                  Close
                </Button>
              }
            />
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {task && kase ? (
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <TaskDetail
            key={task.id}
            {...detail}
            task={task}
            kase={kase}
            Title={SheetTitle}
            Description={SheetDescription}
            close={
              <SheetClose asChild>
                <Button variant="ghost" size="xs" className="relative after:absolute after:-inset-1">
                  <XIcon aria-hidden />
                  Close
                </Button>
              </SheetClose>
            }
          />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
