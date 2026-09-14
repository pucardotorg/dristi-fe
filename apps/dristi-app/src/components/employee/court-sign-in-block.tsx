"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardListIcon,
  EyeIcon,
  EyeOffIcon,
  FileSearchIcon,
  GavelIcon,
  KeyboardIcon,
  type LucideIcon,
} from "lucide-react";

import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COURT_ROLE_LABEL, type CourtRole } from "@/lib/employee/content";
import { setCourtSession } from "@/lib/employee/session";
import {
  accountFor,
  COURT_ACCOUNTS,
  COURT_ROLE_BLURB,
  COURT_SIGN_IN_ROLES,
  courtRoomsIn,
  DEFAULT_COURT,
  DEFAULT_DISTRICT,
  DISTRICTS,
} from "@/lib/employee/sign-in";
import { cn } from "@/lib/utils";

/**
 * `/employee/login` — the court's own door.
 *
 * It is the citizen sign-in's sibling and deliberately looks like one: the same canvas
 * plate on the left, the same form column on the right, the same two-step shape with the
 * same slide, and the same footer. Two audiences, one product — a magistrate and an
 * advocate should not feel they are signing in to different systems.
 *
 * What differs is everything underneath, because the two audiences arrive differently:
 *
 * 1. **A username, not a mobile number.** Court users are registered by the establishment
 *    (the owner's reference screen, 2026-09-14). There is no self-registration, so there
 *    is no "Create an account" line, and no OTP, so there is no method toggle — the
 *    password is the only credential and needs no control to choose it.
 *
 * 2. **The role is the first step.** The reference screen never asks: the back end knows
 *    which role a username holds. Here it is asked outright, because the four seats are
 *    about to become four different products — the magistrate's is the superset, each
 *    other seat a subset — and that split cannot be designed or demonstrated without a
 *    door into each one. The directory still holds the true role for each username, so
 *    choosing one seat and typing another's username is named as the contradiction it is
 *    rather than silently resolved (`mismatch` below).
 *
 * 3. **The posting comes with the credentials.** District and court room are on the
 *    reference screen because a staff member's session is bound to a bench, and here they
 *    are live rather than decorative: what is chosen is what the rail's foot reports and
 *    what a court document would be headed with (`session.ts`).
 *
 * 4. **English only.** The bilingual duty belongs to citizen copy — the whole of
 *    `/employee` past this door is English, and a language toggle here would offer a
 *    choice that ends at the next screen.
 *
 * Nothing here authenticates. It establishes who the area reports itself as and routes
 * to the court home; every court URL was reachable before it existed and still is.
 */

const DIRECTION_FORWARD =
  "animate-in fade-in-0 slide-in-from-right-8 duration-200 motion-reduce:animate-none";
const DIRECTION_BACK =
  "animate-in fade-in-0 slide-in-from-left-8 duration-200 motion-reduce:animate-none";

/**
 * A mark per seat, so four rows of similar length are told apart before they are read.
 *
 * Neutral, not brand-tinted: four teal tiles would be four claims on the one rationed
 * accent, and the rows are already the step's only action. The gavel is the bench's, the
 * clipboard the daily record, the file-search the scrutiny the officer performs, and the
 * keyboard the dictation the typist takes.
 */
const ROLE_ICON: Record<CourtRole, LucideIcon> = {
  magistrate: GavelIcon,
  "bench-clerk": ClipboardListIcon,
  "scrutiny-officer": FileSearchIcon,
  typist: KeyboardIcon,
};

export function CourtSignInBlock() {
  const router = useRouter();

  const [step, setStep] = React.useState<"role" | "credential">("role");
  // Which way the last step change went, so the incoming panel slides from that side.
  const [direction, setDirection] = React.useState<"forward" | "back">("forward");
  const [role, setRole] = React.useState<CourtRole | null>(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [district, setDistrict] = React.useState(DEFAULT_DISTRICT);
  const [court, setCourt] = React.useState(DEFAULT_COURT);
  const [revealed, setRevealed] = React.useState(false);
  /* Which fields failed, not what the failure reads as — the same rule the citizen
     sign-in keeps, so a message is never frozen into the state that produced it. */
  const [touched, setTouched] = React.useState(false);

  const typed = accountFor(username);
  const unknown = touched && username.trim().length > 0 && !typed;
  /* The one dead end this screen can create: a real username, on the wrong seat's step.
     "Wrong password" would be a lie and "no such account" would send a registered member
     of staff to a registration that does not exist for them. */
  const mismatch = role && typed && typed.role !== role ? typed.role : null;
  const badUsername = touched && !username.trim();
  /* The description under the field describes the field. Once somebody has typed over
     what was filled in, it is describing something that is no longer on screen. */
  const prefilled = Boolean(role && username === COURT_ACCOUNTS[role].username);
  const badPassword = touched && !password;

  function chooseRole(next: CourtRole) {
    setRole(next);
    /* The seat's own account, filled in. Nobody is being asked to memorise a demo
       username, and the field stays editable for the case the screen has to prove it
       handles — a username that belongs to a different seat. */
    setUsername(COURT_ACCOUNTS[next].username);
    setPassword("");
    setTouched(false);
    setDirection("forward");
    setStep("credential");
  }

  function changeRole() {
    setTouched(false);
    setDirection("back");
    setStep("role");
  }

  /** A district's courts are its own, so changing it cannot leave another one's bench. */
  function changeDistrict(next: string) {
    setDistrict(next);
    setCourt(courtRoomsIn(next)[0]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!role || !username.trim() || !password) return;
    const account = accountFor(username);
    /* An unknown username and a mismatched one both stop here and are both already on
       screen — the first under the field, the second beside its own way out. */
    if (!account || account.role !== role) return;

    setCourtSession({
      username: account.username,
      name: account.name,
      role: account.role,
      district,
      court,
    });
    router.push("/employee");
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[1fr_auto] lg:h-dvh lg:min-h-0 lg:grid-cols-[4fr_5fr] lg:overflow-hidden">
      {/* The canvas plate — desktop only, and the same fixed institutional surface the
          citizen sign-in and the landing page stand on. */}
      <aside className="hidden bg-linear-160 from-brand-canvas to-brand-canvas-deep px-12 pt-8 pb-12 text-brand-canvas-foreground lg:row-span-2 lg:flex lg:flex-col">
        <BrandLockup onDark className="h-14" />
        <div className="flex flex-1 flex-col justify-center gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-display-s text-balance font-semibold">
              Every stage of a case, on one bench.
            </h2>
            <p className="text-body text-brand-canvas-muted-foreground">
              Secure access for the magistrates, bench clerks, scrutiny officers and
              typists of the Kollam District Court.
            </p>
          </div>
        </div>
      </aside>

      {/* Form column. */}
      <div className="relative flex flex-col lg:col-start-2 lg:min-h-0">
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-hairline bg-background px-6 py-4 lg:hidden">
          <BrandLockup className="h-8" />
        </header>

        <main className="flex flex-1 items-start justify-center overflow-y-auto px-6 pt-8 pb-12 lg:min-h-0 lg:items-center lg:px-12 lg:py-12">
          <div className="mx-auto flex w-full max-w-100 flex-col gap-6">
            {step === "role" ? (
              <div
                className={cn(
                  "flex flex-col gap-6",
                  direction === "back" && DIRECTION_BACK,
                )}
              >
                {/* One token down the scale on phones, as the citizen screen steps.
                    Controls do not step: 40px is the touch-target floor. */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-title-s text-balance font-semibold sm:text-title">
                    Sign in to your court account
                  </h1>
                  <p className="text-body-compact text-muted-foreground sm:text-body">
                    Choose the role you are signing in as.
                  </p>
                </div>

                {/* The row is the target, not a button inside it — the same decision the
                    landing page's two doors make. `border-input` rather than the
                    hairline: the edge is the only thing identifying these as controls,
                    which is exactly the case the DS holds to 3:1. */}
                <div className="flex flex-col gap-3">
                  {COURT_SIGN_IN_ROLES.map((seat) => {
                    const Icon = ROLE_ICON[seat];
                    return (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => chooseRole(seat)}
                        className="group/seat flex items-center gap-4 rounded-lg border border-input bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
                          <Icon aria-hidden className="size-5" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-body font-semibold">
                            {COURT_ROLE_LABEL[seat]}
                          </span>
                          <span className="text-body-compact text-muted-foreground">
                            {COURT_ROLE_BLURB[seat]}
                          </span>
                        </span>
                        <ArrowRightIcon
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/seat:translate-x-0.5"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex flex-col gap-6",
                  direction === "forward" ? DIRECTION_FORWARD : DIRECTION_BACK,
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-title-s text-balance font-semibold sm:text-title">
                    Sign in to your court account
                  </h1>
                </div>

                <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                  {/* The way back, and what it goes back to. The arrow sits outside the
                      block on its left rather than eating into it — inline on a phone
                      where there is no gutter, hung in the gutter from `sm` up where
                      there is. The same shape the citizen credential step uses. */}
                  <div className="relative flex items-center gap-2 sm:block">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 sm:absolute sm:top-1/2 sm:right-full sm:mr-1 sm:-translate-y-1/2"
                      onClick={changeRole}
                      aria-label="Change role"
                    >
                      <ArrowLeftIcon aria-hidden />
                    </Button>
                    <div className="flex min-h-10 flex-1 items-center justify-between gap-4 rounded-lg border border-hairline bg-surface-sunken px-4 sm:flex-none">
                      <span className="text-body-compact text-muted-foreground">
                        Signing in as
                      </span>
                      <span className="text-body-compact font-semibold">
                        {role ? COURT_ROLE_LABEL[role] : null}
                      </span>
                    </div>
                  </div>

                  <Field data-invalid={badUsername || unknown}>
                    <FieldLabel htmlFor="court-username">Username</FieldLabel>
                    <Input
                      id="court-username"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="The username the court issued you"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        setTouched(false);
                      }}
                    />
                    {badUsername || unknown ? (
                      <FieldError>
                        {badUsername
                          ? "Enter your username."
                          : "No court account has that username."}
                      </FieldError>
                    ) : prefilled ? (
                      <FieldDescription>
                        Filled in for the role you chose.
                      </FieldDescription>
                    ) : null}
                  </Field>

                  {/* Named, with the fix one tap away. The seat is what changes — the
                      username the person typed is the fact, and it is theirs. */}
                  {mismatch ? (
                    <div className="flex flex-col items-start gap-2 rounded-lg border border-warning bg-warning-muted p-4 text-warning-muted-foreground">
                      <p className="text-body-compact font-semibold">
                        That username signs in as a{" "}
                        {COURT_ROLE_LABEL[mismatch].toLowerCase()}
                      </p>
                      <p className="text-body-compact">
                        Change the role, or use the username issued to you as a{" "}
                        {role ? COURT_ROLE_LABEL[role].toLowerCase() : null}.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRole(mismatch);
                          setTouched(false);
                        }}
                      >
                        Switch to {COURT_ROLE_LABEL[mismatch].toLowerCase()}
                      </Button>
                    </div>
                  ) : null}

                  <Field data-invalid={badPassword}>
                    <FieldLabel htmlFor="court-password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="court-password"
                        name="password"
                        type={revealed ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setTouched(false);
                        }}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-sm"
                          aria-label={revealed ? "Hide password" : "Show password"}
                          aria-pressed={revealed}
                          onClick={() => setRevealed((value) => !value)}
                        >
                          {revealed ? (
                            <EyeOffIcon aria-hidden />
                          ) : (
                            <EyeIcon aria-hidden />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {badPassword ? (
                      <FieldError>Enter your password.</FieldError>
                    ) : (
                      /* Scaffolding, and labelled as such: there is nothing to check a
                         password against yet, and a screen that rejected one would be
                         inventing a rule. Delete this line with the endpoint. */
                      <FieldDescription>
                        Any password works while this is a prototype.
                      </FieldDescription>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="court-district">District</FieldLabel>
                    <Select value={district} onValueChange={changeDistrict}>
                      <SelectTrigger id="court-district" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="court-room">Court room</FieldLabel>
                    <Select value={court} onValueChange={setCourt}>
                      <SelectTrigger id="court-room" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courtRoomsIn(district).map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Button type="submit" size="lg" className="w-full">
                    Sign in
                  </Button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* The citizen sign-in's footer, to the character — three policies, dot-separated,
          under the form column only. Separator and link stay in one flex item so a wrap
          never strands a dot at the end of a line, which is exactly what happens at
          375px. The separators are decorative, so they stay out of the tree. */}
      <footer
        aria-label="About this site"
        className="flex flex-wrap items-center justify-center gap-x-2 border-t border-border px-6 py-2 text-caption text-muted-foreground lg:col-start-2 lg:px-12"
      >
        {[
          { label: "Terms of use", href: "/terms" },
          { label: "Privacy", href: "/privacy" },
          { label: "Support", href: "/support" },
        ].map((item, index) => (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>·</span> : null}
            <Button
              variant="link"
              asChild
              className="h-10 px-0 text-caption text-muted-foreground"
            >
              <a href={item.href}>{item.label}</a>
            </Button>
          </span>
        ))}
      </footer>
    </div>
  );
}
