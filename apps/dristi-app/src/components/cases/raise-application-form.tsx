"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, HourglassIcon } from "lucide-react";

import { AddSignatureDialog } from "@/components/cases/add-signature-dialog";
import {
  ApplicationTypeFields,
  type FieldActions,
} from "@/components/cases/application-type-fields";
import {
  ApplicationTypePicker,
  ApplicationTypeSearch,
} from "@/components/cases/application-type-picker";
import {
  DiscardFilingDialog,
  focusFirstInvalid,
  useDraftExit,
} from "@/components/cases/filing-form-shared";
import { GeneratedApplicationDialog } from "@/components/cases/generated-application-dialog";
import { BailApplicationDialog } from "@/components/filing/bail-application-dialog";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Identifier } from "@/components/chrome/identifier";
import { useLocale } from "@/components/shell/locale";
import { PAGE_TITLE } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  applicationTypeGuide,
  suggestedApplicationTypes,
} from "@/lib/cases/application-type-guide";
import {
  EMPTY_APPLICATION_DRAFT,
  EMPTY_APPLICATION_ERRORS,
  applicationDraftFrom,
  hasApplicationErrors,
  isApplicationDirty,
  validateApplication,
  type ApplicationDraft,
  type ApplicationErrors,
} from "@/lib/cases/application-draft";
import {
  isUnbuiltApplicationType,
  type ApplicationTypeId,
  type Submission,
} from "@/lib/cases/applications";
import { caseSectionHref } from "@/lib/cases/sections";
import {
  formatCaseDate,
  partiesLabel,
  stageLabel,
  type CaseRecord,
} from "@/lib/cases/types";
import { cn } from "@/lib/utils";

/**
 * Raise application.
 *
 * Submission type is gone: the portal only carried it because one form served
 * both applications and document submissions, and Dristi already splits those
 * into two entry points off Make filings. What is left is the choice that
 * actually branches the form — the application type.
 *
 * Two steps, because they are two different jobs. Choosing the type is a
 * decision: the types are cards that say what each one asks the court for,
 * led by what the case's stage usually calls for and searchable by name.
 * Filling the chosen type's fields is the second, and it happens in a dialog
 * over the chooser (owner, Sept 21: every type files from a modal, as bail
 * does). Closing it returns to the chooser, never to the case.
 *
 * There is no separate review step: Generate application validates the form
 * and opens the generated document, which restates every entered value as
 * the filing — the document is the review. From there the signature dialogs
 * mirror the legacy portal's chain: generated document → Add signature →
 * Upload signed document.
 */
export function RaiseApplicationForm({
  record,
  resume = null,
  backHref,
}: {
  record: CaseRecord;
  /** A saved draft reopened from the register; null starts a new filing. */
  resume?: Submission | null;
  /** Set when the filer came from the rail's case list; absent, back is the case. */
  backHref?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  /*
    A resumed draft arrives with its type already chosen, so it opens on the
    fields — asking someone to re-pick the type they picked yesterday is the
    whole reason "Continue draft" was worth wiring. The picker is still one
    click away on the Change type button.
  */
  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    resume ? applicationDraftFrom(resume) : EMPTY_APPLICATION_DRAFT
  );
  const [errors, setErrors] = useState<ApplicationErrors>(
    EMPTY_APPLICATION_ERRORS
  );
  /** Choosing the type is step one; its fields are step two. */
  const [stage, setStage] = useState<"type" | "details">(
    resume && draft.type ? "details" : "type"
  );
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  /** What the filer typed into the header search; it re-orders the cards. */
  const [query, setQuery] = useState("");
  /*
    Bail keeps its own staged dialog (petitioner, sureties, review, sign, pay):
    it opens over the chooser rather than as a second page, and it is told the
    type, so it never asks for one.
  */
  const { locale } = useLocale();
  const [bailOpen, setBailOpen] = useState(false);
  /* Some types are cards without a form yet: the details step shows a notice,
     never the fields, and never a Generate button. */
  const unbuilt = draft.type !== "" && isUnbuiltApplicationType(draft.type);
  const chosen = applicationTypeGuide(
    draft.type || "application-others"
  );
  const caseHref = caseSectionHref(record.id, "applications");
  /* Anything typed, the chosen type aside: opening a form and closing it
     again untouched should not ask whether to throw work away. */
  const typedAnything = useMemo(
    () => isApplicationDirty({ ...draft, type: "" }),
    [draft]
  );
  // Only its leave-page guard is used now; every way out of the flow stays
  // on this page.
  useDraftExit(typedAnything, caseHref);

  const actions: FieldActions = {
    update(key, value) {
      setDraft((current) => ({ ...current, [key]: value }));
      setErrors((current) => ({
        ...current,
        fields: { ...current.fields, [key]: undefined },
      }));
    },
    setFieldError(key, error) {
      setErrors((current) => ({
        ...current,
        fields: { ...current.fields, [key]: error },
      }));
    },
    updateSurety(id, patch) {
      setDraft((current) => ({
        ...current,
        sureties: current.sureties.map((surety) =>
          surety.id === id ? { ...surety, ...patch } : surety
        ),
      }));
      setErrors((current) => clearRow(current, "sureties", id));
    },
    setSuretyError(id, field, error) {
      setErrors((current) => ({
        ...current,
        sureties: {
          ...current.sureties,
          [id]: { ...current.sureties[id], [field]: error },
        },
      }));
    },
    updateRow(listKey, id, patch) {
      setDraft((current) => ({
        ...current,
        [listKey]: current[listKey].map((row) =>
          row.id === id ? { ...row, ...patch } : row
        ),
      }));
      setErrors((current) => clearRow(current, "documentRows", id));
    },
    setRowError(id, field, error) {
      setErrors((current) => ({
        ...current,
        documentRows: {
          ...current.documentRows,
          [id]: { ...current.documentRows[id], [field]: error },
        },
      }));
    },
  };

  /**
   * Choosing is what moves you on — a chosen type with a Next button beside it
   * asks the same question twice.
   *
   * Switching type keeps what was already typed: the other type's fields are
   * simply not validated, reviewed or filed. Comparing two forms should not
   * cost the work you did in the first.
   */
  function chooseType(type: ApplicationTypeId) {
    if (type === "bail") {
      setBailOpen(true);
      return;
    }
    actions.update("type", type);
    setStage("details");
  }

  /** The generated document only opens on a clean form — errors surface in place first. */
  function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateApplication(draft);
    setErrors(nextErrors);
    if (hasApplicationErrors(nextErrors)) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setGeneratedOpen(true);
  }

  function returnFocusToGenerate() {
    // The button lives in the dialog's footer, tied to the form by id.
    document
      .querySelector<HTMLElement>(`button[form="${CSS.escape(formId)}"]`)
      ?.focus();
  }

  const [discardOpen, setDiscardOpen] = useState(false);

  /** Back to the chooser with a clean slate. */
  function closeForm() {
    setDiscardOpen(false);
    setDraft(EMPTY_APPLICATION_DRAFT);
    setErrors(EMPTY_APPLICATION_ERRORS);
    setStage("type");
  }

  function requestCloseForm() {
    if (typedAnything) setDiscardOpen(true);
    else closeForm();
  }

  /* One dialog at a time, as the signing chain already works: the form steps
     aside for the generated document and returns if that is closed. */
  const formOpen = stage === "details" && !generatedOpen && !signatureOpen;
  const formTitle =
    draft.type === "application-others"
      ? "Other application"
      : /application$/i.test(chosen.label)
        ? chosen.label
        : `${chosen.label} application`;

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        {/* Keyed to the column, not the viewport: on a portrait tablet the rail
            is still open, and a viewport rule put the search beside a heading
            that then broke onto two lines. */}
        <header className="@container">
          <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-8">
            {/* The arrow hangs in its own column, so the case line starts on
                the heading's edge, not under the arrow. */}
            <div className="flex min-w-0 items-start gap-1">
              <div className="flex h-8 shrink-0 items-center">
                <BackButton
                  href={backHref ?? caseHref}
                  label={backHref ? "Back to cases list" : "Back to case"}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className={cn(PAGE_TITLE, "flex min-h-8 items-center")}>
                  Raise application
                </h1>
                {/* Which case this files into. Reached from the rail, nothing
                    else on the screen says so. */}
                <p className="text-body-compact text-muted-foreground">
                  <Identifier value={record.caseNumber} label="case number" />
                  <span aria-hidden> · </span>
                  {partiesLabel(record)}
                </p>
              </div>
            </div>
            <div className="w-full @2xl:w-80 @2xl:shrink-0">
              <ApplicationTypeSearch query={query} onQueryChange={setQuery} />
            </div>
          </div>
        </header>

        <ApplicationTypePicker
          value=""
          query={query}
          suggested={suggestedApplicationTypes(
            record.stage,
            record.disposal !== undefined
          )}
          stageName={stageLabel(record.stage)}
          onChoose={chooseType}
        />
      </div>

      {/*
        Every type files from a dialog over the chooser, in the shell the bail
        flow set: fixed header naming the ask and the case, a scrolling body of
        that type's fields, a sunken footer holding the two ways out.
      */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) requestCloseForm();
        }}
      >
        <ChromeDialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-4 pr-12 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-title-s font-semibold text-balance">
                {formTitle}
              </DialogTitle>
              {/* The same Draft chip the register uses, so the row you clicked
                  and the dialog you landed in are recognisably one filing. */}
              {resume ? <Badge variant="warning">Draft</Badge> : null}
            </div>
            <DialogDescription className="text-pretty">
              {chosen.description}
            </DialogDescription>
            <p className="text-caption text-muted-foreground">
              <Identifier value={record.caseNumber} label="case number" />
              <span aria-hidden> · </span>
              {partiesLabel(record)}
              {resume ? ` · Started ${formatCaseDate(resume.addedOn)}` : null}
            </p>
          </DialogHeader>

          {unbuilt ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HourglassIcon aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>This application type is coming later</EmptyTitle>
                  <EmptyDescription>
                    Close this and pick a type you can file now.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <form
              id={formId}
              ref={formRef}
              noValidate
              onSubmit={generate}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6"
            >
              <ApplicationTypeFields
                draft={draft}
                errors={errors}
                record={record}
                actions={actions}
              />
            </form>
          )}

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={requestCloseForm}>
              {unbuilt ? "Close" : "Cancel"}
            </Button>
            {unbuilt ? null : (
              <Button type="submit" form={formId}>
                Generate application
              </Button>
            )}
          </footer>
        </ChromeDialogContent>
      </Dialog>

      <GeneratedApplicationDialog
        open={generatedOpen}
        onOpenChange={setGeneratedOpen}
        draft={draft}
        record={record}
        onAddSignature={() => {
          setGeneratedOpen(false);
          setSignatureOpen(true);
        }}
        onReturnFocus={returnFocusToGenerate}
      />

      <AddSignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        draft={draft}
        record={record}
        onBack={() => {
          setSignatureOpen(false);
          setGeneratedOpen(true);
        }}
        // Finishing returns to the chooser, not the case (owner, Sept 21):
        // someone filing several applications files the next from here, and
        // the confirmation has already said where this one waits.
        onComplete={() => {
          setSignatureOpen(false);
          closeForm();
        }}
        onReturnFocus={returnFocusToGenerate}
      />

      <BailApplicationDialog
        open={bailOpen}
        // Closing, filed or not, stays on the chooser like every other type.
        onOpenChange={setBailOpen}
        accessCase={{
          id: record.id,
          title: partiesLabel(record),
          caseNumber: record.caseNumber,
          court: record.court,
          nextHearing: record.nextHearing?.on ?? "",
        }}
        locale={locale}
      />

      <DiscardFilingDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onDiscard={closeForm}
      />
    </>
  );
}

function clearRow(
  errors: ApplicationErrors,
  bucket: "sureties" | "documentRows",
  id: string
): ApplicationErrors {
  const next = { ...errors[bucket] };
  delete next[id];
  return { ...errors, [bucket]: next };
}

/**
 * View Case's own way out, the small ghost arrow, sitting ahead of the heading
 * instead of on a row of its own above it.
 */
function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            asChild
            className="relative -ml-2 text-foreground after:absolute after:-inset-1 [&_svg]:size-4"
          >
            <Link href={href} aria-label={label}>
              <ArrowLeftIcon aria-hidden />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
