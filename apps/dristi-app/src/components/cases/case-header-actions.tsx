"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDownIcon, DownloadIcon, Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShareDialog } from "@/components/access/share-dialog";
import type { AccessPerson } from "@/lib/access/content";
import { useCaseBail } from "@/components/cases/case-bail-flow";
import { DownloadCaseFileDialog } from "@/components/cases/download-case-file-dialog";
import type { AccessCase } from "@/lib/access/content";

/**
 * Share access is out of v1 and returns in the next version (owner, Sept 17).
 * The button, the dialog and their props all stay wired; flip this to bring
 * the entry back.
 */
const SHARE_ACCESS_ENABLED = false;

/**
 * Case-file header actions. Beyond Neer's own filings, this is the case-access hub:
 * Share access (this one case) and the entries into Mohit's bail flow (application,
 * generate bond, status). The bail lifecycle + dialogs live in <CaseBailProvider>, which
 * wraps the page, so the in-page bond-task card and these entries share one state.
 */
export function CaseHeaderActions({
  accessCase,
  disposed = false,
  shareReadOnly = false,
  shareExtraPeople,
}: {
  accessCase: AccessCase;
  /** A disposed case still takes applications and documents (certified
   *  copies, restoration, return of documents), but no fresh bail filings.
   *  Working guess, open question Q-5. */
  disposed?: boolean;
  /** The viewer holds only office access here — share becomes view-only. */
  shareReadOnly?: boolean;
  /** The case's own nama advocates and staff, derived server-side. */
  shareExtraPeople?: AccessPerson[];
}) {
  const bail = useCaseBail();
  const [shareOpen, setShareOpen] = React.useState(false);
  const [downloadOpen, setDownloadOpen] = React.useState(false);
  const caseId = accessCase.id;

  return (
    <TooltipProvider>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {SHARE_ACCESS_ENABLED ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Share access to this case"
                onClick={() => setShareOpen(true)}
              >
                <Share2Icon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Share access to this case</TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Download case file"
              onClick={() => setDownloadOpen(true)}
            >
              <DownloadIcon aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Download case file</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button">
              Make filings
              <ChevronDownIcon data-icon="inline-end" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-max whitespace-nowrap">
            <DropdownMenuItem asChild>
              <Link href={`/cases/${caseId}/filings/application`}>
                Raise application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/cases/${caseId}/filings/documents`}>
                Submit documents
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {disposed ? null : (
              <>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    bail.openApplication();
                  }}
                >
                  Raise bail application
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    bail.openBondDirect();
                  }}
                >
                  Generate bail bond
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                bail.openStatus();
              }}
            >
              Bond status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DownloadCaseFileDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        caseNumber={accessCase.caseNumber}
      />

      {SHARE_ACCESS_ENABLED ? (
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        cases={[accessCase]}
        locale="en"
        readOnly={shareReadOnly}
        extraPeople={shareExtraPeople}
      />
      ) : null}
    </TooltipProvider>
  );
}
