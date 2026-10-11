"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { ChatShell } from "@/components/chat/chat-shell";
import { AuthCard } from "@/components/auth/auth-card";
import { Loader2Icon } from "@/components/ui/icons";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2Icon className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            Loading chat application...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <ChatShell />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <AuthCard />
    </div>
  );
}
