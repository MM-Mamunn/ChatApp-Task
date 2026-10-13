"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AdminModal } from "@/components/admin/admin-modal";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  ShieldIcon,
  ArrowLeftIcon,
  Loader2Icon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2Icon className="size-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="flex flex-col items-center pb-2">
            <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 border border-destructive/20">
              <AlertTriangleIcon className="size-6" />
            </div>
            <CardTitle className="text-base font-bold">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              You must have an{" "}
              <strong className="text-foreground">admin</strong> role to access
              the Admin Console.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <ArrowLeftIcon className="size-4" />
              <span>Return to Chat</span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // User is authenticated and role is admin
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Return Navigation Bar */}
      <div className="px-6 py-3 bg-card border-b border-border flex items-center justify-between">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Back to Chat Application</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <ShieldIcon className="size-4 text-amber-500" />
          <Badge variant="warning" className="text-xs font-bold gap-1">
            <span>Admin Mode</span>
            <span className="font-normal opacity-80">({user.email})</span>
          </Badge>
        </div>
      </div>

      {/* Render Admin Console modal in open mode */}
      <AdminModal isOpen={true} onClose={() => router.push("/chat")} />
    </div>
  );
}
