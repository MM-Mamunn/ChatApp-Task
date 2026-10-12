import React from "react";
import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LandingExperience } from "@/components/landing/experience";
import { LandingFeatures } from "@/components/landing/features";
import { LandingBenefits } from "@/components/landing/benefits";
import { LandingDemoAccounts } from "@/components/landing/demo-accounts";
import { LandingCtaBanner } from "@/components/landing/cta-banner";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "ChatApp — Effortless Real-Time Team Messaging",
  description:
    "Team messaging built for speed, clarity, and effortless flow. Instant real-time channels, direct chats, and distraction-free collaboration for high-performing teams.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white flex flex-col font-sans">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-sky-500 text-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main id="main-content" className="flex-1 flex flex-col">
        {/* Hero Section with Live Mock UI */}
        <LandingHero />

        {/* Interactive Experience Sandbox (Bonus Feature) */}
        <LandingExperience />

        {/* Feature Superpowers */}
        <LandingFeatures />

        {/* Why ChatApp: Modern Contrast vs Legacy Messengers */}
        <LandingBenefits />

        {/* Ready-to-use Demo Personas */}
        <LandingDemoAccounts />

        {/* Closing Conversion CTA Banner */}
        <LandingCtaBanner />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
