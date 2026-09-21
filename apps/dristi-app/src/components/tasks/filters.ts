"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DEFAULT_FILTERS, KIND_ORDER, type DueFilter, type Filters } from "@/lib/tasks/selectors";
import type { PillKind, TaskView } from "@/lib/tasks/types";

const VIEWS: TaskView[] = ["needs-action", "waiting", "completed", "archived"];
const DUES: DueFilter[] = ["any", "overdue", "today", "week", "before-hearing"];

function oneOf<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** URL → filters. Unknown values fall back to defaults; nothing throws. */
export function parseFilters(params: URLSearchParams): Filters {
  const kind = params.get("kind");
  return {
    view: oneOf(params.get("view"), VIEWS, DEFAULT_FILTERS.view),
    kind: kind && (KIND_ORDER as readonly string[]).includes(kind) ? (kind as PillKind) : null,
    due: oneOf(params.get("due"), DUES, DEFAULT_FILTERS.due),
    court: params.get("court") ?? "",
    advocate: params.get("adv") ?? "",
    query: params.get("q") ?? "",
  };
}

/** Filters → URL. Defaults are omitted so the shareable URL stays short. */
export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.view !== DEFAULT_FILTERS.view) p.set("view", f.view);
  if (f.kind) p.set("kind", f.kind);
  if (f.due !== DEFAULT_FILTERS.due) p.set("due", f.due);
  if (f.court) p.set("court", f.court);
  if (f.advocate) p.set("adv", f.advocate);
  if (f.query.trim()) p.set("q", f.query.trim());
  return p;
}

/**
 * The filters and the open task, read from and written to the URL. `replace` + no
 * scroll, so typing in the search box does not pile up history entries or jump the page.
 */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = React.useMemo(() => parseFilters(params), [params]);
  const taskId = params.get("task");

  const write = React.useCallback(
    (next: Filters, nextTask: string | null) => {
      const p = serializeFilters(next);
      if (nextTask) p.set("task", nextTask);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const setFilters = React.useCallback(
    (patch: Partial<Filters> | ((prev: Filters) => Filters)) => {
      const next = typeof patch === "function" ? patch(filters) : { ...filters, ...patch };
      write(next, taskId);
    },
    [filters, taskId, write]
  );

  const setTaskId = React.useCallback((id: string | null) => write(filters, id), [filters, write]);

  return { filters, setFilters, taskId, setTaskId };
}
