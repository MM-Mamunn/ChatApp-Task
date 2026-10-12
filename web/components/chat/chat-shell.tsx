"use client";

import React, { useState, useEffect, useCallback } from "react";
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
        () => {
          // A group message was sent; refresh conversation list
          refreshConversations();
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
    setActiveTarget({
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
    setActiveTarget({
      type: "group",
      groupId: resolvedGroupId,
      groupName: group.name,
      memberCount: group.member_count,
    });
    refreshConversations();
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
          onSelectTarget={(target) => setActiveTarget(target)}
          onOpenCreateChat={() => setIsCreateChatOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
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
          onBackToSidebar={() => setActiveTarget(null)}
          onMessageSentSuccess={() => refreshConversations()}
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
