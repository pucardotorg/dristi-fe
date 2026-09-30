"use client";

import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One route, as a card that takes it.
 *
 * The card carries the mark, the name and what the route does to everyone else, and
 * pressing it is the choice — there is no separate confirm below, because the sentence
 * the reader just read *is* the confirmation. This is the shape the owner picked out as
 * the right one (2026-09-23). The complaint window asks two questions with it — how the
 * complaint is signed, and which instrument the filer signs it with — and every other
 * signing flow asks the second the same way.
 */
export function ChoiceCard({
  icon,
  tone,
  title,
  badge,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  /** The tile's fill/foreground pair — a category mark, never a status. */
  tone: string;
  title: string;
  /** A status pill beside the name — what this route can do right now. */
  badge?: React.ReactNode;
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
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-body font-semibold text-foreground">{title}</span>
          {badge}
        </span>
        <span className="text-body-compact text-muted-foreground">{children}</span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
