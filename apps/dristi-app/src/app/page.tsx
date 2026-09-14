import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, GavelIcon, UsersIcon } from "lucide-react";

import { BrandLockup } from "@/components/brand-lockup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "24×7 ON Courts" };

/**
 * `/` — the front door.
 *
 * **A placeholder, deliberately.** The Kerala judiciary already publishes a public site
 * for 24×7 ON Courts; this stands in for it so the product has somewhere to open from
 * and so the one question the front door has to ask — which half of the app are you
 * here for — gets asked once, in the open. It is not a marketing site and must not grow
 * into one: when the real landing page arrives, this file is what it replaces.
 *
 * It takes over the two-door job that `/welcome` was doing. That screen was reachable
 * only by typing its URL, so in practice nobody met the question it asked; `/welcome`
 * now forwards here. The citizen sign-in that used to live at `/` moved to `/citizen`,
 * which is where `citizen/page.tsx` always said it belonged.
 *
 * Three things carry over from `/welcome`, because they were right:
 *
 * 1. **Advocates and litigants lead.** They are almost everyone who will ever meet this
 *    screen, and they are named the way they would name themselves — "Advocate, litigant
 *    or clerk", not "Citizen", which is our word for them and nobody else's.
 * 2. **The card is the target, not a button inside it.** Two teal buttons side by side
 *    would be two primary actions on one screen and would break the one-rationed-teal
 *    Law. The teal sits on the icon tile instead, marking the choices without competing.
 * 3. **The greeting comes before the question.** A door says its name before it asks you
 *    anything — here that is the lockup and the promise on the canvas plate, which is
 *    the same deep teal the sign-in screens stand on.
 *
 * English only. The citizen sign-in past this door carries the Malayalam, and a language
 * toggle here that translated four sentences and then handed over to a screen with its
 * own toggle would be two controls for one choice. Real landing-page copy arrives with
 * the real landing page.
 */
const CHOICES = [
  {
    href: "/citizen",
    icon: UsersIcon,
    title: "Advocate, litigant or clerk",
    who: "Anyone filing or following a case, including a party in person or a PoA-holder.",
  },
  {
    href: "/employee/login",
    icon: GavelIcon,
    title: "Court staff",
    who: "Magistrate, bench clerk, scrutiny officer or typist.",
  },
];

/**
 * What the system actually does, in three lines — the band that turns two doors into a
 * page. Every line describes something this build holds: a complaint is prepared and
 * filed here, a case is followed here, and the bench works it here. Nothing is claimed
 * that a screen does not do, and no number, timeline or benefit is asserted. When the
 * real landing page lands, this is the part that gets replaced by real copy first.
 */
const WHAT = [
  {
    title: "File a complaint",
    body: "Prepare a cheque-dishonour complaint, attach the documents, and submit it to the court without a trip to the filing counter.",
  },
  {
    title: "Follow the case",
    body: "See what has been listed, what the court has ordered, and what is waiting on you next.",
  },
  {
    title: "Work it from the bench",
    body: "Scrutiny, registration, hearings, orders and signatures — the court's own side of the same case.",
  },
];

const FOOTER = [
  { label: "Terms of use", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted dark:bg-background">
      {/* The canvas plate, the same fixed institutional surface the two sign-ins stand
          on — mode-invariant by design (see the CHANGELOG note on the brand-canvas
          tokens), so the front door reads the same in both themes. */}
      <header className="bg-linear-160 from-brand-canvas to-brand-canvas-deep text-brand-canvas-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:py-16">
          <BrandLockup onDark className="h-12" />
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="text-title-l text-balance font-semibold sm:text-display-s">
              File, follow and hear a case online.
            </h1>
            <p className="text-body text-brand-canvas-muted-foreground">
              24×7 ON Courts is the Kerala judiciary&rsquo;s end-to-end case management
              system for cheque-dishonour cases — filing, scrutiny, hearings, orders and
              signatures, in one place.
            </p>
            {/* Who runs it, said once and quietly, where a government front door says
                it. It used to sit in the footer, which cost the 375px line a wrap and
                put the attribution below three policy links. */}
            <p className="text-caption text-brand-canvas-muted-foreground">
              A Government of India digital courts initiative.
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
          <h2 className="text-title-s font-semibold">Choose how you are here today</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {CHOICES.map((choice) => {
              const Icon = choice.icon;
              return (
                <Link
                  key={choice.href}
                  href={choice.href}
                  className="group/choice rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
                >
                  {/* The lifted panel does the separating; the hover fill is the DS's own
                      `accent`, so the whole card reads as the target rather than a title
                      inside it. */}
                  <Card className="h-full gap-4 border-hairline shadow-raised transition-colors group-hover/choice:bg-accent">
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground">
                          <Icon aria-hidden className="size-5" />
                        </span>
                        <ArrowRightIcon
                          aria-hidden
                          className="mt-3 size-4 shrink-0 text-muted-foreground transition-transform group-hover/choice:translate-x-0.5"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-body font-semibold">{choice.title}</span>
                        <span className="text-body-compact text-muted-foreground">
                          {choice.who}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* A rule, not a second set of cards. The two doors above are the page's only
            targets; this band is read, not clicked, and giving it panels of its own
            would make three groups of boxes compete for the same glance. */}
        <div className="mx-auto w-full max-w-5xl px-6 pb-12">
          <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
            {WHAT.map((item) => (
              <div key={item.title} className="flex flex-col gap-1">
                <h3 className="text-body font-semibold">{item.title}</h3>
                <p className="text-body-compact text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* The policies, dot-separated — the same footer both sign-in screens carry, so
          the three read as one site. Separator and link stay in one flex item so a wrap
          never strands a dot at the end of a line. The separators are decorative, so
          they stay out of the accessibility tree. */}
      <footer
        aria-label="About this site"
        className="flex flex-wrap items-center justify-center gap-x-2 border-t border-border px-6 py-2 text-caption text-muted-foreground"
      >
        {FOOTER.map((item, index) => (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>·</span> : null}
            <Button
              variant="link"
              asChild
              className="h-10 px-0 text-caption text-muted-foreground"
            >
              <a href={item.href}>{item.label}</a>
            </Button>
          </span>
        ))}
      </footer>
    </div>
  );
}
