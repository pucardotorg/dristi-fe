import type { Metadata } from "next";

import { ProfilePage } from "@/components/settings/profile-page";
import { DESK_BLOCK } from "@/components/settings/settings-layout";

export const metadata: Metadata = { title: "Settings" };

/**
 * `/settings`. Under a finger the frame shows the menu here; at the desk the menu is
 * already beside the page, so this shows the first page, Profile.
 */
export default function SettingsIndexPage() {
  return (
    <div className={DESK_BLOCK}>
      <ProfilePage />
    </div>
  );
}
