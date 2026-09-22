"use client";

import * as React from "react";
import { toast } from "sonner";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CASE_FILE_TREE } from "@/lib/cases/case-file";

type Format = "pdf" | "zip" | "sections";

const FORMATS: { value: Format; label: string }[] = [
  {
    value: "pdf",
    label: "Full case file, one PDF",
  },
  {
    value: "zip",
    label: "Full case file, separate files",
  },
  {
    value: "sections",
    label: "Only some sections",
  },
];

/**
 * ACT-01. The PRD documents one compiled PDF; the ZIP and the section picker
 * are a working guess (open question Q-2). Nothing is generated here, the
 * prototype only confirms the request.
 */
export function DownloadCaseFileDialog({
  open,
  onOpenChange,
  caseNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseNumber: string;
}) {
  const [format, setFormat] = React.useState<Format>("pdf");
  const [sections, setSections] = React.useState<string[]>([]);
  const blocked = format === "sections" && sections.length === 0;

  function toggleSection(id: string, checked: boolean) {
    setSections((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id)
    );
  }

  function download() {
    toast.success("Preparing your download", {
      position: "bottom-center",
      description: `${caseNumber}. It will start in a moment.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ChromeDialogContent className="flex max-h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b border-hairline px-6 py-4 text-left">
          <DialogTitle className="text-title-s font-semibold">
            Download case file
          </DialogTitle>
          <p className="font-mono text-caption font-medium text-muted-foreground">
            {caseNumber}
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as Format)}
            aria-label="What to download"
            className="flex flex-col gap-1"
          >
            {FORMATS.map((item) => (
              <div key={item.value} className="flex min-h-8 items-center gap-2">
                <RadioGroupItem
                  value={item.value}
                  id={`download-${item.value}`}
                />
                <Label htmlFor={`download-${item.value}`}>{item.label}</Label>
              </div>
            ))}
          </RadioGroup>

          {format === "sections" ? (
            <fieldset className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
              <legend className="sr-only">Sections to include</legend>
              {CASE_FILE_TREE.map((node) => (
                <div key={node.id} className="flex min-h-8 items-center gap-2">
                  <Checkbox
                    id={`download-section-${node.id}`}
                    checked={sections.includes(node.id)}
                    onCheckedChange={(checked) =>
                      toggleSection(node.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`download-section-${node.id}`}
                    className="font-normal"
                  >
                    {node.label}
                  </Label>
                </div>
              ))}
            </fieldset>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={blocked} onClick={download}>
            Download
          </Button>
        </div>
      </ChromeDialogContent>
    </Dialog>
  );
}
