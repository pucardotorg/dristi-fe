"use client";

import { useState, type Ref } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canOpenDepositions,
  canOpenTranscript,
  depositionStatusLabel,
  depositionsFor,
  exhibitLabel,
  findTranscript,
  formatHearingClock,
  formatHearingTimeRange,
  hearingPartyNames,
  hearingResultCopy,
  hearingStatusLabel,
  hearingStatusVariant,
  hearingTypeLabel,
  transcriptListState,
  transcriptRecordLabel,
  transcriptUnavailableLabel,
  type Hearing,
  type HearingPerson,
  type HearingsFile,
  type HearingTranscript,
} from "@/lib/cases/hearings";
import { formatCaseDate } from "@/lib/cases/types";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

export type HearingRecordKind = "transcript" | "depositions";

export type HearingRecordOpen = {
  hearing: Hearing;
  /** Initial tab when both transcript and deposition are on file. */
  kind?: HearingRecordKind;
};

const scrollClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]";

/**
 * Outline CTAs that open the hearing record. Outline, not teal — the page
 * primary stays elsewhere (Laws). stopPropagation lets a parent card stay
 * clickable without stealing the button.
 */
export function HearingRecordActions({
  file,
  hearing,
  onOpenRecord,
}: {
  file: HearingsFile;
  hearing: Hearing;
  onOpenRecord: (open: HearingRecordOpen) => void;
}) {
  const date = formatCaseDate(hearing.on);
  const type = hearingTypeLabel(hearing.type);
  const transcript = canOpenTranscript(file, hearing);
  const depositions = canOpenDepositions(file, hearing);
  const transcriptState = transcriptListState(file, hearing);

  const unavailableLabel =
    transcriptState === "temporarily_unavailable"
      ? "Transcript temporarily unavailable"
      : transcriptState === "restricted"
        ? "Restricted record"
        : transcriptState === "unavailable"
          ? "Transcript unavailable"
          : "No hearing artifact available";

  if (!transcript && !depositions) {
    return (
      <p className="text-caption font-medium text-muted-foreground">
        {unavailableLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transcriptState ? (
        <p className="text-caption font-medium text-muted-foreground">
          {unavailableLabel}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {transcript ? (
          <Button
            type="button"
            variant="outline"
            aria-label={`View transcript for ${type} hearing on ${date}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenRecord({ hearing, kind: "transcript" });
            }}
          >
            View transcript
          </Button>
        ) : null}
        {depositions ? (
          <Button
            type="button"
            variant="outline"
            aria-label={`View witness deposition for ${type} hearing on ${date}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenRecord({ hearing, kind: "depositions" });
            }}
          >
            View witness deposition
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Read-only hearing record. Dummy copy is a summary unless the record is
 * marked verbatim — the heading says which. Transcript and witness
 * deposition share one dialog; tabs appear only when both are on file.
 */
export function HearingRecordDialog({
  file,
  peopleById,
  open,
  onOpenChange,
}: {
  file: HearingsFile;
  peopleById: Map<string, HearingPerson>;
  open: HearingRecordOpen | null;
  onOpenChange: (open: HearingRecordOpen | null) => void;
}) {
  return (
    <Dialog
      open={open !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(null);
      }}
    >
      {open ? (
        <HearingRecordBody
          key={open.hearing.id}
          file={file}
          hearing={open.hearing}
          peopleById={peopleById}
          initialKind={open.kind}
        />
      ) : null}
    </Dialog>
  );
}

type HearingRecordStepProps = {
  file: HearingsFile;
  hearing: Hearing;
  peopleById: Map<string, HearingPerson>;
  initialKind?: HearingRecordKind;
  /** Set only when this record is a step inside an overlay that is already
   *  open — see `HearingRecordStep`. Absent on the routed page. */
  onBack?: () => void;
  /** Focus target for the step above, so entering the record announces what
   *  the reader arrived at rather than nothing (ACCESSIBILITY 5). */
  headingRef?: Ref<HTMLHeadingElement>;
};

/** The record as its own dialog — the routed page's presentation, unchanged. */
function HearingRecordBody(props: HearingRecordStepProps) {
  return (
    <ChromeDialogContent className="flex max-h-[90svh] flex-col gap-6 overflow-hidden sm:max-w-2xl">
      <HearingRecordStep {...props} />
    </ChromeDialogContent>
  );
}

/**
 * The record's header, body and footer — everything inside the dialog panel
 * but not the panel itself.
 *
 * Split out because the hearings overlay shows a record as a second step of
 * the one dialog it already has open, rather than a second dialog on top of
 * it. The DS rules that out and names the alternative in the same breath:
 * "Nest a dialog inside another dialog — route to a second step instead"
 * (`/components/dialog`). Two dialogs would mean two focus traps and an
 * Escape key with two meanings, which is the defect, not the nesting.
 *
 * `onBack` is what tells the two presentations apart. Absent, this is the
 * whole dialog and ChromeDialogContent's own close button holds the corner.
 * Present, the corner belongs to the step above and the way out is the back
 * control here — which is also what Escape does there, so no one gesture
 * means two things.
 */
export function HearingRecordStep({
  file,
  hearing,
  peopleById,
  initialKind,
  onBack,
  headingRef,
}: HearingRecordStepProps) {
  const showTranscript = canOpenTranscript(file, hearing);
  const showDepositions = canOpenDepositions(file, hearing);
  const both = showTranscript && showDepositions;
  const heading = `${hearingTypeLabel(hearing.type)} — ${formatCaseDate(hearing.on)}`;
  const transcript = hearing.transcriptId
    ? findTranscript(file, hearing.transcriptId)
    : undefined;

  const resolvedKind: HearingRecordKind =
    initialKind === "depositions" && showDepositions
      ? "depositions"
      : initialKind === "transcript" && showTranscript
        ? "transcript"
        : showTranscript
          ? "transcript"
          : "depositions";

  const [kind, setKind] = useState<HearingRecordKind>(resolvedKind);
  const activeKind = both ? kind : resolvedKind;
  const downloadHref =
    activeKind === "transcript" && transcript?.recordStatus === "available"
      ? transcript.downloadHref
      : undefined;

  const description = recordDescription({
    both,
    showTranscript,
    showDepositions,
    activeKind,
    transcript,
  });

  return (
    <>
      {/* `pr-12` clears ChromeDialogContent's close button, so it is only owed when
          that button is there. With a back control it is not, and the header
          gets its full width back. */}
      <DialogHeader className={cn("shrink-0", !onBack && "pr-12")}>
        {/* Above the record rather than beside it: this is the way out of a
            step, so it reads before the step does. Ghost, because the record
            below is the thing on screen (Laws — ration teal, and the page
            primary is the Download in the footer). Button default is h-10,
            which is the touch floor (ACCESSIBILITY 8). */}
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            className="-ms-2 self-start text-body"
            onClick={onBack}
          >
            <ArrowLeftIcon aria-hidden />
            Back to hearings
          </Button>
        ) : null}
        <DialogDescription className="text-caption font-medium text-muted-foreground">
          {description}
        </DialogDescription>
        {/* Focused by the overlay when the step opens. `tabIndex` only when
            there is a ref to focus it with, so the routed page keeps a plain
            heading. A heading is not keyboard-reachable at -1 and never
            shows a ring, so nothing is being removed here. */}
        <DialogTitle
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="text-title font-semibold outline-none"
        >
          {heading}
        </DialogTitle>
      </DialogHeader>
      {both ? (
        <Tabs
          value={kind}
          onValueChange={(next) => {
            if (next === "transcript" || next === "depositions") setKind(next);
          }}
          className="flex min-h-0 flex-1 flex-col gap-6"
        >
          {/*
            Default TabsList (surface-sunken + hairline), never line — these are two
            artifacts of one hearing, not page sections. Height only on
            TabsList (h-10). Triggers keep DS h-[calc(100%-1px)].
          */}
          <TabsList
            variant="default"
            aria-label="Hearing record"
            className="h-10 w-max shrink-0 group-data-horizontal/tabs:h-10"
          >
            <TabsTrigger
              value="transcript"
              className="px-3 text-body whitespace-nowrap"
            >
              Transcript
            </TabsTrigger>
            <TabsTrigger
              value="depositions"
              className="px-3 text-body whitespace-nowrap"
            >
              Witness deposition
            </TabsTrigger>
          </TabsList>
          <div className={scrollClass}>
            <TabsContent value="transcript" className="text-body outline-none">
              <div className="flex flex-col gap-6">
                <TranscriptPanel
                  file={file}
                  hearing={hearing}
                  peopleById={peopleById}
                  transcript={transcript}
                />
              </div>
            </TabsContent>
            <TabsContent value="depositions" className="text-body outline-none">
              <div className="flex flex-col gap-6">
                <DepositionPanel file={file} hearing={hearing} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className={scrollClass}>
          <div className="flex flex-col gap-6">
            {showTranscript ? (
              <TranscriptPanel
                file={file}
                hearing={hearing}
                peopleById={peopleById}
                transcript={transcript}
              />
            ) : showDepositions ? (
              <DepositionPanel file={file} hearing={hearing} />
            ) : (
              <HearingDetailsPanel
                file={file}
                hearing={hearing}
                peopleById={peopleById}
              />
            )}
          </div>
        </div>
      )}
      {downloadHref ? (
        <DialogFooter className="shrink-0">
          <Button type="button" asChild>
            <a
              href={downloadHref}
              download
              aria-label={`Download transcript for ${heading}`}
            >
              Download
            </a>
          </Button>
        </DialogFooter>
      ) : null}
    </>
  );
}

function recordDescription({
  both,
  showTranscript,
  showDepositions,
  activeKind,
  transcript,
}: {
  both: boolean;
  showTranscript: boolean;
  showDepositions: boolean;
  activeKind: HearingRecordKind;
  transcript: HearingTranscript | undefined;
}): string {
  if (both) {
    return activeKind === "depositions"
      ? "Witness deposition"
      : transcript
        ? transcriptRecordLabel(transcript)
        : "Hearing transcript";
  }
  if (showTranscript) {
    return transcript
      ? transcriptRecordLabel(transcript)
      : "Hearing transcript";
  }
  if (showDepositions) return "Witness deposition";
  return "Hearing details";
}

function TranscriptPanel({
  file,
  hearing,
  peopleById,
  transcript,
}: {
  file: HearingsFile;
  hearing: Hearing;
  peopleById: Map<string, HearingPerson>;
  transcript: HearingTranscript | undefined;
}) {
  if (!transcript) {
    return (
      <Alert variant="warning">
        <AlertTitle className="text-body">Transcript unavailable</AlertTitle>
        <AlertDescription className="text-body">
          Transcript is not available for this hearing.
        </AlertDescription>
      </Alert>
    );
  }

  if (transcript.recordStatus !== "available") {
    return (
      <Alert
        variant={transcript.recordStatus === "restricted" ? "warning" : "info"}
      >
        <AlertTitle className="text-body">
          {transcript.recordStatus === "restricted"
            ? "Restricted record"
            : "Transcript temporarily unavailable"}
        </AlertTitle>
        <AlertDescription className="text-body">
          {transcriptUnavailableLabel(transcript.recordStatus)}
        </AlertDescription>
      </Alert>
    );
  }

  const present = hearingPartyNames(hearing, peopleById);

  return (
    <>
      <DescriptionList>
        <RecordRow term="Hearing ID">{transcript.hearingId}</RecordRow>
        {hearing.status ? (
          <RecordRow term="Status">
            <Badge variant={hearingStatusVariant(hearing.status)}>
              {hearingStatusLabel(hearing.status)}
            </Badge>
          </RecordRow>
        ) : null}
        <RecordRow term="Court">{file.court}</RecordRow>
        {transcript.startTime && transcript.endTime ? (
          <RecordRow term="Time">
            {formatHearingTimeRange(transcript.startTime, transcript.endTime)}
          </RecordRow>
        ) : null}
      </DescriptionList>

      {present ? (
        <RecordBlock title="Participants">
          <p className="text-body text-muted-foreground">{present}</p>
        </RecordBlock>
      ) : null}

      {transcript.summary ? (
        <RecordBlock title="Summary">
          <p className="text-body">{transcript.summary}</p>
        </RecordBlock>
      ) : null}

      {transcript.entries.length > 0 ? (
        <RecordBlock title="Chronological record">
          <TranscriptEntries transcript={transcript} />
        </RecordBlock>
      ) : null}
    </>
  );
}

function DepositionPanel({
  file,
  hearing,
}: {
  file: HearingsFile;
  hearing: Hearing;
}) {
  const linked = depositionsFor(file, hearing.depositionIds);
  const [selectedId, setSelectedId] = useState<string | null>(
    linked.length === 1 ? linked[0].id : null
  );
  const selected = linked.find((item) => item.id === selectedId) ?? null;
  const heading = `${hearingTypeLabel(hearing.type)} — ${formatCaseDate(hearing.on)}`;

  if (linked.length === 0) {
    return (
      <Alert>
        <AlertTitle className="text-body">
          No witness deposition recorded
        </AlertTitle>
        <AlertDescription className="text-body">
          No witness deposition was recorded for this hearing.
        </AlertDescription>
      </Alert>
    );
  }

  if (!selected) {
    return (
      <ul className="flex flex-col gap-3">
        {linked.map((deposition) => (
          <li key={deposition.id}>
            <Item variant="outline" asChild>
              <button
                type="button"
                className="h-full min-h-10 w-full items-start text-left"
                aria-label={`View witness deposition of ${deposition.witnessNumber} ${deposition.witnessName} for ${heading}`}
                onClick={() => setSelectedId(deposition.id)}
              >
                <ItemContent>
                  <ItemTitle className="line-clamp-none text-body font-medium text-foreground">
                    <Identifier
                      value={deposition.witnessNumber}
                      label="witness number"
                      copyable={false}
                    />
                    {` — ${deposition.witnessName}`}
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none text-body">
                    {deposition.witnessType}
                  </ItemDescription>
                </ItemContent>
              </button>
            </Item>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {linked.length > 1 ? (
        <Button
          type="button"
          variant="ghost"
          aria-label={`All witness depositions for ${heading}`}
          onClick={() => setSelectedId(null)}
        >
          All depositions
        </Button>
      ) : null}

      {selected.status === "Partly recorded" && selected.continuationDate ? (
        <Banner variant="warning">
          Partly recorded. Continuation is scheduled for{" "}
          {formatCaseDate(selected.continuationDate)}.
        </Banner>
      ) : null}

      <DescriptionList>
        <RecordRow term="Witness number">
          <Identifier value={selected.witnessNumber} label="witness number" />
        </RecordRow>
        <RecordRow term="Witness name">{selected.witnessName}</RecordRow>
        <RecordRow term="Witness type">{selected.witnessType}</RecordRow>
        <RecordRow term="Hearing">{heading}</RecordRow>
        <RecordRow term="Examination">{selected.examinationStage}</RecordRow>
        <RecordRow term="Recording status">
          {depositionStatusLabel(selected)}
        </RecordRow>
      </DescriptionList>

      <RecordBlock title="Testimony summary">
        <p className="text-body">{selected.summary}</p>
      </RecordBlock>

      {selected.exhibits.length > 0 ? (
        <RecordBlock title="Exhibits referred to">
          <ul className="flex flex-col gap-1">
            {selected.exhibits.map((code) => (
              <li key={code} className="text-body">
                <Identifier value={code} label="exhibit" />
                <span aria-hidden> — </span>
                {exhibitLabel(code)}
              </li>
            ))}
          </ul>
        </RecordBlock>
      ) : null}
    </>
  );
}

function HearingDetailsPanel({
  file,
  hearing,
  peopleById,
}: {
  file: HearingsFile;
  hearing: Hearing;
  peopleById: Map<string, HearingPerson>;
}) {
  const present = hearingPartyNames(hearing, peopleById);
  const result = hearingResultCopy(hearing, file);
  const transcriptState = transcriptListState(file, hearing);
  const unavailableLabel =
    transcriptState === "temporarily_unavailable"
      ? "Transcript temporarily unavailable"
      : transcriptState === "restricted"
        ? "Restricted record"
        : transcriptState === "unavailable"
          ? "Transcript unavailable"
          : null;

  return (
    <>
      {hearing.migrated ? (
        <Banner variant="neutral">
          This hearing was migrated from a previous record. Some details are
          not available.
        </Banner>
      ) : null}

      {unavailableLabel ? (
        <Alert
          variant={
            transcriptState === "temporarily_unavailable" ? "info" : "warning"
          }
        >
          <AlertTitle className="text-body">{unavailableLabel}</AlertTitle>
          <AlertDescription className="text-body">
            {transcriptState === "temporarily_unavailable" ||
            transcriptState === "restricted"
              ? transcriptUnavailableLabel(transcriptState)
              : "Transcript is not available for this hearing."}
          </AlertDescription>
        </Alert>
      ) : null}

      <DescriptionList>
        <RecordRow term="Hearing ID">
          <Identifier value={hearing.id} label="hearing id" />
        </RecordRow>
        {hearing.status ? (
          <RecordRow term="Status">
            <Badge variant={hearingStatusVariant(hearing.status)}>
              {hearingStatusLabel(hearing.status)}
            </Badge>
          </RecordRow>
        ) : null}
        <RecordRow term="Court">{file.court}</RecordRow>
      </DescriptionList>

      {present ? (
        <RecordBlock title="Participants">
          <p className="text-body text-muted-foreground">{present}</p>
        </RecordBlock>
      ) : hearing.migrated ? (
        <p className="text-body text-muted-foreground">
          Parties, advocates and witnesses were not migrated.
        </p>
      ) : null}

      {hearing.summary ? (
        <RecordBlock title="Summary">
          <p className="text-body">{hearing.summary}</p>
        </RecordBlock>
      ) : null}

      {result ? (
        <RecordBlock title="Result or next direction">
          <p className="text-body text-muted-foreground">{result}</p>
        </RecordBlock>
      ) : null}
    </>
  );
}

/**
 * Same labelled rows as Overview — the dialog is already the panel, so
 * these facts do not get a Card each.
 */
function RecordRow({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <DescriptionRow>
      <DescriptionTerm className="text-body">{term}</DescriptionTerm>
      <DescriptionDetails className="min-w-0 text-body font-medium whitespace-normal">
        {children}
      </DescriptionDetails>
    </DescriptionRow>
  );
}

function RecordBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="text-body font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function TranscriptEntries({
  transcript,
}: {
  transcript: HearingTranscript;
}) {
  return (
    <ol className="flex flex-col">
      {transcript.entries.map((entry) => (
        <li
          key={`${entry.time}-${entry.speaker}`}
          className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
        >
          <p className="shrink-0 text-caption font-medium tabular-nums text-muted-foreground sm:w-24">
            {formatHearingClock(entry.time)}
          </p>
          <p className="shrink-0 text-body-compact font-medium sm:w-40">
            {entry.speaker}
          </p>
          <p className="min-w-0 text-body">{entry.text}</p>
        </li>
      ))}
    </ol>
  );
}
