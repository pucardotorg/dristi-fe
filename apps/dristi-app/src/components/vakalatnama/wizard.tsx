"use client";

/**
 * The vakalatnama wizard: a stepped flow over one persisted draft. The stepper is the
 * spine (spec §13.2); each step is a screen; the sticky footer carries Back / Continue.
 * The current step lives on the draft, so a reload reopens where the person left off.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { Breadcrumbs } from "@/components/shell/chrome";
import { Button } from "@/components/ui/button";
import { CENTRED_STEPPER, STEP_CAPTION } from "@/components/chrome/stepper-layout";
import { Stepper, StepperItem } from "@/components/ui/stepper";
import { updateVak, useVak } from "@/lib/vakalatnama/store";
import { reconcileSigners } from "@/lib/vakalatnama/signers";
import type { Vakalatnama } from "@/lib/vakalatnama/types";

import { ExecutantStep } from "./steps/executant";
import { AdvocatesStep } from "./steps/advocates";
import { ScopeStep } from "./steps/scope";
import { AttestationStep } from "./steps/attestation";
import { ReviewSignStep } from "./steps/review-sign";
import { FeesStep } from "./steps/fees";

export type StepProps = { vak: Vakalatnama };

const STEPS: { key: string; title: string; render: (p: StepProps) => React.ReactNode }[] = [
  { key: "executant", title: "Litigant", render: (p) => <ExecutantStep {...p} /> },
  { key: "advocates", title: "Advocates", render: (p) => <AdvocatesStep {...p} /> },
  { key: "scope", title: "Scope", render: (p) => <ScopeStep {...p} /> },
  { key: "attestation", title: "Witness", render: (p) => <AttestationStep {...p} /> },
  { key: "review-sign", title: "Review & sign", render: (p) => <ReviewSignStep {...p} /> },
  { key: "fees", title: "Fees", render: (p) => <FeesStep {...p} /> },
];

const LAST = STEPS.length - 1;

export function VakalatnamaWizard({ id }: { id: string }) {
  const router = useRouter();
  const vak = useVak(id);

  if (!vak) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-body text-muted-foreground">
        This vakalatnama isn’t in this browser.
      </div>
    );
  }

  const step = Math.min(vak.step, LAST);
  const go = (next: number) => updateVak(id, { step: Math.max(0, Math.min(next, LAST)) });

  const active = STEPS[step];
  const executed = vak.status === "executed";

  // The review-and-sign step gates on every party having signed.
  const signers = reconcileSigners(vak);
  const allSigned = signers.length > 0 && signers.every((s) => s.state === "signed");
  const onReviewSign = active.key === "review-sign";
  const continueBlocked = onReviewSign && !allSigned;
  const continueLabel = onReviewSign ? "Continue to fees" : "Continue";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Vakalatnama › New vakalatnama, so the trail links back to the list. The steps
          are views of this one page; the stepper names them, the trail does not. */}
      <Breadcrumbs crumbs={[{ label: "New vakalatnama" }]} />
      {/* Content flows; the page body scrolls (the app pattern). */}
      <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-title font-semibold tracking-tight">New vakalatnama</h1>
            <p className="text-body text-muted-foreground">
              Appoint one or more advocates for a litigant, for one case or all cases.
            </p>
          </header>

          {/* Registration's stepper, the product's one journey stepper (owner,
              Sept 21). Below `md` the names give way to one line for the step. */}
          <div>
            <Stepper
              className={CENTRED_STEPPER}
              aria-label={`Step ${step + 1} of ${STEPS.length}`}
            >
              {STEPS.map((s, i) => (
                <StepperItem
                  key={s.key}
                  step={i + 1}
                  title={s.title}
                  status={i < step ? "complete" : i === step ? "current" : "upcoming"}
                  onActivate={i <= step && !executed ? () => go(i) : undefined}
                />
              ))}
            </Stepper>
            <p className={STEP_CAPTION}>
              Step {step + 1} of {STEPS.length}
              {" · "}
              <span className="font-medium text-foreground">{active.title}</span>
            </p>
          </div>

          <div key={active.key}>{active.render({ vak })}</div>
        </div>
      </div>

      {/* Sticky footer — hidden on the terminal Sign screen once executed */}
      {!executed ? (
        <footer className="sticky bottom-0 z-10 border-t border-hairline bg-card">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-12">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? router.push("/vakalatnama") : go(step - 1))}
            >
              <ArrowLeftIcon aria-hidden />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            {step < LAST ? (
              <div className="flex items-center gap-3">
                {continueBlocked ? (
                  <span className="text-caption text-muted-foreground">
                    All parties must sign to continue
                  </span>
                ) : null}
                <Button
                  type="button"
                  onClick={() => go(step + 1)}
                  disabled={continueBlocked}
                >
                  {continueLabel}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </div>
            ) : (
              <span className="text-body-compact text-muted-foreground">
                Pay to complete
              </span>
            )}
          </div>
        </footer>
      ) : (
        <footer className="sticky bottom-0 z-10 border-t border-hairline bg-card">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-4 px-4 py-4 sm:px-6 lg:px-12">
            <Button type="button" onClick={() => router.push("/vakalatnama")}>
              <CheckIcon aria-hidden />
              Done
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
