import type { Metadata } from "next";

import { DesignModeLoader } from "@/components/design-mode-loader";
import { FeedbackProvider } from "@/components/feedback-provider";
import { LocaleProvider } from "@/components/shell/locale";
import { ThemeProvider } from "@/components/theme-provider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          enableSystem={false}
          storageKey="dristi.color-theme"
          disableTransitionOnChange
        >
          <LocaleProvider>
            <FeedbackProvider>{children}</FeedbackProvider>
            <DesignModeLoader />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
