"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HourglassIcon, UserIcon } from "lucide-react";

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
import { Identifier } from "@/components/chrome/identifier";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { useBackCloses, useFlowWindow } from "@/components/chrome/flow-window";
import {
  PAGE_BACK_COLUMN,
  PAGE_BACK_ROW,
  PageBackButton,
} from "@/components/shell/page-back-button";
import { PAGE_TITLE } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Skeleton } from "@/components/ui/skeleton";
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
  attachedFileNames,
  decodeDraft,
  encodeDraft,
  lostAttachments,
} from "@/lib/applications/form-codec";
import {
  canCreate,
  canSign,
  pay,
  proceedToSign,
  sign,
  typeAvailable,
  type FilerSeat,
  type LifecycleApplication,
} from "@/lib/applications/lifecycle";
import {
  allotTemporaryId,
  applyStep,
  createDraft,
  liveFormOf,
  linkObjection,
  saveForm,
  seatOnCase,
  today,
  useApplicationsReady,
  useLifecycleApplications,
  useSandboxSeat,
} from "@/lib/applications/store";
import { seatPersonName } from "@/lib/applications/seat-names";
import { viewerRepresentation } from "@/lib/cases/viewer";
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
  liveDraftId,
  objectionToId,
  backHref,
}: {
  record: CaseRecord;
  /** A saved draft reopened from the register; null starts a new filing. */
  resume?: Submission | null;
  /** A draft raised in this browser, from the applications store. */
  liveDraftId?: string;
  /** Filing an objection from a File objection task: the application it answers. */
  objectionToId?: string;
  /** Set when the filer came from the rail's case list; absent, back is the case. */
  backHref?: string;
}) {
  const apps = useLifecycleApplications();
  const ready = useApplicationsReady();
  const seat = seatOnCase(useSandboxSeat(), viewerRepresentation(record)[0]);
  /* The store is this browser's, so the server cannot resolve a live draft. Wait
     for the client's read rather than opening a blank form over a saved one. */
  if ((liveDraftId || objectionToId) && !ready) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only" role="status">
          Loading the application
        </span>
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  const live = liveDraftId
    ? apps.find((app) => app.id === liveDraftId && app.caseId === record.id)
    : undefined;
  const objectionTo = objectionToId
    ? apps.find((app) => app.id === objectionToId && app.caseId === record.id)
    : undefined;
  return (
    <RaiseApplicationFlow
      key={`${live?.id ?? "new"}-${objectionTo?.id ?? ""}-${seat.side}-${seat.role}`}
      record={record}
      resume={resume}
      live={live?.status === "draft" ? live : undefined}
      objectionTo={objectionTo}
      seat={seat}
      backHref={backHref}
    />
  );
}

function RaiseApplicationFlow({
  record,
  resume,
  live,
  objectionTo,
  seat,
  backHref,
}: {
  record: CaseRecord;
  resume: Submission | null;
  live?: LifecycleApplication;
  objectionTo?: LifecycleApplication;
  seat: FilerSeat;
  backHref?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  /*
    A resumed draft arrives with its type already chosen, so it opens on the
    fields — asking someone to re-pick the type they picked yesterday is the
    whole reason "Continue draft" was worth wiring. The picker is still one
    click away on the Change type button.
  */
  const [draft, setDraft] = useState<ApplicationDraft>(() => {
    if (live) {
      return (liveFormOf(live.id) as ApplicationDraft | undefined) ?? decodeDraft(live.form);
    }
    if (objectionTo) return { ...EMPTY_APPLICATION_DRAFT, type: "objection" };
    return resume ? applicationDraftFrom(resume) : EMPTY_APPLICATION_DRAFT;
  });
  /* The application in the store this form writes to — created on the first save. */
  const [liveId, setLiveId] = useState<string | null>(live?.id ?? null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const filesLost = Boolean(live && !liveFormOf(live.id) && lostAttachments(live.form));
  const [errors, setErrors] = useState<ApplicationErrors>(
    EMPTY_APPLICATION_ERRORS
  );
  /** Choosing the type is step one; its fields are step two. */
  const [stage, setStage] = useState<"type" | "details">(
    (resume || live || objectionTo) && draft.type ? "details" : "type"
  );
  const [generatedOpen, setGeneratedOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  /** What the filer typed into the header search; it re-orders the cards. */
  const [query, setQuery] = useState("");
  /* Some types are cards without a form yet: the details step shows a notice,
     never the fields, and never a Generate button. */
  const unbuilt = draft.type !== "" && isUnbuiltApplicationType(draft.type);
  const chosen = applicationTypeGuide(
    draft.type || "application-others"
  );
  const caseHref = caseSectionHref(record.id, "applications");
  const filerName = seatPersonName(record, seat);
  const hearingScheduled = Boolean(record.nextHearing) && !record.disposal;
  const available = useCallback(
    (type: ApplicationTypeId) =>
      typeAvailable(type, { side: seat.side, hearingScheduled }),
    [seat.side, hearingScheduled]
  );

  /**
   * Write the form to the store: a new draft on the first save, the same one after.
   * Every later step — sign, pay — acts on the id this returns.
   */
  function persist(current: ApplicationDraft = draft): string {
    const typeLabel = applicationTypeGuide(
      (current.type || "application-others") as ApplicationTypeId
    ).label;
    const patch = {
      form: encodeDraft(current),
      documents: attachedFileNames(current),
      type: current.type || "application-others",
      typeLabel,
    };
    if (liveId) {
      saveForm(liveId, patch, current);
      return liveId;
    }
    const id = createDraft(
      {
        ...patch,
        caseId: record.id,
        side: seat.side,
        createdBy: seat.role,
        createdByName: filerName,
        onBehalfOf: record.parties[seat.side],
        objectionToId: objectionTo?.id,
      },
      current
    );
    setLiveId(id);
    return id;
  }

  function saveDraft() {
    persist();
    setSavedNote(`Draft saved ${formatCaseDate(new Date().toISOString())}`);
  }

  const onSigned = useCallback(() => {
    if (!liveId) return;
    applyStep(liveId, (app) => sign(app, seat, filerName, today()));
  }, [liveId, seat, filerName]);

  function onPay(): string | null {
    if (!liveId) return null;
    const temporaryId = allotTemporaryId(record.caseNumber);
    const result = applyStep(liveId, (app) => pay(app, seat, temporaryId, today()));
    if (!result.ok) return null;
    if (objectionTo) linkObjection(liveId, objectionTo.id);
    return temporaryId;
  }
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
    /* An objection has no chooser to return to — it was opened from its task. */
    if (objectionTo) {
      router.push(caseHref);
      return;
    }
    setLiveId(null);
    setSavedNote(null);
    setDiscardOpen(false);
    setDraft(EMPTY_APPLICATION_DRAFT);
    setErrors(EMPTY_APPLICATION_ERRORS);
    setStage("type");
  }

  /* A saved draft is kept, not discarded: closing it saves what is on screen. */
  function requestCloseForm() {
    if (liveId) {
      persist();
      closeForm();
    } else if (typedAnything) setDiscardOpen(true);
    else closeForm();
  }

  /* One dialog at a time, as the signing chain already works: the form steps
     aside for the generated document and returns if that is closed. */
  const formOpen = stage === "details" && !generatedOpen && !signatureOpen;

  /* On a phone the form is a window that slides in, and the phone's own Back
     is its Cancel: it meets the same discard warning. The later steps (the
     generated document, signing) each step back to the one before. */
  const flow = useFlowWindow();
  useBackCloses(flow.phone && stage === "details", () => {
    if (discardOpen) setDiscardOpen(false);
    else if (signatureOpen) {
      setSignatureOpen(false);
      setGeneratedOpen(true);
    } else if (generatedOpen) setGeneratedOpen(false);
    else requestCloseForm();
  });
  const formTitle =
    draft.type === "objection"
      ? "Objection"
      : draft.type === "application-others"
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
            <div className={PAGE_BACK_ROW}>
              <div className={PAGE_BACK_COLUMN}>
                <PageBackButton
                  href={backHref ?? caseHref}
                  label={backHref ? "Back to cases list" : "Back to case"}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                {/* Not "Raise application" again: reached from the rail, the page
                    before this one already carries that name (owner, Sept 21). */}
                <h1 className={cn(PAGE_TITLE, "flex min-h-8 items-center")}>
                  Choose application type
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

        {canCreate(seat) ? (
          <ApplicationTypePicker
            value=""
            query={query}
            suggested={suggestedApplicationTypes(
              record.stage,
              record.disposal !== undefined
            )}
            stageName={stageLabel(record.stage)}
            onChoose={chooseType}
            available={available}
          />
        ) : (
          /* "Users and actions": the advocate or party-in-person raises an
             application, or a clerk drafts it for them. A litigant or PoA holder
             pays for what is raised on their behalf. */
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-body font-semibold">
                Your advocate raises applications
              </EmptyTitle>
              <EmptyDescription>
                Anything raised on your behalf appears in the case&apos;s
                Applications tab, where you can pay its court fee.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
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
        <FlowDialogContent
        ownBack
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
              {resume || liveId ? <Badge variant="warning">Draft</Badge> : null}
            </div>
            <DialogDescription className="text-pretty">
              {chosen.description}
            </DialogDescription>
            <p className="text-caption text-muted-foreground">
              <Identifier value={record.caseNumber} label="case number" />
              <span aria-hidden> · </span>
              {partiesLabel(record)}
              {resume ? ` · Started ${formatCaseDate(resume.addedOn)}` : null}
              {live ? ` · Started ${formatCaseDate(live.createdOn)}` : null}
            </p>
            {objectionTo ? (
              <p className="text-body-compact text-foreground">
                Objecting to {objectionTo.typeLabel.toLowerCase()} application{" "}
                {objectionTo.applicationNumber ? (
                  <Identifier
                    value={objectionTo.applicationNumber}
                    label="application number"
                  />
                ) : null}
              </p>
            ) : null}
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
              {filesLost ? (
                <Banner variant="warning" className="mb-6">
                  Attachments are not kept between visits in this prototype.
                  Add them again before you generate the application.
                </Banner>
              ) : null}
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
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                {savedNote ? (
                  <p
                    role="status"
                    className="text-caption text-muted-foreground tabular-nums sm:mr-2"
                  >
                    {savedNote}
                  </p>
                ) : null}
                <Button type="button" variant="outline" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button type="submit" form={formId}>
                  {draft.type === "objection" ? "Generate objection" : "Generate application"}
                </Button>
              </div>
            )}
          </footer>
        </FlowDialogContent>
      </Dialog>

      <GeneratedApplicationDialog
        open={generatedOpen}
        onOpenChange={setGeneratedOpen}
        draft={draft}
        record={record}
        side={seat.side}
        onAddSignature={() => {
          // Draft → Pending signature: the form is final from here.
          const id = persist();
          applyStep(id, (app) =>
            app.status === "draft" ? proceedToSign(app, today()) : app
          );
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
        side={seat.side}
        canSign={canSign(seat)}
        onSigned={onSigned}
        onPay={onPay}
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

