"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  MessageSquareIcon,
  ShieldIcon,
  UserIcon,
} from "../ui/icons";

interface AuthCardProps {
  onSuccess?: () => void;
}

export function AuthCard({ onSuccess }: AuthCardProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please provide both email and password.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login({ email: email.trim(), password });
        if (!result.success) {
          setErrorMessage(result.error || "Invalid email or password.");
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
          setErrorMessage(result.error || "Failed to create account.");
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
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <MessageSquareIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ChatApp
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authenticated Realtime Messaging
            </p>
          </div>
        </div>

        {/* Mode switch tabs */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 p-1 mb-6 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-sm font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Error notification */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5"
            >
              <span className="shrink-0 mt-0.5 font-bold">!</span>
              <p className="flex-1 leading-snug">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            {mode === "register" && (
              <p className="text-[11px] text-slate-500 mt-1">
                Must be at least 8 characters long.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="w-4 h-4" />
                <span>
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              </>
            ) : (
              <span>{mode === "login" ? "Sign in" : "Create account"}</span>
            )}
          </button>
        </form>

        {/* Fast quick-test credentials selector */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            Quick-fill seed test accounts:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-label="Quick-fill Alex test account (user role)"
              onClick={() =>
                fillQuickAccount(
                  "alex@example.com",
                  "SecurePassword123!",
                  "Alex",
                )
              }
              className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Alex</span>
              </div>
              <span className="text-[10px] text-slate-400">User</span>
            </button>

            <button
              type="button"
              aria-label="Quick-fill Sam test account (user role)"
              onClick={() =>
                fillQuickAccount("sam@example.com", "SecurePassword123!", "Sam")
              }
              className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sam</span>
              </div>
              <span className="text-[10px] text-slate-400">User</span>
            </button>

            <button
              type="button"
              aria-label="Quick-fill Admin test account (admin role)"
              onClick={() =>
                fillQuickAccount(
                  "admin@example.com",
                  "AdminSecret123!",
                  "Admin",
                )
              }
              className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <ShieldIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
              </div>
              <span className="text-[10px] text-amber-500 font-medium">
                Admin
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
