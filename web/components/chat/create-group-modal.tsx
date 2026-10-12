"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, type GroupItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import {
  SearchIcon,
  XIcon,
  Loader2Icon,
  CheckIcon,
  UsersIcon,
} from "../ui/icons";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: GroupItem) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { user: currentUser } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<
    Array<{
      id?: string;
      email: string;
      name: string;
      avatar_url: string | null;
      role?: string;
    }>
  >([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setGroupName("");
    setSearch("");
    setSelectedEmails([]);
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
      setIsLoadingUsers(true);
      apiClient
        .searchUsers(search, 30)
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) {
            const filtered = res.data.filter(
              (u) =>
                u.email.toLowerCase() !==
                (currentUser?.email || "").toLowerCase(),
            );
            setAvailableUsers(filtered);
          } else {
            setError(res.error?.message || "Failed to load candidates");
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Load failed");
          }
        })
        .finally(() => {
          if (active) setIsLoadingUsers(false);
        });
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, search, currentUser?.email]);

  const toggleSelectEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }

    if (selectedEmails.length === 0) {
      setError("Please select at least one member to join the group.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiClient.createGroup({
        name: groupName.trim(),
        participant_emails: selectedEmails,
      });

      if (res.success && res.data) {
        onGroupCreated(res.data);
        onClose();
      } else {
        setError(res.error?.message || "Failed to create group channel");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating group");
    } finally {
      setIsSubmitting(false);
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

        {/* Modal Dialog */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <UsersIcon className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="create-group-modal-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Create Group Channel
                </h2>
                <p className="text-xs text-slate-500">
                  Collaborate with multiple team members
                </p>
              </div>
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

          <form
            onSubmit={handleCreateGroup}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="p-5 space-y-4 border-b border-slate-100 dark:border-slate-800">
              {/* Group Name input */}
              <div>
                <label
                  htmlFor="group-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Group Name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Engineering Sync, Project Alpha"
                  maxLength={128}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>

              {/* Selected members chip list */}
              {selectedEmails.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Selected Participants ({selectedEmails.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedEmails.map((email) => {
                      const member = availableUsers.find(
                        (u) => u.email === email,
                      );
                      return (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                        >
                          <span className="font-medium truncate max-w-[140px]">
                            {member?.name || email}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSelectEmail(email)}
                            className="p-0.5 hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 rounded-md transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search member input */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter users to invite..."
                  aria-label="Filter users to invite"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Available Users List */}
            <div className="flex-1 overflow-y-auto p-3 min-h-[180px] max-h-[260px]">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2Icon className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                  <span className="text-xs">Loading contacts...</span>
                </div>
              ) : error ? (
                <p className="text-center py-8 text-xs text-rose-500">
                  {error}
                </p>
              ) : availableUsers.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No users found matching query
                </p>
              ) : (
                <div className="space-y-1">
                  {availableUsers.map((item) => {
                    const isSelected = selectedEmails.includes(item.email);
                    return (
                      <div
                        key={item.id || item.email}
                        onClick={() => toggleSelectEmail(item.email)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          }`}
                        >
                          {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                        </div>
                        <Avatar
                          name={item.name}
                          email={item.email}
                          avatarUrl={item.avatar_url}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                You will be added as group creator
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedEmails.length === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2Icon className="w-3.5 h-3.5" />}
                  <span>Create Channel</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
