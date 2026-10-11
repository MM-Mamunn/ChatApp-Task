"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { type DirectConversationItem, type GroupItem } from "@/lib/api-client";
import { Avatar } from "../ui/avatar";
import {
  MessageSquareIcon,
  UsersIcon,
  PlusIcon,
  SearchIcon,
  LogOutIcon,
  ShieldIcon,
  Loader2Icon,
} from "../ui/icons";

export type ActiveTarget =
  | {
      type: "direct";
      recipientEmail: string;
      recipientName: string;
      avatarUrl?: string | null;
    }
  | {
      type: "group";
      groupId: string;
      groupName: string;
      memberCount: number;
    }
  | null;

interface SidebarProps {
  directList: DirectConversationItem[];
  groupList: GroupItem[];
  activeTarget: ActiveTarget;
  isLoading: boolean;
  onSelectTarget: (target: ActiveTarget) => void;
  onOpenCreateChat: () => void;
  onOpenCreateGroup: () => void;
  onOpenProfile: () => void;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;

  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  directList,
  groupList,
  activeTarget,
  isLoading,
  onSelectTarget,
  onOpenCreateChat,
  onOpenCreateGroup,
  onOpenProfile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">(
    "all",
  );

  // Filter direct chats
  const filteredDirect = directList.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.other_user.name.toLowerCase().includes(q) ||
      item.other_user.email.toLowerCase().includes(q) ||
      item.last_message?.message.toLowerCase().includes(q)
    );
  });

  // Filter groups
  const filteredGroups = groupList.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return item.name.toLowerCase().includes(q);
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-slate-50/70 dark:bg-slate-900/70 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
      {/* User profile & actions banner */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 backdrop-blur-sm flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left group p-1 -m-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <div className="relative">
            <Avatar
              name={user?.name}
              email={user?.email}
              avatarUrl={user?.avatar_url}
              size="md"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {user?.name || "User"}
              </span>
              {user?.role === "admin" && (
                <ShieldIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[130px]">
              {user?.email}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <button
          type="button"
          onClick={onOpenCreateChat}
          className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
        <button
          type="button"
          onClick={onOpenCreateGroup}
          className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
        >
          <UsersIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>New Group</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 pb-2 flex gap-1 text-[11px] font-medium border-b border-slate-200/60 dark:border-slate-800/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === "all"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          All ({directList.length + groupList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("direct")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === "direct"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Direct ({directList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            activeTab === "groups"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Groups ({groupList.length})
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
            <Loader2Icon className="w-5 h-5 text-indigo-500 animate-spin mb-2" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : (
          <>
            {/* Direct Conversations */}
            {(activeTab === "all" || activeTab === "direct") && (
              <>
                {activeTab === "all" && filteredDirect.length > 0 && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Direct Messages
                  </p>
                )}
                {filteredDirect.map((conv) => {
                  const isActive =
                    activeTarget?.type === "direct" &&
                    activeTarget.recipientEmail.toLowerCase() ===
                      conv.other_user.email.toLowerCase();

                  return (
                    <button
                      key={conv.conversation_id}
                      type="button"
                      onClick={() =>
                        onSelectTarget({
                          type: "direct",
                          recipientEmail: conv.other_user.email,
                          recipientName: conv.other_user.name,
                          avatarUrl: conv.other_user.avatar_url,
                        })
                      }
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-500/30"
                          : "hover:bg-white dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Avatar
                        name={conv.other_user.name}
                        email={conv.other_user.email}
                        avatarUrl={conv.other_user.avatar_url}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                            {conv.other_user.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(
                              conv.last_message?.created_at || conv.updated_at,
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {conv.last_message?.message || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Group Channels */}
            {(activeTab === "all" || activeTab === "groups") && (
              <>
                {activeTab === "all" && filteredGroups.length > 0 && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Group Channels
                  </p>
                )}
                {filteredGroups.map((group) => {
                  const resolvedGroupId = group.group_id || group.id;
                  const isActive =
                    activeTarget?.type === "group" &&
                    activeTarget.groupId === resolvedGroupId;

                  return (
                    <button
                      key={resolvedGroupId}
                      type="button"
                      onClick={() =>
                        onSelectTarget({
                          type: "group",
                          groupId: resolvedGroupId,
                          groupName: group.name,
                          memberCount: group.member_count,
                        })
                      }
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-slate-900 dark:text-slate-100 ring-1 ring-indigo-500/30"
                          : "hover:bg-white dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Avatar name={group.name} isGroup size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                            {group.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(
                              group.updated_at || group.created_at,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <UsersIcon className="w-3 h-3" />
                          <span>{group.member_count} members</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Empty state */}
            {filteredDirect.length === 0 && filteredGroups.length === 0 && (
              <div className="py-12 px-4 text-center text-slate-400">
                <MessageSquareIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No conversations yet
                </p>
                <p className="text-[11px] mt-1">
                  Start a direct chat or create a group to begin messaging.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
