"use client";

/**
 * Sign the complaint — the document in the column, and one rail beside it carrying both
 * who has signed and what you can do about it (stacked above the document below `xl`).
 *
 * It keeps the filing's Sections rail like every other step: the old two-rail layout ate
 * the width the rail needed, which left Sign the one screen you could not navigate out of
 * the way the rest of the flow had taught you.
 *
 * Committing to a mode is its own step, not a click on the rail: the rail carries one
 * "Continue to sign" button, which opens a dialog naming both paths and what each one
 * does to the *other* signatories — before either is clickable, not after. Nothing here
 * is a private action; every party on the complaint signs the one way that was chosen.
 *
 * The paying half of the flow lives here too: fees → process and address → payment →
 * the case file number. The document itself is the shared court sheet Preview renders.
 *
 * Signing and payment are the one part of this flow with no real system behind them yet.
 * They are wired to the draft (who signed, in what mode, what was chosen, what was
 * "paid") and every screen that stands in for a real service says so in place.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  PrinterIcon,
  SendIcon,
  ShieldCheckIcon,
  SignatureIcon,
  UploadIcon,
} from "lucide-react";

import { getRepository, storeUpload } from "@/lib/filing/data";
import { forgetFile, formatBytes } from "@/lib/filing/files";
import { money, toLongDate } from "@/lib/filing/format";
import {
  CHANNEL_FEE,
  COURT,
  DELIVERY_CHANNEL,
  DELIVERY_MIN_ROUNDS,
  PROCESS_OPTIONS,
} from "@/lib/filing/options";
import { useProfile } from "@/lib/filing/profile";
import {
  feeBill,
  phoneConfirmers,
  processPlan,
  signatories,
  type AccusedPlan,
  type BilledLine,
} from "@/lib/filing/selectors";
import { FILINGS_HOME, neighbours } from "@/lib/filing/steps";
import { useFiling } from "@/lib/filing/store";
import type {
  PhoneConfirmer,
  SignInstrument,
  Signatory,
  StoredFileRef,
} from "@/lib/filing/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useSourceDock } from "@/hooks/use-min-width";
import { TOP_BAR_HEIGHT } from "@/components/filing/chrome";
import { ConfirmDialog } from "@/components/filing/confirm-dialog";
import { FilingFooter } from "@/components/filing/filing-footer";
import { FilingPageHeader } from "@/components/filing/filing-page-header";
import { FilingMain, useSourceRailSlot } from "@/components/filing/filing-shell";
import { PANEL_CLASS } from "@/components/filing/form-card";
import { useLeaveGuard } from "@/components/filing/leave-guard";
import { SectionNotice } from "@/components/filing/notices";
import { CourtDocument } from "@/components/filing/sections/preview/court-document";
import { pickErrorMessage, useFilePicker } from "@/components/filing/use-file-picker";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Identifier } from "@/components/chrome/identifier";

type ModalKey =
  | "esign"
  | "dsc"
  | "upload"
  | "payment"
  | "procaddr"
  | "processing"
  | "success"
  | null;

const REF_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Stand-in payment reference — the shape a gateway returns, generated locally. */
function newPaymentRef(): string {
  const n = 10;
  let out = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  } else {
    for (let i = 0; i < n; i += 1) {
      out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
  }
  return `TXN-${out}`;
}

function newCaseFileNumber(): string {
  const serial = String(Date.now() % 1_000_000).padStart(6, "0");
  return `KL-${serial}-${new Date().getFullYear()}`;
}

/* ───────────────────────────── Signature rail ──────────────────────── */

/** What a signature was made with, as a row says it. */
const INSTRUMENT: Record<SignInstrument, string> = {
  aadhaar: "Aadhaar OTP",
  dsc: "a DSC",
  paper: "on paper",
};

/** "2:04 pm" — the product's clock, as `lib/tasks/format` writes it. */
function timeOf(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "h:mm a").replace("AM", "am").replace("PM", "pm");
}

/**
 * Who must sign, and where each of them has got to.
 *
 * A row states only what has actually happened. Before the requests go out there is no
 * "Pending" chip on anybody, because nobody has been asked — a roster that shows a case
 * waiting on signatures the system was never told to collect is the screen describing a
 * state it never entered (owner's colleague, 2026-09-23).
 */
function SignatureList({
  title,
  rows,
  requested,
  notified,
}: {
  title: string;
  rows: Signatory[];
  /** Whether the signature requests have gone out at all. */
  requested: boolean;
  /** Signatory id → when their link was last sent. */
  notified: Record<string, string>;
}) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption font-medium text-muted-foreground">{title}</p>
      <ul className="flex flex-col">
        {rows.map((s, i) => {
          const sent = timeOf(notified[s.id]);
          return (
            <li
              key={s.id}
              className="flex items-start gap-3 border-b border-hairline py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-medium text-secondary-foreground tabular-nums"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-compact font-semibold text-foreground">
                    {s.name}
                  </span>
                  {/* One chip per row — the status. "You" is a caption, not a badge. */}
                  {s.you ? (
                    <span className="text-caption font-medium text-muted-foreground">
                      You
                    </span>
                  ) : null}
                </div>
                <p className="text-caption font-medium text-muted-foreground">{s.role}</p>
                {s.status === "signed" ? (
                  <p className="text-caption text-muted-foreground">
                    Signed with {INSTRUMENT[s.signedWith ?? "aadhaar"]}
                  </p>
                ) : requested && !s.you ? (
                  <p className="text-caption text-muted-foreground tabular-nums">
                    Link sent{sent ? ` ${sent}` : ""}
                  </p>
                ) : null}
              </div>
              <span className="mt-px shrink-0">
                {s.status === "signed" ? (
                  <Badge variant="success">
                    <CheckIcon aria-hidden />
                    Signed
                  </Badge>
                ) : requested ? (
                  <Badge variant="secondary">Waiting</Badge>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SignatureSummary({
  complainants,
  advocates,
  requested,
  notified,
}: {
  complainants: Signatory[];
  advocates: Signatory[];
  requested: boolean;
  notified: Record<string, string>;
}) {
  const all = [...complainants, ...advocates];
  const signed = all.filter((s) => s.status === "signed").length;
  const pct = all.length ? Math.round((signed / all.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-body font-semibold">Signatures</h2>
          <span className="text-caption font-medium text-muted-foreground tabular-nums">
            {requested
              ? `${signed} of ${all.length} signed`
              : all.length === 1
                ? "1 to sign"
                : `${all.length} to sign`}
          </span>
        </div>
        <Progress
          value={pct}
          aria-label={`${signed} of ${all.length} signatures collected`}
          className="h-1.5"
        />
      </div>
      <SignatureList
        title="Complainant signature"
        rows={complainants}
        requested={requested}
        notified={notified}
      />
      <SignatureList
        title="Advocate signature"
        rows={advocates}
        requested={requested}
        notified={notified}
      />
    </div>
  );
}

/* ───────────────────────────── Fees ────────────────────────────────── */

/**
 * One group of the bill: its lines, and what they come to.
 *
 * A line states its rate and its multiplier whenever it is charged more than once
 * ("₹49 × 3 addresses"), so the number on the right can always be accounted for. The
 * group is a well inside the dialog panel, and its total is the only bold thing in it.
 */
function FeeGroup({
  title,
  caption,
  lines,
  total,
}: {
  title: React.ReactNode;
  caption?: string;
  lines: BilledLine[];
  total: number;
}) {
  if (!lines.length) return null;
  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-lg bg-surface-sunken p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body-compact font-semibold text-foreground">{title}</h3>
        <span className="text-body-compact font-semibold tabular-nums">
          {money(total)}
        </span>
      </div>
      {caption ? <p className="text-caption text-muted-foreground">{caption}</p> : null}
      <dl className="flex flex-col divide-y divide-hairline">
        {lines.map((line) => (
          <div key={line.key} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="min-w-0 text-body-compact text-muted-foreground">
              {line.label}
              {line.unitNote ? (
                <span className="tabular-nums">
                  {" "}
                  · {money(line.rate)} × {line.unitNote}
                </span>
              ) : null}
            </dt>
            <dd className="shrink-0 text-body-compact font-medium tabular-nums">
              {money(line.amount)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ──────────────────── Phone confirmation (upload path) ─────────────── */

/** The tail of a number, for display — the row never repeats the whole thing back. */
function mobileTailOf(mobile: string): string {
  return mobile.replace(/\D/g, "").slice(-4);
}

/**
 * One party on the uploaded copy, and the OTP that turns "someone says they all signed"
 * into that person's own confirmation. The OTP only proves the handset; the sentence
 * above it is what the person is actually answering, so the two never appear apart.
 *
 * There is no link here on purpose — every confirmation happens in this sitting. Upload
 * is the path we would rather people did not take, so its friction is left in place
 * (owner, 2026-08-19).
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
            <strong className="font-semibold text-foreground">
              {person.name}
            </strong>{" "}
            has signed this complaint.
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

/* ───────────────────────────── Screen ──────────────────────────────── */

export function SignSection() {
  const { draft, update, hrefFor, flush } = useFiling();
  const { profile } = useProfile();
  const { prev } = neighbours("sign");
  const { pick, input } = useFilePicker();
  const router = useRouter();
  const docked = useSourceDock();
  const slot = useSourceRailSlot();

  const [modal, setModal] = React.useState<ModalKey>(null);
  /** Where the person asked to go while this version is out for signature. */
  const [leaveTo, setLeaveTo] = React.useState<string | null>(null);
  /** The "switch to paper" question, which recalls requests other people already have. */
  const [switchOpen, setSwitchOpen] = React.useState(false);
  /** A reminder just went out — said once, then it goes quiet again. */
  const [reminded, setReminded] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [resent, setResent] = React.useState(false);
  /** Whether the signing utility has answered with a certificate yet — DSC path. */
  const [dscFound, setDscFound] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  /** The one confirmation row open for its OTP — one at a time, so the list stays a list. */
  const [otpFor, setOtpFor] = React.useState<string | null>(null);
  const [rowOtp, setRowOtp] = React.useState("");
  const [rowResent, setRowResent] = React.useState<string | null>(null);

  const remindTimer = React.useRef<number | null>(null);
  const payTimer = React.useRef<number | null>(null);
  const copyTimer = React.useRef<number | null>(null);
  const resendTimer = React.useRef<number | null>(null);
  const rowResendTimer = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (payTimer.current) window.clearTimeout(payTimer.current);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      if (resendTimer.current) window.clearTimeout(resendTimer.current);
      if (rowResendTimer.current) window.clearTimeout(rowResendTimer.current);
      if (remindTimer.current) window.clearTimeout(remindTimer.current);
    },
    []
  );

  /*
   * A DSC is read off the signer's own machine, not from us, and the utility takes a
   * beat to answer. The screen says what it is doing while it looks rather than
   * presenting a certificate it never went to find.
   */
  React.useEffect(() => {
    if (modal !== "dsc" || dscFound) return;
    const timer = window.setTimeout(() => setDscFound(true), 1100);
    return () => window.clearTimeout(timer);
  }, [modal, dscFound]);

  const filed = draft.status === "filed";
  const sign = draft.sign;
  /**
   * The one question the whole step turns on: has this complaint been sent for
   * signature? Until it has, nothing has left the building and everything here is still
   * the filer's own. After it has, other people hold tasks against this exact document.
   */
  const requested = sign.requestedAt !== null;
  const onPaper = sign.mode === "upload";

  /** The bill, derived from this draft — see `feeBill` for what makes it specific. */
  const bill = React.useMemo(() => feeBill(draft), [draft]);
  /** What each accused is having served — defaults applied, floors held (`PAY-10/11/15`). */
  const plans = React.useMemo(() => processPlan(draft), [draft]);
  /** What the process group is for, in one sentence: rounds, per accused, and where. */
  const processCaption = React.useMemo(() => {
    const each = plans.map((plan) => {
      const rounds = PROCESS_OPTIONS.filter((o) => (plan.rounds[o.key] ?? 0) > 0)
        .map((o) => `${plan.rounds[o.key]} × ${o.label.toLowerCase()}`)
        .join(", ");
      const where =
        plan.selected.length === 1 ? "1 address" : `${plan.selected.length} addresses`;
      return plans.length > 1
        ? `${plan.label}: ${rounds} at ${where}`
        : `${rounds}, served at ${where}`;
    });
    return `${each.join(" · ")}.`;
  }, [plans]);

  // Who signs is derived from the parties, never stored: editing a party changes this list.
  const { complainants, advocates } = React.useMemo(
    () => signatories(draft, profile),
    [draft, profile]
  );
  const everyone = React.useMemo(
    () => [...complainants, ...advocates],
    [complainants, advocates]
  );
  // The same person can be both a complainant and the advocate — one signature covers
  // every capacity they sign in.
  const yous = everyone.filter((s) => s.you);
  const youSigned = yous.length > 0 && yous.every((s) => s.status === "signed");
  const allSigned = everyone.length > 0 && everyone.every((s) => s.status === "signed");
  const anySigned = everyone.some((s) => s.status === "signed");
  const pending = everyone.filter((s) => s.status === "pending").length;
  /** Everyone the requests go out to — the signatories who are not at this keyboard. */
  const otherSigners = Math.max(0, everyone.length - yous.length);

  /*
   * Everyone who has to sign the uploaded copy and has a number of their own: each
   * complainant, or their PoA holder in their place, or the representative who answers
   * for an institution. Advocates cannot appear — the Advocate section collects a name
   * and a bar number and no phone.
   */
  const confirmRows = React.useMemo(() => phoneConfirmers(draft), [draft]);
  /**
   * A confirmation belongs to the number it was given for. Editing a party's mobile
   * afterwards voids it rather than carrying the record to a different handset — which
   * is why this is derived from the draft each render instead of a stored flag.
   */
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

  /**
   * Every signature on this screen belongs to *this* version of the complaint. Going back
   * to change the case means the sheet the parties signed no longer exists, so the
   * signatures cannot survive the trip — the question is asked before the move, not after.
   *
   * It is asked from the moment the requests go out, not from the first signature: once
   * other people are holding a task against this document, editing it makes them sign
   * something else. So the guard catches "asked but nobody has signed yet" too.
   */
  const guardLeaving = React.useCallback(
    (href: string) => {
      if (filed || (!anySigned && !requested)) return false;
      setLeaveTo(href);
      return true;
    },
    [filed, anySigned, requested, setLeaveTo]
  );
  useLeaveGuard(guardLeaving);

  /**
   * Take this version of the complaint out of signature: signatures void, requests
   * recalled, an uploaded copy forgotten. The mode itself survives — how this filing is
   * to be signed is a decision about the filing, not about the draft it was made on.
   */
  const discardSignatures = () => {
    const copy = sign.signedCopy;
    update((d) => {
      d.sign.signed = {};
      d.sign.requestedAt = null;
      d.sign.notified = {};
      d.sign.signedCopy = null;
      // Each party confirmed they had signed *this* sheet. A sheet that no longer
      // exists takes its confirmations with it.
      d.sign.confirmed = {};
    });
    if (copy) {
      forgetFile(copy.id);
      void getRepository().deleteFile(copy.id);
    }
  };

  const confirmLeave = () => {
    const href = leaveTo;
    discardSignatures();
    setLeaveTo(null);
    if (href) router.push(href);
  };

  // A filed draft must reach storage even if the tab closes on the success screen.
  React.useEffect(() => {
    if (filed) void flush();
  }, [filed, flush]);

  const mobileTail = (profile?.mobile ?? "").replace(/\D/g, "").slice(-4);
  /** Whose certificate the DSC card names — the session's own name, or nobody's. */
  const certHolder = (profile?.name ?? "").trim();

  const printFile = () => {
    if (typeof window !== "undefined") window.print();
  };

  const closeModal = () => setModal(null);

  /*
   * ── The commitment ──
   * One press, and the draft stops being private: every other signatory is asked, by
   * link, to sign this exact document, and the complaint is out for signature until
   * they have. The press is the consent — arriving on this screen is not, because people
   * arrive on screens by accident and an SMS cannot be recalled (owner, 2026-09-23).
   */
  const sendForSignature = () => {
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
  };

  /** Ask again, for everyone still waiting. The link itself does not change. */
  const remindAll = () => {
    const now = new Date().toISOString();
    update((d) => {
      for (const s of everyone) {
        if (s.status !== "signed" && !s.you) d.sign.notified[s.id] = now;
      }
    });
    setReminded(true);
    if (remindTimer.current) window.clearTimeout(remindTimer.current);
    remindTimer.current = window.setTimeout(() => setReminded(false), 2500);
  };

  /**
   * Paper instead. Nobody signs in the system, so every request outstanding is recalled
   * and every signature already collected goes with it — the uploaded copy has to carry
   * all of them anyway.
   */
  const switchToUpload = () => {
    update((d) => {
      d.sign.mode = "upload";
      d.sign.requestedAt = null;
      d.sign.notified = {};
      d.sign.signed = {};
      d.sign.confirmed = {};
    });
    setSwitchOpen(false);
    setModal("upload");
  };

  /** Back to signing in the system. Nothing goes out until "Send for signature". */
  const switchToDigital = () => {
    update((d) => {
      d.sign.mode = "digital";
      d.sign.signed = {};
      d.sign.confirmed = {};
    });
    setModal(null);
  };

  /**
   * One person's own signature, by the instrument in their own hands. Aadhaar OTP or a
   * DSC — the filing does not care which, and two signatories on the same complaint may
   * use different ones; the record keeps what each of them used.
   */
  const signYou = (instrument: SignInstrument) => {
    if (yous.length === 0) return;
    const at = new Date().toISOString();
    update((d) => {
      for (const s of yous) d.sign.signed[s.id] = { at, with: instrument };
    });
    setOtp("");
    setModal(null);
  };

  /**
   * Sandbox only — the other parties' links go nowhere, so this stands in for them
   * opening theirs and signing. It is the one way to walk the rest of the flow here, and
   * it says what it is on the button.
   */
  const sandboxSignOthers = () => {
    const at = new Date().toISOString();
    update((d) => {
      for (const s of everyone) {
        if (!s.you && !d.sign.signed[s.id]) d.sign.signed[s.id] = { at, with: "aadhaar" };
      }
    });
  };

  /**
   * An uploaded copy is the complaint *after* every party has signed it — that is what
   * the upload asks for. So it settles the whole sheet, not the uploader's own row: no
   * one is asked to sign again for a signature already on the page in front of them.
   *
   * What used to be one person's word for all of it is now each complainant's own
   * confirmation by OTP, collected before this button can be pressed.
   */
  const submitSignedCopy = () => {
    if (!sign.signedCopy || !allConfirmed) return;
    const at = new Date().toISOString();
    update((d) => {
      for (const s of everyone) d.sign.signed[s.id] = { at, with: "paper" };
      d.sign.mode = "upload";
    });
    setModal(null);
  };

  /** Store the signed copy the person uploaded, replacing any earlier one. */
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

  /** Open a row's OTP — in the live service this is where the message would go out. */
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

  /** Record one party's confirmation against the number it was given for. */
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

  /** No number on file is a gap in the party's own section, so that is where it is fixed. */
  const addMissingNumber = () => {
    setModal(null);
    router.push(hrefFor("complainant"));
  };

  const resendOtp = () => {
    setResent(true);
    if (resendTimer.current) window.clearTimeout(resendTimer.current);
    resendTimer.current = window.setTimeout(() => setResent(false), 2500);
  };

  /**
   * Write one accused's choice. Only the difference from the court's defaults is
   * stored — writing the resolved plan back would freeze the notice round at whatever
   * the delay looked like on the day, which is exactly what `PAY-11` forbids.
   */
  const editPlan = (
    plan: AccusedPlan,
    change: (draft: { rounds: Record<string, number>; delivery: number; addresses: number[] }) => void
  ) =>
    update((d) => {
      const next = {
        rounds: { ...plan.rounds },
        delivery: plan.delivery,
        addresses: [...plan.selected],
      };
      change(next);
      d.sign.process = { ...d.sign.process, [plan.accusedId]: next };
    });

  /**
   * How many rounds of one process this accused prepays. The floors are held here as
   * well as in the plan: the mandatory summons round is never offered as declinable,
   * and cutting summons rounds cuts the e-post that delivers them with it.
   */
  const setRounds = (plan: AccusedPlan, key: string, value: number) =>
    editPlan(plan, (next) => {
      const option = PROCESS_OPTIONS.find((p) => p.key === key);
      if (!option) return;
      next.rounds[key] = Math.min(option.maxRounds, Math.max(option.minRounds, value));
      if (key === "summons") {
        next.delivery = Math.min(
          next.rounds.summons,
          Math.max(DELIVERY_MIN_ROUNDS, next.delivery)
        );
      }
    });

  /** How many of this accused's summons rounds go by e-post — separately chosen. */
  const setDelivery = (plan: AccusedPlan, value: number) =>
    editPlan(plan, (next) => {
      next.delivery = Math.min(
        next.rounds.summons,
        Math.max(DELIVERY_MIN_ROUNDS, value)
      );
    });

  /** Where this accused's summons goes — at least one address stays selected. */
  const toggleAddress = (plan: AccusedPlan, index: number) =>
    editPlan(plan, (next) => {
      const chosen = next.addresses.includes(index)
        ? next.addresses.filter((i) => i !== index)
        : [...next.addresses, index].sort((a, b) => a - b);
      if (chosen.length) next.addresses = chosen;
    });

  const payNow = () => {
    setModal("processing");
    if (payTimer.current) window.clearTimeout(payTimer.current);
    payTimer.current = window.setTimeout(() => {
      const now = new Date().toISOString();
      const ref = newPaymentRef();
      const caseNumber = newCaseFileNumber();
      update((d) => {
        d.sign.paid = true;
        d.sign.paidAt = now;
        d.sign.paidAmount = bill.total;
        d.sign.paymentRef = ref;
        d.sign.caseFileNumber = caseNumber;
        d.status = "filed";
        d.filedAt = now;
        d.sign.deliveryChannel = DELIVERY_CHANNEL;
      });
      setModal("success");
    }, 2600);
  };

  const copyLink = () => {
    if (typeof window !== "undefined") {
      try {
        void navigator.clipboard?.writeText(
          `${window.location.origin}${hrefFor("preview")}`
        );
      } catch {
        /* clipboard blocked — the case number is on screen either way */
      }
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  /**
   * What the rail carries once the filing is done — the record, not the actions. The rail
   * is a white panel in both places it appears (its own column, and the card it stacks
   * into below `xl`), so the record block is one layer in from it either way.
   */
  const filedRecord = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">Filed</h2>
        <p className="text-body-compact text-muted-foreground">
          This complaint has been submitted and paid for.
        </p>
      </div>

      <dl className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption font-medium text-muted-foreground">
            Case file number
          </dt>
          <dd className="text-body font-semibold">
            {sign.caseFileNumber ? (
              <Identifier value={sign.caseFileNumber} label="case file number" />
            ) : (
              <span className="tabular-nums">—</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption font-medium text-muted-foreground">Filed on</dt>
          <dd className="text-body-compact font-medium tabular-nums">
            {draft.filedAt ? toLongDate(draft.filedAt.slice(0, 10)) : "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption font-medium text-muted-foreground">Amount paid</dt>
          <dd className="text-body-compact font-medium tabular-nums">
            {money(sign.paidAmount ?? bill.total)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption font-medium text-muted-foreground">
            Payment reference
          </dt>
          <dd className="text-body-compact font-medium break-all">
            {sign.paymentRef ? (
              <Identifier value={sign.paymentRef} label="payment reference" />
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" onClick={copyLink}>
          <CopyIcon data-icon="inline-start" aria-hidden />
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" variant="ghost" onClick={printFile}>
          <PrinterIcon data-icon="inline-start" aria-hidden />
          Print or save as PDF
        </Button>
      </div>

      <p className="text-caption text-muted-foreground">
        Sandbox — this filing has not been sent to a real court.
      </p>
    </div>
  );

  /**
   * ── The lower half of the rail: what this step is for, in the order it happens ──
   *
   * Four states, one at a time, because the step really is sequential: nobody has been
   * asked yet · they have been asked and we are waiting · every signature is in · or
   * this complaint is being signed on paper instead.
   *
   * There is no "how will this be signed?" chooser any more. Digital signing is the
   * presumption, so the common path costs one press and no decision; paper is the
   * deliberate exception, offered underneath in words that say what it means. A menu
   * that could be opened and closed with nothing committed was the reason the system
   * could never be told what to ask of the other parties (owner, 2026-09-23).
   */
  const noSignatories = everyone.length === 0;

  const signActions = noSignatories ? (
    <div className="flex flex-col gap-1">
      <h2 className="text-body font-semibold">Signatures</h2>
      <p className="text-body-compact text-muted-foreground">
        Add a complainant or an advocate before sending this for signature.
      </p>
    </div>
  ) : allSigned ? (
    /* ── Every signature is in ── */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">Signing complete</h2>
      </div>
      <SectionNotice variant="success" announce="polite">
        {onPaper
          ? "The uploaded copy carries every signature. "
          : `Signed in the system by ${everyone.length === 1 ? "the one signatory" : `all ${everyone.length} parties`}. `}
        You can pay the court fee now.
      </SectionNotice>
      {onPaper ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setModal("upload")}
        >
          <UploadIcon data-icon="inline-start" aria-hidden />
          Replace signed copy
        </Button>
      ) : null}
    </div>
  ) : onPaper ? (
    /* ── On paper ── */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">Signed on paper</h2>
        <p className="text-body-compact text-muted-foreground">
          Print the complaint, have every party sign it by hand, then upload that copy.
          Each complainant confirms by OTP that the signature is theirs.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => setModal("upload")}
      >
        <UploadIcon data-icon="inline-start" aria-hidden />
        Upload signed complaint
      </Button>
      <p className="text-caption text-muted-foreground">
        Nobody has been asked to sign in the system — paper needs no links. The court fee
        opens once the signed copy is in.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={switchToDigital}
      >
        Sign in the system instead
      </Button>
    </div>
  ) : !requested ? (
    /* ── Nobody has been asked yet: the commitment ── */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">Send it for signature</h2>
        <p className="text-body-compact text-muted-foreground">
          {otherSigners === 0
            ? "You sign with your own Aadhaar OTP or your DSC — whichever you have."
            : `${otherSigners === 1 ? "The other party gets" : `The other ${otherSigners} parties get`} a link on their registered mobile and signs with their own Aadhaar OTP or DSC. You sign the same way, here.`}
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={sendForSignature}
      >
        <SendIcon data-icon="inline-start" aria-hidden />
        Send for signature
      </Button>
      <p className="text-caption text-muted-foreground">
        The complaint is locked for editing while signatures are collected, and the court
        fee opens once every signature is in.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={switchToUpload}
      >
        Sign on paper instead
      </Button>
    </div>
  ) : (
    /* ── Asked, and waiting ── */
    <div className="flex flex-col gap-4">
      {youSigned ? (
        <SectionNotice variant="success" announce="polite" title="You have signed">
          Waiting on {pending === 1 ? "one more party" : `${pending} more parties`}.
        </SectionNotice>
      ) : yous.length > 0 ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-body font-semibold">Add your signature</h2>
            <p className="text-body-compact text-muted-foreground">
              Either one is your own signature — use whichever you have.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => {
              setOtp("");
              setModal("esign");
            }}
          >
            <SignatureIcon data-icon="inline-start" aria-hidden />
            Sign with Aadhaar OTP
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setDscFound(false);
              setModal("dsc");
            }}
          >
            <ShieldCheckIcon data-icon="inline-start" aria-hidden />
            Sign with your DSC
          </Button>
        </>
      ) : (
        /*
         * Nobody at this keyboard is a signatory — the clerk case. An Aadhaar OTP or a
         * DSC is personal and cannot be used on someone else's behalf, so there is no
         * action here at all: the requests are with the people who can actually sign,
         * which is exactly what the press did (owner's colleague, 2026-09-23).
         */
        <SectionNotice variant="info" title="Out for signature">
          Nobody signed in on this device is a signatory. The parties have the link and
          sign with their own Aadhaar OTP or DSC.
        </SectionNotice>
      )}

      <p className="text-caption text-muted-foreground">
        The court fee opens once every signature is in.
      </p>

      <div className="flex flex-col gap-2">
        {otherSigners > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={remindAll}
            disabled={reminded}
          >
            <BellIcon data-icon="inline-start" aria-hidden />
            {reminded ? "Reminder sent" : "Send a reminder"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setSwitchOpen(true)}
        >
          Switch to a copy signed on paper
        </Button>
      </div>

      {/* Sandbox — the other parties' links go nowhere, so this stands in for them. */}
      {otherSigners > 0 && pending > (youSigned ? 0 : 1) ? (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
          <p className="text-caption text-muted-foreground">
            Sandbox — no link is actually sent.
          </p>
          <Button type="button" variant="outline" onClick={sandboxSignOthers}>
            Mark the other parties as signed
          </Button>
        </div>
      ) : null}
    </div>
  );

  /**
   * One rail, not two. Who has signed and what you can do about it are the same question,
   * and splitting them across opposite edges of the screen cost the filing its Sections
   * rail — the only screen in the flow you could not navigate out of the way you had been
   * taught (owner, 2026-08-18).
   */
  const railBody = filed ? (
    filedRecord()
  ) : (
    <div className="flex flex-col gap-6">
      <SignatureSummary
        complainants={complainants}
        advocates={advocates}
        requested={requested}
        notified={sign.notified}
      />
      <div role="separator" className="h-px w-full bg-hairline" />
      {signActions}
    </div>
  );

  const backHref = filed ? hrefFor("preview") : prev ? hrefFor(prev) : hrefFor("preview");

  return (
    <>
      {input}

      <FilingMain width="wide" sourceOpen={docked}>
        <FilingPageHeader
          title={filed ? "Complaint filed" : "Sign the complaint"}
          description={
            filed
              ? `Filed in the ${COURT.name} under S-138, Negotiable Instruments Act.`
              : `You are filing a criminal complaint under S-138, Negotiable Instruments Act in the ${COURT.name}.`
          }
        />

        {/* Below xl there is no width for a rail column, so it stacks above the document. */}
        <Card className={cn(PANEL_CLASS, "xl:hidden")}>
          <CardContent>{railBody}</CardContent>
        </Card>

        {/* Scrolls on its own, so it is focusable — a keyboard user must be able to
            reach the scroll region to read the document. */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Complaint document"
          className="max-h-[calc(100vh-18rem)] overflow-y-auto rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CourtDocument draft={draft} />
        </div>
      </FilingMain>

      {/* From xl the rail takes the shell's third column, beside the document. */}
      {docked && slot
        ? createPortal(
            <aside
              aria-label={filed ? "Filing record" : "Signatures"}
              style={{ top: TOP_BAR_HEIGHT, height: `calc(100svh - ${TOP_BAR_HEIGHT})` }}
              className="sticky flex w-80 shrink-0 flex-col self-start overflow-y-auto border-l border-hairline bg-card p-6"
            >
              {railBody}
            </aside>,
            slot
          )
        : null}

      {filed ? (
        <FilingFooter
          backHref={backHref}
          continueHref={FILINGS_HOME}
          continueLabel="Back to dashboard"
          showSaveState={false}
          extra={
            <Button type="button" variant="outline" size="lg" onClick={printFile}>
              <PrinterIcon data-icon="inline-start" aria-hidden />
              Print or save as PDF
            </Button>
          }
        />
      ) : (
        <FilingFooter
          onBack={() => {
            if (!guardLeaving(backHref)) router.push(backHref);
          }}
          continueLabel="Continue to pay fees"
          // Nothing to pay for until the sheet is signed, so the step's one real action
          // stays dead until it is — and then it is the focal teal, as on every other step.
          continueDisabled={!allSigned}
          showSaveState={false}
          onContinue={() => setModal("payment")}
          // A dead primary with no reason beside it is the reader's problem to solve.
          leading={
            allSigned ? (
              <span className="inline-flex items-center gap-2 text-body-compact text-success-ink">
                <CheckIcon className="size-4 shrink-0" aria-hidden />
                Every signature is in
              </span>
            ) : noSignatories ? null : (
              <span className="text-body-compact text-muted-foreground">
                {onPaper
                  ? "Court fee opens once the signed copy is in"
                  : requested
                    ? `Court fee opens once ${pending === 1 ? "the last signature is" : `all ${everyone.length} signatures are`} in`
                    : "Court fee opens once every signature is in"}
              </span>
            )
          }
          extra={
            <Button type="button" variant="outline" size="lg" onClick={printFile}>
              <PrinterIcon data-icon="inline-start" aria-hidden />
              Print or save as PDF
            </Button>
          }
        />
      )}

      {/*
        ── E-Sign with Aadhaar ──
        One job: take six digits. The code is the focal thing on the sheet, so it is
        centred and given the room to read as a code rather than six small boxes in a
        corner, and everything around it is a caption.
      */}
      <Dialog open={modal === "esign"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter the OTP</DialogTitle>
            <DialogDescription>
              {mobileTail ? (
                <>
                  Sent to your Aadhaar-linked mobile ending{" "}
                  <strong className="font-semibold text-foreground tabular-nums">
                    {mobileTail}
                  </strong>
                  .
                </>
              ) : (
                "Sent to your Aadhaar-linked mobile."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
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
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={otp.length < 6}
            onClick={() => signYou("aadhaar")}
          >
            Verify and sign
          </Button>

          {/* The two instruments are peers, so each one offers the other rather than
              sending the reader back out to a menu. */}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOtp("");
              setDscFound(false);
              setModal("dsc");
            }}
          >
            <ShieldCheckIcon data-icon="inline-start" aria-hidden />
            Use my DSC instead
          </Button>

          {otherSigners > 0 ? (
            <p className="text-center text-caption text-muted-foreground">
              {otherSigners === 1
                ? "The other party signs with their own Aadhaar OTP or DSC."
                : `The other ${otherSigners} parties sign with their own Aadhaar OTP or DSC.`}
            </p>
          ) : null}

          <p className="text-center text-caption text-muted-foreground">
            Sandbox — any six digits work.
          </p>
        </ChromeDialogContent>
      </Dialog>

      {/*
        ── Sign with a DSC ──
        The certificate is on the signer's machine, not on our side: the utility is asked
        for it, and the screen says it is asking rather than showing a certificate it
        never went to find. The card that comes back is the whole decision — you either
        recognise that certificate as yours or you leave by another route.
      */}
      <Dialog open={modal === "dsc"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign with your DSC</DialogTitle>
            <DialogDescription>
              Your Digital Signature Certificate has to be plugged in, with the signing
              utility running on this computer.
            </DialogDescription>
          </DialogHeader>

          {/* The height is held across both states so the button below does not jump. */}
          <div
            aria-live="polite"
            className="flex min-h-20 flex-col justify-center py-2"
          >
            {dscFound ? (
              <div className="flex items-start gap-3 rounded-lg bg-surface-sunken p-4">
                <ShieldCheckIcon
                  aria-hidden
                  className="mt-0.5 size-5 shrink-0 text-success-ink"
                />
                {/*
                  A certificate is named by its holder, and the only name we can stand
                  behind is the one on the session. The signatory row deliberately names
                  the advocate *slot* rather than a person, so it is not borrowed here:
                  with no profile name, the card says what was found and nothing more.
                */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-body-compact font-medium">
                    {certHolder || "Certificate found on this computer"}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {certHolder
                      ? "Class 3 individual certificate, found on this computer"
                      : "Class 3 individual certificate"}
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

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!dscFound}
            onClick={() => signYou("dsc")}
          >
            Sign with this certificate
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOtp("");
              setModal("esign");
            }}
          >
            <SignatureIcon data-icon="inline-start" aria-hidden />
            Use an Aadhaar OTP instead
          </Button>

          {otherSigners > 0 ? (
            <p className="text-center text-caption text-muted-foreground">
              {otherSigners === 1
                ? "The other party signs with their own Aadhaar OTP or DSC."
                : `The other ${otherSigners} parties sign with their own Aadhaar OTP or DSC.`}
            </p>
          ) : null}

          <p className="text-center text-caption text-muted-foreground">
            Sandbox — no certificate store is read.
          </p>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Upload signed complaint ── */}
      <Dialog
        open={modal === "upload"}
        onOpenChange={(open) => {
          if (!open) {
            setUploadError(null);
            setOtpFor(null);
            setRowOtp("");
            closeModal();
          }
        }}
      >
        {/*
          The roster grows with the parties, so the body scrolls and the two fixed points
          stay on screen: the title, and the button the whole list gates.
        */}
        <ChromeDialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[calc(100svh-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload signed complaint</DialogTitle>
            <DialogDescription>
              Upload the printed complaint once every party has signed it by hand.
            </DialogDescription>
          </DialogHeader>

          {/* `pe-2` keeps the row’s status badge clear of the scrollbar, which overlays
              the content edge rather than reserving space for itself. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pe-2">
            <SectionNotice variant="warning" title="Ensure all parties have signed">
              Each complainant, and one advocate for each complainant, must have signed
              this printed copy by hand. Nothing is filed until the copy carries every
              signature and each complainant has confirmed by OTP.
            </SectionNotice>

            {sign.signedCopy ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-sunken p-4">
                <FileTextIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-compact font-medium">
                    {sign.signedCopy.name}
                  </p>
                  <p className="text-caption text-muted-foreground tabular-nums">
                    {sign.signedCopy.ext}
                    {formatBytes(sign.signedCopy.size)
                      ? ` · ${formatBytes(sign.signedCopy.size)}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={chooseSignedCopy}
                >
                  Replace
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={chooseSignedCopy}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-input p-6 text-center outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <UploadIcon
                  className="size-8 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-body-compact text-muted-foreground">
                  Choose the signed file from{" "}
                  <span className="font-medium text-primary underline underline-offset-2">
                    my files
                  </span>
                </span>
              </button>
            )}

            {uploadError ? (
              <SectionNotice
                variant="destructive"
                announce="assertive"
                title="That file wasn’t added"
              >
                {uploadError}
              </SectionNotice>
            ) : null}

            <p className="text-body-compact text-muted-foreground">
              Upload .jpg, .png, .jpeg, .webp or .pdf. Maximum upload size of 15
              MB.
            </p>

            {/*
            Who signed, in their own words. The list is the gate on the button below it:
            one OTP per complainant, taken here and now, because this path has no link
            and is not meant to be the comfortable one.
          */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-body font-semibold">Verify phone numbers</h3>
                <span className="text-caption font-medium text-muted-foreground tabular-nums">
                  {confirmedCount} of {confirmRows.length} confirmed
                </span>
              </div>
              <p className="text-body-compact text-muted-foreground">
                This ensures the litigant has access to their case file.
              </p>
              <ul>
                {confirmRows.map((person, i) => (
                  <ConfirmRow
                    key={person.id}
                    person={person}
                    index={i}
                    confirmed={isConfirmed(person)}
                    open={otpFor === person.id}
                    otp={otpFor === person.id ? rowOtp : ""}
                    resent={rowResent === person.id}
                    onOpen={() => sendRowOtp(person.id)}
                    onOtp={setRowOtp}
                    onResend={() => resendRowOtp(person.id)}
                    onConfirm={() => confirmRow(person)}
                    onAddNumber={addMissingNumber}
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
                onClick={printFile}
              >
                Print or save as PDF
              </Button>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setUploadError(null);
                setOtpFor(null);
                setRowOtp("");
                switchToDigital();
              }}
            >
              Sign in the system instead
            </Button>
            <Button
              type="button"
              disabled={!sign.signedCopy || !allConfirmed}
              onClick={submitSignedCopy}
            >
              Submit as fully signed
            </Button>
          </DialogFooter>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Choose process & address ── */}
      {/*
        This comes *before* the bill, because it is what the bill adds up. The court's
        rule is not one blanket opt-out but a floor and a ceiling per process (handover
        §19.3): one round of summons is mandatory, its delivery included; warrants and
        further summons rounds go up to four; notice is a single optional round. So the
        choice is offered per process, and the round the court insists on is simply not
        offered as declinable rather than offered and then refused.
      */}
      <Dialog open={modal === "procaddr"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[calc(100svh-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change process &amp; address</DialogTitle>
            <DialogDescription>
              What the court issues to the accused, how it is delivered, and where it
              goes. The total moves as you change it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
            {plans.map((plan) => {
              const rounds = plan.rounds;
              const line = bill.delivery.find((l) =>
                l.key.startsWith(`${plan.accusedId}:`)
              );
              /** 1 … summons rounds — e-post never falls below the mandatory round. */
              const deliveryChoices = Array.from(
                { length: Math.max(0, rounds.summons - DELIVERY_MIN_ROUNDS + 1) },
                (_, i) => DELIVERY_MIN_ROUNDS + i
              );
              return (
                <section
                  key={plan.accusedId}
                  className={cn(
                    "flex flex-col gap-4",
                    // One accused needs no dividing from itself; several do.
                    plans.length > 1 && "border-t border-hairline pt-6 first:border-t-0 first:pt-0"
                  )}
                >
                  <h3 className="text-body font-semibold text-foreground">
                    {plan.label}
                  </h3>

                  {/* Addresses first: they multiply the summons, so where comes before
                      how many — a round cannot be priced until you know how far it
                      travels. */}
                  <FieldSet className="gap-3">
                    <FieldLegend className="text-body-compact font-medium">
                      Where summons is served
                    </FieldLegend>
                    {plan.addresses.length ? (
                      <>
                        {plan.addresses.map((address) => {
                          const id = `addr-${plan.accusedId}-${address.index}`;
                          return (
                            <Field key={address.index} orientation="horizontal">
                              <Checkbox
                                id={id}
                                checked={plan.selected.includes(address.index)}
                                onCheckedChange={() =>
                                  toggleAddress(plan, address.index)
                                }
                              />
                              <FieldContent>
                                <Label
                                  htmlFor={id}
                                  className="text-body-compact font-medium"
                                >
                                  {address.label}
                                </Label>
                                <FieldDescription className="text-caption">
                                  {address.text}
                                </FieldDescription>
                              </FieldContent>
                            </Field>
                          );
                        })}
                        <p className="text-caption text-muted-foreground">
                          Summons is charged for each address selected, every round.
                        </p>
                      </>
                    ) : (
                      <p className="text-body-compact text-muted-foreground">
                        Add this accused’s address in the{" "}
                        <Link
                          href={hrefFor("accused")}
                          className="font-medium text-primary underline underline-offset-2"
                        >
                          Accused section
                        </Link>{" "}
                        to choose where summons is served.
                      </p>
                    )}
                  </FieldSet>

                  <FieldSet className="gap-3">
                    <FieldLegend className="text-body-compact font-medium">
                      Process to pay for now
                    </FieldLegend>
                    <div className="flex flex-col divide-y divide-hairline">
                      {PROCESS_OPTIONS.map((option) => {
                        const id = `process-${plan.accusedId}-${option.key}`;
                        const chosen = rounds[option.key] ?? option.minRounds;
                        const choices = Array.from(
                          { length: option.maxRounds - option.minRounds + 1 },
                          (_, i) => option.minRounds + i
                        );
                        const amount = bill.process
                          .filter((l) => l.key === `${plan.accusedId}:${option.key}`)
                          .reduce((t, l) => t + l.amount, 0);
                        return (
                          <div
                            key={option.key}
                            className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0"
                          >
                            <div className="flex min-w-56 flex-1 flex-col gap-0.5">
                              <Label
                                htmlFor={id}
                                className="text-body-compact font-medium"
                              >
                                {option.label}
                                {option.minRounds > 0 ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · required
                                  </span>
                                ) : null}
                              </Label>
                              <p className="text-caption text-muted-foreground">
                                {option.note}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-4">
                              <NativeSelect
                                id={id}
                                className="w-40"
                                value={String(chosen)}
                                onChange={(e) =>
                                  setRounds(plan, option.key, Number(e.target.value))
                                }
                              >
                                {choices.map((n) => (
                                  <NativeSelectOption key={n} value={String(n)}>
                                    {n === 0
                                      ? "Not now"
                                      : n === 1
                                        ? "1 round"
                                        : `${n} rounds`}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              <span className="min-w-16 text-right text-body-compact font-medium tabular-nums">
                                {amount ? money(amount) : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/*
                        E-post is its own decision (`PAY-15`), not a consequence of the
                        summons count — you may prepay three rounds of summons and the
                        delivery of one. It only cannot go below the mandatory first
                        round, which is why "Not now" is absent here as it is above.
                      */}
                      <div className="flex flex-wrap items-start justify-between gap-4 py-3">
                        <div className="flex min-w-56 flex-1 flex-col gap-0.5">
                          <Label
                            htmlFor={`delivery-${plan.accusedId}`}
                            className="text-body-compact font-medium"
                          >
                            {CHANNEL_FEE.label}
                            <span className="text-muted-foreground"> · required</span>
                          </Label>
                          <p className="text-caption text-muted-foreground tabular-nums">
                            {money(CHANNEL_FEE.amount)} for each address, every round —
                            charged by the post office, not by the court.
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <NativeSelect
                            id={`delivery-${plan.accusedId}`}
                            className="w-40"
                            value={String(plan.delivery)}
                            onChange={(e) =>
                              setDelivery(plan, Number(e.target.value))
                            }
                          >
                            {deliveryChoices.map((n) => (
                              <NativeSelectOption key={n} value={String(n)}>
                                {n === 1 ? "1 round" : `${n} rounds`}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <span className="min-w-16 text-right text-body-compact font-medium tabular-nums">
                            {line ? money(line.amount) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </FieldSet>
                </section>
              );
            })}

            <p className="text-caption text-muted-foreground">
              Anything you leave out now is paid for later, if and when the court orders
              it. What you pay for now is issued without a second payment step.
            </p>
          </div>

          {/*
            The number the choices above are moving, kept in sight while they move —
            outside the scrolling list, so it cannot be scrolled past, and outside the
            footer, which stacks on a narrow screen and would carry it off the bottom.
          */}
          <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
            <span className="text-body font-semibold">Payable now</span>
            <span className="text-title-s font-semibold tabular-nums">
              {money(bill.total)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setModal("payment")}>
              Back to fees
            </Button>
          </DialogFooter>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Pay court fees ── */}
      {/*
        A bill, not a price tag. Two groups because the court treats them differently:
        court fees decide whether the complaint is registered at all, process fees buy
        delivery to the accused. Every line shows its rate and how many times it is
        charged, because the per-round and per-address ones move with the case and a
        total nobody can account for is a total nobody should be asked to pay. There is
        no switch here any more: what is being paid for was decided on the step before,
        process by process, and this screen only adds it up.
      */}
      <Dialog open={modal === "payment"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[calc(100svh-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pay court fees</DialogTitle>
            <DialogDescription>
              Payable to the {COURT.name} for this complaint.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <FeeGroup
              title="Court fees"
              caption="Due before the complaint is registered."
              lines={bill.court}
              total={bill.courtTotal}
            />

            <FeeGroup
              title="Process fees"
              caption={processCaption}
              lines={bill.process}
              total={bill.processTotal}
            />

            <FeeGroup
              title={`Delivery of summons · ${DELIVERY_CHANNEL}`}
              caption="Charged for each address, every round of summons — by the post office, not by the court."
              lines={bill.delivery}
              total={bill.deliveryTotal}
            />
          </div>

          <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
            <span className="text-body font-semibold">Payable now</span>
            <span className="text-title-s font-semibold tabular-nums">
              {money(bill.total)}
            </span>
          </div>

          <Button type="button" size="lg" className="w-full" onClick={payNow}>
            Pay {money(bill.total)} online
          </Button>

          <p className="text-caption text-muted-foreground">
            Sandbox payment — no money moves.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal("procaddr")}
            >
              Change process &amp; address
            </Button>
          </DialogFooter>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Processing ── */}
      <Dialog open={modal === "processing"}>
        <ChromeDialogContent
          className="sm:max-w-sm"
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Spinner className="size-8 text-primary" />
            <DialogTitle className="text-title-s font-semibold">
              Processing payment…
            </DialogTitle>
            <DialogDescription className="text-body-compact">
              Please don’t close or refresh this window while we confirm your payment.
            </DialogDescription>
            <p className="text-caption text-muted-foreground">
              Sandbox payment — no money moves.
            </p>
          </div>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Payment successful ── */}
      <Dialog open={modal === "success"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <div className="flex flex-col items-center gap-2 bg-success p-6 text-center text-success-foreground">
            <span className="flex size-12 items-center justify-center rounded-full bg-success-foreground text-success">
              <CheckIcon className="size-6" aria-hidden />
            </span>
            <DialogTitle className="text-title-s font-semibold">
              Payment successful
            </DialogTitle>
            <DialogDescription className="text-body-compact text-success-foreground">
              Your case file is complete. This is a sandbox — nothing has been sent to a
              real court.
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-sunken p-4">
              <div>
                <p className="text-caption font-medium text-muted-foreground">
                  Case file number
                </p>
                <p className="text-body font-semibold">
                  {sign.caseFileNumber ? (
                    <Identifier value={sign.caseFileNumber} label="case file number" />
                  ) : (
                    <span className="tabular-nums">—</span>
                  )}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={copyLink}>
                <CopyIcon data-icon="inline-start" aria-hidden />
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 text-body-compact">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-semibold text-foreground tabular-nums">
                {money(sign.paidAmount ?? bill.total)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-body-compact">
              <span className="text-muted-foreground">Payment reference</span>
              <span className="text-foreground">
                {sign.paymentRef ? (
                  <Identifier value={sign.paymentRef} label="payment reference" />
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link href={FILINGS_HOME}>Back to dashboard</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={printFile}
              >
                <PrinterIcon data-icon="inline-start" aria-hidden />
                Print or save as PDF
              </Button>
            </div>
          </div>
        </ChromeDialogContent>
      </Dialog>

      {/* ── Leaving with signatures on the sheet ── */}
      <ConfirmDialog
        open={leaveTo !== null}
        onOpenChange={(open) => {
          if (!open) setLeaveTo(null);
        }}
        title={
          anySigned ? "Going back voids the signatures" : "Going back recalls the requests"
        }
        description={
          onPaper
            ? "The signed copy you uploaded was signed against this version of the complaint. Editing the case makes it a different document, so the copy is removed and every party has to sign again."
            : anySigned
              ? `The parties were asked to sign this version of the complaint. Editing the case makes it a different document, so ${
                  everyone.filter((s) => s.status === "signed").length === 1
                    ? "the signature already collected is"
                    : "the signatures already collected are"
                } discarded, the outstanding requests are withdrawn, and everyone is asked again.`
              : "The parties have already been asked to sign this version of the complaint. Editing the case makes it a different document, so those requests are withdrawn and everyone is asked again once you come back."
        }
        confirmLabel={anySigned ? "Go back and re-sign" : "Go back and recall"}
        cancelLabel="Stay here"
        onConfirm={confirmLeave}
      />

      {/*
        ── Switching to paper after the requests are out ──
        Tasks can be cancelled; a message that has already landed cannot. So this is the
        one place in the step that asks twice, and it says what the other parties will be
        left holding.
      */}
      <ConfirmDialog
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        title="Switch to a copy signed on paper?"
        description={`${
          otherSigners === 1 ? "The other party has" : `The other ${otherSigners} parties have`
        } already been asked to sign in the system. Switching withdraws ${
          otherSigners === 1 ? "that request" : "those requests"
        }${
          anySigned ? " and voids the signatures already collected" : ""
        } — the printed copy has to carry every signature by hand instead.`}
        confirmLabel="Switch to paper"
        cancelLabel="Keep signing in the system"
        onConfirm={switchToUpload}
      />
    </>
  );
}
