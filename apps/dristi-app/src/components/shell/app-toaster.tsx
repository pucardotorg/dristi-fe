"use client";

import { Toaster } from "@/components/ui/sonner";

/**
 * The product's toaster: one placement, one set of fills, mounted once per area.
 *
 * ## Why this file exists
 *
 * `components/ui/sonner.tsx` is a synced DS primitive. It maps each variant to a token
 * pair — `--success-bg: var(--success-muted)` and so on — and a local edit there is lost
 * at the next sync and fails the sync gate in the meantime. So the product's own
 * decisions are composed on here instead, and every area mounts this rather than the
 * primitive. One file to change when the treatment changes.
 *
 * ## Placement (owner, 2026-09-16)
 *
 * Bottom centre, 56px up, and centred on the *page column* rather than the window.
 *
 * Sonner's default is 24px into the bottom-*right* corner, which is where a macOS dock, a
 * Windows taskbar and any floating window sit — the toast was landing underneath the
 * furniture, at the furthest point on a wide screen from wherever the eye just was. 40px
 * cleared a standard taskbar and still read low, so it stands at 56.
 *
 * Centring is the part sonner cannot do: its bottom-centre is the viewport's centre, and
 * the viewport starts up to 16rem left of where the work does, so under a wide rail the
 * toast leaned. The horizontal shift is one rule in `globals.css` reading
 * `--chrome-page-inset` off the column this is mounted in — which is why this component
 * belongs inside the shell rather than beside it. On a phone the rail is off-canvas and
 * the window is the page, so neither the shift nor the raise applies; `mobileOffset`
 * keeps the safe area clear instead.
 *
 * ## Fills (owner, 2026-09-16 — "option C")
 *
 * One step up each status scale for the fill, and — the part that was actually missing —
 * a step-7 border. The primitive sets `--success-border` to the *same* token as
 * `--success-bg`, so a success or error toast had no edge at all and a neutral one was
 * white on white, held up by nothing but a shadow. A step-3 tint on white is a 1.1:1
 * surface and step 4 only reaches ~1.2:1, so the saturation alone was never going to do
 * it; the edge is what makes the toast an object. Text stays at step 11, which already
 * passed. The solid fills were on the board and were ruled out: at five `toast.success`
 * call sites a solid green bar becomes the loudest thing on a deliberately quiet beige
 * canvas, and a solid red would outrank the destructive buttons beside it.
 *
 * `style` and `toastOptions` are *replacements*, not merges — the primitive spreads
 * `{...props}` after its own, so whatever arrives here wins outright. That is why the
 * whole variable set is restated below rather than only the six values that changed:
 * passing a partial object would drop the rest of the DS's mapping on the floor.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom: "56px" }}
      mobileOffset={{ bottom: "24px" }}
      style={
        {
          /* Neutral — the acknowledgement variant, and the one copying uses. */
          "--normal-bg": "var(--neutral-3)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--neutral-7)",

          "--success-bg": "var(--success-4)",
          "--success-text": "var(--success-muted-foreground)",
          "--success-border": "var(--success-7)",

          "--error-bg": "var(--destructive-4)",
          "--error-text": "var(--destructive-muted-foreground)",
          "--error-border": "var(--destructive-7)",

          /* Mapped but never called today. Kept in step with the two that are, so the
             first `toast.warning` does not arrive looking like a different product. */
          "--warning-bg": "var(--warning-4)",
          "--warning-text": "var(--warning-muted-foreground)",
          "--warning-border": "var(--warning-7)",

          "--info-bg": "var(--info-4)",
          "--info-text": "var(--info-muted-foreground)",
          "--info-border": "var(--info-7)",

          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: { toast: "cn-toast" },
        /* A toast is an overlay, so it takes the sanctioned overlay elevation. Sonner
           ships `0 4px 12px rgba(0,0,0,.1)`, which is not one of ours and sits wrong
           against the panels underneath. Inline, because the primitive's own rule
           carries the same specificity as anything this file could add in CSS. */
        style: { boxShadow: "var(--shadow-overlay)" },
      }}
    />
  );
}
