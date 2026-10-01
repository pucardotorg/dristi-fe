"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;

/**
 * The six-box code field as the product uses it — masked at rest, full width, 48px
 * tall — shared by sign-in and registration so the two cannot drift.
 *
 * Masking, without touching the primitive. `InputOTPSlot` renders the character it
 * reads off the OTP context and takes no children, so the digits are made transparent
 * and a matching row of marks is laid over the group — same six equal cells, so they
 * land dead centre. The caret is drawn separately and survives, and the real value is
 * never re-encoded, so paste and SMS autofill still work.
 *
 * The mark is an asterisk (owner, Sept 11) — the mask people read as "hidden" — sized
 * large enough to read at arm's length in a 48px box. The glyph sits high in its em, so
 * a small downward nudge lands its optical centre on the slot's centre; `translate` is
 * the only free lever here and stays off the padding/margin ladder the gate polices.
 */
export function MaskedOtp({
  value,
  onChange,
  revealed,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  revealed: boolean;
  className?: string;
}) {
  return (
    <InputOTP
      maxLength={OTP_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      containerClassName={cn("flex-1", className)}
    >
      {/* The system ships slots at 32px — under its own 40×40 floor, and a third
          narrower than every other control on the page. Widened to fill and matched
          to the tab strip's height. */}
      <InputOTPGroup className="relative w-full">
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              "h-12 w-auto flex-1 text-body font-semibold",
              !revealed && "text-transparent"
            )}
          />
        ))}
        {!revealed ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center">
            {Array.from({ length: OTP_LENGTH }, (_, index) => (
              <span key={index} className="flex flex-1 items-center justify-center">
                {index < value.length ? (
                  <span className="translate-y-[0.22em] text-title font-semibold leading-none text-foreground">
                    *
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </InputOTPGroup>
    </InputOTP>
  );
}
