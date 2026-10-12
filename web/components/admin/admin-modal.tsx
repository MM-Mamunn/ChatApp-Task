"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  apiClient,
  type AdminUserItem,
  type ActivityLogItem,
  type AdminConversationsOverview,
  type AdminDirectMessageItem,
} from "@/lib/api-client";
import { Avatar } from "../ui/avatar";
import {
  ShieldIcon,
  UsersIcon,
  MessageSquareIcon,
  ActivityIcon,
  SearchIcon,
  Loader2Icon,
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  EyeIcon,
  ArrowLeftIcon,
} from "../ui/icons";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = "users" | "activity" | "conversations";

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // ==========================================
  // Tab 1: Users & RBAC Management
  // ==========================================
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(
    null,
  );
  const [userFeedback, setUserFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUserFeedback(null);
    try {
      const res = await apiClient.listAdminUsers();
      if (res.success && res.data) {
        setUsersList(res.data);
      } else {
        setUserFeedback({
          type: "error",
          message: res.error?.message || "Failed to load users list.",
        });
      }
    } catch (err: unknown) {
      setUserFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load users.",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const handleRoleChange = async (
    targetEmail: string,
    newRole: "user" | "admin",
  ) => {
    if (targetEmail.toLowerCase() === currentUser?.email.toLowerCase()) {
      setUserFeedback({
        type: "error",
        message: "You cannot change your own administrative role.",
      });
      return;
    }

    setActionLoadingEmail(targetEmail);
    setUserFeedback(null);
    try {
      const res = await apiClient.updateUserRole(targetEmail, newRole);
      if (res.success && res.data) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === targetEmail.toLowerCase()
              ? { ...u, role: newRole }
              : u,
          ),
        );
        setUserFeedback({
          type: "success",
          message: `Successfully changed role for ${targetEmail} to ${newRole.toUpperCase()}.`,
        });
      } else {
        setUserFeedback({
          type: "error",
          message: res.error?.message || "Failed to update user role.",
        });
      }
    } catch (err: unknown) {
      setUserFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Role update error occurred.",
      });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleStatusToggle = async (
    targetEmail: string,
    currentStatus: boolean,
  ) => {
    if (targetEmail.toLowerCase() === currentUser?.email.toLowerCase()) {
      setUserFeedback({
        type: "error",
        message: "You cannot deactivate your own account.",
      });
      return;
    }

    const nextStatus = !currentStatus;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    if (
      !confirm(
        `Are you sure you want to ${actionLabel} ${targetEmail}? ${
          !nextStatus
            ? "This will immediately revoke active sessions and block sign-in."
            : ""
        }`,
      )
    ) {
      return;
    }

    setActionLoadingEmail(targetEmail);
    setUserFeedback(null);
    try {
      const res = await apiClient.updateUserStatus(targetEmail, nextStatus);
      if (res.success && res.data) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === targetEmail.toLowerCase()
              ? { ...u, is_active: nextStatus }
              : u,
          ),
        );
        setUserFeedback({
          type: "success",
          message: `User ${targetEmail} has been ${
            nextStatus ? "reactivated" : "deactivated"
          }.`,
        });
      } else {
        setUserFeedback({
          type: "error",
          message: res.error?.message || "Failed to update user status.",
        });
      }
    } catch (err: unknown) {
      setUserFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Status update error occurred.",
      });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  // ==========================================
  // Tab 2: Activity Audit Trail
  // ==========================================
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [activityNextCursor, setActivityNextCursor] = useState<string | null>(
    null,
  );
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [activityFeedback, setActivityFeedback] = useState<string | null>(null);

  const fetchActivity = useCallback(async (filterAction: string) => {
    setIsLoadingActivity(true);
    setActivityFeedback(null);
    try {
      const params: { limit: number; action?: string } = { limit: 25 };
      if (filterAction !== "ALL") {
        params.action = filterAction;
      }

      const res = await apiClient.listAdminActivity(params);
      if (res.success && res.data) {
        setActivities(res.data);
        setHasMoreActivity(res.pagination?.has_more ?? false);
        setActivityNextCursor(res.pagination?.next_cursor ?? null);
      } else {
        setActivityFeedback(
          res.error?.message || "Failed to load activity logs.",
        );
      }
    } catch (err: unknown) {
      setActivityFeedback(
        err instanceof Error ? err.message : "Failed to load audit activity.",
      );
    } finally {
      setIsLoadingActivity(false);
    }
  }, []);

  const handleLoadMoreActivity = async () => {
    if (!activityNextCursor || isLoadingMoreActivity) return;
    setIsLoadingMoreActivity(true);
    try {
      const params: { limit: number; before?: string; action?: string } = {
        limit: 25,
        before: activityNextCursor,
      };
      if (actionFilter !== "ALL") {
        params.action = actionFilter;
      }

      const res = await apiClient.listAdminActivity(params);
      if (res.success && res.data) {
        setActivities((prev) => [...prev, ...(res.data || [])]);
        setHasMoreActivity(res.pagination?.has_more ?? false);
        setActivityNextCursor(res.pagination?.next_cursor ?? null);
      }
    } catch {
      // Ignore background load more error
    } finally {
      setIsLoadingMoreActivity(false);
    }
  };

  // ==========================================
  // Tab 3: Conversations Oversight
  // ==========================================
  const [conversationsOverview, setConversationsOverview] =
    useState<AdminConversationsOverview | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsFeedback, setConversationsFeedback] = useState<
    string | null
  >(null);
  const [convSubTab, setConvSubTab] = useState<"direct" | "groups">("direct");
  const [convSearchQuery, setConvSearchQuery] = useState("");

  // Direct Message Inspection Sub-view
  const [inspectingPair, setInspectingPair] = useState<{
    userA: string;
    userB: string;
  } | null>(null);
  const [inspectMessages, setInspectMessages] = useState<
    AdminDirectMessageItem[]
  >([]);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);
  const [inspectFeedback, setInspectFeedback] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setConversationsFeedback(null);
    try {
      const res = await apiClient.listAdminConversations();
      if (res.success && res.data) {
        setConversationsOverview(res.data);
      } else {
        setConversationsFeedback(
          res.error?.message || "Failed to load conversations overview.",
        );
      }
    } catch (err: unknown) {
      setConversationsFeedback(
        err instanceof Error
          ? err.message
          : "Failed to load conversations oversight.",
      );
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const handleInspectMessages = async (userA: string, userB: string) => {
    setInspectingPair({ userA, userB });
    setIsLoadingInspect(true);
    setInspectFeedback(null);
    try {
      const res = await apiClient.getAdminDirectMessages(userA, userB, {
        limit: 50,
      });
      if (res.success && res.data) {
        setInspectMessages(res.data);
      } else {
        setInspectFeedback(
          res.error?.message || "Failed to inspect conversation messages.",
        );
      }
    } catch (err: unknown) {
      setInspectFeedback(
        err instanceof Error
          ? err.message
          : "Failed to retrieve direct messages.",
      );
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Initial fetch on modal open or tab switch
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (activeTab === "users" && usersList.length === 0) {
        fetchUsers();
      } else if (activeTab === "activity" && activities.length === 0) {
        fetchActivity(actionFilter);
      } else if (activeTab === "conversations" && !conversationsOverview) {
        fetchConversations();
      }
    });

    return () => {
      active = false;
    };
  }, [
    isOpen,
    activeTab,
    fetchUsers,
    fetchActivity,
    fetchConversations,
    usersList.length,
    activities.length,
    conversationsOverview,
    actionFilter,
  ]);

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  // Filtered conversations
  const filteredDirectConvs = (
    conversationsOverview?.direct_conversations || []
  ).filter((c) => {
    if (!convSearchQuery.trim()) return true;
    const q = convSearchQuery.toLowerCase();
    return (
      c.user_a.toLowerCase().includes(q) || c.user_b.toLowerCase().includes(q)
    );
  });

  const filteredGroups = (conversationsOverview?.groups || []).filter((g) => {
    if (!convSearchQuery.trim()) return true;
    const q = convSearchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.creator_email.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-dialog-title"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        >
          {/* Top Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="admin-dialog-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    Admin Oversight Console
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Restricted
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage platform users, inspect activity logs, and monitor
                  conversations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Admin Console"
              aria-label="Close Admin Console"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div
            role="tablist"
            aria-label="Admin console navigation"
            className="px-3 sm:px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "users"}
              onClick={() => {
                setActiveTab("users");
                if (usersList.length === 0) fetchUsers();
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "users"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>User Management</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "users"
                    ? "bg-indigo-500/50 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {usersList.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "activity"}
              onClick={() => {
                setActiveTab("activity");
                if (activities.length === 0) fetchActivity(actionFilter);
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "activity"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ActivityIcon className="w-3.5 h-3.5" />
              <span>Activity Audit Trail</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "conversations"}
              onClick={() => {
                setActiveTab("conversations");
                if (!conversationsOverview) fetchConversations();
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "conversations"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <MessageSquareIcon className="w-3.5 h-3.5" />
              <span>Conversations Oversight</span>
            </button>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "users") fetchUsers();
                  if (activeTab === "activity") fetchActivity(actionFilter);
                  if (activeTab === "conversations") fetchConversations();
                }}
                title="Refresh current tab data"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Modal Tab Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 bg-slate-50/50 dark:bg-slate-950/20 min-w-0">
            {/* ========================================================== */}
            {/* TAB 1: USERS & RBAC                                        */}
            {/* ========================================================== */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Search Bar & Feedback */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Filter by name or email..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {userFeedback && (
                    <div
                      className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                        userFeedback.type === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {userFeedback.type === "success" ? (
                        <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{userFeedback.message}</span>
                    </div>
                  )}
                </div>

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  {isLoadingUsers ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                      <Loader2Icon className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
                      <span className="text-xs">
                        Loading registered users...
                      </span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-xs">No users match your search.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold">
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Created</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {filteredUsers.map((u) => {
                            const isSelf =
                              u.email.toLowerCase() ===
                              currentUser?.email.toLowerCase();
                            const isActionLoading =
                              actionLoadingEmail?.toLowerCase() ===
                              u.email.toLowerCase();

                            return (
                              <tr
                                key={u.email}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar
                                      name={u.name}
                                      email={u.email}
                                      avatarUrl={u.avatar_url}
                                      size="sm"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {u.name || "Nameless User"}
                                        {isSelf && (
                                          <span className="ml-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                                            (You)
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 truncate">
                                        {u.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                      u.role === "admin"
                                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    {u.role === "admin" && (
                                      <ShieldIcon className="w-3 h-3 text-amber-500" />
                                    )}
                                    {u.role}
                                  </span>
                                </td>

                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      u.is_active
                                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        u.is_active
                                          ? "bg-emerald-500"
                                          : "bg-rose-500"
                                      }`}
                                    />
                                    {u.is_active ? "Active" : "Deactivated"}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-slate-400 text-[11px]">
                                  {new Date(u.created_at).toLocaleDateString()}
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2 justify-end">
                                    {/* Role toggle button */}
                                    <button
                                      type="button"
                                      disabled={isSelf || isActionLoading}
                                      onClick={() =>
                                        handleRoleChange(
                                          u.email,
                                          u.role === "admin" ? "user" : "admin",
                                        )
                                      }
                                      title={
                                        isSelf
                                          ? "Cannot alter your own role"
                                          : `Change to ${
                                              u.role === "admin"
                                                ? "User"
                                                : "Admin"
                                            }`
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                        isSelf
                                          ? "opacity-40 cursor-not-allowed text-slate-400 border border-slate-200 dark:border-slate-800"
                                          : u.role === "admin"
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/60 cursor-pointer"
                                      }`}
                                    >
                                      {isActionLoading ? (
                                        <Loader2Icon className="w-3 h-3 animate-spin" />
                                      ) : u.role === "admin" ? (
                                        "Demote to User"
                                      ) : (
                                        "Promote to Admin"
                                      )}
                                    </button>

                                    {/* Status toggle button */}
                                    <button
                                      type="button"
                                      disabled={isSelf || isActionLoading}
                                      onClick={() =>
                                        handleStatusToggle(u.email, u.is_active)
                                      }
                                      title={
                                        isSelf
                                          ? "Cannot deactivate your own account"
                                          : u.is_active
                                            ? "Deactivate account"
                                            : "Reactivate account"
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                        isSelf
                                          ? "opacity-40 cursor-not-allowed text-slate-400 border border-slate-200 dark:border-slate-800"
                                          : u.is_active
                                            ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 cursor-pointer"
                                            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 cursor-pointer"
                                      }`}
                                    >
                                      {isActionLoading ? (
                                        <Loader2Icon className="w-3 h-3 animate-spin" />
                                      ) : u.is_active ? (
                                        "Deactivate"
                                      ) : (
                                        "Activate"
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 2: ACTIVITY AUDIT TRAIL                                */}
            {/* ========================================================== */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                {/* Filter and stats row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Action Type:
                    </span>
                    <select
                      value={actionFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActionFilter(val);
                        fetchActivity(val);
                      }}
                      className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">All Actions</option>
                      <option value="ROLE_CHANGE">Role Changes</option>
                      <option value="USER_STATUS_CHANGE">Status Changes</option>
                      <option value="GROUP_CREATE">Group Creation</option>
                      <option value="ADMIN_VIEW_CONVERSATION">
                        Message Inspections
                      </option>
                    </select>
                  </div>

                  {activityFeedback && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangleIcon className="w-3.5 h-3.5" />
                      <span>{activityFeedback}</span>
                    </div>
                  )}
                </div>

                {/* Activity List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  {isLoadingActivity ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                      <Loader2Icon className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
                      <span className="text-xs">
                        Loading activity audit trail...
                      </span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-xs">
                        No activity records found matching the filter.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {activities.map((act) => {
                        let actionBadgeColor =
                          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                        if (act.action.includes("ROLE")) {
                          actionBadgeColor =
                            "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
                        } else if (
                          act.action.includes("STATUS") ||
                          act.action.includes("DEACTIVAT")
                        ) {
                          actionBadgeColor =
                            "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800";
                        } else if (act.action.includes("GROUP")) {
                          actionBadgeColor =
                            "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800";
                        } else if (act.action.includes("VIEW")) {
                          actionBadgeColor =
                            "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
                        }

                        return (
                          <div
                            key={act.id}
                            className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${actionBadgeColor}`}
                                >
                                  {act.action}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {act.actor_email}
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-400">
                                {new Date(act.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              {act.target_type && (
                                <span>
                                  Target:{" "}
                                  <strong className="text-slate-800 dark:text-slate-200 font-medium">
                                    {act.target_id || act.target_type}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {Boolean(
                              act.details &&
                              typeof act.details === "object" &&
                              Object.keys(act.details as object).length > 0,
                            ) && (
                              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                                {JSON.stringify(act.details)}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Load More Button */}
                      {hasMoreActivity && (
                        <div className="p-3 text-center bg-slate-50/50 dark:bg-slate-950/30">
                          <button
                            type="button"
                            onClick={handleLoadMoreActivity}
                            disabled={isLoadingMoreActivity}
                            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
                          >
                            {isLoadingMoreActivity ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                                Loading older logs...
                              </span>
                            ) : (
                              "Load More Activity Logs"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* TAB 3: CONVERSATIONS OVERSIGHT                             */}
            {/* ========================================================== */}
            {activeTab === "conversations" && (
              <div className="space-y-4">
                {/* Sub-tabs & Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setConvSubTab("direct");
                        setInspectingPair(null);
                      }}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                        convSubTab === "direct"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      Direct Chats (
                      {conversationsOverview?.direct_conversations?.length ?? 0}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConvSubTab("groups");
                        setInspectingPair(null);
                      }}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                        convSubTab === "groups"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      Group Channels (
                      {conversationsOverview?.groups?.length ?? 0})
                    </button>
                  </div>

                  <div className="relative flex-1 sm:max-w-xs md:max-w-sm w-full">
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={convSearchQuery}
                      onChange={(e) => setConvSearchQuery(e.target.value)}
                      placeholder="Filter conversations..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {conversationsFeedback && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    <span>{conversationsFeedback}</span>
                  </div>
                )}

                {/* Inspecting Pair Overlay / Embedded Viewer */}
                {inspectingPair && (
                  <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-md space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setInspectingPair(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                          title="Back to conversation list"
                          aria-label="Back to conversation list"
                        >
                          <ArrowLeftIcon className="w-4 h-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Direct Message Inspection:
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0 font-medium">
                              Read-Only Moderation
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold break-all mt-1 flex flex-wrap items-center gap-1">
                            <span>{inspectingPair.userA}</span>
                            <span className="text-slate-400 font-normal">
                              ↔
                            </span>
                            <span>{inspectingPair.userB}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectingPair(null)}
                        className="self-end sm:self-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Viewing message history between these users is strictly
                      read-only and is recorded in the platform activity audit
                      log.
                    </p>

                    {isLoadingInspect ? (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <Loader2Icon className="w-5 h-5 text-indigo-600 animate-spin mb-2" />
                        <span className="text-xs">
                          Retrieving message history...
                        </span>
                      </div>
                    ) : inspectFeedback ? (
                      <div className="p-4 text-center text-xs text-rose-500">
                        {inspectFeedback}
                      </div>
                    ) : inspectMessages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No messages found between these users.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 p-2 bg-slate-50 dark:bg-slate-950/50 rounded-xl min-w-0">
                        {inspectMessages.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs min-w-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">
                                {m.sender_email}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 break-words whitespace-pre-wrap">
                              {m.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 1: Direct Conversations */}
                {convSubTab === "direct" && !inspectingPair && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm min-w-0">
                    {isLoadingConversations ? (
                      <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Loader2Icon className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
                        <span className="text-xs">
                          Loading direct conversations...
                        </span>
                      </div>
                    ) : filteredDirectConvs.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        No direct conversations found.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card List (Visible on screens < md) */}
                        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-3 space-y-2">
                          {filteredDirectConvs.map((dc, idx) => (
                            <div
                              key={`mobile-${dc.user_a}-${dc.user_b}-${idx}`}
                              className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2.5"
                            >
                              <div className="space-y-1 min-w-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                  Participants
                                </span>
                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-all flex flex-wrap items-center gap-1.5">
                                  <span>{dc.user_a}</span>
                                  <span className="text-slate-400 font-normal">
                                    ↔
                                  </span>
                                  <span>{dc.user_b}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px]">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <span className="font-medium bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {dc.total_messages} msgs
                                  </span>
                                  <span>
                                    {new Date(
                                      dc.last_activity,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInspectMessages(dc.user_a, dc.user_b)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <EyeIcon className="w-3.5 h-3.5" />
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table (Visible on md and up) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold">
                                <th className="py-3 px-4">Participants</th>
                                <th className="py-3 px-4">Total Messages</th>
                                <th className="py-3 px-4">Last Activity</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {filteredDirectConvs.map((dc, idx) => (
                                <tr
                                  key={`${dc.user_a}-${dc.user_b}-${idx}`}
                                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {dc.user_a}
                                      </span>
                                      <span className="text-slate-400">↔</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {dc.user_b}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                    {dc.total_messages} msgs
                                  </td>

                                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                                    {new Date(
                                      dc.last_activity,
                                    ).toLocaleDateString()}
                                  </td>

                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleInspectMessages(
                                          dc.user_a,
                                          dc.user_b,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors cursor-pointer"
                                    >
                                      <EyeIcon className="w-3 h-3" />
                                      <span>Inspect</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Group Channels */}
                {convSubTab === "groups" && !inspectingPair && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm min-w-0">
                    {isLoadingConversations ? (
                      <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Loader2Icon className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
                        <span className="text-xs">
                          Loading group channels...
                        </span>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        No group channels found.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card List (Visible on screens < md) */}
                        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-3 space-y-2">
                          {filteredGroups.map((g) => (
                            <div
                              key={`mobile-group-${g.group_id}`}
                              className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {g.name}
                                </span>
                                <span className="text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-md shrink-0">
                                  {g.member_count} members
                                </span>
                              </div>

                              <div className="text-[11px] space-y-0.5">
                                <div className="text-slate-500 dark:text-slate-400 break-all">
                                  Creator:{" "}
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    {g.creator_email}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  Last Activity:{" "}
                                  {new Date(
                                    g.last_activity,
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table (Visible on md and up) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold">
                                <th className="py-3 px-4">Group Name</th>
                                <th className="py-3 px-4">Creator</th>
                                <th className="py-3 px-4">Members</th>
                                <th className="py-3 px-4">Last Activity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {filteredGroups.map((g) => (
                                <tr
                                  key={g.group_id}
                                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                                >
                                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                    {g.name}
                                  </td>

                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                    {g.creator_email}
                                  </td>

                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                    {g.member_count} members
                                  </td>

                                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                                    {new Date(
                                      g.last_activity,
                                    ).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
