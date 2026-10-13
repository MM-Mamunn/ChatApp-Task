"use client";

import React from "react";
import Link from "next/link";
import { MessageSquareIcon } from "../ui/icons";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-12 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div className="sm:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <MessageSquareIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-white">ChatApp</span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-xs">
              Sub-second team messaging with WebSocket real-time delivery,
              direct chats, group channels, and admin oversight.
            </p>
          </div>

          {/* App links */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Application
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { href: "/chat", label: "Chat workspace" },
                { href: "/login", label: "Sign in" },
                { href: "/admin", label: "Admin console" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Page sections */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              On this page
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { href: "#experience", label: "Interactive sandbox" },
                { href: "#features", label: "Features" },
                { href: "#demo-accounts", label: "Demo accounts" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-600">
          <span>© 2026 ChatApp · Built for effortless team communication.</span>
          <span>Real-time · Encrypted · Distraction-free</span>
        </div>
      </div>
    </footer>
  );
}
