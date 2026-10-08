import {
  AccessibilityIcon,
  ArrowLeftRightIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  ScaleIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import type { settingsCopy } from "@/lib/settings/content";

export type SettingsPageId = keyof typeof settingsCopy.pages;
export type SettingsGroupId = keyof typeof settingsCopy.groups;

export type SettingsPage = {
  id: SettingsPageId;
  group: SettingsGroupId;
  icon: LucideIcon;
  /** Shown only once the account holds an advocate profile. */
  advocateOnly?: boolean;
};

/** Settings, in menu order. The route is `/settings/<id>`. */
export const SETTINGS_PAGES: SettingsPage[] = [
  { id: "profile", group: "account", icon: UserRoundIcon },
  { id: "advocate", group: "account", icon: ScaleIcon, advocateOnly: true },
  { id: "account-type", group: "account", icon: ArrowLeftRightIcon },
  { id: "security", group: "account", icon: ShieldCheckIcon },
  { id: "display", group: "preferences", icon: AccessibilityIcon },
  { id: "language", group: "preferences", icon: LanguagesIcon },
  { id: "help", group: "help", icon: LifeBuoyIcon },
];

export const SETTINGS_GROUPS: SettingsGroupId[] = ["account", "preferences", "help"];

export function isSettingsPageId(value: string): value is SettingsPageId {
  return SETTINGS_PAGES.some((page) => page.id === value);
}

export function settingsHref(id: SettingsPageId): string {
  return `/settings/${id}`;
}
