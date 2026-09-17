"use client";

import { DownloadIcon, XIcon } from "lucide-react";

import { PdfViewer } from "@/components/cases/pdf-viewer";
import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { type OrderRecord } from "@/lib/cases/orders";
import { formatCaseDate } from "@/lib/cases/types";

/**
 * Opening an order shows the order (ORD-03): a tall dialog, a little short of
 * the screen so the case stays visible behind it, holding the PDF, Download
 * and close. The slim bar names the document, which a dialog needs anyway.
 */
export function OrderRecordDialog({
  order,
  onOpenChange,
}: {
  order: OrderRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const doc = order?.issuedDocument;

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <ChromeDialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {order ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-hairline py-2 pr-2 pl-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <DialogTitle className="truncate text-body-compact font-semibold">
                  {order.title}
                </DialogTitle>
                <DialogDescription className="text-caption font-medium tabular-nums text-muted-foreground">
                  {formatCaseDate(order.issuedOn)}
                </DialogDescription>
              </div>
              {doc?.href ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a href={doc.href} download aria-label="Download">
                          <DownloadIcon aria-hidden />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Download</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon-sm">
                  <XIcon aria-hidden />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
            {doc?.href ? (
              <PdfViewer
                key={`${doc.href}#${doc.page ?? 1}`}
                src={doc.href}
                /* The sample orders are single pages of one compiled file. */
                pages={doc.page ? { from: doc.page, to: doc.page } : undefined}
                title={order.title}
                className="flex-1 rounded-none"
              />
            ) : (
              <p className="p-6 text-body-compact text-muted-foreground">
                The document for this order is not on file yet.
              </p>
            )}
          </>
        ) : null}
      </ChromeDialogContent>
    </Dialog>
  );
}
