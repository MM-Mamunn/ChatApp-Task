"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquareIcon,
  ZapIcon,
  ShieldIcon,
  SlidersIcon,
} from "../ui/icons";

const features = [
  {
    icon: ZapIcon,
    title: "Real-time, every time",
    body: "Messages delivered via Supabase Realtime WebSocket push — no polling, no delay. Works across tabs and devices simultaneously.",
  },
  {
    icon: MessageSquareIcon,
    title: "Direct & group chats",
    body: "1-on-1 direct messages and named group channels with cursor-paginated history. Duplicate-safe conversation creation.",
  },
  {
    icon: SlidersIcon,
    title: "Smart scroll behavior",
    body: "Reading yesterday's messages? Your position is preserved. Catch up without the screen snapping away from you.",
  },
  {
    icon: ShieldIcon,
    title: "Trust by design",
    body: "bcrypt passwords, short-lived JWT access tokens, HTTP-only refresh cookies. Admin oversight with tamper-evident audit logs.",
  },
];

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_CUBIC }}
          className="mb-12"
        >
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            What&apos;s built in
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-snug">
            Everything a team needs. Nothing it doesn&apos;t.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05, ease: EASE_CUBIC }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.06]"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-[#09090b] p-7 flex flex-col gap-3 hover:bg-[#0f1117] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-indigo-600/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {feat.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feat.body}
                </p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
