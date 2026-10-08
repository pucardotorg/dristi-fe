"use client";

/**
 * **Paper, as the way out when e-signing has not worked — never as its equal.**
 *
 * Every signing window in the product used to offer "upload a physically signed copy" as a
 * second card or a second tab, the same size as e-signing. Paper costs everyone more — a
 * printer, a scan, each party's OTP confirmation, a clerk reading handwriting — so the
 * owner asked for it to be discouraged (2026-10-06):
 *
 * - it is reached from a link under the e-sign route, phrased as the problem it solves
 *   ("Unable to e-sign?"), not from a card beside it;
 * - and before any upload opens, the person says what stopped e-signing and confirms, in
 *   plain words, that they cannot e-sign.
 *
 * Both pieces live here so every window asks it the same way. Nothing here writes to a
 * record: the owning window decides what the confirmation unlocks and stores it.
 */

import * as React from "react";

import { PAPER_FALLBACK_REASONS } from "@/lib/filing/options";
import type { PaperFallbackReason } from "@/lib/filing/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChoicePillGroup } from "@/components/cases/filing-form-shared";

/**
 * The way onto the paper path, under the e-sign route. A link-weight button keeps it
 * findable for the person who needs it without competing with the route we want taken;
 * it keeps the control's 40px height, so it is still a full touch target.
 */
export function PaperFallbackLink({ onClick }: { onClick: () => void }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-body-compact text-muted-foreground">
      Unable to e-sign?
      <Button type="button" variant="link" className="px-0 underline" onClick={onClick}>
        Upload a physically signed copy
      </Button>
    </p>
  );
}

/** The reason and the confirmation, together — what the paper path asks for first. */
export type PaperFallbackAnswer = {
  reason: PaperFallbackReason | "";
  confirmed: boolean;
};

export const NO_PAPER_FALLBACK_ANSWER: PaperFallbackAnswer = {
  reason: "",
  confirmed: false,
};

/** Both questions answered — what the window's continue button waits on. */
export function paperFallbackAnswered(
  answer: PaperFallbackAnswer
): answer is { reason: PaperFallbackReason; confirmed: true } {
  return answer.reason !== "" && answer.confirmed;
}

/**
 * The two questions, in the order a person answers them: what went wrong, then the
 * sentence that commits to paper — last, so it sits beside the button it unlocks.
 *
 * The reason is the product's required single choice (`ChoicePillGroup`): every option
 * visible as a pill, real radios underneath. The confirmation is a checkbox whose whole
 * sentence is its label, as the accused step's "no contact details" confirmation is.
 */
export function PaperFallbackQuestion({
  value,
  onChange,
  reasons = PAPER_FALLBACK_REASONS,
}: {
  value: PaperFallbackAnswer;
  onChange: (next: PaperFallbackAnswer) => void;
  /** A window with one signer drops "A party did not respond" — there is nobody else. */
  reasons?: readonly { id: PaperFallbackReason; label: string }[];
}) {
  const checkboxId = React.useId();
  return (
    <div className="flex flex-col rounded-xl border border-hairline bg-card">
      <div className="p-4">
        <ChoicePillGroup
          legend="What stopped e-signing?"
          options={reasons}
          value={value.reason}
          onChange={(reason) => onChange({ ...value, reason })}
        />
      </div>
      <Label
        htmlFor={checkboxId}
        className="items-start gap-3 border-t border-hairline p-4 text-body font-normal text-foreground"
      >
        <Checkbox
          id={checkboxId}
          checked={value.confirmed}
          onCheckedChange={(checked) => onChange({ ...value, confirmed: checked === true })}
          className="mt-0.5"
        />
        {/* Wraps to several lines — the Label's own leading-none would collide. */}
        <span className="leading-normal">
          I confirm I am unable to e-sign and am continuing with a physical upload.
        </span>
      </Label>
    </div>
  );
}
