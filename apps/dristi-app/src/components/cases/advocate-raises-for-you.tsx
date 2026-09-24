"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PANEL_CLASS } from "@/components/filing/form-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApplicationViewer } from "@/lib/cases/application-access";
import { displayName } from "@/lib/cases/names";
import { caseSectionHref } from "@/lib/cases/sections";
import { counselFor, type CaseRecord } from "@/lib/cases/types";
import { initialsOf } from "@/lib/filing/profile";
import { cn } from "@/lib/utils";

/**
 * Raise application, for someone the PRD does not let raise one: a litigant
 * with an advocate, or a PoA holder ("Users and actions": they pay for what
 * is filed on their behalf and see what is submitted; drafting and signing
 * are the advocate's). It used to be a dashed empty state saying only "Your
 * advocate raises applications for you" (owner, Sept 24: "extremely low
 * effort").
 *
 * It answers what the person came with: who raises it instead, by name; what
 * to do about that (tell them); and where the result turns up, including the
 * fee if it is left to them. Fees are not listed here: Needs attention on the
 * Applications tab already holds them, and a second list only repeated it
 * (owner, Sept 24).
 */
export function AdvocateRaisesForYou({
  record,
  viewer,
}: {
  record: CaseRecord;
  viewer: ApplicationViewer;
}) {
  const advocates = counselFor(record, viewer.side).map(displayName);
  const poa = viewer.role === "poa-holder";
  const party = record.parties[viewer.side];
  const forWhom = poa ? party : "you";
  const one = advocates.length === 1;

  const heading = one
    ? `${advocates[0]} raises applications for ${forWhom}`
    : advocates.length > 1
      ? `${poa ? `${party}'s advocates` : "Your advocates"} raise applications for ${forWhom}`
      : `${poa ? `${party}'s advocate` : "Your advocate"} raises applications for ${forWhom}`;
  const steps = [
    `Tell ${one ? advocates[0] : poa ? `${party}'s advocate` : "your advocate"} what ${poa ? `${party} needs` : "you need"} from the court.`,
    one
      ? "They draft the application, sign it and file it."
      : "Your advocate drafts the application, signs it and files it.",
    "It shows on this case's Applications tab. If the court fee is left to you, it waits there under Needs attention.",
  ];

  return (
    <Card className={cn(PANEL_CLASS, "max-w-2xl")}>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {advocates.length > 0 ? (
            <div className="flex -space-x-2">
              {advocates.map((name) => (
                <Avatar
                  key={name}
                  size="lg"
                  className="ring-2 ring-card"
                  title={name}
                >
                  <AvatarFallback className="text-body-compact font-medium">
                    {initialsOf(name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <h2 className="text-title-s font-semibold text-foreground">
              {heading}
            </h2>
            {advocates.length > 1 ? (
              <p className="text-body-compact text-foreground">
                {advocates.join(", ")}
              </p>
            ) : null}
            <p className="text-body-compact text-muted-foreground">
              {poa
                ? `You hold ${party}'s power of attorney. On this case, only an advocate drafts and signs an application.`
                : "On this case, only an advocate drafts and signs an application."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-6">
          <p className="text-caption font-medium text-muted-foreground">
            What happens
          </p>
          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-medium text-secondary-foreground tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 text-body-compact text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Button variant="outline" className="self-start max-sm:w-full" asChild>
          <Link href={caseSectionHref(record.id, "applications")}>
            Go to Applications
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
