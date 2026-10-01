import * as React from "react";
import { CalendarIcon, InfoIcon, PhoneIcon } from "lucide-react";

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

/**
 * The one case-details block, shared by the summons modal, the join dialog, and the
 * join outcome screen.
 *
 * The legacy dialog showed ten fields in one flat grid, every label the same size.
 * The redesign ranks them by what a summoned person acts on: the parties, then where
 * and when the next hearing is, then the registry identifiers. `compact` retains the
 * case number while dropping the longer reference list. `extended` restores the full
 * registry list (CNR, filing number, court, both sides' advocates) for advocates, who
 * work by those identifiers rather than being intimidated by them.
 */
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
  className,
}: {
  joinCase: JoinCase;
  locale: Locale;
  compact?: boolean;
  extended?: boolean;
  className?: string;
}) {
  /* `idLabel` marks the rows whose value is a registry identifier rather than a
     fact about the case — they carry the identifier face and can be copied. */
  const rows: {
    label: keyof typeof caseDetails;
    value: string;
    idLabel?: string;
  }[] = [
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
    ...(extended ? ([{ label: "court", value: joinCase.court }] as const) : []),
    { label: "chequeAmount", value: joinCase.chequeAmount },
    { label: "complainant", value: joinCase.complainant },
    { label: "complainantAdvocate", value: joinCase.complainantAdvocate },
    {
      label: "accusedParties",
      value: joinCase.accused.map((party) => party.name).join(", "),
    },
    ...(extended
      ? ([{ label: "accusedAdvocate", value: joinCase.accusedAdvocate }] as const)
      : []),
  ];
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-surface-sunken p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <Badge variant="default" className="self-start">{pick(caseDetails.caseTypeBadge, locale)}</Badge>
        <CaseTitleWithOthers joinCase={joinCase} locale={locale} />
        {compact ? (
          <p className="text-body-compact text-muted-foreground">
            {pick(caseDetails.caseNumber, locale)}:{" "}
            <Identifier value={joinCase.caseNumber} label="case number" />
          </p>
        ) : null}
      </div>

      {/* Where and when — the two facts a summoned person acts on. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">
              {pick(caseDetails.hearing, locale)}
            </p>
            {/* One token down on phones — at title-s the date wraps to three lines in
                the join modal and dwarfs the case title it sits under. */}
            <p className="text-body font-semibold text-pretty md:text-title-s">{joinCase.hearingDate}</p>
          </div>
        </div>
      </div>

      {compact ? null : (
        <DescriptionList className="border-t border-border pt-1">
          {rows.map((row) => (
            <DescriptionRow
              key={row.label}
              className={cn(
                "border-hairline",
                row.label === "complainantAdvocate" && "items-center",
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
                ) : (
                  row.value
                )}
              </DescriptionDetails>
            </DescriptionRow>
          ))}
        </DescriptionList>
      )}
    </div>
  );
}
