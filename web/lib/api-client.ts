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
  group_id: string;
  name: string;
  created_by?: string;
  creator_email?: string;
  created_at: string;
  updated_at?: string;
  member_count: number;
  participants?: string[];
  members?: Array<{
    user_email: string;
    name?: string;
    role_in_group: string;
    joined_at: string;
  }>;
}

export interface GroupMessageItem {
  id?: string;
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

export interface AdminUserItem {
  email: string;
  name: string;
  avatar_url: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogItem {
  id: string;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  created_at: string;
}

export interface AdminDirectConversationSummary {
  user_a: string;
  user_b: string;
  total_messages: number;
  last_activity: string;
}

export interface AdminGroupSummary {
  group_id: string;
  name: string;
  creator_email: string;
  member_count: number;
  last_activity: string;
}

export interface AdminConversationsOverview {
  direct_conversations: AdminDirectConversationSummary[];
  groups: AdminGroupSummary[];
}

export interface AdminDirectMessageItem {
  id: string;
  sender_email: string;
  receiver_email: string;
  message: string;
  created_at: string;
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
  public async listGroups(): Promise<ApiResponse<GroupItem[]>> {
    const res = await this.request<
      Array<{
        id?: string;
        group_id?: string;
        name: string;
        created_by?: string;
        creator_email?: string;
        created_at: string;
        updated_at?: string;
        member_count?: number;
        participants?: string[];
        members?: Array<{
          user_email: string;
          name?: string;
          role_in_group: string;
          joined_at: string;
        }>;
      }>
    >("/api/groups");

    if (res.success && Array.isArray(res.data)) {
      const normalized: GroupItem[] = res.data.map((g) => {
        const resolvedId = g.group_id || g.id || "";
        return {
          id: resolvedId,
          group_id: resolvedId,
          name: g.name,
          creator_email: g.creator_email || g.created_by,
          created_by: g.created_by || g.creator_email,
          created_at: g.created_at,
          updated_at: g.updated_at || g.created_at,
          member_count:
            g.member_count ?? (g.participants ? g.participants.length : 1),
          participants: g.participants,
          members: g.members,
        };
      });
      return {
        ...res,
        data: normalized,
      };
    }
    return res as ApiResponse<GroupItem[]>;
  }

  public async createGroup(payload: {
    name: string;
    participant_emails: string[];
  }): Promise<ApiResponse<GroupItem>> {
    const res = await this.request<{
      id?: string;
      group_id?: string;
      name: string;
      created_by?: string;
      creator_email?: string;
      created_at: string;
      updated_at?: string;
      member_count?: number;
      participants?: string[];
      members?: Array<{
        user_email: string;
        name?: string;
        role_in_group: string;
        joined_at: string;
      }>;
    }>("/api/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      const g = res.data;
      const resolvedId = g.group_id || g.id || "";
      const normalized: GroupItem = {
        id: resolvedId,
        group_id: resolvedId,
        name: g.name,
        creator_email: g.creator_email || g.created_by,
        created_by: g.created_by || g.creator_email,
        created_at: g.created_at,
        updated_at: g.updated_at || g.created_at,
        member_count:
          g.member_count ??
          (g.participants
            ? g.participants.length
            : payload.participant_emails.length + 1),
        participants: g.participants,
        members: g.members,
      };
      return {
        ...res,
        data: normalized,
      };
    }
    return res as ApiResponse<GroupItem>;
  }

  public async getGroupMessages(
    groupId: string,
    params?: { limit?: number; before?: string },
  ) {
    if (!groupId || groupId === "undefined") {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid group ID is required to fetch messages.",
        },
      };
    }
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString() ? `?${q.toString()}` : "";

    return this.request<GroupMessageItem[]>(
      `/api/groups/${encodeURIComponent(groupId)}/messages${qs}`,
    );
  }

  public async sendGroupMessage(groupId: string, message: string) {
    if (!groupId || groupId === "undefined") {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid group ID is required to send messages.",
        },
      };
    }
    return this.request<GroupMessageItem>(
      `/api/groups/${encodeURIComponent(groupId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
    );
  }

  // ==========================================
  // Admin Oversight & Management Methods
  // ==========================================

  public async listAdminUsers(): Promise<ApiResponse<AdminUserItem[]>> {
    return this.request<AdminUserItem[]>("/api/admin/users");
  }

  public async updateUserRole(
    userEmail: string,
    role: "user" | "admin",
  ): Promise<ApiResponse<AdminUserItem>> {
    return this.request<AdminUserItem>(
      `/api/admin/users/${encodeURIComponent(userEmail)}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    );
  }

  public async updateUserStatus(
    userEmail: string,
    isActive: boolean,
  ): Promise<ApiResponse<AdminUserItem>> {
    return this.request<AdminUserItem>(
      `/api/admin/users/${encodeURIComponent(userEmail)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      },
    );
  }

  public async listAdminActivity(params?: {
    limit?: number;
    before?: string;
    action?: string;
  }): Promise<ApiResponse<ActivityLogItem[]>> {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    if (params?.action) q.set("action", params.action);
    const qs = q.toString() ? `?${q.toString()}` : "";

    return this.request<ActivityLogItem[]>(`/api/admin/activity${qs}`);
  }

  public async listAdminConversations(): Promise<
    ApiResponse<AdminConversationsOverview>
  > {
    return this.request<AdminConversationsOverview>("/api/admin/conversations");
  }

  public async getAdminDirectMessages(
    userA: string,
    userB: string,
    params?: { limit?: number; before?: string },
  ): Promise<ApiResponse<AdminDirectMessageItem[]>> {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString() ? `?${q.toString()}` : "";

    return this.request<AdminDirectMessageItem[]>(
      `/api/admin/conversations/direct/${encodeURIComponent(
        userA,
      )}/${encodeURIComponent(userB)}/messages${qs}`,
    );
  }
}

export const apiClient = new ApiClient();
