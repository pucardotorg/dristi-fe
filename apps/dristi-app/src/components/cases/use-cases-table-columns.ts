"use client";

import * as React from "react";

import {
  ALL_TOGGLEABLE,
  canonicalOrder,
  canonicalToggleable,
  DEFAULT_COLUMN_ORDER,
  DEFAULT_TOGGLEABLE_VISIBLE,
  isDefaultColumnOrder,
  isDefaultToggleableVisible,
  migrateStoredColumnOrder,
  moveVisibleColumn,
  shiftVisibleColumn,
  type DropSide,
  type TableColumnId,
  type ToggleableTableColumnId,
} from "@/lib/cases/table-columns";

/** New key so the visibility-only list is not read as order + visibility. */
const STORAGE_KEY = "dristi.cases.tableColumns.v2";

type StoredColumns = {
  visible: readonly ToggleableTableColumnId[];
  order: readonly TableColumnId[];
};

const DEFAULT_STORED: StoredColumns = {
  visible: DEFAULT_TOGGLEABLE_VISIBLE,
  order: DEFAULT_COLUMN_ORDER,
};

const DEFAULT_SNAPSHOT = serialize(DEFAULT_STORED);

const listeners = new Set<() => void>();

function serialize(value: StoredColumns): string {
  return JSON.stringify({
    visible: value.visible,
    order: value.order,
  });
}

function parse(raw: string): StoredColumns {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return DEFAULT_STORED;
    const record = parsed as { visible?: unknown; order?: unknown };
    if (!Array.isArray(record.visible) || !Array.isArray(record.order)) {
      return DEFAULT_STORED;
    }
    return {
      visible: canonicalToggleable(
        record.visible.filter((entry): entry is string => typeof entry === "string")
      ),
      order: migrateStoredColumnOrder(
        canonicalOrder(
          record.order.filter((entry): entry is string => typeof entry === "string")
        )
      ),
    };
  } catch {
    return DEFAULT_STORED;
  }
}

function read(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_SNAPSHOT;
    return serialize(parse(stored));
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function write(next: StoredColumns) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialize(next));
  } catch {
    /* private mode / blocked storage */
  }
  listeners.forEach((listener) => listener());
}

function current(): StoredColumns {
  return parse(read());
}

/**
 * Column visibility and order are a personal working style, not a shareable
 * filter — persist locally, keep them out of the URL.
 */
export function useCasesTableColumns(): {
  order: readonly TableColumnId[];
  isVisible: (id: TableColumnId) => boolean;
  toggle: (id: ToggleableTableColumnId) => void;
  reorder: (
    from: TableColumnId,
    to: TableColumnId,
    options?: { hideStage?: boolean; side?: DropSide }
  ) => void;
  shift: (
    id: TableColumnId,
    delta: -1 | 1,
    options?: { hideStage?: boolean }
  ) => void;
  /** Every column on, order untouched. */
  showAll: () => void;
  reset: () => void;
  isDefault: boolean;
  isAllVisible: boolean;
} {
  const snapshot = React.useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_SNAPSHOT
  );
  const stored = React.useMemo(() => parse(snapshot), [snapshot]);

  const isVisible = React.useCallback(
    (id: TableColumnId) =>
      id === "caseNumber"
        ? true
        : stored.visible.includes(id as ToggleableTableColumnId),
    [stored.visible]
  );

  const toggle = React.useCallback((id: ToggleableTableColumnId) => {
    const now = current();
    const nextVisible = now.visible.includes(id)
      ? now.visible.filter((entry) => entry !== id)
      : canonicalToggleable([...now.visible, id]);
    write({ ...now, visible: nextVisible });
  }, []);

  const reorder = React.useCallback(
    (
      from: TableColumnId,
      to: TableColumnId,
      options?: { hideStage?: boolean; side?: DropSide }
    ) => {
      const now = current();
      const visible = (id: TableColumnId) =>
        id === "caseNumber"
          ? true
          : now.visible.includes(id as ToggleableTableColumnId);
      write({
        ...now,
        order: moveVisibleColumn(
          now.order,
          from,
          to,
          visible,
          options?.hideStage,
          options?.side
        ),
      });
    },
    []
  );

  const shift = React.useCallback(
    (
      id: TableColumnId,
      delta: -1 | 1,
      options?: { hideStage?: boolean }
    ) => {
      const now = current();
      const visible = (columnId: TableColumnId) =>
        columnId === "caseNumber"
          ? true
          : now.visible.includes(columnId as ToggleableTableColumnId);
      write({
        ...now,
        order: shiftVisibleColumn(
          now.order,
          id,
          delta,
          visible,
          options?.hideStage
        ),
      });
    },
    []
  );

  const showAll = React.useCallback(() => {
    const now = current();
    write({ ...now, visible: ALL_TOGGLEABLE });
  }, []);

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((listener) => listener());
  }, []);

  return {
    order: stored.order,
    isVisible,
    toggle,
    reorder,
    shift,
    showAll,
    reset,
    isDefault:
      isDefaultToggleableVisible(stored.visible) &&
      isDefaultColumnOrder(canonicalOrder(stored.order)),
    isAllVisible: stored.visible.length === ALL_TOGGLEABLE.length,
  };
}
