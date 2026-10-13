"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, type GroupMemberItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "../ui/empty";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        maxWidth="max-w-lg"
        className="p-0 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <DialogTitle>{groupName}</DialogTitle>
              <DialogDescription>
                {members.length} {members.length === 1 ? "member" : "members"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation Tabs (Visible when user is creator) */}
        {isCreator && (
          <div className="px-6 pt-2 pb-0 border-b border-border flex items-center gap-2 bg-muted/20 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("members");
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === "members"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UsersIcon className="size-4" />
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
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusIcon className="size-4" />
              <span>Add Member</span>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Feedback alert banner */}
          {feedback && (
            <div className="mb-4">
              <Alert
                variant={
                  feedback.type === "success" ? "success" : "destructive"
                }
                className="flex items-center justify-between py-2 px-3"
              >
                <div className="flex items-center gap-2">
                  {feedback.type === "success" ? (
                    <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XIcon className="size-4 shrink-0 text-destructive" />
                  )}
                  <AlertDescription className="text-xs">
                    {feedback.message}
                  </AlertDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
                  aria-label="Dismiss feedback"
                >
                  <XIcon className="size-3.5" />
                </button>
              </Alert>
            </div>
          )}

          {/* TAB 1: VIEW MEMBERS */}
          {activeTab === "members" && (
            <div className="space-y-3">
              {isLoadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2Icon className="size-7 animate-spin text-primary mb-2" />
                  <p className="text-xs">Loading group members...</p>
                </div>
              ) : membersError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-destructive mb-3">
                    {membersError}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadMembers()}
                  >
                    Retry
                  </Button>
                </div>
              ) : members.length === 0 ? (
                <Empty className="py-8 border-none">
                  <EmptyIcon className="size-10 bg-muted text-muted-foreground">
                    <UserIcon className="size-5" />
                  </EmptyIcon>
                  <EmptyTitle className="text-sm">No members found</EmptyTitle>
                  <EmptyDescription>
                    No members exist in this group channel.
                  </EmptyDescription>
                </Empty>
              ) : (
                <div className="divide-y divide-border">
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
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {member.name || member.email}
                            </h4>
                            {member.is_creator && (
                              <Badge
                                variant="warning"
                                className="text-[10px] py-0 px-1.5 shrink-0"
                              >
                                <ShieldIcon className="size-3" />
                                <span>Creator</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-muted-foreground">
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
                <div className="pt-4 mt-2 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab("add")}
                    className="gap-1.5"
                  >
                    <PlusIcon className="size-3.5" />
                    <span>Add Member</span>
                  </Button>
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
                  className="block text-xs font-semibold text-foreground mb-1.5"
                >
                  Search Users to Add
                </label>
                <div className="relative">
                  <SearchIcon className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="candidate-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email address..."
                    aria-label="Search users to add to group"
                    autoFocus
                    className="pl-9 pr-9"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Candidates List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Available Users
                </span>

                {isLoadingCandidates ? (
                  <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2Icon className="size-6 animate-spin text-primary mb-2" />
                    <p className="text-xs">Searching users...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <Empty className="py-8 border-dashed">
                    <EmptyIcon className="size-10 bg-muted text-muted-foreground">
                      <UserIcon className="size-5" />
                    </EmptyIcon>
                    <EmptyTitle className="text-xs font-medium">
                      {search.trim()
                        ? `No users found matching "${search}"`
                        : "No users available to add."}
                    </EmptyTitle>
                  </Empty>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card">
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
                          className="p-3 flex items-center justify-between gap-3 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              name={candidate.name || candidate.email}
                              email={candidate.email}
                              avatarUrl={candidate.avatar_url}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {candidate.name || candidate.email}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {candidate.email}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAlreadyMember ? (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <CheckIcon className="size-3" />
                                <span>Already a member</span>
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                size="xs"
                                onClick={() => handleAddMember(candidate)}
                                disabled={isAdding}
                                isLoading={isAdding}
                                aria-label={`Add ${candidate.name || candidate.email} to group`}
                              >
                                {!isAdding && (
                                  <PlusIcon className="size-3 mr-1" />
                                )}
                                <span>Add</span>
                              </Button>
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
        <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {isCreator
              ? "You are the creator of this group."
              : "You are a member of this group."}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
