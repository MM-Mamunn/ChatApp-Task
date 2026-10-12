"use client";

import React from "react";
import {
  MessageSquareIcon,
  UsersIcon,
  ZapIcon,
  ShieldIcon,
  SlidersIcon,
  CheckCircleIcon,
} from "../ui/icons";

export function LandingFeatures() {
  const features = [
    {
      title: "Spaces for focused collaboration",
      tagline: "Direct Chats & Team Channels",
      description:
        "Whether it is a fast 1-on-1 sync with a designer or a company-wide announcement channel, keep discussions organized so nothing gets lost in the noise.",
      icon: MessageSquareIcon,
      badgeColor: "bg-indigo-950 text-indigo-400 border-indigo-800/60",
      highlights: [
        "Instant member discovery by name or email",
        "Multi-member project channels with clean ownership",
        "Duplicate-safe chats: never accidentally create two identical threads",
      ],
    },
    {
      title: "Conversations that stay alive in real time",
      tagline: "Instant Sub-Second Sync",
      description:
        "Messages land the exact millisecond they are sent. Experience seamless live synchronization across all your browser tabs with zero refreshing required.",
      icon: ZapIcon,
      badgeColor: "bg-sky-950 text-sky-400 border-sky-800/60",
      highlights: [
        "Live message streaming with zero delay",
        "Clean delivered timestamps and visual sender badges",
        "No battery drain from continuous background polling",
      ],
    },
    {
      title: "Reading comfort that respects your focus",
      tagline: "Smart Auto-Scroll",
      description:
        "Reviewing an important conversation from yesterday? ChatApp preserves your reading position and never rudely snaps your screen when new messages arrive.",
      icon: SlidersIcon,
      badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800/60",
      highlights: [
        "Preserves scroll position when catching up on history",
        "Helpful floating pill to jump to newest messages",
        "Clean date dividers and readable typography scale",
      ],
    },
    {
      title: "Accountable management without snooping",
      tagline: "Team Trust & Oversight",
      description:
        "Team leaders can manage roles and view workspace activity logs, built with strict guardrails ensuring administrators can never impersonate users or edit history.",
      icon: ShieldIcon,
      badgeColor: "bg-amber-950 text-amber-400 border-amber-800/60",
      highlights: [
        "Industrial-strength encrypted password protection",
        "Read-only conversation oversight without impersonation",
        "Transparent, tamper-evident team activity audit trails",
      ],
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-900/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
            <UsersIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Built for Modern Team Productivity</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Everything your team needs to stay in sync.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Designed to remove friction, protect your mental focus, and deliver
            the smoothest conversation experience for high-performing teams.
          </p>
        </div>

        {/* 2x2 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-slate-950/70 border border-slate-800/90 shadow-xl flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-sky-400" />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${feat.badgeColor}`}
                    >
                      {feat.tagline}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mt-2">
                      {feat.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  {feat.highlights.map((item, hIdx) => (
                    <div
                      key={hIdx}
                      className="flex items-center gap-2.5 text-xs text-slate-300"
                    >
                      <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
