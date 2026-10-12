"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, type GroupMemberItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import {
  SearchIcon,
  XIcon,
  Loader2Icon,
  CheckIcon,
  UsersIcon,
  PlusIcon,
  ShieldIcon,
  UserIcon,
} from "../ui/icons";

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  creatorEmail?: string;
  onMemberAdded?: (newMemberCount: number, newMember: GroupMemberItem) => void;
}

export function GroupMembersModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  creatorEmail,
  onMemberAdded,
}: GroupMembersModalProps) {
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"members" | "add">("members");
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Add member search state
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<
    Array<{
      id?: string;
      email: string;
      name: string;
      avatar_url: string | null;
    }>
  >([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [addingEmail, setAddingEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleClose = useCallback(() => {
    setActiveTab("members");
    setSearch("");
    setFeedback(null);
    onClose();
  }, [onClose]);

  // Keyboard Escape listener
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

  // Fetch group members whenever modal opens or groupId changes
  const loadMembers = useCallback(async () => {
    if (!isOpen || !groupId || groupId === "undefined") return;

    setIsLoadingMembers(true);
    setMembersError(null);

    try {
      const res = await apiClient.getGroupMembers(groupId);
      if (res.success && res.data) {
        setMembers(res.data);
      } else {
        setMembersError(res.error?.message || "Failed to load group members");
      }
    } catch (err: unknown) {
      setMembersError(
        err instanceof Error ? err.message : "Failed to load members",
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void loadMembers();
      }
    });
    return () => {
      active = false;
    };
  }, [loadMembers]);

  // Determine if logged in user is the group creator
  const isCreator = Boolean(
    currentUser?.email &&
    (creatorEmail?.toLowerCase() === currentUser.email.toLowerCase() ||
      members.some(
        (m) =>
          m.is_creator &&
          m.email.toLowerCase() === currentUser.email.toLowerCase(),
      )),
  );

  // Search candidates for adding to group
  useEffect(() => {
    if (!isOpen || activeTab !== "add" || !isCreator) return;

    let active = true;
    const timer = setTimeout(() => {
      setIsLoadingCandidates(true);
      apiClient
        .searchUsers(search, 30)
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) {
            setCandidates(res.data);
          } else {
            setFeedback({
              type: "error",
              message: res.error?.message || "Failed to find users",
            });
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setFeedback({
              type: "error",
              message: err instanceof Error ? err.message : "Search failed",
            });
          }
        })
        .finally(() => {
          if (active) setIsLoadingCandidates(false);
        });
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, activeTab, search, isCreator]);

  // Handle adding a user to group
  const handleAddMember = async (candidate: {
    email: string;
    name: string;
    avatar_url: string | null;
  }) => {
    if (!groupId || addingEmail) return;

    setAddingEmail(candidate.email);
    setFeedback(null);

    try {
      const res = await apiClient.addGroupMember(groupId, candidate.email);
      if (res.success && res.data) {
        const newMember: GroupMemberItem = {
          email: res.data.user_email,
          name: res.data.name,
          avatar_url: res.data.avatar_url,
          joined_at: String(res.data.joined_at),
          is_creator: false,
        };

        const updatedMembers = [...members, newMember];
        setMembers(updatedMembers);

        setFeedback({
          type: "success",
          message: `Added ${candidate.name || candidate.email} to the group.`,
        });

        onMemberAdded?.(res.data.member_count, newMember);
      } else {
        setFeedback({
          type: "error",
          message: res.error?.message || "Failed to add user to group",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error adding user to group",
      });
    } finally {
      setAddingEmail(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-members-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="group-members-modal-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  {groupName}
                </h3>
                <p className="text-xs text-slate-500">
                  {members.length} {members.length === 1 ? "member" : "members"}
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

          {/* Navigation Tabs (Visible when user is creator) */}
          {isCreator && (
            <div className="px-5 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("members");
                  setFeedback(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                  activeTab === "members"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                <span>Members ({members.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("add");
                  setFeedback(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                  activeTab === "add"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          )}

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Feedback alert banner */}
            {feedback && (
              <div
                role="alert"
                aria-live="polite"
                className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between ${
                  feedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === "success" ? (
                    <CheckIcon className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XIcon className="w-4 h-4 shrink-0 text-rose-500" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
                  aria-label="Dismiss feedback"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: VIEW MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-3">
                {isLoadingMembers ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2Icon className="w-7 h-7 animate-spin text-indigo-500 mb-2" />
                    <p className="text-xs">Loading group members...</p>
                  </div>
                ) : membersError ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-rose-500 mb-3">{membersError}</p>
                    <button
                      type="button"
                      onClick={() => void loadMembers()}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No members found in this group.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {members.map((member) => (
                      <div
                        key={member.email}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={member.name || member.email}
                            email={member.email}
                            avatarUrl={member.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {member.name || member.email}
                              </h4>
                              {member.is_creator && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 shrink-0">
                                  <ShieldIcon className="w-3 h-3" />
                                  Creator
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-400">
                            Joined{" "}
                            {member.joined_at
                              ? new Date(member.joined_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "recently"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Creator shortcut to switch to Add Member */}
                {isCreator && !isLoadingMembers && (
                  <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab("add")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADD MEMBER (Visible to group creator only) */}
            {activeTab === "add" && isCreator && (
              <div className="space-y-4">
                {/* Search input */}
                <div>
                  <label
                    htmlFor="candidate-search"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Search Users to Add
                  </label>
                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="candidate-search"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or email address..."
                      aria-label="Search users to add to group"
                      autoFocus
                      className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Candidates List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                    Available Users
                  </span>

                  {isLoadingCandidates ? (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                      <Loader2Icon className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                      <p className="text-xs">Searching users...</p>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <UserIcon className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                      <p className="text-xs">
                        {search.trim()
                          ? `No users found matching "${search}"`
                          : "No users available to add."}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                      {candidates.map((candidate) => {
                        const isAlreadyMember = members.some(
                          (m) =>
                            m.email.toLowerCase() ===
                            candidate.email.toLowerCase(),
                        );
                        const isAdding = addingEmail === candidate.email;

                        return (
                          <div
                            key={candidate.email}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                name={candidate.name || candidate.email}
                                email={candidate.email}
                                avatarUrl={candidate.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {candidate.name || candidate.email}
                                </h4>
                                <p className="text-xs text-slate-400 truncate">
                                  {candidate.email}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isAlreadyMember ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                                  <CheckIcon className="w-3.5 h-3.5" />
                                  Already a member
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddMember(candidate)}
                                  disabled={isAdding}
                                  aria-label={`Add ${candidate.name || candidate.email} to group`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
                                >
                                  {isAdding ? (
                                    <>
                                      <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                                      <span>Adding...</span>
                                    </>
                                  ) : (
                                    <>
                                      <PlusIcon className="w-3.5 h-3.5" />
                                      <span>Add</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              {isCreator
                ? "You are the creator of this group."
                : "You are a member of this group."}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
