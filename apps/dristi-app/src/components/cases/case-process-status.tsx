"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ChevronDownIcon, MailXIcon } from "lucide-react";

import { RestingCard } from "@/components/cases/case-overview-card";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  channelStatusView,
  processStatus,
  type ProcessPerson,
  type ProcessRound,
} from "@/lib/cases/process-status";
import { hearingHref, orderHref } from "@/lib/cases/sections";
import { type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";
import { COLLAPSE_MOTION } from "@/components/cases/motion";

/**
 * Notice/Process Status (§7). One panel per person the court issued process
 * to; inside it, rounds newest first, all closed until asked for. A round says what
 * triggered it, then lists every channel it went out on with that channel's
 * own destination, status, date and remarks.
 */
export function CaseProcessStatus({ record }: { record: CaseRecord }) {
  const people = processStatus(record);

  if (people.length === 0) {
    return (
      <RestingCard>
        <CardContent>
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MailXIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-body font-semibold">
                No process issued yet
              </EmptyTitle>
              <EmptyDescription>
                Notices, summons and warrants appear here once the court
                issues them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </RestingCard>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {people.map((person) => (
        <PersonPanel key={person.id} caseId={record.id} person={person} />
      ))}
    </div>
  );
}

/** A fact that names a hearing or an order opens it (SVC-07, SVC-08). */
const FACT_LINK =
  "rounded-sm text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50";

function PersonPanel({
  caseId,
  person,
}: {
  caseId: string;
  person: ProcessPerson;
}) {
  const headingId = `process-${person.id}`;
  return (
    <RestingCard>
      <CardContent className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 id={headingId} className="text-body font-semibold text-foreground">
            {person.name}
          </h2>
          <Badge variant="outline">{person.role}</Badge>
          <span className="text-caption font-medium tabular-nums text-muted-foreground">
            {person.rounds.length === 1
              ? "1 round"
              : `${person.rounds.length} rounds`}
          </span>
        </div>
        <ul aria-labelledby={headingId} className="flex flex-col gap-2">
          {person.rounds.map((round, index) => (
            <li key={round.id}>
              <Round
                caseId={caseId}
                round={round}
                /* Rounds count up from the oldest, so the newest carries the
                   highest number and sits first. */
                number={person.rounds.length - index}
                latest={index === 0}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </RestingCard>
  );
}

function Round({
  caseId,
  round,
  number,
  latest,
}: {
  caseId: string;
  round: ProcessRound;
  number: number;
  latest: boolean;
}) {
  return (
    <Collapsible
      className="rounded-lg border border-hairline"
    >
      <CollapsibleTrigger className="group/round flex min-h-10 w-full items-center gap-2 rounded-lg px-6 py-2 text-left outline-none hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body-compact font-medium text-foreground">
            Round {number}
          </span>
          <span className="text-body-compact text-muted-foreground">
            {round.processes.join(", ")}
          </span>
          {latest ? <Badge variant="secondary">Latest</Badge> : null}
        </span>
        {round.order ? (
          <span className="shrink-0 text-caption font-medium tabular-nums text-muted-foreground max-sm:hidden">
            {round.order.on}
          </span>
        ) : null}
        <ChevronDownIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded/round:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={COLLAPSE_MOTION}>
        {/* One left edge for everything in the round: the facts sit on the
            same inset as the table's cell text, and share the full width in
            thirds, so a long hearing purpose or order title has room. */}
        <div className="flex flex-col gap-8 border-t border-hairline px-2 pt-8 pb-2">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-4 sm:grid-cols-3">
            <Fact label="Linked hearing">
              {round.hearing ? (
                <>
                  {round.hearing.id ? (
                    <Link
                      href={hearingHref(
                        caseId,
                        round.hearing.id,
                        "notice-process-status"
                      )}
                      className={FACT_LINK}
                    >
                      {round.hearing.purpose}
                    </Link>
                  ) : (
                    round.hearing.purpose
                  )}
                  <Sub>{round.hearing.on}</Sub>
                </>
              ) : (
                <Muted>None</Muted>
              )}
            </Fact>
            <Fact label="Triggering order">
              {round.order ? (
                <>
                  {round.order.id ? (
                    <Link
                      href={orderHref(caseId, round.order.id)}
                      className={FACT_LINK}
                    >
                      {round.order.title}
                    </Link>
                  ) : (
                    round.order.title
                  )}
                  <Sub>{round.order.on}</Sub>
                </>
              ) : (
                <Muted>None</Muted>
              )}
            </Fact>
            <Fact label="Process fee paid">
              {round.feePaidOn ? (
                <span className="tabular-nums">{round.feePaidOn}</span>
              ) : (
                <Muted>Not paid yet</Muted>
              )}
            </Fact>
          </dl>

          <Table>
            <TableHeader>
              <TableRow className={TABLE_HEAD_ROW}>
                <TableHead className={cn(TABLE_HEAD, "w-36")}>Channel</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-1/4")}>Destination</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-36")}>Status</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-36")}>
                  Status date
                </TableHead>
                <TableHead className={TABLE_HEAD}>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={tableBodyClass({ hover: false })}>
              {round.channels.map((channel) => {
                const status = channelStatusView(channel.status);
                return (
                  <TableRow
                    key={channel.type}
                    className={tableRowClass({ hover: false })}
                  >
                    <TableCell
                      className={cn(TABLE_CELL, "align-top font-medium")}
                    >
                      {channel.type}
                    </TableCell>
                    <TableCell
                      className={cn(TABLE_CELL, "align-top whitespace-normal")}
                    >
                      {channel.destination}
                    </TableCell>
                    <TableCell className={cn(TABLE_CELL, "align-top")}>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(TABLE_CELL, "align-top tabular-nums")}
                    >
                      {channel.statusOn}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TABLE_CELL,
                        "align-top whitespace-normal text-muted-foreground"
                      )}
                    >
                      {channel.remarks ?? (
                        <>
                          <span aria-hidden>—</span>
                          <span className="sr-only">None</span>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-body-compact font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <span className="text-caption font-medium tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="font-normal text-muted-foreground">{children}</span>
  );
}
