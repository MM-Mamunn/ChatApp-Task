"use client";

import React from "react";
import Link from "next/link";
import { ChevronRightIcon, ZapIcon, MessageSquareIcon } from "../ui/icons";

export function LandingCtaBanner() {
  return (
    <section className="py-20 relative overflow-hidden bg-slate-950 border-t border-slate-900">
      {/* Background glow and subtle mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl opacity-75" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-sky-500/10 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8 p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-semibold">
            <ZapIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instant Access • No Credit Card Required</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bring effortless lightness to your team&apos;s daily
              conversations.
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Step into a messaging workspace designed for speed, clarity, and
              distraction-free collaboration. Everything you need, and nothing
              standing in your way.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/chat"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquareIcon className="w-4 h-4" />
              <span>Start Chatting Free</span>
              <ChevronRightIcon className="w-4 h-4" />
            </Link>

            <a
              href="#demo-accounts"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white font-semibold text-sm transition-all text-center"
            >
              Try Pre-Seeded Accounts
            </a>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Sub-second real-time sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Private channels &amp; direct chats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Encrypted session protection</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
