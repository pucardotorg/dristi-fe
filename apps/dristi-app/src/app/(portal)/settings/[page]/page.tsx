import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountTypePage } from "@/components/settings/account-type-page";
import { AdvocatePage } from "@/components/settings/advocate-page";
import { DisplayPage } from "@/components/settings/display-page";
import { HelpPage } from "@/components/settings/help-page";
import { LanguagePage } from "@/components/settings/language-page";
import { ProfilePage } from "@/components/settings/profile-page";
import { SecurityPage } from "@/components/settings/security-page";
import { settingsCopy } from "@/lib/settings/content";
import { isSettingsPageId, SETTINGS_PAGES, type SettingsPageId } from "@/lib/settings/pages";

const SCREENS: Record<SettingsPageId, () => React.ReactNode> = {
  profile: () => <ProfilePage />,
  advocate: () => <AdvocatePage />,
  "account-type": () => <AccountTypePage />,
  security: () => <SecurityPage />,
  display: () => <DisplayPage />,
  language: () => <LanguagePage />,
  help: () => <HelpPage />,
};

export function generateStaticParams() {
  return SETTINGS_PAGES.map((page) => ({ page: page.id }));
}

export async function generateMetadata(props: PageProps<"/settings/[page]">): Promise<Metadata> {
  const { page } = await props.params;
  return { title: isSettingsPageId(page) ? settingsCopy.pages[page].title.en : "Settings" };
}

export default async function SettingsSubPage(props: PageProps<"/settings/[page]">) {
  const { page } = await props.params;
  if (!isSettingsPageId(page)) notFound();
  return SCREENS[page]();
}
