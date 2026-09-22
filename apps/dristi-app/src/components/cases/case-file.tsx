"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { DigitalRecord } from "@/components/cases/digital-record";
import { DocumentPreviewActions } from "@/components/cases/document-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ancestorIds,
  CASE_FILE_TREE,
  caseFileDocHref,
  caseFilePdfSrc,
  fileNumberLabel,
  findNode,
  isCaseFileFolder,
  type CaseFileNode,
  type CaseFileView,
} from "@/lib/cases/case-file";
import { caseFileDigitalPane } from "@/lib/cases/case-file-digital";
import { type ComplaintPane } from "@/lib/cases/complaint";
import { type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

/**
 * One Case file region — index and document share a Card so they cannot
 * scroll apart (Laws: grouped content gets a border). The panel fills the
 * leftover scrollport and stays there. The Case file and document titles
 * sit outside the scroll; a long category (Orders) moves inside the
 * index, not the page. PDF and digital are two reads of the same paper;
 * only the nested document pane moves on the right.
 * Categories stay independently open.
 *
 * Phone: the index moves into a Sheet so the page stays the document
 * (RESPONSIVE — stack / overlay before splitting).
 */
export function CaseFile({
  record,
  docId,
  view,
}: {
  record: CaseRecord;
  docId: string;
  view: CaseFileView;
}) {
  const router = useRouter();
  const selected = findNode(CASE_FILE_TREE, docId);
  const pane = caseFileDigitalPane(record, docId);
  const isLeaf = Boolean(selected && !isCaseFileFolder(selected));
  const leaf = selected && !isCaseFileFolder(selected) ? selected : undefined;
  // The same src the pane renders, so Download and Full view hand over the
  // page the reader is actually on rather than the top of the file.
  const leafSrc = leaf ? caseFilePdfSrc(leaf) : undefined;
  const leafLabel = leaf?.label;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openIds, setOpenIds] = useState(
    () => new Set(ancestorIds(CASE_FILE_TREE, docId))
  );

  function selectDoc(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      for (const ancestor of ancestorIds(CASE_FILE_TREE, id)) next.add(ancestor);
      return next;
    });
    router.replace(caseFileDocHref(record.id, id, view), { scroll: false });
    setSheetOpen(false);
  }

  function setFolderOpen(id: string, open: boolean) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const indexProps = {
    nodes: CASE_FILE_TREE,
    selectedId: docId,
    openIds,
    onSelect: selectDoc,
    onFolderOpenChange: setFolderOpen,
  };

  return (
    <div className="sticky top-0 z-10 flex h-[calc(100svh-theme(spacing.14)-theme(spacing.6))] w-full flex-col gap-4 bg-background md:h-[calc(100svh-theme(spacing.14)-theme(spacing.8))] md:gap-0">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 sm:w-auto md:hidden"
          >
            Browse case file
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-full overflow-y-auto p-0 sm:max-w-sm"
        >
          <SheetHeader>
            <SheetTitle className="text-title-s font-semibold">
              Case file
            </SheetTitle>
            <SheetDescription>Choose a document to open.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <nav aria-label="Case file">
              <CaseFileIndex {...indexProps} />
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0 hover:bg-card md:flex-row md:items-stretch md:gap-0">
        <div className="hidden min-h-0 w-80 shrink-0 flex-col gap-4 overflow-hidden p-6 md:flex">
          <h2 className="shrink-0 text-title-s font-semibold">Case file</h2>
          <ScrollArea type="always" className="min-h-0 flex-1">
            <nav aria-label="Case file">
              <CaseFileIndex {...indexProps} />
            </nav>
          </ScrollArea>
        </div>
        <Separator
          orientation="vertical"
          className="hidden self-stretch md:block"
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-6">
          <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-1">
              <h2 className="min-w-0 text-title-s font-semibold">
                {selected && !isCaseFileFolder(selected)
                  ? selected.label
                  : "Case file"}
              </h2>
              {view === "digital" && pane?.badges && pane.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pane.badges.map((badge) => (
                    <Badge key={badge} variant="secondary">
                      {badge}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            {isLeaf ? (
              <div className="flex flex-wrap items-center gap-2">
                <DocumentViewSwitch
                  view={view}
                  onViewChange={(next) => {
                    router.replace(
                      caseFileDocHref(record.id, docId, next),
                      { scroll: false }
                    );
                  }}
                />
                {/*
                  The pane's two reads share one grid cell, so the actions
                  cannot hang off a preview header the way they do everywhere
                  else — they compose the shared row here instead. They stay
                  put across the toggle: both act on the paper, which is what
                  a case file item is, whichever read is open.
                */}
                {leafSrc && leafLabel ? (
                  <DocumentPreviewActions
                    title={leafLabel}
                    source={{ kind: "src", src: leafSrc }}
                    download={{
                      href: leafSrc,
                      label: `Download ${leafLabel} PDF`,
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <DocumentPane
            caseId={record.id}
            node={selected}
            pane={pane}
            view={view}
          />
        </div>
      </Card>
    </div>
  );
}

/**
 * Exported for `order-case-file.tsx`: the order composer reads a document
 * from the same case-file tree while writing an order, and this is the
 * whole of the tree's accessible behaviour — focus rings, `aria-current`,
 * scroll-into-view — not something a second screen should rebuild.
 */
export function CaseFileIndex({
  nodes,
  selectedId,
  openIds,
  onSelect,
  onFolderOpenChange,
  depth = 0,
}: {
  nodes: CaseFileNode[];
  selectedId: string;
  openIds: Set<string>;
  onSelect: (id: string) => void;
  onFolderOpenChange: (id: string, open: boolean) => void;
  depth?: number;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <li key={node.id}>
          {isCaseFileFolder(node) ? (
            <Collapsible
              open={openIds.has(node.id)}
              onOpenChange={(open) => onFolderOpenChange(node.id, open)}
            >
              <div className={rowShell}>
                <CollapsibleTrigger
                  className={cn(
                    rowClass,
                    depthPad[Math.min(depth, depthPad.length - 1)]
                  )}
                  onClick={(event) => {
                    if (openIds.has(node.id)) return;
                    const item = event.currentTarget.closest("li");
                    if (!(item instanceof HTMLElement)) return;
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => scrollNodeIntoIndex(item));
                    });
                  }}
                >
                  <IndexLabel number={node.number} label={node.label} />
                  <ChevronDownIcon
                    className="pointer-events-none mt-0.5 size-4 shrink-0 text-muted-foreground group-aria-expanded/file-row:hidden"
                    aria-hidden
                  />
                  <ChevronUpIcon
                    className="pointer-events-none mt-0.5 hidden size-4 shrink-0 text-muted-foreground group-aria-expanded/file-row:inline"
                    aria-hidden
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                {node.children && node.children.length > 0 ? (
                  <CaseFileIndex
                    nodes={node.children}
                    selectedId={selectedId}
                    openIds={openIds}
                    onSelect={onSelect}
                    onFolderOpenChange={onFolderOpenChange}
                    depth={depth + 1}
                  />
                ) : (
                  <p
                    className={cn(
                      "border-b border-border py-3 text-body text-muted-foreground",
                      depthPad[Math.min(depth + 1, depthPad.length - 1)]
                    )}
                  >
                    None in this file yet
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className={rowShell}>
              <button
                type="button"
                aria-current={selectedId === node.id ? "page" : undefined}
                onClick={() => onSelect(node.id)}
                className={cn(
                  rowClass,
                  depthPad[Math.min(depth, depthPad.length - 1)],
                  selectedId === node.id &&
                    "bg-accent-strong font-medium hover:bg-accent-strong"
                )}
              >
                <IndexLabel number={node.number} label={node.label} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Hairline on the shell, fill on the row — same split as Item + ItemSeparator. */
const rowShell = "border-b border-border py-1";

const rowClass =
  "group/file-row flex min-h-10 w-full min-w-0 items-start justify-between gap-2 rounded-lg py-2 text-left text-body text-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50";

const depthPad = ["px-2", "pr-2 pl-6", "pr-2 pl-12"] as const;

function scrollNodeIntoIndex(node: HTMLElement) {
  const viewport = node.closest("[data-slot=scroll-area-viewport]");
  const scroller =
    viewport instanceof HTMLElement ? viewport : node.closest("nav");
  if (!(scroller instanceof HTMLElement)) return;
  const scrollerBox = scroller.getBoundingClientRect();
  const nodeBox = node.getBoundingClientRect();
  scroller.scrollTop += nodeBox.top - scrollerBox.top;
}

function IndexLabel({ number, label }: { number: string; label: string }) {
  return (
    <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 text-left">
      <span className="tabular-nums text-muted-foreground">
        {fileNumberLabel(number)}
      </span>
      <span className="min-w-0 whitespace-normal">{label}</span>
    </span>
  );
}

function DocumentViewSwitch({
  view,
  onViewChange,
}: {
  view: CaseFileView;
  onViewChange: (view: CaseFileView) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={view}
      onValueChange={(next) => {
        if (next === "pdf" || next === "digital") onViewChange(next);
      }}
      className="shrink-0"
      aria-label="Document view"
      aria-controls="case-file-document"
    >
      <ToggleGroupItem value="pdf" className="h-10 px-3 text-body">
        PDF
      </ToggleGroupItem>
      <ToggleGroupItem value="digital" className="h-10 px-3 text-body">
        Digital
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/**
 * Both reads of the paper live in one grid cell and the inactive one is
 * hidden rather than unmounted. Tearing the iframe down hands the browser a
 * fresh PDF viewer on every toggle: the reader loses their page, and on a
 * quick switch back the frame can come up blank because the plugin is
 * rebuilt against a box that has not been laid out yet. `invisible` keeps
 * the box in flow, so the viewer is built once and only ever hidden.
 */
function DocumentPane({
  caseId,
  node,
  pane,
  view,
}: {
  caseId: string;
  node: CaseFileNode | undefined;
  pane: ComplaintPane | undefined;
  view: CaseFileView;
}) {
  const leaf = node && !isCaseFileFolder(node) ? node : undefined;
  const src = leaf ? caseFilePdfSrc(leaf) : undefined;

  if (!leaf || !src) {
    return <NoDocumentSelected />;
  }

  return (
    <div
      id="case-file-document"
      className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden"
    >
      <div
        className={cn(
          "col-start-1 row-start-1 min-h-0 min-w-0 overflow-hidden rounded-xl bg-surface-sunken",
          view === "pdf" ? "visible" : "invisible"
        )}
        aria-hidden={view === "pdf" ? undefined : true}
      >
        <iframe
          key={src}
          title={leaf.label}
          src={src}
          className="size-full border-0 bg-card"
        />
      </div>

      {view === "digital" ? (
        <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col">
          {pane ? (
            <DigitalRecord caseId={caseId} pane={pane} />
          ) : (
            <Empty className="min-h-0 flex-1 border border-dashed border-border bg-background">
              <EmptyHeader>
                <EmptyTitle className="text-title-s font-semibold">
                  No digital record
                </EmptyTitle>
                <EmptyDescription className="text-body">
                  No digital record is filed for this paper. Open PDF to read
                  the document.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NoDocumentSelected() {
  return (
    <Empty
      id="case-file-document"
      className="min-h-0 flex-1 border border-dashed border-border"
    >
      <EmptyHeader>
        <EmptyTitle className="text-title-s font-semibold">
          No document selected
        </EmptyTitle>
        <EmptyDescription className="text-body">
          Choose an item from the case file to open it here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
