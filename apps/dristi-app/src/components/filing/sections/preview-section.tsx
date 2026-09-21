"use client";

/**
 * Preview — everything the filing contains, twice over.
 *
 * "Synopsis" is the readable summary, one card per section with an Edit affordance that
 * opens a read-only panel beside the source document it came from. "Court document" is the
 * same filing as the court will receive it (shared with Sign — see ./preview/court-document).
 */

import * as React from "react";
import Link from "next/link";
import {
  CheckIcon,
  FileTextIcon,
  PencilLineIcon,
  PrinterIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { formatBytes, useFilePreview } from "@/lib/filing/files";
import { joinDot } from "@/lib/filing/format";
import { CASE_TYPE, COURT } from "@/lib/filing/options";
import { intakeSlots, sectionComplete } from "@/lib/filing/selectors";
import { neighbours, type StepId } from "@/lib/filing/steps";
import { useFiling } from "@/lib/filing/store";
import type { FilingDraft, IntakeDocType, StoredFileRef } from "@/lib/filing/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilingFooter } from "@/components/filing/filing-footer";
import { FilingPageHeader } from "@/components/filing/filing-page-header";
import { FilingMain } from "@/components/filing/filing-shell";
import { FormCard } from "@/components/filing/form-card";
import { CourtDocument } from "@/components/filing/sections/preview/court-document";
import {
  INTERIM_RELIEF_SUMMARY,
  NOT_PROVIDED,
  accusedSummaries,
  adrLabel,
  advocateSummaries,
  amountClaimedText,
  chequeSummaries,
  complainantSummary,
  documentSummary,
  finalReliefSummary,
  jurisdictionSummary,
  noticeSummary,
  totalChequeText,
  witnessSummaries,
} from "@/components/filing/sections/preview/derive";

/* ───────────────────────────── Key-value rows ──────────────────────── */

type Row = { term: string; value: React.ReactNode };

function KeyValues({ rows }: { rows: Row[] }) {
  return (
    <DescriptionList>
      {rows.map((r, i) => (
        /* Phone: the label over its value, the way every fact on a phone card reads in
           this product. Side by side, a 7rem label column left an address five lines
           of a 150px column. From `sm` up the two columns stand as designed. */
        <DescriptionRow
          key={`${r.term}-${i}`}
          className="max-sm:grid-cols-1 max-sm:gap-0.5 max-sm:border-hairline max-sm:py-2.5"
        >
          <DescriptionTerm className="text-body-compact text-muted-foreground max-sm:text-caption">
            {r.term}
          </DescriptionTerm>
          <DescriptionDetails className="text-body-compact font-medium text-foreground tabular-nums">
            {r.value}
          </DescriptionDetails>
        </DescriptionRow>
      ))}
    </DescriptionList>
  );
}

/** A named sub-record inside a card — "Advocate 1", "Cheque 2". */
function SubBlock({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption font-medium text-muted-foreground">{title}</p>
      <KeyValues rows={rows} />
    </div>
  );
}

/** Opens the read-only panel for a section. Changing anything happens in the section. */
function ReviewButton({ section, onClick }: { section: string; onClick: () => void }) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onClick} className="max-sm:hidden">
        <PencilLineIcon data-icon="inline-start" aria-hidden />
        Review
        <span className="sr-only"> {section}</span>
      </Button>
      {/* Phone: the DS small button, so a long section title keeps its line. */}
      <Button type="button" variant="outline" size="sm" onClick={onClick} className="sm:hidden">
        <PencilLineIcon data-icon="inline-start" aria-hidden />
        Review
        <span className="sr-only"> {section}</span>
      </Button>
    </>
  );
}

/**
 * Whether a section has everything the court needs, said once per card. Only the
 * unfinished ones take colour — nine green ticks would drown the one status that matters.
 */
function SectionState({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="flex items-center gap-1 text-caption font-medium text-muted-foreground">
      <CheckIcon className="size-3.5" aria-hidden />
      Complete
    </span>
  ) : (
    <span className="flex items-center gap-1 text-caption font-medium text-warning-ink">
      <TriangleAlertIcon className="size-3.5" aria-hidden />
      Incomplete
    </span>
  );
}

/** The status marker and the Review control as one action cluster in the card header. */
function CardActions({
  complete,
  section,
  onEdit,
}: {
  complete: boolean;
  section: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <SectionState complete={complete} />
      <ReviewButton section={section} onClick={onEdit} />
    </div>
  );
}

/* ───────────────────────────── Edit panel data ─────────────────────── */

type PanelKey =
  | "complainant"
  | "advocate"
  | "accused"
  | "cheque"
  | "demand"
  | "jurisdiction"
  | "adr"
  | "witnesses"
  | "documents";

/** An upload from Case documents that backs this section. */
type PanelFile = { key: string; label: string; file: StoredFileRef };

type EditPanel = {
  title: string;
  step: StepId;
  /** What was actually entered — rows the person has not filled are left out. */
  fields: { label: string; value: string }[];
  /** The uploads this section was read from, as they were uploaded. */
  files: PanelFile[];
  /** Shown instead of files when this section has no document behind it. */
  noSourceText?: string;
};

/** Drop the rows that would only say "Not provided" — an empty panel says that once. */
function entered(rows: { label: string; value: string }[]) {
  return rows.filter((r) => r.value.trim() && r.value !== NOT_PROVIDED);
}

/** The panel behind each card's Edit — what was entered, beside what it was read from. */
function buildPanels(draft: FilingDraft): Record<PanelKey, EditPanel> {
  const complainant = complainantSummary(draft.complainants[0]);
  const advocates = advocateSummaries(draft);
  const accused = accusedSummaries(draft);
  const cheques = chequeSummaries(draft);
  const notice = noticeSummary(draft.notices[0]);
  const jurisdiction = jurisdictionSummary(draft);
  const witnesses = witnessSummaries(draft);
  const documents = documentSummary(draft);

  /** Every upload of the given kinds, in intake order — labels are the slots' own. */
  const uploads = (...types: IntakeDocType[]): PanelFile[] =>
    intakeSlots(draft.intake).flatMap((s) =>
      s.file && types.includes(s.docType)
        ? [{ key: s.key, label: s.label, file: s.file }]
        : []
    );

  return {
    complainant: {
      title: "Complainant",
      step: "complainant",
      fields: entered([
        { label: "Name", value: complainant.name },
        { label: "Type", value: complainant.type },
        { label: "Mobile", value: complainant.mobile },
        { label: "Email", value: complainant.email },
        { label: "Present address", value: complainant.presentAddress },
        { label: "Permanent address", value: complainant.permanentAddress },
        { label: "Power of attorney", value: complainant.poa },
      ]),
      files: uploads("id-proof", "poa"),
    },
    advocate: {
      title: "Advocates",
      step: "advocate",
      fields: entered(
        advocates.flatMap((a) => [
          { label: a.label, value: a.nameWithBar },
          { label: "Appearing for", value: a.appearingFor },
        ])
      ),
      files: uploads("vakalatnama"),
    },
    accused: {
      title: "Accused",
      step: "accused",
      fields: entered(
        accused.flatMap((a) => [
          { label: a.label, value: joinDot(a.name, a.type) },
          { label: "Address", value: a.address },
        ])
      ),
      files: uploads("cheque-front"),
    },
    cheque: {
      title: "Cheque & return memo",
      step: "cheque",
      fields: entered(
        cheques.flatMap((c) => [
          { label: c.label, value: joinDot(c.amount, c.number) },
          { label: "Drawer’s bank", value: c.drawerBank },
          { label: "Returned", value: c.returned },
        ])
      ),
      files: uploads("cheque-front", "return-memo"),
    },
    demand: {
      title: "Demand notice & debt",
      step: "demand-notice",
      fields: entered([
        { label: "Nature of debt", value: notice.nature },
        { label: "Dispatched", value: notice.dispatched },
        { label: "Delivered", value: notice.delivered },
        { label: "Payment received", value: notice.payment },
        // Statutory, not entered: S-138 gives the drawer 15 days from the notice.
        { label: "Demand", value: "Pay within 15 days" },
      ]),
      files: uploads("demand-notice", "dispatch-proof", "delivery-proof", "notice-reply"),
    },
    jurisdiction: {
      title: "Jurisdiction & limitation",
      step: "jurisdiction",
      fields: entered([
        { label: "Cheque presented by", value: jurisdiction.presentedBy },
        { label: "Bank", value: jurisdiction.bank },
        { label: "IFSC", value: jurisdiction.ifsc },
        { label: "Police station", value: jurisdiction.police },
        { label: "Cause of action", value: jurisdiction.causeDate },
        { label: "Complaint filing", value: jurisdiction.filingDate },
      ]),
      files: uploads("return-memo"),
    },
    adr: {
      title: "ADR, other details & prayer",
      step: "adr-prayer",
      fields: entered([
        { label: "Open to settlement (ADR)", value: adrLabel(draft) },
        { label: "Interim relief", value: INTERIM_RELIEF_SUMMARY },
        { label: "Final relief", value: finalReliefSummary(draft) },
      ]),
      files: [],
      noSourceText:
        "Drafted from your case. There is no uploaded source document for this section.",
    },
    witnesses: {
      title: "Witnesses",
      step: "witnesses",
      fields: entered(
        witnesses.flatMap((w) => [
          { label: w.label, value: w.name },
          { label: "Will prove", value: w.prove },
        ])
      ),
      files: [],
      noSourceText: "Witness details are entered by hand. There is no source document.",
    },
    documents: {
      title: "Documents",
      step: "documents",
      fields: entered([
        {
          label: "Uploaded",
          value: documents.uploaded.length
            ? `${documents.uploaded.length} of ${documents.total} required documents attached`
            : "Nothing attached yet",
        },
        {
          label: "Pending",
          value: documents.remaining
            ? `${documents.remaining} required document${documents.remaining === 1 ? "" : "s"} still to upload`
            : "All required documents uploaded",
        },
      ]),
      files: uploads(
        "cheque-front",
        "return-memo",
        "demand-notice",
        "dispatch-proof",
        "delivery-proof",
        "notice-reply",
        "id-proof",
        "poa",
        "vakalatnama",
        "supporting",
        "other"
      ),
      noSourceText: "Manage files in the Documents section.",
    },
  };
}

/* ───────────────────────────── Source files ────────────────────────── */

/**
 * One uploaded file in the edit panel — the page itself as a thumbnail, not an icon
 * standing in for it. PDFs render their first page (see `useFilePreview`).
 */
function SourceFile({ item }: { item: PanelFile }) {
  const preview = useFilePreview(item.file);
  const imageUrl = preview.status === "ready" ? preview.imageUrl : null;
  const size = formatBytes(item.file.size);

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-muted-foreground">
        {preview.status === "loading" ? (
          <Skeleton className="size-full rounded-md" />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <FileTextIcon className="size-5" aria-hidden />
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body-compact font-medium text-foreground">{item.label}</span>
        <span className="truncate text-caption text-muted-foreground">
          {item.file.name}
          {size ? ` · ${size}` : ""}
        </span>
      </span>
    </li>
  );
}

/* ───────────────────────────── Screen ──────────────────────────────── */

export function PreviewSection() {
  const { draft, hrefFor } = useFiling();
  const { prev, next } = neighbours("preview");
  const [view, setView] = React.useState("synopsis");
  const [editKey, setEditKey] = React.useState<PanelKey | null>(null);

  const complainant = complainantSummary(draft.complainants[0]);
  const advocates = advocateSummaries(draft);
  const accused = accusedSummaries(draft);
  const cheques = chequeSummaries(draft);
  const notice = noticeSummary(draft.notices[0]);
  const jurisdiction = jurisdictionSummary(draft);
  const witnesses = witnessSummaries(draft);
  const documents = documentSummary(draft);

  const panels = buildPanels(draft);
  const panel = editKey ? panels[editKey] : null;

  // Completeness per section, from the same rule the sidebar counts with.
  const done = (key: PanelKey) => sectionComplete(draft, panels[key].step);
  const readyToSign = sectionComplete(draft, "preview");
  const outstanding = (Object.keys(panels) as PanelKey[]).filter((k) => !done(k)).length;

  /** The browser's print dialog — which is also how a PDF is saved. */
  const printFile = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <>
      <FilingMain>
        <FilingPageHeader
          title="Preview"
          description={
            <>
              Check everything you have filed. Use{" "}
              <strong className="font-semibold text-foreground">Review</strong> on any
              section to see what it holds, and open the full section to change it.
            </>
          }
        />

        <Tabs value={view} onValueChange={setView} className="gap-6">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-hairline pb-2">
            <TabsList variant="line" aria-label="Preview format">
              <TabsTrigger value="synopsis">Synopsis</TabsTrigger>
              <TabsTrigger value="document">Court document</TabsTrigger>
            </TabsList>
            <Button type="button" variant="outline" size="sm" onClick={printFile}>
              <PrinterIcon data-icon="inline-start" aria-hidden />
              Print or save as PDF
            </Button>
          </div>

          {/* ── Synopsis ── */}
          <TabsContent value="synopsis" className="flex flex-col gap-6">
            {/* No status badge here: the card captions below say it per section, and the
                footer says it once for the filing. */}
            <FormCard title="Filing summary">
              <KeyValues
                rows={[
                  { term: "Offence", value: CASE_TYPE.offence },
                  { term: "Court", value: COURT.name },
                  { term: "Total cheque amount", value: totalChequeText(draft) },
                  { term: "Amount claimed", value: amountClaimedText(draft) },
                ]}
              />
            </FormCard>

            <FormCard
              title="Complainant"
              action={
                <CardActions
                  complete={done("complainant")}
                  section="complainant"
                  onEdit={() => setEditKey("complainant")}
                />
              }
            >
              <KeyValues
                rows={[
                  { term: "Name", value: complainant.name },
                  { term: "Type", value: complainant.type },
                  { term: "Mobile", value: complainant.mobile },
                  { term: "Email", value: complainant.email },
                  { term: "Present address", value: complainant.presentAddress },
                  { term: "Permanent address", value: complainant.permanentAddress },
                  { term: "Power of attorney", value: complainant.poa },
                ]}
              />
            </FormCard>

            <FormCard
              title="Advocates"
              action={
                <CardActions
                  complete={done("advocate")}
                  section="advocates"
                  onEdit={() => setEditKey("advocate")}
                />
              }
            >
              {advocates.length ? (
                advocates.map((a) => (
                  <SubBlock
                    key={a.key}
                    title={a.label}
                    rows={[
                      { term: "Name", value: a.name },
                      { term: "Bar registration", value: a.bar },
                      { term: "Appearing for", value: a.appearingFor },
                    ]}
                  />
                ))
              ) : (
                <p className="text-body-compact text-muted-foreground">
                  No advocate added. The complainant appears as a party in person.
                </p>
              )}
            </FormCard>

            <FormCard
              title="Accused"
              action={
                <CardActions
                  complete={done("accused")}
                  section="accused"
                  onEdit={() => setEditKey("accused")}
                />
              }
            >
              {accused.map((a) => (
                <SubBlock
                  key={a.key}
                  title={a.label}
                  rows={[
                    { term: "Name", value: a.name },
                    { term: "Type", value: a.type },
                    { term: "Address", value: a.addressWithPolice },
                  ]}
                />
              ))}
            </FormCard>

            <FormCard
              title="Cheque & return memo"
              action={
                <CardActions
                  complete={done("cheque")}
                  section="cheque and return memo"
                  onEdit={() => setEditKey("cheque")}
                />
              }
            >
              {cheques.map((c) => (
                <SubBlock
                  key={c.key}
                  title={c.label}
                  rows={[
                    { term: "Amount", value: c.amount },
                    { term: "Cheque no. / date", value: c.numberAndDate },
                    { term: "Drawer’s bank", value: c.drawerBank },
                    { term: "Returned", value: c.returned },
                  ]}
                />
              ))}
            </FormCard>

            <FormCard
              title="Demand notice & debt"
              action={
                <CardActions
                  complete={done("demand")}
                  section="demand notice and debt"
                  onEdit={() => setEditKey("demand")}
                />
              }
            >
              <KeyValues
                rows={[
                  { term: "Nature of debt", value: notice.nature },
                  { term: "Notice dispatched", value: notice.dispatched },
                  { term: "Delivered", value: notice.delivered },
                  { term: "Reply received", value: notice.replied },
                  { term: "Payment received", value: notice.payment },
                ]}
              />
            </FormCard>

            <FormCard
              title="Jurisdiction & limitation"
              action={
                <CardActions
                  complete={done("jurisdiction")}
                  section="jurisdiction and limitation"
                  onEdit={() => setEditKey("jurisdiction")}
                />
              }
            >
              <KeyValues
                rows={[
                  { term: "Cheque presented by", value: jurisdiction.presentedBy },
                  { term: "Police station", value: jurisdiction.police },
                  { term: "Cause of action", value: jurisdiction.causeDate },
                  { term: "Complaint filing date", value: jurisdiction.filingDate },
                  {
                    term: "Within limitation",
                    value: jurisdiction.inTime ? (
                      <Badge variant="success">
                        <CheckIcon aria-hidden />
                        Yes, in time
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <TriangleAlertIcon aria-hidden />
                        {jurisdiction.delayText}
                      </Badge>
                    ),
                  },
                ]}
              />
            </FormCard>

            <FormCard
              title="ADR, other details & prayer"
              action={
                <CardActions
                  complete={done("adr")}
                  section="ADR, other details and prayer"
                  onEdit={() => setEditKey("adr")}
                />
              }
            >
              <KeyValues
                rows={[
                  { term: "Open to settlement (ADR)", value: adrLabel(draft) },
                  { term: "Interim relief", value: INTERIM_RELIEF_SUMMARY },
                  { term: "Final relief", value: finalReliefSummary(draft) },
                ]}
              />
            </FormCard>

            <FormCard
              title="Witnesses"
              action={
                <CardActions
                  complete={done("witnesses")}
                  section="witnesses"
                  onEdit={() => setEditKey("witnesses")}
                />
              }
            >
              {witnesses.map((w) => (
                <SubBlock
                  key={w.key}
                  title={w.label}
                  rows={[
                    { term: w.term, value: w.name },
                    { term: "Will prove", value: w.prove },
                  ]}
                />
              ))}
            </FormCard>

            <FormCard
              title="Documents"
              action={
                <CardActions
                  complete={done("documents")}
                  section="documents"
                  onEdit={() => setEditKey("documents")}
                />
              }
              contentClassName="gap-0"
            >
              {documents.lines.map((line, i) => (
                <p
                  key={i}
                  className="flex items-start gap-3 border-b border-hairline py-3 text-body-compact last:border-b-0"
                >
                  <span className="flex h-5 shrink-0 items-center">
                    <CheckIcon className="size-4 text-success-ink" aria-hidden />
                  </span>
                  {line}
                </p>
              ))}
              {documents.remaining ? (
                <p className="flex items-start gap-3 border-t border-hairline py-3 text-body-compact">
                  <span className="flex h-5 shrink-0 items-center">
                    <TriangleAlertIcon className="size-4 text-warning-ink" aria-hidden />
                  </span>
                  {documents.remaining} required document
                  {documents.remaining === 1 ? "" : "s"} still to upload
                </p>
              ) : null}
              {!documents.lines.length && !documents.remaining ? (
                <p className="py-3 text-body-compact text-muted-foreground">
                  No documents added yet.
                </p>
              ) : null}
            </FormCard>
          </TabsContent>

          {/* ── Court document ── */}
          <TabsContent value="document">
            <CourtDocument draft={draft} />
          </TabsContent>
        </Tabs>
      </FilingMain>

      {/* Review panel — the section's details beside the document they were read from. */}
      <Sheet
        open={!!panel}
        onOpenChange={(open) => {
          if (!open) setEditKey(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="gap-1 border-b border-hairline p-6 pr-12">
            <p className="text-caption font-medium text-primary">Review section</p>
            <SheetTitle className="text-title-s font-semibold">
              {panel?.title ?? ""}
            </SheetTitle>
            <SheetDescription className="sr-only">
              What this section holds, and the documents it was read from. Open the full
              section to change it.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
            <div className="flex flex-col gap-2">
              <p className="text-caption font-medium text-muted-foreground">Details</p>
              {/* Read-only values are key-value rows, not fields dressed as disabled inputs. */}
              {panel?.fields.length ? (
                <KeyValues
                  rows={panel.fields.map((f) => ({ term: f.label, value: f.value }))}
                />
              ) : (
                <p className="text-body-compact text-muted-foreground">
                  Nothing has been filled in this section yet.
                </p>
              )}
            </div>

            {panel?.files.length ? (
              <div className="flex flex-col gap-2">
                <p className="text-caption font-medium text-muted-foreground">
                  {panel.files.length === 1 ? "Source document" : "Source documents"}
                </p>
                <ul className="flex flex-col divide-y divide-hairline">
                  {panel.files.map((f) => (
                    <SourceFile key={f.key} item={f} />
                  ))}
                </ul>
              </div>
            ) : panel ? (
              <p className="rounded-lg bg-surface-sunken p-4 text-body-compact text-muted-foreground">
                {panel.noSourceText ??
                  "Nothing has been uploaded for this section yet. You can add it in Case documents."}
              </p>
            ) : null}
          </div>

          <SheetFooter className="flex-row gap-3 border-t border-hairline p-6">
            <Button asChild variant="outline" className="flex-1">
              <Link href={panel ? hrefFor(panel.step) : "#"}>Open full section</Link>
            </Button>
            <Button type="button" onClick={() => setEditKey(null)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FilingFooter
        backHref={prev ? hrefFor(prev) : undefined}
        continueHref={next ? hrefFor(next) : undefined}
        continueLabel="Continue to sign"
        showSaveState={false}
        status={
          readyToSign ? (
            <span className="inline-flex items-center gap-2 text-body-compact text-success-ink">
              <CheckIcon className="size-4" aria-hidden />
              Reviewed
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-body-compact text-muted-foreground">
              <TriangleAlertIcon className="size-4" aria-hidden />
              {outstanding} section{outstanding === 1 ? "" : "s"} incomplete
            </span>
          )
        }
      />
    </>
  );
}
