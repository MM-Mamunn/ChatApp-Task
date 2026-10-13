import assert from "node:assert";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { refreshTokens } from "../database/schema/tokens";
import { activityLogs } from "../database/schema/activity";
import {
  resolveOAuthUser,
  registerUser,
  loginUser,
} from "../services/auth.service";
import { verifyAccessToken, hashToken } from "../authentication/tokens";
import { UnauthorizedError, ForbiddenError } from "../errors";

async function runTests() {
  console.log("🧪 Starting Google OAuth & Identity Resolution Test Suite...\n");

  const db = getDb();
  const testEmails = [
    "oauth_new_test@example.com",
    "oauth_linked_test@example.com",
    "oauth_admin_test@example.com",
    "oauth_deactivated_test@example.com",
    "oauth_unverified_test@example.com",
    "oauth_concurrent_test@example.com",
  ];

  // Pre-cleanup in case of previous interrupted runs
  await db
    .delete(refreshTokens)
    .where(inArray(refreshTokens.userEmail, testEmails));
  await db.delete(users).where(inArray(users.email, testEmails));
  await db
    .delete(activityLogs)
    .where(inArray(activityLogs.actorEmail, testEmails));

  try {
    // =========================================================================
    // 1. First-Time Google OAuth User Creation
    // =========================================================================
    console.log("1. Testing First-Time Google OAuth User Provisioning...");
    const newEmail = "oauth_new_test@example.com";
    const result1 = await resolveOAuthUser({
      email: newEmail,
      name: "New OAuth User",
      avatarUrl: "https://example.com/avatar1.jpg",
      emailConfirmedAt: new Date().toISOString(),
    });

    assert.ok(result1.access_token, "Must return an access token");
    assert.ok(result1.raw_refresh_token, "Must return a raw refresh token");
    assert.strictEqual(result1.user.email, newEmail);
    assert.strictEqual(result1.user.name, "New OAuth User");
    assert.strictEqual(result1.user.role, "user");
    assert.strictEqual(
      result1.user.avatar_url,
      "https://example.com/avatar1.jpg",
    );

    // Verify token claims
    const tokenPayload = await verifyAccessToken(result1.access_token);
    assert.strictEqual(tokenPayload.sub, newEmail);
    assert.strictEqual(tokenPayload.role, "user");

    // Verify in database: passwordHash must be null
    const [dbUser1] = await db
      .select()
      .from(users)
      .where(eq(users.email, newEmail))
      .limit(1);
    assert.ok(dbUser1, "User must be persisted in database");
    assert.strictEqual(
      dbUser1.passwordHash,
      null,
      "Password hash must be null for pure OAuth accounts",
    );
    assert.strictEqual(dbUser1.role, "user");
    assert.strictEqual(dbUser1.isActive, true);

    // Verify refresh token recorded in DB
    const tokenHash1 = hashToken(result1.raw_refresh_token);
    const [dbToken1] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash1))
      .limit(1);
    assert.ok(dbToken1, "Refresh token must exist in DB");
    assert.strictEqual(dbToken1.isRevoked, false);

    console.log(
      "  ✓ First-time OAuth user provisioned with role 'user', null password hash, and active session.\n",
    );

    // =========================================================================
    // 2. Safe Account Linking with Existing Email/Password Account
    // =========================================================================
    console.log(
      "2. Testing Safe Account Linking (Preserving Bcrypt Password)...",
    );
    const linkedEmail = "oauth_linked_test@example.com";
    const plaintextPassword = "ExistingPassword123!";

    // Create traditional email/password account
    await registerUser({
      email: linkedEmail,
      password: plaintextPassword,
      name: "Original Password User",
    });

    const [beforeLink] = await db
      .select()
      .from(users)
      .where(eq(users.email, linkedEmail))
      .limit(1);
    assert.ok(
      beforeLink.passwordHash,
      "Initial account must have password hash",
    );
    const originalHash = beforeLink.passwordHash;

    // Link via Google OAuth
    const linkResult = await resolveOAuthUser({
      email: linkedEmail,
      name: "Google Linked Name",
      avatarUrl: "https://example.com/google-photo.png",
      emailConfirmedAt: new Date().toISOString(),
    });

    assert.strictEqual(linkResult.user.email, linkedEmail);
    assert.ok(linkResult.access_token, "Must issue valid access token");

    // Verify database record: passwordHash MUST be untouched
    const [afterLink] = await db
      .select()
      .from(users)
      .where(eq(users.email, linkedEmail))
      .limit(1);
    assert.strictEqual(
      afterLink.passwordHash,
      originalHash,
      "Bcrypt password hash MUST NOT be modified during OAuth linking",
    );
    assert.strictEqual(
      afterLink.avatarUrl,
      "https://example.com/google-photo.png",
      "Avatar URL should be populated if previously empty",
    );

    // Verify user can STILL login with email and original password
    const emailLoginResult = await loginUser({
      email: linkedEmail,
      password: plaintextPassword,
    });
    assert.strictEqual(emailLoginResult.user.email, linkedEmail);
    assert.ok(
      emailLoginResult.access_token,
      "User must still be able to sign in with password after OAuth link",
    );

    console.log(
      "  ✓ Existing email/password account linked safely with bcrypt password hash 100% intact.\n",
    );

    // =========================================================================
    // 3. Admin Privilege & Role Preservation
    // =========================================================================
    console.log("3. Testing Role & Admin Privilege Preservation...");
    const adminEmail = "oauth_admin_test@example.com";

    // Insert admin user
    await db.insert(users).values({
      email: adminEmail,
      name: "System Admin",
      role: "admin",
      isActive: true,
      passwordHash: null,
    });

    // Authenticate via Google OAuth
    const adminResult = await resolveOAuthUser({
      email: adminEmail,
      name: "System Admin via Google",
      emailConfirmedAt: new Date().toISOString(),
    });

    assert.strictEqual(adminResult.user.role, "admin");
    const adminClaims = await verifyAccessToken(adminResult.access_token);
    assert.strictEqual(
      adminClaims.role,
      "admin",
      "OAuth token must carry admin role for existing admin accounts",
    );

    const [dbAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    assert.strictEqual(
      dbAdmin.role,
      "admin",
      "Database role must remain admin (never downgraded to 'user')",
    );

    console.log(
      "  ✓ Admin privileges strictly preserved upon Google OAuth authentication.\n",
    );

    // =========================================================================
    // 4. Deactivated Account Defense
    // =========================================================================
    console.log(
      "4. Testing Deactivated Account Blocking (Immediate 403 Forbidden)...",
    );
    const deactivatedEmail = "oauth_deactivated_test@example.com";

    await db.insert(users).values({
      email: deactivatedEmail,
      name: "Deactivated User",
      role: "user",
      isActive: false, // Inactive
      passwordHash: null,
    });

    let forbiddenCaught = false;
    try {
      await resolveOAuthUser({
        email: deactivatedEmail,
        emailConfirmedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof ForbiddenError) {
        forbiddenCaught = true;
      }
    }

    assert.ok(
      forbiddenCaught,
      "Deactivated user must be rejected with ForbiddenError (403)",
    );
    console.log(
      "  ✓ Deactivated user blocked from authentication via Google OAuth.\n",
    );

    // =========================================================================
    // 5. Unverified Email Rejection
    // =========================================================================
    console.log("5. Testing Unverified Email Rejection (401 Unauthorized)...");
    const unverifiedEmail = "oauth_unverified_test@example.com";

    let unauthorizedCaught = false;
    try {
      await resolveOAuthUser({
        email: unverifiedEmail,
        emailConfirmedAt: null, // Not verified by Google
      });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        unauthorizedCaught = true;
      }
    }

    assert.ok(
      unauthorizedCaught,
      "Unverified email must be rejected with UnauthorizedError (401)",
    );

    const unverifiedCheck = await db
      .select()
      .from(users)
      .where(eq(users.email, unverifiedEmail))
      .limit(1);
    assert.strictEqual(
      unverifiedCheck.length,
      0,
      "Unverified email must not create a record in public.users",
    );
    console.log(
      "  ✓ Unverified email rejected before user creation, mitigating spoofing attacks.\n",
    );

    // =========================================================================
    // 6. Returning Google OAuth User Login
    // =========================================================================
    console.log(
      "6. Testing Returning OAuth User Login (No Duplicate Key Errors)...",
    );
    const returningResult = await resolveOAuthUser({
      email: newEmail,
      name: "New OAuth User Updated",
      avatarUrl: "https://example.com/avatar1_updated.jpg",
      emailConfirmedAt: new Date().toISOString(),
    });

    assert.strictEqual(returningResult.user.email, newEmail);
    assert.ok(
      returningResult.access_token,
      "Returning user must receive fresh access token",
    );

    // Ensure only 1 user record exists in DB
    const allUsersWithEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, newEmail));
    assert.strictEqual(
      allUsersWithEmail.length,
      1,
      "Duplicate accounts must never be created",
    );
    console.log(
      "  ✓ Returning Google user logged in smoothly with updated session tokens.\n",
    );

    // =========================================================================
    // 7. Concurrent OAuth Requests (Race Condition Recovery)
    // =========================================================================
    console.log("7. Testing Concurrent OAuth Resolution Requests...");
    const concurrentEmail = "oauth_concurrent_test@example.com";

    const [resA, resB] = await Promise.all([
      resolveOAuthUser({
        email: concurrentEmail,
        name: "Concurrent User A",
        emailConfirmedAt: new Date().toISOString(),
      }),
      resolveOAuthUser({
        email: concurrentEmail,
        name: "Concurrent User B",
        emailConfirmedAt: new Date().toISOString(),
      }),
    ]);

    assert.strictEqual(resA.user.email, concurrentEmail);
    assert.strictEqual(resB.user.email, concurrentEmail);

    const concurrentUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, concurrentEmail));
    assert.strictEqual(
      concurrentUsers.length,
      1,
      "Concurrent resolution must resolve to exactly one user row",
    );
    console.log(
      "  ✓ Concurrent OAuth resolutions completed safely without uncaught conflict errors.\n",
    );

    console.log("🎉 All Google OAuth Integration Tests PASSED successfully!\n");
  } finally {
    // Clean up test data
    console.log("🧹 Cleaning up OAuth test data...");
    await db
      .delete(refreshTokens)
      .where(inArray(refreshTokens.userEmail, testEmails));
    await db.delete(users).where(inArray(users.email, testEmails));
    await db
      .delete(activityLogs)
      .where(inArray(activityLogs.actorEmail, testEmails));
    console.log("  ✓ Cleanup complete.");
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ OAuth Test Suite Failed:", err);
    process.exit(1);
  });
