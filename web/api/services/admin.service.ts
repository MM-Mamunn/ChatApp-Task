import { eq, and, or, lt, desc, sql } from "drizzle-orm";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { activityLogs } from "../database/schema/activity";
import { refreshTokens } from "../database/schema/tokens";
import { directMessages, groupChatMessages } from "../database/schema/messages";
import { groups, groupMembers } from "../database/schema/groups";
import { NotFoundError } from "../errors/app-error";

export interface AdminUserItem {
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLogItem {
  id: string;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  created_at: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface AdminDirectConversationSummary {
  user_a: string;
  user_b: string;
  total_messages: number;
  last_activity: Date;
}

export interface AdminGroupSummary {
  group_id: string;
  name: string;
  creator_email: string;
  member_count: number;
  last_activity: Date;
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
  created_at: Date;
}

/**
 * Returns all registered users with complete metadata.
 */
export async function listAllUsers(): Promise<AdminUserItem[]> {
  const db = getDb();
  const records = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return records.map((u) => ({
    email: u.email,
    name: u.name,
    avatar_url: u.avatarUrl,
    role: u.role,
    is_active: u.isActive,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  }));
}

/**
 * Updates a user's role and logs the audit event.
 */
export async function updateUserRole(
  adminEmail: string,
  targetEmail: string,
  newRole: "user" | "admin",
): Promise<AdminUserItem> {
  const db = getDb();
  const normalizedTarget = targetEmail.toLowerCase().trim();

  const found = await db
    .select({
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, normalizedTarget))
    .limit(1);

  if (found.length === 0) {
    throw new NotFoundError("User not found");
  }

  const oldRole = found[0].role;

  await db
    .update(users)
    .set({
      role: newRole,
      updatedAt: new Date(),
    })
    .where(eq(users.email, normalizedTarget));

  await db.insert(activityLogs).values({
    actorEmail: adminEmail.toLowerCase().trim(),
    action: "ROLE_CHANGE",
    targetType: "user",
    targetId: normalizedTarget,
    details: {
      old_role: oldRole,
      new_role: newRole,
    },
  });

  const updated = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, normalizedTarget))
    .limit(1);

  return {
    email: updated[0].email,
    name: updated[0].name,
    avatar_url: updated[0].avatarUrl,
    role: updated[0].role,
    is_active: updated[0].isActive,
    created_at: updated[0].createdAt,
    updated_at: updated[0].updatedAt,
  };
}

/**
 * Activates or deactivates a user. If deactivated, revokes all refresh tokens.
 */
export async function updateUserStatus(
  adminEmail: string,
  targetEmail: string,
  isActive: boolean,
): Promise<AdminUserItem> {
  const db = getDb();
  const normalizedTarget = targetEmail.toLowerCase().trim();

  const found = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.email, normalizedTarget))
    .limit(1);

  if (found.length === 0) {
    throw new NotFoundError("User not found");
  }

  await db
    .update(users)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.email, normalizedTarget));

  // If deactivated, immediately revoke all active refresh tokens
  if (!isActive) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userEmail, normalizedTarget));
  }

  await db.insert(activityLogs).values({
    actorEmail: adminEmail.toLowerCase().trim(),
    action: isActive ? "USER_REACTIVATION" : "USER_DEACTIVATION",
    targetType: "user",
    targetId: normalizedTarget,
    details: {
      is_active: isActive,
    },
  });

  const updated = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, normalizedTarget))
    .limit(1);

  return {
    email: updated[0].email,
    name: updated[0].name,
    avatar_url: updated[0].avatarUrl,
    role: updated[0].role,
    is_active: updated[0].isActive,
    created_at: updated[0].createdAt,
    updated_at: updated[0].updatedAt,
  };
}

/**
 * Retrieves audit logs with cursor pagination and optional action filtering.
 */
export async function listActivityLogs(params: {
  limit?: number;
  before?: string;
  action?: string;
}): Promise<PaginatedResult<ActivityLogItem>> {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  const conditions = [];

  if (params.before) {
    const beforeDate = new Date(params.before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(activityLogs.createdAt, beforeDate));
    }
  }

  if (params.action?.trim()) {
    conditions.push(eq(activityLogs.action, params.action.trim()));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Query limit + 1 to check if there are more records
  const rows = await db
    .select()
    .from(activityLogs)
    .where(whereClause)
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && resultRows.length > 0
      ? resultRows[resultRows.length - 1].createdAt.toISOString()
      : null;

  return {
    data: resultRows.map((r) => ({
      id: r.id,
      actor_email: r.actorEmail,
      action: r.action,
      target_type: r.targetType,
      target_id: r.targetId,
      details: r.details,
      created_at: r.createdAt,
    })),
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
}

/**
 * Aggregates overview of all direct and group conversations across the platform.
 */
export async function listAdminConversations(): Promise<AdminConversationsOverview> {
  const db = getDb();

  // 1. Direct conversations
  // Query all direct messages and group by normalized participant pair
  const allDms = await db
    .select({
      sender: directMessages.senderEmail,
      receiver: directMessages.receiverEmail,
      createdAt: directMessages.createdAt,
    })
    .from(directMessages)
    .orderBy(desc(directMessages.createdAt));

  const directPairsMap = new Map<
    string,
    {
      user_a: string;
      user_b: string;
      total_messages: number;
      last_activity: Date;
    }
  >();

  for (const dm of allDms) {
    const userA = dm.sender < dm.receiver ? dm.sender : dm.receiver;
    const userB = dm.sender < dm.receiver ? dm.receiver : dm.sender;
    const key = `${userA}::${userB}`;

    const existing = directPairsMap.get(key);
    if (!existing) {
      directPairsMap.set(key, {
        user_a: userA,
        user_b: userB,
        total_messages: 1,
        last_activity: dm.createdAt,
      });
    } else {
      existing.total_messages += 1;
      if (dm.createdAt > existing.last_activity) {
        existing.last_activity = dm.createdAt;
      }
    }
  }

  // 2. Groups
  const allGroups = await db
    .select()
    .from(groups)
    .orderBy(desc(groups.createdAt));
  const groupSummaries: AdminGroupSummary[] = [];

  for (const grp of allGroups) {
    const members = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, grp.groupId));

    const latestMessage = await db
      .select({ createdAt: groupChatMessages.createdAt })
      .from(groupChatMessages)
      .where(eq(groupChatMessages.groupId, grp.groupId))
      .orderBy(desc(groupChatMessages.createdAt))
      .limit(1);

    const memberCount = members[0]?.count ?? 0;
    const lastActivity = latestMessage[0]?.createdAt ?? grp.createdAt;

    groupSummaries.push({
      group_id: grp.groupId,
      name: grp.name,
      creator_email: grp.creatorEmail,
      member_count: memberCount,
      last_activity: lastActivity,
    });
  }

  return {
    direct_conversations: Array.from(directPairsMap.values()),
    groups: groupSummaries,
  };
}

/**
 * Reads direct message history between any two users in read-only mode and logs an audit inspection event.
 */
export async function getAdminDirectMessages(
  adminEmail: string,
  userA: string,
  userB: string,
  params: { limit?: number; before?: string },
): Promise<PaginatedResult<AdminDirectMessageItem>> {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  const normA = userA.toLowerCase().trim();
  const normB = userB.toLowerCase().trim();

  // Audit log: Administrator viewed another user's conversation
  await db.insert(activityLogs).values({
    actorEmail: adminEmail.toLowerCase().trim(),
    action: "ADMIN_VIEW_CONVERSATION",
    targetType: "conversation",
    targetId: `${normA}:${normB}`,
    details: {
      user_a: normA,
      user_b: normB,
    },
  });

  const pairCondition = or(
    and(
      eq(directMessages.senderEmail, normA),
      eq(directMessages.receiverEmail, normB),
    ),
    and(
      eq(directMessages.senderEmail, normB),
      eq(directMessages.receiverEmail, normA),
    ),
  );

  const conditions = [pairCondition];

  if (params.before) {
    const beforeDate = new Date(params.before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(directMessages.createdAt, beforeDate));
    }
  }

  const rows = await db
    .select()
    .from(directMessages)
    .where(and(...conditions))
    .orderBy(desc(directMessages.createdAt), desc(directMessages.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && resultRows.length > 0
      ? resultRows[resultRows.length - 1].createdAt.toISOString()
      : null;

  return {
    data: resultRows.map((m) => ({
      id: m.id,
      sender_email: m.senderEmail,
      receiver_email: m.receiverEmail,
      message: m.message,
      created_at: m.createdAt,
    })),
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
}
