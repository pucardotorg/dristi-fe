"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleAlertIcon, FileSearchIcon } from "lucide-react";

import { RestingCard } from "@/components/cases/case-overview-card";
import { RowViewButton } from "@/components/cases/register-controls";
import { OrderRecordDialog } from "@/components/cases/order-record-dialog";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDER_KIND_DEFAULT,
  ORDER_KIND_FILTERS,
  isOrderKindFilter,
  ordersFile,
  type OrderKindFilter,
  type OrderRecord,
} from "@/lib/cases/orders";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

const ORDER_PARAM = "order";

/**
 * Orders & Notifications (§8). A party sees published orders only (ORD-04);
 * the draft and pending-signature states belong to court staff and are not
 * designed in this pass. The open order lives in `?order=`, so a hearing or a
 * case update can link straight to it.
 */
export function CaseOrders({ record }: { record: CaseRecord }) {
  const orders = useMemo(() => {
    try {
      return ordersFile(record)
        .orders.filter((order) => order.status === "published")
        .sort((a, b) => {
          const byDate = b.issuedOn.localeCompare(a.issuedOn);
          return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
        });
    } catch {
      return null;
    }
  }, [record]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<OrderKindFilter>(ORDER_KIND_DEFAULT);

  if (!orders) {
    return (
      <OrdersPanel>
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Orders and notifications could not be loaded</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </Alert>
      </OrdersPanel>
    );
  }

  const openOrder =
    orders.find((order) => order.id === searchParams.get(ORDER_PARAM)) ?? null;
  const rows = orders.filter((order) => order.kind === kind);

  function setOpenOrder(order: OrderRecord | null) {
    const next = new URLSearchParams(searchParams);
    if (order) next.set(ORDER_PARAM, order.id);
    else next.delete(ORDER_PARAM);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <OrdersPanel
      action={
        <SegmentedControl
          type="single"
          size="compact"
          value={kind}
          onValueChange={(next) => {
            if (isOrderKindFilter(next)) setKind(next);
          }}
          aria-label="Show orders or notifications"
        >
          {ORDER_KIND_FILTERS.map((item) => (
            <SegmentedControlItem key={item.id} value={item.id}>
              {item.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      }
    >
      {rows.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSearchIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="text-body font-semibold">
              {kind === "notification"
                ? "No notifications yet"
                : "No orders yet"}
            </EmptyTitle>
            <EmptyDescription>
              {kind === "notification"
                ? "Notices from the court about listings appear here."
                : "Orders appear here once the court publishes them."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW}>
              <TableHead className={cn(TABLE_HEAD, "w-36")}>Date</TableHead>
              <TableHead className={cn(TABLE_HEAD, "w-1/3")}>Title</TableHead>
              <TableHead className={TABLE_HEAD}>BoTD</TableHead>
              <TableHead className={cn(TABLE_HEAD, "w-20 text-right")}>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClass({ marksOpenRow: true })}>
            {rows.map((order) => (
              <TableRow
                key={order.id}
                aria-current={openOrder?.id === order.id ? "true" : undefined}
                className={cn(
                  tableRowClass({ open: openOrder?.id === order.id }),
                  "cursor-pointer"
                )}
                onClick={() => setOpenOrder(order)}
              >
                <TableCell
                  className={cn(TABLE_CELL, "align-top tabular-nums")}
                >
                  <time dateTime={order.issuedOn}>
                    {formatCaseDate(order.issuedOn)}
                  </time>
                </TableCell>
                <TableCell
                  className={cn(
                    TABLE_CELL,
                    "align-top font-medium whitespace-normal"
                  )}
                >
                  {order.title}
                </TableCell>
                <TableCell
                  className={cn(
                    TABLE_CELL,
                    "align-top whitespace-normal text-muted-foreground"
                  )}
                >
                  {order.botd ? (
                    <span className="line-clamp-2">{order.botd}</span>
                  ) : (
                    <>
                      <span aria-hidden>—</span>
                      <span className="sr-only">Not recorded</span>
                    </>
                  )}
                </TableCell>
                <TableCell className={cn(TABLE_CELL, "align-top text-right")}>
                  <RowViewButton
                    label={order.title}
                    onClick={() => setOpenOrder(order)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <OrderRecordDialog
        order={openOrder}
        onOpenChange={(open) => {
          if (!open) setOpenOrder(null);
        }}
      />
    </OrdersPanel>
  );
}

export function OrdersLoading() {
  return (
    <OrdersPanel busy>
      <span className="sr-only" role="status">
        Loading orders and notifications
      </span>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </OrdersPanel>
  );
}

function OrdersPanel({
  action,
  busy,
  children,
}: {
  action?: React.ReactNode;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <RestingCard>
      <CardContent className="flex flex-col gap-4" aria-busy={busy}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-body font-semibold text-foreground">
            Orders & Notifications
          </h2>
          {action}
        </div>
        {children}
      </CardContent>
    </RestingCard>
  );
}
