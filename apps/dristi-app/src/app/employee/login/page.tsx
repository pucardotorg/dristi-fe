import type { Metadata } from "next";

import { CourtSignInBlock } from "@/components/employee/court-sign-in-block";

export const metadata: Metadata = { title: "Court staff sign-in" };

/**
 * `/employee/login` — the court's door.
 *
 * It sits outside the `(court)` route group on purpose, so it does not wear the bench's
 * rail: see `employee/(court)/layout.tsx`. The screen itself is
 * `CourtSignInBlock`.
 */
export default function CourtLoginPage() {
  return <CourtSignInBlock />;
}
