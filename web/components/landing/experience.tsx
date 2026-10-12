"use client";

import React, { useState } from "react";
import Link from "next/link";
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

export function LandingExperience() {
  const [activeSpace, setActiveSpace] = useState<
    "launch" | "design" | "direct"
  >("launch");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Record<string, DemoMessage[]>>({
    launch: [
      {
        id: "1",
        sender: "Sarah Connor",
        avatar: "SC",
        text: "Morning team! All deliverables for the launch are organized in this channel.",
        time: "10:14 AM",
        isMe: false,
      },
      {
        id: "2",
        sender: "David Kim",
        avatar: "DK",
        text: "Just reviewed the new screens. The speed and layout clarity are unreal.",
        time: "10:16 AM",
        isMe: false,
      },
    ],
    design: [
      {
        id: "3",
        sender: "Elena Rostova",
        avatar: "ER",
        text: "Sharing the dark theme palette tokens here for feedback.",
        time: "09:45 AM",
        isMe: false,
      },
    ],
    direct: [
      {
        id: "4",
        sender: "Sarah Connor",
        avatar: "SC",
        text: "Hey! Let's do a quick sync on the rollout schedule whenever you're ready.",
        time: "10:02 AM",
        isMe: false,
      },
    ],
  });

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setMessages((prev) => {
      const currentList = prev[activeSpace] || [];
      const newMsg: DemoMessage = {
        id: `demo-${activeSpace}-${currentList.length + 1}`,
        sender: "You",
        avatar: "You",
        text,
        time: "Just now",
        isMe: true,
      };
      return {
        ...prev,
        [activeSpace]: [...currentList, newMsg],
      };
    });

    if (!textToSend) {
      setInputText("");
    }
  };

  const samplePrompts = [
    "Looks great! Ready to roll this out.",
    "The real-time synchronization is instant.",
    "Let's sync on the roadmap today 🎯",
  ];

  return (
    <section
      id="experience"
      className="py-24 bg-slate-950/80 relative border-t border-slate-850"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300 text-xs font-semibold">
            <ZapIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive Experience Sandbox</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Feel the flow before you even sign in.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            See how natural team communication feels when every interaction
            responds instantly. Send a message, test prompt pills, or switch
            spaces below.
          </p>
        </div>

        {/* Interactive Sandbox Container */}
        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Channel Selector Bar */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                Choose a space:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSpace("launch")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSpace === "launch"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <HashIcon className="w-3.5 h-3.5" />
                  <span>#product-launch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpace("design")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSpace === "design"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <HashIcon className="w-3.5 h-3.5" />
                  <span>#design-review</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpace("direct")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeSpace === "direct"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>Sarah Connor (Direct)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Sandbox Ready</span>
            </div>
          </div>

          {/* Sandbox Main Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left: Interactive Conversation Stream (8 cols) */}
            <div className="lg:col-span-8 p-6 flex flex-col justify-between space-y-6">
              {/* Message History */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {messages[activeSpace]?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.isMe ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        msg.isMe
                          ? "bg-gradient-to-tr from-indigo-500 to-sky-500"
                          : "bg-slate-700"
                      }`}
                    >
                      {msg.avatar}
                    </div>
                    <div
                      className={`space-y-1 max-w-[80%] flex flex-col ${
                        msg.isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {msg.sender}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.isMe
                            ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20"
                            : "bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Interactive Composer & Quick Prompts */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                {/* Clickable prompt pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Try clicking:
                  </span>
                  {samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>

                {/* Text input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your own test message and press Enter..."
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <SendIcon className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Feature Highlights (4 cols) */}
            <div className="lg:col-span-4 p-6 bg-slate-950/50 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Why It Feels Different
                </h3>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <ZapIcon className="w-4 h-4 text-sky-400" />
                      <span>Sub-Second Delivery</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      No spinning spinners or manual reloading. Teammates
                      receive messages the instant you send them.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <UsersIcon className="w-4 h-4 text-indigo-400" />
                      <span>Tidy Channels & DMs</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Keep conversations separated by topic, or direct-message
                      anyone on your team with 1 click.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <ShieldIcon className="w-4 h-4 text-amber-400" />
                      <span>Peace of Mind</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Your identity and passwords are encrypted with
                      industrial-strength security algorithms.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/chat"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:opacity-95 text-white text-xs font-semibold text-center block shadow-md shadow-indigo-500/20"
              >
                Launch Full Application
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
