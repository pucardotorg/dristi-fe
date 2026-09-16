"use client";

import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import { ArchiveIcon, SendIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  FEATURE_NAME,
  SERVICE_SECTION_ID,
  serviceOfProcess,
  type ServiceOfProcess,
  type ServiceParty,
  type ServiceRound,
} from "@/lib/cases/service";
import { type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

/**
 * Why there is no next date, when there is no next date. Process is the step
 * the case stops on: nothing gets listed until the accused is before the
 * court (journey.md §5-6), so this section answers one question — can the
 * court get the accused before it?
 *
 * Master and detail, not a table and a dialog. A round of process is a dozen
 * facts, four of them prose, and the table that used to hold them spent five
 * columns saying a fifth of it while the rest lived behind a modal nobody
 * opened twice. The list on the left is the case's service history at a
 * glance; the pane on the right is the round it is standing on. Both are on
 * the page at once, so comparing two rounds is a keystroke rather than two
 * open-and-close cycles.
 *
 * One block per accused with process still outstanding — an accused the court
 * has already secured is named in the outstanding party's description, where
 * naming them is the point. `serviceOfProcess` owns that rule, including the
 * part where every accused renders when none of them are outstanding.
 *
 * Still a titled card now that it is a section of its own rather than the
 * last block of Overview. A card around a whole screen can be a border drawn
 * round the page, but not here: every sibling section — Hearings, Orders,
 * Documents, Applications — is a `Card` carrying a heading at the same rank
 * with its register inside, so dropping the frame on this one would make the
 * file's one nameless screen the screen you land on when you cannot tell
 * whether the court has reached anybody. The heading is also what names the
 * section on a route where the strip has no tab to mark.
 *
 * The model is built here, in the client component, the way `CaseOrders` and
 * `CaseHearings` build theirs — Overview used to build it and pass the result
 * down, and a section that owns its route should own its own read.
 */
export function CaseServiceOfProcess({ record }: { record: CaseRecord }) {
  const service = serviceOfProcess(record);

  return (
    <section id={SERVICE_SECTION_ID} className="min-w-0">
      <Card className="hover:bg-card">
        <CardHeader>
          <h2 className="text-title-s font-semibold">{FEATURE_NAME}</h2>
        </CardHeader>
        {service ? (
          <ServiceOfProcessPanel service={service} />
        ) : (
          <CardContent>
            <ServiceEmpty disposed={Boolean(record.disposal)} />
          </CardContent>
        )}
      </Card>
    </section>
  );
}

/**
 * `serviceOfProcess` returns null for two different reasons, and a tab cannot
 * answer both with a blank page the way a card on Overview could by simply
 * not rendering. It is in the strip on every case, so clicking it always owes
 * the reader a sentence.
 *
 * The two reasons are not one empty state. A disposed case is withheld before
 * the pack is even read, so "nothing has issued yet" would be a claim about a
 * file this screen never opened — and on most disposed §138 cases it would be
 * false. Both readings come from `service.ts`, which is where the rule about
 * when this section is absent is written down.
 *
 * Conditionally dropping the tab was the alternative and is worse: exactly
 * one fixture case carries a service pack today, so the strip would change
 * shape from case to case, and a `?section=notice-process-status` URL someone
 * shared would fall back to Overview on nearly every one of them.
 */
function ServiceEmpty({ disposed }: { disposed: boolean }) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {disposed ? <ArchiveIcon aria-hidden /> : <SendIcon aria-hidden />}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {disposed ? "This case is disposed" : "No process on record"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {disposed
            ? "The outcome, not the service record, is what the file turns on once a case is disposed."
            : "This case carries no record of process issued to an accused. Summons, warrants and other process appear here once the court issues them."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * The same register without a card or heading of its own, for a host that
 * supplies both. The section above is the only caller; kept split rather than
 * folded back in, because two ways to render one register is two places for
 * the party ordering and the divider rule to drift.
 */
export function ServiceOfProcessPanel({
  service,
}: {
  service: ServiceOfProcess;
}) {
  return (
    <CardContent className="flex flex-col gap-6">
      {service.map((party, index) => (
        <Fragment key={party.id}>
          {/* No divider chrome above the first block. */}
          {index > 0 ? <Separator /> : null}
          <PartyBlock party={party} />
        </Fragment>
      ))}
    </CardContent>
  );
}

/**
 * One accused: who they are and how service stands, then the rounds issued to
 * them. Named for screen readers so a case with several accused can be
 * navigated by party rather than by counting lists.
 */
function PartyBlock({ party }: { party: ServiceParty }) {
  const headingId = `${party.id}-name`;
  return (
    <section className="flex min-w-0 flex-col gap-6" aria-labelledby={headingId}>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-body text-muted-foreground">Process for</p>
        {/* Name first, role after. The cause title's own order puts the
            rank first, but the reader is looking for a person here, and
            scanning a column of "Accused 2 · …" finds the rank twice
            before the name once.

            No party-level verdict badge. Every round already carries its own
            status, and the newest of them is selected on arrival — so a
            rollup badge beside the name restated the top row of the list in
            different words and gave the header two states to reconcile. */}
        <h3
          id={headingId}
          className="min-w-0 text-body font-medium text-foreground"
        >
          {party.name} · {party.role}
        </h3>
        {/* Never clamped: this is the paragraph that says which accused the
            case stage belongs to, and it runs longer in Indic scripts
            (ACCESSIBILITY 13). */}
        {party.description ? (
          <p className="text-body text-muted-foreground">{party.description}</p>
        ) : null}
      </div>
      <Separator />
      <RoundTabs party={party} />
    </section>
  );
}

/**
 * The rounds select the pane, which is what a tablist means to a screen
 * reader. Hand-composed rather than the DS Tabs primitive: that primitive's
 * trigger is a single-line label in a strip — `whitespace-nowrap`, `flex-1`,
 * a percentage height and its own indicator bar — and these triggers are
 * multi-line cards carrying a badge and a date. Reaching that shape meant
 * overriding a dozen of the primitive's own classes, which is wearing it as
 * a costume rather than using it. The ARIA is the same either way; this
 * leaves the primitive honest for the strips it was built for.
 *
 * Rounds above, detail below — not a rail beside a pane. Side by side, the
 * register needed a wide column to hold both, which set the width of the
 * whole page for one panel of one tab. Stacked, each half gets the full
 * width of whatever column it lands in.
 *
 * One line, oldest to newest. In a grid the rounds were four blocks with no
 * order in them: nothing said whether the warrant came before the summons or
 * after it, because reading order in a wrapped grid is a guess. A line has a
 * direction, and process is a chain — summons failed, so a warrant, so a
 * proclamation — so the line runs the way the chain ran. `ServiceParty.rounds`
 * is stored newest-first and walked backwards here; that is the reversal, and
 * it is the only thing this component does to the register's order.
 *
 * Newest round still selected on arrival — it is where the case stands, and
 * it now sits at the end of the chain rather than the start.
 */
function RoundTabs({ party }: { party: ServiceParty }) {
  const [selectedId, setSelectedId] = useState(party.rounds[0].id);
  const tabs = useRef(new Map<string, HTMLButtonElement | null>());
  const selected =
    party.rounds.find((round) => round.id === selectedId) ?? party.rounds[0];
  /* Oldest to newest. `toReversed` leaves the pack's own array alone —
     reversing in place would reorder the object every other render. */
  const order = party.rounds.toReversed();

  /**
   * Selection follows focus, and focus wraps — the tabs pattern's own
   * behaviour, and the right one here because the panel is already built and
   * costs nothing to swap.
   */
  function moveTo(index: number) {
    const round = order[index % order.length];
    if (!round) return;
    setSelectedId(round.id);
    tabs.current.get(round.id)?.focus();
  }

  /**
   * Left and right, because the tablist is horizontal. Indexed against the
   * rendered order rather than the stored one, so Right moves to the chip on
   * the right — an arrow key that walks the array backwards is an arrow key
   * pointing the wrong way.
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = order.findIndex((round) => round.id === selected.id);
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1 + order.length,
      Home: 0,
      End: order.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Wraps rather than scrolls: a round the reader cannot see is a round
          they do not know to compare, and the chips are short enough that
          the line holds even in a half-width column. Chips size to their
          own label — equal widths would pad "Warrant" out to the width of
          "Summons · R2" and lose the line's rhythm. */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        aria-label={`Process issued to ${party.name}, oldest first`}
        onKeyDown={onKeyDown}
        className="flex min-w-0 flex-wrap gap-2"
      >
        {order.map((round) => (
          <RoundTab
            key={round.id}
            party={party}
            round={round}
            selected={round.id === selected.id}
            onSelect={() => setSelectedId(round.id)}
            ref={(node) => {
              tabs.current.set(round.id, node);
            }}
          />
        ))}
      </div>
      {/* A rule rather than a gap alone: the cards are bordered blocks and
          the panel below is not, and without a line between them the panel
          reads as loose text under the last card. */}
      <Separator />
      <RoundPanel party={party} round={selected} />
    </div>
  );
}

/**
 * One round as a chip: the instrument, and nothing else. Everything the chip
 * used to carry — the status, the date it went out, the channel it went by —
 * is in the panel directly below it, and with the two stacked rather than
 * side by side, saying it twice within an inch of itself was the register
 * repeating itself rather than summarising.
 *
 * What is left is what the reader is actually choosing between: which
 * instrument. The line's order supplies the rest — where a round sits is
 * when it happened.
 *
 * Selected takes the DS's own selected fill (`accent-strong`) and a primary
 * border; unselected keeps the ordinary border and takes `accent` on hover.
 * Border colour, never width: a 2px selected edge against a 1px resting one
 * moves every chip in the line by a pixel.
 *
 * `min-h-10` with `py-2` holds the 40px touch floor (ACCESSIBILITY 8) now
 * that there is a single line of text to set the height.
 */
function RoundTab({
  party,
  round,
  selected,
  onSelect,
  ref,
}: {
  party: ServiceParty;
  round: ServiceRound;
  selected: boolean;
  onSelect: () => void;
  ref: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={tabId(party, round)}
      aria-controls={panelId(party, round)}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "flex min-h-10 items-center rounded-lg border border-border px-2.5 py-2 text-body-compact font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring",
        selected && "border-primary bg-accent-strong hover:bg-accent-strong"
      )}
    >
      {round.instrument}
    </button>
  );
}

/**
 * Amber for a round that still wants attention, grey for one that is closed.
 * Not a severity ramp: a warrant returned unexecuted is a bad outcome and a
 * finished one, and colouring it amber alongside the proclamation that is
 * genuinely mid-flight is how a reader stops trusting amber at all.
 */
function RoundStatusBadge({
  round,
  detail,
}: {
  round: ServiceRound;
  /** The pane has room for the register's longer wording. */
  detail?: boolean;
}) {
  return (
    <Badge variant={round.outstanding ? "warning" : "secondary"}>
      {detail ? (round.detailStatus ?? round.status) : round.status}
    </Badge>
  );
}

/**
 * The selected round in full — the record the old dialog held, on the page.
 * Focusable because it contains nothing that is: a keyboard user leaving the
 * list has to be able to reach the thing the list just changed (WAI-ARIA
 * tabs pattern).
 */
function RoundPanel({
  party,
  round,
}: {
  party: ServiceParty;
  round: ServiceRound;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(party, round)}
      aria-labelledby={tabId(party, round)}
      tabIndex={0}
      className="flex min-w-0 flex-1 flex-col gap-6 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
    >
      {/* The badge sits against the instrument it qualifies, not against the
          far edge of the pane. Pushed apart by `justify-between`, "Not
          served" read as a status belonging to the panel rather than to
          Summons · R1 — and at this width the gap between them was most of
          the row. */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h4 className="min-w-0 text-body font-medium text-foreground">
          {round.instrument}
        </h4>
        <RoundStatusBadge round={round} detail />
      </div>

      {/* Two up, one column on a phone. Term over value rather than the
          list's own label column: four facts in a 10rem-label grid is a tall
          ladder against a pane this wide, and "Last known residence,
          Punalur" wants the full width to stay on one line. */}
      <DescriptionList className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <RoundFact term="Issued / ordered" value={round.issuedOn} />
        <RoundFact term="Channel" value={round.detailChannel ?? round.channel} />
        <RoundFact term="Destination" value={round.destination} />
        <RoundFact term="Fee record" value={round.feeRecord} />
      </DescriptionList>

      {/* Its own well, because it is the one part of this pane written for a
          person rather than for a form — and never clamped: a truncated
          return is exactly the one you needed to read. */}
      {round.outcome ? (
        <div className="flex min-w-0 flex-col gap-2 rounded-md bg-surface-sunken p-4">
          <p className="text-body font-medium text-foreground">
            Recorded outcome
          </p>
          <p className="text-body text-muted-foreground">{round.outcome}</p>
        </div>
      ) : null}

    </div>
  );
}

/**
 * A fact the record does not carry is not a row. "Not recorded" is a value —
 * the court file says so and the pane prints it — so an absent field here
 * means the register never had that column for this instrument, and a dash
 * would claim a gap that is not there.
 */
function RoundFact({ term, value }: { term: string; value?: string }) {
  if (!value) return null;
  return (
    <DescriptionRow className="grid-cols-1 gap-1 border-b-0 py-0">
      {/* Body, not caption: typography names Body Medium as the role for
          "field labels in horizontal rows", and caption is 12px — chrome
          weight for a label the reader is here to read. Matches the term
          treatment `OverviewRow` already uses on this page. */}
      <DescriptionTerm className="text-body text-muted-foreground">
        {term}
      </DescriptionTerm>
      <DescriptionDetails className="min-w-0 text-body font-medium text-foreground">
        {value}
      </DescriptionDetails>
    </DescriptionRow>
  );
}

/** Party-scoped, because one card can carry a list per accused. */
function tabId(party: ServiceParty, round: ServiceRound): string {
  return `${party.id}-${round.id}-tab`;
}

function panelId(party: ServiceParty, round: ServiceRound): string {
  return `${party.id}-${round.id}-panel`;
}
