"use client";

import * as React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HourglassIcon,
  InfoIcon,
  SearchIcon,
} from "lucide-react";

import { FlowDialogContent } from "@/components/chrome/flow-dialog";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentSlot } from "@/components/ui/document-slot";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaseDetails } from "@/components/join/case-details";
import { DownloadCaseFileButton } from "@/components/join/download-case-file-button";
import { pick, type Locale } from "@/lib/onboarding/content";
import {
  DEMO_JOIN_CASE,
  fill,
  joinDialog,
  summonsModal,
  type CaseParty,
  type JoinCase,
} from "@/lib/join/content";

/**
 * Post-login join-a-case dialog.
 *
 * Two entry modes, one flow:
 * · `summons` — the case is already resolved from the summons token. The dialog opens
 *   on the details stage as the auto-modal ("a case has been filed against you") and
 *   the person never types a case number.
 * · `manual` — opened from "Join an ongoing case". A lookup stage comes first.
 *
 * The legacy dialog asked five questions. Sign-in already answered litigant-vs-advocate,
 * and complainants are linked at e-filing and never join, so this asks at most three:
 * self or power of attorney, which party, and how you will appear. Per the join-flow
 * requirements (Anshumanth, Aug 7): accused through an advocate join immediately, a
 * party in person is verified once by the court, and a POA holder's request goes to
 * the magistrate — never direct access.
 */

type Stage = "lookup" | "details" | "identity" | "done";
type JoinerKind = "self" | "poa" | "";
type Appearance = "hire" | "advocate" | "self" | "";

export type JoinResult = {
  joinCase: JoinCase;
  party: CaseParty;
  kind: "self" | "poa";
  partyInPerson: boolean;
};

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JoinCaseDialog({
  open,
  onOpenChange,
  mode,
  summonsCase,
  locale,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "summons" | "manual";
  /** The case resolved from the summons token. Required in summons mode. */
  summonsCase?: JoinCase;
  locale: Locale;
  onJoined: (result: JoinResult) => void;
}) {
  const initialStage: Stage = mode === "summons" ? "details" : "lookup";
  const [stage, setStage] = React.useState<Stage>(initialStage);
  const [joinCase, setJoinCase] = React.useState<JoinCase | undefined>(summonsCase);

  const [query, setQuery] = React.useState("");
  const [queryTouched, setQueryTouched] = React.useState(false);
  const [lookupMiss, setLookupMiss] = React.useState(false);

  const [kind, setKind] = React.useState<JoinerKind>("");
  const [partyId, setPartyId] = React.useState("");
  const [appearance, setAppearance] = React.useState<Appearance>("");
  const [identityTouched, setIdentityTouched] = React.useState(false);
  const [poaFile, setPoaFile] = React.useState<File | null>(null);
  const [poaAccusedPhone, setPoaAccusedPhone] = React.useState("");
  const [poaSampleNotice, setPoaSampleNotice] = React.useState(false);
  const poaInputRef = React.useRef<HTMLInputElement>(null);

  const [doneNotice, setDoneNotice] = React.useState<"" | "case" | "bail" | "advocate">("");
  const [downloadNotice, setDownloadNotice] = React.useState(false);

  const party = joinCase?.accused.find((entry) => entry.id === partyId);
  // A duplicate self-join is blocked by the party's own account; a further PoA join
  // is blocked only by another PoA holder — the accused having joined in person does
  // not, since the party and their PoA holder both legitimately hold access.
  const blocked =
    kind === "poa" ? Boolean(party?.poaHolderJoined) : Boolean(party?.hasJoined);
  // The accused side already has an advocate on record — when so, "Add advocate" is
  // never the success action, even for someone who said they would hire one.
  const accusedAdvocateJoined = Boolean(
    joinCase?.accusedAdvocate && joinCase.accusedAdvocate !== "Not available",
  );
  // Success-modal primary action, decided by how the party said they will appear.
  const doneAction: "bail" | "advocate" | "case" =
    appearance === "self"
      ? "bail"
      : appearance === "hire" && !accusedAdvocateJoined
        ? "advocate"
        : "case";

  function reset() {
    setStage(initialStage);
    setJoinCase(summonsCase);
    setQuery("");
    setQueryTouched(false);
    setLookupMiss(false);
    setKind("");
    setPartyId("");
    setAppearance("");
    setIdentityTouched(false);
    setPoaFile(null);
    setPoaAccusedPhone("");
    setPoaSampleNotice(false);
    setDoneNotice("");
    setDownloadNotice(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function submitLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQueryTouched(true);
    const trimmed = query.trim();
    if (trimmed.length < 4) {
      setLookupMiss(false);
      return;
    }
    // Prototype lookup: a plausible number resolves to the demo case; a number with
    // no digits exercises the not-in-CIS path (cases reach the system with a lag).
    if (!/\d/.test(trimmed)) {
      setLookupMiss(true);
      return;
    }
    setLookupMiss(false);
    setJoinCase(DEMO_JOIN_CASE);
    setStage("details");
  }

  function submitIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIdentityTouched(true);
    if (!joinCase || !kind || !party || blocked) return;
    if (kind === "self" && !appearance) return;
    if (kind === "poa" && !poaFile) return;
    setStage("done");
    onJoined({
      joinCase,
      party,
      kind,
      partyInPerson: kind === "self" && appearance === "self",
    });
  }

  const isSummonsIntro = mode === "summons" && stage === "details";
  const poaPending = stage === "done" && kind === "poa";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FlowDialogContent
        lang={locale}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {stage === "done" ? (
          <DialogHeader
            className={`shrink-0 px-6 py-5 pr-14 text-left ${poaPending ? "" : "border-b border-hairline"}`}
          >
            <div className="flex items-center gap-4">
              <span
                className={
                  poaPending
                    ? "flex size-14 shrink-0 items-center justify-center rounded-full bg-info-muted text-info-muted-foreground"
                    : "flex size-14 shrink-0 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground"
                }
              >
                {poaPending ? (
                  <HourglassIcon className="size-7" aria-hidden />
                ) : (
                  <CheckCircle2Icon className="size-7" aria-hidden />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="text-title-s font-semibold text-balance">
                  {pick(
                    poaPending ? joinDialog.poaPendingTitle : joinDialog.joinedTitle,
                    locale,
                  )}
                </DialogTitle>
                <DialogDescription className="text-pretty">
                  {fill(
                    poaPending ? joinDialog.poaPendingBody : joinDialog.joinedBody,
                    locale,
                    { name: party?.name ?? "" },
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        ) : (
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-title-s font-semibold text-balance">
              {isSummonsIntro
                ? pick(summonsModal.heading, locale)
                : pick(joinDialog.title, locale)}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {isSummonsIntro
                ? pick(summonsModal.body, locale)
                : stage === "lookup"
                  ? pick(joinDialog.lookupBody, locale)
                  : stage === "details"
                    ? pick(joinDialog.detailsBody, locale)
                    : pick(joinDialog.identityBody, locale)}
            </DialogDescription>
          </DialogHeader>
        )}

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${poaPending ? "hidden" : ""}`}
        >
          {/* ------------------------------------------------------- lookup */}
          {stage === "lookup" ? (
            <form
              id="join-lookup"
              noValidate
              className="flex flex-col gap-4"
              onSubmit={submitLookup}
            >
              <Field data-invalid={queryTouched && query.trim().length < 4}>
                <FieldLabel>{pick(joinDialog.lookupLabel, locale)}</FieldLabel>
                <Input
                  autoFocus
                  value={query}
                  placeholder={pick(joinDialog.lookupPlaceholder, locale)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setQueryTouched(false);
                    setLookupMiss(false);
                  }}
                />
                <FieldError>
                  {queryTouched && query.trim().length < 4
                    ? pick(joinDialog.lookupError, locale)
                    : null}
                </FieldError>
              </Field>
              {lookupMiss ? (
                <Banner variant="warning">{pick(joinDialog.lookupMiss, locale)}</Banner>
              ) : null}
            </form>
          ) : null}

          {/* ------------------------------------------------------ details */}
          {stage === "details" && joinCase ? (
            <div className="flex flex-col gap-4">
              <CaseDetails joinCase={joinCase} locale={locale} />
              <Banner variant="info">{pick(joinDialog.acknowledgeNote, locale)}</Banner>
              {downloadNotice ? (
                <Banner variant="info">
                  {pick(joinDialog.downloadCaseFilePrototype, locale)}
                </Banner>
              ) : null}
            </div>
          ) : null}

          {/* ----------------------------------------------------- identity */}
          {stage === "identity" && joinCase ? (
            <form
              id="join-identity"
              noValidate
              className="flex flex-col gap-6"
              onSubmit={submitIdentity}
            >
              <Field data-invalid={identityTouched && !kind}>
                <FieldLabel className="block w-full text-body font-semibold leading-snug">
                  {pick(joinDialog.whoLegend, locale)}
                </FieldLabel>
                <RadioGroup
                  value={kind}
                  onValueChange={(value) => {
                    setKind(value as JoinerKind);
                    setIdentityTouched(false);
                    setAppearance("");
                  }}
                  className="flex flex-col gap-1"
                >
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="self" id="join-kind-self" />
                    <Label htmlFor="join-kind-self">
                      {pick(joinDialog.whoSelf, locale)}
                    </Label>
                  </div>
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="poa" id="join-kind-poa" />
                    <Label htmlFor="join-kind-poa">
                      {pick(joinDialog.whoPoa, locale)}
                    </Label>
                  </div>
                </RadioGroup>
                <FieldError>
                  {identityTouched && !kind
                    ? pick(joinDialog.whichError, locale)
                    : null}
                </FieldError>
                <Accordion type="single" collapsible>
                  <AccordionItem value="accused-explain" className="border-b-0">
                    <AccordionTrigger className="py-2 text-caption text-muted-foreground">
                      {pick(joinDialog.accusedExplainTitle, locale)}
                    </AccordionTrigger>
                    <AccordionContent className="text-body-compact text-muted-foreground">
                      {pick(joinDialog.accusedExplainBody, locale)}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="poa-explain" className="border-b-0">
                    <AccordionTrigger className="py-2 text-caption text-muted-foreground">
                      {pick(joinDialog.poaExplainTitle, locale)}
                    </AccordionTrigger>
                    <AccordionContent className="text-body-compact text-muted-foreground">
                      {pick(joinDialog.poaExplainBody, locale)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Field>

              {kind ? (
                <Field data-invalid={identityTouched && !partyId}>
                  <FieldLabel className="block w-full text-body font-semibold leading-snug">
                    {pick(
                      kind === "self"
                        ? joinDialog.whichSelfLabel
                        : joinDialog.whichPoaLabel,
                      locale,
                    )}
                  </FieldLabel>
                  <Select
                    value={partyId}
                    onValueChange={(value) => {
                      setPartyId(value);
                      setIdentityTouched(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={pick(joinDialog.whichPlaceholder, locale)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {joinCase.accused.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {identityTouched && !partyId
                      ? pick(joinDialog.whichError, locale)
                      : null}
                  </FieldError>
                  {party && !blocked && kind === "self" ? (
                    <FieldDescription>
                      {fill(joinDialog.mappingNote, locale, { name: party.name })}
                    </FieldDescription>
                  ) : null}
                </Field>
              ) : null}

              {party && blocked ? (
                <Banner variant="warning">
                  {fill(
                    kind === "poa" ? joinDialog.poaAlreadyTaken : joinDialog.alreadyJoined,
                    locale,
                    { name: party.name },
                  )}
                </Banner>
              ) : null}

              {kind === "self" && party && !blocked ? (
                <Field data-invalid={identityTouched && !appearance} className="gap-4">
                  <FieldLabel className="block w-full text-body font-semibold leading-snug">
                    {pick(joinDialog.appearLegend, locale)}
                  </FieldLabel>
                  <RadioGroup
                    value={appearance}
                    onValueChange={(value) => {
                      setAppearance(value as Appearance);
                      setIdentityTouched(false);
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="hire" id="join-appear-hire" className="mt-2.5" />
                      <div className="flex min-w-0 flex-col items-start gap-0.5">
                        <div className="flex min-h-10 items-center gap-1">
                          <Label htmlFor="join-appear-hire" className="text-left leading-snug">
                            {pick(joinDialog.appearHire, locale)}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm" aria-label={pick(joinDialog.findAdvocate, locale)}>
                                <InfoIcon aria-hidden />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-72">
                              <div className="flex flex-col gap-3">
                                <p className="text-body-compact text-pretty text-muted-foreground">{pick(joinDialog.findAdvocateHelp, locale)}</p>
                                <Button asChild variant="outline" size="sm" className="self-start">
                                  <a href={joinDialog.findAdvocateHref} target="_blank" rel="noreferrer">
                                    {pick(joinDialog.openBarCouncil, locale)}
                                    <ExternalLinkIcon data-icon="inline-end" aria-hidden />
                                  </a>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Label htmlFor="join-appear-hire" className="text-caption font-normal text-muted-foreground">
                          {pick(joinDialog.appearHireHint, locale)}
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem
                        value="advocate"
                        id="join-appear-advocate"
                        className="mt-2.5"
                      />
                      <Label
                        htmlFor="join-appear-advocate"
                        className="flex min-h-10 flex-col items-start justify-center gap-0.5 text-left leading-snug"
                      >
                        {pick(joinDialog.appearAdvocate, locale)}
                        <span className="text-caption font-normal text-muted-foreground">
                          {pick(joinDialog.appearAdvocateHint, locale)}
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem
                        value="self"
                        id="join-appear-self"
                        className="mt-2.5"
                      />
                      <Label
                        htmlFor="join-appear-self"
                        className="flex min-h-10 flex-col items-start justify-center gap-0.5 text-left leading-snug"
                      >
                        {pick(joinDialog.appearSelf, locale)}
                        <span className="text-caption font-normal text-muted-foreground">
                          {pick(joinDialog.appearSelfHint, locale)}
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                  <FieldError>
                    {identityTouched && !appearance
                      ? pick(joinDialog.appearError, locale)
                      : null}
                  </FieldError>
                </Field>
              ) : null}

              {kind === "poa" && party && !blocked ? (
                <>
                  <Field data-invalid={identityTouched && !poaFile}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <FieldLabel>{pick(joinDialog.poaDocLabel, locale)}</FieldLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={pick(joinDialog.poaDocTooltipLabel, locale)}
                            >
                              <InfoIcon aria-hidden />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72">
                            <p className="text-body-compact text-pretty text-muted-foreground">
                              {pick(joinDialog.poaDocTooltip, locale)}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto shrink-0 p-0"
                        onClick={() => setPoaSampleNotice(true)}
                        data-icon="inline-start"
                      >
                        <DownloadIcon aria-hidden />
                        {pick(joinDialog.poaDocSample, locale)}
                      </Button>
                    </div>
                    <input
                      ref={poaInputRef}
                      type="file"
                      className="hidden"
                      tabIndex={-1}
                      aria-hidden="true"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setPoaFile(file);
                          setIdentityTouched(false);
                        }
                      }}
                    />
                    <DocumentSlot
                      status={poaFile ? "filled" : "empty"}
                      media="icon"
                      label={pick(joinDialog.poaDocLabel, locale)}
                      required
                      filename={poaFile?.name}
                      meta={poaFile ? fileSize(poaFile.size) : undefined}
                      thumbnail={<FileTextIcon className="size-5" aria-hidden />}
                      onChooseFile={() => poaInputRef.current?.click()}
                      copy={{
                        optional: locale === "ml" ? "നിർബന്ധമല്ല" : "Optional",
                        noFile:
                          locale === "ml"
                            ? "ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല"
                            : "No file chosen yet",
                        chooseFile: locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുക്കുക" : "Choose file",
                      }}
                    />
                    <FieldDescription>
                      {pick(joinDialog.poaDocHelp, locale)}
                    </FieldDescription>
                    {poaSampleNotice ? (
                      <Banner variant="info">
                        {pick(joinDialog.poaDocSamplePrototype, locale)}
                      </Banner>
                    ) : null}
                    <FieldError>
                      {identityTouched && !poaFile
                        ? pick(joinDialog.poaDocError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="join-poa-phone">
                      {pick(joinDialog.poaAccusedPhoneLabel, locale)}
                    </FieldLabel>
                    <Input
                      id="join-poa-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      value={poaAccusedPhone}
                      onChange={(event) =>
                        setPoaAccusedPhone(event.target.value.replace(/[^\d+ ]/g, ""))
                      }
                    />
                    <FieldDescription>
                      {pick(joinDialog.poaAccusedPhoneHelp, locale)}
                    </FieldDescription>
                  </Field>
                </>
              ) : null}
            </form>
          ) : null}

          {/* --------------------------------------------------------- done */}
          {stage === "done" && joinCase ? (
            <div className="flex flex-col gap-5">
              {poaPending ? null : (
                <>
                  {appearance === "self" ? (
                    <Banner variant="info">{pick(joinDialog.pipNote, locale)}</Banner>
                  ) : null}
                  <CaseDetails joinCase={joinCase} locale={locale} compact />
                </>
              )}

              {doneNotice ? (
                <Banner variant="info">
                  {pick(
                    doneNotice === "bail"
                      ? joinDialog.fileBailPrototype
                      : doneNotice === "advocate"
                        ? joinDialog.addAdvocatePrototype
                        : joinDialog.viewCasePrototype,
                    locale,
                  )}
                </Banner>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ footer */}
        <footer
          className={`flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:items-center ${poaPending ? "sm:justify-end" : "sm:justify-between"}`}
        >
          {stage === "lookup" ? (
            <>
              <span aria-hidden className="hidden sm:block" />
              <Button type="submit" form="join-lookup" data-icon="inline-start">
                <SearchIcon aria-hidden />
                {pick(joinDialog.search, locale)}
              </Button>
            </>
          ) : null}

          {stage === "details" ? (
            <>
              {mode === "manual" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage("lookup")}
                  data-icon="inline-start"
                >
                  <ArrowLeftIcon aria-hidden />
                  {pick(joinDialog.back, locale)}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {pick(summonsModal.dismiss, locale)}
                </Button>
              )}
              {/* Download sits next to the primary action as a compact icon; the label
                  rides in its hover tooltip. */}
              <div className="flex items-center gap-2">
                <DownloadCaseFileButton
                  label={pick(joinDialog.downloadCaseFile, locale)}
                  onClick={() => setDownloadNotice(true)}
                />
                {/* Stacked footer on a phone: the primary fills the row beside
                    the icon, as wide as the Back button under it. */}
                <Button
                  type="button"
                  className="flex-1 sm:flex-none"
                  onClick={() => setStage("identity")}
                  data-icon="inline-end"
                >
                  {pick(summonsModal.cta, locale)}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </div>
            </>
          ) : null}

          {stage === "identity" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage("details")}
                data-icon="inline-start"
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button
                type="submit"
                form="join-identity"
                disabled={blocked}
                data-icon="inline-end"
              >
                {pick(
                  kind === "poa" ? joinDialog.poaSubmit : joinDialog.joinSubmit,
                  locale,
                )}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "done" ? (
            poaPending || doneAction === "case" ? (
              // No further action — Back to home, then View case as the primary.
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {pick(joinDialog.backHome, locale)}
                </Button>
                {poaPending ? null : (
                  <Button
                    type="button"
                    onClick={() => setDoneNotice("case")}
                    data-icon="inline-end"
                  >
                    {pick(joinDialog.viewCase, locale)}
                    <ArrowRightIcon aria-hidden />
                  </Button>
                )}
              </>
            ) : (
              // A next step (bail / add advocate) is the primary; View case is secondary.
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDoneNotice("case")}
                >
                  {pick(joinDialog.viewCase, locale)}
                </Button>
                <Button
                  type="button"
                  onClick={() => setDoneNotice(doneAction)}
                  data-icon="inline-end"
                >
                  {pick(
                    doneAction === "bail" ? joinDialog.fileBail : joinDialog.addAdvocate,
                    locale,
                  )}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </>
            )
          ) : null}
        </footer>
      </FlowDialogContent>
    </Dialog>
  );
}
