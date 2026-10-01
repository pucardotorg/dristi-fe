"use client";

import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isHearingsPageSize,
  PAGE_SIZES,
  type HearingsPageSize,
} from "@/lib/employee/hearings";

/**
 * How much of a list is in view, how many rows at a time, and the way through it.
 *
 * Shared by every court-side list — the day's cause list, the scheduling queue, the
 * register queue, whatever the rail's other rows become next. It is one component rather than the same
 * twenty lines copied per screen because a footer that drifts is a footer the bench has to
 * re-learn: the count sits left, the page size beside it, the pager right, and the pager
 * is absent entirely when there is only one page.
 *
 * The page-size vocabulary stays in `lib/employee/hearings.ts`, which the employee area
 * already treats as the owner of the court-side list words.
 */
export function ListFooter({
  id,
  from,
  to,
  total,
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  /** Ties the page-size label to its trigger. One per screen. */
  id: string;
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: HearingsPageSize;
  onPageSizeChange: (size: HearingsPageSize) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        {/* Printed, not announced. The spoken copy of this sentence lives in
            `QueueAnnouncer`, which every queue mounts for all of its states — this footer
            disappears when nothing matches, and a live region that is not in the DOM when
            the count changes is a live region that says nothing about the change worth
            hearing. */}
        <p className="text-body-compact text-muted-foreground tabular-nums">
          Showing {from}–{to} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className="text-body-compact font-normal text-muted-foreground"
          >
            Per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(next) => {
              const size = Number.parseInt(next, 10);
              if (isHearingsPageSize(size)) onPageSizeChange(size);
            }}
          >
            <SelectTrigger id={id} className="text-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pageCount > 1 ? (
        <Pagination className="mx-0 w-auto justify-start md:justify-end">
          <PaginationContent>
            {page > 1 ? (
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(page - 1);
                  }}
                />
              </PaginationItem>
            ) : null}
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (entry) => (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === page}
                    aria-label={`Go to page ${entry}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            {page < pageCount ? (
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(page + 1);
                  }}
                />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
