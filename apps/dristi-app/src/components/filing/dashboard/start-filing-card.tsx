"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRightIcon, CreditCardIcon, FilePlusIcon } from "lucide-react";

import { CASE_TYPE, PSS_CASE_TYPE } from "@/lib/filing/options";
import { NEW_FILING, NEW_PSS_FILING } from "@/lib/filing/steps";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PANEL_CLASS } from "@/components/filing/form-card";

/**
 * One case type a filing can start from: what it is on the left, a real Start button on
 * the right. The rows used to be tinted links with a chevron, which read as notices
 * rather than as the way in (owner, 2026-10-09: "it's not very apparent to me that those
 * are the buttons to start a new filing"). Rows are ruled apart, not filled, so the
 * button is the only thing on them asking to be pressed.
 */
function CaseTypeRow({
  href,
  icon: Icon,
  title,
  caption,
  soon,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  caption: React.ReactNode;
  soon?: boolean;
  primary?: boolean;
}) {
  const id = React.useId();
  return (
    <Item variant="outline" role="listitem" className="hover:bg-card">
      <ItemMedia variant="icon" className="text-muted-foreground">
        <Icon aria-hidden />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle
          id={id}
          className="line-clamp-none flex-wrap text-body-compact font-semibold break-words"
        >
          {title}
          {soon ? <Badge variant="secondary">Coming soon</Badge> : null}
        </ItemTitle>
        <ItemDescription className="text-body-compact">{caption}</ItemDescription>
      </ItemContent>
      <ItemActions className="w-full sm:w-auto">
        <Button
          asChild
          size="sm"
          variant={primary ? "default" : "outline"}
          className="w-full sm:w-auto"
        >
          <Link href={href} aria-describedby={id}>
            Start filing
          </Link>
        </Button>
      </ItemActions>
    </Item>
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

      <CardContent className="pt-4">
        <ItemGroup role="list" className="gap-2">
        <CaseTypeRow
          href={NEW_FILING}
          icon={CreditCardIcon}
          title={CASE_TYPE.title}
          primary
          caption={
            /* A zero here is noise — "0 filed by you" tells nobody anything. */
            filedCount ? (
              <>
                Dishonoured cheques · <span className="tabular-nums">{filedCount}</span>{" "}
                filed by you · about 40 minutes
              </>
            ) : (
              "Dishonoured cheques · about 40 minutes"
            )
          }
        />
        <CaseTypeRow
          href={NEW_PSS_FILING}
          icon={ArrowLeftRightIcon}
          title={PSS_CASE_TYPE.title}
          caption="Dishonoured electronic transfers"
          soon
        />
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
