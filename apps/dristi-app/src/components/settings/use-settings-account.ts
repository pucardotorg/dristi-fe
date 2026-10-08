"use client";

import { useProfile } from "@/components/shell/profile";
import { useAccount, type AccountState, type AdvocateStatus } from "@/lib/settings/account";

/**
 * The signed-in account as Settings reads it, with the advocate status reconciled
 * against the profile switcher: an account the shell already treats as holding an
 * advocate profile is approved, whatever the demo store was seeded with.
 */
export function useSettingsAccount(): {
  account: AccountState;
  advocateStatus: AdvocateStatus;
} {
  const { accountName, advocateProfileAvailable } = useProfile();
  const account = useAccount(accountName);
  const stored = account.advocate.status;
  const advocateStatus: AdvocateStatus =
    advocateProfileAvailable && (stored === "none" || stored === "pending") ? "approved" : stored;
  return { account, advocateStatus };
}
