"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * A unique identifier, in the one treatment the product gives them: monospaced, with
 * tabular figures, and copyable by clicking the number itself.
 *
 * ## Why these are mono and counts are not
 *
 * `ST 412/2025`, a CNR, a receipt reference, a submission id — these are read character
 * by character and transcribed into other systems, so the eye needs to hold a position
 * in the string. A proportional face closes up the digits and makes `412` and `4l2` the
 * same shape. Counts are not read that way: "3 cases" is a quantity, and monospacing it
 * only makes the sentence it sits in look like a terminal. So the rule the owner set
 * (2026-09-16) is by *kind of fact*, not by "does it contain digits" — identifiers and
 * unique ids get the mono; totals, counts and dates do not.
 *
 * Successive design rounds kept losing the treatment because it lived as a `font-mono`
 * class copied into seventy render sites, any one of which could be rewritten without
 * the others. It lives here now, so losing it again takes a deliberate edit to one file.
 *
 * ## The copy affordance
 *
 * No button beside the value — the value *is* the control. At rest it reads as text; on
 * hover or focus it takes a sunken pill and the copy glyph fades in, which is the
 * signal that it can be taken. The glyph's box is reserved at rest, so nothing on the
 * row moves when it appears: a column of identifiers that reflows on hover is worse
 * than no affordance at all.
 *
 * Clicking copies and says so twice, at two ranges. On the number itself the glyph
 * becomes a tick for a moment — that is the affordance confirming itself, in place. And
 * a toast carries the value, because the clipboard is system state and taking something
 * into it is the kind of one-off act that deserves a system acknowledgement (owner,
 * 2026-09-16). It names the value rather than the kind — `Copied ST 412/2025` — since
 * with a column of these under the pointer the only thing worth confirming is *which*
 * one you got. Neutral, not success: green claims an operation completed, and this is an
 * acknowledgement. Where the clipboard is unavailable (an insecure origin, a browser
 * that refuses) the component stays exactly as legible, just not clickable.
 *
 * The toast is also the only announcement. Sonner renders its own live region, so the
 * `aria-live` span this used to carry would have read the copy out twice.
 *
 * The hover hint is the native `title`, not the DS `Tooltip`. `Tooltip` needs an ambient
 * `TooltipProvider`, which the advocate shell supplies and the court shell does not — so
 * the styled version threw on every court screen that carried an identifier, and a leaf
 * used in ninety-five files has no business depending on which shell it landed in.
 */
/**
 * Whether this browser will take a copy — `false` on the server and through the first
 * client render.
 *
 * Read straight off `navigator` during render, this component emitted a `span` on the
 * server and a `button` on the client, so every identifier on the page was a hydration
 * mismatch and React threw the subtree away and re-rendered it. `useSyncExternalStore`
 * with a distinct server snapshot is the house answer to exactly that (see
 * `useMinWidth`): the first client render agrees with the server, and the affordance
 * arrives on the pass after hydration. Nothing subscribes — clipboard support does not
 * change while the page is open — so the subscribe function is a no-op.
 */
const noSubscribe = () => () => {};

function useClipboard(): boolean {
  return React.useSyncExternalStore(
    noSubscribe,
    () => !!navigator.clipboard,
    () => false
  );
}

export function Identifier({
  value,
  label = "identifier",
  className,
  copyable = true,
}: {
  /** The identifier itself — what is shown and what is copied. */
  value: string;
  /** What it is, for the copy affordance's accessible name: "case number", "receipt". */
  label?: string;
  className?: string;
  /** Off where the identifier is decorative or already inside a control. */
  copyable?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const supported = useClipboard();
  const face = "font-mono tabular-nums";

  if (!copyable || !supported) {
    return <span className={cn(face, className)}>{value}</span>;
  }

  const copy = () => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1600);
        toast(
          <span>
            Copied <span className="font-mono tabular-nums">{value}</span>
          </span>,
          { icon: <CopyIcon className="size-4" aria-hidden /> }
        );
      })
      .catch(() => {
        /* A refused clipboard is not worth a message: the number is still on screen. */
      });
  };

  return (
    <button
      type="button"
      title={copied ? "Copied" : `Copy ${label}`}
      onClick={(event) => {
        /* These sit inside rows that open their record on click. Copying an identifier
           is not asking for the record. */
        event.stopPropagation();
        copy();
      }}
      aria-label={copied ? `${label} copied` : `Copy the ${label}, ${value}`}
      className={cn(
        face,
        /* Negative inline margin against the pill's padding, so the resting text sits
           exactly where plain text would and the fill grows outside it. `gap-0.5`
           against a 12px glyph reserves about one word-space, so an identifier that
           sits mid-sentence — "ST 412/2025 · 24×7 ON Court" — does not read as a typo
           before the dot. Reserved rather than absolute: the glyph appearing must not
           move the row. */
        "group/id -mx-1 inline-flex cursor-pointer items-center gap-0.5 rounded-sm px-1 text-left align-baseline",
        "outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
    >
      <span>{value}</span>
      {/* The box is held at rest so the row never reflows; only the ink changes. */}
      {copied ? (
        <CheckIcon className="size-3 shrink-0 text-success-ink" aria-hidden />
      ) : (
        <CopyIcon
          className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/id:opacity-100 group-focus-visible/id:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
