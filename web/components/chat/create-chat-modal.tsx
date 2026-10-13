"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import { SearchIcon, Loader2Icon } from "../ui/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Empty, EmptyTitle, EmptyDescription } from "../ui/empty";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        maxWidth="max-w-md"
        className="p-0 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <DialogTitle>New Direct Conversation</DialogTitle>
          <DialogDescription>
            Search for a colleague or user to start chatting
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search users by name or email"
              autoFocus
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-3">
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[220px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="w-6 h-6 animate-spin text-primary mb-2" />
              <span className="text-xs">Finding users...</span>
            </div>
          ) : users.length === 0 ? (
            <Empty className="py-8 border-none min-h-[180px]">
              <EmptyTitle className="text-sm font-medium">
                No users found
              </EmptyTitle>
              <EmptyDescription className="text-xs">
                Try adjusting your search criteria
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-1">
              {users.map((item) => (
                <button
                  key={item.id || item.email}
                  type="button"
                  disabled={isStarting}
                  onClick={() => handleStartChat(item)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent text-left group disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Avatar
                    name={item.name}
                    email={item.email}
                    avatarUrl={item.avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.email}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Chat →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
