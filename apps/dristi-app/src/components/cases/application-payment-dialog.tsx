"use client";

import { useEffect, useRef, useState } from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ApplicationRecord } from "@/lib/cases/application-record";

/** Dummy court fee per application, from the legacy portal's payment screen. */
const FEE_RUPEES = 20;

function rupees(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

/**
 * Court fee for one application or several at once (APP-11). The fee is per
 * application, so a bulk payment lists each line and one total.
 */
export function ApplicationPaymentDialog({
  applications,
  onOpenChange,
  onPaid,
}: {
  /** Empty closes the dialog. */
  applications: ApplicationRecord[];
  onOpenChange: (open: boolean) => void;
  onPaid: (ids: string[]) => void;
}) {
  return (
    <Dialog open={applications.length > 0} onOpenChange={onOpenChange}>
      {applications.length > 0 ? (
        <PaymentBody
          key={applications.map((item) => item.id).join()}
          applications={applications}
          onPaid={onPaid}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function PaymentBody({
  applications,
  onPaid,
  onClose,
}: {
  applications: ApplicationRecord[];
  onPaid: (ids: string[]) => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [paid, setPaid] = useState(false);
  const count = applications.length;
  const total = rupees(FEE_RUPEES * count);

  /* The step changes inside one dialog; focus on the title announces it. */
  useEffect(() => {
    if (paid) titleRef.current?.focus();
  }, [paid]);

  return (
    <ChromeDialogContent className="flex max-h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader className="gap-1 border-b border-hairline px-6 py-4 text-left">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-title-s font-semibold outline-none"
        >
          {paid ? "Payment complete" : "Pay court fee"}
        </DialogTitle>
        <DialogDescription className="text-caption font-medium text-muted-foreground">
          {count === 1
            ? applications[0].typeLabel
            : `${count} applications, one payment`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
        {paid ? (
          <Banner variant="success">
            Court fee of {total} paid.{" "}
            {count === 1
              ? "The application is submitted."
              : `All ${count} applications are submitted.`}
          </Banner>
        ) : (
          <Banner variant="info">
            Please visit the Nyay Mitra to make this payment offline.
          </Banner>
        )}

        <dl className="flex flex-col rounded-lg bg-surface-sunken px-4 py-1 text-body-compact">
          {applications.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5"
            >
              <dt className="min-w-0 text-muted-foreground">
                {item.typeLabel}
              </dt>
              <dd className="shrink-0 tabular-nums">{rupees(FEE_RUPEES)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 py-2.5 font-semibold">
            <dt>{paid ? "Total paid" : "Total"}</dt>
            <dd className="shrink-0 tabular-nums">{total}</dd>
          </div>
        </dl>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
        {paid ? (
          <Button
            type="button"
            onClick={() => {
              onPaid(applications.map((item) => item.id));
              onClose();
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => setPaid(true)}>
              Pay {total}
            </Button>
          </>
        )}
      </div>
    </ChromeDialogContent>
  );
}
