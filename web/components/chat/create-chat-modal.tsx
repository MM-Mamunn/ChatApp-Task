"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import { SearchIcon, XIcon, Loader2Icon } from "../ui/icons";

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationStarted: (recipient: {
    email: string;
    name: string;
    avatarUrl?: string | null;
  }) => void;
}

export function CreateChatModal({
  isOpen,
  onClose,
  onConversationStarted,
}: CreateChatModalProps) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<
    Array<{
      id?: string;
      email: string;
      name: string;
      avatar_url: string | null;
      role?: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setSearch("");
    setUsers([]);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      apiClient
        .searchUsers(search, 20)
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) {
            // Filter out current user from candidates
            const filtered = res.data.filter(
              (u) =>
                u.email.toLowerCase() !==
                (currentUser?.email || "").toLowerCase(),
            );
            setUsers(filtered);
          } else {
            setError(res.error?.message || "Failed to search users");
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Search failed");
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, search, currentUser?.email]);

  const handleStartChat = async (targetUser: {
    email: string;
    name: string;
    avatar_url: string | null;
  }) => {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      const res = await apiClient.startDirectConversation(targetUser.email);
      if (res.success && res.data) {
        onConversationStarted({
          email: res.data.other_user?.email || targetUser.email,
          name: res.data.other_user?.name || targetUser.name,
          avatarUrl:
            res.data.other_user?.avatar_url !== undefined
              ? res.data.other_user.avatar_url
              : targetUser.avatar_url,
        });
        handleClose();
      } else {
        setError(res.error?.message || "Failed to initiate conversation");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error starting chat");
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-chat-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2
                id="create-chat-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                New Direct Conversation
              </h2>
              <p className="text-xs text-slate-500">
                Search for a colleague or user to start chatting
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                aria-label="Search users by name or email"
                autoFocus
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-2 min-h-[220px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2Icon className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs">Finding users...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                  Search error
                </p>
                <p className="text-xs mt-1 text-slate-500">{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No users found
                </p>
                <p className="text-xs mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((item) => (
                  <button
                    key={item.id || item.email}
                    type="button"
                    disabled={isStarting}
                    onClick={() => handleStartChat(item)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group disabled:opacity-50 cursor-pointer"
                  >
                    <Avatar
                      name={item.name}
                      email={item.email}
                      avatarUrl={item.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.email}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Chat →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
