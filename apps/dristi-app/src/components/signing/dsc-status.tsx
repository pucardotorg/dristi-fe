"use client";

/**
 * **What the computer said about the DSC, and the one thing to do about it.**
 *
 * There is no DSC signing interface in the product: once DSC is chosen, the signing
 * software on the advocate's machine does the signing, including asking for the token's
 * PIN in its own window. What the product owns is everything around that hand-off —
 * whether the software is there, whether a certificate is, what happened when it was
 * asked to sign — and this panel is that, in one place, so every signing flow says it
 * the same way.
 *
 * Every state that stops a DSC signature offers the way out that does not need one:
 * DSC being unavailable never blocks the signature itself.
 */

import * as React from "react";
import { ShieldCheckIcon } from "lucide-react";

import { DSC_SETUP_HREF, type DscCheck } from "@/lib/signing/dsc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SectionNotice } from "@/components/filing/notices";

export type DscPhase =
  | DscCheck
  | { state: "signing" }
  | { state: "failed" };

export function DscStatus({
  phase,
  holder,
  onRecheck,
  onUseAadhaar,
}: {
  phase: DscPhase;
  /** The name the certificate carries — the signer's own. */
  holder: string;
  onRecheck: () => void;
  /** The other instrument, offered wherever DSC cannot go ahead. */
  onUseAadhaar?: () => void;
}) {
  const fallback = onUseAadhaar ? (
    <Button type="button" variant="link" className="h-auto p-0" onClick={onUseAadhaar}>
      Sign with Aadhaar OTP instead
    </Button>
  ) : null;

  return (
    /* One live region for every state, and a held height so the footer does not jump
       between "looking" and an answer. */
    <div aria-live="polite" className="flex min-h-20 flex-col justify-center gap-3">
      {phase.state === "checking" ? (
        <Waiting>Looking for your DSC on this computer&hellip;</Waiting>
      ) : phase.state === "signing" ? (
        <Waiting>
          Waiting for the signing software. Enter your token PIN in its window.
        </Waiting>
      ) : phase.state === "ready" ? (
        <div className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-4">
          <ShieldCheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-success-ink" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body-compact font-medium [overflow-wrap:anywhere]">
              {holder || "Your certificate"}
            </p>
            <p className="text-body-compact text-muted-foreground">
              Read from the DSC token plugged into this computer.
            </p>
            <p className="text-body-compact text-muted-foreground">
              Sandbox — no certificate is read.
            </p>
          </div>
        </div>
      ) : phase.state === "no-software" ? (
        <>
          <SectionNotice variant="warning" title="DSC isn't set up on this computer">
            Install the signing software once and plug in your DSC token. You can then
            sign with it here.
          </SectionNotice>
          <Actions>
            <Button asChild variant="outline">
              <a href={DSC_SETUP_HREF} target="_blank" rel="noopener">
                Set up DSC
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <Button type="button" variant="ghost" onClick={onRecheck}>
              Check again
            </Button>
          </Actions>
          {fallback}
        </>
      ) : phase.state === "no-certificate" ? (
        <>
          <SectionNotice variant="warning" title="No DSC token found">
            The signing software is running, but no certificate was found. Plug in your
            DSC token, then check again.
          </SectionNotice>
          <Actions>
            <Button type="button" variant="outline" onClick={onRecheck}>
              Check again
            </Button>
          </Actions>
          {fallback}
        </>
      ) : (
        <>
          <SectionNotice
            variant="destructive"
            announce="assertive"
            title="The document wasn't signed"
          >
            The signing software didn&rsquo;t apply a signature, so nothing was signed.
            Try again, or sign another way.
          </SectionNotice>
          {fallback}
        </>
      )}
    </div>
  );
}

function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-body-compact text-muted-foreground">
      <Spinner className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

/**
 * The DSC card's pill, before it is pressed: what the computer has said so far. Each
 * tint carries its own solid as a stroke, because the card it sits on tints on hover.
 * Pressing the card is allowed in every state — the step behind it is where "not set
 * up" gets its way forward.
 */
export function DscAvailabilityBadge({ check }: { check: DscCheck }) {
  return (
    <span aria-live="polite" className="inline-flex">
      {check.state === "checking" ? (
        <Badge variant="outline">
          <Spinner aria-hidden />
          Checking
        </Badge>
      ) : check.state === "ready" ? (
        <Badge variant="success" className="border-success">
          Available
        </Badge>
      ) : (
        <Badge variant="warning" className="border-warning">
          {check.state === "no-certificate" ? "Token not found" : "Not set up"}
        </Badge>
      )}
    </span>
  );
}
