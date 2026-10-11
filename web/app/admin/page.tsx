"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AdminModal } from "@/components/admin/admin-modal";
import {
  ShieldIcon,
  ArrowLeftIcon,
  Loader2Icon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2Icon className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            Verifying administrative privileges...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Graceful RBAC protection if user is not admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Access Restricted
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You must have an <strong>admin</strong> role to access the Admin
              Console.
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Return to Chat</span>
          </Link>
        </div>
      </div>
    );
  }

  // User is authenticated and role is admin
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Return Navigation Bar */}
      <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to Chat Application</span>
        </Link>

        <div className="flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Admin Mode ({user.email})
          </span>
        </div>
      </div>

      {/* Render Admin Console modal in open mode */}
      <AdminModal isOpen={true} onClose={() => router.push("/chat")} />
    </div>
  );
}
