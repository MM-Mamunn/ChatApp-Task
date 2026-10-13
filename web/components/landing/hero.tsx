"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { UsersIcon, SendIcon, HashIcon } from "../ui/icons";

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_CUBIC, delay },
  }),
};

interface HeroChannel {
  id: string;
  name: string;
  isGroup: boolean;
  unread?: number;
  lastMessage: string;
  time: string;
}

const channels: HeroChannel[] = [
  {
    id: "ch-1",
    name: "launch-sprint",
    isGroup: true,
    unread: 2,
    lastMessage: "All systems verified. Ready to ship! 🚀",
    time: "now",
  },
  {
    id: "ch-2",
    name: "Elena Rostova",
    isGroup: false,
    lastMessage: "The message stream feels incredibly fast.",
    time: "2m",
  },
  {
    id: "ch-3",
    name: "design-review",
    isGroup: true,
    lastMessage: "Love the clean dark theme. Zero noise.",
    time: "14m",
  },
];

const mockMessages: Record<
  string,
  { sender: string; text: string; isMe: boolean }[]
> = {
  "ch-1": [
    {
      sender: "Alex Chen",
      text: "All systems verified. Ready to ship! 🚀",
      isMe: false,
    },
    { sender: "You", text: "Confirmed — experience is instant!", isMe: true },
  ],
  "ch-2": [
    {
      sender: "Elena Rostova",
      text: "The message stream feels incredibly fast.",
      isMe: false,
    },
    { sender: "You", text: "Real-time delivery. Zero polling.", isMe: true },
  ],
  "ch-3": [
    {
      sender: "David Kim",
      text: "Love the clean dark theme. Zero noise.",
      isMe: false,
    },
    { sender: "You", text: "Agreed — distraction-free by design.", isMe: true },
  ],
};

export function LandingHero() {
  const [activeChannelId, setActiveChannelId] = useState("ch-1");
  const currentChannel =
    channels.find((c) => c.id === activeChannelId) || channels[0];
  const messages = mockMessages[activeChannelId];

  return (
    <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div className="flex flex-col gap-7">
            {/* Status pill */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 self-start"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live · WebSocket-powered messaging
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.08}
              className="text-[2.5rem] sm:text-[3.4rem] lg:text-[3.2rem] xl:text-[3.8rem] font-bold tracking-[-0.03em] leading-[1.07] text-white"
            >
              Team chat that{" "}
              <span className="text-indigo-400">moves at the speed</span> of
              thought.
            </motion.h1>

            {/* Subline */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.16}
              className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-md"
            >
              Direct messages and group channels with sub-second delivery. No
              polling. No spinners. Just conversation.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.24}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/chat"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30"
              >
                Start chatting free
              </Link>
              <a
                href="#demo-accounts"
                className="px-5 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium transition-all"
              >
                Try demo accounts
              </a>
            </motion.div>

            {/* Trust micro-copy */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.3}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500"
            >
              <span>Direct &amp; group chats</span>
              <span className="size-1 rounded-full bg-slate-700 inline-block" />
              <span>Bcrypt-encrypted sessions</span>
              <span className="size-1 rounded-full bg-slate-700 inline-block" />
              <span>Realtime push delivery</span>
            </motion.div>
          </div>

          {/* Right: live mock UI */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.65,
              delay: 0.2,
              ease: EASE_CUBIC,
            }}
            className="relative"
          >
            {/* Ambient glow behind the mock — uses CSS animation */}
            <div className="absolute -inset-6 bg-indigo-500/[0.08] rounded-3xl blur-3xl pointer-events-none animate-glow-drift" />

            <div className="relative rounded-xl bg-[#0f1117] border border-white/[0.08] shadow-2xl overflow-hidden">
              {/* Title bar */}
              <div className="px-4 py-3 bg-black/30 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-rose-500/70" />
                  <div className="size-2.5 rounded-full bg-amber-500/70" />
                  <div className="size-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[11px] text-slate-500 font-medium">
                    ChatApp — Team Space
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>Live</span>
                </div>
              </div>

              {/* Chat body — sidebar hidden on mobile, shown on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[320px] md:min-h-[340px] md:divide-x md:divide-white/[0.06]">
                {/* Sidebar — hidden on small screens */}
                <div className="hidden md:flex md:col-span-4 flex-col p-3 gap-1 bg-black/20">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1 mt-1">
                    Conversations
                  </p>
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setActiveChannelId(ch.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                        ch.id === activeChannelId
                          ? "bg-indigo-600/20 text-white"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="size-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
                        {ch.isGroup ? (
                          <HashIcon className="w-3 h-3" />
                        ) : (
                          <UsersIcon className="w-3 h-3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate">
                          {ch.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {ch.time}
                        </p>
                      </div>
                      {ch.unread && (
                        <span className="size-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {ch.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Mobile channel tabs — shown only on small screens */}
                <div className="flex md:hidden items-center gap-1 px-3 pt-3 pb-1 overflow-x-auto">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setActiveChannelId(ch.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        ch.id === activeChannelId
                          ? "bg-indigo-600/20 text-white"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {ch.isGroup ? (
                        <HashIcon className="w-3 h-3" />
                      ) : (
                        <UsersIcon className="w-3 h-3" />
                      )}
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </div>

                {/* Message pane */}
                <div className="md:col-span-8 flex flex-col justify-between p-4">
                  {/* Header */}
                  <div className="pb-3 border-b border-white/[0.06] flex items-center gap-2">
                    <div className="size-7 rounded-md bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                      {currentChannel.isGroup ? (
                        <HashIcon className="w-3.5 h-3.5" />
                      ) : (
                        <UsersIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {currentChannel.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {currentChannel.isGroup
                          ? "Group channel"
                          : "Direct message"}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 py-4 flex flex-col gap-3">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`size-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${
                            msg.isMe ? "bg-indigo-600" : "bg-slate-600"
                          }`}
                        >
                          {msg.sender.slice(0, 2)}
                        </div>
                        <div
                          className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[80%] ${
                            msg.isMe
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-white/[0.06] text-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Composer */}
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <input
                      type="text"
                      disabled
                      placeholder={`Message ${currentChannel.isGroup ? "#" : ""}${currentChannel.name}…`}
                      className="flex-1 bg-transparent text-[11px] text-slate-400 placeholder-slate-600 focus:outline-none"
                    />
                    <Link
                      href="/chat"
                      className="size-6 rounded-md bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition-colors"
                      title="Open real chat"
                    >
                      <SendIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
