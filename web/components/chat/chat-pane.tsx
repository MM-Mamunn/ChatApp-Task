"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  apiClient,
  type DirectMessageItem,
  type GroupMessageItem,
} from "@/lib/api-client";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Avatar } from "../ui/avatar";
import {
  SendIcon,
  ArrowLeftIcon,
  Loader2Icon,
  UsersIcon,
  ChevronDownIcon,
  MessageSquareIcon,
} from "../ui/icons";
import type { ActiveTarget } from "./sidebar";

interface ChatPaneProps {
  activeTarget: ActiveTarget;
  onBackToSidebar?: () => void;
  onMessageSentSuccess?: () => void;
}

type UnifiedMessage = {
  id: string;
  sender_email: string;
  message: string;
  created_at: string;
  isSelf: boolean;
};

function formatMessageTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const now = new Date();

  if (d.toDateString() === now.toDateString()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function ChatPane({
  activeTarget,
  onBackToSidebar,
  onMessageSentSuccess,
}: ChatPaneProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  // Load error
  const [loadError, setLoadError] = useState<string | null>(null);

  // Composer
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Scroll state & safe auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const isInitialLoadRef = useRef(true);

  // Load messages whenever active target changes
  const loadMessages = useCallback(async () => {
    if (!activeTarget || !currentUser) return;

    setIsLoading(true);
    setSendError(null);
    setLoadError(null);
    isInitialLoadRef.current = true;

    try {
      if (activeTarget.type === "direct") {
        const res = await apiClient.getDirectMessages(
          activeTarget.recipientEmail,
          { limit: 25 },
        );
        if (res.success && res.data) {
          // getDirectMessages returns newest first; reverse for chronological display (oldest to newest)
          const chron = [...res.data].reverse().map((m: DirectMessageItem) => ({
            id: m.id,
            sender_email: m.sender_email,
            message: m.message,
            created_at: m.created_at,
            isSelf:
              m.sender_email.toLowerCase() === currentUser.email.toLowerCase(),
          }));
          setMessages(chron);
          setHasMore(!!res.pagination?.has_more);
          setNextCursor(res.pagination?.next_cursor || null);
        } else {
          setLoadError(res.error?.message || "Failed to load messages");
        }
      } else {
        const gId = activeTarget.groupId;
        if (!gId || gId === "undefined") {
          setLoadError("Invalid group channel ID");
          setIsLoading(false);
          return;
        }

        const res = await apiClient.getGroupMessages(gId, {
          limit: 25,
        });
        if (res.success && res.data) {
          const chron = [...res.data]
            .reverse()
            .map((m: GroupMessageItem, idx) => ({
              id: `${m.group_id}-${m.created_at}-${idx}`,
              sender_email: m.sender_email,
              message: m.message,
              created_at: m.created_at,
              isSelf:
                m.sender_email.toLowerCase() ===
                currentUser.email.toLowerCase(),
            }));
          setMessages(chron);
          setHasMore(!!res.pagination?.has_more);
          setNextCursor(res.pagination?.next_cursor || null);
        } else {
          setLoadError(res.error?.message || "Failed to load group messages");
        }
      }
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load messages",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTarget, currentUser]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        loadMessages();
      }
    });
    return () => {
      active = false;
    };
  }, [loadMessages]);

  // Supabase Realtime subscription for live incoming messages
  useEffect(() => {
    if (!activeTarget || !currentUser) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (activeTarget.type === "direct") {
      const currentEmail = currentUser.email.toLowerCase();
      const otherEmail = activeTarget.recipientEmail.toLowerCase();
      const channelId = `chat-direct-${[currentEmail, otherEmail].sort().join("--")}`;

      const channel = supabase.channel(channelId);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            sender_email: string;
            receiver_email: string;
            message: string;
            created_at: string;
          };

          if (!row || !row.id) return;

          const sender = row.sender_email.toLowerCase();
          const receiver = row.receiver_email.toLowerCase();

          // Ensure message belongs to this active pair
          const belongsToPair =
            (sender === otherEmail && receiver === currentEmail) ||
            (sender === currentEmail && receiver === otherEmail);

          if (!belongsToPair) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) {
              return prev;
            }
            const newMsg: UnifiedMessage = {
              id: row.id,
              sender_email: row.sender_email,
              message: row.message,
              created_at: row.created_at,
              isSelf: sender === currentEmail,
            };
            return [...prev, newMsg];
          });

          onMessageSentSuccess?.();
        },
      );

      channel.subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }

    if (activeTarget.type === "group") {
      const gId = activeTarget.groupId;
      if (!gId || gId === "undefined") return;

      const channelId = `chat-group-${gId}`;
      const channel = supabase.channel(channelId);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
          filter: `group_id=eq.${gId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            group_id: string;
            sender_email: string;
            message: string;
            created_at: string;
          };

          if (!row || row.group_id !== gId) return;

          const currentEmail = currentUser.email.toLowerCase();
          const sender = row.sender_email.toLowerCase();
          const messageId =
            row.id || `${row.group_id}-${row.created_at}-${row.sender_email}`;

          setMessages((prev) => {
            if (
              prev.some(
                (m) =>
                  m.id === messageId ||
                  (m.created_at === row.created_at &&
                    m.sender_email.toLowerCase() === sender &&
                    m.message === row.message),
              )
            ) {
              return prev;
            }
            const newMsg: UnifiedMessage = {
              id: messageId,
              sender_email: row.sender_email,
              message: row.message,
              created_at: row.created_at,
              isSelf: sender === currentEmail,
            };
            return [...prev, newMsg];
          });

          onMessageSentSuccess?.();
        },
      );

      channel.subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }
  }, [activeTarget, currentUser, onMessageSentSuccess]);

  // Safe auto-scroll: detect if user scrolled up
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsUserScrolledUp(distanceFromBottom > 120);
  };

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Scroll to bottom on initial load or when sending message
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoadRef.current) {
        scrollToBottom(false);
        isInitialLoadRef.current = false;
      } else if (!isUserScrolledUp) {
        scrollToBottom(true);
      }
    }
  }, [messages, isUserScrolledUp, scrollToBottom]);

  // Load earlier messages with scroll position preservation
  const loadEarlierMessages = async () => {
    if (!activeTarget || !currentUser || !nextCursor || isLoadingEarlier)
      return;

    setIsLoadingEarlier(true);
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    try {
      if (activeTarget.type === "direct") {
        const res = await apiClient.getDirectMessages(
          activeTarget.recipientEmail,
          { limit: 25, before: nextCursor },
        );
        if (res.success && res.data) {
          const older = [...res.data].reverse().map((m: DirectMessageItem) => ({
            id: m.id,
            sender_email: m.sender_email,
            message: m.message,
            created_at: m.created_at,
            isSelf:
              m.sender_email.toLowerCase() === currentUser.email.toLowerCase(),
          }));
          setMessages((prev) => [...older, ...prev]);
          setHasMore(!!res.pagination?.has_more);
          setNextCursor(res.pagination?.next_cursor || null);

          // Restore scroll position after DOM update
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop =
                previousScrollTop + (newScrollHeight - previousScrollHeight);
            }
          });
        }
      } else {
        const res = await apiClient.getGroupMessages(activeTarget.groupId, {
          limit: 25,
          before: nextCursor,
        });
        if (res.success && res.data) {
          const older = [...res.data]
            .reverse()
            .map((m: GroupMessageItem, idx) => ({
              id: `${m.group_id}-${m.created_at}-${idx}`,
              sender_email: m.sender_email,
              message: m.message,
              created_at: m.created_at,
              isSelf:
                m.sender_email.toLowerCase() ===
                currentUser.email.toLowerCase(),
            }));
          setMessages((prev) => [...older, ...prev]);
          setHasMore(!!res.pagination?.has_more);
          setNextCursor(res.pagination?.next_cursor || null);

          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop =
                previousScrollTop + (newScrollHeight - previousScrollHeight);
            }
          });
        }
      }
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTarget || !currentUser) return;

    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      if (activeTarget.type === "direct") {
        const res = await apiClient.sendDirectMessage(
          activeTarget.recipientEmail,
          trimmed,
        );
        if (res.success && res.data) {
          const newMsg: UnifiedMessage = {
            id: res.data.id,
            sender_email: res.data.sender_email,
            message: res.data.message,
            created_at: res.data.created_at,
            isSelf: true,
          };
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          );
          setInputText("");
          scrollToBottom(true);
          onMessageSentSuccess?.();
        } else {
          setSendError(res.error?.message || "Failed to send message");
        }
      } else {
        const res = await apiClient.sendGroupMessage(
          activeTarget.groupId,
          trimmed,
        );
        if (res.success && res.data) {
          const msgId =
            res.data.id || `${res.data.group_id}-${res.data.created_at}`;
          const newMsg: UnifiedMessage = {
            id: msgId,
            sender_email: res.data.sender_email,
            message: res.data.message,
            created_at: res.data.created_at,
            isSelf: true,
          };
          setMessages((prev) =>
            prev.some(
              (m) =>
                m.id === msgId ||
                (m.created_at === newMsg.created_at &&
                  m.message === newMsg.message),
            )
              ? prev
              : [...prev, newMsg],
          );
          setInputText("");
          scrollToBottom(true);
          onMessageSentSuccess?.();
        } else {
          setSendError(res.error?.message || "Failed to send group message");
        }
      }
    } catch (err: unknown) {
      setSendError(
        err instanceof Error ? err.message : "Error sending message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!activeTarget) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
          <MessageSquareIcon className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Select a Conversation
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Choose a conversation from the sidebar or start a new chat to begin
          messaging with end-to-end authenticated security.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 min-w-0">
      {/* Chat Pane Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              aria-label="Back to conversations list"
              className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}

          {activeTarget.type === "direct" ? (
            <>
              <Avatar
                name={activeTarget.recipientName}
                email={activeTarget.recipientEmail}
                avatarUrl={activeTarget.avatarUrl}
                size="md"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {activeTarget.recipientName}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {activeTarget.recipientEmail}
                </p>
              </div>
            </>
          ) : (
            <>
              <Avatar name={activeTarget.groupName} isGroup size="md" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {activeTarget.groupName}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <UsersIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{activeTarget.memberCount} members</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Message Thread Scroll Container */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-label="Conversation message history"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
      >
        {/* Load earlier messages trigger */}
        {hasMore && (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={loadEarlierMessages}
              disabled={isLoadingEarlier}
              className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLoadingEarlier && <Loader2Icon className="w-3 h-3" />}
              <span>Load earlier messages</span>
            </button>
          </div>
        )}

        {/* Loading messages state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2Icon className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-3">
              <MessageSquareIcon className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Unable to load messages
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 max-w-sm px-4">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 mb-3">
              <MessageSquareIcon className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Send the first message to start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSelf = msg.isSelf;
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg ||
              new Date(prevMsg.created_at).toDateString() !==
                new Date(msg.created_at).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
                      {formatDateDivider(msg.created_at)}
                    </span>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`flex gap-2.5 ${isSelf ? "justify-end" : "justify-start"}`}
                >
                  {!isSelf && (
                    <Avatar
                      email={msg.sender_email}
                      name={msg.sender_email.split("@")[0]}
                      size="sm"
                      className="mt-1 shrink-0"
                    />
                  )}

                  <div
                    className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    {!isSelf && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 px-1">
                        {msg.sender_email}
                      </span>
                    )}

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-xs ${
                        isSelf
                          ? "bg-indigo-600 text-white rounded-br-xs"
                          : "bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    <span
                      className={`text-[10px] mt-1 px-1 ${
                        isSelf ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {isUserScrolledUp && (
        <div className="absolute bottom-24 right-6 z-20">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <ChevronDownIcon className="w-3.5 h-3.5" />
            <span>Latest messages</span>
          </button>
        </div>
      )}

      {/* Send Error Notice */}
      {sendError && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>{sendError}</span>
          <button
            type="button"
            onClick={() => setSendError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Composer Input Area */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="relative flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message... (Press Enter to send, Shift+Enter for newline)"
              aria-label="Write a message"
              rows={1}
              maxLength={4000}
              className="w-full resize-none px-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all max-h-32 min-h-[44px]"
            />
            {inputText.length > 3000 && (
              <span className="absolute right-3 bottom-2 text-[10px] text-slate-400">
                {inputText.length}/4000
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2Icon className="w-4 h-4" />
            ) : (
              <SendIcon className="w-4 h-4 -mr-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
