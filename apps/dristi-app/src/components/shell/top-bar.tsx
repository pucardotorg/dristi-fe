"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import { useTasks } from "@/lib/tasks/store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { taskHref } from "@/lib/tasks/routes";
import { areaOf } from "@/lib/nav/origin";
import { cn } from "@/lib/utils";
import { COLLAPSE_MOTION } from "@/components/cases/motion";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { caseOf, tasksInView } from "@/lib/tasks/selectors";
import { compareUrgency, daysUntil, isOverdue } from "@/lib/tasks/urgency";
import { useChrome, type Crumb } from "@/components/shell/chrome";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import {
  NotificationsBell,
  type ShellNotification,
} from "@/components/shell/notifications";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { LOCALES, pick, ui, type Locale } from "@/lib/onboarding/content";

/**
 * The one breadcrumb in the app. Route-aware: Tasks › the task › the action. The task
 * crumb is a link back to the list with that task open; the action is text.
 */
/**
 * A crumb that names a record by its number wears the identifier face, the same as the
 * number does on the screen below. No copy affordance here: a crumb is already a link,
 * and a control cannot hold another one.
 */
const idFace = (crumb: Crumb) => (crumb.mono ? "font-mono tabular-nums" : undefined);

function useTrail() {
  const { crumbs, crumbRoot } = useChrome();
  const pathname = usePathname();
  /*
   * The trail's root. A screen that knows which door it was reached through publishes
   * that door and it wins — the way back is where the person actually was, down to the
   * tab and the search they had running. Everything else names its area from the path,
   * which is what a screen reached directly deserves.
   */
  const root = crumbRoot ?? areaOf(pathname);
  return { crumbs, root };
}

/** Every crumb, linked, in order. Shared by the wide bar and the phone's opened row. */
function TrailList({ className }: { className?: string }) {
  const { crumbs, root } = useTrail();
  const last = crumbs.length - 1;
  return (
    <BreadcrumbList className={cn("flex-nowrap", className)}>
      <BreadcrumbItem className="shrink-0">
        {crumbs.length && root.href ? (
          <BreadcrumbLink asChild>
            <Link href={root.href} className={idFace(root)}>
              {root.label}
            </Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage className={idFace(root)}>{root.label}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {crumbs.map((crumb, i) => {
        const isLast = i === last;
        return (
          <React.Fragment key={`${i}-${crumb.label}`}>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className={isLast ? "min-w-0" : "shrink-0"}>
              {isLast ? (
                <BreadcrumbPage className={cn("truncate font-medium", idFace(crumb))}>
                  {crumb.label}
                </BreadcrumbPage>
              ) : crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} className={idFace(crumb)}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <span className={idFace(crumb)}>{crumb.label}</span>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        );
      })}
    </BreadcrumbList>
  );
}

const TRAIL_ROW_ID = "chrome-trail-row";

/**
 * From `lg` the bar has room and shows the trail whole. Under it (a phone, a
 * tablet held upright with the rail open) the language switch and the bell
 * leave the trail a few words, and it used to answer by dropping the middle
 * and cutting the end: "Cases › CMP/18…".
 *
 * So there the bar shows where you are, the last crumb, as a button (owner,
 * Sept 21). Tapping it opens the whole trail on a row of its own under the bar.
 * The row is in the flow, so the page moves down rather than being covered, and
 * a long trail scrolls sideways inside it. Going anywhere closes it.
 */
function ChromeBreadcrumb({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { crumbs, root } = useTrail();
  const here = crumbs.length ? crumbs[crumbs.length - 1] : root;

  return (
    <>
      <Breadcrumb className="hidden min-w-0 flex-1 lg:block">
        <TrailList />
      </Breadcrumb>
      <div className="flex min-w-0 flex-1 lg:hidden">
        {crumbs.length ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={TRAIL_ROW_ID}
            onClick={onToggle}
            className="-mx-2 flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors active:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="sr-only">Show the full path. You are on </span>
            <span className={cn("truncate text-body-compact font-medium text-foreground", idFace(here))}>
              {here.label}
            </span>
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-accent-strong text-muted-foreground"
            >
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  open && "rotate-180"
                )}
              />
            </span>
          </button>
        ) : (
          <span className={cn("truncate text-body-compact font-medium text-foreground", idFace(root))}>
            {root.label}
          </span>
        )}
      </div>
    </>
  );
}

/**
 * The DS trigger. No `aria-expanded`: the ghost Button paints `aria-expanded` as its
 * pressed fill, so the trigger would read as a filled square on every view where the
 * rail is open — the DS's own `SidebarTrigger` carries the state in its label instead.
 */
function NavTrigger() {
  const { open, isMobile } = useSidebar();
  // An open rail carries its own collapse control, in its header. Repeating it here
  // would put it back at the head of the breadcrumb row — which is what made it read as
  // the trail's first crumb. It returns only when the rail is a strip with no room.
  if (!isMobile && open) return null;
  return (
    <>
      <SidebarTrigger
        size="icon"
        aria-label="Expand main navigation"
        className="shrink-0 text-muted-foreground [&_svg]:size-5"
      />
      {/* The trigger belongs to the rail, the crumbs to the page. With the rail collapsed
          they sit side by side with nothing between them and the button reads as the
          trail's first item. A hairline is the least that separates them — and it lives
          here, with the trigger, so the two appear and disappear together. */}
      <Separator
        orientation="vertical"
        className="h-5! shrink-0 self-center! bg-hairline"
      />
    </>
  );
}

/**
 * What the bell reports, derived from the tasks already on screen.
 *
 * There is no notification service yet, so rather than invent events this reads the one
 * source of truth the app has: a task past its date is a thing that needs attention, and
 * saying so is a restatement of the person's own data rather than a fabricated feed.
 * Overdue items are `persistent` — they do not stop mattering because the panel was
 * opened — which also means nothing here is clearable until a real source lands.
 */
function useTaskNotifications() {
  const world = useTasks();
  const [readIds, setReadIds] = React.useState<ReadonlySet<string>>(new Set());

  const { state, people, cases, tasks, user } = world;

  const items = React.useMemo<ShellNotification[]>(() => {
    if (state !== "ready") return [];
    const now = new Date();
    const w = { people, cases, tasks, user, now };
    const pending = tasksInView(w, "needs-action");
    const overdue: ShellNotification[] = pending
      .filter((t) => isOverdue(t, now))
      .sort((a, b) => compareUrgency(a, b, now))
      .slice(0, 8)
      .map((t) => {
        const days = t.dueAt ? Math.abs(daysUntil(t.dueAt, now)) : 0;
        const kase = caseOf(w, t);
        return {
          id: t.id,
          title: t.title,
          body: `${days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} overdue`}${
            kase ? ` · ${kase.parties}` : ""
          }`,
          unread: !readIds.has(t.id),
          tone: "warning" as const,
          persistent: true,
          // Every task notification opens the task itself — the row is a
          // doorway to the action, not a status readout.
          href: taskHref(t.id),
        };
      });
    // A request addressed to this person is a thing that needs attention the moment it
    // arrives, deadline or none — still a restatement of their own data, not a feed.
    const requests: ShellNotification[] = pending
      .filter((t) => t.kind === "review" && !isOverdue(t, now))
      .map((t) => {
        const kase = caseOf(w, t);
        return {
          id: t.id,
          title: t.title,
          body: `Awaiting your decision${kase ? ` · ${kase.parties}` : ""}`,
          unread: !readIds.has(t.id),
          tone: "info" as const,
          persistent: true,
          href: taskHref(t.id),
        };
      });
    return [...requests, ...overdue];
  }, [state, people, cases, tasks, user, readIds]);

  const markAllRead = React.useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      return next;
    });
  }, [items]);

  // Nothing derived from live tasks is stale, so this is a no-op until a real feed
  // arrives — the control disables itself off `stale`, so it never lies about clearing.
  const clearStale = React.useCallback(() => {}, []);

  return { items, markAllRead, clearStale };
}

/**
 * Chrome for the whole app: the main nav's collapse trigger, where you are, what needs
 * your attention, and your account. The court identity lives in the nav rail's header
 * instead — it is the page origin, and it should not move when this bar's contents change.
 */
/** The app-wide language switch. Citizen screens render bilingual; the rest ignore it. */
function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <SegmentedControl
      size="compact"
      type="single"
      value={locale}
      onValueChange={(value) => value && setLocale(value as Locale)}
      aria-label={pick(ui.language, locale)}
      className="ml-auto shrink-0"
    >
      {LOCALES.map((l) => (
        <SegmentedControlItem key={l.value} value={l.value}>
          {l.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export function TopBar() {
  const notifications = useTaskNotifications();
  const { profileRole } = useProfile();
  // A litigant's notifications are their own (empty in this demo) — no advocate alerts.
  const items = profileRole === "litigant" ? [] : notifications.items;

  const { crumbs } = useChrome();
  const pathname = usePathname();
  // Open only for the page it was opened on: any navigation puts it away.
  const [trailFor, setTrailFor] = React.useState<string | null>(null);
  const trailOpen = trailFor === pathname && crumbs.length > 0;

  return (
    // `sticky` is positioned, so the phone search row can hang under it, full width.
    <header className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-hairline bg-card">
     <div className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
      <NavTrigger />
      <ChromeBreadcrumb
        open={trailOpen}
        onToggle={() => setTrailFor(trailOpen ? null : pathname)}
      />
      <LanguageToggle />
      {/* The person is named once, at the foot of the rail. A second avatar here said
          the same thing twice and put two account controls on one screen. What stays is
          the one thing this bar owes you that the rail cannot give: what changed. */}
      <NotificationsBell
        notifications={items}
        onRead={notifications.markAllRead}
        onClearAll={notifications.clearStale}
      />
     </div>
      <Collapsible open={trailOpen} className="lg:hidden">
        <CollapsibleContent id={TRAIL_ROW_ID} className={COLLAPSE_MOTION}>
          <Breadcrumb className="overflow-x-auto border-t border-hairline px-4 py-3 sm:px-6">
            <TrailList className="w-max" />
          </Breadcrumb>
        </CollapsibleContent>
      </Collapsible>
    </header>
  );
}
