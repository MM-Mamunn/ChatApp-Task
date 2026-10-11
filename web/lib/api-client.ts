/**
 * Frontend API client for the Secure Realtime Chat Application.
 * Communicates with Next.js route handlers under /api.
 * Manages JWT access token in memory with automatic token refresh on 401.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
  };
  pagination?: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface DirectConversationItem {
  conversation_id: string;
  other_user: {
    id?: string;
    email: string;
    name: string;
    avatar_url: string | null;
  };
  last_message: {
    id: string;
    message: string;
    created_at: string;
    sender_email: string;
    recipient_email?: string;
  } | null;
  updated_at: string;
}

export interface DirectMessageItem {
  id: string;
  sender_email: string;
  receiver_email: string;
  message: string;
  created_at: string;
}

export interface GroupItem {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  members?: Array<{
    user_email: string;
    name?: string;
    role_in_group: string;
    joined_at: string;
  }>;
}

export interface GroupMessageItem {
  group_id: string;
  sender_email: string;
  message: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Core request dispatcher with automatic refresh rotation on 401.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("http") ? endpoint : endpoint;
    const headers = new Headers(options.headers || {});

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (this.accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin", // ensures HTTP-only refresh_token cookie is sent
      });
    } catch (networkError: unknown) {
      const msg =
        networkError instanceof Error
          ? networkError.message
          : "Network error occurred";
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: msg,
        },
      };
    }

    // If 401 Unauthorized, attempt token refresh and replay once (unless this request was itself an auth endpoint)
    if (
      response.status === 401 &&
      !endpoint.includes("/api/auth/login") &&
      !endpoint.includes("/api/auth/register") &&
      !endpoint.includes("/api/auth/refresh")
    ) {
      const newToken = await this.performRefresh();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        try {
          const retryRes = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin",
          });
          const retryData = (await retryRes.json()) as ApiResponse<T>;
          return retryData;
        } catch {
          // Fall through to original response
        }
      }
    }

    try {
      const json = (await response.json()) as ApiResponse<T>;
      return json;
    } catch {
      return {
        success: false,
        error: {
          code: "INVALID_JSON_RESPONSE",
          message: `Server returned status ${response.status} with unparseable body`,
        },
      };
    }
  }

  /**
   * Refreshes the short-lived access token using the HTTP-only cookie.
   */
  public async performRefresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });

        if (!res.ok) {
          this.accessToken = null;
          return null;
        }

        const data = (await res.json()) as ApiResponse<{
          access_token: string;
          user: UserProfile;
        }>;

        if (data.success && data.data?.access_token) {
          this.accessToken = data.data.access_token;
          return data.data.access_token;
        }

        this.accessToken = null;
        return null;
      } catch {
        this.accessToken = null;
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth Methods
  public async register(payload: {
    email: string;
    password: string;
    name: string;
  }) {
    const res = await this.request<{
      user: UserProfile;
      access_token: string;
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.access_token) {
      this.setAccessToken(res.data.access_token);
    }
    return res;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{
      user: UserProfile;
      access_token: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.access_token) {
      this.setAccessToken(res.data.access_token);
    }
    return res;
  }

  public async logout() {
    try {
      await this.request("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      this.setAccessToken(null);
    }
  }

  // Profile and Users
  public async getMe() {
    return this.request<UserProfile>("/api/users/me");
  }

  public async updateMe(payload: { name?: string; avatarUrl?: string }) {
    return this.request<UserProfile>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  public async searchUsers(query?: string, limit = 20) {
    const searchParams = new URLSearchParams();
    if (query && query.trim().length > 0) {
      searchParams.set("query", query.trim());
    }
    if (limit) {
      searchParams.set("limit", String(limit));
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return this.request<
      Array<{
        id?: string;
        email: string;
        name: string;
        avatar_url: string | null;
        role?: string;
      }>
    >(`/api/users${qs}`);
  }

  // Direct Conversations
  public async listDirectConversations() {
    return this.request<DirectConversationItem[]>("/api/conversations/direct");
  }

  public async startDirectConversation(recipientEmail: string) {
    return this.request<{
      other_user: {
        email: string;
        name: string | null;
        avatar_url: string | null;
      };
      is_new: boolean;
    }>("/api/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ recipient_email: recipientEmail }),
    });
  }

  public async getDirectMessages(
    userEmail: string,
    params?: { limit?: number; before?: string },
  ) {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString() ? `?${q.toString()}` : "";

    return this.request<DirectMessageItem[]>(
      `/api/conversations/direct/${encodeURIComponent(userEmail)}/messages${qs}`,
    );
  }

  public async sendDirectMessage(userEmail: string, message: string) {
    return this.request<DirectMessageItem>(
      `/api/conversations/direct/${encodeURIComponent(userEmail)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
    );
  }

  // Group Conversations
  public async listGroups() {
    return this.request<GroupItem[]>("/api/groups");
  }

  public async createGroup(payload: {
    name: string;
    participant_emails: string[];
  }) {
    return this.request<GroupItem>("/api/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getGroupMessages(
    groupId: string,
    params?: { limit?: number; before?: string },
  ) {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString() ? `?${q.toString()}` : "";

    return this.request<GroupMessageItem[]>(
      `/api/groups/${encodeURIComponent(groupId)}/messages${qs}`,
    );
  }

  public async sendGroupMessage(groupId: string, message: string) {
    return this.request<GroupMessageItem>(
      `/api/groups/${encodeURIComponent(groupId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
    );
  }
}

export const apiClient = new ApiClient();
