"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  SendIcon,
  HashIcon,
  UsersIcon,
  ZapIcon,
  ShieldIcon,
} from "../ui/icons";

interface DemoMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isMe: boolean;
}

const spaces = [
  { key: "launch", label: "#product-launch", isGroup: true },
  { key: "design", label: "#design-review", isGroup: true },
  { key: "direct", label: "Sarah Connor", isGroup: false },
] as const;

type SpaceKey = (typeof spaces)[number]["key"];

const initialMessages: Record<SpaceKey, DemoMessage[]> = {
  launch: [
    {
      id: "1",
      sender: "Sarah Connor",
      avatar: "SC",
      text: "All deliverables are confirmed and organized here.",
      time: "10:14",
      isMe: false,
    },
    {
      id: "2",
      sender: "David Kim",
      avatar: "DK",
      text: "Speed and layout clarity are impressive. Shipping now.",
      time: "10:16",
      isMe: false,
    },
  ],
  design: [
    {
      id: "3",
      sender: "Elena Rostova",
      avatar: "ER",
      text: "Dark theme tokens attached — please review by EOD.",
      time: "09:45",
      isMe: false,
    },
  ],
  direct: [
    {
      id: "4",
      sender: "Sarah Connor",
      avatar: "SC",
      text: "Quick sync on rollout schedule whenever you're ready.",
      time: "10:02",
      isMe: false,
    },
  ],
};

const samplePrompts: Record<SpaceKey, string[]> = {
  launch: ["Ready to go live! 🚀", "All tests passed.", "Let's ship it."],
  design: [
    "Looks great in dark mode.",
    "Minor spacing tweak needed.",
    "Approved! ✓",
  ],
  direct: [
    "Sounds good, let's sync now.",
    "30 min call works for me.",
    "On my way!",
  ],
};

const whyCards = [
  {
    icon: ZapIcon,
    title: "Sub-second delivery",
    body: "No spinners, no polling — messages land the instant you send them via Supabase Realtime WebSocket push.",
  },
  {
    icon: UsersIcon,
    title: "Direct & group spaces",
    body: "1-on-1 direct messages or named group channels with clean membership and creator controls.",
  },
  {
    icon: ShieldIcon,
    title: "Security built in",
    body: "bcrypt-hashed passwords, short-lived JWTs, and HTTP-only refresh cookies with rotation.",
  },
];

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingExperience() {
  const [activeSpace, setActiveSpace] = useState<SpaceKey>("launch");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] =
    useState<Record<SpaceKey, DemoMessage[]>>(initialMessages);

  const handleSend = (override?: string) => {
    const text = (override ?? inputText).trim();
    if (!text) return;
    setMessages((prev) => ({
      ...prev,
      [activeSpace]: [
        ...(prev[activeSpace] ?? []),
        {
          id: `d-${Date.now()}`,
          sender: "You",
          avatar: "You",
          text,
          time: "now",
          isMe: true,
        },
      ],
    }));
    if (!override) setInputText("");
  };

  const activeSpaceObj = spaces.find((s) => s.key === activeSpace)!;

  return (
    <section
      id="experience"
      className="py-24 border-t border-white/[0.04] relative"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_CUBIC }}
          className="mb-12"
        >
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Interactive Sandbox
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-snug max-w-xl">
            Feel the flow before you sign in.
          </h2>
          <p className="mt-4 text-slate-400 text-base max-w-lg leading-relaxed">
            Send a real message, click a prompt, or switch spaces. This sandbox
            mirrors the actual chat interface exactly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05, ease: EASE_CUBIC }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Sandbox */}
          <div className="lg:col-span-2 rounded-xl bg-[#0f1117] border border-white/[0.08] overflow-hidden shadow-xl">
            {/* Space switcher */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
                {spaces.map((space) => (
                  <button
                    key={space.key}
                    type="button"
                    onClick={() => setActiveSpace(space.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      activeSpace === space.key
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {space.isGroup ? (
                      <HashIcon className="w-3 h-3" />
                    ) : (
                      <UsersIcon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{space.label}</span>
                    <span className="sm:hidden">
                      {space.isGroup
                        ? space.label.slice(0, 7)
                        : space.label.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Sandbox ready</span>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 flex flex-col gap-3 min-h-[260px] max-h-[280px] overflow-y-auto scrollbar-thin">
              {(messages[activeSpace] ?? []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                      msg.isMe ? "bg-indigo-600" : "bg-slate-600"
                    }`}
                  >
                    {msg.avatar.slice(0, 2)}
                  </div>
                  <div
                    className={`flex flex-col gap-0.5 max-w-[78%] ${msg.isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      {!msg.isMe && (
                        <span className="text-slate-300 font-medium">
                          {msg.sender}
                        </span>
                      )}
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        msg.isMe
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-white/[0.06] text-slate-200 rounded-tl-sm border border-white/[0.05]"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt pills + composer */}
            <div className="border-t border-white/[0.06] p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 mr-1">
                  Quick send:
                </span>
                {samplePrompts[activeSpace].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${activeSpaceObj.isGroup ? activeSpaceObj.label : activeSpaceObj.label.split(" ")[0]}…`}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SendIcon className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Why-it-feels-different panel */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Under the hood
            </p>
            {whyCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.07] flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold text-white">
                      {card.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.body}
                  </p>
                </div>
              );
            })}
            <Link
              href="/chat"
              className="mt-auto w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold text-center transition-all"
            >
              Open Full Application
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
