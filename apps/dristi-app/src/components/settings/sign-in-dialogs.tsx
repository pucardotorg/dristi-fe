"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { MaskedOtp, OTP_LENGTH } from "@/components/registration/masked-otp";
import { useLocale } from "@/components/shell/locale";
import { SettingsDialog, fillText } from "@/components/settings/settings-parts";
import { pick } from "@/lib/onboarding/content";
import { passwordProblem } from "@/lib/registration/password-policy";
import { contactStep, passwordStep } from "@/lib/registration/content";
import { today, updateAccount, type AccountState } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 30;
const DIGITS = /\D/g;
const REQUIRED = <span className="text-destructive">*</span>;

/** "+91 80094 60966": the way the product reads a mobile number back. */
export function formatMobile(mobile: string): string {
  return mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : `+91 ${mobile}`;
}

/**
 * The code check registration uses, as one piece: the sunken well, the six boxes and
 * Verify, then reveal on the left and the resend countdown on the right. Any code of
 * six digits passes, as it does everywhere in the prototype.
 */
function CodeCheck({
  number,
  onVerified,
  invalid,
}: {
  number: string;
  onVerified: () => void;
  invalid?: boolean;
}) {
  const { locale } = useLocale();
  const [code, setCode] = React.useState("");
  const [revealed, setRevealed] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const short = touched && code.length !== OTP_LENGTH;

  return (
    <Field data-invalid={short || invalid} className="rounded-lg bg-surface-sunken p-4">
      <FieldLabel className="sr-only">{pick(contactStep.otpLabel, locale)}</FieldLabel>
      <FieldDescription>{pick(contactStep.otpSent, locale).replace("{number}", number)}</FieldDescription>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <MaskedOtp
          value={code}
          revealed={revealed}
          onChange={(value) => {
            setCode(value);
            setTouched(false);
          }}
        />
        <Button
          type="button"
          className="sm:h-12"
          onClick={() => {
            setTouched(true);
            if (code.length === OTP_LENGTH) onVerified();
          }}
        >
          {pick(contactStep.otpVerify, locale)}
        </Button>
      </div>
      <FieldError>{short ? pick(contactStep.otpError, locale) : null}</FieldError>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          aria-pressed={revealed}
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? <EyeOffIcon data-icon="inline-start" aria-hidden /> : <EyeIcon data-icon="inline-start" aria-hidden />}
          {pick(revealed ? contactStep.otpHide : contactStep.otpShow, locale)}
        </Button>
        {resendIn > 0 ? (
          <p className="text-body-compact whitespace-nowrap text-muted-foreground tabular-nums">
            {pick(contactStep.otpResendIn, locale).replace("{seconds}", String(resendIn))}
          </p>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => {
              setResendIn(RESEND_SECONDS);
              setCode("");
            }}
          >
            {pick(contactStep.otpResend, locale)}
          </Button>
        )}
      </div>
    </Field>
  );
}

function Verified({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-body-compact text-success-ink">
      <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/**
 * Change mobile number: the registration contact step, pointed at a new number. The
 * number is checked by a code sent to it; once saved, it is the sign-in number.
 */
export function ChangeMobileDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
}) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const [mobile, setMobile] = React.useState("");
  const [requested, setRequested] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const same = mobile === account.mobile;
  const numberError =
    mobile.length !== 10 ? pick(contactStep.mobileError, locale) : same ? pick(d.sameNumber, locale) : null;

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (numberError || !verified) return;
    updateAccount(account.key, (state) => ({ ...state, mobile }));
    onOpenChange(false);
    toast(pick(d.mobileSaved, locale), { description: formatMobile(mobile) });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.mobileTitle, locale)}
      initialFocusId="settings-new-mobile"
      description={pick(d.mobileBody, locale)}
      dirty={mobile !== ""}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.cancel, locale)}
          </Button>
          <Button type="submit" form="settings-mobile">
            {pick(d.saveNumber, locale)}
          </Button>
        </>
      }
    >
      <form id="settings-mobile" noValidate className="flex flex-col gap-6" onSubmit={save}>
        <Field>
          <FieldLabel>{pick(d.currentNumber, locale)}</FieldLabel>
          <Input
            value={formatMobile(account.mobile)}
            readOnly
            className="bg-muted text-muted-foreground tabular-nums"
          />
        </Field>

        <Field data-invalid={touched && (Boolean(numberError) || !verified)}>
          <FieldLabel htmlFor="settings-new-mobile">
            {pick(d.newNumber, locale)} {REQUIRED}
          </FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <InputGroup
              className={cn(
                "flex-1",
                requested && "has-disabled:bg-surface-sunken has-disabled:opacity-100 dark:has-disabled:bg-surface-sunken",
              )}
            >
              <InputGroupAddon variant="field">
                <InputGroupText>+91</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="settings-new-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={mobile}
                disabled={requested}
                className={requested ? "disabled:text-foreground disabled:opacity-100 disabled:[-webkit-text-fill-color:currentcolor]" : undefined}
                placeholder={pick(contactStep.mobilePlaceholder, locale)}
                onChange={(event) => {
                  setMobile(event.target.value.replace(DIGITS, "").slice(0, 10));
                  setTouched(false);
                }}
              />
            </InputGroup>
            {!requested ? (
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={mobile.length !== 10 || same}
                onClick={() => {
                  setRequested(true);
                  setTouched(false);
                }}
              >
                {pick(contactStep.sendOtp, locale)}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  setRequested(false);
                  setVerified(false);
                }}
              >
                {pick(contactStep.changeNumber, locale)}
              </Button>
            )}
          </div>
          {verified ? (
            <Verified>{pick(contactStep.verified, locale)}</Verified>
          ) : mobile.length === 10 && same ? (
            <FieldDescription>{pick(d.sameNumber, locale)}</FieldDescription>
          ) : (
            <FieldDescription>{pick(contactStep.mobileHint, locale)}</FieldDescription>
          )}
          <FieldError>
            {touched && numberError
              ? numberError
              : touched && !verified
                ? pick(contactStep.verifyFirst, locale)
                : null}
          </FieldError>
        </Field>

        {requested && !verified ? (
          <CodeCheck number={mobile} onVerified={() => setVerified(true)} />
        ) : null}
      </form>
    </SettingsDialog>
  );
}

/**
 * Set or change the password, on registration's rules (REG-40 to 44) and its one live
 * line under the box. Changing asks for the current password first; someone who has
 * forgotten it proves it is them with a code to their mobile instead, the same code
 * sign-in offers.
 */
export function PasswordDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
}) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const changing = account.password.set;
  const [current, setCurrent] = React.useState("");
  const [useCode, setUseCode] = React.useState(false);
  const [codeVerified, setCodeVerified] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [revealed, setRevealed] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const problem = passwordProblem(password, {
    mobile: account.mobile,
    name: account.name,
    email: account.email,
  });
  const provenIt = !changing || (useCode ? codeVerified : current.length > 0);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!provenIt || problem || password !== confirm) return;
    updateAccount(account.key, (state) => ({
      ...state,
      password: { set: true, changedOn: today() },
    }));
    onOpenChange(false);
    toast(pick(d.passwordSaved, locale));
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(changing ? d.passwordChangeTitle : d.passwordSetTitle, locale)}
      description={pick(d.passwordBody, locale)}
      dirty={current !== "" || password !== "" || confirm !== ""}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.cancel, locale)}
          </Button>
          <Button type="submit" form="settings-password">
            {pick(settingsCopy.save, locale)}
          </Button>
        </>
      }
    >
      <form id="settings-password" noValidate className="flex flex-col gap-6" onSubmit={save}>
        {changing ? (
          useCode ? (
            <div className="flex flex-col gap-2">
              {codeVerified ? (
                <Verified>{pick(contactStep.verified, locale)}</Verified>
              ) : (
                <CodeCheck
                  number={account.mobile}
                  invalid={touched && !codeVerified}
                  onVerified={() => setCodeVerified(true)}
                />
              )}
              {touched && !codeVerified ? (
                <p className="text-body-compact text-destructive">{pick(d.codeFirst, locale)}</p>
              ) : null}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto self-start p-0"
                onClick={() => {
                  setUseCode(false);
                  setCodeVerified(false);
                }}
              >
                {pick(d.usePassword, locale)}
              </Button>
            </div>
          ) : (
            <Field data-invalid={touched && current.length === 0}>
              <FieldLabel>
                {pick(d.currentPassword, locale)} {REQUIRED}
              </FieldLabel>
              <Input
                type={revealed ? "text" : "password"}
                autoComplete="current-password"
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value);
                  setTouched(false);
                }}
              />
              <FieldError>
                {touched && current.length === 0 ? pick(d.currentPasswordError, locale) : null}
              </FieldError>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto self-start p-0"
                onClick={() => {
                  setUseCode(true);
                  setCurrent("");
                }}
              >
                {pick(d.forgotPassword, locale)}
              </Button>
            </Field>
          )
        ) : null}

        <Field data-invalid={touched && Boolean(problem)}>
          <FieldLabel>
            {pick(changing ? d.newPassword : passwordStep.password, locale)} {REQUIRED}
          </FieldLabel>
          <Input
            type={revealed ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            placeholder={pick(passwordStep.passwordPlaceholder, locale)}
            onChange={(event) => {
              setPassword(event.target.value);
              setTouched(false);
            }}
          />
          <div className="flex items-start justify-between gap-4">
            {touched && problem ? (
              <FieldError>{pick(passwordStep.problem[problem], locale)}</FieldError>
            ) : (
              <FieldDescription
                aria-live="polite"
                className={cn(
                  "flex items-start gap-1.5",
                  password && problem && "text-destructive-ink",
                  password && !problem && "text-success-ink",
                )}
              >
                {password && problem ? <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                {password && !problem ? <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                <span>
                  {pick(!password ? passwordStep.rules : problem ? passwordStep.problem[problem] : passwordStep.ok, locale)}
                </span>
              </FieldDescription>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto shrink-0 p-0"
              aria-pressed={revealed}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOffIcon data-icon="inline-start" aria-hidden /> : <EyeIcon data-icon="inline-start" aria-hidden />}
              {pick(revealed ? passwordStep.hide : passwordStep.show, locale)}
            </Button>
          </div>
        </Field>

        <Field data-invalid={touched && password !== confirm}>
          <FieldLabel>
            {pick(passwordStep.confirm, locale)} {REQUIRED}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              type={revealed ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              placeholder={pick(passwordStep.confirmPlaceholder, locale)}
              onChange={(event) => {
                setConfirm(event.target.value);
                setTouched(false);
              }}
            />
            {confirm && confirm === password ? (
              <InputGroupAddon align="inline-end" className="text-success-ink">
                <CheckIcon aria-hidden />
                <span className="sr-only">{pick(passwordStep.confirmMatch, locale)}</span>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <FieldError>{touched && password !== confirm ? pick(passwordStep.confirmError, locale) : null}</FieldError>
        </Field>
      </form>
    </SettingsDialog>
  );
}

/** "Last changed 14 June 2026". */
export function passwordLine(account: AccountState, locale: Parameters<typeof pick>[1]) {
  return account.password.set
    ? fillText(pick(settingsCopy.security.passwordSetOn, locale), { date: account.password.changedOn })
    : pick(settingsCopy.security.passwordNotSet, locale);
}
