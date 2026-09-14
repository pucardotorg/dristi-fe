"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { BrandLockup } from "@/components/brand-lockup";
import { CHARCOAL_PLATE } from "@/components/chrome/rail-plate";
import { Button } from "@/components/ui/button";
import {
  Field,
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
import { Separator } from "@/components/ui/separator";
import { setCourtSession } from "@/lib/employee/session";
import {
  accountFor,
  COURT_ACCOUNTS,
  COURT_SIGN_IN_ROLES,
  courtRoomsIn,
  DEFAULT_COURT,
  DEFAULT_DISTRICT,
  DISTRICTS,
} from "@/lib/employee/sign-in";

/**
 * `/employee/login` — the court's own door.
 *
 * **One form, no role step.** An earlier version asked which seat you were signing in
 * as before it showed the fields. The owner cut it on 2026-09-14 for the reason it could
 * only have been cut by somebody who has watched a court work: staff sign in for each
 * other constantly — a bench clerk opens the magistrate's account to get a thing done —
 * and a screen that makes you declare a role first taxes every one of those sign-ins for
 * a fact the back end already holds. The username says which seat it is. The screen asks
 * for the username.
 *
 * So the shape is the reference screen's (owner, 2026-09-14): username, password,
 * district, court room, one button. No registration line, because court users are
 * registered by the establishment; no OTP, so no method toggle; no "forgot password",
 * because a court password is reset by the establishment and a link here would go
 * nowhere.
 *
 * **It does not look like the citizen sign-in, on purpose.** That screen's plate is the
 * deep-teal marketing canvas — it is selling access to people who may never have seen the
 * product. This one is charcoal: `CHARCOAL_PLATE`, the exact ground the bench's own rail
 * is painted on, so the door is made of the same material as the room behind it. It is
 * narrower than the citizen plate too (a third of the page against four-ninths), because
 * it identifies rather than persuades.
 *
 * The two selects are live: what is chosen is the district and bench the rail's foot
 * reports and a court document would be headed with (`session.ts`). Signing in lands on
 * Today's hearings, which is where the court's day actually starts.
 *
 * Nothing here authenticates. Every court URL was reachable before it existed and is
 * still reachable now.
 */

/** Where the court's day starts — and so where signing in lands. */
const AFTER_SIGN_IN = "/employee/hearings";

export function CourtSignInBlock() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [district, setDistrict] = React.useState(DEFAULT_DISTRICT);
  const [court, setCourt] = React.useState(DEFAULT_COURT);
  const [revealed, setRevealed] = React.useState(false);
  /* Which fields failed, not what the failure reads as — the same rule the citizen
     sign-in keeps, so a message is never frozen into the state that produced it. */
  const [touched, setTouched] = React.useState(false);

  const typed = username.trim();
  const badUsername = touched && !typed;
  /* Said as a fact under the field, the way the citizen screen says it of an unknown
     number. There is no offer to register: nobody registers themselves here. */
  const unknownUsername = touched && Boolean(typed) && !accountFor(typed);
  const badPassword = touched && !password;

  /** A district's courts are its own, so changing it cannot leave another one's bench. */
  function changeDistrict(next: string) {
    setDistrict(next);
    setCourt(courtRoomsIn(next)[0]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!password) return;
    const account = accountFor(username);
    if (!account) return;

    /* The username is what decides the seat. Nothing on this screen asked for it and
       nothing on this screen can override it. */
    setCourtSession({
      username: account.username,
      name: account.name,
      role: account.role,
      district,
      court,
    });
    router.push(AFTER_SIGN_IN);
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[1fr_auto] lg:h-dvh lg:min-h-0 lg:grid-cols-[4fr_5fr] lg:overflow-hidden">
      {/* The bench's own charcoal (`rail-plate.ts`), so the door is the same material as
          the room behind it — but warmed by the court's own teal rising from the foot of
          the plate, because court staff meet this screen every day and it should be worth
          meeting. Charcoal at the top where the mark and the promise sit; the green blooms
          up through the lower half. Still charcoal-rooted, not the citizen side's flat
          teal. Desktop only, like the citizen plate. */}
      <aside
        style={{
          ...(CHARCOAL_PLATE.vars as React.CSSProperties),
          background:
            "radial-gradient(85% 65% at 18% 106%, color-mix(in srgb, var(--rail-avatar) 60%, transparent) 0%, transparent 58%), linear-gradient(165deg, var(--sidebar) 0%, var(--sidebar) 42%, color-mix(in srgb, var(--brand-canvas) 82%, var(--sidebar)) 100%)",
        }}
        className="relative hidden overflow-hidden px-12 py-12 text-(--sidebar-foreground) lg:row-span-2 lg:flex lg:flex-col"
      >
        <BrandLockup onDark className="relative h-12" />

        {/* Mark, then the promise, then who runs it — a different composition as well as a
            different colour from the citizen plate. The hero steps up to display scale
            because this plate is now the front of house, not a side note. */}
        <div className="relative flex flex-1 flex-col justify-center gap-4">
          <h2 className="text-title-l font-semibold tracking-tight text-balance sm:text-display-s">
            Every stage of a case, on one bench.
          </h2>
          <p className="max-w-md text-body text-(--rail-muted)">
            Secure access for the magistrates, bench clerks, scrutiny officers and
            typists of the Kerala district courts.
          </p>
        </div>

        <div className="relative flex flex-col gap-4">
          {/* The plate stays charcoal in both modes, so the global `hairline` token is
              not suitable here: it becomes a black tint in light mode. The plate's own
              seam is the rule this surface owns. */}
          <Separator className="bg-(--rail-seam)" />
          <p className="text-caption text-(--rail-muted)">
            A Government of India digital courts initiative.
          </p>
        </div>
      </aside>

      {/* Form column. */}
      <div className="relative flex flex-col lg:col-start-2 lg:min-h-0">
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-hairline bg-background px-6 py-4 lg:hidden">
          <BrandLockup className="h-8" />
        </header>

        <main className="flex flex-1 items-start justify-center overflow-y-auto px-6 pt-8 pb-12 lg:min-h-0 lg:items-center lg:px-12 lg:py-12">
          <div className="mx-auto flex w-full max-w-100 flex-col gap-6">
            {/* One token down the scale on phones, as the citizen screen steps. Controls
                do not step: 40px is the touch-target floor. */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-title-s text-balance font-semibold sm:text-title">
                Sign in to your court account
              </h1>
              <p className="text-body-compact text-muted-foreground sm:text-body">
                Use the username the court issued you.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <Field data-invalid={badUsername || unknownUsername}>
                <FieldLabel htmlFor="court-username">Username</FieldLabel>
                <Input
                  id="court-username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setTouched(false);
                  }}
                />
                <FieldError>
                  {badUsername
                    ? "Enter your username."
                    : unknownUsername
                      ? "No court account has that username."
                      : null}
                </FieldError>
              </Field>

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
                      {revealed ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>
                  {badPassword ? "Enter your password." : null}
                </FieldError>
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

            <PrototypeAccounts onPick={setUsername} />
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

/**
 * Scaffolding, and labelled as such — delete it with `sign-in.ts`.
 *
 * It is here because a demo account nobody can guess is a demo account nobody can use:
 * there is no directory behind this screen to look a username up in, and `sreelathaTypist`
 * is not a thing anyone types from memory. Each button fills the field and nothing else,
 * so the form above it stays the whole of the sign-in — this is a shortcut past typing,
 * not a step on the way in.
 *
 * It names usernames rather than roles on purpose. A row of roles would rebuild the role
 * chooser that was just taken out, one screen lower down.
 */
function PrototypeAccounts({ onPick }: { onPick: (username: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
      <p className="text-caption text-muted-foreground">
        Prototype — any password works. Demo accounts:
      </p>
      <div className="flex flex-wrap gap-2">
        {COURT_SIGN_IN_ROLES.map((role) => (
          <Button
            key={role}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPick(COURT_ACCOUNTS[role].username)}
          >
            {COURT_ACCOUNTS[role].username}
          </Button>
        ))}
      </div>
    </div>
  );
}
