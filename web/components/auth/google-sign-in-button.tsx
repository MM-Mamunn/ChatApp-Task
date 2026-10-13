"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/icons";
import { signInWithGoogle } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onError?: (message: string) => void;
  className?: string;
  redirectTo?: string;
}

/**
 * Reusable Google Sign-In Button component.
 * Triggers OAuth 2.0 PKCE handshake with Supabase Auth.
 * Adheres to official Google branding guidelines, shadcn styling,
 * and high-contrast light/dark mode requirements.
 */
export function GoogleSignInButton({
  disabled = false,
  onError,
  className,
  redirectTo,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle(redirectTo);
      if (error) {
        setIsLoading(false);
        onError?.(error.message || "Failed to initialize Google Sign In");
      }
      // When successful, the browser will be redirected to the provider
    } catch (err: unknown) {
      setIsLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to initialize Google Sign In";
      onError?.(message);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignIn}
      disabled={disabled || isLoading}
      isLoading={isLoading}
      aria-label="Continue with Google"
      className={cn(
        "w-full h-10 font-semibold gap-2.5 border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-sm",
        className,
      )}
    >
      {!isLoading && <GoogleIcon className="size-4 shrink-0" />}
      <span>
        {isLoading ? "Connecting to Google..." : "Continue with Google"}
      </span>
    </Button>
  );
}
