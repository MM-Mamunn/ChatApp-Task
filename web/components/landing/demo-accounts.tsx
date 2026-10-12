"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  ChevronRightIcon,
  ZapIcon,
} from "../ui/icons";

interface PersonaCard {
  role: "admin" | "user";
  title: string;
  badge: string;
  email: string;
  pass: string;
  whatYouCanDo: string;
  avatarBg: string;
}

export function LandingDemoAccounts() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const personas: PersonaCard[] = [
    {
      role: "admin",
      title: "Team Administrator",
      badge: "Full Admin Oversight",
      email: "admin1@example.com",
      pass: "admin1@example.com",
      whatYouCanDo:
        "Access the management console, oversee member roles, and review the team activity audit log.",
      avatarBg: "bg-amber-500",
    },
    {
      role: "user",
      title: "Collaborator 1",
      badge: "Team Member Space",
      email: "user1@example.com",
      pass: "user1@example.com",
      whatYouCanDo:
        "Direct message colleagues, join project channels, and experience instant sub-second conversation sync.",
      avatarBg: "bg-indigo-600",
    },
    {
      role: "user",
      title: "Collaborator 2",
      badge: "Realtime Partner",
      email: "user2@example.com",
      pass: "user2@example.com",
      whatYouCanDo:
        "Open in an incognito or second browser window to experience real-time two-way messaging live.",
      avatarBg: "bg-sky-500",
    },
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section
      id="demo-accounts"
      className="py-24 bg-slate-900/40 relative border-t border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold">
            <ZapIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Ready-To-Use Demo Personas</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Try it right now with ready demo accounts.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            No signup forms required. Jump right into the real product using
            pre-configured test accounts to experience member chatting and team
            management.
          </p>
        </div>

        {/* 3 Personas Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {personas.map((persona, idx) => (
            <div
              key={idx}
              className={`p-7 rounded-3xl border shadow-xl flex flex-col justify-between space-y-6 ${
                persona.role === "admin"
                  ? "bg-slate-950/90 border-amber-500/40 shadow-amber-500/5"
                  : "bg-slate-950/90 border-slate-800/90 shadow-black/20"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${persona.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-md`}
                    >
                      {persona.role === "admin" ? (
                        <ShieldIcon className="w-5 h-5 text-white" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {persona.title}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {persona.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {persona.whatYouCanDo}
                </p>

                {/* Email / Password with 1-Click Copy */}
                <div className="space-y-2 font-mono text-xs pt-1">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 truncate mr-2">
                      {persona.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`email-${idx}`, persona.email)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy email"
                    >
                      {copiedKey === `email-${idx}` ? (
                        <CheckIcon className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 truncate mr-2">
                      {persona.pass}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`pass-${idx}`, persona.pass)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy password"
                    >
                      {copiedKey === `pass-${idx}` ? (
                        <CheckIcon className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className={`w-full py-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all ${
                  persona.role === "admin"
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                }`}
              >
                <span>Sign in as {persona.title.split(" ")[0]}</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* 30-Second Quick Walkthrough Banner */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">
              How to see live messaging in 30 seconds
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-semibold text-sky-400">
                1. Open Two Windows
              </span>
              <p className="text-[11px] text-slate-400">
                Log into Window A as Collaborator 1, and Window B as
                Collaborator 2.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-semibold text-indigo-400">
                2. Send a Message
              </span>
              <p className="text-[11px] text-slate-400">
                Type in either window. Watch it appear across both windows
                instantaneously.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-semibold text-amber-400">
                3. Explore Admin View
              </span>
              <p className="text-[11px] text-slate-400">
                Log into Admin to review conversation oversight and the
                tamper-evident audit log.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
