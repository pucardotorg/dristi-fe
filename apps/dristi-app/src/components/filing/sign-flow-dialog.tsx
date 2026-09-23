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
 * ## What it does not do
 *
 * It does not open by itself. The owner asked whether the window should appear a second
 * or two after the step loads; it does not, because the press is what makes the
 * commitment consent rather than a consequence of navigation. People arrive on this step
 * by back button, refresh and bookmark as well as by walking the flow, a window that
 * covers the document they have just started reading is a window they dismiss without
 * reading, and a dismissible commitment is the problem this design set out to remove.
 * The launcher is in the main column instead, above the document and impossible to miss.
 *
 * ## The stages
 *
 * `commit` — how this complaint is signed, presumed digital, and the press that sends it.
 * `sign` — the filer's own signature, with the instrument in their own hands.
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
  FileTextIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react";

import { ChoicePillGroup } from "@/components/cases/filing-form-shared";
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
export type SignFlowStart = "commit" | "sign" | "done" | "paper";

type Stage = "commit" | "sign" | "done" | "paper" | "uploaded";

/**
 * Every stage, in the order the act moves through them — read by `useStagedFlow` for the
 * direction a stage travels. One list per starting point, because the window opens where
 * the complaint already is: a filer coming back to add their own signature has no use for
 * the decision that was made before they left, and the stage they land on has to be the
 * first in its own order.
 */
const ORDER: Record<SignFlowStart, readonly Stage[]> = {
  commit: ["commit", "sign", "done", "paper", "uploaded"],
  sign: ["sign", "done", "paper", "uploaded", "commit"],
  done: ["done", "sign", "paper", "uploaded", "commit"],
  paper: ["paper", "uploaded", "commit", "sign", "done"],
};

/**
 * Which scene each stage is looked at in. `sign` and `done` share one, and so do `paper`
 * and `uploaded`: an act and its outcome are one beat, so the outcome settles where the
 * act happened instead of sliding in as a new question.
 */
const SCENES: Record<Stage, string> = {
  commit: "commit",
  sign: "sign",
  done: "sign",
  paper: "paper",
  uploaded: "paper",
};

/** How the outcome names what was just used. Paper settles on its own stage. */
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

  /* ── the decision ──────────────────────────────────────────────────────── */
  /** Presumed digital: the common path costs one press and no decision. */
  const [method, setMethod] = React.useState<"digital" | "upload">(sign.mode);

  /* ── the filer's own signature ─────────────────────────────────────────── */
  const [instrument, setInstrument] = React.useState<"aadhaar" | "dsc" | "">("");
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
    if (instrument !== "dsc" || dscFound) return;
    const timer = window.setTimeout(() => setDscFound(true), 1100);
    return () => window.clearTimeout(timer);
  }, [instrument, dscFound]);

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
   * The commitment. One press, and the draft stops being private: every other signatory
   * is asked, by link, to sign this exact document.
   */
  const commit = () => {
    if (method === "upload") {
      update((d) => {
        d.sign.mode = "upload";
        d.sign.requestedAt = null;
        d.sign.notified = {};
        d.sign.signed = {};
        d.sign.confirmed = {};
      });
      flow.go("paper");
      return;
    }
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

  /** One person's own signature, by the instrument in their own hands. */
  const signYou = () => {
    if (yous.length === 0 || instrument === "") return;
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

  /** Back to signing in the system. Nothing goes out until the commitment is pressed. */
  const backToDigital = () => {
    update((d) => {
      d.sign.mode = "digital";
      d.sign.signed = {};
      d.sign.confirmed = {};
    });
    setMethod("digital");
    setUploadError(null);
    setOtpFor(null);
    setRowOtp("");
    flow.go("commit");
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

  const title =
    flow.stage === "commit"
      ? "Send this complaint for signature"
      : flow.stage === "sign"
        ? "Add your signature"
        : flow.stage === "done"
          ? youSigned
            ? "You have signed"
            : "Out for signature"
          : flow.stage === "paper"
            ? "Upload the signed complaint"
            : "Signed copy accepted";

  const description =
    flow.stage === "commit"
      ? everyone.length > 1
        ? `All ${everyone.length} signatories sign the same way.`
        : "How this complaint is signed."
      : flow.stage === "sign"
        ? "Either one is your own signature — use whichever you have."
        : flow.stage === "paper"
          ? "The printed complaint, once every party has signed it by hand."
          : null;

  const footer =
    flow.stage === "commit" ? (
      <Button type="button" onClick={commit}>
        {method === "digital" ? "Send for signature" : "Continue to the signed copy"}
      </Button>
    ) : flow.stage === "sign" ? (
      <>
        <Button type="button" variant="ghost" onClick={onClose}>
          I&rsquo;ll sign later
        </Button>
        <Button
          type="button"
          disabled={
            instrument === "" ||
            (instrument === "aadhaar" && otp.length < 6) ||
            (instrument === "dsc" && !dscFound)
          }
          onClick={signYou}
        >
          {instrument === "dsc" ? "Sign with this certificate" : "Verify and sign"}
        </Button>
      </>
    ) : flow.stage === "paper" ? (
      <>
        <Button type="button" variant="ghost" onClick={backToDigital}>
          Sign in the system instead
        </Button>
        <Button
          type="button"
          disabled={!sign.signedCopy || !allConfirmed}
          onClick={submitSignedCopy}
        >
          Submit as fully signed
        </Button>
      </>
    ) : (
      <Button type="button" onClick={onClose}>
        Done
      </Button>
    );

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
        {flow.stage === "commit" ? (
          <CommitStage
            method={method}
            onMethod={setMethod}
            others={others}
            otherSigners={otherSigners}
          />
        ) : flow.stage === "sign" ? (
          <SignStage
            instrument={instrument}
            onInstrument={(next) => {
              setInstrument(next);
              if (next === "aadhaar") setDscFound(false);
              if (next === "dsc") setOtp("");
            }}
            otp={otp}
            onOtp={setOtp}
            resent={resent}
            onResend={resendOtp}
            mobileTail={mobileTail}
            dscFound={dscFound}
            certHolder={certHolder}
            others={others}
            otherSigners={otherSigners}
          />
        ) : flow.stage === "done" ? (
          <DoneStage
            youSigned={youSigned}
            signedWith={signedWith}
            pending={pending}
            others={others}
            otherSigners={otherSigners}
          />
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
            /* No number on file is a gap in the party's own section, so that is
               where it is fixed. */
            onAddNumber={() => {
              onClose();
              router.push(hrefFor("complainant"));
            }}
            onPrint={onPrint}
          />
        ) : (
          <UploadedStage onPrint={onPrint} />
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
 * The commitment.
 *
 * Digital arrives already chosen, because it is what nearly every filing does and a
 * question nobody has a reason to answer differently is a question not worth asking. What
 * the press will *do* is stated under the choice and changes with it — the press sends
 * work to other people, and that has to be readable before it is pressed, not after
 * (owner's colleague, 2026-09-23).
 */
function CommitStage({
  method,
  onMethod,
  others,
  otherSigners,
}: {
  method: "digital" | "upload";
  onMethod: (next: "digital" | "upload") => void;
  others: string;
  otherSigners: number;
}) {
  return (
    <StageColumn>
      <ChoicePillGroup
        legend="How will this complaint be signed?"
        orientation="column"
        options={[
          { id: "digital", label: "Signed in the system" },
          { id: "upload", label: "Signed on paper and uploaded" },
        ]}
        value={method}
        onChange={onMethod}
      />

      <SectionNotice
        variant={method === "digital" ? "info" : "warning"}
        title={method === "digital" ? "What happens when you send" : "Nothing is sent"}
      >
        {method === "digital" ? (
          <>
            {otherSigners > 0 ? (
              <>
                {others} {otherSigners === 1 ? "gets" : "get"} a link on their registered
                mobile and {otherSigners === 1 ? "signs" : "sign"} with their own Aadhaar
                OTP or DSC. You sign yours next.{" "}
              </>
            ) : (
              <>You sign with your own Aadhaar OTP or DSC, next. </>
            )}
            The complaint is locked for editing until every signature is in.
          </>
        ) : (
          <>
            Print the complaint, have every party sign it by hand, then upload that copy.
            Each complainant confirms by OTP that the signature is theirs.
          </>
        )}
      </SectionNotice>

      <p className="text-caption text-muted-foreground">
        The court fee opens once every signature is in.
      </p>
    </StageColumn>
  );
}

/**
 * The filer's own signature, and the one place the two instruments appear.
 *
 * Neither is preselected: this is a personal act, and which of the two a person holds is
 * not something the system can presume. The chosen one reveals what it needs — six digits
 * or a certificate — under the choice rather than in another window.
 */
function SignStage({
  instrument,
  onInstrument,
  otp,
  onOtp,
  resent,
  onResend,
  mobileTail,
  dscFound,
  certHolder,
  others,
  otherSigners,
}: {
  instrument: "aadhaar" | "dsc" | "";
  onInstrument: (next: "aadhaar" | "dsc") => void;
  otp: string;
  onOtp: (value: string) => void;
  resent: boolean;
  onResend: () => void;
  mobileTail: string;
  dscFound: boolean;
  certHolder: string;
  others: string;
  otherSigners: number;
}) {
  return (
    <StageColumn>
      <ChoicePillGroup
        legend="How will you sign?"
        options={[
          { id: "aadhaar", label: "Aadhaar OTP" },
          { id: "dsc", label: "My DSC" },
        ]}
        value={instrument}
        onChange={onInstrument}
      />

      {instrument === "aadhaar" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-card p-4">
          <p className="text-body-compact text-muted-foreground">
            {mobileTail ? (
              <>
                A six-digit code goes to your Aadhaar-linked mobile ending{" "}
                <strong className="font-semibold text-foreground tabular-nums">
                  {mobileTail}
                </strong>
                .
              </>
            ) : (
              "A six-digit code goes to your Aadhaar-linked mobile."
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="esign-otp" className="text-body-compact">
              Enter OTP
            </Label>
            <InputOTP
              id="esign-otp"
              maxLength={6}
              value={otp}
              onChange={onOtp}
              containerClassName="gap-2"
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-10 rounded-lg border border-input tabular-nums"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-body-compact underline"
              onClick={onResend}
            >
              {resent ? "Sent again" : "Send it again"}
            </Button>
            <p className="text-caption text-muted-foreground">
              Sandbox — any six digits work.
            </p>
          </div>
        </div>
      ) : instrument === "dsc" ? (
        <div
          aria-live="polite"
          /* A hairline, not fill alone: `card` is the page white in light and flat with
             the canvas in dark, so an unbordered box has no edge there at all. */
          className="flex min-h-20 flex-col justify-center rounded-lg border border-hairline bg-card p-4"
        >
          {dscFound ? (
            <div className="flex items-start gap-3">
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
      ) : null}

      {otherSigners > 0 ? (
        <p className="text-caption text-muted-foreground">
          {others} {otherSigners === 1 ? "signs" : "sign"} with their own Aadhaar OTP or
          DSC, from the link already sent.
        </p>
      ) : null}
    </StageColumn>
  );
}

/** The outcome, settling in the scene the act happened in. */
function DoneStage({
  youSigned,
  signedWith,
  pending,
  others,
  otherSigners,
}: {
  youSigned: boolean;
  signedWith: SignInstrument | null;
  pending: number;
  others: string;
  otherSigners: number;
}) {
  return (
    <StageColumn>
      <div className={RESOLVE_IN_PLACE}>
        <SectionNotice
          variant="success"
          announce="polite"
          title={
            youSigned
              ? (signedWith ? INSTRUMENT_LABEL[signedWith] : "Your signature is recorded")
              : "The requests are out"
          }
        >
          {pending === 0 ? (
            <>Every party has signed. You can pay the court fee now.</>
          ) : otherSigners > 0 ? (
            <>
              {others} {otherSigners === 1 ? "has" : "have"} a link on their registered
              mobile. Nothing is filed until {pending === 1 ? "that signature" : "all of them"}{" "}
              {pending === 1 ? "is" : "are"} in, and the court fee opens then.
            </>
          ) : (
            <>Nothing is filed until every signature is in.</>
          )}
        </SectionNotice>
      </div>

      <p className="text-caption text-muted-foreground">
        You can close this. The step keeps the roster, and this is waiting in your pending
        tasks until it is done.
      </p>
    </StageColumn>
  );
}

function UploadedStage({ onPrint }: { onPrint: () => void }) {
  return (
    <StageColumn>
      <div className={RESOLVE_IN_PLACE}>
        <SectionNotice variant="success" announce="polite" title="Every signature is in">
          The uploaded copy carries every signature, and each complainant has confirmed it
          on their own number. You can pay the court fee now.
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
      <SectionNotice variant="warning" title="Ensure all parties have signed">
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
