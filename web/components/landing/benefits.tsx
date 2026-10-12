"use client";

import React from "react";
import {
  ZapIcon,
  CheckCircleIcon,
  ShieldIcon,
  MessageSquareIcon,
} from "../ui/icons";

export function LandingBenefits() {
  const comparisons = [
    {
      feature: "Message Delivery",
      legacy: "Delayed polling intervals, spinners, and refresh lag",
      chatapp: "Instant real-time push the moment you send",
    },
    {
      feature: "Interface Design",
      legacy: "Cluttered dashboards with overwhelming notification badges",
      chatapp: "Distraction-free, clean typography built for focus",
    },
    {
      feature: "Reading Experience",
      legacy: "Screen rudely snaps to bottom when a new message arrives",
      chatapp: "Preserves your reading position until you are ready",
    },
    {
      feature: "Team Administration",
      legacy: "Black-box tools where admins can impersonate users",
      chatapp: "Transparent audit trail with zero user impersonation",
    },
  ];

  return (
    <section
      id="why-chatapp"
      className="py-24 bg-slate-950 relative border-t border-slate-850"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            <ZapIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>The Modern Difference</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Why teams switch to a lighter way to talk.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Communication tools should bring people closer, not drain your
            laptop battery or overwhelm your day with chaotic noise.
          </p>
        </div>

        {/* Value Comparison Card */}
        <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 bg-slate-950 px-6 py-4 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            <div className="md:col-span-4">Experience Area</div>
            <div className="md:col-span-4 text-slate-500">
              Other Team Messengers
            </div>
            <div className="md:col-span-4 text-sky-400">ChatApp Experience</div>
          </div>

          <div className="divide-y divide-slate-800 text-xs sm:text-sm">
            {comparisons.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 px-6 py-5 gap-3 md:gap-0 items-center hover:bg-slate-900/40 transition-colors"
              >
                <div className="md:col-span-4 font-semibold text-white">
                  {row.feature}
                </div>
                <div className="md:col-span-4 text-slate-400 pr-4">
                  {row.legacy}
                </div>
                <div className="md:col-span-4 text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{row.chatapp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three Pillars of Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <ZapIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Buoyant & Ultra-Fast
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Opens in milliseconds and consumes minimal device memory, keeping
              your computer cool and responsive.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Distraction-Free</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thoughtfully pared down to what matters: your team, your channels,
              and the conversations that move work forward.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Effortless Privacy
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Industrial encryption shields passwords and sessions quietly in
              the background without getting in your way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
