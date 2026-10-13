"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  ChevronRightIcon,
} from "../ui/icons";

interface PersonaCard {
  role: "admin" | "user";
  title: string;
  email: string;
  pass: string;
  description: string;
  avatarBg: string;
  accentColor: string;
}

const personas: PersonaCard[] = [
  {
    role: "admin",
    title: "Team Administrator",
    email: "admin1@example.com",
    pass: "admin1@example.com",
    description:
      "Manage member roles, view the tamper-evident activity audit log, and inspect conversations in read-only mode.",
    avatarBg: "bg-amber-500",
    accentColor: "text-amber-400",
  },
  {
    role: "user",
    title: "Collaborator 1",
    email: "user1@example.com",
    pass: "user1@example.com",
    description:
      "Direct message teammates, join project channels, and experience instant real-time message sync.",
    avatarBg: "bg-indigo-600",
    accentColor: "text-indigo-400",
  },
  {
    role: "user",
    title: "Collaborator 2",
    email: "user2@example.com",
    pass: "user2@example.com",
    description:
      "Open in a second browser tab to experience live two-way messaging between two accounts simultaneously.",
    avatarBg: "bg-sky-500",
    accentColor: "text-sky-400",
  },
];

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingDemoAccounts() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section id="demo-accounts" className="py-24 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_CUBIC }}
          className="mb-12"
        >
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">
            No signup required
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-snug max-w-lg">
            Jump in with ready-made accounts.
          </h2>
          <p className="mt-4 text-slate-400 text-base max-w-lg leading-relaxed">
            Pre-seeded personas let you explore every feature instantly — from
            member chat to admin oversight.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05, ease: EASE_CUBIC }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
        >
          {personas.map((persona, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-xl bg-[#0f1117] flex flex-col gap-5 border ${
                persona.role === "admin"
                  ? "border-amber-500/25"
                  : "border-white/[0.07]"
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className={`size-9 rounded-lg ${persona.avatarBg} flex items-center justify-center text-white shrink-0`}
                >
                  {persona.role === "admin" ? (
                    <ShieldIcon className="w-4 h-4" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {persona.title}
                  </p>
                  <p
                    className={`text-xs font-medium capitalize ${persona.accentColor}`}
                  >
                    {persona.role}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed flex-1">
                {persona.description}
              </p>

              {/* Credentials */}
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                {[
                  { label: "email", value: persona.email, key: `email-${idx}` },
                  { label: "pass", value: persona.pass, key: `pass-${idx}` },
                ].map(({ label, value, key }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-600 shrink-0">{label}</span>
                      <span className="text-slate-300 truncate">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(key, value)}
                      className="ml-2 p-1 text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                      title={`Copy ${label}`}
                      aria-label={`Copy ${label}`}
                    >
                      {copiedKey === key ? (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <CopyIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/login"
                className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                  persona.role === "admin"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-white/[0.06] hover:bg-white/[0.1] text-slate-200"
                }`}
              >
                <span>Sign in as {persona.title.split(" ")[0]}</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE_CUBIC }}
          className="rounded-xl bg-[#0f1117] border border-white/[0.07] p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <p className="text-sm font-semibold text-white">
              See live messaging in 30 seconds
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                color: "text-sky-400",
                title: "Two windows",
                body: "Log into Window A as Collaborator 1, Window B as Collaborator 2.",
              },
              {
                step: "02",
                color: "text-indigo-400",
                title: "Send a message",
                body: "Type anything in either window. Watch it appear in the other instantly.",
              },
              {
                step: "03",
                color: "text-amber-400",
                title: "Explore admin",
                body: "Log in as Administrator to see role management and the audit log.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span
                  className={`text-xl font-bold font-mono ${item.color} shrink-0 leading-none mt-0.5`}
                >
                  {item.step}
                </span>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
