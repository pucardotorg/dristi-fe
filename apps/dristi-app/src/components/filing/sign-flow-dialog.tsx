"use client";

/**
 * **Signing, as one window with stages — the act, not a menu beside it.**
 *
 * Everything the filer *does* about signatures happens here: the decision that sends this
 * complaint out to the other parties, their own signature on it, and the paper path for a
 * complaint that will be signed by hand instead. The Sign step's rail keeps the roster
 * and nothing else, because a decision that puts work in other people's queues does not
 * belong in side navigation (owner, 2026-09-23: *"I feel a little uncomfortable with the
 * fact that all of this is driven by a side tab"*).
 *
 * It is built on the product's staged-overlay pattern (`components/chrome/staged-overlay`)
 * — the same frame the court-side acts use — so the chrome holds still, the stage travels,
 * and an outcome resolves in the scene it happened in rather than in a second window.
 *
 * ## One choice, one press
 *
 * Every question here is asked as a card that *does the thing*: the card names the route
 * and what it costs everyone else, and pressing it commits to that route. A radio group
 * plus a separate button below asks the same question twice, which is what the owner read
 * as overcomplicated (2026-09-23) — and the cards were the shape that was right in the
 * first place.
 *
 * ## The stages
 *
 * `choose` — digital or paper, each card saying what it does to the other parties.
 * `sign` — the link is out; now the filer's own instrument, Aadhaar OTP or their DSC.
 * `otp` / `dsc` — that instrument, doing its one job.
 * `done` — what just happened, resolving in the same scene as the act.
 * `paper` — the printed copy coming back, with each complainant's own confirmation.
 * `uploaded` — the same, settled.
 *
 * Signing here writes to the draft and nothing else: no e-sign provider is called, no
 * message is sent, and every screen that stands in for a real service says so in place.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SignatureIcon,
  UploadIcon,
} from "lucide-react";

import {
  StagedOverlay,
  useStagedFlow,
} from "@/components/chrome/staged-overlay";
import { getRepository, storeUpload } from "@/lib/filing/data";
import { forgetFile, formatBytes } from "@/lib/filing/files";
import { useProfile } from "@/lib/filing/profile";
import { phoneConfirmers, signatories } from "@/lib/filing/selectors";
import { useFiling } from "@/lib/filing/store";
import type {
  PhoneConfirmer,
  SignInstrument,
  StoredFileRef,
} from "@/lib/filing/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { RESOLVE_IN_PLACE } from "@/components/chrome/motion";
import { SectionNotice } from "@/components/filing/notices";
import { pickErrorMessage, useFilePicker } from "@/components/filing/use-file-picker";

/** Where the window opens, decided by what has happened to the complaint so far. */
export type SignFlowStart = "choose" | "sign" | "paper";

type Stage = "choose" | "sign" | "otp" | "dsc" | "done" | "paper" | "uploaded";

/**
 * Every stage, in the order the act moves through them — read by `useStagedFlow` for the
 * direction a stage travels. One list per starting point, because the window opens where
 * the complaint already is: a filer coming back to add their own signature has no use for
 * the decision that was made before they left, and the stage they land on has to be the
 * first in its own order.
 */
const ORDER: Record<SignFlowStart, readonly Stage[]> = {
  choose: ["choose", "sign", "otp", "dsc", "done", "paper", "uploaded"],
  sign: ["sign", "otp", "dsc", "done", "paper", "uploaded", "choose"],
  paper: ["paper", "uploaded", "choose", "sign", "otp", "dsc", "done"],
};

/**
 * Which scene each stage is looked at in. The two instruments and the outcome share one:
 * an act and its outcome are one beat, so the signature settles where it was made instead
 * of sliding in as a new question.
 */
const SCENES: Record<Stage, string> = {
  choose: "choose",
  sign: "sign",
  otp: "act",
  dsc: "act",
  done: "act",
  paper: "paper",
  uploaded: "paper",
};

/** How a signature names what made it — the whole line, not a fragment. */
const INSTRUMENT_LABEL: Record<SignInstrument, string> = {
  aadhaar: "Signed with Aadhaar OTP",
  dsc: "Signed with a DSC",
  paper: "Signed on paper",
};

export function SignFlowDialog({
  open,
  start,
  onOpenChange,
  onPrint,
}: {
  open: boolean;
  /** Where to open — computed by the step from the draft, once, as the window opens. */
  start: SignFlowStart;
  onOpenChange: (open: boolean) => void;
  onPrint: () => void;
}) {
  /* A fresh opening is a fresh act: the body remounts so it starts on the stage the
     complaint is actually at, with nothing typed into it from last time. */
  const [opening, setOpening] = React.useState(0);
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) setOpening((n) => n + 1);
    wasOpen.current = open;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SignFlowBody
          key={`${opening}:${start}`}
          start={start}
          onClose={() => onOpenChange(false)}
          onPrint={onPrint}
        />
      ) : null}
    </Dialog>
  );
}

function SignFlowBody({
  start,
  onClose,
  onPrint,
}: {
  start: SignFlowStart;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { draft, update, hrefFor } = useFiling();
  const { profile } = useProfile();
  const router = useRouter();
  const { pick, input } = useFilePicker();
  const flow = useStagedFlow<Stage>({
    order: ORDER[start],
    scene: SCENES,
    /* The window is already rising; a stage that rises inside it is one gesture twice. */
    arrival: "forward",
  });

  const sign = draft.sign;

  /* ── who signs ─────────────────────────────────────────────────────────── */
  const { complainants, advocates } = React.useMemo(
    () => signatories(draft, profile),
    [draft, profile]
  );
  const everyone = React.useMemo(
    () => [...complainants, ...advocates],
    [complainants, advocates]
  );
  const yous = everyone.filter((s) => s.you);
  const youSigned = yous.length > 0 && yous.every((s) => s.status === "signed");
  const pending = everyone.filter((s) => s.status === "pending").length;
  const otherSigners = Math.max(0, everyone.length - yous.length);
  const others =
    otherSigners === 1 ? "The other party" : `The other ${otherSigners} parties`;
  const have = otherSigners === 1 ? "has" : "have";

  /* ── the filer's own signature ─────────────────────────────────────────── */
  const [otp, setOtp] = React.useState("");
  const [resent, setResent] = React.useState(false);
  const [dscFound, setDscFound] = React.useState(false);
  const [signedWith, setSignedWith] = React.useState<SignInstrument | null>(null);
  const resendTimer = React.useRef<number | null>(null);

  /* ── the uploaded copy ─────────────────────────────────────────────────── */
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [otpFor, setOtpFor] = React.useState<string | null>(null);
  const [rowOtp, setRowOtp] = React.useState("");
  const [rowResent, setRowResent] = React.useState<string | null>(null);
  const rowResendTimer = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (resendTimer.current) window.clearTimeout(resendTimer.current);
      if (rowResendTimer.current) window.clearTimeout(rowResendTimer.current);
    },
    []
  );

  /*
   * A DSC is read off the signer's own machine, not from us, and the utility takes a
   * beat to answer. The stage says it is looking rather than presenting a certificate it
   * never went to find.
   */
  React.useEffect(() => {
    if (flow.stage !== "dsc" || dscFound) return;
    const timer = window.setTimeout(() => setDscFound(true), 1100);
    return () => window.clearTimeout(timer);
  }, [flow.stage, dscFound]);

  const mobileTail = (profile?.mobile ?? "").replace(/\D/g, "").slice(-4);
  const certHolder = (profile?.name ?? "").trim();

  const confirmRows = React.useMemo(() => phoneConfirmers(draft), [draft]);
  const isConfirmed = React.useCallback(
    (person: PhoneConfirmer) => {
      const record = sign.confirmed[person.id];
      const tail = person.mobile.replace(/\D/g, "").slice(-4);
      return !!record && !!tail && record.mobileTail === tail;
    },
    [sign.confirmed]
  );
  const confirmedCount = confirmRows.filter(isConfirmed).length;
  const allConfirmed =
    confirmRows.length > 0 && confirmedCount === confirmRows.length;

  /* ── acts ──────────────────────────────────────────────────────────────── */

  /**
   * The commitment, made by pressing the card that describes it. The draft stops being
   * private here: every other signatory is asked, by link, to sign this exact document.
   */
  const chooseDigital = () => {
    if (everyone.length === 0) return;
    const now = new Date().toISOString();
    update((d) => {
      d.sign.mode = "digital";
      d.sign.requestedAt = now;
      // Everyone but the people at this keyboard — "you" sign here, not by link.
      d.sign.notified = Object.fromEntries(
        everyone.filter((s) => !s.you).map((s) => [s.id, now])
      );
    });
    flow.go(yous.length > 0 ? "sign" : "done");
  };

  /**
   * Paper instead. Nothing is sent to anyone, and anything already outstanding is
   * recalled — the printed copy has to carry every signature by hand regardless.
   */
  const choosePaper = () => {
    update((d) => {
      d.sign.mode = "upload";
      d.sign.requestedAt = null;
      d.sign.notified = {};
      d.sign.signed = {};
      d.sign.confirmed = {};
    });
    setUploadError(null);
    setOtpFor(null);
    setRowOtp("");
    flow.go("paper");
  };

  /** One person's own signature, by the instrument in their own hands. */
  const signYou = (instrument: "aadhaar" | "dsc") => {
    if (yous.length === 0) return;
    const at = new Date().toISOString();
    update((d) => {
      for (const s of yous) d.sign.signed[s.id] = { at, with: instrument };
    });
    setSignedWith(instrument);
    flow.go("done");
  };

  const resendOtp = () => {
    setResent(true);
    if (resendTimer.current) window.clearTimeout(resendTimer.current);
    resendTimer.current = window.setTimeout(() => setResent(false), 2500);
  };

  const receiveSignedCopy = async (file: File) => {
    const previous = sign.signedCopy;
    let ref: StoredFileRef;
    try {
      ref = await storeUpload(file);
    } catch {
      setUploadError("We couldn't store that file in this browser. Please try again.");
      return;
    }
    update((d) => {
      d.sign.signedCopy = ref;
    });
    if (previous) {
      forgetFile(previous.id);
      void getRepository().deleteFile(previous.id);
    }
  };

  const chooseSignedCopy = () => {
    setUploadError(null);
    pick((file, error) => {
      if (error) {
        setUploadError(pickErrorMessage(error));
        return;
      }
      if (file) void receiveSignedCopy(file);
    });
  };

  const sendRowOtp = (id: string) => {
    setOtpFor(id);
    setRowOtp("");
    setRowResent(null);
  };

  const resendRowOtp = (id: string) => {
    setRowResent(id);
    if (rowResendTimer.current) window.clearTimeout(rowResendTimer.current);
    rowResendTimer.current = window.setTimeout(() => setRowResent(null), 2500);
  };

  const confirmRow = (person: PhoneConfirmer) => {
    const tail = person.mobile.replace(/\D/g, "").slice(-4);
    if (rowOtp.length < 6 || !tail) return;
    update((d) => {
      d.sign.confirmed[person.id] = {
        mobileTail: tail,
        at: new Date().toISOString(),
      };
    });
    setOtpFor(null);
    setRowOtp("");
    setRowResent(null);
  };

  /**
   * An uploaded copy is the complaint *after* every party has signed it, so it settles
   * the whole sheet rather than the uploader's own row — and each complainant has
   * confirmed by OTP, on their own number, before this can be pressed.
   */
  const submitSignedCopy = () => {
    if (!sign.signedCopy || !allConfirmed) return;
    const at = new Date().toISOString();
    update((d) => {
      for (const s of everyone) d.sign.signed[s.id] = { at, with: "paper" };
      d.sign.mode = "upload";
    });
    flow.go("uploaded");
  };

  /* ── the window ────────────────────────────────────────────────────────── */

  const title = {
    choose: "How will this complaint be signed?",
    sign: "Add your signature",
    otp: "Enter the OTP",
    dsc: "Sign with your DSC",
    done: youSigned
      ? signedWith
        ? INSTRUMENT_LABEL[signedWith]
        : "Your signature is recorded"
      : "Out for signature",
    paper: "Upload the signed complaint",
    uploaded: "Signed copy accepted",
  }[flow.stage];

  const description = {
    choose:
      everyone.length > 1
        ? `All ${everyone.length} signatories sign the same way.`
        : "Choose how this complaint is signed.",
    sign: "Either one is your own signature — use whichever you have.",
    otp: mobileTail
      ? `Sent to your Aadhaar-linked mobile ending ${mobileTail}.`
      : "Sent to your Aadhaar-linked mobile.",
    dsc: "Your certificate has to be plugged in, with the signing utility running on this computer.",
    done: null,
    paper: "Every party signs the printed copy by hand, and it comes back here as one file.",
    uploaded: null,
  }[flow.stage];

  const footer = {
    choose: null,
    sign: (
      <Button type="button" variant="ghost" onClick={onClose}>
        I&rsquo;ll sign later
      </Button>
    ),
    otp: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("sign")}>
          Back
        </Button>
        <Button type="button" disabled={otp.length < 6} onClick={() => signYou("aadhaar")}>
          Verify and sign
        </Button>
      </>
    ),
    dsc: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("sign")}>
          Back
        </Button>
        <Button type="button" disabled={!dscFound} onClick={() => signYou("dsc")}>
          Sign with this certificate
        </Button>
      </>
    ),
    done: (
      <Button type="button" onClick={onClose}>
        Done
      </Button>
    ),
    paper: (
      <>
        <Button type="button" variant="outline" onClick={() => flow.go("choose")}>
          Choose another way
        </Button>
        <Button
          type="button"
          disabled={!sign.signedCopy || !allConfirmed}
          onClick={submitSignedCopy}
        >
          Submit as fully signed
        </Button>
      </>
    ),
    uploaded: (
      <Button type="button" onClick={onClose}>
        Done
      </Button>
    ),
  }[flow.stage];

  return (
    <>
      {input}
      <StagedOverlay
        className="sm:max-w-2xl"
        title={title}
        titleRef={flow.titleRef}
        titleAside={
          flow.stage === "done" || flow.stage === "uploaded" ? (
            <Badge variant="success">
              <CheckIcon aria-hidden />
              {everyone.length - pending} of {everyone.length} signed
            </Badge>
          ) : null
        }
        description={description}
        sceneKey={flow.sceneKey}
        motion={flow.motion}
        floor
        footer={footer}
      >
        {flow.stage === "choose" ? (
          <StageColumn>
            <ChoiceCard
              title="Sign in the system"
              tone="bg-brand-muted text-brand-muted-foreground"
              icon={<SignatureIcon className="size-5" />}
              onClick={chooseDigital}
            >
              {otherSigners > 0 ? (
                <>
                  {others} {have === "has" ? "gets" : "get"} a link on their registered
                  mobile the moment you choose this, and{" "}
                  {otherSigners === 1 ? "signs" : "sign"} with their own Aadhaar OTP or
                  DSC. You sign yours next.
                </>
              ) : (
                <>You sign with your own Aadhaar OTP or your DSC, next.</>
              )}{" "}
              The complaint is locked for editing until every signature is in.
            </ChoiceCard>

            <ChoiceCard
              title="Sign on paper and upload"
              tone="bg-warning-muted text-warning-muted-foreground"
              icon={<UploadIcon className="size-5" />}
              onClick={choosePaper}
            >
              Nothing is sent to anyone. Print the complaint, have every party sign it by
              hand, then upload that one copy — each complainant confirms by OTP that the
              signature against their name is theirs.
            </ChoiceCard>

            <p className="text-caption text-muted-foreground">
              The court fee opens once every signature is in.
            </p>
          </StageColumn>
        ) : flow.stage === "sign" ? (
          <StageColumn>
            {otherSigners > 0 ? (
              <SectionNotice variant="success" announce="polite" title="Sent for signature">
                {others} {have} a link on their registered mobile and{" "}
                {otherSigners === 1 ? "signs" : "sign"} with their own Aadhaar OTP or DSC.
                Nothing is filed until every signature is in.
              </SectionNotice>
            ) : null}

            <p className="text-body font-medium">How will you sign?</p>

            <ChoiceCard
              title="Aadhaar OTP"
              tone="bg-info-muted text-info-muted-foreground"
              icon={<SignatureIcon className="size-5" />}
              onClick={() => {
                setOtp("");
                flow.go("otp");
              }}
            >
              A six-digit code goes to the mobile number registered with your Aadhaar.
            </ChoiceCard>

            <ChoiceCard
              title="My DSC"
              tone="bg-brand-muted text-brand-muted-foreground"
              icon={<ShieldCheckIcon className="size-5" />}
              onClick={() => {
                setDscFound(false);
                flow.go("dsc");
              }}
            >
              The Digital Signature Certificate already set up on this computer.
            </ChoiceCard>
          </StageColumn>
        ) : flow.stage === "otp" ? (
          <StageColumn>
            <div className="flex flex-col items-center gap-3">
              <InputOTP
                id="esign-otp"
                maxLength={6}
                value={otp}
                onChange={setOtp}
                aria-label="One-time password"
                containerClassName="gap-2"
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-12 rounded-lg border border-input text-title-s font-semibold tabular-nums"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-body-compact"
                onClick={resendOtp}
              >
                {resent ? "Sent again" : "Send it again"}
              </Button>
              <p className="text-caption text-muted-foreground">
                Sandbox — any six digits work.
              </p>
            </div>
          </StageColumn>
        ) : flow.stage === "dsc" ? (
          <StageColumn>
            {/* The height is held across both states so the footer does not jump. */}
            <div aria-live="polite" className="flex min-h-20 flex-col justify-center">
              {dscFound ? (
                <div className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-4">
                  <ShieldCheckIcon
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-success-ink"
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-body-compact font-medium">
                      {certHolder || "Certificate found on this computer"}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {certHolder
                        ? "Class 3 individual certificate, found on this computer"
                        : "Class 3 individual certificate"}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      Sandbox — no certificate store is read.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-3 text-body-compact text-muted-foreground">
                  <Spinner className="size-4 shrink-0" aria-hidden />
                  Looking for a certificate on this computer&hellip;
                </p>
              )}
            </div>
          </StageColumn>
        ) : flow.stage === "done" ? (
          <StageColumn>
            <div className={RESOLVE_IN_PLACE}>
              <SectionNotice
                variant="success"
                announce="polite"
                title={youSigned ? "Your signature is on the complaint" : "The requests are out"}
              >
                {pending === 0 ? (
                  <>Every party has signed. You can pay the court fee now.</>
                ) : otherSigners > 0 ? (
                  <>
                    {others} {have} a link on their registered mobile. Nothing is filed
                    until {pending === 1 ? "that signature is" : "all of them are"} in, and
                    the court fee opens then.
                  </>
                ) : (
                  <>Nothing is filed until every signature is in.</>
                )}
              </SectionNotice>
            </div>
            <p className="text-caption text-muted-foreground">
              You can close this. The step keeps the roster, and this is waiting in your
              pending tasks until it is done.
            </p>
          </StageColumn>
        ) : flow.stage === "paper" ? (
          <PaperStage
            file={sign.signedCopy}
            error={uploadError}
            onChoose={chooseSignedCopy}
            rows={confirmRows}
            confirmedCount={confirmedCount}
            isConfirmed={isConfirmed}
            otpFor={otpFor}
            rowOtp={rowOtp}
            rowResent={rowResent}
            onOpenRow={sendRowOtp}
            onRowOtp={setRowOtp}
            onResendRow={resendRowOtp}
            onConfirmRow={confirmRow}
            /* No number on file is a gap in the party's own section, so that is where
               it is fixed. */
            onAddNumber={() => {
              onClose();
              router.push(hrefFor("complainant"));
            }}
            onPrint={onPrint}
          />
        ) : (
          <StageColumn>
            <div className={RESOLVE_IN_PLACE}>
              <SectionNotice
                variant="success"
                announce="polite"
                title="Every signature is in"
              >
                The uploaded copy carries every signature, and each complainant has
                confirmed it on their own number. You can pay the court fee now.
              </SectionNotice>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={onPrint}
            >
              Print or save as PDF
            </Button>
          </StageColumn>
        )}
      </StagedOverlay>
    </>
  );
}

/* ───────────────────────────── Stages ──────────────────────────────────── */

/** A stage's column: reading width, centred in the canvas while there is room for it. */
function StageColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto my-auto flex w-full max-w-xl flex-col gap-4">
      {children}
    </div>
  );
}

/**
 * One route, as a card that takes it.
 *
 * The card carries the mark, the name and what the route does to everyone else, and
 * pressing it is the choice — there is no separate confirm below, because the sentence
 * the reader just read *is* the confirmation. This is the shape the owner picked out as
 * the right one (2026-09-23), and it is used for both questions the window asks: how the
 * complaint is signed, and which instrument the filer signs it with.
 */
function ChoiceCard({
  icon,
  tone,
  title,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  /** The tile's fill/foreground pair — a category mark, never a status. */
  tone: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-raised transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body font-semibold text-foreground">{title}</span>
        <span className="text-body-compact text-muted-foreground">{children}</span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

/**
 * The paper path: one file that already carries every signature, and each complainant's
 * own confirmation that the signature against their name is theirs.
 */
function PaperStage({
  file,
  error,
  onChoose,
  rows,
  confirmedCount,
  isConfirmed,
  otpFor,
  rowOtp,
  rowResent,
  onOpenRow,
  onRowOtp,
  onResendRow,
  onConfirmRow,
  onAddNumber,
  onPrint,
}: {
  file: StoredFileRef | null;
  error: string | null;
  onChoose: () => void;
  rows: PhoneConfirmer[];
  confirmedCount: number;
  isConfirmed: (person: PhoneConfirmer) => boolean;
  otpFor: string | null;
  rowOtp: string;
  rowResent: string | null;
  onOpenRow: (id: string) => void;
  onRowOtp: (value: string) => void;
  onResendRow: (id: string) => void;
  onConfirmRow: (person: PhoneConfirmer) => void;
  onAddNumber: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionNotice variant="warning" title="Every signature has to be on the copy">
        Each complainant, and one advocate for each complainant, must have signed this
        printed copy by hand. Nothing is filed until the copy carries every signature and
        each complainant has confirmed by OTP.
      </SectionNotice>

      {file ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-card p-4">
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-compact font-medium">{file.name}</p>
            <p className="text-caption text-muted-foreground tabular-nums">
              {file.ext}
              {formatBytes(file.size) ? ` · ${formatBytes(file.size)}` : ""}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onChoose}>
            Replace
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onChoose}
          className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-card p-6 text-center outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <UploadIcon className="size-8 text-muted-foreground" aria-hidden />
          <span className="text-body-compact text-muted-foreground">
            Choose the signed file from{" "}
            <span className="font-medium text-primary underline underline-offset-2">
              my files
            </span>
          </span>
        </button>
      )}

      {error ? (
        <SectionNotice
          variant="destructive"
          announce="assertive"
          title="That file wasn’t added"
        >
          {error}
        </SectionNotice>
      ) : null}

      <p className="text-body-compact text-muted-foreground">
        Upload .jpg, .png, .jpeg, .webp or .pdf. Maximum upload size of 15 MB.
      </p>

      <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body font-semibold">Verify phone numbers</h3>
          <span className="text-caption font-medium text-muted-foreground tabular-nums">
            {confirmedCount} of {rows.length} confirmed
          </span>
        </div>
        <p className="text-body-compact text-muted-foreground">
          This ensures the litigant has access to their case file.
        </p>
        <ul>
          {rows.map((person, i) => (
            <ConfirmRow
              key={person.id}
              person={person}
              index={i}
              confirmed={isConfirmed(person)}
              open={otpFor === person.id}
              otp={otpFor === person.id ? rowOtp : ""}
              resent={rowResent === person.id}
              onOpen={() => onOpenRow(person.id)}
              onOtp={onRowOtp}
              onResend={() => onResendRow(person.id)}
              onConfirm={() => onConfirmRow(person)}
              onAddNumber={onAddNumber}
            />
          ))}
        </ul>
      </div>

      <p className="flex flex-wrap items-center gap-1 text-body-compact">
        Need the unsigned document to sign on paper?
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 underline"
          onClick={onPrint}
        >
          Print or save as PDF
        </Button>
      </p>
    </div>
  );
}

/* ──────────────────── Phone confirmation (paper path) ──────────────────── */

/** The tail of a number, for display — the row never repeats the whole thing back. */
function mobileTailOf(mobile: string): string {
  return mobile.replace(/\D/g, "").slice(-4);
}

/**
 * One party on the uploaded copy, and the OTP that turns "someone says they all signed"
 * into that person's own confirmation. The OTP only proves the handset; the sentence
 * above it is what the person is actually answering, so the two never appear apart.
 *
 * There is no link here on purpose — every confirmation happens in this sitting. Paper is
 * the path we would rather people did not take, so its friction is left in place (owner,
 * 2026-08-19).
 */
function ConfirmRow({
  person,
  index,
  confirmed,
  open,
  otp,
  resent,
  onOpen,
  onOtp,
  onResend,
  onConfirm,
  onAddNumber,
}: {
  person: PhoneConfirmer;
  index: number;
  confirmed: boolean;
  open: boolean;
  otp: string;
  resent: boolean;
  onOpen: () => void;
  onOtp: (value: string) => void;
  onResend: () => void;
  onConfirm: () => void;
  onAddNumber: () => void;
}) {
  const tail = mobileTailOf(person.mobile);
  const otpId = `confirm-otp-${person.id}`;

  return (
    <li className="border-b border-hairline py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-medium text-secondary-foreground tabular-nums"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-compact font-semibold text-foreground">
            {person.name}
          </p>
          <p className="text-caption font-medium text-muted-foreground">
            {person.role} ·{" "}
            {tail ? (
              <span className="tabular-nums">•••• {tail}</span>
            ) : (
              "No mobile number"
            )}
          </p>
        </div>
        {/* One action or one status per row, never both — the action replaces the cue. */}
        {confirmed ? (
          <Badge variant="success">
            <CheckIcon aria-hidden />
            Confirmed
          </Badge>
        ) : !tail ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 underline"
            onClick={onAddNumber}
          >
            Add number
          </Button>
        ) : open ? null : (
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            Send OTP
          </Button>
        )}
      </div>

      {open && !confirmed && tail ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface-sunken p-4">
          <p className="text-body-compact text-muted-foreground">
            In the live service, a 6-digit OTP goes to{" "}
            <strong className="font-semibold text-foreground tabular-nums">
              •••• {tail}
            </strong>
            . Entering it confirms that{" "}
            <strong className="font-semibold text-foreground">{person.name}</strong> has
            signed this complaint.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor={otpId} className="text-body-compact">
              Enter OTP
            </Label>
            <InputOTP
              id={otpId}
              maxLength={6}
              value={otp}
              onChange={onOtp}
              containerClassName="gap-2"
              // Opening a row reveals the field below the fold; focus follows the action
              // so it scrolls into view and a keyboard user lands on it.
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-10 rounded-lg border border-input"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-caption text-muted-foreground">
              Sandbox — any 6-digit code is accepted here.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 underline"
              onClick={onResend}
            >
              {resent ? "Sent again" : "Resend OTP"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={otp.length < 6}
              onClick={onConfirm}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
