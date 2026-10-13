"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquareIcon } from "../ui/icons";

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingCtaBanner() {
  return (
    <section className="py-24 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_CUBIC }}
          className="rounded-2xl bg-indigo-600 px-8 py-14 sm:px-14 sm:py-16 text-center relative overflow-hidden"
        >
          {/* Subtle radial depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_-20%,rgba(255,255,255,0.1),transparent_60%)] pointer-events-none" />

          <div className="relative flex flex-col items-center gap-7 max-w-2xl mx-auto">
            <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquareIcon className="w-6 h-6 text-white" />
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug">
                Ready to try it for yourself?
              </h2>
              <p className="text-indigo-200 text-base leading-relaxed">
                No account setup required. Use a demo persona and be messaging
                in under a minute.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/chat"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-lg shadow-indigo-900/20"
              >
                Start chatting free
              </Link>
              <a
                href="#demo-accounts"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-all"
              >
                Use demo accounts
              </a>
            </div>

            <p className="text-indigo-300 text-xs">
              WebSocket-powered · bcrypt-encrypted · open source
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
