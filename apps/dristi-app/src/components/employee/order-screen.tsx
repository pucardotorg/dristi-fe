"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarX2Icon } from "lucide-react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { DocumentPreview } from "@/components/cases/document-preview";
import {
  RichTextField,
  RichTextValueView,
  type RichTextValue,
} from "@/components/cases/rich-text-field";
import { ListingApplicationDialog } from "@/components/employee/listing-application-dialog";
import { useCourtToday } from "@/components/employee/use-court-today";
import { useHearingSession } from "@/components/employee/use-hearing-session";
import { useOrderDraft } from "@/components/employee/use-order-draft";
import { PANEL_CLASS } from "@/components/shell/panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  markHearingEnded,
  markHearingOngoing,
} from "@/lib/employee/hearing-session";
import {
  applicationsForListing,
  listingApplicationLabel,
  type ListingApplication,
  type ListingApplicationDecision,
} from "@/lib/employee/listing-applications";
import {
  causeTitle,
  COURT_HEARING_PURPOSES,
  hearingById,
  isoDay,
  parseIsoDay,
  withHearingSession,
  type CourtHearing,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
import { initialOrderDraft } from "@/lib/employee/order-demo";
import {
  appearancesFor,
  assembleAttendance,
  assembleItems,
  assembleNextListing,
  buildOrderDocument,
  nextUnhandledListing,
  type Appearance,
  type AttendanceMark,
  type OrderDocument,
  type ItemText,
  type OrderDraft,
  type OrderItemEntry,
} from "@/lib/employee/order-draft";
import {
  createOrderItem,
  orderItemLabel,
  ORDER_ITEM_GROUPS,
  type OrderItemDraft,
  type OrderItemTypeId,
} from "@/lib/employee/order-items";
import { Identifier } from "@/components/chrome/identifier";

/**
 * Compose the order of one listing.
 *
 * Built to the court's reference screen, region for region: the applications standing in
 * the matter at the head of the left column, the present and absent rolls under them,
 * the next hearing's details below that — and the order itself in the column beside,
 * which is an attendance line the screen writes and an item the bench dictates. A bar
 * across the top carries the cause and the way on to the next matter; a bar across the
 * bottom carries the draft and the paper.
 *
 * **This build issues nothing.** The draft is held for this sitting and dies on a
 * reload. Preview is a look at the paper. Next hearing ends this listing and calls the
 * next one on the board — the same screen marks the cause list already makes. Nothing
 * files, notifies, or signs, and answering an application draws no order.
 */
export function OrderScreen({ hearingId }: { hearingId: string }) {
  const hearing = hearingById(hearingId);
  if (!hearing) return <OrderMissing />;
  /* Keyed on the listing so advancing to the next item opens a composer at the top of
     itself rather than inheriting this one's transient state. The draft is not in that
     state — it lives in `order-drafts.ts`, keyed by listing there. */
  return <OrderReady key={hearing.id} hearing={hearing} />;
}

function OrderMissing() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX2Icon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="text-title-s font-semibold">
            This listing is not on the board
          </EmptyTitle>
          <EmptyDescription className="text-body">
            The order composer opens a matter from today&rsquo;s cause list. This
            one is not there.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/employee/hearings">Back to today&rsquo;s hearings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function OrderReady({ hearing }: { hearing: CourtHearing }) {
  const router = useRouter();
  const session = useHearingSession();
  const today = useCourtToday();
  /* The sitting's own mark laid over the fixture, not the day's starting position: a
     matter the bench ended a moment ago is completed in the session and still scheduled
     in the data. */
  const status = withHearingSession([hearing], session)[0].status;
  /* What this listing opens on before anybody dictates — empty, until the sitting is
     over and the order it produced is already written (`order-demo.ts`). Memoised on
     primitives because it *is* the draft until the first edit, and a fresh object every
     render would restart the editor under the bench's hands. */
  const initial = React.useMemo(
    () => initialOrderDraft(hearing, status, today),
    [hearing, status, today],
  );
  const [draft, setDraft] = useOrderDraft(hearing.id, initial);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [openApplication, setOpenApplication] =
    React.useState<ListingApplication | null>(null);

  const appearances = React.useMemo(() => appearancesFor(hearing), [hearing]);
  const attendance = assembleAttendance(appearances, draft.marks);
  const items = assembleItems(draft.items);
  const next = assembleNextListing(draft);
  const upNext = nextUnhandledListing(hearing, session);

  /* Only what is still pending. The reference labels every row "Pending — …", so a row
     that has been answered has left the strip; the answer is in the order, which is
     where the bench reads what it has done. */
  const pending = React.useMemo(
    () =>
      applicationsForListing(hearing.id).filter(
        (application) => !draft.applications[application.id],
      ),
    [hearing.id, draft.applications],
  );

  /**
   * Mark one appearance present or absent.
   *
   * The reference offers two independent checkbox columns, and this keeps both — but a
   * person holds one mark, so ticking present clears absent for that person and the
   * other box goes back up. The alternative is an order that says a party was both
   * present and absent, which is not a state a court record can be in.
   */
  function setMark(id: string, mark: AttendanceMark | undefined) {
    setDraft((current) => ({
      ...current,
      marks: { ...current.marks, [id]: mark },
    }));
  }

  /**
   * Add what the court passed, on its standing words.
   *
   * The words arrive with the item because that is the difference between the two seats
   * this screen serves: the bench dictates an order it is making, and the typist sets
   * down one the court already made, from the court's own form. Nothing is committed by
   * adding it — the paragraph is editable the moment it lands, and the whole draft still
   * dies on a reload (`order-drafts.ts`).
   */
  function addItem(type: OrderItemTypeId) {
    const item = createOrderItem(hearing, type);
    const number = draft.items.length + 1;
    setDraft((current) => ({ ...current, items: [...current.items, item] }));
    setAnnouncement(
      item.text.text
        ? `${orderItemLabel(type)} added as item ${number}. Its text is written in the order and can be edited.`
        : `${orderItemLabel(type)} added as item ${number}. It has no standing text — write it in the order.`,
    );
  }

  function removeItem(item: OrderItemDraft, number: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((entry) => entry.id !== item.id),
    }));
    /* Renumbering is a fact about the order, so it is said — but only when something
       actually moved. Removing the last item renumbers nothing. */
    const following = draft.items.length - number;
    setAnnouncement(
      following > 0
        ? `Item ${number}, ${orderItemLabel(item.type)}, removed. The ${following === 1 ? "item" : `${following} items`} after it moved up.`
        : `Item ${number}, ${orderItemLabel(item.type)}, removed.`,
    );
  }

  function setItemText(id: string, text: ItemText) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((entry) =>
        entry.id === id ? { ...entry, text } : entry,
      ),
    }));
  }

  /**
   * Answer one application, from the row.
   *
   * The answer is a sentence in the draft order and nothing else — no bail is granted
   * and no hearing moves (`listing-applications.ts`). It is kept in the draft rather
   * than in this component's state for the same reason the marks and the item are: Next
   * hearing unmounts the composer, and an answer given on item 4 must still be there if
   * the bench comes back to it.
   */
  function decide(
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) {
    setDraft((current) => ({
      ...current,
      applications: { ...current.applications, [application.id]: decision },
    }));
    setOpenApplication(null);
    setAnnouncement(
      `${listingApplicationLabel(application)}, ${application.number}, is ${decision}. The order records it.`,
    );
  }

  /**
   * End this listing and call the next one on the board.
   *
   * Both marks already exist on the cause list, and the sitting holds a single ongoing
   * listing — so navigating without ending would land on a composer the sitting has
   * locked, and calling the next matter without ending this one would silently return
   * this one to scheduled. The pair is the act a bench actually performs.
   *
   * Neither mark files, signs or notifies anything (`hearing-session.ts`).
   */
  function advance() {
    markHearingEnded(hearing.id);
    if (!upNext) {
      router.push("/employee/hearings");
      return;
    }
    markHearingOngoing(upNext.id);
    router.push(`/employee/hearings/${upNext.id}/order`);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* The cause, and the way on. `top-14` rather than `top-0`: the chrome's own bar
          is `sticky top-0` and 3.5rem tall, so this comes to rest directly under it
          instead of sliding beneath its fill. */}
      <header className="sticky top-14 z-20 flex flex-col gap-3 border-b border-hairline bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <h1 className="text-title min-w-0 text-balance font-semibold">
          Order : {causeTitle(hearing)}
        </h1>
        <Button
          type="button"
          className="w-full shrink-0 sm:w-fit"
          onClick={advance}
        >
          {upNext ? "Next hearing" : "End hearing"}
        </Button>
      </header>

      {/* Two lifted panels — the facts of this listing, and the order those entries
          make. Gap, not a vertical rule, separates them (grouped content gets a Card).
          The column between the white header and footer is the scoped work canvas:
          `bg-muted` in light so the cards read against the same tone as the rail;
          dark stays `bg-background` because muted sits *above* card there (FilingMain). */}
      <div className="grid min-w-0 flex-1 items-start gap-8 bg-muted p-6 md:p-8 lg:grid-cols-2 dark:bg-background">
        <Card className={cn(PANEL_CLASS, "min-w-0 gap-8 p-6")}>
          {pending.length > 0 ? (
            <>
              <PendingApplications
                applications={pending}
                onOpen={setOpenApplication}
                onDecide={decide}
              />
              <Separator decorative={false} className="bg-hairline" />
            </>
          ) : null}

          {/* One attendance cluster: present and absent are related rolls, not
              separate card sections, so they take gap-4 rather than the panel's
              gap-8. */}
          <div className="flex min-w-0 flex-col gap-4">
            <MarkGroup
              heading="Mark who is present"
              mark="present"
              appearances={appearances}
              marks={draft.marks}
              onMark={setMark}
            />
            <MarkGroup
              heading="Mark who is absent"
              mark="absent"
              appearances={appearances}
              marks={draft.marks}
              onMark={setMark}
            />
          </div>

          <Separator decorative={false} className="bg-hairline" />

          <NextHearingDetails
            draft={draft}
            onSkip={(skip) =>
              setDraft((current) => ({
                ...current,
                next: skip ? "none" : "list",
              }))
            }
            onPurpose={(nextPurpose) =>
              setDraft((current) => ({ ...current, nextPurpose }))
            }
            onDate={(nextDate) =>
              setDraft((current) => ({ ...current, nextDate }))
            }
          />

          <Separator decorative={false} className="bg-hairline" />

          <OrderItems
            items={draft.items}
            onAdd={addItem}
            onRemove={removeItem}
          />
        </Card>

        <OrderTextPanel
          attendanceBody={attendance.body}
          items={draft.items}
          entries={items.items ?? []}
          nextBody={next.body}
          onItemText={setItemText}
        />
      </div>

      <footer className="sticky bottom-0 z-30 border-t border-hairline bg-card px-6 py-3 md:px-8 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => {
              setAnnouncement(
                "Draft held for this sitting. Nothing has been filed or signed.",
              );
            }}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            className="w-full sm:w-fit"
            onClick={() => setPreviewOpen(true)}
          >
            Preview PDF
          </Button>
        </div>
      </footer>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ListingApplicationDialog
        hearing={hearing}
        application={openApplication}
        onOpenChange={setOpenApplication}
        onAllow={(application) => decide(application, "allowed")}
        onDismiss={(application) => decide(application, "dismissed")}
        /* The row that opened the overlay is gone by the time it closes — answering
           takes it out of the strip — so focus goes to the heading the strip sits
           under rather than to a control that no longer exists. */
        onReturnFocus={() => {
          document.getElementById("order-applications")?.focus();
        }}
      />

      <PreviewDialog
        document={buildOrderDocument(hearing, draft, today)}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

/**
 * The applications standing in this matter, and the bench's answer to each.
 *
 * The reference decides them on the row — View to read the paper, then Reject or
 * Accept — and that is the point of putting them here rather than in a review queue: an
 * interlocutory application is answered *in* the hearing it is pending on, by a
 * magistrate who has the file open in front of them. A modal per application is the
 * queue's workflow, and the queue is the work between sittings.
 *
 * The tint is the reference's cream: waiting on this bench is a status, so it takes the
 * warning pair rather than a neutral well, and the row says "Pending" as well as wearing
 * the fill — status is never colour alone (ACCESSIBILITY §3).
 */
function PendingApplications({
  applications,
  onOpen,
  onDecide,
}: {
  applications: ListingApplication[];
  onOpen: (application: ListingApplication) => void;
  onDecide: (
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-labelledby="order-applications">
      {/* `tabIndex={-1}`: focus comes back here when an answered row leaves the strip. */}
      <h2
        id="order-applications"
        tabIndex={-1}
        className="text-body font-semibold"
      >
        Applications
      </h2>
      <ul className="flex flex-col gap-2">
        {applications.map((application) => (
          <li
            key={application.id}
            className="flex flex-col gap-3 rounded-lg bg-warning-muted p-4 text-warning-muted-foreground sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-body min-w-0 font-medium">
              {`Pending - ${listingApplicationLabel(application)} - `}
              <Identifier value={application.number} label="application number" />
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              {/* `text-foreground` on the two outline-weight controls: each brings its
                  own fill, so their labels sit on that fill and not on the amber, and
                  without it they would inherit the tint's ink and jump to neutral on
                  hover. */}
              <Button
                type="button"
                variant="ghost"
                className="text-foreground"
                onClick={() => onOpen(application)}
              >
                View
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDecide(application, "dismissed")}
              >
                Reject
              </Button>
              <Button
                type="button"
                onClick={() => onDecide(application, "allowed")}
              >
                Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One of the reference's two attendance columns — present, or absent.
 *
 * A `fieldset` with the heading as its `legend`, so a screen reader announcing any box
 * in it says which roll it belongs to. Two columns, not four: four-across in this
 * panel squeezed long labels into ~125px. Each box still carries the 40×40 hit
 * area the DS primitive builds in.
 *
 * Legend is `display: table` in the UA stylesheet, so it does not take part in the
 * fieldset's flex gap — `mb-3` is the spacing that actually lands under the heading.
 */
function MarkGroup({
  heading,
  mark,
  appearances,
  marks,
  onMark,
}: {
  heading: string;
  mark: AttendanceMark;
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
}) {
  const group = React.useId();
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="text-body mb-3 w-full font-semibold">{heading}</legend>
      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {appearances.map((appearance) => {
          const id = `${group}-${appearance.id}`;
          /* A side may have two counsel on record, and two controls with the same
             accessible name is a control a voice user cannot ask for by name. The
             name disambiguates only where the role does not. */
          const ambiguous =
            appearances.filter((other) => other.role === appearance.role)
              .length > 1;
          return (
            <div
              key={appearance.id}
              className="flex min-h-10 min-w-0 items-center gap-3"
            >
              <Checkbox
                id={id}
                checked={marks[appearance.id] === mark}
                onCheckedChange={(checked) =>
                  onMark(appearance.id, checked === true ? mark : undefined)
                }
              />
              <Label htmlFor={id} className="text-body min-w-0 font-normal">
                {ambiguous
                  ? `${appearance.role} — ${appearance.name}`
                  : appearance.role}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Where the matter is posted to — the reference's third block.
 *
 * Skip is a checkbox rather than a pair of buttons because that is what the reference
 * offers, and it reads correctly: listing the matter again is the ordinary course, and
 * skipping is the exception you tick. The two fields under it stay visible when it is
 * ticked and go disabled, so the block does not change height under the pointer that
 * just ticked it.
 */
function NextHearingDetails({
  draft,
  onSkip,
  onPurpose,
  onDate,
}: {
  draft: OrderDraft;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  const skipId = React.useId();
  const skipped = draft.next === "none";
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="order-next">
      <h2 id="order-next" className="text-body font-semibold">
        Next hearing details
      </h2>

      <div className="flex min-w-0 items-start gap-2">
        <Checkbox
          id={skipId}
          className="mt-1"
          checked={skipped}
          onCheckedChange={(checked) => onSkip(checked === true)}
        />
        <Label htmlFor={skipId} className="text-body min-w-0 font-normal">
          Skip scheduling next hearing
        </Label>
      </div>

      <Field className="min-w-0">
        <FieldLabel className="text-body font-medium">
          Purpose of hearing
        </FieldLabel>
        <Select
          value={draft.nextPurpose || undefined}
          disabled={skipped}
          onValueChange={(value) => onPurpose(value as CourtHearingPurposeId)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a purpose" />
          </SelectTrigger>
          <SelectContent>
            {COURT_HEARING_PURPOSES.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* `DatePicker` owns its trigger and takes no `id`, so the visible label names a
          group around it rather than pointing `htmlFor` at a control that does not
          exist. Same pattern as today's hearings filter. */}
      <div className="flex min-w-0 flex-col gap-2">
        <span
          id="order-next-date-label"
          className="text-body w-fit font-medium"
        >
          Next date of hearing
        </span>
        <div role="group" aria-labelledby="order-next-date-label">
          <DatePicker
            value={draft.nextDate ? parseIsoDay(draft.nextDate) : undefined}
            disabled={skipped}
            onValueChange={(next) => onDate(next ? isoDay(next) : null)}
            placeholder="Pick a date"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * What the court passed today — the reference's fourth region, and the one the typist
 * actually works.
 *
 * **Choosing the item is what writes the order.** A typist is not composing a direction
 * from nothing; they are setting down an order the court has already made, from the
 * court's own standing form. So the catalogue is the instrument: pick "Summons" and the
 * paragraph appears in the column beside, with this listing's accused named in it, ready
 * to be corrected. A blank editor asks the wrong question of this seat.
 *
 * Membership lives here and the words live in the order (`OrderTextPanel`), which is the
 * reference's own division and the one thing about its layout that was right: the left
 * column is what the court decided, the right column is the order those decisions make.
 * Neither restates the other — this row carries a name and a number, not a sentence.
 *
 * A `Combobox` rather than the reference's plain select: seventeen items in one unsorted
 * list is a list you read, and this one is grouped as the case register groups it and
 * takes type-ahead, so a typist who knows the word never opens the menu at all.
 *
 * Remove is neutral, not the reference's red Delete. Nothing here is issued, so taking a
 * paragraph out of a draft is not a destructive act, and a red control on every row of a
 * list the typist builds is the alarm fatigue the Laws ration colour to avoid.
 */
function OrderItems({
  items,
  onAdd,
  onRemove,
}: {
  items: readonly OrderItemDraft[];
  onAdd: (type: OrderItemTypeId) => void;
  onRemove: (item: OrderItemDraft, number: number) => void;
}) {
  const [choice, setChoice] = React.useState<{
    id: OrderItemTypeId;
    label: string;
  } | null>(null);

  function add() {
    if (!choice) return;
    onAdd(choice.id);
    /* The box empties on add: it is the way in to the catalogue, not a record of what
       was chosen last. What is in the order is the list below it. */
    setChoice(null);
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="order-items">
      {/* `tabIndex={-1}`: focus comes back here when a removed row leaves the list. */}
      <h2 id="order-items" tabIndex={-1} className="text-body font-semibold">
        Order items
      </h2>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="min-w-0 flex-1">
          <FieldLabel
            htmlFor="order-item-choice"
            className="text-body font-medium"
          >
            Choose item
          </FieldLabel>
          <Combobox
            items={ORDER_ITEM_GROUPS}
            value={choice}
            onValueChange={(next) => setChoice(next)}
            isItemEqualToValue={(a, b) => a.id === b.id}
            itemToStringLabel={(item) => item.label}
            filter={(item, query) => {
              const q = query.trim().toLowerCase();
              if (!q) return true;
              return item.label.toLowerCase().includes(q);
            }}
            autoComplete="off"
          >
            <ComboboxInput
              id="order-item-choice"
              placeholder="Search the catalogue"
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxEmpty>No item found.</ComboboxEmpty>
              <ComboboxList>
                {(group: (typeof ORDER_ITEM_GROUPS)[number]) => (
                  <ComboboxGroup key={group.id} items={group.items}>
                    <ComboboxLabel className="text-caption font-medium">
                      {group.label}
                    </ComboboxLabel>
                    <ComboboxCollection>
                      {(item: { id: OrderItemTypeId; label: string }) => (
                        <ComboboxItem key={item.id} value={item}>
                          <span className="text-body whitespace-normal">
                            {item.label}
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>

        {/* Outline, not teal: the view already rations its one primary to the advance in
            the header, and adding a paragraph to a draft is not the act of the screen. */}
        <Button
          type="button"
          variant="outline"
          className="w-full shrink-0 sm:w-fit"
          disabled={!choice}
          onClick={add}
        >
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No item has been added yet. Choose one and its text is written for you.
        </p>
      ) : (
        <ol className="flex min-w-0 flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2"
            >
              <p className="text-body min-w-0">
                <span className="tabular-nums">{index + 1}.</span>{" "}
                {orderItemLabel(item.type)}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  onRemove(item, index + 1);
                  document.getElementById("order-items")?.focus();
                }}
              >
                Remove
                {/* The visible word is the same for every row, so the name a voice user
                    says is prefixed by it and finished by the item it belongs to. */}
                <span className="sr-only"> {orderItemLabel(item.type)}</span>
              </Button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * The order, as the reference composes it: the three regions of its Order Text column,
 * in the sequence an order reads.
 *
 * **Attendance** is read-only because it is not typed — it is the two checkbox rolls
 * beside it, in the words the order will use, and editing it here would let the sentence
 * and the marks disagree. **The items** are the part that is written, and they are the
 * only part: each one is paragraph *n* of the order, headed by the catalogue's name for
 * it and holding the standing words it opened on. **Next hearing** closes the order and
 * is read-only for the same reason attendance is — the purpose and the date are two
 * controls in the column beside.
 *
 * `readOnly` rather than `disabled` on both: the DS primitive gives a read-only field the
 * muted fill the reference shows, and it stays in the tab order and is still read out,
 * which a disabled field is not.
 *
 * Numbering is not decoration. `sign-order-dialog.tsx` already prints an order as
 * numbered paragraphs, and for one revision this composer printed unnumbered prose — two
 * screens in one flow disagreeing about the shape of the same artefact. The number here,
 * in the well's heading, is the same number the paper prints.
 *
 * Each item takes the app's one editor — `RichTextField`, the same one the applications
 * forms use, DS chrome around the one part the design system cannot supply. Its list
 * controls are what carry (a), (b), (c) *inside* a single item. The markup is the
 * editor's own and nothing else's: it blocks pasted HTML, so the order can only hold what
 * this toolbar produced.
 */
function OrderTextPanel({
  attendanceBody,
  items,
  entries,
  nextBody,
  onItemText,
}: {
  attendanceBody: string;
  items: readonly OrderItemDraft[];
  entries: OrderItemEntry[];
  nextBody: string;
  onItemText: (id: string, value: RichTextValue) => void;
}) {
  return (
    <Card
      className={cn(PANEL_CLASS, "min-w-0 gap-6 p-6")}
      role="region"
      aria-labelledby="order-text"
    >
      <h2 id="order-text" className="text-body font-semibold">
        Order text
      </h2>

      <Field className="min-w-0">
        <FieldLabel htmlFor="order-attendance-text" className="text-body font-medium">
          Attendance
        </FieldLabel>
        <Textarea
          id="order-attendance-text"
          readOnly
          value={attendanceBody}
          className="min-h-24"
        />
      </Field>

      {/* A group rather than a heading: the two fields on either side of it are field
          labels, and a heading here would out-weigh them for the same rank of thing. */}
      <div
        role="group"
        aria-labelledby="order-item-text"
        className="flex min-w-0 flex-col gap-4"
      >
        <span id="order-item-text" className="text-body w-fit font-medium">
          Item text
        </span>

        {items.length === 0 ? (
          <p className="text-body text-muted-foreground">
            The order has no item yet. Choose one under Order items and its text is
            written here.
          </p>
        ) : (
          items.map((item, index) => (
            <OrderItemWell
              key={item.id}
              number={entries[index]?.number ?? index + 1}
              heading={entries[index]?.heading ?? ""}
              value={item.text}
              onChange={(value) => onItemText(item.id, value)}
            />
          ))
        )}
      </div>

      <Field className="min-w-0">
        <FieldLabel htmlFor="order-next-text" className="text-body font-medium">
          Next hearing
        </FieldLabel>
        <Textarea
          id="order-next-text"
          readOnly
          value={nextBody}
          className="min-h-16"
        />
      </Field>
    </Card>
  );
}

/**
 * One numbered paragraph of the order.
 *
 * The editor is uncontrolled after it mounts (`rich-text-field.tsx` keeps the markup it
 * opened on), which is why the caller keys these on the item's id: a key that moved with
 * position would hand item two's words to item three the moment one above it was removed.
 */
function OrderItemWell({
  number,
  heading,
  value,
  onChange,
}: {
  number: number;
  heading: string;
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
}) {
  const labelId = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={labelId} className="text-body w-fit font-medium">
        <span className="tabular-nums">{number}.</span> {heading}
      </span>
      <RichTextField
        value={value}
        onChange={onChange}
        labelId={labelId}
        className="[&_[data-slot=input-group-control]]:min-h-32"
      />
    </div>
  );
}

/**
 * The order as paper — the one place it appears with no controls in it.
 *
 * The same facsimile treatment the signing queue uses on the same artefact, so the order
 * a bench reads back here is the order it will see when it comes to sign. Paper is fixed
 * in both themes by design and is never app chrome, which is why it lives in this dialog
 * and not under the fields.
 *
 * No download. There is no court record to download — the order has not been issued, and
 * offering a file would claim one.
 */
function PreviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: OrderDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ChromeDialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:h-[85dvh]">
        <DialogHeader className="shrink-0 gap-2 p-6 pr-16">
          <DialogTitle className="text-title-s font-semibold">
            Preview
          </DialogTitle>
          <DialogDescription className="text-body-compact text-muted-foreground">
            {document.matter} <span aria-hidden>· </span>
            {/* No copy control inside the dialog's accessible description. */}
            <Identifier value={document.caseNumber} label="case number" copyable={false} />{" "}
            — the order as it will read. It has not been issued.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          <DocumentPreview
            className="min-h-96 md:min-h-0"
            height="fill"
            title={document.title}
            source={{
              kind: "composed",
              content: <OrderFacsimile document={document} />,
            }}
          />
        </div>
      </ChromeDialogContent>
    </Dialog>
  );
}

function OrderFacsimile({ document }: { document: OrderDocument }) {
  return (
    <article className="flex flex-col gap-6 rounded-md bg-paper p-6 text-paper-foreground">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-body font-semibold">{document.court}</p>
        <p className="text-body font-semibold">Case no. {document.caseNumber}</p>
        <p className="text-body font-semibold">{document.matter}</p>
      </header>

      <h3 className="text-body text-center font-semibold">{document.title}</h3>

      <p className="text-body">{document.opening}</p>

      {document.applications.length > 0 ? (
        <div className="flex flex-col gap-3">
          {document.applications.map((sentence) => (
            <p
              key={sentence.text}
              className={
                sentence.pending
                  ? "text-body text-paper-muted-foreground"
                  : "text-body"
              }
            >
              {sentence.text}
            </p>
          ))}
        </div>
      ) : null}

      {document.items.length === 0 ? (
        /* Nothing added: the paper says so in the muted voice the rest of the document
           uses, rather than printing an empty list. */
        <p className="text-body text-paper-muted-foreground">
          No item has been added.
        </p>
      ) : (
        /* `ps-6` and `list-decimal`, the same as the signing queue's facsimile: the two
           screens print the same artefact and must not disagree about its shape. */
        <ol className="flex list-decimal flex-col gap-3 ps-6">
          {document.items.map((entry) => (
            <li key={entry.id} className="text-body">
              {entry.pending ? (
                <span className="text-paper-muted-foreground">{entry.body}</span>
              ) : (
                <RichTextValueView value={{ html: entry.html, text: entry.body }} />
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-body">{document.closing}</p>

      <p className="text-body">Dated {document.dated}.</p>

      <p className="text-body text-paper-muted-foreground">
        {document.signature}
      </p>
    </article>
  );
}
