"use client";

import * as React from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  FilePlus2Icon,
  HourglassIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  CaseDetails,
  CaseTitleWithOthers,
} from "@/components/join/case-details";
import { DownloadCaseFileButton } from "@/components/join/download-case-file-button";
import {
  DocumentPreviewDialog,
  DocumentThumbnailButton,
  useObjectUrl,
} from "@/components/document-preview";
import { VakalatnamaPicker } from "@/components/advocate/vakalatnama-picker";
import { pick, type Locale } from "@/lib/onboarding/content";
import {
  caseDetails,
  fill,
  joinDialog,
  type CaseParty,
  type JoinCase,
} from "@/lib/join/content";
import {
  advDialog,
  BAR_DIRECTORY,
  COMPLAINANT_PARTIES,
  SIDE_ADVOCATES,
  VAKALATNAMAS,
  ADVOCATE_JOIN_CASE,
} from "@/lib/advocate/content";

/**
 * Advocate join-a-case dialog.
 *
 * Same two entry modes as the litigant dialog — `summons` (unique URL scanned from a
 * client's summons; the account's number identifies an advocate, so this flavour
 * opens) and `manual` (the Join-a-case page). The legacy flow's "are you an advocate
 * or a litigant?" question is gone: sign-in answered it.
 *
 * Stages (manual): lookup → access code → details → account → representation → litigant
 * details (paged) → vakalatnama → outcome. The access code gates the case details: an
 * advocate must prove they hold the litigant's six-digit code before any case data is
 * shown. (Summons mode arrives pre-verified from the unique link, so it opens on details
 * and skips the code.) Departures from legacy, all agreed Aug 14:
 * · "Which litigant(s)" moved up to follow the side question, and is multi-select —
 *   one vakalatnama routinely covers co-accused.
 * · The replacement questions (approver, reason, document) appear only after a "yes".
 * · A not-yet-paid vakalatnama never blocks joining — the fee becomes a pending task.
 * · The vakalatnama can be picked from the portal's generated library (with preview)
 *   instead of uploaded; generation itself lives elsewhere in the portal.
 *
 * Outcomes: accused-side, no replacement → joined immediately. Complainant-side or
 * any replacement → request raised, approver must clear it.
 */

type Stage = "lookup" | "details" | "account" | "code" | "role" | "verify" | "vakalatnama" | "done";
type Side = "complainant" | "accused" | "";
type YesNo = "yes" | "no" | "";

export type AdvocateJoinResult = {
  joinCase: JoinCase;
  side: "complainant" | "accused";
  parties: CaseParty[];
  replacing: boolean;
  approver: "judge" | "advocates" | null;
  /** True when access is immediate; false when an approver must clear the request. */
  joined: boolean;
};

const CODE_LENGTH = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload slot with the app's standard uploaded-document affordances: thumbnail that
 * opens the large preview (the Add-ID pattern), plus change and remove actions.
 * Wraps its own hidden input so callers only hold the File.
 */
function UploadedDocField({
  label,
  required = false,
  file,
  onFileChange,
  locale,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  locale: Locale;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const url = useObjectUrl(file);
  const previewCopy = {
    title: pick(advDialog.docPreviewTitle, locale),
    description: pick(advDialog.docPreviewBody, locale),
    alt: pick(advDialog.docPreviewAlt, locale),
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next && next.size <= MAX_FILE_SIZE) onFileChange(next);
          // The same file can be picked again after a remove.
          event.target.value = "";
        }}
      />
      <DocumentSlot
        status={file ? "filled" : "empty"}
        media={file ? "thumbnail" : "icon"}
        label={label}
        required={required}
        filename={file?.name}
        meta={file ? fileSize(file.size) : undefined}
        thumbnail={
          file ? (
            <DocumentThumbnailButton
              file={file}
              url={url}
              locale={locale}
              onOpen={() => setPreviewOpen(true)}
              className="size-full rounded-md"
            />
          ) : undefined
        }
        onChooseFile={() => inputRef.current?.click()}
        copy={{
          optional: locale === "ml" ? "നിർബന്ധമല്ല" : "Optional",
          noFile: locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല" : "No file chosen yet",
          chooseFile: locale === "ml" ? "ഫയൽ തിരഞ്ഞെടുക്കുക" : "Choose file",
        }}
      />
      {file ? (
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => inputRef.current?.click()}
          >
            {pick(advDialog.changeFile, locale)}
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-destructive-ink"
            onClick={() => onFileChange(null)}
          >
            {pick(advDialog.removeFile, locale)}
          </Button>
        </div>
      ) : null}
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={file}
        url={url}
        locale={locale}
        copy={previewCopy}
      />
    </>
  );
}

export function AdvocateJoinCaseDialog({
  open,
  onOpenChange,
  mode,
  summonsCase,
  locale,
  onJoined,
  onJoinAsLitigant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "summons" | "manual";
  /** The case resolved from the summons token. Required in summons mode. */
  summonsCase?: JoinCase;
  locale: Locale;
  onJoined: (result: AdvocateJoinResult) => void;
  onJoinAsLitigant: () => void;
}) {
  const initialStage: Stage = mode === "summons" ? "details" : "lookup";
  const [stage, setStage] = React.useState<Stage>(initialStage);
  const [joinCase, setJoinCase] = React.useState<JoinCase | undefined>(summonsCase);

  const [query, setQuery] = React.useState("");
  const [queryTouched, setQueryTouched] = React.useState(false);
  const [lookupMiss, setLookupMiss] = React.useState(false);

  const [code, setCode] = React.useState("");
  const [codeTouched, setCodeTouched] = React.useState(false);
  const [accountRole, setAccountRole] = React.useState<"advocate" | "litigant">("advocate");
  const [switchingProfile, setSwitchingProfile] = React.useState(false);
  const switchTimerRef = React.useRef<number | null>(null);

  // Summons reach the accused side, so an advocate arriving from the unique link
  // represents an accused by default; the choice stays editable.
  const [side, setSide] = React.useState<Side>(mode === "summons" ? "accused" : "");
  const [partyIds, setPartyIds] = React.useState<string[]>([]);
  const partyAnchor = useComboboxAnchor();
  const [replacing, setReplacing] = React.useState<YesNo>("");
  const [replacedAdvocate, setReplacedAdvocate] = React.useState("");
  const [approver, setApprover] = React.useState<"judge" | "advocates" | "">("");
  const [reason, setReason] = React.useState("");
  const [supportFile, setSupportFile] = React.useState<File | null>(null);
  const [roleTouched, setRoleTouched] = React.useState(false);

  // Contact capture (only for litigants not yet on the case), keyed by party id.
  const [contacts, setContacts] = React.useState<Record<string, string>>({});
  const [verifyTouched, setVerifyTouched] = React.useState(false);

  const [vkAnother, setVkAnother] = React.useState<YesNo>("");
  const [vkCount, setVkCount] = React.useState("");
  const [vkAdvocates, setVkAdvocates] = React.useState<string[]>([]);
  const [vkAdvOpen, setVkAdvOpen] = React.useState(false);
  const vkAdvAnchor = useComboboxAnchor();
  const [vkTab, setVkTab] = React.useState<"upload" | "saved">("upload");
  const [vkFile, setVkFile] = React.useState<File | null>(null);
  const [vkSavedId, setVkSavedId] = React.useState("");
  const [vkTouched, setVkTouched] = React.useState(false);
  const [vkGenerateNotice, setVkGenerateNotice] = React.useState(false);

  const [teamPhones, setTeamPhones] = React.useState<string[]>([]);
  const [teamInvited, setTeamInvited] = React.useState<string[]>([]);
  const [teamInput, setTeamInput] = React.useState("");
  const [teamTouched, setTeamTouched] = React.useState(false);

  const [doneNotice, setDoneNotice] = React.useState<"" | "case" | "bail">("");
  const [downloadNotice, setDownloadNotice] = React.useState(false);

  const sideParties: CaseParty[] =
    side === "complainant"
      ? COMPLAINANT_PARTIES
      : side === "accused"
        ? (joinCase?.accused ?? [])
        : [];
  const sideAdvocates = side ? SIDE_ADVOCATES[side] : [];
  const selectedParties = sideParties.filter((party) => partyIds.includes(party.id));
  // Only litigants not already on the case need a contact number entered — the system
  // already holds one for anyone who has joined.
  const contactParties = selectedParties.filter((party) => !party.hasJoined);
  // A side with nobody on record leaves only the judge to approve the change; the
  // choice is made for the person rather than presented as a dead radio button.
  const judgeOnly = replacing === "yes" && sideAdvocates.length === 0;
  const effectiveApprover = judgeOnly ? "judge" : approver;

  // The "another advocate already uploaded a vakalatnama" question only makes sense
  // once some advocate is already on the case; the first advocate to join skips it.
  const otherAdvocatesOnCase =
    SIDE_ADVOCATES.complainant.length + SIDE_ADVOCATES.accused.length > 0;
  const effectiveAnother: YesNo = otherAdvocatesOnCase ? vkAnother : "no";
  // "No" (or first advocate) means this is a fresh vakalatnama the advocate names the
  // co-advocates on; "yes" means they are joining one already uploaded.
  const needsCoAdvocates = vkTab === "upload" && effectiveAnother === "no";
  const vkCountValid = /^[1-9]\d*$/.test(vkCount.trim());
  const vkCountN = vkCountValid ? Number.parseInt(vkCount.trim(), 10) : 0;
  const vkAdvAtCapacity = vkCountValid && vkAdvocates.length >= vkCountN;
  const coAdvocatesComplete = !needsCoAdvocates || (vkCountValid && vkAdvocates.length === vkCountN);

  const vkAttached = vkTab === "upload" ? Boolean(vkFile) : Boolean(vkSavedId);
  const pendingOutcome = side === "complainant" || replacing === "yes";
  const isSummonsIntro = mode === "summons" && stage === "details";
  const teamValid = teamInput.length === 10;

  React.useEffect(() => () => {
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
  }, []);

  function reset() {
    setStage(initialStage);
    setJoinCase(summonsCase);
    setQuery("");
    setQueryTouched(false);
    setLookupMiss(false);
    setCode("");
    setCodeTouched(false);
    setAccountRole("advocate");
    setSwitchingProfile(false);
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = null;
    setSide(mode === "summons" ? "accused" : "");
    setPartyIds([]);
    setReplacing("");
    setReplacedAdvocate("");
    setApprover("");
    setReason("");
    setSupportFile(null);
    setRoleTouched(false);
    setContacts({});
    setVerifyTouched(false);
    setVkAnother("");
    setVkCount("");
    setVkAdvocates([]);
    setVkAdvOpen(false);
    setVkTab("upload");
    setVkFile(null);
    setVkSavedId("");
    setVkTouched(false);
    setVkGenerateNotice(false);
    setTeamPhones([]);
    setTeamInvited([]);
    setTeamInput("");
    setTeamTouched(false);
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
    // Prototype lookup, same contract as the litigant dialog: any plausible number
    // resolves to the demo case; a number with no digits exercises the miss path.
    if (!/\d/.test(trimmed)) {
      setLookupMiss(true);
      return;
    }
    setLookupMiss(false);
    setJoinCase(ADVOCATE_JOIN_CASE);
    // The access code still gates the case DETAILS (hearing, amounts, parties'
    // advocates). The code stage itself now shows the public identity of the
    // case — title, number, court — so the advocate can confirm they are
    // joining the right case before spending the litigant's code (Aug 31
    // correction round).
    setStage("code");
  }

  function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCodeTouched(true);
    if (code.length !== CODE_LENGTH) return;
    setStage("details");
  }

  function continueFromAccount() {
    if (accountRole === "advocate") {
      setStage("role");
      return;
    }
    setSwitchingProfile(true);
    switchTimerRef.current = window.setTimeout(onJoinAsLitigant, 2000);
  }

  function submitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleTouched(true);
    if (!side || partyIds.length === 0 || !replacing) return;
    if (replacing === "yes") {
      if (sideAdvocates.length > 0 && !replacedAdvocate) return;
      if (!effectiveApprover) return;
      if (!reason.trim()) return;
    }
    // Litigants already on the case need no contact entry — go straight to the
    // vakalatnama when nobody is missing a number.
    const missing = selectedParties.filter((party) => !party.hasJoined);
    if (missing.length === 0) {
      setStage("vakalatnama");
      return;
    }
    setContacts((current) => {
      const next = { ...current };
      for (const party of missing) next[party.id] ??= "";
      return next;
    });
    setStage("verify");
  }

  function submitVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyTouched(true);
    // Every litigant without a number on record needs a valid one before continuing.
    const allValid = contactParties.every(
      (party) => (contacts[party.id] ?? "").length === 10,
    );
    if (!allValid) return;
    setVerifyTouched(false);
    setStage("vakalatnama");
  }

  function submitVakalatnama(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVkTouched(true);
    if (!joinCase || !side) return;
    if (vkTab === "upload") {
      if (otherAdvocatesOnCase && !vkAnother) return;
      if (needsCoAdvocates && !coAdvocatesComplete) return;
    }
    if (!vkAttached) return;
    setStage("done");
    onJoined({
      joinCase,
      side,
      parties: selectedParties,
      replacing: replacing === "yes",
      approver: replacing === "yes" ? (effectiveApprover as "judge" | "advocates") : null,
      joined: !pendingOutcome,
    });
  }

  function updateContact(partyId: string, value: string) {
    setContacts((current) => ({ ...current, [partyId]: value }));
    setVerifyTouched(false);
  }

  function addTeamMember() {
    setTeamTouched(true);
    if (!teamValid) return;
    setTeamPhones((current) => [...current, teamInput.trim()]);
    setTeamInput("");
    setTeamTouched(false);
  }

  function sendInvites() {
    if (!teamPhones.length) return;
    // The confirmation shows the batch just sent and replaces any earlier one — a
    // later send swaps the old notification out rather than growing it.
    setTeamInvited([...teamPhones]);
    setTeamPhones([]);
    setTeamInput("");
    setTeamTouched(false);
  }

  const joinedParties = selectedParties.filter((party) => party.hasJoined);

  const headerCopy: { title: string; body: string } =
    stage === "lookup"
      ? { title: pick(advDialog.title, locale), body: pick(advDialog.lookupBody, locale) }
      : stage === "details"
        ? isSummonsIntro
          ? { title: pick(advDialog.summonsHeading, locale), body: pick(advDialog.summonsBody, locale) }
          : { title: pick(advDialog.title, locale), body: pick(advDialog.detailsBody, locale) }
        : stage === "code"
          ? { title: pick(advDialog.title, locale), body: pick(advDialog.codeBody, locale) }
          : stage === "account"
            ? switchingProfile
              ? { title: pick(advDialog.accountSwitchTitle, locale), body: pick(advDialog.accountSwitchBody, locale) }
              : { title: pick(advDialog.accountTitle, locale), body: pick(advDialog.accountBody, locale) }
          : stage === "role"
            ? { title: pick(advDialog.title, locale), body: pick(advDialog.roleBody, locale) }
            : stage === "verify"
              ? { title: pick(advDialog.verifyTitle, locale), body: pick(advDialog.verifyBody, locale) }
              : { title: pick(advDialog.vkTitle, locale), body: pick(advDialog.vkBody, locale) };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ChromeDialogContent
        lang={locale}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        // The litigant combobox portals its list outside this dialog's DOM. Without
        // this guard the modal dialog reads a click on that list as an outside
        // interaction and swallows it before the option can be selected.
        onInteractOutside={(event) => {
          const target = event.target as Element | null;
          if (target?.closest?.('[data-slot="combobox-content"]')) event.preventDefault();
        }}
        // Escape must close the innermost layer only: with the combobox list open
        // (its popup is in the DOM), the dialog stands down and lets the list
        // close; a second Escape then closes the dialog.
        onEscapeKeyDown={(event) => {
          if (document.querySelector('[data-slot="combobox-content"]')) event.preventDefault();
        }}
      >
        {stage === "done" ? (
          <DialogHeader
            className={`shrink-0 px-6 py-5 pr-14 text-left ${pendingOutcome ? "" : "border-b border-hairline"}`}
          >
            <div className="flex items-center gap-4">
              <span
                className={
                  pendingOutcome
                    ? "flex size-14 shrink-0 items-center justify-center rounded-full bg-info-muted text-info-muted-foreground"
                    : "flex size-14 shrink-0 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground"
                }
              >
                {pendingOutcome ? (
                  <HourglassIcon className="size-7" aria-hidden />
                ) : (
                  <CheckCircle2Icon className="size-7" aria-hidden />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="text-title-s font-semibold text-balance">
                  {pick(pendingOutcome ? advDialog.requestTitle : advDialog.joinedTitle, locale)}
                </DialogTitle>
                <DialogDescription className="text-pretty">
                  {pendingOutcome
                    ? replacing === "yes"
                      ? fill(advDialog.requestReplacementBody, locale, {
                          approver: pick(
                            effectiveApprover === "judge"
                              ? advDialog.approverTheJudge
                              : advDialog.approverTheAdvocates,
                            locale,
                          ),
                        })
                      : pick(advDialog.requestComplainantBody, locale)
                    : pick(advDialog.joinedBody, locale)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        ) : (
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-title-s font-semibold text-balance">
              {headerCopy.title}
            </DialogTitle>
            <DialogDescription className="text-pretty">{headerCopy.body}</DialogDescription>
          </DialogHeader>
        )}

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${stage === "done" && pendingOutcome ? "hidden" : ""}`}
        >
          {/* ------------------------------------------------------- lookup */}
          {stage === "lookup" ? (
            <form id="adv-lookup" noValidate className="flex flex-col gap-4" onSubmit={submitLookup}>
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
          {/* Advocates get the full registry list (CNR, filing number, court, both
              sides' advocates) — the limited litigant set was an intimidation
              trade-off that does not apply to professionals. */}
          {stage === "details" && joinCase ? (
            <div className="flex flex-col gap-4">
              <CaseDetails joinCase={joinCase} locale={locale} extended />
              {downloadNotice ? (
                <Banner variant="info">
                  {pick(joinDialog.downloadCaseFilePrototype, locale)}
                </Banner>
              ) : null}
            </div>
          ) : null}

          {/* --------------------------------------------- account for this case */}
          {stage === "account" && joinCase ? (
            switchingProfile ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
                <Spinner className="size-6 text-primary" />
                <p className="text-body-compact font-medium">{pick(advDialog.accountSwitchStatus, locale)}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>{pick(advDialog.accountLabel, locale)}</FieldLabel>
                  <Select
                    value={accountRole}
                    onValueChange={(value) => setAccountRole(value as "advocate" | "litigant")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advocate">{pick(advDialog.accountAdvocate, locale)}</SelectItem>
                      <SelectItem value="litigant">{pick(advDialog.accountLitigant, locale)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Banner variant="info">{pick(advDialog.accountNote, locale)}</Banner>
              </div>
            )
          ) : null}

          {/* --------------------------------------------------- access code */}
          {stage === "code" && joinCase ? (
            <form id="adv-code" noValidate className="flex flex-col gap-4" onSubmit={submitCode}>
              {/* Public identity only — enough to confirm this is the right
                  case: the cause title (with "1 other" explorable, the same
                  way the details stage shows it), the number, and the amount
                  claimed — the figure a party recognises faster than a court
                  address. Everything deeper stays behind the code on the
                  details stage. */}
              <div className="flex flex-col gap-1 rounded-xl bg-surface-sunken p-4">
                <p className="text-caption font-medium text-muted-foreground">
                  {pick(advDialog.codeCaseLead, locale)}
                </p>
                <CaseTitleWithOthers joinCase={joinCase} locale={locale} />
                <p className="text-caption text-muted-foreground">
                  <span className="font-sans tabular-nums">
                    {joinCase.caseNumber}
                  </span>
                  <span aria-hidden> · </span>
                  {pick(caseDetails.chequeAmount, locale)}{" "}
                  <span className="tabular-nums">{joinCase.chequeAmount}</span>
                </p>
              </div>
              <Banner variant="info">{pick(advDialog.codeNote, locale)}</Banner>
              <Field data-invalid={codeTouched && code.length !== CODE_LENGTH}>
                <FieldLabel>{pick(advDialog.codeLabel, locale)}</FieldLabel>
                <InputOTP
                  maxLength={CODE_LENGTH}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setCodeTouched(false);
                  }}
                >
                  <InputOTPGroup className="w-full">
                    {Array.from({ length: CODE_LENGTH }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-auto flex-1 text-body font-semibold"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <FieldError>
                  {codeTouched && code.length !== CODE_LENGTH
                    ? pick(advDialog.codeError, locale)
                    : null}
                </FieldError>
              </Field>
            </form>
          ) : null}

          {/* ------------------------------------------------ representation */}
          {stage === "role" && joinCase ? (
            <form id="adv-role" noValidate className="flex flex-col gap-6" onSubmit={submitRole}>
              <Field data-invalid={roleTouched && !side}>
                <FieldLabel className="block w-full text-body font-semibold leading-snug">
                  {pick(advDialog.sideLegend, locale)}
                </FieldLabel>
                <RadioGroup
                  value={side}
                  onValueChange={(value) => {
                    setSide(value as Side);
                    setPartyIds([]);
                    setReplacing("");
                    setReplacedAdvocate("");
                    setApprover("");
                    setRoleTouched(false);
                  }}
                  className="flex flex-col gap-1"
                >
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="complainant" id="adv-side-complainant" />
                    <Label htmlFor="adv-side-complainant">
                      {pick(advDialog.sideComplainant, locale)}
                    </Label>
                  </div>
                  <div className="flex min-h-10 items-center gap-2">
                    <RadioGroupItem value="accused" id="adv-side-accused" />
                    <Label htmlFor="adv-side-accused">
                      {pick(advDialog.sideAccused, locale)}
                    </Label>
                  </div>
                </RadioGroup>
                <FieldError>
                  {roleTouched && !side ? pick(advDialog.sideError, locale) : null}
                </FieldError>
              </Field>

              {side === "accused" ? (
                <Banner variant="info">{pick(advDialog.accusedAckNote, locale)}</Banner>
              ) : null}

              {side ? (
                <Field data-invalid={roleTouched && partyIds.length === 0}>
                  <FieldLabel className="block w-full text-body font-semibold leading-snug">
                    {pick(advDialog.whichLegend, locale)}
                  </FieldLabel>
                  {/* Multi-select dropdown, not a checkbox list — a real case can carry
                      many litigants on one side, and one vakalatnama often covers
                      several of them. Selected litigants sit as removable chips. */}
                  <Combobox
                    multiple
                    items={sideParties.map((party) => party.name)}
                    value={selectedParties.map((party) => party.name)}
                    onValueChange={(names: string[]) => {
                      setPartyIds(
                        sideParties
                          .filter((party) => names.includes(party.name))
                          .map((party) => party.id),
                      );
                      setRoleTouched(false);
                    }}
                  >
                    <ComboboxChips ref={partyAnchor}>
                      <ComboboxValue>
                        {(value: string[]) => (
                          <>
                            {value.map((name) => (
                              <ComboboxChip key={name}>{name}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput
                              placeholder={
                                value.length
                                  ? undefined
                                  : pick(advDialog.whichPlaceholder, locale)
                              }
                            />
                          </>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    {/* The popup portals to <body>, which the modal dialog freezes with
                        pointer-events:none — so the list must re-enable its own, or every
                        option is unclickable (a Radix-dialog + portaled-popup interaction,
                        not a combobox bug). */}
                    <ComboboxContent anchor={partyAnchor} className="pointer-events-auto">
                      <ComboboxEmpty>{pick(advDialog.whichEmpty, locale)}</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError>
                    {roleTouched && partyIds.length === 0
                      ? pick(advDialog.whichError, locale)
                      : null}
                  </FieldError>
                </Field>
              ) : null}

              {side && partyIds.length > 0 ? (
                <Field data-invalid={roleTouched && !replacing}>
                  <FieldLabel className="block w-full text-body font-semibold leading-snug">
                    {pick(advDialog.replaceLegend, locale)}
                  </FieldLabel>
                  <RadioGroup
                    value={replacing}
                    onValueChange={(value) => {
                      setReplacing(value as YesNo);
                      setRoleTouched(false);
                    }}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex min-h-10 items-center gap-2">
                      <RadioGroupItem value="yes" id="adv-replace-yes" />
                      <Label htmlFor="adv-replace-yes">{pick(advDialog.yes, locale)}</Label>
                    </div>
                    <div className="flex min-h-10 items-center gap-2">
                      <RadioGroupItem value="no" id="adv-replace-no" />
                      <Label htmlFor="adv-replace-no">{pick(advDialog.no, locale)}</Label>
                    </div>
                  </RadioGroup>
                  <FieldDescription>{pick(advDialog.replaceHint, locale)}</FieldDescription>
                  <FieldError>
                    {roleTouched && !replacing ? pick(advDialog.replaceError, locale) : null}
                  </FieldError>
                </Field>
              ) : null}

              {replacing === "yes" ? (
                <>
                  {sideAdvocates.length > 0 ? (
                    <Field data-invalid={roleTouched && !replacedAdvocate}>
                      <FieldLabel className="block w-full text-body font-semibold leading-snug">
                        {pick(advDialog.replacedWhoLabel, locale)}
                      </FieldLabel>
                      <Select
                        value={replacedAdvocate}
                        onValueChange={(value) => {
                          setReplacedAdvocate(value);
                          setRoleTouched(false);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={pick(advDialog.replacedWhoPlaceholder, locale)}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sideAdvocates.map((advocate) => (
                            <SelectItem key={advocate} value={advocate}>
                              {advocate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>
                        {roleTouched && !replacedAdvocate
                          ? pick(advDialog.replacedWhoError, locale)
                          : null}
                      </FieldError>
                    </Field>
                  ) : null}

                  <Field data-invalid={roleTouched && !effectiveApprover}>
                    <FieldLabel className="block w-full text-body font-semibold leading-snug">
                      {pick(advDialog.approverLegend, locale)}
                    </FieldLabel>
                    {judgeOnly ? (
                      <FieldDescription>
                        {pick(advDialog.approverNoAdvocates, locale)}
                      </FieldDescription>
                    ) : (
                      <RadioGroup
                        value={approver}
                        onValueChange={(value) => {
                          setApprover(value as "judge" | "advocates");
                          setRoleTouched(false);
                        }}
                        className="flex flex-col gap-1"
                      >
                        <div className="flex min-h-10 items-center gap-2">
                          <RadioGroupItem value="judge" id="adv-approver-judge" />
                          <Label htmlFor="adv-approver-judge">
                            {pick(advDialog.approverJudge, locale)}
                          </Label>
                        </div>
                        <div className="flex min-h-10 items-center gap-2">
                          <RadioGroupItem value="advocates" id="adv-approver-advocates" />
                          <Label htmlFor="adv-approver-advocates">
                            {pick(advDialog.approverAdvocates, locale)}
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                    <FieldError>
                      {roleTouched && !effectiveApprover
                        ? pick(advDialog.approverError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field data-invalid={roleTouched && !reason.trim()}>
                    <FieldLabel htmlFor="adv-reason">
                      {pick(advDialog.reasonLabel, locale)}
                    </FieldLabel>
                    <Textarea
                      id="adv-reason"
                      value={reason}
                      rows={3}
                      onChange={(event) => {
                        setReason(event.target.value);
                        setRoleTouched(false);
                      }}
                    />
                    <FieldError>
                      {roleTouched && !reason.trim()
                        ? pick(advDialog.reasonError, locale)
                        : null}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel>{pick(advDialog.supportLabel, locale)}</FieldLabel>
                    <UploadedDocField
                      label={pick(advDialog.supportLabel, locale)}
                      file={supportFile}
                      onFileChange={setSupportFile}
                      locale={locale}
                    />
                    <FieldDescription>{pick(advDialog.supportHelp, locale)}</FieldDescription>
                  </Field>
                </>
              ) : null}
            </form>
          ) : null}

          {/* ---------------------------- litigant contact capture */}
          {/* Only litigants not yet on the case are asked — the court has no number for
              them. One labelled field each on a single screen; litigants already on the
              case are named in a note instead of asked. */}
          {stage === "verify" ? (
            <form id="adv-verify" noValidate className="flex flex-col gap-5" onSubmit={submitVerify}>
              {joinedParties.length ? (
                <Banner variant="info">
                  {fill(advDialog.contactAlreadyNote, locale, {
                    names: joinedParties.map((party) => party.name).join(", "),
                  })}
                </Banner>
              ) : null}

              {contactParties.map((party) => {
                const value = contacts[party.id] ?? "";
                const invalid = verifyTouched && value.length !== 10;
                return (
                  <Field key={party.id} data-invalid={invalid}>
                    {/* Just the litigant's name — the header already says "Enter litigant
                        contact details", so a per-field "Enter …'s mobile number" only
                        repeats it. */}
                    <FieldLabel htmlFor={`adv-mobile-${party.id}`} className="font-semibold">
                      {party.name}
                    </FieldLabel>
                    <Input
                      id={`adv-mobile-${party.id}`}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      value={value}
                      onChange={(event) =>
                        updateContact(party.id, event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                    />
                    <FieldError>
                      {invalid ? pick(advDialog.contactMobileError, locale) : null}
                    </FieldError>
                  </Field>
                );
              })}
            </form>
          ) : null}

          {/* --------------------------------------------------- vakalatnama */}
          {stage === "vakalatnama" ? (
            <form
              id="adv-vakalatnama"
              noValidate
              className="flex flex-col gap-6"
              onSubmit={submitVakalatnama}
            >
              {/* Not one big Field: a missed upload must redden only the upload area,
                  not every question below it. The heading is neutral; each control
                  scopes its own invalid state. */}
              <div className="flex flex-col gap-3">
                  <p className="text-body font-semibold leading-snug">
                    {pick(advDialog.vkDocLabel, locale)}
                  </p>
                  <Tabs
                    value={vkTab}
                    onValueChange={(value) => {
                      setVkTab(value as "upload" | "saved");
                      setVkTouched(false);
                    }}
                  >
                    <TabsList className="w-full border border-hairline bg-surface-sunken">
                      <TabsTrigger value="upload" className="flex-1">
                        {pick(advDialog.tabUpload, locale)}
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="flex-1">
                        {pick(advDialog.tabSaved, locale)}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="flex flex-col gap-5 pt-3">
                      <Field data-invalid={vkTouched && !vkAttached}>
                        <div className="flex flex-col gap-2">
                          <UploadedDocField
                            label={pick(advDialog.vkDocLabel, locale)}
                            required
                            file={vkFile}
                            onFileChange={(file) => {
                              setVkFile(file);
                              setVkTouched(false);
                            }}
                            locale={locale}
                          />
                          <FieldDescription>{pick(advDialog.vkDocHelp, locale)}</FieldDescription>
                        </div>
                        <FieldError>
                          {vkTouched && !vkAttached ? pick(advDialog.vkAttachError, locale) : null}
                        </FieldError>
                      </Field>

                      {/* Only asked once another advocate is already on the case. When
                          the answer is yes, the advocate is joining a vakalatnama that
                          already names them, so the co-advocate questions are skipped. */}
                      {otherAdvocatesOnCase ? (
                        <Field data-invalid={vkTouched && !vkAnother}>
                          <FieldLabel className="block w-full text-body font-semibold leading-snug">
                            {pick(advDialog.vkAnotherLegend, locale)}
                          </FieldLabel>
                          <RadioGroup
                            value={vkAnother}
                            onValueChange={(value) => {
                              setVkAnother(value as YesNo);
                              setVkTouched(false);
                            }}
                            className="flex flex-col gap-1"
                          >
                            <div className="flex min-h-10 items-center gap-2">
                              <RadioGroupItem value="yes" id="adv-vk-yes" />
                              <Label htmlFor="adv-vk-yes">{pick(advDialog.yes, locale)}</Label>
                            </div>
                            <div className="flex min-h-10 items-center gap-2">
                              <RadioGroupItem value="no" id="adv-vk-no" />
                              <Label htmlFor="adv-vk-no">{pick(advDialog.no, locale)}</Label>
                            </div>
                          </RadioGroup>
                          <FieldError>
                            {vkTouched && !vkAnother ? pick(advDialog.vkAnotherError, locale) : null}
                          </FieldError>
                        </Field>
                      ) : null}

                      {needsCoAdvocates ? (
                        <>
                          <Banner variant="info">{pick(advDialog.vkFeeNote, locale)}</Banner>

                          <Field data-invalid={vkTouched && !vkCountValid}>
                            <FieldLabel htmlFor="adv-vk-count">{pick(advDialog.vkCountLabel, locale)}</FieldLabel>
                            <Input
                              id="adv-vk-count"
                              inputMode="numeric"
                              value={vkCount}
                              onChange={(event) => {
                                setVkCount(event.target.value.replace(/\D/g, ""));
                                // Trim any picks beyond the new count.
                                setVkAdvocates((current) => {
                                  const next = event.target.value.replace(/\D/g, "");
                                  const n = /^[1-9]\d*$/.test(next) ? Number.parseInt(next, 10) : 0;
                                  return current.slice(0, n);
                                });
                                setVkTouched(false);
                              }}
                            />
                            <FieldError>
                              {vkTouched && !vkCountValid
                                ? pick(advDialog.vkCountError, locale)
                                : null}
                            </FieldError>
                          </Field>

                          {vkCountValid ? (
                            <Field data-invalid={vkTouched && vkAdvocates.length !== vkCountN}>
                              <FieldLabel className="block w-full text-body font-semibold leading-snug">
                                {pick(advDialog.vkAddLegend, locale)}
                              </FieldLabel>
                              <Combobox
                                multiple
                                // At the stated count the list closes and the input
                                // stops inviting more; removing a chip reopens it.
                                open={vkAdvOpen && !vkAdvAtCapacity}
                                onOpenChange={setVkAdvOpen}
                                items={BAR_DIRECTORY.map((adv) => `${adv.name} · ${adv.barId}`)}
                                value={vkAdvocates}
                                onValueChange={(names: string[]) => {
                                  const capped = names.slice(0, vkCountN);
                                  setVkAdvocates(capped);
                                  // Closed once the count is met; reopened the moment a
                                  // chip is removed and there is room again.
                                  setVkAdvOpen(capped.length < vkCountN);
                                  setVkTouched(false);
                                }}
                              >
                                <ComboboxChips ref={vkAdvAnchor}>
                                  <ComboboxValue>
                                    {(value: string[]) => (
                                      <>
                                        {value.map((name) => (
                                          <ComboboxChip key={name}>{name}</ComboboxChip>
                                        ))}
                                        <ComboboxChipsInput
                                          disabled={vkAdvAtCapacity}
                                          placeholder={
                                            value.length ? undefined : pick(advDialog.vkAddPlaceholder, locale)
                                          }
                                        />
                                      </>
                                    )}
                                  </ComboboxValue>
                                </ComboboxChips>
                                <ComboboxContent anchor={vkAdvAnchor} className="pointer-events-auto">
                                  <ComboboxEmpty>{pick(advDialog.vkAddEmpty, locale)}</ComboboxEmpty>
                                  <ComboboxList>
                                    {(item: string) => (
                                      <ComboboxItem key={item} value={item}>
                                        {item}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                              <FieldDescription>
                                {fill(
                                  vkAdvAtCapacity ? advDialog.vkAddCap : advDialog.vkAddHint,
                                  locale,
                                  { n: String(vkCountN) },
                                )}
                              </FieldDescription>
                              <FieldError>
                                {vkTouched && vkAdvocates.length !== vkCountN
                                  ? fill(advDialog.vkAddError, locale, { n: String(vkCountN) })
                                  : null}
                              </FieldError>
                            </Field>
                          ) : null}
                        </>
                      ) : null}
                    </TabsContent>
                    <TabsContent value="saved" className="flex flex-col gap-2 pt-2">
                      <Field data-invalid={vkTouched && !vkAttached}>
                        <VakalatnamaPicker
                          items={VAKALATNAMAS}
                          selectedId={vkSavedId}
                          onSelect={(id) => {
                            setVkSavedId(id);
                            setVkTouched(false);
                          }}
                          locale={locale}
                        />
                        <FieldError>
                          {vkTouched && !vkAttached ? pick(advDialog.vkAttachError, locale) : null}
                        </FieldError>
                      </Field>
                    </TabsContent>
                  </Tabs>
                </div>
              <div className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-compact font-medium">{pick(advDialog.vkGeneratePrompt, locale)}</p>
                <Button type="button" variant="outline" onClick={() => setVkGenerateNotice(true)} data-icon="inline-start">
                  <FilePlus2Icon aria-hidden />
                  {pick(advDialog.vkGenerateAction, locale)}
                </Button>
              </div>
              {vkGenerateNotice ? <Banner variant="info">{pick(advDialog.vkGeneratePrototype, locale)}</Banner> : null}
            </form>
          ) : null}

          {/* --------------------------------------------------------- done */}
          {stage === "done" && joinCase && !pendingOutcome ? (
            <div className="flex flex-col gap-5">
              <CaseDetails joinCase={joinCase} locale={locale} compact />

              {/* Optional: bring the office's subordinates onto the case. Numbers are
                  typed one at a time and added to the stack above with the + button
                  (or Enter); Send invite then notifies everyone in the stack. */}
              <div className="flex flex-col gap-3 border-t border-hairline pt-5">
                <div className="flex flex-col gap-1">
                  <p className="text-body-compact font-semibold">
                    {pick(advDialog.teamTitle, locale)}
                  </p>
                  <p className="text-caption text-pretty text-muted-foreground">
                    {pick(advDialog.teamBody, locale)}
                  </p>
                </div>

                {/* Added numbers stack above the entry row as compact chips. */}
                {teamPhones.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {teamPhones.map((phone, index) => (
                      <span
                        key={`${phone}-${index}`}
                        className="inline-flex items-center gap-1 rounded-sm bg-muted py-0.5 pr-0.5 pl-2 text-caption font-medium text-foreground"
                      >
                        <span className="tabular-nums">{phone}</span>
                        <button
                          type="button"
                          aria-label={`${pick(advDialog.teamRemove, locale)} ${phone}`}
                          className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setTeamPhones((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          <XIcon className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <Field data-invalid={teamTouched && !teamValid}>
                  <FieldLabel htmlFor="adv-team-phone" className="sr-only">
                    {pick(advDialog.teamPlaceholder, locale)}
                  </FieldLabel>
                  <div className="flex items-start gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <Input
                        id="adv-team-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        placeholder={pick(advDialog.teamPlaceholder, locale)}
                        value={teamInput}
                        onChange={(event) => {
                          setTeamInput(event.target.value.replace(/\D/g, "").slice(0, 10));
                          setTeamTouched(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTeamMember();
                          }
                        }}
                      />
                      <FieldError>
                        {teamTouched && !teamValid ? pick(advDialog.teamError, locale) : null}
                      </FieldError>
                    </div>
                    {/* + adds the typed number to the stack; Send invite notifies all. */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={pick(advDialog.teamAdd, locale)}
                      onClick={addTeamMember}
                    >
                      <PlusIcon aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!teamPhones.length}
                      onClick={sendInvites}
                    >
                      {pick(advDialog.teamSendInvite, locale)}
                    </Button>
                  </div>
                </Field>

                {teamPhones.length ? (
                  <p className="text-caption text-muted-foreground">
                    {pick(advDialog.teamAddedNote, locale)}
                  </p>
                ) : null}

                {/* One-line confirmation: a single tick, then the numbers just invited,
                    inline and comma-separated. Replaced (not grown) on the next send. */}
                {teamInvited.length ? (
                  <p className="flex items-start gap-1.5 rounded-lg border border-success bg-success-muted px-3 py-2 text-body-compact font-medium text-success-muted-foreground">
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {pick(advDialog.teamInviteSentNote, locale)}{" "}
                      <span className="tabular-nums">{teamInvited.join(", ")}</span>
                    </span>
                  </p>
                ) : null}
              </div>

              {doneNotice ? (
                <Banner variant="info">
                  {pick(
                    doneNotice === "bail"
                      ? joinDialog.fileBailPrototype
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
          className={`flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:items-center ${stage === "done" && pendingOutcome ? "sm:justify-end" : "sm:justify-between"}`}
        >
          {stage === "lookup" ? (
            <>
              <span aria-hidden className="hidden sm:block" />
              <Button type="submit" form="adv-lookup" data-icon="inline-start">
                <SearchIcon aria-hidden />
                {pick(advDialog.findAndJoin, locale)}
              </Button>
            </>
          ) : null}

          {stage === "details" ? (
            <>
              {mode === "manual" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage("code")}
                  data-icon="inline-start"
                >
                  <ArrowLeftIcon aria-hidden />
                  {pick(joinDialog.back, locale)}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  {locale === "ml" ? "ഇപ്പോൾ വേണ്ട" : "Not now"}
                </Button>
              )}
              {/* Download sits next to the primary action as a compact icon; the label
                  rides in its hover tooltip. */}
              <div className="flex items-center gap-2">
                <DownloadCaseFileButton
                  label={pick(joinDialog.downloadCaseFile, locale)}
                  onClick={() => setDownloadNotice(true)}
                />
                <Button type="button" onClick={() => setStage("account")} data-icon="inline-end">
                  {pick(joinDialog.continue, locale)}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </div>
            </>
          ) : null}

          {stage === "account" ? (
            <>
              <Button type="button" variant="outline" disabled={switchingProfile} onClick={() => setStage("details")} data-icon="inline-start">
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button
                type="button"
                disabled={switchingProfile}
                onClick={continueFromAccount}
                data-icon="inline-end"
              >
                {pick(joinDialog.continue, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "code" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage("lookup")}
                data-icon="inline-start"
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button type="submit" form="adv-code" data-icon="inline-end">
                {pick(advDialog.codeVerify, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "role" ? (
            <>
              <Button
                type="button"
                variant="outline"
                // Representation always follows the account step in both modes.
                onClick={() => setStage("account")}
                data-icon="inline-start"
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button type="submit" form="adv-role" data-icon="inline-end">
                {pick(joinDialog.continue, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "verify" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => {
                  setVerifyTouched(false);
                  setStage("role");
                }}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button type="submit" form="adv-verify" data-icon="inline-end">
                {pick(joinDialog.continue, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "vakalatnama" ? (
            <>
              <Button
                type="button"
                variant="outline"
                data-icon="inline-start"
                onClick={() => {
                  setVkTouched(false);
                  // Return to contact capture only if any litigant needed one;
                  // otherwise step straight back to the representation stage.
                  setStage(contactParties.length > 0 ? "verify" : "role");
                }}
              >
                <ArrowLeftIcon aria-hidden />
                {pick(joinDialog.back, locale)}
              </Button>
              <Button type="submit" form="adv-vakalatnama" data-icon="inline-end">
                {pick(joinDialog.joinSubmit, locale)}
                <ArrowRightIcon aria-hidden />
              </Button>
            </>
          ) : null}

          {stage === "done" ? (
            pendingOutcome ? (
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {pick(joinDialog.backHome, locale)}
              </Button>
            ) : (
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
                  onClick={() => setDoneNotice("bail")}
                  data-icon="inline-end"
                >
                  {pick(joinDialog.fileBail, locale)}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </>
            )
          ) : null}
        </footer>
      </ChromeDialogContent>
    </Dialog>
  );
}
