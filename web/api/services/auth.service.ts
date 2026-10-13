import { eq } from "drizzle-orm";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  hashPassword,
  hashToken,
  REFRESH_TOKEN_TTL_SECONDS,
  verifyPassword,
} from "../authentication";
import { optionalEnv } from "../configuration/env";
import { getDb } from "../database/client";
import { activityLogs, refreshTokens, users } from "../database/schema";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../errors";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUserResponse {
  email: string;
  name: string;
  avatar_url: string | null;
  role: "user" | "admin";
}

export interface AuthSessionResult {
  user: AuthUserResponse;
  access_token: string;
  raw_refresh_token: string;
}

export interface RefreshSessionResult {
  access_token: string;
  raw_refresh_token: string;
}

export interface BootstrapAdminResult {
  user: {
    email: string;
    name: string;
    role: "admin";
  };
}

/**
 * Registers a new user with standard 'user' role and password hashed via bcrypt.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<AuthSessionResult> {
  const db = getDb();
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Ensure user does not already exist
  const existing = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError("Email address is already registered");
  }

  // 2. Hash password with bcrypt cost 12
  const passwordHash = await hashPassword(input.password);

  // 3. Create user record
  await db.insert(users).values({
    email: normalizedEmail,
    passwordHash,
    name: input.name.trim(),
    role: "user",
    isActive: true,
  });

  // 4. Create and persist opaque refresh token
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.insert(refreshTokens).values({
    userEmail: normalizedEmail,
    tokenHash,
    expiresAt,
  });

  // 5. Create short-lived JWT access token
  const accessToken = await createAccessToken({
    sub: normalizedEmail,
    role: "user",
  });

  // 6. Record audit log
  await db.insert(activityLogs).values({
    actorEmail: normalizedEmail,
    action: "USER_REGISTER",
    targetType: "user",
    targetId: normalizedEmail,
    details: { method: "credentials" },
  });

  return {
    user: {
      email: normalizedEmail,
      name: input.name.trim(),
      avatar_url: null,
      role: "user",
    },
    access_token: accessToken,
    raw_refresh_token: rawRefreshToken,
  };
}

/**
 * Authenticates user credentials, verifies active state, and issues session tokens.
 */
export async function loginUser(input: LoginInput): Promise<AuthSessionResult> {
  const db = getDb();
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Look up user
  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (found.length === 0) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const user = found[0];

  if (!user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // 2. Deactivation check
  if (!user.isActive) {
    throw new ForbiddenError(
      "Account has been deactivated. Contact an administrator.",
    );
  }

  // 3. Verify password
  const isMatch = await verifyPassword(input.password, user.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // 4. Issue and persist refresh token
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.insert(refreshTokens).values({
    userEmail: user.email,
    tokenHash,
    expiresAt,
  });

  // 5. Issue short-lived JWT access token
  const accessToken = await createAccessToken({
    sub: user.email,
    role: user.role as "user" | "admin",
  });

  // 6. Record audit log
  await db.insert(activityLogs).values({
    actorEmail: user.email,
    action: "USER_LOGIN",
    targetType: "user",
    targetId: user.email,
  });

  return {
    user: {
      email: user.email,
      name: user.name,
      avatar_url: user.avatarUrl,
      role: user.role as "user" | "admin",
    },
    access_token: accessToken,
    raw_refresh_token: rawRefreshToken,
  };
}

/**
 * Rotates the refresh token and issues a fresh access token.
 */
export async function refreshSession(
  rawRefreshToken: string | null,
): Promise<RefreshSessionResult> {
  if (!rawRefreshToken?.trim()) {
    throw new UnauthorizedError("Missing refresh token");
  }

  const db = getDb();
  const tokenHash = hashToken(rawRefreshToken.trim());

  // 1. Query token record
  const found = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (found.length === 0) {
    throw new UnauthorizedError("Refresh token is expired or invalid");
  }

  const tokenRecord = found[0];

  // 2. Check expiration and revocation
  if (tokenRecord.isRevoked || tokenRecord.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError("Refresh token is expired or invalid");
  }

  // 3. Verify user active state
  const userFound = await db
    .select({
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, tokenRecord.userEmail))
    .limit(1);

  if (userFound.length === 0 || !userFound[0].isActive) {
    throw new ForbiddenError("User account is inactive or not found");
  }

  const user = userFound[0];

  // 4. Token rotation: revoke old token and insert new token
  const newRawRefreshToken = generateOpaqueRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, tokenRecord.id));

    await tx.insert(refreshTokens).values({
      userEmail: user.email,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });
  });

  // 5. Issue fresh access token
  const accessToken = await createAccessToken({
    sub: user.email,
    role: user.role as "user" | "admin",
  });

  return {
    access_token: accessToken,
    raw_refresh_token: newRawRefreshToken,
  };
}

/**
 * Invalidates the refresh token in the database.
 */
export async function logoutUser(
  rawRefreshToken: string | null,
): Promise<void> {
  if (!rawRefreshToken?.trim()) {
    return;
  }

  const db = getDb();
  const tokenHash = hashToken(rawRefreshToken.trim());

  const found = await db
    .select({ id: refreshTokens.id, userEmail: refreshTokens.userEmail })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (found.length > 0) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, found[0].id));

    await db.insert(activityLogs).values({
      actorEmail: found[0].userEmail,
      action: "USER_LOGOUT",
      targetType: "user",
      targetId: found[0].userEmail,
    });
  }
}

/**
 * Bootstraps the initial system administrator account protected by ADMIN_BOOTSTRAP_SECRET.
 */
export async function bootstrapAdmin(
  input: RegisterInput,
  providedSecret: string | null,
): Promise<BootstrapAdminResult> {
  const configuredSecret = optionalEnv("ADMIN_BOOTSTRAP_SECRET");
  if (!configuredSecret || providedSecret !== configuredSecret) {
    throw new UnauthorizedError("Invalid or missing bootstrap secret");
  }

  const db = getDb();

  // 1. Check if any admin already exists
  const existingAdmins = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existingAdmins.length > 0) {
    throw new ForbiddenError("An administrator account already exists");
  }

  const normalizedEmail = input.email.toLowerCase().trim();

  // 2. Check if user with this email already exists
  const existingUser = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser.length > 0) {
    await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.email, normalizedEmail));
  } else {
    const passwordHash = await hashPassword(input.password);
    await db.insert(users).values({
      email: normalizedEmail,
      passwordHash,
      name: input.name.trim(),
      role: "admin",
      isActive: true,
    });
  }

  await db.insert(activityLogs).values({
    actorEmail: normalizedEmail,
    action: "ADMIN_BOOTSTRAP",
    targetType: "user",
    targetId: normalizedEmail,
  });

  return {
    user: {
      email: normalizedEmail,
      name: input.name.trim(),
      role: "admin",
    },
  };
}

export interface OAuthUserInput {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailConfirmedAt?: string | null;
}

/**
 * Resolves an authenticated Google OAuth user in the application database:
 * - Rejects unverified email identities.
 * - Links existing email/password accounts WITHOUT modifying their bcrypt passwordHash or role.
 * - Rejects deactivated accounts immediately with 403 Forbidden.
 * - Creates a new user record with standard 'user' role for first-time OAuth sign-ups.
 * - Concurrency safe: recovers cleanly from race conditions on duplicate inserts.
 * - Issues native application JWT access token and HTTP-only refresh token.
 */
export async function resolveOAuthUser(
  input: OAuthUserInput,
): Promise<AuthSessionResult> {
  const db = getDb();
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Ownership & Verification Guard
  if (!input.emailConfirmedAt) {
    throw new UnauthorizedError(
      "Unverified email address cannot be authenticated. Please verify your email with Google.",
    );
  }

  // 2. Query existing application user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  let resolvedUser: {
    email: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
  };

  if (existing.length > 0) {
    const current = existing[0];

    // 3. Deactivation enforcement
    if (!current.isActive) {
      throw new ForbiddenError(
        "Account has been deactivated. Contact an administrator.",
      );
    }

    // 4. Safe Account Linking
    // Preserve existing passwordHash and role intact.
    // Update avatarUrl only if previously null and Google provides an avatar.
    if (!current.avatarUrl && input.avatarUrl) {
      await db
        .update(users)
        .set({
          avatarUrl: input.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.email, normalizedEmail));
      current.avatarUrl = input.avatarUrl;
    }

    resolvedUser = current;

    // 5. Record identity linking audit log
    await db.insert(activityLogs).values({
      actorEmail: normalizedEmail,
      action: "USER_LINK_IDENTITY",
      targetType: "user",
      targetId: normalizedEmail,
      details: {
        provider: "google",
        linkedToExisting: true,
      },
    });
  } else {
    // 6. First-time registration via Google OAuth
    const defaultName = input.name?.trim() || normalizedEmail.split("@")[0];

    try {
      await db.insert(users).values({
        email: normalizedEmail,
        passwordHash: null,
        name: defaultName,
        avatarUrl: input.avatarUrl || null,
        role: "user",
        isActive: true,
      });

      resolvedUser = {
        email: normalizedEmail,
        name: defaultName,
        avatarUrl: input.avatarUrl || null,
        role: "user",
        isActive: true,
      };

      await db.insert(activityLogs).values({
        actorEmail: normalizedEmail,
        action: "USER_REGISTER",
        targetType: "user",
        targetId: normalizedEmail,
        details: { method: "google_oauth" },
      });
    } catch {
      // Handle potential concurrent insert race condition gracefully
      const retryFound = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (retryFound.length > 0) {
        resolvedUser = retryFound[0];
      } else {
        throw new ConflictError("Failed to register user due to a conflict");
      }
    }
  }

  // 7. Issue application session tokens
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.insert(refreshTokens).values({
    userEmail: resolvedUser.email,
    tokenHash,
    expiresAt,
  });

  const accessToken = await createAccessToken({
    sub: resolvedUser.email,
    role: resolvedUser.role as "user" | "admin",
  });

  await db.insert(activityLogs).values({
    actorEmail: resolvedUser.email,
    action: "USER_LOGIN",
    targetType: "user",
    targetId: resolvedUser.email,
    details: { method: "google_oauth" },
  });

  return {
    user: {
      email: resolvedUser.email,
      name: resolvedUser.name,
      avatar_url: resolvedUser.avatarUrl,
      role: resolvedUser.role as "user" | "admin",
    },
    access_token: accessToken,
    raw_refresh_token: rawRefreshToken,
  };
}
