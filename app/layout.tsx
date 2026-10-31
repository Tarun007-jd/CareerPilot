import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { CareerPilotProvider } from "@/components/providers/career-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AssistantCommandCenter } from "@/components/assistant/assistant-command-center";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "CareerPilot AI — Your Career. Your Voice. Your Roadmap.",
    template: "%s · CareerPilot AI",
  },
  description:
    "Voice-first AI career coach for students and early-career professionals. Map skill gaps from real job descriptions, build adaptive learning plans, and track your path to the role you want.",
  applicationName: "CareerPilot AI",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  keywords: [
    "career coach",
    "AI career",
    "skill gap analysis",
    "learning roadmap",
    "mock interview",
    "job application tracker",
  ],
};

export const viewport: Viewport = {
  themeColor: "#f7f8fc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CareerPilotProvider>
          <TooltipProvider delayDuration={250}>
            <AppShell>{children}</AppShell>
            <AssistantCommandCenter />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  fontFamily: "inherit",
                },
              }}
            />
          </TooltipProvider>
        </CareerPilotProvider>
      </body>
    </html>
  );
}
