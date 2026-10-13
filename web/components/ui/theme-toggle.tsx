"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { SunIcon, MoonIcon } from "./icons";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "pill" | "compact";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  variant = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme, isMounted } = useTheme();

  // Determine current active dark state (default to false if not yet mounted on client)
  const isDark = isMounted ? theme === "dark" : false;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-muted/60 hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="relative flex items-center justify-center size-4 shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.span
                key="moon-pill"
                initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="text-amber-400 flex items-center justify-center"
              >
                <MoonIcon className="size-3.5" />
              </motion.span>
            ) : (
              <motion.span
                key="sun-pill"
                initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -45, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="text-amber-500 flex items-center justify-center"
              >
                <SunIcon className="size-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span>{isDark ? "Dark mode" : "Light mode"}</span>
      </button>
    );
  }

  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
        isCompact ? "size-8" : "size-9",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-icon"
            initial={{ opacity: 0, rotate: -40, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 40, scale: 0.7 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="text-amber-400 flex items-center justify-center"
          >
            <MoonIcon className={isCompact ? "size-3.5" : "size-4"} />
          </motion.div>
        ) : (
          <motion.div
            key="light-icon"
            initial={{ opacity: 0, rotate: 40, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -40, scale: 0.7 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="text-amber-500 flex items-center justify-center"
          >
            <SunIcon className={isCompact ? "size-3.5" : "size-4"} />
          </motion.div>
        )}
      </AnimatePresence>
      {showLabel && (
        <span className="sr-only">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </span>
      )}
    </button>
  );
}
