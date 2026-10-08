import { SettingsFrame } from "@/components/settings/settings-frame";

/** Settings: one frame (menu, heading, phone index) around every settings page. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
