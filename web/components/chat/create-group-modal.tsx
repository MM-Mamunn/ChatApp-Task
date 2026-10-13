"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, type GroupItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
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
        handleClose();
      } else {
        setError(res.error?.message || "Failed to create group channel");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        maxWidth="max-w-lg"
        className="p-0 flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <DialogTitle>Create Group Channel</DialogTitle>
              <DialogDescription>
                Collaborate with multiple team members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleCreateGroup}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-5 space-y-4 border-b border-border">
            {/* Group Name input */}
            <div>
              <label
                htmlFor="group-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Group Name
              </label>
              <Input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Engineering Sync, Project Alpha"
                maxLength={128}
                required
                autoFocus
              />
            </div>

            {/* Selected members chip list */}
            {selectedEmails.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Selected Participants ({selectedEmails.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-muted/40 rounded-xl border border-border">
                  {selectedEmails.map((email) => {
                    const member = availableUsers.find(
                      (u) => u.email === email,
                    );
                    return (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="gap-1 pl-2.5 pr-1 py-1"
                      >
                        <span className="font-medium truncate max-w-[140px]">
                          {member?.name || email}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSelectEmail(email)}
                          className="p-0.5 hover:bg-muted rounded-md transition-colors cursor-pointer"
                          aria-label={`Remove ${member?.name || email}`}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search member input */}
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter users to invite..."
                aria-label="Filter users to invite"
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-5 mt-3">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Available Users List */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[180px] max-h-[260px]">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2Icon className="w-5 h-5 animate-spin text-primary mr-2" />
                <span className="text-xs">Loading contacts...</span>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">
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
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <div
                        className={`size-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {isSelected && <CheckIcon className="size-3.5" />}
                      </div>
                      <Avatar
                        name={item.name}
                        email={item.email}
                        avatarUrl={item.avatar_url}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
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
          <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              You will be added as group creator
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || selectedEmails.length === 0}
                isLoading={isSubmitting}
              >
                <span>Create Channel</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
