import { redirect } from "next/navigation";

/**
 * `/welcome` — the role chooser, now the landing page at `/`.
 *
 * Kept as a redirect rather than deleted: the screen was live, it may be bookmarked or
 * linked from a deck, and the question it asked is the one `/` now asks in the open.
 */
export default function WelcomePage() {
  redirect("/");
}
