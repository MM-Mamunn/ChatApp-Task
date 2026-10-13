"use client";

import React, { useState, useCallback } from "react";
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
  DialogFooter,
} from "../ui/dialog";
import { ShieldIcon, CheckIcon } from "../ui/icons";
import { ThemeToggle } from "../ui/theme-toggle";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleClose = useCallback(() => {
    setStatusMessage(null);
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatar_url || "");
    }
    onClose();
  }, [onClose, user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatusMessage({
        type: "error",
        text: "Display name cannot be empty.",
      });
      return;
    }

    const trimmedAvatar = avatarUrl.trim();
    const finalAvatar = trimmedAvatar.length > 0 ? trimmedAvatar : null;

    setIsSubmitting(true);

    try {
      const res = await updateProfile({
        name: trimmedName,
        avatar_url: finalAvatar,
        avatarUrl: finalAvatar,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to update profile",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "An unexpected error occurred while saving profile",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent maxWidth="max-w-md" className="p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            View account details and update your display information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* User Badge Info with live avatar */}
          <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
            <Avatar
              name={name || user.name}
              email={user.email}
              avatarUrl={avatarUrl.trim() || undefined}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {name || user.name}
                </p>
                {user.role === "admin" && (
                  <Badge
                    variant="warning"
                    className="text-[10px] py-0 px-1.5 shrink-0"
                  >
                    <ShieldIcon className="size-3" />
                    <span>Admin</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <Alert
              variant={
                statusMessage.type === "success" ? "success" : "destructive"
              }
              className="py-2.5 px-3.5"
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === "success" ? (
                  <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="font-bold shrink-0">!</span>
                )}
                <AlertDescription className="text-xs">
                  {statusMessage.text}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Input fields */}
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Display Name
            </label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-avatar"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Avatar URL (Optional)
            </label>
            <Input
              id="profile-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          {/* Theme Preference Setting */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Theme Preference
              </p>
              <p className="text-[11px] text-muted-foreground">
                Switch between Light and Dark interface
              </p>
            </div>
            <ThemeToggle variant="pill" />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
