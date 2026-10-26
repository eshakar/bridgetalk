"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AmbientBackground } from "@/components/effects/AmbientBackground";
import { ReactLenis } from "lenis/react";
import { MeetingProvider } from "@/components/providers/MeetingProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider>
      <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }} />
      <MeetingProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent-500 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <AmbientBackground />
        <div className="relative flex min-h-dvh">
          <AppSidebar open={navOpen} onClose={() => setNavOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader onOpenNav={() => setNavOpen(true)} />
            <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </MeetingProvider>
    </ToastProvider>
  );
}
