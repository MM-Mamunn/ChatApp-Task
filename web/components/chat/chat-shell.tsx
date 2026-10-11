"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
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

export function ChatShell() {
  const { isAuthenticated } = useAuth();

  const [directList, setDirectList] = useState<DirectConversationItem[]>([]);
  const [groupList, setGroupList] = useState<GroupItem[]>([]);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  // Modals
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

    // Auto-refresh conversations periodically (every 4 seconds) to detect incoming messages
    const interval = setInterval(() => {
      refreshConversations();
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshConversations]);

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
    setActiveTarget({
      type: "group",
      groupId: group.id,
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
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
