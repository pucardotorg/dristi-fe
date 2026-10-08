"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PANEL_CLASS } from "@/components/filing/form-card";
import { Breadcrumbs } from "@/components/shell/chrome";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import {
  PAGE_GROUND,
  PAGE_GUTTER,
  PAGE_SUBTITLE,
  PAGE_TITLE,
} from "@/components/shell/page-frame";
import {
  DESK_BLOCK,
  DESK_FLEX,
  TOUCH_BLOCK,
} from "@/components/settings/settings-layout";
import { applyAdvocateDemo, type AdvocateStatus } from "@/lib/settings/account";
import { settingsCopy } from "@/lib/settings/content";
import {
  isSettingsPageId,
  SETTINGS_GROUPS,
  SETTINGS_PAGES,
  settingsHref,
  type SettingsPageId,
} from "@/lib/settings/pages";
import { pick } from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";

/** The page a Settings path shows. `/settings` itself shows Profile on the desk. */
function currentPage(pathname: string): SettingsPageId | null {
  const id = pathname.replace(/^\/settings\/?/, "").split("/")[0];
  return isSettingsPageId(id) ? id : null;
}

/** The pages this account has: Advocate details only once it holds that profile. */
export function useSettingsPages() {
  const { advocateProfileAvailable } = useProfile();
  return SETTINGS_PAGES.filter((page) => !page.advocateOnly || advocateProfileAvailable);
}

/* The demo's `?advocate=pending|not-approved`, applied once per visit. Its own
   component so the search-params read sits under a Suspense boundary. */
const appliedDemos = new Set<string>();
function AdvocateDemo() {
  const params = useSearchParams();
  const { accountName } = useProfile();
  const demo = params.get("advocate");
  React.useEffect(() => {
    if (!demo) return;
    const key = `${accountName}:${demo}`;
    if (appliedDemos.has(key)) return;
    appliedDemos.add(key);
    applyAdvocateDemo(accountName, demo as AdvocateStatus);
  }, [accountName, demo]);
  return null;
}

/**
 * The frame every Settings page sits in.
 *
 * Desk: the page heading, then the menu in a column beside the page, the way settings
 * are laid out wherever people already meet them. Phone and upright tablet: `/settings`
 * is the menu, grouped cards whose rows show an edge and a chevron because they open
 * something (owner, Sept 21), and each page brings the back arrow the product's other
 * pages use.
 */
export function SettingsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const page = currentPage(pathname);
  const onIndex = page === null;

  const crumbs = page ? [{ label: pick(settingsCopy.pages[page].title, locale) }] : [];

  return (
    <div lang={locale} className={cn("min-w-0 flex-1", PAGE_GROUND, PAGE_GUTTER)}>
      <Breadcrumbs crumbs={crumbs} />
      <React.Suspense fallback={null}>
        <AdvocateDemo />
      </React.Suspense>
      <div className="flex w-full flex-col gap-6">
        {/* The area's heading. On a page of its own under a finger, the page's own
            heading takes its place, so it steps aside there. */}
        <header className={cn("min-w-0 flex-col gap-1", onIndex ? "flex" : DESK_FLEX)}>
          <h1 className={PAGE_TITLE}>{pick(settingsCopy.title, locale)}</h1>
          <p className={PAGE_SUBTITLE}>{pick(settingsCopy.subtitle, locale)}</p>
        </header>

        <div className="flex min-w-0 items-start gap-8">
          <nav
            aria-label={pick(settingsCopy.title, locale)}
            className={cn(
              // Held in view while the page scrolls: under the top bar, on the gutter.
              "sticky top-[calc(theme(spacing.14)+theme(spacing.8))] w-56 shrink-0 lg:w-60",
              DESK_BLOCK,
            )}
          >
            <SettingsMenuList current={page ?? "profile"} />
          </nav>

          <div className="flex min-w-0 max-w-3xl flex-1 flex-col">
            {onIndex ? (
              <div className={TOUCH_BLOCK}>
                <SettingsMenuCards />
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The desk menu: grouped links, the current page held in the engaged fill. */
function SettingsMenuList({ current }: { current: SettingsPageId }) {
  const { locale } = useLocale();
  const pages = useSettingsPages();

  return (
    <div className="flex flex-col gap-6">
      {SETTINGS_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-caption font-semibold text-muted-foreground">
            {pick(settingsCopy.groups[group], locale)}
          </p>
          <ul className="flex flex-col gap-0.5">
            {pages
              .filter((entry) => entry.group === group)
              .map((entry) => {
                const Icon = entry.icon;
                const active = entry.id === current;
                return (
                  <li key={entry.id}>
                    <Link
                      href={settingsHref(entry.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-body-compact font-medium text-muted-foreground transition-colors outline-none",
                        "hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                        active && "bg-accent-strong text-foreground hover:bg-accent-strong",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {pick(settingsCopy.pages[entry.id].title, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The menu as a page (phone, upright tablet): one card per group, a row per page. */
function SettingsMenuCards() {
  const { locale } = useLocale();
  const pages = useSettingsPages();

  return (
    <div className="flex flex-col gap-6">
      {SETTINGS_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="px-1 text-body-compact font-semibold text-muted-foreground">
            {pick(settingsCopy.groups[group], locale)}
          </h2>
          <Card className={cn(PANEL_CLASS, "gap-0 overflow-hidden py-0")}>
            <ul className="flex flex-col divide-y divide-hairline">
              {pages
                .filter((entry) => entry.group === group)
                .map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.id}>
                      <Link
                        href={settingsHref(entry.id)}
                        className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors outline-none active:bg-accent focus-visible:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-body font-medium text-pretty">
                            {pick(settingsCopy.pages[entry.id].title, locale)}
                          </span>
                          <span className="text-body-compact text-pretty text-muted-foreground">
                            {pick(settingsCopy.pages[entry.id].description, locale)}
                          </span>
                        </span>
                        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
