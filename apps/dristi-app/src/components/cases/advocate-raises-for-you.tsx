"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClockIcon } from "lucide-react";

import { PANEL_CLASS } from "@/components/filing/form-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import type { ApplicationViewer } from "@/lib/cases/application-access";
import {
  applicationsRegister,
  expiringSoon,
  type ApplicationRecord,
} from "@/lib/cases/application-record";
import { caseSectionHref } from "@/lib/cases/sections";
import { FIXTURE_TODAY } from "@/lib/cases/fixtures";
import { displayName } from "@/lib/cases/names";
import {
  parseSavedDrafts,
  savedDraftSubmission,
  savedDraftsKey,
} from "@/lib/cases/saved-application-drafts";
import { counselFor, type CaseRecord } from "@/lib/cases/types";
import { initialsOf } from "@/lib/filing/profile";

/**
 * Raise application, for someone the PRD does not let raise one: a litigant
 * with an advocate, or a PoA holder ("Users and actions": they pay for what
 * is filed on their behalf and see what is submitted; drafting is the
 * advocate's). It used to be a dashed empty state saying only "Your advocate
 * raises applications for you" (owner, Sept 24: "extremely low effort").
 *
 * So it answers the three things the person came with: who raises it
 * instead (named, not "your advocate"), what to do about that (ask them),
 * and what they can do here (pay the fee on anything filed for them).
 */
export function AdvocateRaisesForYou({
  record,
  viewer,
}: {
  record: CaseRecord;
  viewer: ApplicationViewer;
}) {
  const savedRaw = useLocalStorageValue(savedDraftsKey(record.id));
  const payable = useMemo(() => {
    try {
      return applicationsRegister(record, {
        viewer,
        today: FIXTURE_TODAY,
        saved: parseSavedDrafts(savedRaw).map(savedDraftSubmission),
      }).applications.filter((item) => item.step === "pay");
    } catch {
      return [];
    }
  }, [record, viewer, savedRaw]);

  const advocates = counselFor(record, viewer.side).map(displayName);
  const poa = viewer.role === "poa-holder";
  const party = record.parties[viewer.side];
  const applicationsHref = caseSectionHref(record.id, "applications");

  /* Two short panels of prose and a row or two: at the chooser's full width
     the lines ran the length of the screen. */
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className={PANEL_CLASS}>
        <CardHeader>
          <CardTitle className="text-body font-semibold">
            {poa
              ? `${party}'s advocate raises applications`
              : "Your advocate raises applications for you"}
          </CardTitle>
          <CardDescription className="text-body-compact">
            {poa
              ? `You hold ${party}'s power of attorney. On this case, applications are drafted and signed by the advocate. Tell them what ${party} needs from the court.`
              : "On this case, applications are drafted and signed by your advocate. Tell them what you need from the court."}
          </CardDescription>
        </CardHeader>
        {advocates.length > 0 ? (
          <CardContent>
            <ul className="flex flex-col divide-y divide-hairline">
              {advocates.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-caption font-medium">
                      {initialsOf(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-body-compact font-medium text-foreground">
                      {name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {poa ? `Advocate for ${party}` : "Your advocate"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <Card className={PANEL_CLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-body font-semibold">
            Court fees to pay
            {payable.length > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {payable.length}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription className="text-body-compact">
            {poa
              ? `You can pay the fee on an application filed for ${party}. Paying submits it to the court.`
              : "You can pay the fee on an application your advocate filed for you. Paying submits it to the court."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payable.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {payable.map((application) => (
                <PayRow
                  key={application.id}
                  application={application}
                  href={`${applicationsHref}&application=${encodeURIComponent(application.id)}`}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-surface-sunken px-3 py-2.5 text-body-compact text-muted-foreground">
              Nothing to pay right now.
            </p>
          )}
          {/* Under the list, not in the header's corner: on a phone the
              corner link squeezed the description into a narrow column. */}
          <Button
            variant="link"
            size="sm"
            className="h-auto self-start px-0"
            asChild
          >
            <Link href={applicationsHref}>
              See all applications on this case
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** One application waiting on the fee: the Needs attention row's facts. */
function PayRow({
  application,
  href,
}: {
  application: ApplicationRecord;
  href: string;
}) {
  const days = application.expiresInDays;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:basis-full">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-compact font-medium text-foreground">
          {application.typeLabel}
          <Badge variant={application.statusVariant}>
            {application.statusLabel}
          </Badge>
        </span>
        {/* Who, then when: one line on a wide screen, two on a phone, so
            a line never breaks on its own separator. */}
        <p className="flex flex-col gap-1 text-caption font-medium text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1">
          <span>Filed by {application.filedBy}</span>
          <span aria-hidden className="max-sm:hidden">
            ·
          </span>
          <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="tabular-nums">Created {application.created}</span>
            {expiringSoon(application) && days !== undefined ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                  <ClockIcon className="size-3.5 shrink-0" aria-hidden />
                  {`Expires ${days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`}
                </span>
              </>
            ) : null}
          </span>
        </p>
      </div>
      <Button size="sm" className="max-sm:h-10 max-sm:w-full" asChild>
        <Link href={href}>
          Pay court fee
          <span className="sr-only">: {application.typeLabel}</span>
        </Link>
      </Button>
    </li>
  );
}
