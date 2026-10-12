"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquareIcon,
  UsersIcon,
  SendIcon,
  ChevronRightIcon,
  HashIcon,
  CheckCircleIcon,
} from "../ui/icons";

interface HeroChannel {
  id: string;
  name: string;
  isGroup: boolean;
  unread?: number;
  lastMessage: string;
  sender: string;
  time: string;
}

export function LandingHero() {
  const [activeChannelId, setActiveChannelId] = useState("ch-1");

  const channels: HeroChannel[] = [
    {
      id: "ch-1",
      name: "launch-sprint",
      isGroup: true,
      unread: 2,
      lastMessage:
        "Design assets and final build verified. We are ready to launch! 🚀",
      sender: "Alex Chen",
      time: "Just now",
    },
    {
      id: "ch-2",
      name: "Elena Rostova",
      isGroup: false,
      lastMessage: "The new message stream feels incredibly fast and smooth.",
      sender: "Elena Rostova",
      time: "2m ago",
    },
    {
      id: "ch-3",
      name: "design-critique",
      isGroup: true,
      lastMessage: "Loving the clean dark theme. Zero distraction.",
      sender: "David Kim",
      time: "14m ago",
    },
  ];

  const currentChannel =
    channels.find((c) => c.id === activeChannelId) || channels[0];

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
      {/* Luminous atmospheric gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-indigo-500/15 via-sky-500/15 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Structural subtle dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6 mb-16">
          {/* Subtle announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner text-slate-300 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fast, clean team communication</span>
            <span className="text-slate-600">•</span>
            <span className="text-sky-300 font-semibold">Zero distraction</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]"
          >
            Team messaging built for speed, clarity, and{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-indigo-500">
              effortless flow.
            </span>
          </motion.h1>

          {/* User-focused value proposition */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal"
          >
            Glide above the daily noise. ChatApp brings your team together with
            instant direct chats, dedicated group channels, and unshakeable
            privacy—so you can stay in flow without the clutter.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Link
              href="/chat"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 hover:opacity-95 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 group transition-all"
            >
              <span>Start Chatting Free</span>
              <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#experience"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquareIcon className="w-4 h-4 text-sky-400" />
              <span>Try Interactive Sandbox</span>
            </a>
          </motion.div>

          {/* Real-user value bullets */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium"
          >
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>Instant real-time message delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>Direct chats & organized team channels</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span>Encrypted accounts & session security</span>
            </div>
          </motion.div>
        </div>

        {/* Product Representation: Living Mock Chat UI */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-5xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl"
        >
          {/* Top Window Bar */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-medium text-slate-400 hidden sm:inline">
                ChatApp Workspace — Team Space
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected in real time</span>
            </div>
          </div>

          {/* Interactive Workspace Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Sidebar Preview (4 cols) */}
            <div className="md:col-span-4 p-4 bg-slate-950/60 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2 uppercase tracking-wider">
                  <span>Conversations</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                    Active
                  </span>
                </div>

                <div className="space-y-1">
                  {channels.map((channel) => {
                    const isSelected = channel.id === activeChannelId;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-slate-800/90 text-white border border-slate-700/80 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              channel.isGroup
                                ? "bg-indigo-950 text-indigo-400 border border-indigo-800/60"
                                : "bg-sky-950 text-sky-400 border border-sky-800/60"
                            }`}
                          >
                            {channel.isGroup ? (
                              <HashIcon className="w-4 h-4" />
                            ) : (
                              <UsersIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-slate-200">
                              {channel.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {channel.lastMessage}
                            </p>
                          </div>
                        </div>
                        {channel.unread && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {channel.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 px-2 flex items-center justify-between">
                <span>Click a space to switch</span>
                <span className="text-sky-400 font-medium">Live UI</span>
              </div>
            </div>

            {/* Main Chat Stream Preview (8 cols) */}
            <div className="md:col-span-8 p-6 flex flex-col justify-between bg-slate-900/40">
              {/* Channel Header */}
              <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    {currentChannel.isGroup ? (
                      <HashIcon className="w-5 h-5" />
                    ) : (
                      <UsersIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      {currentChannel.name}
                      <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                        Live stream
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      {currentChannel.isGroup
                        ? "4 members collaborating"
                        : "Direct private conversation"}
                    </p>
                  </div>
                </div>

                <Link
                  href="/chat"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Join Room
                </Link>
              </div>

              {/* Message Stream */}
              <div className="py-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    AC
                  </div>
                  <div className="space-y-1 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Alex Chen
                      </span>
                      <span className="text-[10px] text-slate-500">
                        10:41 AM
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-100 text-xs leading-relaxed border border-slate-700/60 rounded-tl-sm">
                      {currentChannel.lastMessage}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    You
                  </div>
                  <div className="space-y-1 max-w-[80%] items-end flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        Just now
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        You
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs leading-relaxed shadow-md shadow-indigo-600/20 rounded-tr-sm">
                      Confirmed. The experience is instant and distraction-free!
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Input Composer */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder={`Message #${currentChannel.name}...`}
                    className="flex-1 px-3 py-1.5 bg-transparent text-xs text-slate-300 placeholder-slate-500 focus:outline-none"
                  />
                  <Link
                    href="/chat"
                    className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    title="Send a real message in ChatApp"
                  >
                    <SendIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
