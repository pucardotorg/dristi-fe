import type { Metadata } from "next";

import { OathSection } from "@/components/filing/sections/oath-section";

export const metadata: Metadata = { title: "Oath" };

export default function Page() {
  return <OathSection />;
}

