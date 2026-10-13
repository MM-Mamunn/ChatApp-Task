"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { type DirectConversationItem, type GroupItem } from "@/lib/api-client";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyIcon,
  EmptyTitle,
  EmptyDescription,
  EmptyAction,
} from "../ui/empty";
import {
  MessageSquareIcon,
  UsersIcon,
  PlusIcon,
  SearchIcon,
  LogOutIcon,
  ShieldIcon,
  Loader2Icon,
} from "../ui/icons";
import { ThemeToggle } from "../ui/theme-toggle";

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
      creatorEmail?: string;
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
  onOpenAdmin?: () => void;
  unseenDirectEmails?: Set<string>;
  unseenGroupIds?: Set<string>;
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
  onOpenAdmin,
  unseenDirectEmails,
  unseenGroupIds,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">(
    "all",
  );

  const totalUnseenDirect = unseenDirectEmails?.size ?? 0;
  const totalUnseenGroups = unseenGroupIds?.size ?? 0;
  const totalUnseen = totalUnseenDirect + totalUnseenGroups;

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
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full min-h-0 bg-sidebar/95 border-r border-sidebar-border shrink-0 select-none overflow-hidden transition-colors">
      {/* User profile & actions banner */}
      <div className="p-3.5 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-md flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left group p-1 -m-1 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative">
            <Avatar
              name={user?.name}
              email={user?.email}
              avatarUrl={user?.avatar_url}
              size="md"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                {user?.name || "User"}
              </span>
              {user?.role === "admin" && (
                <ShieldIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[130px]">
              {user?.email}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <ThemeToggle variant="compact" />
          {user?.role === "admin" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenAdmin}
              title="Open Admin Oversight Console"
              aria-label="Open Admin Oversight Console"
              className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <ShieldIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOutIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Admin Menu Entry (Rendered STRICTLY for admin users) */}
      {user?.role === "admin" && (
        <div className="px-3 pt-2.5 pb-0.5">
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Open Admin Console"
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 hover:to-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Admin Console</span>
            </div>
            <Badge
              variant="warning"
              className="text-[10px] py-0 px-1.5 font-bold tracking-wider uppercase"
            >
              Admin
            </Badge>
          </button>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-sidebar-border">
        <Button
          type="button"
          onClick={onOpenCreateChat}
          size="sm"
          className="shadow-sm font-semibold"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </Button>
        <Button
          type="button"
          onClick={onOpenCreateGroup}
          variant="outline"
          size="sm"
          className="font-semibold bg-background/50 hover:bg-sidebar-accent"
        >
          <UsersIcon className="w-3.5 h-3.5 text-primary" />
          <span>New Group</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div
        role="tablist"
        aria-label="Conversation category filters"
        className="px-3 pb-2 flex gap-1 text-[11px] font-medium border-b border-sidebar-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer relative ${
            activeTab === "all"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <span>All ({directList.length + groupList.length})</span>
          {totalUnseen > 0 && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1.5 mb-0.5 align-middle"
              aria-label={`${totalUnseen} unseen conversations`}
            />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "direct"}
          onClick={() => setActiveTab("direct")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer relative ${
            activeTab === "direct"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <span>Direct ({directList.length})</span>
          {totalUnseenDirect > 0 && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1.5 mb-0.5 align-middle"
              aria-label={`${totalUnseenDirect} unseen direct conversations`}
            />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "groups"}
          onClick={() => setActiveTab("groups")}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer relative ${
            activeTab === "groups"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <span>Groups ({groupList.length})</span>
          {totalUnseenGroups > 0 && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1.5 mb-0.5 align-middle"
              aria-label={`${totalUnseenGroups} unseen groups`}
            />
          )}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 space-y-1">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <Loader2Icon className="w-5 h-5 text-primary animate-spin mb-2" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : (
          <>
            {/* Direct Conversations */}
            {(activeTab === "all" || activeTab === "direct") && (
              <>
                {activeTab === "all" && filteredDirect.length > 0 && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Direct Messages
                  </p>
                )}
                {filteredDirect.map((conv, index) => {
                  const isActive =
                    activeTarget?.type === "direct" &&
                    activeTarget.recipientEmail.toLowerCase() ===
                      conv.other_user.email.toLowerCase();
                  const isUnseen =
                    !isActive &&
                    (unseenDirectEmails?.has(
                      conv.other_user.email.toLowerCase(),
                    ) ??
                      false);
                  const itemKey =
                    conv.conversation_id ||
                    conv.other_user.email ||
                    `direct-${index}`;

                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() =>
                        onSelectTarget({
                          type: "direct",
                          recipientEmail: conv.other_user.email,
                          recipientName: conv.other_user.name,
                          avatarUrl: conv.other_user.avatar_url,
                        })
                      }
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer relative ${
                        isActive
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : isUnseen
                            ? "bg-primary/5 hover:bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-xs"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          name={conv.other_user.name}
                          email={conv.other_user.email}
                          avatarUrl={conv.other_user.avatar_url}
                          size="md"
                        />
                        {isUnseen && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-sidebar shadow-xs"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              isUnseen
                                ? "font-bold text-foreground"
                                : "font-semibold text-sidebar-foreground"
                            }`}
                          >
                            {conv.other_user.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] shrink-0 ${
                                isUnseen
                                  ? "text-primary font-semibold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatRelativeTime(
                                conv.last_message?.created_at ||
                                  conv.updated_at,
                              )}
                            </span>
                            {isUnseen && (
                              <span
                                className="w-2 h-2 rounded-full bg-primary shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-[11px] truncate ${
                              isUnseen
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {conv.last_message?.message || "No messages yet"}
                          </p>
                          {isUnseen && (
                            <span className="sr-only">Unseen message</span>
                          )}
                        </div>
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
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Group Channels
                  </p>
                )}
                {filteredGroups.map((group, index) => {
                  const resolvedGroupId =
                    group.group_id || group.id || `group-${index}`;
                  const isActive =
                    activeTarget?.type === "group" &&
                    activeTarget.groupId.toLowerCase() ===
                      resolvedGroupId.toLowerCase();
                  const isUnseen =
                    !isActive &&
                    (unseenGroupIds?.has(resolvedGroupId.toLowerCase()) ??
                      false);

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
                          creatorEmail: group.creator_email || group.created_by,
                        })
                      }
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer relative ${
                        isActive
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : isUnseen
                            ? "bg-primary/5 hover:bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-xs"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar name={group.name} isGroup size="md" />
                        {isUnseen && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-sidebar shadow-xs"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              isUnseen
                                ? "font-bold text-foreground"
                                : "font-semibold text-sidebar-foreground"
                            }`}
                          >
                            {group.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] shrink-0 ${
                                isUnseen
                                  ? "text-primary font-semibold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatRelativeTime(
                                group.updated_at || group.created_at,
                              )}
                            </span>
                            {isUnseen && (
                              <span
                                className="w-2 h-2 rounded-full bg-primary shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <div
                            className={`flex items-center gap-1.5 text-[11px] ${
                              isUnseen
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            <UsersIcon
                              className={`w-3 h-3 ${
                                isUnseen ? "text-primary" : ""
                              }`}
                            />
                            <span>{group.member_count} members</span>
                          </div>
                          {isUnseen && (
                            <span className="sr-only">Unseen message</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Empty state using shadcn Empty component */}
            {filteredDirect.length === 0 && filteredGroups.length === 0 && (
              <Empty className="my-8 mx-2 border-none">
                <EmptyIcon className="bg-primary/10 text-primary">
                  <MessageSquareIcon className="w-6 h-6" />
                </EmptyIcon>
                <EmptyTitle>No conversations found</EmptyTitle>
                <EmptyDescription>
                  {filterQuery
                    ? "No matches found for your search query. Try clearing the filter."
                    : "Start a direct conversation or create a group channel to begin chatting."}
                </EmptyDescription>
                {!filterQuery && (
                  <EmptyAction>
                    <Button
                      type="button"
                      size="sm"
                      onClick={onOpenCreateChat}
                      className="gap-1.5"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Start Chatting</span>
                    </Button>
                  </EmptyAction>
                )}
              </Empty>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
