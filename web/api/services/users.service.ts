import { eq, or, ilike, and } from "drizzle-orm";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { activityLogs } from "../database/schema/activity";
import { NotFoundError, ForbiddenError } from "../errors/app-error";

export interface UserProfileResponse {
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSearchItem {
  email: string;
  name: string;
  avatar_url: string | null;
  role?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UpdateProfileInput {
  name?: string;
  avatar_url?: string | null;
}

/**
 * Retrieves the profile of the authenticated user.
 */
export async function getOwnProfile(
  userEmail: string,
): Promise<UserProfileResponse> {
  const db = getDb();
  const normalizedEmail = userEmail.toLowerCase().trim();

  const found = await db
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
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (found.length === 0) {
    throw new NotFoundError("User profile not found");
  }

  const user = found[0];
  if (!user.isActive) {
    throw new ForbiddenError("Account has been deactivated");
  }

  return {
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
    role: user.role,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

/**
 * Updates the current user's display name or avatar URL.
 */
export async function updateOwnProfile(
  userEmail: string,
  input: UpdateProfileInput,
): Promise<UserProfileResponse> {
  const db = getDb();
  const normalizedEmail = userEmail.toLowerCase().trim();

  const found = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (found.length === 0) {
    throw new NotFoundError("User profile not found");
  }

  if (!found[0].isActive) {
    throw new ForbiddenError("Account has been deactivated");
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.avatar_url !== undefined) {
    updateData.avatarUrl = input.avatar_url;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.email, normalizedEmail));

  // Record audit log
  await db.insert(activityLogs).values({
    actorEmail: normalizedEmail,
    action: "USER_PROFILE_UPDATE",
    targetType: "user",
    targetId: normalizedEmail,
    details: {
      updated_fields: Object.keys(input),
    },
  });

  const updated = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return {
    email: updated[0].email,
    name: updated[0].name,
    avatar_url: updated[0].avatarUrl,
    role: updated[0].role,
    created_at: updated[0].createdAt,
    updated_at: updated[0].updatedAt,
  };
}

/**
 * Searches users by name or email.
 * Normal users receive limited fields (email, name, avatar_url) and active users only.
 * Admins receive full metadata.
 */
export async function searchUsers(
  searchTerm?: string,
  limit = 10,
  callerRole: "user" | "admin" = "user",
): Promise<UserSearchItem[]> {
  const db = getDb();
  const trimmed = (searchTerm || "").trim();
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const searchCondition = trimmed
    ? or(ilike(users.name, `%${trimmed}%`), ilike(users.email, `%${trimmed}%`))
    : undefined;

  if (callerRole === "admin") {
    const query = db
      .select({
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    const results = searchCondition
      ? await query.where(searchCondition).limit(safeLimit)
      : await query.limit(safeLimit);

    return results.map((u) => ({
      email: u.email,
      name: u.name,
      avatar_url: u.avatarUrl,
      role: u.role,
      is_active: u.isActive,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
  }

  // Non-admin callers: limited fields and active users only
  const activeCondition = eq(users.isActive, true);
  const whereClause = searchCondition
    ? and(searchCondition, activeCondition)
    : activeCondition;

  const results = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(whereClause)
    .limit(safeLimit);

  return results.map((u) => ({
    email: u.email,
    name: u.name,
    avatar_url: u.avatarUrl,
  }));
}
