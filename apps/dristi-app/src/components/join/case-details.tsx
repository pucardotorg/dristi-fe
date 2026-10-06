import * as React from "react";
import { CircleCheckIcon, InfoIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionRow,
  DescriptionTerm,
} from "@/components/ui/description-list";
import { pick, type Locale } from "@/lib/onboarding/content";
import { caseDetails, type JoinCase } from "@/lib/join/content";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";
import { PANEL_CLASS } from "@/components/shell/panel";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";

/**
 * The one case-details block, shared by the summons modal, the join dialog, and the
 * join outcome screen.
 *
 * The legacy dialog showed ten fields in one flat grid, every label the same size.
 * The redesign ranks them by what a summoned person acts on: the parties, then where
 * and when the next hearing is, then the registry identifiers. `compact` retains the
 * case number while dropping the longer reference list. `extended` restores the full
 * registry list (CNR, filing number, court, both sides' advocates) for advocates, who
 * work by those identifiers rather than being intimidated by them. Court is shown to
 * everyone (JOIN-15).
 *
 * It is a white panel, lifted, so it reads as the case laid on the dialog's canvas
 * (owner, Oct 6: the sunken box did not look like the product's other modals). The
 * next hearing is the first row of the facts, at the facts' own size: as a 20px line
 * under its own floating calendar icon it outranked the case title above it.
 */

/** The lifted white panel the join surfaces lay facts on. */
export const JOIN_PANEL = cn(
  PANEL_CLASS,
  "flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-6"
);

/**
 * The case's public identity — what the access-code step can show before the code
 * is spent: a lead line, the cause title with its "1 other", and the case number
 * and court. Shared by both join dialogs so the block reads the same in each.
 */
export function CaseIdentity({
  joinCase,
  locale,
  lead,
}: {
  joinCase: JoinCase;
  locale: Locale;
  lead: string;
}) {
  return (
    <div className={cn(JOIN_PANEL, "gap-1")}>
      <p className="text-body-compact text-muted-foreground">{lead}</p>
      <CaseTitleWithOthers joinCase={joinCase} locale={locale} />
      <p className="text-body-compact text-pretty text-muted-foreground">
        <Identifier value={joinCase.caseNumber} label="case number" />
        <span aria-hidden> · </span>
        {joinCase.court}
      </p>
    </div>
  );
}

/** An advocate is on record for the accused side. */
export function hasAccusedAdvocate(joinCase: JoinCase) {
  return Boolean(joinCase.accusedAdvocate && joinCase.accusedAdvocate !== "Not available");
}
/**
 * The cause title with its "and 1 other" made explorable — the marker
 * becomes a dotted-underline trigger and the remaining accused list rides a
 * popover. Extracted from the details block so the access-code step can
 * show the same title the same way (Aug 31 round): wherever a join surface
 * prints the title, "1 other" answers who.
 */
export function CaseTitleWithOthers({
  joinCase,
  locale,
}: {
  joinCase: JoinCase;
  locale: Locale;
}) {
  const otherMarker = " and 1 other";
  const otherAccused = joinCase.accused.slice(1);
  const hasOtherAccused =
    joinCase.title.endsWith(otherMarker) && otherAccused.length > 0;
  const titleLead = hasOtherAccused
    ? joinCase.title.slice(0, -otherMarker.length)
    : joinCase.title;

  return (
    <p className="text-body font-semibold text-pretty">
      {titleLead}
      {hasOtherAccused ? (
        <>
          {" and "}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-sm underline decoration-dotted underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={pick(caseDetails.otherAccused, locale)}
              >
                1 other
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <p className="text-caption font-semibold text-muted-foreground">
                {pick(caseDetails.otherAccused, locale)}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-body-compact">
                {otherAccused.map((accused) => (
                  <li key={accused.id}>{accused.name}</li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </>
      ) : null}
    </p>
  );
}

export function CaseDetails({
  joinCase,
  locale,
  compact = false,
  extended = false,
  outcome,
  className,
}: {
  joinCase: JoinCase;
  locale: Locale;
  compact?: boolean;
  extended?: boolean;
  /**
   * The settled outcome, when the panel is the record of something just done — the
   * product's settled-card pattern (the signing flow's `SettledCard`): a success band
   * across the panel's top with a tick and the outcome line, resolving in place.
   */
  outcome?: string;
  className?: string;
}) {
  /* `idLabel` marks the rows whose value is a registry identifier rather than a
     fact about the case — they carry the identifier face and can be copied. */
  const rows: {
    label: keyof typeof caseDetails;
    value: string;
    idLabel?: string;
    emphasis?: boolean;
  }[] = [
    /* The fact a summoned person acts on leads, in the row grid like every
       other fact, set apart by weight alone. */
    { label: "hearing", value: joinCase.hearingDate, emphasis: true },
    { label: "caseNumber", value: joinCase.caseNumber, idLabel: "case number" },
    ...(extended
      ? ([
          { label: "cnr", value: joinCase.cnr, idLabel: "CNR" },
          {
            label: "filingNumber",
            value: joinCase.filingNumber,
            idLabel: "filing number",
          },
        ] as const)
      : []),
    { label: "filingDate", value: joinCase.filingDate },
    { label: "court", value: joinCase.court },
    { label: "chequeAmount", value: joinCase.chequeAmount },
    { label: "complainant", value: joinCase.complainant },
    { label: "complainantAdvocate", value: joinCase.complainantAdvocate },
    {
      label: "accusedParties",
      value: joinCase.accused.map((party) => party.name).join(", "),
    },
    // JOIN-15: the accused's advocate shows when one is on record; advocates always
    // see the row, "Not available" included.
    ...(extended || hasAccusedAdvocate(joinCase)
      ? ([{ label: "accusedAdvocate", value: joinCase.accusedAdvocate }] as const)
      : []),
  ];
  const shown = compact
    ? rows.filter((row) => row.label === "hearing" || row.label === "caseNumber")
    : rows;
  const body = (
    <>
      <div className="flex flex-col gap-2">
        {/* Neutral: teal is the dialog's one action, not a label. */}
        <Badge variant="secondary" className="self-start">{pick(caseDetails.caseTypeBadge, locale)}</Badge>
        <CaseTitleWithOthers joinCase={joinCase} locale={locale} />
      </div>

        <DescriptionList className="border-t border-hairline">
          {shown.map((row) => (
            <DescriptionRow
              key={row.label}
              className={cn(
                /* A label over its value on a phone: two columns there crushed
                   the values and broke identifiers mid-string. */
                "border-hairline max-sm:grid-cols-1 max-sm:gap-1",
                row.label === "complainantAdvocate" && "sm:items-center",
              )}
            >
              <DescriptionTerm>
                {pick(caseDetails[row.label], locale)}
              </DescriptionTerm>
              <DescriptionDetails>
                {row.label === "complainantAdvocate" ? (
                  <span className="flex items-center gap-2">
                    <span>{row.value}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={pick(caseDetails.complainantAdvocateContact, locale)}
                        >
                          <InfoIcon aria-hidden />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" collisionPadding={16} className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <p className="text-body-compact font-semibold">
                            {pick(caseDetails.complainantAdvocateContact, locale)}
                          </p>
                          <p className="text-body-compact text-pretty text-muted-foreground">
                            {pick(caseDetails.complainantAdvocateContactBody, locale)}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="self-start">
                          <a href={`tel:${joinCase.complainantAdvocatePhone.replace(/\s/g, "")}`}>
                            <PhoneIcon data-icon="inline-start" aria-hidden />
                            {joinCase.complainantAdvocatePhone}
                          </a>
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </span>
                ) : row.idLabel ? (
                  <Identifier value={row.value} label={row.idLabel} />
                ) : row.emphasis ? (
                  <span className="font-semibold">{row.value}</span>
                ) : (
                  row.value
                )}
              </DescriptionDetails>
            </DescriptionRow>
          ))}
        </DescriptionList>
    </>
  );

  if (!outcome) return <div className={cn(JOIN_PANEL, className)}>{body}</div>;
  return (
    <div
      className={cn(
        PANEL_CLASS,
        "overflow-hidden rounded-xl border bg-card",
        RESOLVE_IN_PLACE,
        className,
      )}
    >
      <div className="flex items-center gap-2 bg-success-muted px-4 py-2.5 text-body-compact text-success-muted-foreground sm:px-6">
        <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
        {/* Spoken: focus lands on the header title, which announces only itself. */}
        <span role="status" className="font-medium">
          {outcome}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">{body}</div>
    </div>
  );
}
