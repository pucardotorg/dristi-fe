"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChromeAlertDialogContent } from "@/components/chrome/app-chrome";
import { FlowDialogContent } from "@/components/chrome/flow-dialog";
import { PANEL_CLASS } from "@/components/filing/form-card";
import { useLocale } from "@/components/shell/locale";
import {
  PAGE_BACK_COLUMN,
  PAGE_BACK_ROW,
  PageBackButton,
} from "@/components/shell/page-back-button";
import { PAGE_SUBTITLE, PAGE_TITLE } from "@/components/shell/page-frame";
import { DESK_BLOCK, TOUCH_FLEX } from "@/components/settings/settings-layout";
import { pick, type Copy } from "@/lib/onboarding/content";
import { settingsCopy } from "@/lib/settings/content";
import type { SettingsPageId } from "@/lib/settings/pages";
import { cn } from "@/lib/utils";

/** Replaces `{name}` slots in a line of copy. */
export function fillText(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (line, [key, value]) => line.replaceAll(`{${key}}`, value),
    text,
  );
}

/**
 * A Settings page's own heading.
 *
 * Desk: a section heading under the area's "Settings", beside the menu. Phone and
 * upright tablet: the page's title, with the back arrow on its line (`PageBackButton`,
 * as View Case and Raise application have it), because there the menu is the page
 * before this one.
 */
export function SettingsPageHeader({ page }: { page: SettingsPageId }) {
  const { locale } = useLocale();
  const title = pick(settingsCopy.pages[page].title, locale);
  const description = pick(settingsCopy.pages[page].description, locale);

  return (
    <>
      <div className={cn(PAGE_BACK_ROW, "mb-6", TOUCH_FLEX)}>
        <div className={PAGE_BACK_COLUMN}>
          <PageBackButton href="/settings" label={pick(settingsCopy.back, locale)} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={cn(PAGE_TITLE, "text-balance")}>{title}</h1>
          <p className={PAGE_SUBTITLE}>{description}</p>
        </div>
      </div>
      <div className={cn("mb-6", DESK_BLOCK)}>
        <h2 className="text-title-s font-semibold">{title}</h2>
        <p className={cn(PAGE_SUBTITLE, "mt-1")}>{description}</p>
      </div>
    </>
  );
}

/** The body of a Settings page: its sections, one under another. */
export function SettingsBody({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

/**
 * One group of settings: a panel with its title and a line on what it is for. Its
 * content is a container, so rows lay out by the panel's width, not the window's: the
 * same panel is narrow beside the desk menu and wide on an upright iPad.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(PANEL_CLASS, "gap-4", className)}>
      <CardHeader className="gap-1">
        <CardTitle className="text-body font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-body-compact text-pretty">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="@container/settings flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

/** Ruled rows of label and value, for the facts a section holds. */
export function SettingsRows({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col divide-y divide-hairline">{children}</dl>;
}

/**
 * One fact: its label, its value, and the one thing you can do about it at the row's
 * end. Narrow panels stack the three; the action then takes the row's width so it is
 * an easy target under a thumb.
 */
export function SettingsRow({
  label,
  note,
  children,
  action,
}: {
  label: string;
  /** A quiet line under the label, e.g. where a value comes from. */
  note?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0 @lg/settings:flex-row @lg/settings:items-center @lg/settings:gap-6">
      <dt className="flex flex-col gap-0.5 @lg/settings:w-44 @lg/settings:shrink-0">
        <span className="text-body-compact text-muted-foreground">{label}</span>
        {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-col gap-3 @lg/settings:flex-row @lg/settings:items-center @lg/settings:justify-between @lg/settings:gap-4">
        <div className="min-w-0 text-body break-words">{children}</div>
        {action ? (
          <div className="flex shrink-0 flex-col @lg/settings:flex-row [&>*]:w-full @lg/settings:[&>*]:w-auto">
            {action}
          </div>
        ) : null}
      </dd>
    </div>
  );
}

/** A value that has not been given yet. */
export function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

/**
 * The shell every Settings change opens in: the filing dialogs' grammar (header on a
 * hairline, scrolling body, sunken footer), a full window on a phone, and the same
 * "Discard your changes?" guard when something has been typed.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  dirty,
  footer,
  children,
  wide = false,
  initialFocusId,
}: {
  /** Where focus starts when the first field is a locked, read-only value. */
  initialFocusId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** Something has been entered that closing would lose. */
  dirty: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { locale } = useLocale();
  const [discardOpen, setDiscardOpen] = React.useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (dirty) setDiscardOpen(true);
    else onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <FlowDialogContent
          lang={locale}
          className={cn(
            "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0",
            wide ? "sm:max-w-2xl" : "sm:max-w-lg",
          )}
          onInteractOutside={(event) => {
            if (dirty) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            if (!initialFocusId) return;
            event.preventDefault();
            document.getElementById(initialFocusId)?.focus();
          }}
        >
          <DialogHeader className="shrink-0 border-b border-hairline px-6 py-4 pr-16 text-left">
            <DialogTitle className="text-title-s font-semibold text-balance">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-pretty">{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </footer>
        </FlowDialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <ChromeAlertDialogContent lang={locale}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick(settingsCopy.dialogs.discardTitle, locale)}</AlertDialogTitle>
            <AlertDialogDescription>
              {pick(settingsCopy.dialogs.discardBody, locale)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pick(settingsCopy.dialogs.discardKeep, locale)}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              {pick(settingsCopy.dialogs.discardConfirm, locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </ChromeAlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Open state for a Settings dialog. Each opening gets a fresh `key`, so the dialog's
 * fields start empty every time without resetting them in an effect.
 */
export function useDialogState() {
  const [state, setState] = React.useState({ open: false, key: 0 });
  const show = React.useCallback(
    () => setState((current) => ({ open: true, key: current.key + 1 })),
    [],
  );
  const onOpenChange = React.useCallback(
    (open: boolean) => setState((current) => ({ ...current, open })),
    [],
  );
  return { open: state.open, key: state.key, show, onOpenChange };
}

/** `pick` for this file's callers that hold a Copy and the locale already. */
export function useCopy() {
  const { locale } = useLocale();
  return React.useCallback((copy: Copy) => pick(copy, locale), [locale]);
}
