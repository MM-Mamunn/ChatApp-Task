import React from "react";
import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingFeatures } from "@/components/landing/features";
import { LandingExperience } from "@/components/landing/experience";
import { LandingDemoAccounts } from "@/components/landing/demo-accounts";
import { LandingCtaBanner } from "@/components/landing/cta-banner";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "ChatApp — Real-Time Team Messaging",
  description:
    "Direct messages and group channels with sub-second WebSocket delivery. No polling, no spinners — just conversation. Try with pre-seeded demo accounts.",
};

export default function HomePage() {
  return (
    <div
      className="min-h-screen text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col font-sans"
      style={{ backgroundColor: "#09090b" }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-white text-xs font-semibold"
      >
        Skip to main content
      </a>

      <LandingNavbar />

      <main id="main-content" className="flex-1 flex flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingExperience />
        <LandingDemoAccounts />
        <LandingCtaBanner />
      </main>

      <LandingFooter />
    </div>
  );
}
