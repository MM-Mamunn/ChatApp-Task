import React from "react";

interface AvatarProps {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isGroup?: boolean;
}

const colorPairs = [
  { bg: "bg-indigo-600 dark:bg-indigo-700", text: "text-white" },
  { bg: "bg-violet-600 dark:bg-violet-700", text: "text-white" },
  { bg: "bg-emerald-600 dark:bg-emerald-700", text: "text-white" },
  { bg: "bg-amber-600 dark:bg-amber-700", text: "text-white" },
  { bg: "bg-rose-600 dark:bg-rose-700", text: "text-white" },
  { bg: "bg-sky-600 dark:bg-sky-700", text: "text-white" },
  { bg: "bg-teal-600 dark:bg-teal-700", text: "text-white" },
];

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

function getColorIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % colorPairs.length;
}

export function Avatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className = "",
  isGroup = false,
}: AvatarProps) {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-xs font-medium",
    md: "w-10 h-10 text-sm font-semibold",
    lg: "w-12 h-12 text-base font-semibold",
    xl: "w-16 h-16 text-xl font-bold",
  }[size];

  const seed = name || email || (isGroup ? "Group" : "User");
  const color = colorPairs[getColorIndex(seed)];
  const initials = isGroup ? "#" : getInitials(name, email);

  if (avatarUrl && !isGroup) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${sizeClasses} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name || email || "Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            // fallback if avatar fails to load
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${color.bg} ${color.text} ${sizeClasses} ${className}`}
      aria-label={name || email || (isGroup ? "Group Channel" : "User")}
    >
      <span>{initials}</span>
    </div>
  );
}
