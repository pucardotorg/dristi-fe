"use client";

import * as React from "react";
import Link from "next/link";
import {
  CircleCheckIcon,
  EyeIcon,
  FileQuestionIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { ARRIVAL } from "@/components/chrome/motion";
import { COGNIZANCE_PATH } from "@/components/employee/cognizance-table";
import { DocumentScroller } from "@/components/employee/document-scroller";
import { markArrival, useArrival } from "@/components/employee/use-arrival";
import { useCourtToday } from "@/components/employee/use-court-today";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  chainFor,
  cnrFor,
  COGNIZANCE_ACTS,
  COGNIZANCE_DOCUMENTS,
  COGNIZANCE_PENDING_LABEL,
  cognizanceCaseById,
  findingsFor,
  nextCognizanceCase,
  primaryActFor,
  summaryChunksFor,
  type CognizanceAct,
  type CognizanceCase,
  type CognizanceChunk,
  type CognizanceField,
  type CognizanceFinding,
} from "@/lib/employee/cognizance";
import { zoneFor } from "@/lib/employee/document-zones";
import { causeTitle } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * One registered complaint, as the magistrate reads it before deciding whether the case
 * goes ahead — the reference's Case Summary, in our design language.
 *
 * The left column is the reference's own: a Case Summary block of the case's numbers, then
 * a single column of labelled fields in the reference's order, each date shown directly and
 * each critical check surfaced as an alert inline against the field it comes from (owner,
 * 2026-09-14). The right column is the documents, as one long scroll (`DocumentScroller`):
 * clicking a field brings its document to the top and marks the region the value was read
 * from — the scrutiny bundle's interaction, shared with Register cases.
 *
 * The acts are the PRD's two — Dismiss, and Take cognizance, which becomes Issue notice on
 * a late complaint in Kerala. Each settles in place and names the order it would draw up;
 * none is performed, and the trip into the order composer is not wired
 * (`lib/employee/cognizance.ts`).
 */
export function CognizanceCaseScreen({ caseId }: { caseId: string }) {
  const arrival = useArrival();
  const matter = cognizanceCaseById(caseId);

  if (!matter) return <CaseMissing />;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip",
        arrival && ARRIVAL[arrival],
      )}
    >
      <CaseBody key={matter.id} matter={matter} />
    </div>
  );
}

/** Section labels above a surface — scaffolding, so it reads as scaffolding. */
const EYEBROW = "text-caption font-semibold text-muted-foreground";

/** A lifted white panel whose children draw their own padding and dividers. */
const SHEET = "gap-0 overflow-hidden border-hairline py-0 shadow-raised";

function CaseBody({ matter }: { matter: CognizanceCase }) {
  /* The day is the reader's, not the server's — the whole chain is worked backwards from
     how long this complaint has waited, so the clock that matters is the one in the room
     (`use-court-today.ts`). */
  const today = useCourtToday();
  const chain = React.useMemo(() => chainFor(matter, today), [matter, today]);
  const chunks = React.useMemo(
    () => summaryChunksFor(matter, chain),
    [matter, chain],
  );
  const findings = React.useMemo(() => findingsFor(matter), [matter]);

  const next = nextCognizanceCase(matter.id) ?? null;
  const primary = primaryActFor(matter);

  /* Which field is lit, and the document and region it opened. `fieldId` is what lights
     the row — keyed on the field, not its document, so two fields that share a document
     (the cheque date and the branch both come off the cheque) do not light together. The
     scroller reads only `doc` and `zone`. `null` leaves everything at rest. */
  const [active, setActive] = React.useState<{
    fieldId: string;
    doc: string;
    zone: ReturnType<typeof zoneFor>;
  } | null>(null);

  const openField = (field: CognizanceField) => {
    const doc = field.source
      ? COGNIZANCE_DOCUMENTS.find((entry) => entry.key === field.source)
      : undefined;
    if (!doc) return;
    setActive({ fieldId: field.id, doc: doc.key, zone: zoneFor(doc.kind, field.term) });
  };

  /** Which act is being asked about, and whether it has settled. `null` — neither. */
  const [act, setAct] = React.useState<CognizanceAct | null>(null);
  const [settled, setSettled] = React.useState(false);

  const ask = (nextAct: CognizanceAct) => {
    setSettled(false);
    setAct(nextAct);
  };

  /* The scroller cares only which document and region — not which field opened it. */
  const documentActive = active ? { doc: active.doc, zone: active.zone } : null;

  const documentsHeader = (
    <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-hairline px-6 py-4">
      <h2 className="text-body font-semibold">Documents</h2>
      <span className="text-body-compact tabular-nums text-muted-foreground">
        {COGNIZANCE_DOCUMENTS.length} filed
      </span>
    </div>
  );

  return (
    <>
      {/* The register screen's own chrome: the cause and the two acts on a bar that sticks
          under the top bar, so the decision is always on top and always reachable — no
          bottom footer to sit over the documents and cut their scroll off (owner,
          2026-09-14). */}
      <div className="sticky top-14 z-20 border-b border-hairline bg-muted px-6 md:px-8 xl:px-12 dark:bg-background">
        <div className="flex h-14 items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-semibold text-title-s">
            {causeTitle(matter)}
          </h1>
          <div className="flex shrink-0 items-center gap-3">
            <Button type="button" variant="outline" onClick={() => ask("dismiss")}>
              {COGNIZANCE_ACTS.dismiss.label}
            </Button>
            <Button type="button" onClick={() => ask(primary)}>
              {COGNIZANCE_ACTS[primary].label}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-6 px-6 pt-6 pb-16 md:px-8 md:pt-8 xl:px-12">
        {/* The reading in the main column, the documents beside it — the case file's own
            layout. The case summary and the chunks share the one column so they line up;
            the documents panel spans the full height in the gutter, sticky as the column
            scrolls. Below 1280px the documents drop below and flow with the page. */}
        <div className="grid items-start gap-x-6 gap-y-8 xl:grid-cols-[minmax(0,1fr)_1rem_24rem] 2xl:grid-cols-[minmax(0,1fr)_1rem_28rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <CaseSummaryPanel matter={matter} />
            <CaseFactsPanel
              chunks={chunks}
              findings={findings}
              active={active}
              onOpen={openField}
            />
          </div>

          {/* An empty gutter — the contents rail belongs to the full case file, which has
              many groups to index; this summary has one column. */}
          <div className="hidden xl:block" />

          <aside
            aria-label="Documents"
            className="sticky top-28 -mt-8 hidden h-[calc(100svh-7rem)] min-h-0 flex-col self-start border-l border-hairline bg-card xl:-mr-12 xl:flex xl:pr-6"
          >
            {documentsHeader}
            <DocumentScroller docs={COGNIZANCE_DOCUMENTS} active={documentActive} />
          </aside>
        </div>

        {/* On a phone the documents are not a panel — they flow at the foot of the page,
            and a field that opens one scrolls the page down to it. */}
        <section
          aria-label="Documents"
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-card shadow-raised xl:hidden"
        >
          {documentsHeader}
          <DocumentScroller docs={COGNIZANCE_DOCUMENTS} active={documentActive} />
        </section>
      </div>

      <Dialog
        open={act !== null}
        onOpenChange={(open) => {
          if (!open) setAct(null);
        }}
      >
        {act ? (
          <ActBody
            act={act}
            matter={matter}
            next={next}
            settled={settled}
            onClose={() => setAct(null)}
            onConfirm={() => setSettled(true)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

/* ──────────────────────────────── case summary ──────────────────────────────── */

/**
 * The case's numbers, as a proper Case Summary block rather than a metadata line (owner,
 * 2026-09-14) — the reference's own header row.
 *
 * Three cells, divided like the synopsis sheet: the register number the complaint carries
 * before cognizance (`CMP/…`), the filing number it came in as, and the CNR the registry
 * assigned. The post-cognizance `ST/…` number is not shown — it does not exist until this
 * very act is taken.
 */
function CaseSummaryPanel({ matter }: { matter: CognizanceCase }) {
  const cells = [
    { label: "Case number", value: matter.caseNumber },
    { label: "Filing number", value: matter.filingNumber },
    { label: "CNR", value: cnrFor(matter) },
  ];
  return (
    <section aria-labelledby="case-summary" className="flex min-w-0 flex-col gap-3">
      <h2 id="case-summary" className={EYEBROW}>
        Case summary
      </h2>
      <Card className={cn(SHEET, "@container")}>
        <dl className="grid gap-px bg-hairline @md:grid-cols-3">
          {cells.map((cell) => (
            <div key={cell.label} className="flex min-w-0 flex-col gap-1 bg-card p-6">
              <dt className="text-caption text-muted-foreground">{cell.label}</dt>
              <dd className="text-body-compact font-medium tabular-nums break-words">
                {cell.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

/* ──────────────────────────────── the fields ────────────────────────────────── */

/** The mark and DS status pair each finding weight wears. One colour, one meaning. */
const FINDING_LOOK = {
  critical: { variant: "destructive" as const, Icon: TriangleAlertIcon },
  note: { variant: "info" as const, Icon: InfoIcon },
};

/**
 * The complaint's fields, one single column, in the reference's order (owner, 2026-09-14).
 *
 * A field the value was read off a document is a control: clicking it marks the region on
 * that document. A field a check bears on carries that finding as an alert directly beneath
 * it — the reference's inline red boxes, in the DS status pairs (a late-filing note reads
 * informational, a bad notice or a wrong court reads destructive).
 */
function CaseFactsPanel({
  chunks,
  findings,
  active,
  onOpen,
}: {
  chunks: CognizanceChunk[];
  findings: CognizanceFinding[];
  active: { fieldId: string } | null;
  onOpen: (field: CognizanceField) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {chunks.map((chunk) => (
        <Card key={chunk.id} className={cn(SHEET, "min-w-0")}>
          {/* Every chunk the same shape: a heading band on the sunken fill the court side
              uses for a well, then its fields in one column — the case file's own chunk
              grammar (`register-case-file.tsx`), so the summary reads as grouped, not as
              one flat run, and every group reads the same (owner, 2026-09-14). */}
          <div className="border-b border-hairline bg-surface-sunken px-6 py-3">
            <h3 className="text-body font-semibold">{chunk.label}</h3>
          </div>
          <DescriptionList className="p-2">
            {chunk.fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                finding={findings.find((entry) => entry.term === field.term)}
                active={active?.fieldId === field.id}
                onOpen={onOpen}
              />
            ))}
          </DescriptionList>
        </Card>
      ))}
    </div>
  );
}

/**
 * One field — its label over its value, ruled from the next, an alert beneath when a check
 * bears on it. Clickable when a document states it, with a quiet eye and the tables' hover
 * fill; the row it opened stays lit while its region is marked on the page.
 */
function FieldRow({
  field,
  finding,
  active,
  onOpen,
}: {
  field: CognizanceField;
  finding: CognizanceFinding | undefined;
  active: boolean;
  onOpen: (field: CognizanceField) => void;
}) {
  const open = field.source ? () => onOpen(field) : undefined;
  return (
    <DescriptionRow className="flex flex-col items-stretch gap-0 border-b border-hairline py-0 last:border-b-0">
      <div
        className={cn(
          "group/field relative flex min-w-0 flex-col gap-1 rounded-lg px-3 py-3 transition-colors",
          open && "cursor-pointer hover:bg-surface-sunken",
          active && "bg-accent hover:bg-accent",
        )}
        onClick={open}
      >
        <DescriptionTerm className="text-body-compact">{field.term}</DescriptionTerm>
        <DescriptionDetails
          className={cn("min-w-0 text-body-compact text-pretty", open && "pr-8")}
        >
          <span className="font-medium">{field.value}</span>
          {field.note ? (
            <span className="text-muted-foreground"> · {field.note}</span>
          ) : null}
          {open ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Show ${field.term} in the documents`}
              className={cn(
                "absolute top-3 right-2 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/field:opacity-100 [@media(hover:none)]:opacity-100",
                active && "opacity-100",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(field);
              }}
            >
              <EyeIcon aria-hidden />
            </Button>
          ) : null}
        </DescriptionDetails>
      </div>
      {finding ? (
        <div className="px-3 pb-3">
          <FindingAlert finding={finding} />
        </div>
      ) : null}
    </DescriptionRow>
  );
}

/** One check, inline beneath the field it bears on — the reference's red box, in the DS. */
function FindingAlert({ finding }: { finding: CognizanceFinding }) {
  const look = FINDING_LOOK[finding.weight];
  return (
    <Alert variant={look.variant}>
      <look.Icon aria-hidden />
      <AlertTitle className="text-body-compact text-pretty">
        {finding.statement}
      </AlertTitle>
      <AlertDescription className="text-body-compact text-pretty">
        {finding.consequence}
      </AlertDescription>
    </Alert>
  );
}

/* ─────────────────────────────────── the act ────────────────────────────────── */

/**
 * The question, and then the outcome, in one overlay — Register cases' act dialog.
 *
 * The act settles in place rather than closing: the outcome is what the bench came for,
 * and a dialog that vanishes leaves them looking at the file they just decided. The chip
 * carries the state, the heading what follows from it; nothing else moves.
 */
function ActBody({
  act,
  matter,
  next,
  settled,
  onClose,
  onConfirm,
}: {
  act: CognizanceAct;
  matter: CognizanceCase;
  next: CognizanceCase | null;
  settled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const spec = COGNIZANCE_ACTS[act];

  return (
    <ChromeDialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
      <DialogHeader className="shrink-0 items-start gap-2 border-b border-hairline p-6 pr-16">
        <Badge
          variant={settled ? spec.badge : "secondary"}
          className="gap-1.5 transition-colors duration-500 motion-reduce:transition-none"
        >
          {settled ? (
            <CircleCheckIcon
              aria-hidden
              className="size-3.5 shrink-0 animate-in fade-in-0 zoom-in-50 duration-500 motion-reduce:animate-none"
            />
          ) : null}
          <span
            key={settled ? "settled" : "asking"}
            role={settled ? "status" : undefined}
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500 motion-reduce:animate-none"
          >
            {settled ? spec.settled : COGNIZANCE_PENDING_LABEL}
          </span>
        </Badge>
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-title-s font-semibold outline-none"
        >
          <span
            key={settled ? "settled" : "asking"}
            className="inline-block animate-in fade-in-0 slide-in-from-bottom-1 duration-500 motion-reduce:animate-none"
          >
            {settled ? spec.outcome : spec.asking}
          </span>
        </DialogTitle>
        <DialogDescription className="text-body-compact text-muted-foreground">
          <span className="tabular-nums">{matter.caseNumber}</span>
          {" · "}
          {causeTitle(matter)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-6">
        <p className="text-body-compact text-pretty">
          {settled
            ? "The order is drafted and waiting to be signed. Nothing has been issued from this screen."
            : "An order will be drawn up with these items. It cannot be undone from this screen."}
        </p>
        <ul className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
          {spec.items.map((item) => (
            <li key={item} className="text-body-compact">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 border-hairline bg-card">
        {settled ? (
          <>
            <Button asChild variant={next ? "ghost" : "default"}>
              <Link href={COGNIZANCE_PATH} onClick={() => markArrival("back")}>
                Back to take cognizance
              </Link>
            </Button>
            {next ? (
              <Button asChild>
                <Link
                  href={`${COGNIZANCE_PATH}/${next.id}`}
                  onClick={() => markArrival("next")}
                >
                  Next complaint
                </Link>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={act === "dismiss" ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {spec.label}
            </Button>
          </>
        )}
      </DialogFooter>
    </ChromeDialogContent>
  );
}

/* ─────────────────────────────────── the miss ───────────────────────────────── */

/** An id this queue does not hold — a stale link, a typed URL, a complaint decided. */
function CaseMissing() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-8">
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="font-semibold text-title-s">
            This complaint is not waiting for cognizance
          </EmptyTitle>
          <EmptyDescription className="text-body">
            A complaint opens from the list of those on the register waiting for
            cognizance. This one is not on it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={COGNIZANCE_PATH}>Back to take cognizance</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
