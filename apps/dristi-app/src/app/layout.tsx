import type { Metadata } from "next";

import { CourtProvider } from "@/components/court/court-provider";
import { DesignModeLoader } from "@/components/design-mode-loader";
import { FeedbackProvider } from "@/components/feedback-provider";
import { LocaleProvider } from "@/components/shell/locale";
import { ThemeProvider } from "@/components/theme-provider";
import { serverCourt } from "@/lib/court/server";

import "./globals.css";
/* App-owned rules on chrome we do not author; globals.css is synced from the DS. */
import "./chrome.css";

export const metadata: Metadata = {
  title: {
    default: "DRISTI",
    template: "%s · DRISTI",
  },
  description:
    "PUCAR's platform for NI Act §138 (cheque-dishonour) cases through Indian courts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Which state's court the app runs as (Settings). Read here so the server renders that
  // state's names and numbers from the first paint; see `CourtProvider`.
  const court = await serverCourt();

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider>
            <CourtProvider initialCourt={court}>
              <FeedbackProvider>{children}</FeedbackProvider>
              <DesignModeLoader />
            </CourtProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
