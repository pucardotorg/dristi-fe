"use client";

import type { MouseEvent } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { type CasesPageSize, type CasesSelection } from "@/lib/cases/query";
import { cn } from "@/lib/utils";

import { CasesItemList } from "./cases-item-list";
import { CARDS_ONLY, TABLE_ONLY } from "./cases-layout";
import { CasesPageSizeSelect } from "./cases-page-size";
import { CasesTable } from "./cases-table";

export type PageLink = {
  href: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const visible = [...pages]
    .filter((entry) => entry >= 1 && entry <= pageCount)
    .sort((a, b) => a - b);

  return visible.flatMap((entry, index) =>
    index > 0 && entry - visible[index - 1] > 1
      ? ["gap" as const, entry]
      : [entry]
  );
}

/**
 * Table (md+) or stacked items, plus pagination. `framed` adds the folder
 * card when this list is not already inside one — landing and folder
 * pages pass false; their CasePeekSurface is that edge.
 */
export function CasesListResults({
  selection,
  pageSize,
  onPageSizeChange,
  bookmarks,
  onToggleBookmark,
  pageLink,
  framed = true,
  hideStage = false,
  hideLongPendingFlag = false,
}: {
  selection: CasesSelection;
  pageSize: CasesPageSize;
  onPageSizeChange: (pageSize: CasesPageSize) => void;
  bookmarks: ReadonlySet<string>;
  onToggleBookmark: (id: string) => void;
  pageLink: (page: number) => PageLink;
  framed?: boolean;
  hideStage?: boolean;
  hideLongPendingFlag?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        className={cn(
          // min-w-0 lets this flex item shrink below the table's content width, so a
          // wide table (e.g. with the select column) scrolls inside the card instead
          // of pushing the page horizontally.
          "min-w-0",
          framed && "overflow-x-auto rounded-xl border border-hairline bg-card shadow-raised",
          !framed && "overflow-x-auto"
        )}
      >
        <div className={TABLE_ONLY}>
          <CasesTable
            rows={selection.rows}
            allIds={selection.ids}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            hideStage={hideStage}
            hideLongPendingFlag={hideLongPendingFlag}
          />
        </div>
        <div className={cn(CARDS_ONLY, framed && "p-4")}>
          <CasesItemList
            rows={selection.rows}
            bookmarks={bookmarks}
            onToggleBookmark={onToggleBookmark}
            hideStage={hideStage}
            hideLongPendingFlag={hideLongPendingFlag}
          />
        </div>
      </div>

      <CasesPager
        from={selection.from}
        to={selection.to}
        total={selection.total}
        page={selection.page}
        pageCount={selection.pageCount}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        pageLink={pageLink}
      />
    </div>
  );
}

/**
 * The foot of a list of cases: which rows these are, how many to a page, and the
 * pager. Its own component so every list of cases pages the same way. The Cases
 * page and the Raise application case chooser both end in it.
 */
export function CasesPager({
  from,
  to,
  total,
  page,
  pageCount,
  pageSize,
  onPageSizeChange,
  pageLink,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  pageSize: CasesPageSize;
  onPageSizeChange: (pageSize: CasesPageSize) => void;
  pageLink: (page: number) => PageLink;
}) {
  // On a phone the count and the page size hold the two ends of one line and
  // the pager centres under them. Left-stacked, the three read as dropped there
  // (owner, Sept 21).
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 md:justify-start">
        {/* The page's slice of the matched set. The card heading above says how
            many matched out of the whole book, so this line only names rows. */}
        <p
          className="text-body-compact text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          Rows {from}–{to} of {total}
        </p>
        <CasesPageSizeSelect
          value={pageSize}
          onChange={onPageSizeChange}
        />
      </div>
      {pageCount > 1 ? (
        <Pagination className="mx-0 w-full justify-center md:w-auto md:justify-end">
          <PaginationContent>
            {page > 1 ? (
              <PaginationItem>
                <PaginationPrevious {...pageLink(page - 1)} />
              </PaginationItem>
            ) : null}
            {pageWindow(page, pageCount).map(
              (entry, index) => (
                <PaginationItem key={`${entry}-${index}`}>
                  {entry === "gap" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      {...pageLink(entry)}
                      isActive={entry === page}
                      aria-label={`Go to page ${entry}`}
                    >
                      {entry}
                    </PaginationLink>
                  )}
                </PaginationItem>
              )
            )}
            {page < pageCount ? (
              <PaginationItem>
                <PaginationNext {...pageLink(page + 1)} />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
