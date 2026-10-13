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
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "../ui/empty";
import {
  SendIcon,
  ArrowLeftIcon,
  Loader2Icon,
  UsersIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  XIcon,
} from "../ui/icons";
import type { ActiveTarget } from "./sidebar";
import { GroupMembersModal } from "./group-members-modal";
import { ThemeToggle } from "../ui/theme-toggle";

interface ChatPaneProps {
  activeTarget: ActiveTarget;
  userProfiles?: Record<
    string,
    { name?: string | null; avatarUrl?: string | null }
  >;
  onBackToSidebar?: () => void;
  onMessageSentSuccess?: () => void;
  onGroupUpdated?: (groupId: string, newMemberCount: number) => void;
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
  userProfiles,
  onBackToSidebar,
  onMessageSentSuccess,
  onGroupUpdated,
}: ChatPaneProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  // Group members profile map (email -> { name, avatarUrl })
  const [groupMembersMap, setGroupMembersMap] = useState<
    Record<string, { name?: string | null; avatarUrl?: string | null }>
  >({});

  // Group members modal state
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);

  // Load group members for member avatar and name resolution in group channels
  useEffect(() => {
    if (activeTarget?.type !== "group" || !activeTarget.groupId) {
      return;
    }

    let isMounted = true;
    apiClient
      .getGroupMembers(activeTarget.groupId)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          const map: Record<
            string,
            { name?: string | null; avatarUrl?: string | null }
          > = {};
          res.data.forEach((m) => {
            if (m.email) {
              map[m.email.toLowerCase()] = {
                name: m.name,
                avatarUrl: m.avatar_url,
              };
            }
          });
          setGroupMembersMap(map);
        }
      })
      .catch(() => {
        // Fall back gracefully to initials on failure
      });

    return () => {
      isMounted = false;
    };
  }, [activeTarget]);

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

  const getSenderProfile = useCallback(
    (senderEmail: string) => {
      const lower = senderEmail.toLowerCase();
      if (
        activeTarget?.type === "direct" &&
        lower === activeTarget.recipientEmail.toLowerCase()
      ) {
        return {
          name: activeTarget.recipientName || senderEmail.split("@")[0],
          avatarUrl: activeTarget.avatarUrl || null,
        };
      }

      if (groupMembersMap[lower]) {
        return {
          name: groupMembersMap[lower].name || senderEmail.split("@")[0],
          avatarUrl: groupMembersMap[lower].avatarUrl || null,
        };
      }

      if (userProfiles?.[lower]) {
        return {
          name: userProfiles[lower].name || senderEmail.split("@")[0],
          avatarUrl: userProfiles[lower].avatarUrl || null,
        };
      }

      if (currentUser && lower === currentUser.email.toLowerCase()) {
        return {
          name: currentUser.name || senderEmail.split("@")[0],
          avatarUrl: currentUser.avatar_url || null,
        };
      }

      return {
        name: senderEmail.split("@")[0],
        avatarUrl: null,
      };
    },
    [activeTarget, groupMembersMap, userProfiles, currentUser],
  );

  // Empty state when no conversation is active
  if (!activeTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-background h-full min-h-0 w-full min-w-0 overflow-y-auto">
        <Empty className="max-w-md w-full border-none">
          <EmptyIcon className="bg-primary/10 text-primary size-16 rounded-2xl">
            <MessageSquareIcon className="w-8 h-8" />
          </EmptyIcon>
          <EmptyTitle className="text-lg">Select a Conversation</EmptyTitle>
          <EmptyDescription className="text-xs sm:text-sm">
            Choose a conversation from the sidebar or start a new chat to begin
            messaging with end-to-end authenticated security.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background min-w-0 overflow-hidden relative">
      {/* Chat Pane Header */}
      <div className="px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackToSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBackToSidebar}
              aria-label="Back to conversations list"
              className="md:hidden -ml-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
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
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {activeTarget.recipientName}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {activeTarget.recipientEmail}
                </p>
              </div>
            </>
          ) : (
            <>
              <Avatar name={activeTarget.groupName} isGroup size="md" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {activeTarget.groupName}
                </h2>
                {(() => {
                  const displayCount = activeTarget.memberCount;
                  return (
                    <button
                      type="button"
                      onClick={() => setIsGroupMembersOpen(true)}
                      aria-label={`View group members (${displayCount} ${
                        displayCount === 1 ? "member" : "members"
                      })`}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer group rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <UsersIcon className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="underline underline-offset-2 decoration-border group-hover:decoration-primary font-medium">
                        {displayCount}{" "}
                        {displayCount === 1 ? "member" : "members"}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
        </div>
      </div>

      {/* Message Thread Scroll Container */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-label="Conversation message history"
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 relative"
      >
        {/* Load earlier messages trigger */}
        {hasMore && (
          <div className="text-center py-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadEarlierMessages}
              disabled={isLoadingEarlier}
              isLoading={isLoadingEarlier}
              className="rounded-full shadow-xs"
            >
              <span>Load earlier messages</span>
            </Button>
          </div>
        )}

        {/* Loading messages state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2Icon className="w-6 h-6 animate-spin text-primary mb-2" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Empty className="max-w-sm border-none">
              <EmptyIcon className="bg-destructive/10 text-destructive size-12 rounded-xl">
                <MessageSquareIcon className="w-6 h-6" />
              </EmptyIcon>
              <EmptyTitle>Unable to load messages</EmptyTitle>
              <EmptyDescription className="text-destructive">
                {loadError}
              </EmptyDescription>
              <Button
                type="button"
                size="sm"
                onClick={() => void loadMessages()}
                className="mt-2"
              >
                Retry
              </Button>
            </Empty>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Empty className="max-w-sm border-none">
              <EmptyIcon className="bg-muted text-muted-foreground size-12 rounded-xl">
                <MessageSquareIcon className="w-6 h-6 opacity-40" />
              </EmptyIcon>
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>
                Send the first message to start the conversation!
              </EmptyDescription>
            </Empty>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSelf = msg.isSelf;
            const senderProfile = getSenderProfile(msg.sender_email);
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg ||
              new Date(prevMsg.created_at).toDateString() !==
                new Date(msg.created_at).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border shadow-xs">
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
                      name={
                        senderProfile.name || msg.sender_email.split("@")[0]
                      }
                      avatarUrl={senderProfile.avatarUrl}
                      size="sm"
                      className="mt-1 shrink-0"
                    />
                  )}

                  <div
                    className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    {!isSelf && (
                      <span className="text-[11px] font-medium text-muted-foreground mb-1 px-1">
                        {msg.sender_email}
                      </span>
                    )}

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-xs ${
                        isSelf
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted text-foreground border border-border/60 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    <span className="text-[10px] mt-1 px-1 text-muted-foreground">
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
          <Button
            type="button"
            size="sm"
            onClick={() => scrollToBottom(true)}
            className="rounded-full shadow-lg gap-1.5"
          >
            <ChevronDownIcon className="w-3.5 h-3.5" />
            <span>Latest messages</span>
          </Button>
        </div>
      )}

      {/* Send Error Notice */}
      {sendError && (
        <div className="mx-4 mb-2">
          <Alert
            variant="destructive"
            className="flex items-center justify-between py-2 px-3"
          >
            <AlertDescription className="text-xs">{sendError}</AlertDescription>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="text-destructive-foreground hover:opacity-80 font-bold ml-2 cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </Alert>
        </div>
      )}

      {/* Composer Input Area */}
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 border-t border-border bg-background/95 backdrop-blur-md shrink-0 z-10">
        <form
          onSubmit={handleSendMessage}
          className="relative flex items-end gap-2"
        >
          <div className="flex-1 relative min-w-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              aria-label="Write a message"
              rows={1}
              maxLength={4000}
              className="w-full resize-none px-4 py-2.5 text-base sm:text-sm rounded-2xl border border-input bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all max-h-28 sm:max-h-32 min-h-[44px]"
            />
            {inputText.length > 3000 && (
              <span className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">
                {inputText.length}/4000
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={!inputText.trim() || isSending}
            isLoading={isSending}
            className="size-11 shrink-0 rounded-2xl shadow-md"
            aria-label="Send message"
          >
            {!isSending && <SendIcon className="w-4 h-4 -mr-0.5" />}
          </Button>
        </form>
      </div>

      {/* Group Members Modal */}
      {activeTarget?.type === "group" && (
        <GroupMembersModal
          isOpen={isGroupMembersOpen}
          onClose={() => setIsGroupMembersOpen(false)}
          groupId={activeTarget.groupId}
          groupName={activeTarget.groupName}
          creatorEmail={activeTarget.creatorEmail}
          onMemberAdded={(newCount, newMember) => {
            if (newMember?.email) {
              setGroupMembersMap((prev) => ({
                ...prev,
                [newMember.email.toLowerCase()]: {
                  name: newMember.name,
                  avatarUrl: newMember.avatar_url,
                },
              }));
            }
            onGroupUpdated?.(activeTarget.groupId, newCount);
          }}
        />
      )}
    </div>
  );
}
