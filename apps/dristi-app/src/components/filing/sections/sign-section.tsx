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
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  FileTextIcon,
  PrinterIcon,
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
import type { PhoneConfirmer, Signatory, StoredFileRef } from "@/lib/filing/types";
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
  | "choose"
  | "esign"
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

function SignatureList({ title, rows }: { title: string; rows: Signatory[] }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-caption font-medium text-muted-foreground">{title}</p>
      <ul className="flex flex-col">
        {rows.map((s, i) => (
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
            </div>
            <span className="mt-px shrink-0">
              {s.status === "signed" ? (
                <Badge variant="success">
                  <CheckIcon aria-hidden />
                  Signed
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignatureSummary({
  complainants,
  advocates,
}: {
  complainants: Signatory[];
  advocates: Signatory[];
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
            {signed} of {all.length} signed
          </span>
        </div>
        <Progress
          value={pct}
          aria-label={`${signed} of ${all.length} signatures collected`}
          className="h-1.5"
        />
      </div>
      <SignatureList title="Complainant signature" rows={complainants} />
      <SignatureList title="Advocate signature" rows={advocates} />
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
  /** Where the person asked to go while signatures are on the sheet. */
  const [leaveTo, setLeaveTo] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState("");
  const [resent, setResent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  /** The one confirmation row open for its OTP — one at a time, so the list stays a list. */
  const [otpFor, setOtpFor] = React.useState<string | null>(null);
  const [rowOtp, setRowOtp] = React.useState("");
  const [rowResent, setRowResent] = React.useState<string | null>(null);

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
    },
    []
  );

  const filed = draft.status === "filed";
  const sign = draft.sign;

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
  const you = yous[0] ?? null;
  const youSigned = yous.length > 0 && yous.every((s) => s.status === "signed");
  const allSigned = everyone.length > 0 && everyone.every((s) => s.status === "signed");
  const anySigned = everyone.some((s) => s.status === "signed");
  const pending = everyone.filter((s) => s.status === "pending").length;
  /** Everyone the E-Sign path hands a link to, once "you" have signed your own rows. */
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
   */
  const guardLeaving = React.useCallback(
    (href: string) => {
      if (filed || !anySigned) return false;
      setLeaveTo(href);
      return true;
    },
    [filed, anySigned, setLeaveTo]
  );
  useLeaveGuard(guardLeaving);

  const discardSignatures = () => {
    const copy = sign.signedCopy;
    update((d) => {
      d.sign.signed = {};
      d.sign.mode = null;
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

  const printFile = () => {
    if (typeof window !== "undefined") window.print();
  };

  const closeModal = () => setModal(null);

  /** E-Sign records one person's signature; the other parties still have to sign. */
  const signYou = () => {
    if (yous.length === 0) return;
    update((d) => {
      for (const s of yous) d.sign.signed[s.id] = true;
      d.sign.mode = "esign";
    });
    setOtp("");
    setModal(null);
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
    update((d) => {
      for (const s of everyone) d.sign.signed[s.id] = true;
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

  /** "Add your signature" — the lower half of the signing rail. */
  const signActions = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-semibold">
          {allSigned ? "Signing complete" : "Add your signature"}
        </h2>
        {you ? null : (
          <p className="text-body-compact text-muted-foreground">
            Add a complainant or an advocate before signing.
          </p>
        )}
      </div>

      {allSigned ? (
        <>
          <SectionNotice variant="success" announce="polite">
            {sign.mode === "upload"
              ? "The uploaded copy carries every signature."
              : "Every party has signed."}
          </SectionNotice>
          {sign.mode === "upload" ? (
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
        </>
      ) : youSigned ? (
        <SectionNotice variant="success" announce="polite" title="You have signed">
          {pending === 1 ? "One more party" : `${pending} more parties`} still to sign.
        </SectionNotice>
      ) : (
        /*
         * One CTA, not a button plus a dropdown of two more choices — the previous
         * shape put "how will this be signed" and "sign now" in the same click, which
         * is why it read as a personal action. The commitment itself, and what it means
         * for the *other* signatories, belongs in its own step (owner, 2026-08-19): see
         * the "How will this complaint be signed?" dialog below.
         */
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!you}
          onClick={() => setModal("choose")}
        >
          <SignatureIcon data-icon="inline-start" aria-hidden />
          Continue to sign
        </Button>
      )}
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
      <SignatureSummary complainants={complainants} advocates={advocates} />
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
          extra={
            <Button type="button" variant="outline" size="lg" onClick={printFile}>
              <PrinterIcon data-icon="inline-start" aria-hidden />
              Print or save as PDF
            </Button>
          }
        />
      )}

      {/*
        ── How will this complaint be signed? ──
        The commitment point. Neither path is one person's action — E-Sign hands the
        rest of the parties a link the moment you pick it, and an uploaded copy is only
        accepted once it already carries every signature — so both options say who else
        it reaches before either one is clickable, not after (owner, 2026-08-19).
      */}
      <Dialog open={modal === "choose"} onOpenChange={(open) => !open && closeModal()}>
        <ChromeDialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How will this complaint be signed?</DialogTitle>
            <DialogDescription>
              {everyone.length > 1
                ? `All ${everyone.length} signatories sign the same way.`
                : "Choose how this complaint is signed."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setModal("esign");
              }}
              className="group flex w-full items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-muted text-info-muted-foreground"
              >
                <SignatureIcon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body font-semibold text-foreground">
                  E-Sign with Aadhaar OTP
                </span>
                <span className="text-body-compact text-muted-foreground">
                  You sign now.{" "}
                  {otherSigners === 1
                    ? "The other party gets"
                    : `The other ${otherSigners} parties get`}{" "}
                  a link to sign the same way.
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </button>

            <button
              type="button"
              onClick={() => setModal("upload")}
              className="group flex w-full items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-muted text-warning-muted-foreground"
              >
                <UploadIcon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body font-semibold text-foreground">
                  Upload a signed copy
                </span>
                <span className="text-body-compact text-muted-foreground">
                  One file that already carries{" "}
                  {everyone.length > 1 ? `all ${everyone.length} signatures` : "the signature"}
                  , on paper or by DSC. Everyone on the complaint then confirms by
                  OTP.
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>

          <p className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
            Nothing is filed until every signature is in.
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-caption underline"
              onClick={printFile}
            >
              Print or save as PDF
            </Button>
          </p>
        </ChromeDialogContent>
      </Dialog>

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
            onClick={signYou}
          >
            Verify and sign
          </Button>

          {otherSigners > 0 ? (
            <p className="text-center text-caption text-muted-foreground">
              {otherSigners === 1
                ? "The other party signs next."
                : `The other ${otherSigners} parties sign next.`}
            </p>
          ) : null}

          <p className="text-center text-caption text-muted-foreground">
            Sandbox — any six digits work.
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
              Upload the complaint once every party has signed it.
            </DialogDescription>
          </DialogHeader>

          {/* `pe-2` keeps the row’s status badge clear of the scrollbar, which overlays
              the content edge rather than reserving space for itself. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pe-2">
            <SectionNotice variant="warning" title="Ensure all parties have signed">
              Each complainant, and one advocate for each complainant, must sign
              this document. The file may be signed on paper or with a{" "}
              <strong className="font-semibold">
                Digital Signature Certificate (DSC)
              </strong>
              .
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
        title="Going back voids the signatures"
        description={
          sign.mode === "upload"
            ? "The signed copy you uploaded was signed against this version of the complaint. Editing the case makes it a different document, so the copy is removed and every party has to sign again."
            : `The parties signed this version of the complaint. Editing the case makes it a different document, so ${
                everyone.filter((s) => s.status === "signed").length === 1
                  ? "the signature already collected is"
                  : "the signatures already collected are"
              } discarded and everyone has to sign again.`
        }
        confirmLabel="Go back and re-sign"
        cancelLabel="Stay here"
        onConfirm={confirmLeave}
      />
    </>
  );
}
