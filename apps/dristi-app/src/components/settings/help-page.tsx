"use client";

import * as React from "react";
import { CheckCircle2Icon, FileTextIcon, MapPinIcon, MessageSquareWarningIcon, PhoneIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentSlot } from "@/components/ui/document-slot";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Identifier } from "@/components/chrome/identifier";
import { useLocale } from "@/components/shell/locale";
import {
  SettingsBody,
  SettingsDialog,
  SettingsPageHeader,
  SettingsSection,
  fillText,
  useDialogState,
} from "@/components/settings/settings-parts";
import { useSettingsAccount } from "@/components/settings/use-settings-account";
import { pick } from "@/lib/onboarding/content";
import { newReference, today, updateAccount, type AccountState } from "@/lib/settings/account";
import { settingsCopy, settingsFaq } from "@/lib/settings/content";

/* The contacts the product already gives citizens (onboarding help, Kollam). */
const HELP_DESK = { display: "0474 2919099", tel: "tel:+914742919099" };
const LEGAL_AID = { display: "15100", tel: "tel:15100" };
const SEWA_MAP = "https://www.google.com/maps/search/?api=1&query=e-Sewa+Kendra+District+Court+Kollam";

/**
 * Help and support: answers first, then people to call, then a way to report a
 * problem. The contacts are the ones onboarding already gives; the report is a
 * placeholder that confirms with a reference (owner, Sept 30), nothing is sent.
 */
export function HelpPage() {
  const { locale } = useLocale();
  const { account } = useSettingsAccount();
  const t = settingsCopy.help;
  const report = useDialogState();

  const contacts = [
    {
      icon: PhoneIcon,
      title: t.helpDesk,
      note: t.helpDeskNote,
      action: (
        <Button asChild variant="outline">
          <a href={HELP_DESK.tel}>{fillText(pick(t.call, locale), { number: HELP_DESK.display })}</a>
        </Button>
      ),
    },
    {
      icon: MapPinIcon,
      title: t.sewa,
      note: t.sewaNote,
      action: (
        <Button asChild variant="outline">
          <a href={SEWA_MAP} target="_blank" rel="noreferrer">
            {pick(t.sewaAction, locale)}
          </a>
        </Button>
      ),
    },
    {
      icon: PhoneIcon,
      title: t.legalAid,
      note: t.legalAidNote,
      action: (
        <Button asChild variant="outline">
          <a href={LEGAL_AID.tel}>{fillText(pick(t.call, locale), { number: LEGAL_AID.display })}</a>
        </Button>
      ),
    },
  ];

  return (
    <>
      <SettingsPageHeader page="help" />
      <SettingsBody>
        <SettingsSection title={pick(t.faqTitle, locale)}>
          <Accordion type="single" collapsible className="w-full">
            {settingsFaq.map((entry, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-body">{pick(entry.q, locale)}</AccordionTrigger>
                <AccordionContent className="text-body text-pretty text-muted-foreground">
                  {pick(entry.a, locale)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SettingsSection>

        <SettingsSection title={pick(t.contactTitle, locale)} description={pick(t.contactBody, locale)}>
          <ul className="flex flex-col divide-y divide-hairline">
            {contacts.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <li
                  key={index}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 @md/settings:flex-row @md/settings:items-center @md/settings:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body font-medium">{pick(contact.title, locale)}</span>
                      <span className="text-body-compact text-muted-foreground">{pick(contact.note, locale)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col @md/settings:shrink-0">{contact.action}</div>
                </li>
              );
            })}
          </ul>
        </SettingsSection>

        <SettingsSection title={pick(t.reportTitle, locale)} description={pick(t.reportBody, locale)}>
          <Button type="button" variant="outline" className="self-start max-sm:self-stretch" onClick={report.show}>
            <MessageSquareWarningIcon data-icon="inline-start" aria-hidden />
            {pick(t.reportTitle, locale)}
          </Button>
          {account.reports.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-body-compact font-semibold text-muted-foreground">{pick(t.reportsSent, locale)}</h3>
              <ul className="flex flex-col divide-y divide-hairline rounded-lg bg-surface-sunken px-4">
                {account.reports.map((entry) => (
                  <li key={entry.reference} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body-compact font-medium">{entry.topic}</span>
                      <span className="text-caption text-muted-foreground">
                        <Identifier value={entry.reference} label="reference" /> · {entry.sentOn}
                      </span>
                    </span>
                    <Badge variant="info">{pick(t.received, locale)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SettingsSection>
      </SettingsBody>

      <ReportProblemDialog key={`report-${report.key}`} open={report.open} onOpenChange={report.onOpenChange} account={account} />
    </>
  );
}

type TopicId = keyof typeof settingsCopy.dialogs.topics;

function ReportProblemDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountState;
}) {
  const { locale } = useLocale();
  const d = settingsCopy.dialogs;
  const [topic, setTopic] = React.useState<TopicId | "">("");
  const [caseNumber, setCaseNumber] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<File | null>(null);
  const [touched, setTouched] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const topicMissing = topic === "";
  const detailsMissing = !details.trim();

  function send(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (topicMissing || detailsMissing) return;
    const reference = newReference();
    updateAccount(account.key, (state) => ({
      ...state,
      reports: [{ reference, topic: pick(d.topics[topic], locale), sentOn: today() }, ...state.reports],
    }));
    setSent(reference);
  }

  if (sent) {
    return (
      <SettingsDialog
        open={open}
        onOpenChange={onOpenChange}
        title={pick(d.reportSentTitle, locale)}
        dirty={false}
        footer={
          <Button type="button" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.done, locale)}
          </Button>
        }
      >
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-muted text-success-muted-foreground">
            <CheckCircle2Icon className="size-6" aria-hidden />
          </span>
          <p className="text-body text-pretty">{fillText(pick(d.reportSentBody, locale), { reference: sent })}</p>
        </div>
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pick(d.reportTitle, locale)}
      description={pick(d.reportBody, locale)}
      dirty={topic !== "" || caseNumber !== "" || details !== "" || screenshot !== null}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {pick(settingsCopy.cancel, locale)}
          </Button>
          <Button type="submit" form="settings-report">
            {pick(d.sendReport, locale)}
          </Button>
        </>
      }
    >
      <form id="settings-report" noValidate className="flex flex-col gap-6" onSubmit={send}>
        <Field data-invalid={touched && topicMissing}>
          <FieldLabel>
            {pick(d.topic, locale)} <span className="text-destructive">*</span>
          </FieldLabel>
          <Select
            value={topic}
            onValueChange={(value) => {
              setTopic(value as TopicId);
              setTouched(false);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={pick(d.topicPlaceholder, locale)} />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(d.topics) as TopicId[]).map((id) => (
                <SelectItem key={id} value={id}>
                  {pick(d.topics[id], locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{touched && topicMissing ? pick(d.topicError, locale) : null}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="settings-report-case">
            {pick(d.caseNumber, locale)}{" "}
            <span className="font-normal text-muted-foreground">{pick(settingsCopy.optional, locale)}</span>
          </FieldLabel>
          <Input
            id="settings-report-case"
            value={caseNumber}
            className="font-mono"
            onChange={(event) => setCaseNumber(event.target.value)}
          />
          <FieldDescription>{pick(d.caseHint, locale)}</FieldDescription>
        </Field>

        <Field data-invalid={touched && detailsMissing}>
          <FieldLabel htmlFor="settings-report-details">
            {pick(d.details, locale)} <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            id="settings-report-details"
            rows={4}
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              setTouched(false);
            }}
          />
          <FieldDescription>{pick(d.detailsHint, locale)}</FieldDescription>
          <FieldError>{touched && detailsMissing ? pick(d.detailsError, locale) : null}</FieldError>
        </Field>

        <Field>
          <FieldLabel>
            {pick(d.screenshot, locale)}{" "}
            <span className="font-normal text-muted-foreground">{pick(settingsCopy.optional, locale)}</span>
          </FieldLabel>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            accept="image/png,image/jpeg"
            onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
          />
          <DocumentSlot
            status={screenshot ? "filled" : "empty"}
            media="icon"
            label={pick(d.screenshot, locale)}
            filename={screenshot?.name}
            thumbnail={<FileTextIcon className="size-5" aria-hidden />}
            onChooseFile={() => fileRef.current?.click()}
            copy={{ noFile: pick(d.noFile, locale), chooseFile: pick(d.chooseFile, locale) }}
          />
        </Field>
      </form>
    </SettingsDialog>
  );
}
