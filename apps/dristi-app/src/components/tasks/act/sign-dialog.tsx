"use client";

/**
 * Signing one task: which instrument, then that instrument doing its one job.
 *
 * The same question the complaint's signing window asks, in the same cards — Aadhaar OTP
 * or the advocate's own DSC — so an advocate is asked it one way wherever they sign.
 * The DSC card says what this computer has before it is pressed; pressing it shows the
 * rest (not set up, no token, signing, refused) in `DscStatus`, with Aadhaar always one
 * step away.
 */

import * as React from "react";
import { ShieldCheckIcon, SignatureIcon } from "lucide-react";

import { signWithDsc, useDscCheck } from "@/lib/signing/dsc";
import type { Person } from "@/lib/tasks/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { ChoiceCard } from "@/components/signing/choice-card";
import { DscAvailabilityBadge, DscStatus, type DscPhase } from "@/components/signing/dsc-status";
import { OtpForm } from "@/components/tasks/act/shared";

type Stage = "choose" | "otp" | "dsc";

export function SignDialog({
  open,
  onOpenChange,
  signer,
  onSign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signer: Person;
  /** The signature is in; `with` says what made it. */
  onSign: (withInstrument: "aadhaar" | "dsc") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FlowDialogContent className="sm:max-w-md">
        {/* Mounted per open, so every signing starts at the choice. */}
        {open ? <SignStages signer={signer} onSign={onSign} /> : null}
      </FlowDialogContent>
    </Dialog>
  );
}

function SignStages({
  signer,
  onSign,
}: {
  signer: Person;
  onSign: (withInstrument: "aadhaar" | "dsc") => void;
}) {
  const [stage, setStage] = React.useState<Stage>("choose");
  const [attempt, setAttempt] = React.useState<"idle" | "signing" | "failed">("idle");
  const dsc = useDscCheck({ enabled: stage !== "otp" });
  const phase: DscPhase = attempt === "idle" ? dsc.check : { state: attempt };

  /* A stage swap replaces the content wholesale; focus goes to its title so the
     change is announced and Tab starts from the top. */
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [stage]);

  const signDsc = async () => {
    setAttempt("signing");
    const result = await signWithDsc();
    if (result === "signed") onSign("dsc");
    else setAttempt("failed");
  };

  const back = () => {
    setAttempt("idle");
    setStage("choose");
  };

  if (stage === "otp") {
    return (
      <OtpForm
        signer={signer}
        onSign={() => onSign("aadhaar")}
        onBack={back}
      />
    );
  }

  if (stage === "dsc") {
    const canSign =
      phase.state === "ready" || phase.state === "failed" || phase.state === "signing";
    return (
      <>
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
            Sign with your DSC
          </DialogTitle>
          <DialogDescription>
            Signed as{" "}
            <strong className="font-semibold text-foreground">{signer.name}</strong>. Your
            DSC token has to be plugged in, with the signing software running on this
            computer.
          </DialogDescription>
        </DialogHeader>
        <DscStatus
          phase={phase}
          holder={signer.name}
          onRecheck={dsc.recheck}
          onUseAadhaar={
            phase.state === "signing"
              ? undefined
              : () => {
                  setAttempt("idle");
                  setStage("otp");
                }
          }
        />
        {canSign ? (
          <Button
            size="lg"
            className="w-full"
            disabled={phase.state === "signing"}
            aria-busy={phase.state === "signing" || undefined}
            onClick={() => void signDsc()}
          >
            {phase.state === "signing"
              ? "Signing…"
              : phase.state === "failed"
                ? "Try again"
                : "Sign with this DSC"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={phase.state === "signing"}
          onClick={back}
        >
          Choose another way
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
          How will you sign?
        </DialogTitle>
        <DialogDescription>
          Signed as <strong className="font-semibold text-foreground">{signer.name}</strong>.
          Either one is your own signature — use whichever you have.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <ChoiceCard
          title="Aadhaar OTP"
          tone="bg-info-muted text-info-muted-foreground"
          icon={<SignatureIcon className="size-5" />}
          onClick={() => setStage("otp")}
        >
          A six-digit code goes to the mobile number registered with your Aadhaar.
        </ChoiceCard>
        <ChoiceCard
          title="DSC"
          badge={<DscAvailabilityBadge check={dsc.check} />}
          tone="bg-brand-muted text-brand-muted-foreground"
          icon={<ShieldCheckIcon className="size-5" />}
          onClick={() => {
            setAttempt("idle");
            setStage("dsc");
          }}
        >
          Uses the certificate on your token. You&rsquo;ll be asked for its PIN.
        </ChoiceCard>
      </div>
    </>
  );
}
