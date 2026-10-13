"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { formatHttpStatus } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  MessageSquareIcon,
  ShieldIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

interface AuthCardProps {
  onSuccess?: () => void;
}

interface AuthErrorState {
  statusText?: string | null;
  message: string;
  details?: Array<{ field?: string; issue: string }>;
}

export function AuthCard({ onSuccess }: AuthCardProps) {
  const { login, register } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorState | null>(null);
  const [dismissedUrlError, setDismissedUrlError] = useState(false);

  // Derive OAuth error from URL search params (e.g. /login?error=oauth_cancelled) without cascading render
  const errorParam = searchParams.get("error");
  const urlOAuthError: AuthErrorState | null =
    errorParam && !dismissedUrlError
      ? {
          statusText: "OAuth Notice",
          message:
            {
              oauth_cancelled: "Google sign-in was cancelled.",
              missing_code: "OAuth authorization code was missing.",
              oauth_exchange_failed:
                "Failed to verify credentials with Google.",
            }[errorParam] || decodeURIComponent(errorParam),
        }
      : null;

  const currentError = authError || urlOAuthError;

  const clearErrors = () => {
    setAuthError(null);
    setDismissedUrlError(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Client-side validation with explicit 400 status formatting
    if (!email.trim() || !password) {
      setAuthError({
        statusText: "400 (Bad Request)",
        message:
          !email.trim() && !password
            ? "Please enter your email address and password."
            : !email.trim()
              ? "Please enter your email address."
              : "Please enter your password.",
      });
      return;
    }

    if (mode === "register" && !name.trim()) {
      setAuthError({
        statusText: "400 (Bad Request)",
        message: "Please enter your full name.",
      });
      return;
    }

    if (mode === "register" && password.length < 8) {
      setAuthError({
        statusText: "400 (Bad Request)",
        message: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login({ email: email.trim(), password });
        if (!result.success) {
          const statusText =
            result.status && result.status > 0
              ? formatHttpStatus(result.status)
              : result.code === "NETWORK_ERROR" || result.status === 0
                ? "Network Error"
                : "401 (Unauthorized)";

          let message = result.error || "Invalid email or password.";
          if (result.status === 0 || result.code === "NETWORK_ERROR") {
            message =
              "Unable to reach the authentication server. Please check your network connection and try again.";
          } else if (result.status === 500) {
            message =
              "An unexpected server error occurred. Please try again later.";
          } else if (result.details && result.details.length > 0) {
            const first = result.details[0];
            if (first?.issue) {
              message = first.field
                ? `${first.field}: ${first.issue}`
                : first.issue;
            }
          }

          setAuthError({
            statusText,
            message,
            details: result.details,
          });
        } else {
          onSuccess?.();
        }
      } else {
        const result = await register({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (!result.success) {
          const statusText =
            result.status && result.status > 0
              ? formatHttpStatus(result.status)
              : result.code === "NETWORK_ERROR" || result.status === 0
                ? "Network Error"
                : "400 (Bad Request)";

          let message = result.error || "Failed to create account.";
          if (result.status === 0 || result.code === "NETWORK_ERROR") {
            message =
              "Unable to reach the authentication server. Please check your network connection and try again.";
          } else if (result.status === 500) {
            message =
              "An unexpected server error occurred. Please try again later.";
          } else if (result.details && result.details.length > 0) {
            const first = result.details[0];
            if (first?.issue) {
              message = first.field
                ? `${first.field}: ${first.issue}`
                : first.issue;
            }
          }

          setAuthError({
            statusText,
            message,
            details: result.details,
          });
        } else {
          onSuccess?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (
    accountEmail: string,
    accountPass: string,
    accountName?: string,
  ) => {
    setMode("login");
    setEmail(accountEmail);
    setPassword(accountPass);
    if (accountName) setName(accountName);
    clearErrors();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-border bg-card shadow-2xl backdrop-blur-xl">
        {/* Brand header */}
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <MessageSquareIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  ChatApp
                </CardTitle>
                <CardDescription className="text-xs">
                  Authenticated Realtime Messaging
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono tracking-wide"
            >
              v1.0
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error notification using shadcn Alert */}
          <AnimatePresence>
            {currentError && (
              <motion.div
                key="auth-error-banner"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="mb-2">
                  <AlertTriangleIcon className="size-4" />
                  <div className="space-y-1">
                    {currentError.statusText && (
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="destructive"
                          className="text-[10px] font-mono px-1.5 py-0"
                        >
                          {currentError.statusText}
                        </Badge>
                      </div>
                    )}
                    <AlertTitle className="text-xs font-medium">
                      {currentError.message}
                    </AlertTitle>
                    {currentError.details &&
                      currentError.details.length > 0 && (
                        <AlertDescription>
                          <ul className="text-[11px] list-disc list-inside space-y-0.5 pt-0.5">
                            {currentError.details.map((detail, idx) => (
                              <li key={idx}>
                                {detail.field ? (
                                  <span className="font-semibold">
                                    {detail.field}:{" "}
                                  </span>
                                ) : null}
                                {detail.issue}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      )}
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google OAuth action */}
          <GoogleSignInButton
            disabled={isSubmitting}
            onError={(msg) =>
              setAuthError({
                statusText: "OAuth Error",
                message: msg,
              })
            }
          />

          {/* Visual Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <span className="relative bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              or continue with email
            </span>
          </div>

          {/* Mode switch tabs */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 p-1 bg-muted rounded-xl text-sm font-medium"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => {
                setMode("login");
                clearErrors();
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => {
                setMode("register");
                clearErrors();
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-foreground"
                >
                  Full name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-foreground"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {mode === "register" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Must be at least 8 characters long.
                </p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full mt-2 font-semibold shadow-md shadow-indigo-600/20"
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </CardContent>

        <Separator />

        {/* Fast quick-test credentials selector */}
        <CardFooter className="flex-col items-start pt-6 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Quick-fill seed test accounts:
          </p>
          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              type="button"
              aria-label="Quick-fill Admin test account (admin role)"
              onClick={() =>
                fillQuickAccount(
                  "admin1@example.com",
                  "admin1@example.com",
                  "Admin",
                )
              }
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border hover:border-amber-400 dark:hover:border-amber-500 bg-muted/50 hover:bg-amber-500/10 transition-all group cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <ShieldIcon className="size-3.5 text-amber-500" />
                <span>Admin</span>
              </div>
              <Badge variant="warning" className="text-[9px] px-1 py-0 mt-1">
                Admin
              </Badge>
            </button>

            <button
              type="button"
              aria-label="Quick-fill User 1 test account (user role)"
              onClick={() =>
                fillQuickAccount(
                  "user1@example.com",
                  "user1@example.com",
                  "User 1",
                )
              }
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border hover:border-indigo-400 dark:hover:border-indigo-500 bg-muted/50 hover:bg-indigo-500/10 transition-all group cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <UserIcon className="size-3.5 text-indigo-500" />
                <span>User 1</span>
              </div>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">
                User
              </Badge>
            </button>

            <button
              type="button"
              aria-label="Quick-fill User 2 test account (user role)"
              onClick={() =>
                fillQuickAccount(
                  "user2@example.com",
                  "user2@example.com",
                  "User 2",
                )
              }
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border hover:border-indigo-400 dark:hover:border-indigo-500 bg-muted/50 hover:bg-indigo-500/10 transition-all group cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <UserIcon className="size-3.5 text-sky-500" />
                <span>User 2</span>
              </div>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">
                User
              </Badge>
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
