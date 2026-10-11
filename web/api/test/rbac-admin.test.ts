import assert from "node:assert/strict";
import { eq, or } from "drizzle-orm";
import { createAccessToken } from "../authentication/tokens";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { refreshTokens } from "../database/schema/tokens";
import { activityLogs } from "../database/schema/activity";
import { directMessages } from "../database/schema/messages";
import {
  getOwnProfileController,
  updateOwnProfileController,
  searchUsersController,
} from "../controllers/users.controller";
import {
  listUsersController,
  updateUserRoleController,
  updateUserStatusController,
  listActivityLogsController,
  listAdminConversationsController,
  getAdminDirectMessagesController,
} from "../controllers/admin.controller";
import { withAuth } from "../middlewares/auth.middleware";
import { withRoles } from "../middlewares/authorize.middleware";

async function runRbacTests() {
  console.log("🧪 Starting Step 1.7 RBAC & Admin Oversight Tests...\n");

  const db = getDb();
  const testUserEmail = `rbac_user_${Date.now()}@test.local`;
  const testAdminEmail = `rbac_admin_${Date.now()}@test.local`;
  const testTargetEmail = `rbac_target_${Date.now()}@test.local`;

  // 1. Setup test users in database
  await db.insert(users).values([
    {
      email: testUserEmail,
      name: "RBAC User",
      role: "user",
      isActive: true,
    },
    {
      email: testAdminEmail,
      name: "RBAC Admin",
      role: "admin",
      isActive: true,
    },
    {
      email: testTargetEmail,
      name: "Target Account",
      role: "user",
      isActive: true,
    },
  ]);

  // Insert test refresh token for target user
  await db.insert(refreshTokens).values({
    userEmail: testTargetEmail,
    tokenHash: "test_token_hash_" + Date.now(),
    expiresAt: new Date(Date.now() + 600000),
    isRevoked: false,
  });

  // Seed sample direct message for conversation inspection test
  await db.insert(directMessages).values({
    senderEmail: testUserEmail,
    receiverEmail: testTargetEmail,
    message: "Confidential message for audit inspection",
  });

  const userToken = await createAccessToken({
    sub: testUserEmail,
    role: "user",
  });

  const adminToken = await createAccessToken({
    sub: testAdminEmail,
    role: "admin",
  });

  // Helpers for wrapped handlers
  const authGetProfile = withAuth(getOwnProfileController);
  const authUpdateProfile = withAuth(updateOwnProfileController);
  const authSearchUsers = withAuth(searchUsersController);

  const adminListUsers = withAuth(withRoles("admin")(listUsersController));
  const adminUpdateRole = withAuth(
    withRoles("admin")(updateUserRoleController),
  );
  const adminUpdateStatus = withAuth(
    withRoles("admin")(updateUserStatusController),
  );
  const adminListActivity = withAuth(
    withRoles("admin")(listActivityLogsController),
  );
  const adminListConversations = withAuth(
    withRoles("admin")(listAdminConversationsController),
  );
  const adminGetDirectMessages = withAuth(
    withRoles("admin")(getAdminDirectMessagesController),
  );

  // --------------------------------------------------------------------------
  // 1. User Profile Management (GET /api/users/me & PATCH /api/users/me)
  // --------------------------------------------------------------------------
  console.log("1. Testing User Profile Management...");

  // 1.1 Unauthenticated -> 401
  const unauthReq = new Request("http://localhost:3000/api/users/me");
  const unauthRes = await authGetProfile(unauthReq, {});
  assert.equal(
    unauthRes.status,
    401,
    "Unauthenticated profile access must return 401",
  );

  // 1.2 User reads own profile -> 200
  const ownReq = new Request("http://localhost:3000/api/users/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const ownRes = await authGetProfile(ownReq, {});
  assert.equal(ownRes.status, 200, "Authenticated user can read own profile");
  const ownJson = (await ownRes.json()) as {
    data: { email: string; role: string; name: string };
  };
  assert.equal(ownJson.data.email, testUserEmail);
  assert.equal(ownJson.data.role, "user");

  // 1.3 Update profile with valid payload -> 200
  const updateReq = new Request("http://localhost:3000/api/users/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Updated RBAC User",
      avatar_url: "https://example.com/avatar.png",
    }),
  });
  const updateRes = await authUpdateProfile(updateReq, {});
  assert.equal(updateRes.status, 200, "Profile update must return 200");
  const updateJson = (await updateRes.json()) as {
    data: { name: string; avatar_url: string };
  };
  assert.equal(updateJson.data.name, "Updated RBAC User");
  assert.equal(updateJson.data.avatar_url, "https://example.com/avatar.png");

  // 1.4 No self-promotion: sending extra fields like role is stripped by Zod
  const selfPromoReq = new Request("http://localhost:3000/api/users/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Still User",
      role: "admin", // attempting self-promotion
    }),
  });
  const selfPromoRes = await authUpdateProfile(selfPromoReq, {});
  assert.equal(selfPromoRes.status, 200);
  const verifyDbUser = await db
    .select()
    .from(users)
    .where(eq(users.email, testUserEmail))
    .limit(1);
  assert.equal(
    verifyDbUser[0].role,
    "user",
    "Self-promotion must be completely prevented",
  );
  console.log(
    "  ✓ Profile retrieval, update, and no-self-promotion guard passed.",
  );

  // --------------------------------------------------------------------------
  // 2. User Search by Name / Email (GET /api/users)
  // --------------------------------------------------------------------------
  console.log("\n2. Testing User Search & Role-Scoped Visibility...");

  // 2.1 Normal user search -> limited fields (omits role, is_active)
  const userSearchReq = new Request(
    `http://localhost:3000/api/users?query=Target&limit=5`,
    {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  const userSearchRes = await authSearchUsers(userSearchReq, {});
  assert.equal(userSearchRes.status, 200);
  const userSearchJson = (await userSearchRes.json()) as {
    data: Array<{
      email: string;
      name: string;
      role?: string;
      is_active?: boolean;
    }>;
  };
  assert(userSearchJson.data.length > 0, "Should find target user");
  assert.equal(userSearchJson.data[0].email, testTargetEmail);
  assert.equal(
    userSearchJson.data[0].role,
    undefined,
    "Normal users must not see role in search results",
  );
  assert.equal(
    userSearchJson.data[0].is_active,
    undefined,
    "Normal users must not see is_active in search results",
  );

  // 2.2 Admin search -> full metadata (role, is_active included)
  const adminSearchReq = new Request(
    `http://localhost:3000/api/users?query=Target&limit=5`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const adminSearchRes = await authSearchUsers(adminSearchReq, {});
  assert.equal(adminSearchRes.status, 200);
  const adminSearchJson = (await adminSearchRes.json()) as {
    data: Array<{ email: string; role?: string; is_active?: boolean }>;
  };
  assert.equal(adminSearchJson.data[0].role, "user");
  assert.equal(adminSearchJson.data[0].is_active, true);
  console.log("  ✓ User search and role-scoped field disclosure passed.");

  // --------------------------------------------------------------------------
  // 3. Admin User Management (GET /api/admin/users)
  // --------------------------------------------------------------------------
  console.log("\n3. Testing Admin User Listing...");

  // 3.1 Normal user denied -> 403
  const userListReq = new Request("http://localhost:3000/api/admin/users", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const userListRes = await adminListUsers(userListReq, {});
  assert.equal(
    userListRes.status,
    403,
    "Normal users must be denied admin user list",
  );

  // 3.2 Admin allowed -> 200
  const adminListReq = new Request("http://localhost:3000/api/admin/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminListRes = await adminListUsers(adminListReq, {});
  assert.equal(adminListRes.status, 200, "Admin can list all users");
  const adminListJson = (await adminListRes.json()) as {
    data: Array<{ email: string; role: string; is_active: boolean }>;
  };
  assert(adminListJson.data.some((u) => u.email === testTargetEmail));
  console.log("  ✓ Admin user listing permission guard passed.");

  // --------------------------------------------------------------------------
  // 4. Admin Role Modification (PATCH /api/admin/users/:userEmail/role)
  // --------------------------------------------------------------------------
  console.log("\n4. Testing Admin Role Change...");

  // 4.1 Normal user denied -> 403
  const userChangeRoleReq = new Request(
    `http://localhost:3000/api/admin/users/${testTargetEmail}/role`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    },
  );
  const userChangeRoleRes = await adminUpdateRole(userChangeRoleReq, {
    params: { userEmail: testTargetEmail },
  });
  assert.equal(
    userChangeRoleRes.status,
    403,
    "Normal user cannot change roles",
  );

  // 4.2 Admin changes role -> 200, logs ROLE_CHANGE
  const adminChangeRoleReq = new Request(
    `http://localhost:3000/api/admin/users/${testTargetEmail}/role`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    },
  );
  const adminChangeRoleRes = await adminUpdateRole(adminChangeRoleReq, {
    params: { userEmail: testTargetEmail },
  });
  assert.equal(
    adminChangeRoleRes.status,
    200,
    "Admin can change role to admin",
  );

  const targetDbAfterRole = await db
    .select()
    .from(users)
    .where(eq(users.email, testTargetEmail))
    .limit(1);
  assert.equal(targetDbAfterRole[0].role, "admin");

  const roleLogs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.action, "ROLE_CHANGE"));
  assert(roleLogs.some((l) => l.targetId === testTargetEmail));
  console.log("  ✓ Role change RBAC guard and audit logging passed.");

  // --------------------------------------------------------------------------
  // 5. Admin Deactivation & Immediate Token Revocation (PATCH /api/admin/users/:userEmail/status)
  // --------------------------------------------------------------------------
  console.log("\n5. Testing Account Deactivation & Session Revocation...");

  // 5.1 Deactivate target account -> 200
  const deactivateReq = new Request(
    `http://localhost:3000/api/admin/users/${testTargetEmail}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: false }),
    },
  );
  const deactivateRes = await adminUpdateStatus(deactivateReq, {
    params: { userEmail: testTargetEmail },
  });
  assert.equal(deactivateRes.status, 200);

  // 5.2 Verify refresh tokens were revoked
  const revokedTokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userEmail, testTargetEmail));
  assert(
    revokedTokens.every((t) => t.isRevoked),
    "All refresh tokens must be revoked on deactivation",
  );

  // 5.3 Verify that target account can no longer make authenticated requests (immediate 403)
  const targetToken = await createAccessToken({
    sub: testTargetEmail,
    role: "user",
  });
  const deactivatedApiReq = new Request("http://localhost:3000/api/users/me", {
    headers: { Authorization: `Bearer ${targetToken}` },
  });
  const deactivatedApiRes = await authGetProfile(deactivatedApiReq, {});
  assert.equal(
    deactivatedApiRes.status,
    403,
    "Deactivated user must be rejected immediately with 403 FORBIDDEN",
  );

  // 5.4 Reactivate target account -> 200
  const reactivateReq = new Request(
    `http://localhost:3000/api/admin/users/${testTargetEmail}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: true }),
    },
  );
  const reactivateRes = await adminUpdateStatus(reactivateReq, {
    params: { userEmail: testTargetEmail },
  });
  assert.equal(reactivateRes.status, 200);
  console.log(
    "  ✓ Deactivation, immediate session revocation, and reactivation passed.",
  );

  // --------------------------------------------------------------------------
  // 6. Project-Wide Activity Audit Log (GET /api/admin/activity)
  // --------------------------------------------------------------------------
  console.log("\n6. Testing Activity Log Retrieval & Pagination...");

  // 6.1 Normal user denied -> 403
  const userActivityReq = new Request(
    "http://localhost:3000/api/admin/activity",
    {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  const userActivityRes = await adminListActivity(userActivityReq, {});
  assert.equal(userActivityRes.status, 403);

  // 6.2 Admin allowed -> 200 with cursor pagination
  const adminActivityReq = new Request(
    "http://localhost:3000/api/admin/activity?limit=5",
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const adminActivityRes = await adminListActivity(adminActivityReq, {});
  assert.equal(adminActivityRes.status, 200);
  const adminActivityJson = (await adminActivityRes.json()) as {
    data: unknown[];
    pagination: { limit: number; has_more: boolean };
  };
  assert(adminActivityJson.data.length > 0);
  assert.equal(adminActivityJson.pagination.limit, 5);
  console.log("  ✓ Activity log retrieval and pagination passed.");

  // --------------------------------------------------------------------------
  // 7. Conversation Platform Overview (GET /api/admin/conversations)
  // --------------------------------------------------------------------------
  console.log("\n7. Testing Admin Conversation Platform Overview...");

  const userConvReq = new Request(
    "http://localhost:3000/api/admin/conversations",
    {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  const userConvRes = await adminListConversations(userConvReq, {});
  assert.equal(userConvRes.status, 403);

  const adminConvReq = new Request(
    "http://localhost:3000/api/admin/conversations",
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const adminConvRes = await adminListConversations(adminConvReq, {});
  assert.equal(adminConvRes.status, 200);
  const adminConvJson = (await adminConvRes.json()) as {
    data: { direct_conversations: unknown[]; groups: unknown[] };
  };
  assert(Array.isArray(adminConvJson.data.direct_conversations));
  assert(Array.isArray(adminConvJson.data.groups));
  console.log("  ✓ Admin conversation overview passed.");

  // --------------------------------------------------------------------------
  // 8. Admin Read-Only Conversation Inspection (GET /api/admin/conversations/direct/:userA/:userB/messages)
  // --------------------------------------------------------------------------
  console.log("\n8. Testing Admin Read-Only Conversation Inspection...");

  const userInspectReq = new Request(
    `http://localhost:3000/api/admin/conversations/direct/${testUserEmail}/${testTargetEmail}/messages`,
    {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  const userInspectRes = await adminGetDirectMessages(userInspectReq, {
    params: { userA: testUserEmail, userB: testTargetEmail },
  });
  assert.equal(userInspectRes.status, 403);

  const adminInspectReq = new Request(
    `http://localhost:3000/api/admin/conversations/direct/${testUserEmail}/${testTargetEmail}/messages`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const adminInspectRes = await adminGetDirectMessages(adminInspectReq, {
    params: { userA: testUserEmail, userB: testTargetEmail },
  });
  assert.equal(adminInspectRes.status, 200);
  const adminInspectJson = (await adminInspectRes.json()) as {
    data: Array<{ message: string }>;
  };
  assert(adminInspectJson.data.length > 0);
  assert.equal(
    adminInspectJson.data[0].message,
    "Confidential message for audit inspection",
  );

  // Verify ADMIN_VIEW_CONVERSATION was logged
  const inspectLogs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.action, "ADMIN_VIEW_CONVERSATION"));
  assert(
    inspectLogs.some((l) => l.actorEmail === testAdminEmail),
    "Admin conversation inspection must be logged in activity_logs",
  );
  console.log(
    "  ✓ Admin read-only message inspection and audit logging passed.",
  );

  // Cleanup test records
  await db
    .delete(directMessages)
    .where(
      or(
        eq(directMessages.senderEmail, testUserEmail),
        eq(directMessages.receiverEmail, testUserEmail),
      ),
    );
  await db
    .delete(refreshTokens)
    .where(
      or(
        eq(refreshTokens.userEmail, testUserEmail),
        eq(refreshTokens.userEmail, testAdminEmail),
        eq(refreshTokens.userEmail, testTargetEmail),
      ),
    );
  await db
    .delete(activityLogs)
    .where(
      or(
        eq(activityLogs.actorEmail, testUserEmail),
        eq(activityLogs.actorEmail, testAdminEmail),
        eq(activityLogs.actorEmail, testTargetEmail),
        eq(activityLogs.targetId, testTargetEmail),
      ),
    );
  await db
    .delete(users)
    .where(
      or(
        eq(users.email, testUserEmail),
        eq(users.email, testAdminEmail),
        eq(users.email, testTargetEmail),
      ),
    );

  console.log("\n🎉 All Step 1.7 RBAC & Admin tests passed successfully!");
}

runRbacTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ RBAC test suite failed:", err);
    process.exit(1);
  });
