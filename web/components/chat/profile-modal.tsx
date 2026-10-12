"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "../ui/avatar";
import { XIcon, Loader2Icon, ShieldIcon, CheckIcon } from "../ui/icons";

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !user) return null;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2
                id="profile-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                User Profile
              </h2>
              <p className="text-xs text-slate-500">
                View account details and update your info
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* User Badge Info */}
            <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <Avatar
                name={name || user.name}
                email={user.email}
                avatarUrl={avatarUrl.trim() || undefined}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {name || user.name}
                  </p>
                  {user.role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <ShieldIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Status Alert */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="font-bold shrink-0">!</span>
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Input fields */}
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={128}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="profile-avatar"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Avatar URL (Optional)
              </label>
              <input
                id="profile-avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/30"
              >
                {isSubmitting && <Loader2Icon className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
