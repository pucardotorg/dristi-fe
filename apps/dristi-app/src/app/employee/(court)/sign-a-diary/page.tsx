import type { Metadata } from "next";

import { SignADiaryScreen } from "@/components/employee/sign-a-diary-screen";

export const metadata: Metadata = { title: "Sign A-Diary" };

/**
 * This court's own register of its day, waiting for the signature that makes it a
 * record — the screen the rail's "Sign A-Diary" row leads to.
 *
 * Lives at `/employee/sign-a-diary` because it is the Sign group's work, not a hearing.
 * The Hearings rows nest under `/employee/hearings`; this one does not, the same way the
 * two signing queues above it and the review queues do not.
 *
 * The screen is a client component throughout: the day, the register, the two acts on an
 * entry and the empty states are all interaction. There is no backend behind it, and
 * nothing on it signs, records or files anything — `lib/employee/sign-a-diary.ts` says
 * exactly what the data is and is not.
 */
export default function EmployeeSignADiaryPage() {
  return <SignADiaryScreen />;
}
