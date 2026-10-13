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
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";
import {
  ShieldIcon,
  UsersIcon,
  UserIcon,
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
import { ThemeToggle } from "../ui/theme-toggle";

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-dialog-title"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl h-[88vh] bg-card text-card-foreground rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
        >
          {/* Top Header */}
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-500/25 shadow-2xs">
                <ShieldIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="admin-dialog-title"
                    className="text-base font-bold text-foreground tracking-tight"
                  >
                    Admin Oversight Console
                  </h2>
                  <Badge
                    variant="warning"
                    className="text-[10px] py-0 px-2 font-bold tracking-wider uppercase shadow-2xs"
                  >
                    Restricted
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage platform users, inspect activity logs, and monitor
                  conversations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle variant="compact" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Close Admin Console"
                aria-label="Close Admin Console"
              >
                <XIcon className="size-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div
            role="tablist"
            aria-label="Admin console navigation"
            className="px-3 sm:px-6 pt-3 pb-2 border-b border-border bg-background flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-none"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === "users"}
              variant={activeTab === "users" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab("users");
                if (usersList.length === 0) fetchUsers();
              }}
              className="gap-2 shrink-0 whitespace-nowrap"
            >
              <UsersIcon className="size-3.5" />
              <span>User Management</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "users"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {usersList.length}
              </span>
            </Button>

            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === "activity"}
              variant={activeTab === "activity" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab("activity");
                if (activities.length === 0) fetchActivity(actionFilter);
              }}
              className="gap-2 shrink-0 whitespace-nowrap"
            >
              <ActivityIcon className="size-3.5" />
              <span>Activity Audit Trail</span>
            </Button>

            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === "conversations"}
              variant={activeTab === "conversations" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab("conversations");
                if (!conversationsOverview) fetchConversations();
              }}
              className="gap-2 shrink-0 whitespace-nowrap"
            >
              <MessageSquareIcon className="size-3.5" />
              <span>Conversations Oversight</span>
            </Button>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (activeTab === "users") fetchUsers();
                  if (activeTab === "activity") fetchActivity(actionFilter);
                  if (activeTab === "conversations") fetchConversations();
                }}
                title="Refresh current tab data"
              >
                <RefreshCwIcon className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Modal Tab Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 bg-muted/20 min-w-0">
            {/* ========================================================== */}
            {/* TAB 1: USERS & RBAC                                        */}
            {/* ========================================================== */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Search Bar & Feedback */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Filter by name or email..."
                      className="pl-9 h-9"
                    />
                  </div>

                  {userFeedback && (
                    <Alert
                      variant={
                        userFeedback.type === "success"
                          ? "success"
                          : "destructive"
                      }
                      className="py-1.5 px-3 flex items-center gap-2 max-w-md"
                    >
                      {userFeedback.type === "success" ? (
                        <CheckIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangleIcon className="size-3.5 shrink-0" />
                      )}
                      <AlertDescription className="text-xs">
                        {userFeedback.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Users Table */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
                  {isLoadingUsers ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                      <Loader2Icon className="size-6 text-primary animate-spin mb-3" />
                      <span className="text-xs">
                        Loading registered users...
                      </span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <p className="text-xs">No users match your search.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => {
                          const isSelf =
                            u.email.toLowerCase() ===
                            currentUser?.email.toLowerCase();
                          const isActionLoading =
                            actionLoadingEmail?.toLowerCase() ===
                            u.email.toLowerCase();

                          return (
                            <TableRow key={u.email}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    name={u.name}
                                    email={u.email}
                                    avatarUrl={u.avatar_url}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-foreground truncate">
                                      {u.name || "Nameless User"}
                                      {isSelf && (
                                        <span className="ml-1.5 text-[10px] text-primary font-normal">
                                          (You)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    u.role === "admin" ? "warning" : "secondary"
                                  }
                                  className="text-[10px] py-0.5 px-2 font-semibold uppercase tracking-wider gap-1 shadow-2xs"
                                >
                                  {u.role === "admin" && (
                                    <ShieldIcon className="size-3 text-amber-600 dark:text-amber-400" />
                                  )}
                                  <span>{u.role}</span>
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    u.is_active ? "success" : "destructive"
                                  }
                                  className="text-[10px] py-0.5 px-2 font-medium gap-1.5 shadow-2xs"
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      u.is_active
                                        ? "bg-emerald-500 ring-2 ring-emerald-500/30"
                                        : "bg-rose-500 ring-2 ring-rose-500/30"
                                    }`}
                                  />
                                  <span>
                                    {u.is_active ? "Active" : "Deactivated"}
                                  </span>
                                </Badge>
                              </TableCell>

                              <TableCell className="text-muted-foreground text-[11px]">
                                {new Date(u.created_at).toLocaleDateString()}
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="inline-flex items-center gap-2 justify-end">
                                  {/* Role toggle button */}
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    className={
                                      u.role === "admin"
                                        ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        : "hover:border-amber-500/40 hover:bg-amber-500/[0.08] hover:text-amber-800 dark:hover:text-amber-300"
                                    }
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
                                  >
                                    {isActionLoading ? (
                                      <Loader2Icon className="size-3 animate-spin" />
                                    ) : u.role === "admin" ? (
                                      <>
                                        <UserIcon className="size-3 shrink-0" />
                                        <span>Demote to User</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldIcon className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>Promote to Admin</span>
                                      </>
                                    )}
                                  </Button>

                                  {/* Status toggle button */}
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant={
                                      u.is_active
                                        ? "destructive-subtle"
                                        : "success-subtle"
                                    }
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
                                  >
                                    {isActionLoading ? (
                                      <Loader2Icon className="size-3 animate-spin" />
                                    ) : u.is_active ? (
                                      <>
                                        <XIcon className="size-3 shrink-0" />
                                        <span>Deactivate</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckIcon className="size-3 shrink-0" />
                                        <span>Activate</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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
                    <span className="text-xs text-muted-foreground font-medium">
                      Action Type:
                    </span>
                    <select
                      value={actionFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActionFilter(val);
                        fetchActivity(val);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
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
                    <Alert
                      variant="destructive"
                      className="py-1.5 px-3 max-w-md"
                    >
                      <AlertDescription className="text-xs">
                        {activityFeedback}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Activity List */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
                  {isLoadingActivity ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                      <Loader2Icon className="size-6 text-primary animate-spin mb-3" />
                      <span className="text-xs">
                        Loading activity audit trail...
                      </span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <p className="text-xs">
                        No activity records found matching the filter.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activities.map((act) => {
                        let actionBadgeVariant:
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "warning"
                          | "info" = "secondary";
                        if (act.action.includes("ROLE")) {
                          actionBadgeVariant = "warning";
                        } else if (
                          act.action.includes("STATUS") ||
                          act.action.includes("DEACTIVAT")
                        ) {
                          actionBadgeVariant = "destructive";
                        } else if (act.action.includes("GROUP")) {
                          actionBadgeVariant = "default";
                        } else if (act.action.includes("VIEW")) {
                          actionBadgeVariant = "info";
                        }

                        return (
                          <div
                            key={act.id}
                            className="p-4 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={actionBadgeVariant}
                                  className="text-[10px] py-0 px-2 font-semibold uppercase tracking-wider"
                                >
                                  {act.action}
                                </Badge>
                                <span className="text-xs font-semibold text-foreground">
                                  {act.actor_email}
                                </span>
                              </div>

                              <span className="text-[11px] text-muted-foreground">
                                {new Date(act.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {act.target_type && (
                                <span>
                                  Target:{" "}
                                  <strong className="text-foreground font-medium">
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
                              <div className="mt-2 p-2 bg-muted/50 rounded-lg text-[11px] font-mono text-muted-foreground overflow-x-auto">
                                {JSON.stringify(act.details)}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Load More Button */}
                      {hasMoreActivity && (
                        <div className="p-3 text-center bg-muted/20">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleLoadMoreActivity}
                            disabled={isLoadingMoreActivity}
                            isLoading={isLoadingMoreActivity}
                          >
                            <span>Load More Activity Logs</span>
                          </Button>
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
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-card p-1 rounded-xl border border-border w-full sm:w-auto shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={convSubTab === "direct" ? "default" : "ghost"}
                      onClick={() => {
                        setConvSubTab("direct");
                        setInspectingPair(null);
                      }}
                      className="text-xs truncate h-8"
                    >
                      Direct Chats (
                      {conversationsOverview?.direct_conversations?.length ?? 0}
                      )
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={convSubTab === "groups" ? "default" : "ghost"}
                      onClick={() => {
                        setConvSubTab("groups");
                        setInspectingPair(null);
                      }}
                      className="text-xs truncate h-8"
                    >
                      Group Channels (
                      {conversationsOverview?.groups?.length ?? 0})
                    </Button>
                  </div>

                  <div className="relative flex-1 sm:max-w-xs md:max-w-sm w-full">
                    <SearchIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={convSearchQuery}
                      onChange={(e) => setConvSearchQuery(e.target.value)}
                      placeholder="Filter conversations..."
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                {conversationsFeedback && (
                  <Alert variant="destructive" className="py-1.5 px-3">
                    <AlertDescription className="text-xs">
                      {conversationsFeedback}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Inspecting Pair Overlay / Embedded Viewer */}
                {inspectingPair && (
                  <div className="p-3.5 sm:p-4 bg-card rounded-2xl border border-primary/30 shadow-md space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-2.5">
                      <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setInspectingPair(null)}
                          className="shrink-0 size-8 mt-0.5 sm:mt-0"
                          title="Back to conversation list"
                          aria-label="Back to conversation list"
                        >
                          <ArrowLeftIcon className="size-4" />
                        </Button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs font-bold text-foreground">
                              Direct Message Inspection:
                            </h4>
                            <Badge
                              variant="subtle"
                              className="text-[10px] py-0 px-2 font-medium"
                            >
                              Read-Only Moderation
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground font-semibold break-all mt-1 flex flex-wrap items-center gap-1">
                            <span>{inspectingPair.userA}</span>
                            <span className="text-muted-foreground font-normal">
                              ↔
                            </span>
                            <span>{inspectingPair.userB}</span>
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setInspectingPair(null)}
                        className="self-end sm:self-center"
                      >
                        Close
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Viewing message history between these users is strictly
                      read-only and is recorded in the platform activity audit
                      log.
                    </p>

                    {isLoadingInspect ? (
                      <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <Loader2Icon className="size-5 text-primary animate-spin mb-2" />
                        <span className="text-xs">
                          Retrieving message history...
                        </span>
                      </div>
                    ) : inspectFeedback ? (
                      <div className="p-4 text-center text-xs text-destructive">
                        {inspectFeedback}
                      </div>
                    ) : inspectMessages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        No messages found between these users.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 p-2 bg-muted/40 rounded-xl min-w-0">
                        {inspectMessages.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 rounded-lg bg-card border border-border text-xs min-w-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="font-semibold text-foreground break-all">
                                {m.sender_email}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground break-words whitespace-pre-wrap">
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
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs min-w-0">
                    {isLoadingConversations ? (
                      <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <Loader2Icon className="size-6 text-primary animate-spin mb-3" />
                        <span className="text-xs">
                          Loading direct conversations...
                        </span>
                      </div>
                    ) : filteredDirectConvs.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-xs">
                        No direct conversations found.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card List (Visible on screens < md) */}
                        <div className="block md:hidden divide-y divide-border p-2 sm:p-3 space-y-2">
                          {filteredDirectConvs.map((dc, idx) => (
                            <div
                              key={`mobile-${dc.user_a}-${dc.user_b}-${idx}`}
                              className="p-3 rounded-xl bg-muted/30 border border-border space-y-2.5"
                            >
                              <div className="space-y-1 min-w-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                  Participants
                                </span>
                                <div className="text-xs font-semibold text-foreground break-all flex flex-wrap items-center gap-1.5">
                                  <span>{dc.user_a}</span>
                                  <span className="text-muted-foreground font-normal">
                                    ↔
                                  </span>
                                  <span>{dc.user_b}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] py-0 px-2 font-medium"
                                  >
                                    {dc.total_messages} msgs
                                  </Badge>
                                  <span>
                                    {new Date(
                                      dc.last_activity,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>

                                <Button
                                  type="button"
                                  size="xs"
                                  variant="subtle"
                                  onClick={() =>
                                    handleInspectMessages(dc.user_a, dc.user_b)
                                  }
                                  className="gap-1.5"
                                >
                                  <EyeIcon className="size-3.5" />
                                  <span>Inspect</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table (Visible on md and up) */}
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Participants</TableHead>
                                <TableHead>Total Messages</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead className="text-right">
                                  Action
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredDirectConvs.map((dc, idx) => (
                                <TableRow
                                  key={`${dc.user_a}-${dc.user_b}-${idx}`}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {dc.user_a}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ↔
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {dc.user_b}
                                      </span>
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-muted-foreground">
                                    {dc.total_messages} msgs
                                  </TableCell>

                                  <TableCell className="text-muted-foreground text-[11px]">
                                    {new Date(
                                      dc.last_activity,
                                    ).toLocaleDateString()}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="subtle"
                                      onClick={() =>
                                        handleInspectMessages(
                                          dc.user_a,
                                          dc.user_b,
                                        )
                                      }
                                      className="gap-1.5"
                                    >
                                      <EyeIcon className="size-3" />
                                      <span>Inspect</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Group Channels */}
                {convSubTab === "groups" && !inspectingPair && (
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs min-w-0">
                    {isLoadingConversations ? (
                      <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <Loader2Icon className="size-6 text-primary animate-spin mb-3" />
                        <span className="text-xs">
                          Loading group channels...
                        </span>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-xs">
                        No group channels found.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card List (Visible on screens < md) */}
                        <div className="block md:hidden divide-y divide-border p-2 sm:p-3 space-y-2">
                          {filteredGroups.map((g) => (
                            <div
                              key={`mobile-group-${g.group_id}`}
                              className="p-3 rounded-xl bg-muted/30 border border-border space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-foreground truncate">
                                  {g.name}
                                </span>
                                <Badge
                                  variant="subtle"
                                  className="text-[11px] py-0 px-2 font-medium shrink-0"
                                >
                                  {g.member_count} members
                                </Badge>
                              </div>

                              <div className="text-[11px] space-y-0.5">
                                <div className="text-muted-foreground break-all">
                                  Creator:{" "}
                                  <span className="text-foreground font-medium">
                                    {g.creator_email}
                                  </span>
                                </div>
                                <div className="text-muted-foreground text-[10px]">
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
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Creator</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead>Last Activity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredGroups.map((g) => (
                                <TableRow key={g.group_id}>
                                  <TableCell className="font-semibold text-foreground">
                                    {g.name}
                                  </TableCell>

                                  <TableCell className="text-muted-foreground">
                                    {g.creator_email}
                                  </TableCell>

                                  <TableCell className="text-muted-foreground">
                                    {g.member_count} members
                                  </TableCell>

                                  <TableCell className="text-muted-foreground text-[11px]">
                                    {new Date(
                                      g.last_activity,
                                    ).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
