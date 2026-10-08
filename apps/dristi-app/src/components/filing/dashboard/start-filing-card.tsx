"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRightIcon, ChevronRightIcon, CreditCardIcon, FilePlusIcon } from "lucide-react";

import { CASE_TYPE, PSS_CASE_TYPE } from "@/lib/filing/options";
import { NEW_FILING, NEW_PSS_FILING } from "@/lib/filing/steps";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PANEL_CLASS } from "@/components/filing/form-card";

/**
 * One row per case type DRISTI lists. The row and its icon tile carry 12px of their own
 * padding; pulled out by the same 12px, their icon and label stand on the header icon's
 * edge.
 */
function CaseTypeRow({
  href,
  icon: Icon,
  title,
  caption,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  caption: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group -mx-3 flex items-center gap-3 rounded-lg bg-brand-muted/50 p-3 ring-1 ring-transparent transition-[background-color,box-shadow] ring-inset hover:bg-brand-muted/75 hover:ring-primary/40 active:bg-brand-muted/75 active:ring-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-brand-muted-foreground"
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-caption text-muted-foreground">{caption}</span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-4.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/**
 * The case types a filing can start from: cheque bounce, which files today, and the PSS
 * Act, which opens a placeholder until its flow is built. The list of twenty case types
 * not on DRISTI is gone (owner, 2026-10-08).
 *
 * `filedCount` is the person's own filed cheque-bounce complaints — a real number off
 * their drafts, not the wireframe's "128 filed by you", which had no source.
 */
export function StartFilingCard({ filedCount }: { filedCount: number | null }) {
  return (
    <Card className={cn(PANEL_CLASS, "gap-0")}>
      <CardHeader className="flex flex-row items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground"
        >
          <FilePlusIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-body font-semibold">Start a new filing</CardTitle>
          <CardDescription className="text-body-compact">
            Step by step: parties, documents, then the court fee.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pt-4">
        <CaseTypeRow
          href={NEW_FILING}
          icon={CreditCardIcon}
          title={CASE_TYPE.title}
          caption={
            /* A zero here is noise — "0 filed by you" tells nobody anything. */
            filedCount ? (
              <>
                <span className="tabular-nums">{filedCount}</span> filed by you · takes about
                40 minutes
              </>
            ) : (
              "Takes about 40 minutes"
            )
          }
        />
        <CaseTypeRow
          href={NEW_PSS_FILING}
          icon={ArrowLeftRightIcon}
          title={PSS_CASE_TYPE.title}
          caption="Coming soon"
        />
      </CardContent>
    </Card>
  );
}
