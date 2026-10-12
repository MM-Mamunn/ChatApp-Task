"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquareIcon,
  MenuIcon,
  XIcon,
  ChevronRightIcon,
} from "../ui/icons";

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/25 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl px-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                ChatApp
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-700/60">
                  Realtime
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Effortless Team Messaging
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 bg-slate-900/70 border border-slate-800/80 rounded-full px-4 py-1.5 backdrop-blur-md"
          >
            <a
              href="#features"
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-full transition-colors"
            >
              Features
            </a>
            <a
              href="#experience"
              className="px-3.5 py-1.5 text-xs font-medium text-sky-300 hover:text-white hover:bg-sky-900/40 rounded-full transition-colors flex items-center gap-1.5"
            >
              <span>Interactive Preview</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            </a>
            <a
              href="#why-chatapp"
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-full transition-colors"
            >
              Why ChatApp
            </a>
            <a
              href="#demo-accounts"
              className="px-3.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white hover:bg-amber-900/40 rounded-full transition-colors"
            >
              Try Demo Accounts
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/chat"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 hover:opacity-95 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>Open Chat</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <XIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 mt-3 space-y-3 backdrop-blur-xl">
          <nav className="flex flex-col space-y-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg"
            >
              Features
            </a>
            <a
              href="#experience"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-sky-300 hover:text-white hover:bg-slate-900 rounded-lg flex items-center justify-between"
            >
              <span>Interactive Preview</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                Live
              </span>
            </a>
            <a
              href="#why-chatapp"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg"
            >
              Why ChatApp
            </a>
            <a
              href="#demo-accounts"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-amber-300 hover:text-white hover:bg-slate-900 rounded-lg"
            >
              Try Demo Accounts
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-2.5 text-center text-sm font-medium text-slate-200 bg-slate-900 rounded-xl"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="w-full py-2.5 text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
            >
              Open Chat
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
