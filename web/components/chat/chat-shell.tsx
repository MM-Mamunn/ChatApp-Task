"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  apiClient,
  type DirectConversationItem,
  type GroupItem,
} from "@/lib/api-client";
import { Sidebar, type ActiveTarget } from "./sidebar";
import { ChatPane } from "./chat-pane";
import { CreateChatModal } from "./create-chat-modal";
import { CreateGroupModal } from "./create-group-modal";
import { ProfileModal } from "./profile-modal";
import { AdminModal } from "../admin/admin-modal";

export function ChatShell() {
  const { user, isAuthenticated } = useAuth();

  const [directList, setDirectList] = useState<DirectConversationItem[]>([]);
  const [groupList, setGroupList] = useState<GroupItem[]>([]);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  // Unseen message tracking for the current UI session
  const [unseenDirect, setUnseenDirect] = useState<Set<string>>(
    () => new Set(),
  );
  const [unseenGroups, setUnseenGroups] = useState<Set<string>>(
    () => new Set(),
  );

  // Refs for tracking latest target and group membership inside Realtime events
  const activeTargetRef = useRef<ActiveTarget>(activeTarget);
  useEffect(() => {
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  const groupListRef = useRef<GroupItem[]>(groupList);
  useEffect(() => {
    groupListRef.current = groupList;
  }, [groupList]);

  // Select a target and immediately clear its unseen state
  const handleSelectTarget = useCallback((target: ActiveTarget) => {
    activeTargetRef.current = target;
    setActiveTarget(target);

    if (!target) return;

    if (target.type === "direct") {
      const email = target.recipientEmail.toLowerCase();
      setUnseenDirect((prev) => {
        if (!prev.has(email)) return prev;
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    } else if (target.type === "group") {
      const gId = target.groupId.toLowerCase();
      setUnseenGroups((prev) => {
        if (!prev.has(gId)) return prev;
        const next = new Set(prev);
        next.delete(gId);
        return next;
      });
    }
  }, []);

  // Modals
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Fetch conversation lists
  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [directRes, groupRes] = await Promise.all([
        apiClient.listDirectConversations(),
        apiClient.listGroups(),
      ]);

      if (directRes.success && directRes.data) {
        setDirectList(directRes.data);
      }
      if (groupRes.success && groupRes.data) {
        setGroupList(groupRes.data);
      }
    } catch {
      // Ignore background refresh errors
    } finally {
      setIsLoadingLists(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        refreshConversations();
      }
    });

    return () => {
      active = false;
    };
  }, [refreshConversations]);

  // Supabase Realtime subscription for live conversation list updates
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const userEmail = user.email.toLowerCase();
    const channelName = `inbox:${userEmail}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const row = payload.new as {
            sender_email?: string;
            receiver_email?: string;
          };
          if (!row) return;
          const sender = (row.sender_email || "").toLowerCase();
          const receiver = (row.receiver_email || "").toLowerCase();

          // Refresh conversation list if user is sender or receiver
          if (sender === userEmail || receiver === userEmail) {
            refreshConversations();

            // Incoming direct message sent to current user by someone else
            if (receiver === userEmail && sender !== userEmail) {
              const currentActive = activeTargetRef.current;
              const isCurrentlyActive =
                currentActive?.type === "direct" &&
                currentActive.recipientEmail.toLowerCase() === sender;

              if (!isCurrentlyActive) {
                setUnseenDirect((prev) => {
                  const next = new Set(prev);
                  next.add(sender);
                  return next;
                });
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
        },
        (payload) => {
          const row = payload.new as {
            group_id?: string;
            sender_email?: string;
          };
          if (!row || !row.group_id) return;

          const sender = (row.sender_email || "").toLowerCase();
          const groupId = row.group_id.toLowerCase();

          // A group message was sent; refresh conversation list
          refreshConversations();

          // Incoming message from another user in a group the current user belongs to
          if (sender !== userEmail) {
            const isMember = groupListRef.current.some((g) => {
              const id = (g.group_id || g.id || "").toLowerCase();
              return id === groupId;
            });

            if (isMember) {
              const currentActive = activeTargetRef.current;
              const isCurrentlyActive =
                currentActive?.type === "group" &&
                currentActive.groupId.toLowerCase() === groupId;

              if (!isCurrentlyActive) {
                setUnseenGroups((prev) => {
                  const next = new Set(prev);
                  next.add(groupId);
                  return next;
                });
              }
            }
          }
        },
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.email, refreshConversations]);

  // When a new conversation is started via CreateChatModal
  const handleDirectConversationStarted = (recipient: {
    email: string;
    name: string;
    avatarUrl?: string | null;
  }) => {
    handleSelectTarget({
      type: "direct",
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      avatarUrl: recipient.avatarUrl,
    });
    refreshConversations();
  };

  // When a new group is created via CreateGroupModal
  const handleGroupCreated = (group: GroupItem) => {
    const resolvedGroupId = group.group_id || group.id;
    handleSelectTarget({
      type: "group",
      groupId: resolvedGroupId,
      groupName: group.name,
      memberCount: group.member_count,
      creatorEmail: group.creator_email || group.created_by,
    });
    refreshConversations();
  };

  // Immediate UI update when members are added to a group
  const handleGroupUpdated = (groupId: string, newMemberCount: number) => {
    setGroupList((prev) =>
      prev.map((g) =>
        (g.group_id || g.id) === groupId
          ? { ...g, member_count: newMemberCount }
          : g,
      ),
    );
    setActiveTarget((prev) =>
      prev && prev.type === "group" && prev.groupId === groupId
        ? { ...prev, memberCount: newMemberCount }
        : prev,
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Sidebar: Visible on desktop, or on mobile when no conversation is active */}
      <div
        className={`h-full ${activeTarget ? "hidden md:flex" : "flex w-full"}`}
      >
        <Sidebar
          directList={directList}
          groupList={groupList}
          activeTarget={activeTarget}
          isLoading={isLoadingLists}
          onSelectTarget={handleSelectTarget}
          onOpenCreateChat={() => setIsCreateChatOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          unseenDirectEmails={unseenDirect}
          unseenGroupIds={unseenGroups}
        />
      </div>

      {/* Chat Pane: Visible on desktop, or on mobile when conversation is active */}
      <div
        className={`h-full flex-1 min-w-0 ${
          activeTarget ? "flex" : "hidden md:flex"
        }`}
      >
        <ChatPane
          activeTarget={activeTarget}
          onBackToSidebar={() => handleSelectTarget(null)}
          onMessageSentSuccess={() => refreshConversations()}
          onGroupUpdated={handleGroupUpdated}
        />
      </div>

      {/* Modals */}
      <CreateChatModal
        isOpen={isCreateChatOpen}
        onClose={() => setIsCreateChatOpen(false)}
        onConversationStarted={handleDirectConversationStarted}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      <ProfileModal
        key={`${user?.email}-${user?.avatar_url}-${isProfileOpen}`}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {user?.role === "admin" && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}
