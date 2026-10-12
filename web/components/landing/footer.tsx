"use client";

import React from "react";
import Link from "next/link";
import { MessageSquareIcon } from "../ui/icons";

export function LandingFooter() {
  return (
    <footer className="py-16 bg-slate-950 border-t border-slate-900 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <MessageSquareIcon className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                ChatApp
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Sub-second team messaging designed for speed, clarity, and
              effortless collaboration. Glide above daily noise with instant
              channels and direct conversations.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-medium text-slate-400 pt-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                Real-Time Sync
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                Direct &amp; Group Spaces
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                Encrypted Sessions
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                WCAG 2.1 AA Accessible
              </span>
            </div>
          </div>

          {/* Col 2: Product Sections */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Product Tour
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="hover:text-white transition-colors"
                >
                  Features &amp; Superpowers
                </a>
              </li>
              <li>
                <a
                  href="#experience"
                  className="hover:text-white transition-colors"
                >
                  Interactive Sandbox
                </a>
              </li>
              <li>
                <a
                  href="#why-chatapp"
                  className="hover:text-white transition-colors"
                >
                  Why Teams Switch
                </a>
              </li>
              <li>
                <a
                  href="#demo-accounts"
                  className="hover:text-white transition-colors"
                >
                  Ready Demo Personas
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Application Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Live Application
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/chat"
                  className="hover:text-white transition-colors"
                >
                  Open Chat Workspace (/chat)
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition-colors"
                >
                  Member Sign In (/login)
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="hover:text-white transition-colors"
                >
                  Admin Oversight Console (/admin)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            &copy; 2026 ChatApp &bull; Designed for effortless team
            communication.
          </p>
          <p className="font-mono">
            Sub-second delivery &bull; Zero clutter &bull; Built for focus
          </p>
        </div>
      </div>
    </footer>
  );
}
