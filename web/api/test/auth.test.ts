import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  extractRefreshToken,
  hashPassword,
  serializeClearRefreshTokenCookie,
  serializeRefreshTokenCookie,
  verifyPassword,
} from "../authentication";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  hashToken,
  verifyAccessToken,
} from "../authentication/tokens";
import { getDb } from "../database/client";
import { activityLogs, refreshTokens, users } from "../database/schema";
import {
  bootstrapAdminController,
  loginController,
  logoutController,
  refreshController,
  registerController,
} from "../controllers/auth.controller";

async function runAuthTests() {
  console.log("🧪 Starting Step 1.6 Authentication Tests...\n");

  // --------------------------------------------------------------------------
  // 1. Password Hashing & Bcrypt Verification
  // --------------------------------------------------------------------------
  console.log("1. Testing Password Security (Bcrypt Cost 12)...");
  const testPw = "SuperSecretPassword123!";
  const hash = await hashPassword(testPw);
  assert(hash.startsWith("$2b$12$"), "Hash must be bcrypt with cost 12");
  assert.equal(await verifyPassword(testPw, hash), true);
  assert.equal(await verifyPassword("WrongPassword123!", hash), false);
  console.log("  ✓ Bcrypt cost 12 hashing and verification passed.");

  // --------------------------------------------------------------------------
  // 2. Token Security (JWT Access & Opaque Refresh Tokens)
  // --------------------------------------------------------------------------
  console.log("\n2. Testing Access & Refresh Tokens...");
  const token = await createAccessToken({
    sub: "test@example.com",
    role: "user",
  });
  const claims = await verifyAccessToken(token);
  assert.equal(claims.sub, "test@example.com");
  assert.equal(claims.role, "user");

  const opaqueToken = generateOpaqueRefreshToken();
  assert.equal(
    opaqueToken.length,
    64,
    "Opaque token must be 64 hex characters",
  );
  const tokenHashed = hashToken(opaqueToken);
  assert.equal(
    tokenHashed.length,
    64,
    "SHA-256 hash must be 64 hex characters",
  );
  assert.equal(
    tokenHashed,
    hashToken(opaqueToken),
    "SHA-256 must be deterministic",
  );
  console.log("  ✓ JWT access tokens and opaque refresh token hashing passed.");

  // --------------------------------------------------------------------------
  // 3. Cookie Serialization & Extraction
  // --------------------------------------------------------------------------
  console.log("\n3. Testing Cookie Handling...");
  const cookieStr = serializeRefreshTokenCookie("sample-token-123");
  assert(cookieStr.includes("refresh_token=sample-token-123"));
  assert(cookieStr.includes("HttpOnly"));
  assert(cookieStr.includes("Path=/api/auth"));
  assert(cookieStr.includes("SameSite=Lax"));

  const clearCookie = serializeClearRefreshTokenCookie();
  assert(clearCookie.includes("Max-Age=0"));

  const mockReq = new Request("http://localhost:3000/api/auth/refresh", {
    headers: { Cookie: "foo=bar; refresh_token=sample-token-123; baz=qux" },
  });
  assert.equal(extractRefreshToken(mockReq), "sample-token-123");
  console.log("  ✓ Cookie serialization and extraction passed.");

  // --------------------------------------------------------------------------
  // 4. Registration Endpoint (POST /api/auth/register)
  // --------------------------------------------------------------------------
  console.log("\n4. Testing User Registration...");
  const testEmail = `testuser_${Date.now()}@chat.local`;

  // 4.1 Malformed input (short password)
  const badRegReq = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "short",
      name: "Tester",
    }),
  });
  const badRegRes = await registerController(badRegReq);
  assert.equal(badRegRes.status, 400);

  // 4.2 Valid registration
  const regReq = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "StrongPassword123!",
      name: "Test User",
    }),
  });
  const regRes = await registerController(regReq);
  assert.equal(regRes.status, 201);
  const regJson = (await regRes.json()) as {
    success: boolean;
    data: {
      user: { email: string; role: string; name: string };
      access_token: string;
    };
  };
  assert.equal(regJson.success, true);
  assert.equal(regJson.data.user.email, testEmail);
  assert.equal(
    regJson.data.user.role,
    "user",
    "New users must be assigned role 'user'",
  );
  assert(typeof regJson.data.access_token === "string");

  const regSetCookie = regRes.headers.get("Set-Cookie");
  assert(
    regSetCookie?.includes("refresh_token="),
    "Must set refresh_token cookie",
  );
  const registeredRefreshToken = regSetCookie?.split(";")[0]?.split("=")[1];
  assert(registeredRefreshToken, "Must extract registered refresh token");

  // 4.3 Duplicate email registration -> 409 Conflict
  const dupRegReq = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "StrongPassword123!",
      name: "Test User Duplicate",
    }),
  });
  const dupRegRes = await registerController(dupRegReq);
  assert.equal(dupRegRes.status, 409);
  const dupJson = (await dupRegRes.json()) as { error: { code: string } };
  assert.equal(dupJson.error.code, "CONFLICT");
  console.log(
    "  ✓ Registration, default role assignment, and 409 duplicate check passed.",
  );

  // --------------------------------------------------------------------------
  // 5. Login Endpoint (POST /api/auth/login)
  // --------------------------------------------------------------------------
  console.log("\n5. Testing User Login...");

  // 5.1 Invalid password -> 401
  const badPwReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "IncorrectPassword!" }),
  });
  const badPwRes = await loginController(badPwReq);
  assert.equal(badPwRes.status, 401);

  // 5.2 Valid login -> 200
  const loginReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "StrongPassword123!" }),
  });
  const loginRes = await loginController(loginReq);
  assert.equal(loginRes.status, 200);
  const loginJson = (await loginRes.json()) as {
    success: boolean;
    data: { user: { email: string; role: string }; access_token: string };
  };
  assert.equal(loginJson.success, true);
  assert.equal(loginJson.data.user.email, testEmail);

  const loginSetCookie = loginRes.headers.get("Set-Cookie");
  assert(loginSetCookie?.includes("refresh_token="));
  const loggedInRefreshToken = loginSetCookie?.split(";")[0]?.split("=")[1];
  assert(loggedInRefreshToken);

  // 5.3 Deactivated user -> 403 Forbidden
  const db = getDb();
  await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.email, testEmail));

  const deactivatedLoginReq = new Request(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "StrongPassword123!",
      }),
    },
  );
  const deactivatedLoginRes = await loginController(deactivatedLoginReq);
  assert.equal(deactivatedLoginRes.status, 403);
  const deactivatedJson = (await deactivatedLoginRes.json()) as {
    error: { code: string };
  };
  assert.equal(deactivatedJson.error.code, "FORBIDDEN");

  // Reactivate user for subsequent tests
  await db
    .update(users)
    .set({ isActive: true })
    .where(eq(users.email, testEmail));
  console.log(
    "  ✓ Login success, invalid password rejection, and deactivation check passed.",
  );

  // --------------------------------------------------------------------------
  // 6. Token Refresh Endpoint (POST /api/auth/refresh)
  // --------------------------------------------------------------------------
  console.log("\n6. Testing Refresh Token Rotation...");

  // 6.1 Successful rotation
  const refreshReq = new Request("http://localhost:3000/api/auth/refresh", {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${loggedInRefreshToken}`,
    },
  });
  const refreshRes = await refreshController(refreshReq);
  assert.equal(refreshRes.status, 200);
  const refreshJson = (await refreshRes.json()) as {
    success: boolean;
    data: { access_token: string };
  };
  assert.equal(refreshJson.success, true);
  assert(typeof refreshJson.data.access_token === "string");

  const rotatedSetCookie = refreshRes.headers.get("Set-Cookie");
  const rotatedRefreshToken = rotatedSetCookie?.split(";")[0]?.split("=")[1];
  assert(rotatedRefreshToken);
  assert.notEqual(
    rotatedRefreshToken,
    loggedInRefreshToken,
    "Token must be rotated",
  );

  // 6.2 Reusing old revoked token -> 401
  const reuseOldReq = new Request("http://localhost:3000/api/auth/refresh", {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${loggedInRefreshToken}`,
    },
  });
  const reuseOldRes = await refreshController(reuseOldReq);
  assert.equal(reuseOldRes.status, 401);

  // 6.3 Missing refresh token -> 401
  const missingRefreshReq = new Request(
    "http://localhost:3000/api/auth/refresh",
    {
      method: "POST",
    },
  );
  const missingRefreshRes = await refreshController(missingRefreshReq);
  assert.equal(missingRefreshRes.status, 401);
  console.log("  ✓ Refresh token rotation and replay prevention passed.");

  // --------------------------------------------------------------------------
  // 7. Logout Endpoint (POST /api/auth/logout)
  // --------------------------------------------------------------------------
  console.log("\n7. Testing Logout...");
  const logoutReq = new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${rotatedRefreshToken}`,
    },
  });
  const logoutRes = await logoutController(logoutReq);
  assert.equal(logoutRes.status, 200);
  const logoutJson = (await logoutRes.json()) as {
    success: boolean;
    message: string;
  };
  assert.equal(logoutJson.success, true);

  const logoutSetCookie = logoutRes.headers.get("Set-Cookie");
  assert(
    logoutSetCookie?.includes("Max-Age=0"),
    "Logout must clear the cookie",
  );

  // Verify that the logged-out token can no longer be refreshed
  const afterLogoutRefreshReq = new Request(
    "http://localhost:3000/api/auth/refresh",
    {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${rotatedRefreshToken}`,
      },
    },
  );
  const afterLogoutRes = await refreshController(afterLogoutRefreshReq);
  assert.equal(afterLogoutRes.status, 401);
  console.log("  ✓ Logout token invalidation and cookie clearing passed.");

  // --------------------------------------------------------------------------
  // 8. Bootstrap Admin Endpoint (POST /api/auth/bootstrap-admin)
  // --------------------------------------------------------------------------
  console.log("\n8. Testing Bootstrap Admin Protection...");

  // 8.1 Invalid secret -> 401
  const badSecretReq = new Request(
    "http://localhost:3000/api/auth/bootstrap-admin",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bootstrap-Secret": "WrongSecret",
      },
      body: JSON.stringify({
        email: "newadmin@chat.local",
        password: "AdminPassword123!",
        name: "New Admin",
      }),
    },
  );
  const badSecretRes = await bootstrapAdminController(badSecretReq);
  assert.equal(badSecretRes.status, 401);

  // 8.2 Attempting bootstrap when admin already exists (admin@chat.local exists in seed) -> 403
  const existingAdminReq = new Request(
    "http://localhost:3000/api/auth/bootstrap-admin",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bootstrap-Secret": "BootstrapSecret123!",
      },
      body: JSON.stringify({
        email: "anotheradmin@chat.local",
        password: "AdminPassword123!",
        name: "Another Admin",
      }),
    },
  );
  const existingAdminRes = await bootstrapAdminController(existingAdminReq);
  assert.equal(existingAdminRes.status, 403);
  const existingAdminJson = (await existingAdminRes.json()) as {
    error: { code: string };
  };
  assert.equal(existingAdminJson.error.code, "FORBIDDEN");
  console.log(
    "  ✓ Bootstrap admin protection and existing-admin guard passed.",
  );

  // Cleanup test user
  await db.delete(refreshTokens).where(eq(refreshTokens.userEmail, testEmail));
  await db.delete(activityLogs).where(eq(activityLogs.actorEmail, testEmail));
  await db.delete(users).where(eq(users.email, testEmail));

  console.log("\n🎉 All Step 1.6 Authentication tests passed successfully!");
}

runAuthTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Auth test suite failed:", err);
    process.exit(1);
  });
