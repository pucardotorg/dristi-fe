"use client";

/**
 * **`/sign` — where a signing link lands.**
 *
 * When a complaint is sent for signature, every party not at the filer's keyboard gets a
 * link by SMS. This is the other end of it. The person arriving did not start this
 * filing and may never have used DRISTI, so the page explains itself before it asks for
 * anything: who is filing, against whom, in which court, what they are named as, and what
 * they are about to do.
 *
 * Then, in one window of stages (the product's staged-overlay pattern, as the filer's own
 * signing window is):
 *
 * 1. **Why you got this link** — the case, their part in it, and the steps ahead.
 * 2. **Sign in** — signing and the oath are tied to an account, so a person who is not
 *    signed in does that first, and someone new registers through the same flow as
 *    everywhere else (`SignInBlock`).
 * 3. **E-sign** — Aadhaar OTP or DSC, the same cards as the filer's.
 * 4. **The oath** — advocates only, straight after their signature (`OathCapture`).
 *
 * An advocate is shown both acts from the start ("E-sign", then "Oath") so the second
 * never arrives as a surprise. A complaint signed on paper skips the e-signature: the
 * advocate's link is for the oath alone.
 *
 * Sandbox: no SMS is sent and no session is real. The filer opens this from the Sign
 * step, and signing in here only marks this tab as signed in. The page reads and writes
 * the same draft the filer has, so what is done here shows on the filer's Sign step.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  FileTextIcon,
  LogInIcon,
  SignatureIcon,
  VideoIcon,
} from "lucide-react";

import { useStagedFlow, StagedOverlay } from "@/components/chrome/staged-overlay";
import { BrandLockup } from "@/components/brand-lockup";
import { SignInBlock } from "@/components/sign-in-block";
import { ADVOCATE_OATH } from "@/lib/filing/config";
import { money } from "@/lib/filing/format";
import { COURT } from "@/lib/filing/options";
import { draftTitle, signatories } from "@/lib/filing/selectors";
import { FilingProvider, useFiling } from "@/lib/filing/store";
import type {
  OathVideoUpload,
  SignInstrument,
  Signatory,
} from "@/lib/filing/types";
import type { Locale } from "@/lib/onboarding/content";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionNotice } from "@/components/filing/notices";
import { OathCapture } from "@/components/filing/oath-capture";
import { CourtDocument } from "@/components/filing/sections/preview/court-document";
import {
  DscLookup,
  InstrumentChoice,
  OtpEntry,
  SettledCard,
  StageColumn,
  StepTrail,
  type TrailStep,
} from "@/components/filing/sign-stages";
import { useCourtText } from "@/components/court/court-provider";

type Stage = "why" | "account" | "sign" | "otp" | "dsc" | "signed" | "oath" | "done";
type Start = "why" | "sign" | "oath" | "done";

/** One order per starting point: the window opens where this person actually is. */
const ORDER: Record<Start, readonly Stage[]> = {
  why: ["why", "account", "sign", "otp", "dsc", "signed", "oath", "done"],
  sign: ["sign", "otp", "dsc", "signed", "oath", "done", "why", "account"],
  oath: ["oath", "done", "why", "account", "sign", "otp", "dsc", "signed"],
  done: ["done", "why", "account", "sign", "otp", "dsc", "signed", "oath"],
};

/** An act and its outcome share a scene, so the signature settles where it was made. */
const SCENES: Record<Stage, string> = {
  why: "why",
  account: "account",
  sign: "sign",
  otp: "act",
  dsc: "act",
  signed: "act",
  oath: "oath",
  done: "done",
};

const INSTRUMENT_LABEL: Record<SignInstrument, string> = {
  aadhaar: "Signed with Aadhaar OTP",
  dsc: "Signed with a DSC",
  paper: "Signed on paper",
};

/** Sandbox session: signing in on this page marks this tab, for this link, as signed in. */
const sessionKey = (draftId: string, signatoryId: string) =>
  `dristi:sign-link:${draftId}:${signatoryId}`;

function readSession(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.sessionStorage.getItem(key);
  } catch {
    return false;
  }
}

export function SignLinkScreen() {
  const params = useSearchParams();
  const draftId = params.get("draft") ?? "";
  const signatoryId = params.get("as") ?? "";

  if (!draftId || !signatoryId) return <LinkUnavailable />;
  return (
    <FilingProvider
      draftId={draftId}
      fallback={<LinkLoading />}
      notFound={<LinkUnavailable />}
    >
      <SignLinkBody draftId={draftId} signatoryId={signatoryId} />
    </FilingProvider>
  );
}

function SignLinkBody({ draftId, signatoryId }: { draftId: string; signatoryId: string }) {
  const courtText = useCourtText();
  const { draft, update } = useFiling();
  const [locale, setLocale] = React.useState<Locale>("en");

  const me: Signatory | undefined = React.useMemo(() => {
    const { complainants, advocates } = signatories(draft, null);
    return [...complainants, ...advocates].find((s) => s.id === signatoryId);
  }, [draft, signatoryId]);

  const key = sessionKey(draftId, signatoryId);
  // Read once, as the state is made: this page only ever renders in the browser (the link's
  // query bails it out of prerendering), so there is no server value to disagree with.
  const [signedIn, setSignedIn] = React.useState(() => readSession(key));

  /** Signing in is a different page — the product's own sign-in and registration. */
  const [view, setView] = React.useState<"document" | "auth">("document");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [start, setStart] = React.useState<Start>("why");
  const [opening, setOpening] = React.useState(0);

  const isAdvocate = !!me?.id.startsWith("sig-a-");
  /** An advocate who also takes the oath — only while the oath is switched on. */
  const sworn = isAdvocate && ADVOCATE_OATH;
  const onPaper = draft.sign.mode === "upload";
  const needsSign = !!me && !onPaper && me.status !== "signed";
  const needsOath = !!me && sworn && !me.oathTaken;
  const owed = needsSign || needsOath;
  const filed = draft.status === "filed";

  const openAt = React.useCallback((at: Start) => {
    setStart(at);
    setOpening((n) => n + 1);
    setWizardOpen(true);
  }, []);

  /* The page explains itself on arrival — once, after it has painted. */
  // Marked only once it has actually opened: the draft re-saves just after loading, and
  // a greeting cancelled by that re-render must be able to try again.
  const greeted = React.useRef(false);
  const canGreet = !!me && !filed;
  React.useEffect(() => {
    if (greeted.current || !canGreet) return;
    const timer = window.setTimeout(() => {
      greeted.current = true;
      openAt(owed ? "why" : "done");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [canGreet, owed, openAt]);

  if (!me) return <LinkUnavailable />;

  const nextAct: Start = needsSign ? "sign" : needsOath ? "oath" : "done";

  const finishSignIn = () => {
    try {
      window.sessionStorage.setItem(key, new Date().toISOString());
    } catch {
      /* private mode — this tab stays signed in until it is closed either way */
    }
    setSignedIn(true);
    setView("document");
    openAt(nextAct);
  };

  if (view === "auth") {
    return (
      <SignInBlock
        locale={locale}
        onLocaleChange={setLocale}
        onSeekHelp={() => {
          setView("document");
          openAt("why");
        }}
        onSignedIn={finishSignIn}
        onRegistered={finishSignIn}
      />
    );
  }

  const filer = draft.advocates[0]?.name.trim() || "An advocate";
  const parties = draftTitle(draft);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b border-hairline px-4 md:px-6">
        <BrandLockup className="h-9" />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-title text-balance font-semibold">
            {filed ? "This complaint has been filed" : "You have been asked to sign a complaint"}
          </h1>
          <p className="text-body text-pretty text-muted-foreground">
            {filer} is filing {parties} in the {courtText(COURT.name)}.
          </p>
        </div>

        {filed ? (
          <SectionNotice variant="neutral">
            Nothing more is needed from you. The complaint is with the court.
          </SectionNotice>
        ) : owed ? (
          <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-card p-4 shadow-raised sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-compact text-muted-foreground">
              {needsSign && needsOath
                ? "Your e-signature and your oath are still needed."
                : needsSign
                  ? "Your e-signature is still needed."
                  : "Your oath is still needed."}
            </p>
            <Button
              type="button"
              onClick={() => openAt(signedIn ? nextAct : "why")}
              className="shrink-0"
            >
              Continue
            </Button>
          </div>
        ) : (
          <SectionNotice variant="success" announce="polite">
            {sworn
              ? "You have signed and taken the oath. Nothing more is needed from you."
              : "You have signed. Nothing more is needed from you."}
          </SectionNotice>
        )}

        <section aria-labelledby="sign-link-document" className="flex flex-col gap-3">
          <h2 id="sign-link-document" className="text-body font-semibold">
            The complaint
          </h2>
          {/* Scrolls on its own, so it is focusable for a keyboard reader. */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Complaint document"
            className="max-h-[70vh] overflow-y-auto rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CourtDocument draft={draft} />
          </div>
        </section>
      </main>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        {wizardOpen ? (
          <SignLinkWizard
            key={`${opening}:${start}`}
            start={start}
            me={me}
            filer={filer}
            parties={parties}
            chequeAmount={draft.cheques[0]?.amount ?? ""}
            signedIn={signedIn}
            needsSign={needsSign}
            needsOath={needsOath}
            isAdvocate={isAdvocate}
            oath={draft.sign.oaths[me.id]?.video ?? null}
            onSign={(instrument) =>
              update((d) => {
                d.sign.signed[me.id] = { at: new Date().toISOString(), with: instrument };
              })
            }
            onOath={(video) =>
              update((d) => {
                d.sign.oaths[me.id] = { at: new Date().toISOString(), video };
              })
            }
            onSignIn={() => {
              setWizardOpen(false);
              setView("auth");
            }}
            onClose={() => setWizardOpen(false)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function SignLinkWizard({
  start,
  me,
  filer,
  parties,
  chequeAmount,
  signedIn,
  needsSign,
  needsOath,
  isAdvocate,
  oath,
  onSign,
  onOath,
  onSignIn,
  onClose,
}: {
  start: Start;
  me: Signatory;
  filer: string;
  parties: string;
  chequeAmount: string;
  signedIn: boolean;
  needsSign: boolean;
  needsOath: boolean;
  isAdvocate: boolean;
  oath: OathVideoUpload | null;
  onSign: (instrument: SignInstrument) => void;
  onOath: (video: OathVideoUpload) => void;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const courtText = useCourtText();
  const flow = useStagedFlow<Stage>({ order: ORDER[start], scene: SCENES, arrival: "forward" });
  /** An advocate who also takes the oath — only while the oath is switched on. */
  const sworn = isAdvocate && ADVOCATE_OATH;

  const [otp, setOtp] = React.useState("");
  const [resent, setResent] = React.useState(false);
  const [dscFound, setDscFound] = React.useState(false);
  const [signedWith, setSignedWith] = React.useState<SignInstrument | null>(null);
  const resendTimer = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (resendTimer.current) window.clearTimeout(resendTimer.current);
    },
    []
  );

  React.useEffect(() => {
    if (flow.stage !== "dsc" || dscFound) return;
    const timer = window.setTimeout(() => setDscFound(true), 1100);
    return () => window.clearTimeout(timer);
  }, [flow.stage, dscFound]);

  /*
   * Whether this opening includes the signature, read once as it opens. `needsSign` turns
   * false the moment the person signs, and read live it dropped the E-sign step — and with
   * it the whole trail — from the oath stage that follows, which is where "step 1 done"
   * is the point of showing it.
   */
  const [signsHere] = React.useState(needsSign || start === "sign");

  /* The steps this person has, in order — the trail and the "what happens next" list. */
  const acts: { key: "sign" | "oath"; label: string }[] = [
    ...(signsHere ? [{ key: "sign" as const, label: "E-sign" }] : []),
    ...(sworn ? [{ key: "oath" as const, label: "Oath" }] : []),
  ];
  const trail = (current: "sign" | "oath"): TrailStep[] =>
    acts.map((act) => ({
      label: act.label,
      state:
        act.key === current
          ? "current"
          : current === "oath" && act.key === "sign"
            ? "done"
            : "next",
    }));

  const sign = (instrument: "aadhaar" | "dsc") => {
    onSign(instrument);
    setSignedWith(instrument);
    flow.go("signed");
  };

  const resendOtp = () => {
    setResent(true);
    if (resendTimer.current) window.clearTimeout(resendTimer.current);
    resendTimer.current = window.setTimeout(() => setResent(false), 2500);
  };

  /** After "why": sign in first, or go straight to the first act. */
  const proceed = () => {
    if (!signedIn) flow.go("account");
    else flow.go(needsSign ? "sign" : needsOath ? "oath" : "done");
  };

  const capacity = isAdvocate
    ? `the advocate for ${me.name.replace(/^Advocate for /, "")}`
    : `${me.name}, ${me.role.split(" · ")[0]}`;

  const title = {
    why: "Why you got this link",
    account: "Sign in to continue",
    sign: "E-sign the complaint",
    otp: "Enter the OTP",
    dsc: "Sign with your DSC",
    signed: signedWith ? INSTRUMENT_LABEL[signedWith] : "Signature added",
    oath: "Take your oath",
    done: sworn ? "Signed and sworn" : "Signature added",
  }[flow.stage];

  const description = {
    why: null,
    account: null,
    sign: "Either one is your own signature. Use whichever you have.",
    otp: "Sent to your Aadhaar-linked mobile.",
    dsc: "Your certificate has to be plugged in, with the signing utility running on this computer.",
    signed: null,
    oath: "Record yourself reading the oath. It is filed with the complaint.",
    done: null,
  }[flow.stage];

  const footer = {
    why: (
      <>
        <Button type="button" variant="ghost" onClick={onClose}>
          Read the complaint first
        </Button>
        <Button type="button" onClick={proceed}>
          Continue
        </Button>
      </>
    ),
    account: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("why")}>
          Back
        </Button>
        <Button type="button" onClick={onSignIn}>
          Sign in or register
        </Button>
      </>
    ),
    sign: (
      <Button type="button" variant="ghost" onClick={onClose}>
        I&rsquo;ll do it later
      </Button>
    ),
    otp: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("sign")}>
          Back
        </Button>
        <Button type="button" disabled={otp.length < 6} onClick={() => sign("aadhaar")}>
          Verify and sign
        </Button>
      </>
    ),
    dsc: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("sign")}>
          Back
        </Button>
        <Button type="button" disabled={!dscFound} onClick={() => sign("dsc")}>
          Sign with this certificate
        </Button>
      </>
    ),
    signed: sworn ? (
      <Button type="button" onClick={() => flow.go("oath")}>
        Continue to the oath
      </Button>
    ) : (
      <Button type="button" onClick={onClose}>
        Done
      </Button>
    ),
    oath: (
      <>
        <Button type="button" variant="ghost" onClick={onClose}>
          I&rsquo;ll do it later
        </Button>
        <Button type="button" disabled={!oath} onClick={() => flow.go("done")}>
          Submit oath
        </Button>
      </>
    ),
    done: (
      <Button type="button" onClick={onClose}>
        Close
      </Button>
    ),
  }[flow.stage];

  const settledRow: Signatory = {
    ...me,
    status: "signed",
    oathTaken: sworn ? !!oath || me.oathTaken : undefined,
  };

  return (
    <StagedOverlay
      mobileSheet
      className="sm:max-w-2xl"
      title={title}
      titleRef={flow.titleRef}
      description={description}
      sceneKey={flow.sceneKey}
      motion={flow.motion}
      footer={footer}
    >
      {flow.stage === "why" ? (
        <StageColumn>
          <p className="text-body">
            {filer} is filing a cheque-bounce complaint under S-138, Negotiable Instruments
            Act, and has named you as {capacity}. It cannot be filed
            until you have {sworn ? "signed it and taken the oath" : "signed it"}.
          </p>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-hairline bg-surface-sunken p-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-body-compact text-muted-foreground">Case</dt>
              <dd className="text-body-compact font-medium">{parties}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-body-compact text-muted-foreground">Court</dt>
              <dd className="text-body-compact font-medium">{courtText(COURT.name)}</dd>
            </div>
            {chequeAmount ? (
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-body-compact text-muted-foreground">Cheque amount</dt>
                <dd className="text-body-compact font-medium tabular-nums">
                  {money(Number(chequeAmount.replace(/[^\d.]/g, "")) || 0)}
                </dd>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-body-compact text-muted-foreground">You sign as</dt>
              <dd className="text-body-compact font-medium">
                {isAdvocate ? me.name : me.role.split(" · ")[0]}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="sign-link-steps" className="flex flex-col gap-3">
            <h3 id="sign-link-steps" className="text-body font-semibold">
              What you will do
            </h3>
            <ol className="flex flex-col gap-3">
              {[
                ...(signedIn
                  ? []
                  : [{
                      icon: LogInIcon,
                      title: "Sign in",
                      text: "Or register, if you are new to DRISTI. Your signature is tied to your account.",
                    }]),
                ...(needsSign
                  ? [{
                      icon: SignatureIcon,
                      title: "E-sign the complaint",
                      text: "With an Aadhaar OTP or your DSC.",
                    }]
                  : []),
                ...(sworn && needsOath
                  ? [{
                      icon: VideoIcon,
                      title: "Take the oath",
                      text: "Record yourself on video reading a short affirmation.",
                    }]
                  : []),
              ].map(({ icon: Icon, title: t, text }, i) => (
                <li key={t} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-compact font-semibold">
                      <span className="tabular-nums">{i + 1}.</span> {t}
                    </span>
                    <span className="text-body-compact text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            <FileTextIcon aria-hidden className="size-4 shrink-0" />
            You can read the full complaint on this page before you sign.
          </p>
        </StageColumn>
      ) : flow.stage === "account" ? (
        <StageColumn>
          <p className="text-body">
            Your e-signature{sworn ? " and oath are" : " is"} recorded against your
            DRISTI account, so you need to be signed in.
          </p>
          <p className="text-body-compact text-muted-foreground">
            New to DRISTI? Choose to register on the next screen. It takes a few minutes, and
            this link brings you back here when you are done.
          </p>
          <p className="text-caption text-muted-foreground">
            Sandbox — no real account is created or checked.
          </p>
        </StageColumn>
      ) : flow.stage === "sign" ? (
        <StageColumn>
          {acts.length > 1 ? <StepTrail steps={trail("sign")} /> : null}
          <InstrumentChoice
            onAadhaar={() => {
              setOtp("");
              flow.go("otp");
            }}
            onDsc={() => {
              setDscFound(false);
              flow.go("dsc");
            }}
          />
        </StageColumn>
      ) : flow.stage === "otp" ? (
        <StageColumn>
          <OtpEntry id="link-otp" value={otp} onChange={setOtp} resent={resent} onResend={resendOtp} />
        </StageColumn>
      ) : flow.stage === "dsc" ? (
        <StageColumn>
          <DscLookup found={dscFound} holder="" />
        </StageColumn>
      ) : flow.stage === "signed" ? (
        <StageColumn>
          <SettledCard
            headline={signedWith ? INSTRUMENT_LABEL[signedWith] : "Signature added"}
            rows={[{ ...me, status: "signed" }]}
            footnote={
              sworn
                ? "Your oath is next."
                : "Nothing more is needed from you."
            }
          />
        </StageColumn>
      ) : flow.stage === "oath" ? (
        <StageColumn>
          {acts.length > 1 ? <StepTrail steps={trail("oath")} /> : null}
          <OathCapture value={oath} onChange={onOath} />
        </StageColumn>
      ) : (
        <StageColumn>
          <SettledCard
            headline={sworn ? "Signed and sworn" : "Signature added"}
            rows={[settledRow]}
            footnote="Nothing more is needed from you."
          />
        </StageColumn>
      )}
    </StagedOverlay>
  );
}

function LinkLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/** A link that no longer leads anywhere — expired, recalled, or mistyped. */
function LinkUnavailable() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center border-b border-hairline px-4 md:px-6">
        <BrandLockup className="h-9" />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-12">
        <h1 className="text-title text-balance font-semibold">This link is no longer active</h1>
        <p className="text-body text-muted-foreground">
          The complaint may have been changed and sent again, or the request recalled. Ask
          the advocate filing it to send you a new link.
        </p>
      </main>
    </div>
  );
}
