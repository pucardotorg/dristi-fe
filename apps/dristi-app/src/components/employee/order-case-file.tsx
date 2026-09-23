"use client";

import * as React from "react";
import { ListTreeIcon } from "lucide-react";

import { CaseFileIndex } from "@/components/cases/case-file";
import { PANEL_CLASS } from "@/components/shell/panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ancestorIds,
  CASE_FILE_TREE,
  caseFilePdfSrc,
  findNode,
  firstLeaf,
  isCaseFileFolder,
} from "@/lib/cases/case-file";
import { cn } from "@/lib/utils";

/**
 * The case file, read beside the order rather than composed from it.
 *
 * The tree, the leaf lookup and the row behaviour are read from the
 * advocate's own case file (`components/cases/case-file.tsx`) rather than
 * rebuilt — a component gets composed, not duplicated. What differs is
 * where the open document lives: that screen is a page of its own and
 * keeps it in the URL; this is a pane inside the order composer, and
 * routing it would carry the typist off the order the moment they open a
 * document. Local state instead, and it resets with the sitting like the
 * rest of the draft.
 *
 * **The index is a button, not a standing column** (owner, 2026-09-22):
 * this pane exists to give the PDF the width the right column has, and a
 * permanent index rail was most of that width gone before the page was
 * read. `Popover` opens the tree over the document instead — the typist
 * finds the next paper, picks it, and the pane closes back over the PDF.
 *
 * **PDF only, no Digital toggle.** The typist opened this to read a paper
 * while writing the order, not to work the case file itself — and the
 * digital pane needs a `CaseRecord` this screen has no reason to carry.
 *
 * Desktop only, on the owner's instruction — the order composer this pane
 * lives in has never had a phone layout of its own either.
 */
export function OrderCaseFile({ className }: { className?: string }) {
  const [docId, setDocId] = React.useState(
    () => firstLeaf(CASE_FILE_TREE)?.id ?? "",
  );
  const [openIds, setOpenIds] = React.useState(
    () => new Set(ancestorIds(CASE_FILE_TREE, docId)),
  );
  const [indexOpen, setIndexOpen] = React.useState(false);

  const selected = findNode(CASE_FILE_TREE, docId);
  const leaf = selected && !isCaseFileFolder(selected) ? selected : undefined;
  const src = leaf ? caseFilePdfSrc(leaf) : undefined;

  function selectDoc(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      for (const ancestor of ancestorIds(CASE_FILE_TREE, id)) next.add(ancestor);
      return next;
    });
    setDocId(id);
    setIndexOpen(false);
  }

  function setFolderOpen(id: string, open: boolean) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Card
      className={cn(
        PANEL_CLASS,
        "min-w-0 flex-col gap-0 overflow-hidden py-0",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline p-4">
        <h2 className="min-w-0 truncate text-body-compact font-semibold">
          {leaf ? leaf.label : "Case file"}
        </h2>
        <Popover open={indexOpen} onOpenChange={setIndexOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="shrink-0">
              <ListTreeIcon aria-hidden />
              Case file
            </Button>
          </PopoverTrigger>
          {/* `end`-aligned to the trigger's trailing edge, over the document rather
              than off the side of the card — the same reasoning `ViewCaseAction`'s
              own tooltip uses one screen along. */}
          <PopoverContent
            align="end"
            className="flex w-80 max-h-[min(32rem,70vh)] flex-col gap-2 p-3"
          >
            <PopoverHeader>
              <PopoverTitle>Case file</PopoverTitle>
              <PopoverDescription>
                Choose a document to open.
              </PopoverDescription>
            </PopoverHeader>
            <ScrollArea type="always" className="min-h-0 flex-1">
              <nav aria-label="Case file">
                <CaseFileIndex
                  nodes={CASE_FILE_TREE}
                  selectedId={docId}
                  openIds={openIds}
                  onSelect={selectDoc}
                  onFolderOpenChange={setFolderOpen}
                />
              </nav>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
        {src ? (
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-surface-sunken p-2">
            <iframe
              key={src}
              src={src}
              title={leaf?.label ?? "Case document"}
              className="size-full rounded-md border-0 bg-card"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-body-compact text-muted-foreground">
            Choose a document from the case file to open it here.
          </div>
        )}
      </div>
    </Card>
  );
}
