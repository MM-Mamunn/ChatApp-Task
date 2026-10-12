"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient, type UserProfile } from "./api-client";

export interface AuthResult {
  success: boolean;
  error?: string;
  status?: number;
  code?: string;
  details?: Array<{ field?: string; issue: string }>;
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
  }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (payload: {
    name?: string;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  }) => Promise<{ success: boolean; data?: UserProfile; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      // Ignore background refresh failure
    }
  }, []);

  // Check existing session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const token = await apiClient.performRefresh();
        if (mounted && token) {
          setAccessToken(token);
          const meRes = await apiClient.getMe();
          if (mounted && meRes.success && meRes.data) {
            setUser(meRes.data);
          }
        }
      } catch {
        // Session not present or invalid
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: {
      email: string;
      password: string;
    }): Promise<AuthResult> => {
      try {
        const res = await apiClient.login(credentials);
        if (res.success && res.data) {
          setUser(res.data.user);
          setAccessToken(res.data.access_token);
          return { success: true };
        }
        return {
          success: false,
          error: res.error?.message || "Failed to sign in",
          status: res.status ?? res.error?.status,
          code: res.error?.code,
          details: res.error?.details,
        };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error during login",
          status: 0,
        };
      }
    },
    [],
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
    }): Promise<AuthResult> => {
      try {
        const res = await apiClient.register(payload);
        if (res.success && res.data) {
          setUser(res.data.user);
          setAccessToken(res.data.access_token);
          return { success: true };
        }
        return {
          success: false,
          error: res.error?.message || "Failed to create account",
          status: res.status ?? res.error?.status,
          code: res.error?.code,
          details: res.error?.details,
        };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error during registration",
          status: 0,
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: {
      name?: string;
      avatarUrl?: string | null;
      avatar_url?: string | null;
    }) => {
      try {
        const res = await apiClient.updateMe(payload);
        if (res.success && res.data) {
          setUser(res.data);
          return { success: true, data: res.data };
        }
        return {
          success: false,
          error: res.error?.message || "Failed to update profile",
        };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to update profile",
        };
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
