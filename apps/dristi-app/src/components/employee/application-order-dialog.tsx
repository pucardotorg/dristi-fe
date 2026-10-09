"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { LifecycleApplication } from "@/lib/applications/lifecycle";
import { today } from "@/lib/applications/store";
import { courtLongForm } from "@/lib/cases/application-document";
import { formatCaseDate } from "@/lib/cases/types";
import { caseOf, causeTitleOf } from "@/lib/employee/application-tasks";

export type OrderKind = "dismiss" | "accept" | "reject";

const TITLES: Record<OrderKind, string> = {
  dismiss: "Order dismissing the application",
  accept: "Order accepting the application",
  reject: "Order rejecting the application",
};

/**
 * The order on an application, read through and signed without leaving the queue.
 *
 * Most orders on an application are the court's standard words, so the bench should not
 * have to open the full order composer to pass one (owner, 2026-10-08). The text sits in
 * the frame of the order it will become and can be edited in place; the composer is one
 * link away, in a new tab, for an order that needs more than words.
 *
 * Two acts, no Cancel (product review, 2026-10-08): **Sign order**, or **Save for
 * signing**, which leaves it in Sign orders for the magistrate to sign with the rest. Edits
 * keep themselves — the workstation holds them per application for the session, so they
 * survive moving to the next one and back — and a status line says so, as e-filing does,
 * so there is no Save as draft button. A bench clerk or typist only sends it for signing
 * (`ALC-22`). The window closes with its own ✕ or Escape.
 */
export function ApplicationOrderDialog({
  application,
  kind,
  text,
  onTextChange,
  canSign,
  open,
  onOpenChange,
  onSave,
  onSign,
}: {
  application: LifecycleApplication;
  kind: OrderKind;
  text: string;
  onTextChange: (text: string) => void;
  canSign: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onSign: () => void;
}) {
  const [saved, setSaved] = React.useState(false);
  const textId = React.useId();
  const record = caseOf(application);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSaved(false);
        onOpenChange(next);
      }}
    >
      <ChromeDialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
          <DialogTitle className="text-title-s font-semibold">{TITLES[kind]}</DialogTitle>
          <DialogDescription className="text-body-compact text-muted-foreground">
            Review the order before signing. The text may be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {/* The order as paper: the court's heading, then the words, then where the
              magistrate signs. Paper tokens, because this is a document inside the product. */}
          <article className="flex flex-col gap-4 rounded-lg border border-paper-border bg-paper p-6 text-paper-foreground">
            <header className="flex flex-col gap-2 text-center">
              {/* The court as the application's own facsimile names it. */}
              <p className="text-body font-semibold">
                {record ? `Before the ${courtLongForm(record.court)}` : "Before the court"}
              </p>
              <p className="text-body font-semibold">
                {record ? `${record.caseNumber} · ` : ""}
                {causeTitleOf(application)}
              </p>
            </header>
            <Field>
              <FieldLabel htmlFor={textId} className="justify-center text-body font-semibold">
                Order
              </FieldLabel>
              <Textarea
                id={textId}
                value={text}
                rows={8}
                onChange={(event) => {
                  onTextChange(event.target.value);
                  setSaved(true);
                }}
                className="min-h-40 bg-paper text-body text-paper-foreground"
              />
            </Field>
            <p className="text-right text-body-compact text-paper-muted-foreground">
              Judicial First Class Magistrate · {formatCaseDate(today())}
            </p>
          </article>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 sm:items-center sm:justify-between">
          {/* The way out to the full composer, with the draft's status beside it. */}
          <div className="flex flex-wrap items-center gap-x-4">
            <Button asChild variant="link" className="h-auto min-h-10 p-0 text-body-compact">
              <Link href="/employee/hearings" target="_blank" rel="noopener">
                Open in order screen
                <ExternalLinkIcon aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </Link>
            </Button>
            <p aria-live="polite" className="text-body-compact text-muted-foreground">
              {saved ? "Saved as draft" : ""}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {canSign ? (
              <>
                <Button type="button" variant="outline" onClick={onSave}>
                  Save for signing
                </Button>
                <Button type="button" onClick={onSign}>
                  Sign order
                </Button>
              </>
            ) : (
              <Button type="button" onClick={onSave}>
                Send for signing
              </Button>
            )}
          </div>
        </DialogFooter>
      </ChromeDialogContent>
    </Dialog>
  );
}
