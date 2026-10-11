import assert from "node:assert/strict";
import { z } from "zod";
import {
  ConfigValidationError,
  MissingEnvError,
  type ServerEnv,
  validateServerEnv,
} from "../configuration/env";
import {
  API_ERROR_CODES,
  AppError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../errors";
import { withAuth } from "../middlewares/auth.middleware";
import { withRoles } from "../middlewares/authorize.middleware";
import {
  getCorsHeaders,
  handleCorsPreflight,
  isOriginAllowed,
} from "../middlewares/cors.middleware";
import {
  applySecurityHeaders,
  SECURITY_HEADERS,
  withSecurity,
} from "../middlewares/security.middleware";
import type { ApiHandler } from "../middlewares/types";
import { createAccessToken } from "../authentication/tokens";
import { safeParseJson } from "../utils/request";
import {
  apiError,
  apiSuccess,
  badRequestResponse,
  forbiddenResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "../utils/response";
import { formatZodIssues, validateBody, validateQuery } from "../validation";

async function runTests() {
  console.log("🧪 Starting Step 1.5 Security Baseline & Validation Tests...\n");

  // --------------------------------------------------------------------------
  // 1. Missing and Invalid Environment Configuration
  // --------------------------------------------------------------------------
  console.log("1. Testing Environment Validation & Secrets Handling...");

  // 1.1 MissingEnvError when a required key is not found
  assert.throws(
    () => {
      validateServerEnv([
        "NON_EXISTENT_REQUIRED_KEY" as unknown as keyof ServerEnv,
      ]);
    },
    (err: unknown) => {
      assert(err instanceof MissingEnvError);
      assert(err.missingKeys.includes("NON_EXISTENT_REQUIRED_KEY"));
      assert(!err.message.includes("undefined")); // No secret value leakage
      return true;
    },
    "Should throw MissingEnvError for missing required variable",
  );

  // 1.2 ConfigValidationError when a variable fails Zod validation
  const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-valid-url";
    assert.throws(
      () => {
        validateServerEnv();
      },
      (err: unknown) => {
        assert(err instanceof ConfigValidationError);
        assert(err.issues.some((i) => i.key === "NEXT_PUBLIC_APP_URL"));
        return true;
      },
      "Should throw ConfigValidationError for invalid URL format",
    );
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = originalUrl;
  }
  console.log(
    "  ✓ Missing and invalid environment variables fail predictably.",
  );

  // --------------------------------------------------------------------------
  // 2. Standard Error & Success Envelopes
  // --------------------------------------------------------------------------
  console.log("\n2. Testing Response Envelopes & Error Formats...");

  const successRes = apiSuccess({ id: 1, name: "Test" });
  assert.equal(successRes.status, 200);
  const successJson = (await successRes.json()) as {
    success: boolean;
    data: { id: number; name: string };
  };
  assert.equal(successJson.success, true);
  assert.deepEqual(successJson.data, { id: 1, name: "Test" });

  const customErrorRes = apiError(
    API_ERROR_CODES.NOT_FOUND,
    "User not found",
    404,
  );
  assert.equal(customErrorRes.status, 404);

  const badReqRes = badRequestResponse("Malformed payload");
  assert.equal(badReqRes.status, 400);
  const badReqJson = (await badReqRes.json()) as {
    success: boolean;
    error: { code: string; message: string };
  };
  assert.equal(badReqJson.success, false);
  assert.equal(badReqJson.error.code, API_ERROR_CODES.BAD_REQUEST);
  assert.equal(badReqJson.error.message, "Malformed payload");

  const unauthRes = unauthorizedResponse();
  assert.equal(unauthRes.status, 401);
  const unauthJson = (await unauthRes.json()) as {
    success: boolean;
    error: { code: string };
  };
  assert.equal(unauthJson.success, false);
  assert.equal(unauthJson.error.code, API_ERROR_CODES.UNAUTHORIZED);

  const forbRes = forbiddenResponse();
  assert.equal(forbRes.status, 403);
  const forbJson = (await forbRes.json()) as {
    success: boolean;
    error: { code: string };
  };
  assert.equal(forbJson.success, false);
  assert.equal(forbJson.error.code, API_ERROR_CODES.FORBIDDEN);

  // Validate AppError classes
  const appErr = new AppError(
    400,
    API_ERROR_CODES.BAD_REQUEST,
    "Test app error",
  );
  assert.equal(appErr.statusCode, 400);
  assert(new BadRequestError() instanceof AppError);
  assert(new ValidationError([]) instanceof AppError);
  assert(new UnauthorizedError() instanceof AppError);
  assert(new ForbiddenError() instanceof AppError);
  console.log("  ✓ Standard success and error envelopes match API.md.");

  // --------------------------------------------------------------------------
  // 3. Request Parsing & Zod Validation (400 cases)
  // --------------------------------------------------------------------------
  console.log("\n3. Testing Request Body & Query Zod Validation...");

  // 3.1 safeParseJson directly
  const emptyReq = new Request("http://localhost:3000/api/test", {
    method: "POST",
    body: "",
  });
  const emptyParse = await safeParseJson(emptyReq);
  assert.equal(emptyParse.success, false);

  const testSchema = z.object({
    email: z.string().email("Must be a valid email"),
    age: z.number().min(18, "Must be at least 18"),
  });

  // 3.2 Malformed JSON syntax
  const malformedReq = new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"email": "bad json...',
  });
  const malformedResult = await validateBody(malformedReq, testSchema);
  assert.equal(malformedResult.success, false);
  assert.equal(malformedResult.response.status, 400);
  const malformedJson = (await malformedResult.response.json()) as {
    error: { code: string; message: string };
  };
  assert.equal(malformedJson.error.code, API_ERROR_CODES.BAD_REQUEST);
  assert(malformedJson.error.message.includes("Invalid JSON"));

  // 3.3 Schema validation mismatch (invalid email + under 18)
  const invalidReq = new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", age: 12 }),
  });
  const invalidResult = await validateBody(invalidReq, testSchema);
  assert.equal(invalidResult.success, false);
  assert.equal(invalidResult.response.status, 400);
  const invalidJson = (await invalidResult.response.json()) as {
    error: { code: string; details: { field: string; issue: string }[] };
  };
  assert.equal(invalidJson.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  assert(Array.isArray(invalidJson.error.details));
  assert.equal(invalidJson.error.details.length, 2);
  assert.equal(invalidJson.error.details[0].field, "email");
  assert.equal(invalidJson.error.details[1].field, "age");

  // Format Zod issues directly
  const manualParse = testSchema.safeParse({ email: "bad", age: 10 });
  if (!manualParse.success) {
    const manualZodIssues = formatZodIssues(manualParse.error);
    assert(Array.isArray(manualZodIssues));
  }

  // 3.4 Valid body
  const validReq = new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", age: 25 }),
  });
  const validResult = await validateBody(validReq, testSchema);
  assert.equal(validResult.success, true);
  if (validResult.success) {
    assert.equal(validResult.data.email, "user@example.com");
    assert.equal(validResult.data.age, 25);
  }

  // 3.5 Query params validation
  const querySchema = z.object({
    limit: z.coerce.number().min(1).max(100),
  });
  const validQueryReq = new Request("http://localhost:3000/api/test?limit=50");
  const validQueryResult = validateQuery(validQueryReq, querySchema);
  assert.equal(validQueryResult.success, true);
  if (validQueryResult.success) {
    assert.equal(validQueryResult.data.limit, 50);
  }

  const invalidQueryReq = new Request(
    "http://localhost:3000/api/test?limit=999",
  );
  const invalidQueryResult = validateQuery(invalidQueryReq, querySchema);
  assert.equal(invalidQueryResult.success, false);
  assert.equal(invalidQueryResult.response.status, 400);

  const manualValErrRes = validationErrorResponse([
    { field: "test", issue: "failed" },
  ]);
  assert.equal(manualValErrRes.status, 400);
  console.log("  ✓ Zod body and query validation return formatted 400 errors.");

  // --------------------------------------------------------------------------
  // 4. Authentication Middleware (401 cases)
  // --------------------------------------------------------------------------
  console.log("\n4. Testing Authentication Middleware (401)...");

  const protectedHandler: ApiHandler = async (_req, ctx) => {
    return apiSuccess({ user: ctx.userId, role: ctx.role });
  };
  const authWrapped = withAuth(protectedHandler);

  // 4.1 Missing Authorization header
  const noHeaderReq = new Request("http://localhost:3000/api/protected");
  const noHeaderRes = await authWrapped(noHeaderReq, {});
  assert.equal(noHeaderRes.status, 401);
  const noHeaderJson = (await noHeaderRes.json()) as {
    error: { code: string };
  };
  assert.equal(noHeaderJson.error.code, API_ERROR_CODES.UNAUTHORIZED);

  // 4.2 Invalid / malformed bearer token
  const badTokenReq = new Request("http://localhost:3000/api/protected", {
    headers: { Authorization: "Bearer totally-invalid-token" },
  });
  const badTokenRes = await authWrapped(badTokenReq, {});
  assert.equal(badTokenRes.status, 401);
  const badTokenJson = (await badTokenRes.json()) as {
    error: { code: string };
  };
  assert.equal(badTokenJson.error.code, API_ERROR_CODES.UNAUTHORIZED);

  // 4.3 Valid access token
  const validToken = await createAccessToken({
    sub: "user@chat.local",
    role: "user",
  });
  const validTokenReq = new Request("http://localhost:3000/api/protected", {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  const validTokenRes = await authWrapped(validTokenReq, {});
  assert.equal(validTokenRes.status, 200);
  const validTokenJson = (await validTokenRes.json()) as {
    data: { user: string; role: string };
  };
  assert.equal(validTokenJson.data.user, "user@chat.local");
  assert.equal(validTokenJson.data.role, "user");
  console.log(
    "  ✓ withAuth rejects missing/invalid tokens with 401 UNAUTHORIZED.",
  );

  // --------------------------------------------------------------------------
  // 5. Role-Based Authorization Middleware (403 cases)
  // --------------------------------------------------------------------------
  console.log("\n5. Testing RBAC Middleware (403)...");

  const adminOnlyHandler = withRoles("admin")(protectedHandler);

  // 5.1 User role attempting to access admin route
  const forbiddenReq = new Request("http://localhost:3000/api/admin");
  const forbiddenRes = await adminOnlyHandler(forbiddenReq, {
    userId: "user@chat.local",
    role: "user",
  });
  assert.equal(forbiddenRes.status, 403);
  const forbiddenJson = (await forbiddenRes.json()) as {
    error: { code: string };
  };
  assert.equal(forbiddenJson.error.code, API_ERROR_CODES.FORBIDDEN);

  // 5.2 Admin role accessing admin route
  const allowedRes = await adminOnlyHandler(forbiddenReq, {
    userId: "admin@chat.local",
    role: "admin",
  });
  assert.equal(allowedRes.status, 200);
  console.log("  ✓ withRoles rejects unauthorized roles with 403 FORBIDDEN.");

  // --------------------------------------------------------------------------
  // 6. Security Headers & Explicit CORS Handling
  // --------------------------------------------------------------------------
  console.log("\n6. Testing Security Headers & CORS Origins...");

  assert(isOriginAllowed("http://localhost:3000"));
  assert(!isOriginAllowed("https://malicious.example.com"));

  const directCorsHeaders = getCorsHeaders("http://localhost:3000");
  assert.equal(
    directCorsHeaders["Access-Control-Allow-Origin"],
    "http://localhost:3000",
  );

  const preflightResDirect = handleCorsPreflight(
    new Request("http://localhost:3000/api/hello", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000" },
    }),
  );
  assert(preflightResDirect !== null && preflightResDirect.status === 204);

  const directSecRes = applySecurityHeaders(new Response("ok"));
  assert.equal(directSecRes.headers.get("X-Content-Type-Options"), "nosniff");

  const securedHandler = withSecurity(async () => apiSuccess({ ok: true }));

  // 6.1 Standard request gets security headers
  const req = new Request("http://localhost:3000/api/hello");
  const res = await securedHandler(req, {});
  for (const [header, expectedValue] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(
      res.headers.get(header),
      expectedValue,
      `Missing or incorrect header ${header}`,
    );
  }

  // 6.2 Allowed CORS origin gets CORS headers
  const allowedOriginReq = new Request("http://localhost:3000/api/hello", {
    headers: { Origin: "http://localhost:3000" },
  });
  const allowedOriginRes = await securedHandler(allowedOriginReq, {});
  assert.equal(
    allowedOriginRes.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:3000",
  );
  assert.equal(
    allowedOriginRes.headers.get("Access-Control-Allow-Credentials"),
    "true",
  );

  // 6.3 Disallowed CORS origin is rejected
  const disallowedOriginReq = new Request("http://localhost:3000/api/hello", {
    headers: { Origin: "https://evil-unauthorized-site.com" },
  });
  const disallowedOriginRes = await securedHandler(disallowedOriginReq, {});
  assert.equal(disallowedOriginRes.status, 403);
  const disallowedJson = (await disallowedOriginRes.json()) as {
    error: { code: string };
  };
  assert.equal(disallowedJson.error.code, API_ERROR_CODES.FORBIDDEN);

  // 6.4 OPTIONS preflight request for allowed origin returns 204
  const preflightReq = new Request("http://localhost:3000/api/hello", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:3000" },
  });
  const preflightRes = await securedHandler(preflightReq, {});
  assert.equal(preflightRes.status, 204);
  assert.equal(
    preflightRes.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:3000",
  );
  assert(
    preflightRes.headers.get("Access-Control-Allow-Methods")?.includes("POST"),
  );

  console.log(
    "  ✓ Security headers, allowed CORS, and preflight handling verified.",
  );

  console.log(
    "\n🎉 All Step 1.5 Security Baseline & Validation checks passed!",
  );
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
