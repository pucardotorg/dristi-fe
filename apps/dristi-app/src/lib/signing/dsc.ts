"use client";

/**
 * **Is a DSC ready on this computer — asked of the computer, not of the account.**
 *
 * A Digital Signature Certificate lives on a USB token, and the product can only use it
 * through the signing software installed on the same machine. So "DSC is set up" is a
 * fact about *this* computer at *this* moment: the same advocate can be ready at their
 * desk and not ready on a laptop, or ready until the token is pulled out. Nothing here is
 * saved to the profile, and nothing asks the advocate to confirm they have installed it —
 * the software is asked directly, every time signing needs it (owner, 2026-09-30:
 * engineering detects it).
 *
 * The detection has three answers the screens design for:
 *
 * - `ready` — the software answered and a certificate was read off the token;
 * - `no-software` — nothing answered, so DSC has not been set up here (or the software
 *   is not running, which from this side is the same thing);
 * - `no-certificate` — the software answered, but no token is plugged in.
 *
 * ## Sandbox
 *
 * There is no signing software behind this yet. The sandbox stands in for the machine: a
 * small record in this browser saying whether the software is installed, whether a token
 * is plugged in, and whether the next signature should fail. The DSC setup page carries
 * the controls for it, plainly labelled, so every state can be reached on purpose.
 */

import * as React from "react";

export type DscCheck =
  | { state: "checking" }
  | { state: "ready" }
  | { state: "no-software" }
  | { state: "no-certificate" };

export type DscSandbox = {
  /** The signing software is installed and running on this computer. */
  software: boolean;
  /** A DSC token is plugged in. */
  token: boolean;
  /** The next signature the software is asked for fails, then this resets. */
  failNext: boolean;
};

/** Where the setup guide lives. The page is on the advocate's settings. */
export const DSC_SETUP_HREF = "/settings/digital-signature";

/**
 * Placeholders until engineering publishes them. The installation steps are not known
 * yet, so the guide is a PDF to be supplied and the download points at nothing real.
 */
export const DSC_GUIDE_PDF_HREF = "#dsc-setup-guide-pdf";
export const DSC_SOFTWARE_HREF = "#dsc-signing-software";

const KEY = "dristi:dsc-sandbox";
const CHANGED = "dristi:dsc-sandbox-changed";
const DEFAULT: DscSandbox = { software: false, token: true, failNext: false };

/** How long the software takes to answer — long enough to be seen looking. */
const CHECK_MS = 900;
const SIGN_MS = 1400;

export function readDscSandbox(): DscSandbox {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<DscSandbox>) };
  } catch {
    return DEFAULT;
  }
}

export function writeDscSandbox(patch: Partial<DscSandbox>) {
  const next = { ...readDscSandbox(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the sandbox simply stays at its defaults.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** The sandbox record, kept current across this tab and any other. */
export function useDscSandbox(): DscSandbox {
  const [sandbox, setSandbox] = React.useState<DscSandbox>(DEFAULT);
  React.useEffect(() => {
    const sync = () => setSandbox(readDscSandbox());
    sync();
    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return sandbox;
}

function detect(): DscCheck {
  const { software, token } = readDscSandbox();
  if (!software) return { state: "no-software" };
  if (!token) return { state: "no-certificate" };
  return { state: "ready" };
}

/**
 * Ask the computer, and keep asking at the moments the answer can change: when the
 * advocate asks again, when they come back to this tab (from installing the software in
 * another one), and when the sandbox changes. `enabled: false` holds the question until
 * a screen actually needs it.
 */
export function useDscCheck({ enabled = true }: { enabled?: boolean } = {}): {
  check: DscCheck;
  recheck: () => void;
} {
  /* Each answer carries the question it answers, so a newer question reads as
     "checking" until the computer replies to it. */
  const [answer, setAnswer] = React.useState<{ asked: number; check: DscCheck } | null>(
    null
  );
  const [asked, setAsked] = React.useState(0);

  const recheck = React.useCallback(() => setAsked((n) => n + 1), []);

  React.useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(
      () => setAnswer({ asked, check: detect() }),
      CHECK_MS
    );
    return () => window.clearTimeout(timer);
  }, [enabled, asked]);

  const check: DscCheck =
    answer && answer.asked === asked ? answer.check : { state: "checking" };

  React.useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(CHANGED, recheck);
    window.addEventListener("storage", recheck);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(CHANGED, recheck);
      window.removeEventListener("storage", recheck);
    };
  }, [enabled, recheck]);

  return { check, recheck };
}

/**
 * Hand the document to the signing software. The software asks for the token's PIN in
 * its own window; the product only hears back whether a signature was applied.
 */
export function signWithDsc(): Promise<"signed" | "failed"> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const sandbox = readDscSandbox();
      if (sandbox.failNext) {
        writeDscSandbox({ failNext: false });
        resolve("failed");
        return;
      }
      if (!sandbox.software || !sandbox.token) {
        resolve("failed");
        return;
      }
      resolve("signed");
    }, SIGN_MS);
  });
}
