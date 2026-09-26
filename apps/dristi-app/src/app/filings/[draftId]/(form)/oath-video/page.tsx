import type { Metadata } from "next";

import { OathVideoSection } from "@/components/filing/sections/oath-video-section";

export const metadata: Metadata = { title: "Oath video" };

export default function Page() {
  return <OathVideoSection />;
}
