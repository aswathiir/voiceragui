import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { OnboardingDialog } from "@/components/ui/onboarding";

export const metadata: Metadata = {
  title: "VoiceRAG",
  description: "Voice-powered knowledge retrieval assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="neural-bg min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <OnboardingDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
