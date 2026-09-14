import { EmployeeArea } from "@/components/employee/employee-area";
import { Toaster } from "@/components/ui/sonner";

/**
 * The court chrome — everything behind the court-staff sign-in.
 *
 * A route group rather than the area's own layout, because `/employee/login` is an
 * `/employee` route that must NOT wear this chrome: a sign-in screen inside the bench's
 * rail would offer a signed-out person every queue in the court. The group is the one
 * Next.js device that lets one segment hold two layouts, so the work routes sit in
 * `(court)` and the sign-in sits beside it.
 *
 * Nothing here is a guard. There is no session to check yet (`lib/employee/session.ts`
 * is a demo seat, not an authenticator), so a person who types a court URL still reaches
 * it. What the sign-in decides is *who the area runs as* — the name and the seat the rail
 * reports — and that is all it decides today.
 */
export default function CourtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EmployeeArea>{children}</EmployeeArea>
      {/* Per-area, as every other area mounts it: scrutiny's removal toast needs it. */}
      <Toaster position="bottom-right" />
    </>
  );
}
