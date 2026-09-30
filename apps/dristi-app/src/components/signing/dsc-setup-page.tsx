"use client";

/**
 * **Set up DSC signing — once per computer, and the page says when it has worked.**
 *
 * An advocate who wants to sign with their Digital Signature Certificate needs two things
 * on the computer they sign from: the signing software, and their DSC token plugged in.
 * The page gives them both halves (the download, and a setup guide for the steps between)
 * and then answers the question they actually have — *is it working?* — by asking the
 * computer, live, rather than asking them to tick "I've installed it". The same answer is
 * what switches DSC on as a signing option everywhere else (see `lib/signing/dsc`).
 *
 * Court users do not come here: their certificates are supplied and DSC is on for them.
 *
 * The download and the guide are placeholders until engineering publishes them; the exact
 * installation steps are not known yet, so the page does not guess at them.
 */

import * as React from "react";
import { CircleCheckIcon, FileTextIcon } from "lucide-react";

import {
  DSC_GUIDE_PDF_HREF,
  DSC_SOFTWARE_HREF,
  useDscCheck,
  useDscSandbox,
  writeDscSandbox,
  type DscCheck,
  type DscSandbox,
} from "@/lib/signing/dsc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { PageBackButton, PAGE_BACK_COLUMN, PAGE_BACK_ROW } from "@/components/shell/page-back-button";
import { PAGE_GROUND, PAGE_GUTTER, PAGE_SUBTITLE, PAGE_TITLE } from "@/components/shell/page-frame";

const HEADING = "text-title-s font-semibold";

export function DscSetupPage() {
  const { check, recheck } = useDscCheck();

  return (
    <main className={cn("flex flex-1 flex-col", PAGE_GROUND, PAGE_GUTTER)}>
      {/* One centred reading column: heading and cards share its edges. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className={PAGE_BACK_ROW}>
          <span className={PAGE_BACK_COLUMN}>
            <PageBackButton href="/settings" label="Back to settings" />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className={cn(PAGE_TITLE, "text-balance")}>Set up DSC signing</h1>
            <p className={PAGE_SUBTITLE}>
              Sign documents with your Digital Signature Certificate (DSC) instead of an
              Aadhaar OTP. You set this up once on each computer you sign from.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <ComputerStatus check={check} onRecheck={recheck} />

          <Card>
            <CardContent className="flex flex-col gap-6">
              <h2 className={HEADING}>How to set it up</h2>
              <ol className="flex flex-col gap-6">
                <Step n={1} title="Download the signing software">
                  <p>
                    Install it on this computer. It signs documents with the certificate on
                    your DSC token, and asks for the token&rsquo;s PIN in its own window.
                  </p>
                  <div className="flex flex-col items-start gap-2">
                    <Button asChild>
                      <a href={DSC_SOFTWARE_HREF}>Download signing software</a>
                    </Button>
                    <p className="text-caption text-muted-foreground">
                      Placeholder — the download will be linked here.
                    </p>
                  </div>
                </Step>

                <Step n={2} title="Follow the setup guide">
                  <p>The guide takes you through installing the software step by step.</p>
                  <div className="flex flex-col items-start gap-2">
                    <Button asChild variant="outline">
                      <a href={DSC_GUIDE_PDF_HREF} target="_blank" rel="noopener">
                        <FileTextIcon data-icon="inline-start" aria-hidden />
                        Open setup guide (PDF)
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Button>
                    <p className="text-caption text-muted-foreground">
                      Placeholder — the guide will be linked here.
                    </p>
                  </div>
                </Step>

                <Step n={3} title="Plug in your DSC token">
                  <p>
                    Keep it plugged in whenever you sign. We check this computer each time
                    you choose DSC, so there is nothing to confirm here.
                  </p>
                </Step>
              </ol>
            </CardContent>
          </Card>

          <SandboxControls />
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────────── This computer ───────────────────────────── */

/**
 * The answer to "is it working?", from the computer. It sits above the steps because it
 * is the first thing a returning advocate looks for, and the steps are only needed when
 * it says no.
 */
function ComputerStatus({ check, onRecheck }: { check: DscCheck; onRecheck: () => void }) {
  const copy = STATUS_COPY[check.state];
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={HEADING}>This computer</h2>
            {check.state === "checking" ? null : (
              <Badge variant={check.state === "ready" ? "success" : "warning"}>
                {check.state === "ready" ? <CircleCheckIcon aria-hidden /> : null}
                {copy.chip}
              </Badge>
            )}
          </div>
          <p aria-live="polite" className="flex items-center gap-2 text-body-compact text-muted-foreground">
            {check.state === "checking" ? <Spinner className="size-4 shrink-0" aria-hidden /> : null}
            {copy.line}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 self-start"
          disabled={check.state === "checking"}
          onClick={onRecheck}
        >
          Check again
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUS_COPY: Record<DscCheck["state"], { chip: string; line: string }> = {
  checking: { chip: "", line: "Looking for the signing software and your DSC…" },
  ready: {
    chip: "Ready to sign",
    line: "The signing software and your DSC were found. DSC now appears as a signing option wherever you sign.",
  },
  "no-software": {
    chip: "Not set up",
    line: "The signing software wasn't found on this computer. Follow the steps below, then check again.",
  },
  "no-certificate": {
    chip: "Token not found",
    line: "The signing software is running, but no DSC token is plugged in. Plug it in, then check again.",
  },
};

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-body-compact font-semibold text-secondary-foreground tabular-nums"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-body-compact text-muted-foreground">
        <h3 className="text-body font-semibold text-foreground">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        {children}
      </div>
    </li>
  );
}

/* ───────────────────────────── Sandbox ─────────────────────────────────── */

const SANDBOX_SWITCHES: { key: keyof DscSandbox; label: string; hint: string }[] = [
  {
    key: "software",
    label: "Signing software installed",
    hint: "Off shows the not-set-up state wherever DSC is offered.",
  },
  {
    key: "token",
    label: "DSC token plugged in",
    hint: "Off shows the token-not-found state.",
  },
  {
    key: "failNext",
    label: "Next signature fails",
    hint: "The next DSC signature is refused, then this turns itself off.",
  },
];

/**
 * There is no signing software yet, so this stands in for the computer. It is labelled
 * as the sandbox it is, and sits last, below everything a real advocate would read.
 */
function SandboxControls() {
  const sandbox = useDscSandbox();
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={HEADING}>Sandbox</h2>
          <p className="text-body-compact text-muted-foreground">
            There is no signing software behind this yet. These switches stand in for this
            computer so every state can be seen.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface-sunken px-4">
          {SANDBOX_SWITCHES.map((s) => {
            const id = `dsc-sandbox-${s.key}`;
            return (
              <li key={s.key} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Label htmlFor={id} className="text-body-compact font-medium">
                    {s.label}
                  </Label>
                  <p id={`${id}-hint`} className="text-body-compact text-muted-foreground">
                    {s.hint}
                  </p>
                </div>
                <Switch
                  id={id}
                  aria-describedby={`${id}-hint`}
                  checked={sandbox[s.key]}
                  onCheckedChange={(on) => writeDscSandbox({ [s.key]: on })}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
