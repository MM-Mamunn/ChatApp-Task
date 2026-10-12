import assert from "node:assert";
import { eq } from "drizzle-orm";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { verifyPassword } from "../authentication/password";
import { loginController } from "../controllers/auth.controller";
import { formatHttpStatus } from "../../lib/api-client";
import { listUsersController } from "../controllers/admin.controller";
import { verifyAccessToken } from "../authentication/tokens";

async function runTests() {
  console.log(
    "🧪 Starting Login Errors & Test Credentials Verification Tests...\n",
  );

  const db = getDb();

  // =========================================================================
  // Scenario 5: Verify passwords are encrypted with bcrypt (never plaintext)
  // =========================================================================
  console.log("1. Verifying Database Password Storage Security...");
  const accountsToVerify = [
    {
      email: "admin1@example.com",
      plaintext: "admin1@example.com",
      expectedRole: "admin",
    },
    {
      email: "user1@example.com",
      plaintext: "user1@example.com",
      expectedRole: "user",
    },
    {
      email: "user2@example.com",
      plaintext: "user2@example.com",
      expectedRole: "user",
    },
  ];

  for (const acc of accountsToVerify) {
    const record = await db
      .select()
      .from(users)
      .where(eq(users.email, acc.email))
      .limit(1);

    assert.strictEqual(
      record.length,
      1,
      `User ${acc.email} must exist in the database`,
    );
    const u = record[0];

    assert.ok(u.passwordHash, `User ${acc.email} must have a password hash`);
    // Ensure not stored as plaintext
    assert.notStrictEqual(
      u.passwordHash,
      acc.plaintext,
      `User ${acc.email} password MUST NOT be stored in plaintext`,
    );
    // Ensure bcrypt prefix ($2a$ or $2b$) and cost factor 12
    assert.match(
      u.passwordHash,
      /^\$2[ab]\$12\$/,
      `User ${acc.email} password hash must use bcrypt with cost factor 12`,
    );
    // Verify bcrypt comparison succeeds with plaintext
    const isValid = await verifyPassword(acc.plaintext, u.passwordHash);
    assert.strictEqual(
      isValid,
      true,
      `Bcrypt comparison must validate plaintext for ${acc.email}`,
    );

    // Verify role and active status
    assert.strictEqual(
      u.role,
      acc.expectedRole,
      `User ${acc.email} must have role '${acc.expectedRole}'`,
    );
    assert.strictEqual(u.isActive, true, `User ${acc.email} must be active`);
  }
  console.log(
    "  ✓ All 3 accounts use bcrypt cost 12 hashing and are not stored in plaintext.\n",
  );

  // =========================================================================
  // Scenario 1: Log in successfully with each of the three accounts
  // =========================================================================
  console.log("2. Testing Successful Login for All 3 Accounts...");
  const sessionTokens: Record<string, string> = {};

  for (const acc of accountsToVerify) {
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: acc.email,
        password: acc.plaintext,
      }),
    });

    const res = await loginController(loginReq);
    assert.strictEqual(
      res.status,
      200,
      `Login for ${acc.email} must return HTTP 200`,
    );

    const json = await res.json();
    assert.strictEqual(
      json.success,
      true,
      `Login response for ${acc.email} must indicate success`,
    );
    assert.ok(
      json.data.access_token,
      `Access token must be returned for ${acc.email}`,
    );
    assert.strictEqual(
      json.data.user.email,
      acc.email,
      `User email must match ${acc.email}`,
    );
    assert.strictEqual(
      json.data.user.role,
      acc.expectedRole,
      `Role must match ${acc.expectedRole}`,
    );

    // Verify token carries correct subject and role
    const payload = await verifyAccessToken(json.data.access_token);
    assert.strictEqual(payload.sub, acc.email);
    assert.strictEqual(payload.role, acc.expectedRole);

    sessionTokens[acc.email] = json.data.access_token;
  }
  console.log(
    "  ✓ All 3 test accounts logged in successfully with HTTP 200 and valid JWTs.\n",
  );

  // =========================================================================
  // Scenario 2: Verify admin privileges vs regular user permissions
  // =========================================================================
  console.log("3. Testing Role-Based Privileges (Admin vs Regular User)...");

  // Admin access test
  const adminReq = new Request("http://localhost:3000/api/admin/users", {
    method: "GET",
    headers: { Authorization: `Bearer ${sessionTokens["admin1@example.com"]}` },
  });
  const adminRes = await listUsersController(adminReq, {
    userId: "admin1@example.com",
    role: "admin",
  });
  assert.strictEqual(
    adminRes.status,
    200,
    "Admin account must be granted HTTP 200 on admin endpoints",
  );
  const adminJson = await adminRes.json();
  assert.strictEqual(adminJson.success, true);
  assert.ok(Array.isArray(adminJson.data), "Admin should receive users list");

  // Regular user 1 access test (should be blocked by RBAC)
  const user1Payload = await verifyAccessToken(
    sessionTokens["user1@example.com"],
  );
  assert.strictEqual(user1Payload.role, "user", "User 1 must have 'user' role");
  assert.notStrictEqual(
    user1Payload.role,
    "admin",
    "User 1 must NOT have 'admin' role",
  );

  // Regular user 2 access test (should be blocked by RBAC)
  const user2Payload = await verifyAccessToken(
    sessionTokens["user2@example.com"],
  );
  assert.strictEqual(user2Payload.role, "user", "User 2 must have 'user' role");
  assert.notStrictEqual(
    user2Payload.role,
    "admin",
    "User 2 must NOT have 'admin' role",
  );

  console.log(
    "  ✓ Admin account holds admin privileges; User 1 and User 2 hold regular user roles.\n",
  );

  // =========================================================================
  // Scenario 3: Submit incorrect credentials -> 401 (Unauthorized)
  // =========================================================================
  console.log(
    "4. Testing Incorrect Credentials Error Handling (401 Unauthorized)...",
  );
  const wrongPasswordReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin1@example.com",
      password: "WrongPassword999!",
    }),
  });

  const wrongRes = await loginController(wrongPasswordReq);
  assert.strictEqual(
    wrongRes.status,
    401,
    "Wrong password must return HTTP 401",
  );
  const wrongJson = await wrongRes.json();
  assert.strictEqual(wrongJson.success, false);
  assert.strictEqual(wrongJson.error.code, "UNAUTHORIZED");
  assert.strictEqual(wrongJson.error.message, "Invalid email or password");
  assert.strictEqual(formatHttpStatus(wrongRes.status), "401 (Unauthorized)");

  // Non-existent email
  const nonExistentReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nobody@example.com",
      password: "AnyPassword123!",
    }),
  });
  const nonExistentRes = await loginController(nonExistentReq);
  assert.strictEqual(
    nonExistentRes.status,
    401,
    "Non-existent user must return HTTP 401",
  );
  const nonExistentJson = await nonExistentRes.json();
  assert.strictEqual(
    nonExistentJson.error.message,
    "Invalid email or password",
  );
  assert.strictEqual(
    formatHttpStatus(nonExistentRes.status),
    "401 (Unauthorized)",
  );

  console.log(
    "  ✓ Incorrect credentials correctly return HTTP 401 with '401 (Unauthorized)' format.\n",
  );

  // =========================================================================
  // Scenario 4: Missing fields, invalid input, and error format
  // =========================================================================
  console.log(
    "5. Testing Missing Fields and Validation Errors (400 Bad Request)...",
  );

  // Missing password
  const missingPasswordReq = new Request(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin1@example.com",
        password: "",
      }),
    },
  );
  const missingPassRes = await loginController(missingPasswordReq);
  assert.strictEqual(
    missingPassRes.status,
    400,
    "Empty password must return HTTP 400",
  );
  const missingPassJson = await missingPassRes.json();
  assert.strictEqual(missingPassJson.success, false);
  assert.strictEqual(
    formatHttpStatus(missingPassRes.status),
    "400 (Bad Request)",
  );

  // Invalid email format
  const invalidEmailReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "not-a-valid-email",
      password: "password123",
    }),
  });
  const invalidEmailRes = await loginController(invalidEmailReq);
  assert.strictEqual(
    invalidEmailRes.status,
    400,
    "Invalid email must return HTTP 400",
  );
  const invalidEmailJson = await invalidEmailRes.json();
  assert.strictEqual(invalidEmailJson.error.code, "VALIDATION_ERROR");
  assert.strictEqual(
    formatHttpStatus(invalidEmailRes.status),
    "400 (Bad Request)",
  );
  assert.ok(
    invalidEmailJson.error.details.some((d: { issue: string }) =>
      d.issue.includes("email"),
    ),
  );

  // Format HTTP status helper verification across common status codes
  assert.strictEqual(formatHttpStatus(400), "400 (Bad Request)");
  assert.strictEqual(formatHttpStatus(401), "401 (Unauthorized)");
  assert.strictEqual(formatHttpStatus(403), "403 (Forbidden)");
  assert.strictEqual(formatHttpStatus(404), "404 (Not Found)");
  assert.strictEqual(formatHttpStatus(409), "409 (Conflict)");
  assert.strictEqual(formatHttpStatus(500), "500 (Internal Server Error)");

  console.log(
    "  ✓ Validation errors correctly return HTTP 400 with '400 (Bad Request)' format.\n",
  );

  console.log(
    "🎉 All Login Errors & Test Credentials verification tests PASSED successfully!",
  );
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
