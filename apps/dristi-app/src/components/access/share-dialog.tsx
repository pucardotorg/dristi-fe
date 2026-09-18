"use client";

import * as React from "react";
import { CheckCircle2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CaseAccessList, initials } from "@/components/access/access-list";
import { formatPhone, useAccess, type InviteResult } from "@/components/access/access-state";
import { RemoveAdvocateDialog } from "@/components/cases/remove-advocate-dialog";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { pick, type Locale } from "@/lib/onboarding/content";
import {
  FREQUENT_COLLABORATORS,
  PHONE_DIRECTORY,
  fillCopy,
  roleCopy,
  shareCopy,
  type AccessCase,
  type AccessPerson,
} from "@/lib/access/content";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The share-access modal — the single surface behind every entry point.
 *
 * Sharing only ever adds OFFICE STAFF: the vakalatnama is per-case and already
 * carries its advocates, so there is no role choice anywhere. Bulk mode (2+
 * cases) is additionally grant-only — no access list, no removal. "Already has
 * access" is handled by granting idempotently and saying so in the
 * confirmation, never by blocking upfront.
 *
 * The number field resolves against the DRISTI account directory the moment
 * the tenth digit lands; recognised people stack as name-over-number chips,
 * unknown numbers stack as just the number.
 */

type Chip = { phone: string; name?: string };

export function ShareDialog({
  open,
  onOpenChange,
  cases,
  locale,
  readOnly = false,
  extraPeople,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One case = full share+manage surface; several = bulk grant-only. */
  cases: AccessCase[];
  locale: Locale;
  /**
   * The viewer holds only office access on this case (owner, Sept 2):
   * they can see who has access, but adding and removing people belongs
   * to the vakalatnama holders. Inputs and removes disable; the list
   * stays readable.
   */
  readOnly?: boolean;
  /**
   * The case's own people, derived from its record (nama advocates and
   * office staff) — merged with the access store so "Who has access"
   * matches the case file. The store never held them, so removing one is
   * this dialog's local state.
   */
  extraPeople?: AccessPerson[];
}) {
  const { invite, removeGrant, personsOnCase } = useAccess();

  const [chips, setChips] = React.useState<Chip[]>([]);
  const [input, setInput] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [accessQuery, setAccessQuery] = React.useState("");
  /* An on-nama advocate whose Remove was clicked; opens the formal removal
     flow (3a/3b) over this dialog. Staff removal stays the one-click revoke. */
  const [removeTarget, setRemoveTarget] = React.useState<string | null>(null);
  const [removedDerived, setRemovedDerived] = React.useState<ReadonlySet<string>>(
    new Set(),
  );

  const bulk = cases.length > 1;
  const single = cases.length === 1 ? cases[0] : null;
  const storePeople = single ? personsOnCase(single.id) : [];
  const storeNames = new Set(storePeople.map((p) => p.name));
  const onCase = single
    ? [
        ...storePeople,
        ...(extraPeople ?? []).filter(
          (p) => !storeNames.has(p.name) && !removedDerived.has(p.id),
        ),
      ]
    : [];

  const inputValid = /^\d{10}$/.test(input);
  const lookup = inputValid ? (PHONE_DIRECTORY[input] ?? null) : null;

  /* The wrong-door check: an advocate's number in the share box almost
     always means "add them to the case", which is the Parties tab's job —
     office access is all this dialog can grant. The notice names whoever is
     stacked (or currently resolved) and points to the other door; it warns,
     never blocks, because giving an advocate plain office access is rare but
     legitimate. */
  const advocateNames = [
    ...chips
      .filter((chip) => PHONE_DIRECTORY[chip.phone.replace(/\D/g, "")]?.advocate)
      .map((chip) => chip.name ?? chip.phone),
    ...(lookup?.advocate ? [lookup.name] : []),
  ];

  function handleOpenChange(nextOpen: boolean) {
    // Closing clears transient invite state so reopening any case scope starts
    // clean without synchronously cascading state updates from an effect.
    if (!nextOpen) {
      setChips([]);
      setInput("");
      setTouched(false);
      setResult(null);
      setAccessQuery("");
      setRemovedDerived(new Set());
    }
    onOpenChange(nextOpen);
  }

  function stack(chip: Chip) {
    setChips((current) =>
      current.some((c) => c.phone === chip.phone) ? current : [...current, chip],
    );
  }

  function addPhone() {
    if (!inputValid) {
      setTouched(true);
      return;
    }
    stack({ phone: formatPhone(input), name: lookup?.name });
    setInput("");
    setTouched(false);
  }

  function send() {
    // A number still sitting in the input counts — nobody should need to press +.
    let batch = chips;
    if (inputValid) {
      const pretty = formatPhone(input);
      if (!batch.some((c) => c.phone === pretty)) {
        batch = [...batch, { phone: pretty, name: lookup?.name }];
      }
      setInput("");
    }
    if (!batch.length) {
      setTouched(true);
      return;
    }
    setResult(invite(batch.map((c) => c.phone), cases.map((c) => c.id)));
    setChips([]);
  }

  // Suggest frequent collaborators not already stacked, and (single case) not
  // already holding access — a suggestion you can't act on is just noise.
  const suggestions = FREQUENT_COLLABORATORS.filter((collab) => {
    if (chips.some((c) => c.phone === collab.phone)) return false;
    if (single && onCase.some((p) => p.phone === collab.phone)) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ChromeDialogContent className="flex max-h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Header: what this is, then exactly what it applies to. */}
        <DialogHeader className="gap-2.5 border-b border-hairline px-6 py-5 text-left">
          <DialogTitle className="text-title-s font-semibold">
            {pick(shareCopy.title, locale)}
          </DialogTitle>
          {/* The one-line boundary against Add people (PM, Sept 2): what
              sharing grants, and what it does not. */}
          <p className="text-caption text-pretty text-muted-foreground">
            {readOnly
              ? pick(shareCopy.readOnlyNote, locale)
              : pick(shareCopy.bodySingle, locale)}
          </p>
          {single ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-body-compact font-medium">{single.title}</p>
              <Identifier
                value={single.caseNumber}
                label="case number"
                className="self-start text-caption text-muted-foreground"
              />
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-body-compact font-medium">
                {fillCopy(shareCopy.scopeManyTitle, locale, { count: String(cases.length) })}
              </p>
              {/* Split rather than joined, so each number keeps the identifier face
                  and can be taken on its own. */}
              <p className="truncate text-caption text-muted-foreground">
                {cases.map((c, i) => (
                  <React.Fragment key={c.id}>
                    {i > 0 ? <span aria-hidden> · </span> : null}
                    <Identifier value={c.caseNumber} label="case number" />
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* ------------------------------------------------ invite controls */}
          <div className="flex flex-col gap-3">
            {chips.length ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.phone}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted py-1 pr-1 pl-2.5 text-caption text-foreground"
                  >
                    {/* Recognised numbers carry the registered name over the number. */}
                    {chip.name ? (
                      <span className="flex flex-col">
                        <span className="font-medium">{chip.name}</span>
                        <span className="text-muted-foreground tabular-nums">{chip.phone}</span>
                      </span>
                    ) : (
                      <span className="font-medium tabular-nums">{chip.phone}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`${pick(shareCopy.removeChip, locale)} ${chip.name ?? chip.phone}`}
                      className="flex size-5 items-center justify-center self-start rounded-sm text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setChips((current) => current.filter((c) => c.phone !== chip.phone))
                      }
                    >
                      <XIcon className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <Field data-invalid={touched && !inputValid}>
              <FieldLabel htmlFor="share-phone" className="sr-only">
                {pick(shareCopy.phonePlaceholder, locale)}
              </FieldLabel>
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  {/* The dropdown anchors to the input itself, not the field
                      block, so it sits tight under the box. */}
                  <div className="relative">
                    <Input
                      id="share-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={readOnly}
                      maxLength={10}
                      placeholder={pick(shareCopy.phonePlaceholder, locale)}
                      value={input}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onChange={(event) => {
                        setInput(event.target.value.replace(/\D/g, "").slice(0, 10));
                        setTouched(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addPhone();
                        }
                      }}
                    />

                    {/* The tenth digit resolves the number against DRISTI's
                        accounts: registered users show their name (and past
                        team members their designation); an unknown number is
                        just the number. One tap stacks it. */}
                    {inputValid && focused ? (
                      <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-overlay">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                          // Mousedown, not click — the input blurs first otherwise
                          // and the dropdown vanishes before the click lands.
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addPhone();
                          }}
                        >
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="text-caption font-medium">
                              {lookup ? initials(lookup.name) : "#"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-body-compact font-medium">
                              {lookup ? lookup.name : `+91 ${formatPhone(input)}`}
                            </span>
                            {lookup ? (
                              <span className="truncate text-caption text-muted-foreground">
                                <span className="tabular-nums">{formatPhone(input)}</span>
                                {lookup.designation
                                  ? ` · ${pick(roleCopy[lookup.designation], locale)}`
                                  : null}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <FieldError>
                    {touched && !inputValid ? pick(shareCopy.phoneError, locale) : null}
                  </FieldError>
                  <p className="text-caption text-muted-foreground tabular-nums">
                    {pick(shareCopy.demoProfiles, locale)}
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={readOnly || (!chips.length && !inputValid)}
                  onClick={send}
                >
                  {pick(shareCopy.send, locale)}
                </Button>
              </div>
            </Field>

            {advocateNames.length ? (
              <Alert>
                <AlertDescription>
                  {fillCopy(shareCopy.advocateNotice, locale, {
                    name: [...new Set(advocateNames)].join(", "),
                  })}
                </AlertDescription>
              </Alert>
            ) : null}

            {suggestions.length && !readOnly ? (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-caption font-medium text-muted-foreground">
                  {pick(shareCopy.suggestionsLabel, locale)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((collab) => (
                    <button
                      key={collab.phone}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-2 text-caption font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => stack({ phone: collab.phone, name: collab.name })}
                    >
                      <PlusIcon className="size-3.5" aria-hidden />
                      {collab.name}
                      <span className="font-normal text-muted-foreground">
                        · {pick(roleCopy[collab.role], locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {result ? (
              <p className="flex items-start gap-1.5 rounded-lg border border-success bg-success-muted px-3 py-2 text-body-compact font-medium text-success-muted-foreground">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {pick(shareCopy.sentNote, locale)} {result.names.join(", ")}
                  {bulk ? (
                    <>
                      {" — "}
                      {result.added === 0
                        ? pick(shareCopy.alreadyHadAllNote, locale)
                        : result.skipped === 0
                          ? fillCopy(shareCopy.sentBulkAllNote, locale, {
                              total: String(result.total),
                            })
                          : fillCopy(shareCopy.sentBulkNote, locale, {
                              added: String(result.added),
                              total: String(result.total),
                              skipped: String(result.skipped),
                            })}
                    </>
                  ) : null}
                </span>
              </p>
            ) : null}
          </div>

          {/* --------------------------- who has access (single case only) */}
          {single ? (
            <>
              <Separator />
              <section className="flex flex-col gap-1" aria-label={pick(shareCopy.whoHasAccess, locale)}>
                <div className="flex flex-col items-stretch gap-3 pb-2 sm:flex-row sm:items-center">
                  <h3
                    id="access-list-heading"
                    className="min-w-0 flex-1 text-body-compact font-semibold"
                  >
                    {pick(shareCopy.whoHasAccess, locale)}
                  </h3>
                  <div className="relative w-full sm:w-56">
                    <SearchIcon
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      aria-labelledby="access-list-heading"
                      className="h-9 pl-9"
                      placeholder={pick(shareCopy.accessSearchPlaceholder, locale)}
                      value={accessQuery}
                      onChange={(event) => setAccessQuery(event.target.value)}
                    />
                  </div>
                </div>
                <CaseAccessList
                  caseId={single.id}
                  people={onCase}
                  locale={locale}
                  query={accessQuery}
                  onRemove={
                    readOnly
                      ? undefined
                      : (personId) => {
                          removeGrant(personId, single.id);
                          if (personId.startsWith("derived-")) {
                            setRemovedDerived(
                              (current) => new Set(current).add(personId),
                            );
                          }
                        }
                  }
                  onRemoveVakalat={
                    readOnly
                      ? undefined
                      : (person) => setRemoveTarget(person.name)
                  }
                  selfAccessLabel={
                    readOnly ? pick(shareCopy.selfOfficeAccess, locale) : undefined
                  }
                />
              </section>
            </>
          ) : null}
        </div>
      </ChromeDialogContent>

      <RemoveAdvocateDialog
        open={Boolean(removeTarget)}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null);
        }}
        advocateName={removeTarget ?? ""}
        caseRef={{
          title: single?.title ?? "",
          caseNumber: single?.caseNumber ?? "",
          court: single?.court ?? "",
        }}
      />
    </Dialog>
  );
}
