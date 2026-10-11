# API Architecture & Contract Specification

**Document Version:** 1.0.0  
**Phase:** Part 1 — Step 1.3  
**Status:** Authoritative API Contract  
**Application Root:** `/web` (Next.js 16 App Router)  
**Database:** Supabase PostgreSQL with Drizzle ORM  

---

## 1. System Architecture & Request Pipeline

All backend API logic is integrated directly into the Next.js full-stack application inside [`/web`](file:///c:/Users/USER/Desktop/Task/web). There is **no separate backend application** and **no root-level `api/` directory**.

### 1.1 Architectural Layers

```
[ Browser / Frontend Client ]
         │  HTTP / JSON
         ▼
[ Next.js App Router ]  ───────► web/app/api/**/route.ts
         │
         ▼
[ API Routes Layer ]    ───────► web/api/routes/*.ts
         │
         ├─── [ Middlewares ]   ─► web/api/middlewares/ (withAuth, withRoles)
         │           │
         │           ▼
         │      [ Authentication ] web/api/authentication/ (JWT via jose)
         ▼
[ Controllers Layer ]   ───────► web/api/controllers/*.ts (validates inputs, formats JSON)
         │
         ▼
[ Services Layer ]      ───────► web/api/services/*.ts (domain logic & transactions)
         │
         ▼
[ Drizzle ORM Data Access ] ───► web/api/database/client.ts (getDb)
         │
         ▼
[ Supabase PostgreSQL ] ───────► Persistent Relational Storage & Realtime Engine
```

### 1.2 Responsibilities of Each Layer

1. **Next.js Route Handlers (`web/app/api/**/route.ts`):**  
   HTTP entry points defining exported HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`). They receive `Request` objects, extract route parameters, and delegate execution to the modular routes layer.
2. **API Routes (`web/api/routes/*.ts`):**  
   Define route pipeline definitions. Combine middleware decorators (`withAuth`, `withRoles`) with controllers to process requests in a uniform manner.
3. **Middlewares (`web/api/middlewares/*.ts`):**  
   Reusable pipeline functions that intercept requests before controller execution:
   - `withAuth`: Extracts Bearer JWT tokens from the `Authorization` header, validates them with `verifyAccessToken`, and populates `ApiContext` (`userId`, `role`).
   - `withRoles`: Enforces role-based permissions (`user` vs `admin`), returning `403 Forbidden` if unauthorized.
4. **Controllers (`web/api/controllers/*.ts`):**  
   Handle HTTP concerns: validate payload schemas (Zod), extract headers and parameters, call appropriate services, handle caught exceptions, and serialize responses via `Response.json()`.
5. **Services (`web/api/services/*.ts`):**  
   Encapsulate core domain operations and business logic (e.g., duplicate conversation resolution, password verification, audit logging). Independent of HTTP transport.
6. **Database & Drizzle ORM (`web/api/database/`):**  
   Provides singleton connection client (`client.ts`), Drizzle schemas (`schema/`), migrations (`migrations/`), and Drizzle Kit configuration (`drizzle.config.ts`).
7. **Authentication (`web/api/authentication/`):**  
   Token signing (`createAccessToken`), token verification (`verifyAccessToken`), and token configuration constants (`jwt.config.ts`).
8. **Configuration (`web/api/configuration/`):**  
   Centralized environment variable reader (`requireEnv`, `optionalEnv`) that throws descriptive `MissingEnvError` if variables are missing.

---

## 2. Database Resources & Schema Design

The data layer uses **Drizzle ORM** connected to **Supabase PostgreSQL**. The schema incorporates the core required entities and includes necessary supporting entities for group membership, refresh token management, and audit logging.

### 2.1 Table: `roles`

Defines the system roles according to the project RBAC model.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `role` | `varchar(32)` | **PRIMARY KEY** | Unique role identifier (`user` or `admin`) |
| `description` | `text` | Nullable | Optional description of permissions |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Record creation timestamp |

*Initial seed rows:* `'user'`, `'admin'`.

---

### 2.2 Table: `users`

Represents user accounts, authentication credentials, and profiles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `email` | `varchar(255)` | **PRIMARY KEY** | Unique email address serving as primary key |
| `password_hash` | `varchar(255)` | Nullable | Bcrypt hash (null for OAuth-only users) |
| `name` | `varchar(128)` | **NOT NULL** | Display name |
| `avatar_url` | `text` | Nullable | Profile avatar image URL |
| `role` | `varchar(32)` | **NOT NULL**, **FK** `roles(role)` | User role (defaults to `'user'`) |
| `is_active` | `boolean` | **NOT NULL**, default `true` | Account active status (deactivation flag) |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Registration timestamp |
| `updated_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Last profile update timestamp |

---

### 2.3 Table: `direct_messages`

Stores one-to-one chat messages between two users.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | **PRIMARY KEY**, default `gen_random_uuid()` | Unique message identifier |
| `sender_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` | Message author |
| `receiver_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` | Message recipient |
| `message` | `text` | **NOT NULL** | Text content (non-empty, non-whitespace) |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Message send timestamp |

*Indexes:*
- `idx_direct_messages_pair_created`: `(sender_email, receiver_email, created_at DESC)`
- `idx_direct_messages_receiver`: `(receiver_email, created_at DESC)`

*Conversation Retrieval Logic:*  
A direct conversation between User A and User B is defined by messages where `(sender_email = A AND receiver_email = B) OR (sender_email = B AND receiver_email = A)`. Creating a conversation between A and B returns the existing conversation if any messages or participants exist, preventing duplicates.

---

### 2.4 Table: `groups`

Represents multi-user group chat channels.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `group_id` | `uuid` | **PRIMARY KEY**, default `gen_random_uuid()` | Unique group identifier |
| `name` | `varchar(128)` | **NOT NULL** | Group title / display name |
| `creator_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` | User who established the group |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Group creation timestamp |

---

### 2.5 Table: `group_chat_messages` (Preserved As Specified)

Stores messages sent within group channels.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `group_id` | `uuid` | **NOT NULL**, **FK** `groups(group_id)` | Channel reference |
| `sender_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` | Message author |
| `receiver_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` | Intended recipient or group member reference |
| `message` | `text` | **NOT NULL** | Text content (non-empty, non-whitespace) |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Send timestamp |

> [!WARNING] Architectural Evaluation: Group Messages Table Lacks Primary Key
> As required by the project specifications, the `group_chat_messages` table is defined **without a primary key**.
> 
> **Practical Implications:**
> 1. **Message Identity & Mutation:** Without a unique surrogate identifier (e.g. `id`), individual messages cannot be individually referenced, edited, or deleted.
> 2. **Realtime Replication:** Supabase Realtime (PostgreSQL Logical Replication) requires either a `PRIMARY KEY` or `REPLICA IDENTITY FULL` to track row-level broadcast updates cleanly.
> 3. **Pagination Determinism:** If two messages are inserted in the same millisecond (`created_at`), cursor pagination without an auxiliary tie-breaker column can cause messages to be skipped or duplicated across page boundaries.
> 
> **Architectural Recommendation for Step 1.4:**
> While preserving this core schema contract, the implementation in Step 1.4 should add a composite index on `(group_id, created_at DESC, sender_email)` to optimize range queries, and document that client applications use `(group_id, sender_email, created_at)` as a synthetic composite identity for client-side list rendering.

---

### 2.6 Supporting Table: `group_members`

Enables group participation checks, participant listings, and membership-safe realtime broadcasting.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `group_id` | `uuid` | **NOT NULL**, **FK** `groups(group_id)` ON DELETE CASCADE | Associated group |
| `user_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` ON DELETE CASCADE | Member email |
| `joined_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | When user joined |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Record creation timestamp |

*Primary Key:* Composite `(group_id, user_email)`.

---

### 2.7 Supporting Table: `refresh_tokens`

Required to manage the JWT refresh token lifecycle, token rotation, and sign-out invalidation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | **PRIMARY KEY**, default `gen_random_uuid()` | Unique record ID |
| `user_email` | `varchar(255)` | **NOT NULL**, **FK** `users(email)` ON DELETE CASCADE | Associated user |
| `token_hash` | `varchar(255)` | **NOT NULL**, **UNIQUE** | SHA-256 hash of refresh token |
| `expires_at` | `timestamp with time zone` | **NOT NULL** | Expiration timestamp |
| `is_revoked` | `boolean` | **NOT NULL**, default `false` | Revocation indicator |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Issuance timestamp |

---

### 2.8 Supporting Table: `activity_logs`

Fulfills the requirement to record sign-ins, user creations, conversations, messages, role changes, deactivations, and admin inspections.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | **PRIMARY KEY**, default `gen_random_uuid()` | Unique log event ID |
| `actor_email` | `varchar(255)` | **NOT NULL** | User who executed the action |
| `action` | `varchar(64)` | **NOT NULL** | Event code (e.g. `USER_SIGNIN`, `ROLE_CHANGE`) |
| `target_type` | `varchar(64)` | Nullable | Target entity (`user`, `group`, `message`) |
| `target_id` | `varchar(255)` | Nullable | Target identifier |
| `details` | `jsonb` | Nullable | Context metadata |
| `created_at` | `timestamp with time zone` | **NOT NULL**, default `now()` | Event timestamp |

---

## 3. Standard Request, Response & Error Contracts

### 3.1 Standard Success Envelope

Successful API responses return a top-level `success: true` envelope.

```json
{
  "success": true,
  "data": { ... }
}
```

For paginated lists, responses include a `pagination` metadata object alongside `data`:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "2026-10-11T09:30:00.000Z",
    "prev_cursor": null
  }
}
```

### 3.2 Standard Error Envelope

All API errors return a standard `success: false` JSON structure with an `error` object and appropriate HTTP status code.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email address format"
      }
    ]
  }
}
```

### 3.3 Standard Error Codes & Status Mapping

| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `BAD_REQUEST` | Malformed request body, unparseable JSON |
| `400 Bad Request` | `VALIDATION_ERROR` | Request validation failed (Zod schema mismatch) |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, invalid, or expired access token |
| `403 Forbidden` | `FORBIDDEN` | Authenticated, but user lacks permission or is deactivated |
| `404 Not Found` | `NOT_FOUND` | Requested user, group, or resource does not exist |
| `409 Conflict` | `CONFLICT` | Resource conflict (e.g. email already registered) |
| `429 Too Many Requests` | `RATE_LIMITED` | Request rate limit exceeded |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected internal exception (no stack trace exposed) |

---

## 4. Authentication and JWT Contract

### 4.1 Token Specifications

1. **Access Token:**
   - **Type:** Signed JWT (algorithm: `HS256` via `jose`).
   - **Secret:** `JWT_ACCESS_SECRET`.
   - **Lifetime:** 15 minutes (`900` seconds).
   - **Claims:**
     ```json
     {
       "sub": "user@example.com",
       "role": "user",
       "name": "Jane Doe",
       "iat": 1760173200,
       "exp": 1760174100
     }
     ```
   - **Transmission:** HTTP Request Header:  
     `Authorization: Bearer <accessToken>`

2. **Refresh Token:**
   - **Type:** Opaque 64-character high-entropy cryptographic hex token.
   - **Storage:** Persisted as a SHA-256 hash in the `refresh_tokens` database table.
   - **Lifetime:** 7 days.
   - **Transmission:** Stored and transmitted via a secure, HTTP-only cookie named `refresh_token`:
     - `HttpOnly: true`
     - `Secure: true` (in production)
     - `SameSite: Lax`
     - `Path: /api/auth`
     - `Max-Age: 604800`

### 4.2 Credential & Password Security
- Passwords are encrypted before database insertion using **bcrypt** with a minimum salt rounds factor of `12`.
- Plaintext passwords or password hashes are never logged, returned in API responses, or exposed to the client.

### 4.3 Session Lifecycle Workflows
1. **Sign-In:** Returns user profile, access token in body, and sets HTTP-only refresh cookie.
2. **Token Refresh (`POST /api/auth/refresh`):**  
   Reads cookie `refresh_token`, verifies active state in database, rotates the token (revoking the old one and creating a new one), and returns a fresh access token.
3. **Sign-Out (`POST /api/auth/logout`):**  
   Revokes the refresh token record in the database and clears the `refresh_token` cookie with an expired `Max-Age=0`.
4. **Deactivation Check:**  
   Every protected request verifies through `withAuth` and the user session cache that `is_active` remains true. Deactivated users immediately receive `403 Forbidden`.

---

## 5. Role-Based Access Control (RBAC) & Middleware Rules

### 5.1 Roles Definition
- **`user`:** Standard authenticated individual. Can chat in direct conversations they participate in, join/create groups, and search users with limited field visibility.
- **`admin`:** System administrator. Can manage user roles, deactivate accounts, view project-wide activity logs, and read non-member conversations in a strictly read-only mode.

### 5.2 Authoritative Permission Matrix

| Operation | `user` | `admin` | Enforcement Mechanism |
|---|---|---|---|
| Register / Sign In | Allowed | Allowed | Public |
| View / Update Own Profile | Allowed | Allowed | `withAuth` (`sub === target`) |
| User Search | Allowed (limited fields) | Allowed (full fields) | `withAuth` + Controller field filter |
| Start / View Direct Chats | Allowed (own chats only) | Allowed (own chats only) | `withAuth` + participant query filter |
| Send Direct Message | Allowed (in own chat) | Allowed (in own chat) | `withAuth` + participant validation |
| Create / Manage Groups | Allowed | Allowed | `withAuth` |
| Read / Send Group Messages | Allowed (member only) | Allowed (member only) | `withAuth` + `group_members` check |
| Read Non-Member Chats | **Denied (403)** | **Allowed (Read-Only)** | `withRoles('admin')` |
| Send Message in Non-Member Chat | **Denied (403)** | **Denied (403)** | Denied at service layer |
| List All Users | **Denied (403)** | **Allowed** | `withRoles('admin')` |
| Change User Roles | **Denied (403)** | **Allowed** | `withRoles('admin')` |
| Deactivate / Reactivate User | **Denied (403)** | **Allowed** | `withRoles('admin')` |
| View Project Audit Activity | **Denied (403)** | **Allowed** | `withRoles('admin')` |

### 5.3 Middleware Execution Order

```
Incoming Request
  │
  ├─► [1. CORS & Headers Filter]      (Validate Origin, Security Headers)
  │
  ├─► [2. Rate Limiter Middleware]    (Optional DOS protection)
  │
  ├─► [3. withAuth Middleware]         (Extract Bearer JWT, verify via jose)
  │         └─► Fails? ──► Return 401 Unauthorized
  │
  ├─► [4. withRoles Middleware]        (Check context.role against allowed roles)
  │         └─► Fails? ──► Return 403 Forbidden
  │
  ├─► [5. Validation Middleware]       (Zod body/query/param schema validation)
  │         └─► Fails? ──► Return 400 Validation Error
  │
  └─► [6. Controller Action]           (Service call, database transaction, Response.json)
```

---

## 6. First-Admin Bootstrap Mechanism

To prevent chicken-and-egg deployment issues while prohibiting unauthorized privilege escalation:

### 6.1 Bootstrap Security Principles
1. **One-Time Only:** The bootstrap operation is only callable when **zero users with role `admin`** exist in the system.
2. **Secret Protected:** The caller must supply a server-configured secret (`BOOTSTRAP_SECRET` or `ADMIN_BOOTSTRAP_EMAIL`) in the request.
3. **Atomic Race-Condition Protection:** Handled via a database transaction:
   ```sql
   SELECT count(*) FROM users WHERE role = 'admin';
   ```
   If count > 0, the endpoint immediately aborts with `403 Forbidden` (`ADMIN_ALREADY_EXISTS`).
4. **No Self-Promotion:** Normal profile update endpoints (`PATCH /api/users/me`) strictly ignore any role fields in user payloads.

---

## 7. Pagination & Message History Strategy

### 7.1 Cursor-Based Pagination
List endpoints for messages and activity logs utilize **timestamp cursor pagination** (`created_at`) rather than offset pagination to prevent duplicate or missing records when new messages arrive concurrently.

### 7.2 Parameters

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | `integer` | `20` | `50` | Maximum items to return |
| `before` | `ISO 8601 string` | `null` | - | Retrieve items created before this timestamp |
| `after` | `ISO 8601 string` | `null` | - | Retrieve items created after this timestamp |

### 7.3 Ordering & Tie-Breaking
- Order: `created_at DESC` (newest first).
- Tie-Breaker: For tables with a primary key, `id` is used as a secondary sort key (`ORDER BY created_at DESC, id DESC`).
- For `group_chat_messages` (no primary key), tie-breaking falls back to `(created_at DESC, sender_email DESC)`.

---

## 8. Complete API Endpoints Specification

### 8.1 System & Health

#### `GET /api/hello`
- **Purpose:** Verifies backend connectivity through the controller-service pipeline.
- **Access:** Public.
- **RBAC:** All.
- **Headers:** None.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Hello World"
  }
  ```

---

### 8.2 Authentication & Session Management

#### `POST /api/auth/register`
- **Purpose:** Creates a new account via email and password.
- **Access:** Public.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Doe"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "user@example.com",
        "name": "Jane Doe",
        "avatar_url": null,
        "role": "user"
      },
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookies Set:** `refresh_token=<token>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800`
- **Errors:**
  - `400 VALIDATION_ERROR`: Missing or invalid email/password format.
  - `409 CONFLICT`: Email address is already registered.

---

#### `POST /api/auth/login`
- **Purpose:** Authenticates user credentials and issues tokens.
- **Access:** Public.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "user@example.com",
        "name": "Jane Doe",
        "avatar_url": null,
        "role": "user"
      },
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookies Set:** `refresh_token=<token>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth`
- **Errors:**
  - `400 VALIDATION_ERROR`: Malformed input.
  - `401 UNAUTHORIZED`: Invalid email or password.
  - `403 FORBIDDEN`: Account deactivated.

---

#### `POST /api/auth/google`
- **Purpose:** Completes Google OAuth login; provisions account and profile on first login.
- **Access:** Public.
- **Request Body:**
  ```json
  {
    "id_token": "google-oauth-id-token"
  }
  ```
- **Response (200 OK):** Standard user and `access_token` payload.
- **Cookies Set:** `refresh_token` HTTP-only cookie.
- **Errors:** `401 UNAUTHORIZED` (Invalid Google token).

---

#### `POST /api/auth/refresh`
- **Purpose:** Rotates refresh token and issues a new short-lived access token.
- **Access:** Requires valid `refresh_token` cookie.
- **Headers:** `Cookie: refresh_token=<token>`
- **Request Body:** None.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookies Set:** Rotated `refresh_token` HTTP-only cookie.
- **Errors:** `401 UNAUTHORIZED` (Expired or revoked refresh token).

---

#### `POST /api/auth/logout`
- **Purpose:** Invalidates the current refresh token and clears the session.
- **Access:** Public / Authenticated.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Cookies Set:** `refresh_token=; Max-Age=0; Path=/api/auth`

---

#### `POST /api/auth/bootstrap-admin`
- **Purpose:** One-time creation or promotion of the initial administrator account.
- **Access:** Protected by bootstrap secret header.
- **Headers:** `X-Bootstrap-Secret: <ADMIN_BOOTSTRAP_SECRET>`
- **Request Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "name": "System Admin"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "admin@example.com",
        "name": "System Admin",
        "role": "admin"
      }
    }
  }
  ```
- **Errors:**
  - `401 UNAUTHORIZED`: Missing or incorrect bootstrap secret.
  - `403 FORBIDDEN`: An administrator account already exists.

---

### 8.3 User Discovery & Profile Management

#### `GET /api/users/me`
- **Purpose:** Returns the current authenticated user's profile and role.
- **Access:** Authenticated (`user` or `admin`).
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "email": "user@example.com",
      "name": "Jane Doe",
      "avatar_url": "https://example.com/avatar.jpg",
      "role": "user",
      "created_at": "2026-10-11T08:00:00.000Z"
    }
  }
  ```

---

#### `PATCH /api/users/me`
- **Purpose:** Updates current user's profile information.
- **Access:** Authenticated (`user` or `admin`).
- **Headers:** `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "name": "Jane M. Doe",
    "avatar_url": "https://example.com/new-avatar.jpg"
  }
  ```
- **Response (200 OK):** Returns updated user profile object.
- **Errors:** `400 VALIDATION_ERROR` (Invalid avatar URL or empty name).

---

#### `GET /api/users`
- **Purpose:** Searches users by name or email. Returns limited fields for `user` role, full profile for `admin`.
- **Access:** Authenticated.
- **Query Parameters:**
  - `query` (string, required): Search term (min 1 char).
  - `limit` (integer, optional, default `10`, max `20`).
- **Response for `user` role (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "email": "bob@example.com",
        "name": "Bob Smith",
        "avatar_url": "https://example.com/bob.jpg"
      }
    ]
  }
  ```
  *(Omit `role`, `is_active`, `created_at` for non-admin callers).*

---

### 8.4 Direct Conversations & Messages

#### `GET /api/conversations/direct`
- **Purpose:** Lists all direct conversations for the authenticated user, ordered by most recent activity.
- **Access:** Authenticated.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "other_user": {
          "email": "bob@example.com",
          "name": "Bob Smith",
          "avatar_url": null
        },
        "last_message": {
          "message": "Hey Jane, let's catch up!",
          "created_at": "2026-10-11T09:45:00.000Z",
          "sender_email": "bob@example.com"
        }
      }
    ]
  }
  ```

---

#### `POST /api/conversations/direct`
- **Purpose:** Initiates a direct conversation with a recipient. Returns existing conversation if already active.
- **Access:** Authenticated.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "recipient_email": "bob@example.com"
  }
  ```
- **Response (200 OK / 201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "other_user": {
        "email": "bob@example.com",
        "name": "Bob Smith",
        "avatar_url": null
      },
      "is_new": false
    }
  }
  ```
- **Errors:**
  - `400 BAD_REQUEST`: Attempting to start conversation with self.
  - `404 NOT_FOUND`: Recipient email does not exist.

---

#### `GET /api/conversations/direct/{userEmail}/messages`
- **Purpose:** Retrieves paginated message history between the current user and the specified recipient.
- **Access:** Authenticated (caller must be participant, or admin for read-only audit).
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** `limit` (default 20), `before` (cursor timestamp).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "e9b25206-8c4f-4d92-96c2-1b15c9d64024",
        "sender_email": "user@example.com",
        "receiver_email": "bob@example.com",
        "message": "Sounds good!",
        "created_at": "2026-10-11T09:46:12.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```
- **Errors:**
  - `403 FORBIDDEN`: Non-admin trying to access conversations between third parties.

---

#### `POST /api/conversations/direct/{userEmail}/messages`
- **Purpose:** Sends a direct message to the specified recipient.
- **Access:** Authenticated (sender is `context.userId`).
- **Headers:** `Authorization: Bearer <accessToken>`
- **Request Body:**
  ```json
  {
    "message": "Hey Bob, see you tomorrow."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f13b19-58cb-4ee4-9ef0-e04db14902ff",
      "sender_email": "user@example.com",
      "receiver_email": "bob@example.com",
      "message": "Hey Bob, see you tomorrow.",
      "created_at": "2026-10-11T09:48:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 VALIDATION_ERROR`: Empty or whitespace-only message text.
  - `404 NOT_FOUND`: Recipient not found.

---

### 8.5 Group Conversations & Messages

#### `GET /api/groups`
- **Purpose:** Lists all groups the authenticated user belongs to.
- **Access:** Authenticated.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "group_id": "71a81ce3-3168-4509-ae94-3a5f36e3c042",
        "name": "Product Launch Team",
        "creator_email": "admin@example.com",
        "member_count": 5,
        "created_at": "2026-10-11T07:30:00.000Z"
      }
    ]
  }
  ```

---

#### `POST /api/groups`
- **Purpose:** Creates a new named group conversation with initial participants.
- **Access:** Authenticated.
- **Request Body:**
  ```json
  {
    "name": "Design Sprint",
    "participant_emails": ["alice@example.com", "bob@example.com"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
      "name": "Design Sprint",
      "creator_email": "user@example.com",
      "participants": ["user@example.com", "alice@example.com", "bob@example.com"],
      "created_at": "2026-10-11T09:50:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 VALIDATION_ERROR`: Empty name or invalid participant email list.

---

#### `GET /api/groups/{groupId}/messages`
- **Purpose:** Retrieves paginated group message history.
- **Access:** Authenticated (caller must be a group member, or an admin).
- **Query Parameters:** `limit` (default 20), `before` (timestamp cursor).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
        "sender_email": "alice@example.com",
        "receiver_email": "user@example.com",
        "message": "I uploaded the sketches.",
        "created_at": "2026-10-11T09:55:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```
- **Errors:**
  - `403 FORBIDDEN`: Caller is not a participant of this group.
  - `404 NOT_FOUND`: Group does not exist.

---

#### `POST /api/groups/{groupId}/messages`
- **Purpose:** Sends a message to a group channel.
- **Access:** Authenticated (caller must be a group member).
- **Request Body:**
  ```json
  {
    "message": "Thanks Alice, reviewing now!",
    "receiver_email": "alice@example.com"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
      "sender_email": "user@example.com",
      "receiver_email": "alice@example.com",
      "message": "Thanks Alice, reviewing now!",
      "created_at": "2026-10-11T09:56:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 VALIDATION_ERROR`: Empty or whitespace-only message.
  - `403 FORBIDDEN`: Caller is not a group member.

---

### 8.6 Admin Oversight & Management

All endpoints in this group require the `admin` role and write to `activity_logs`.

#### `GET /api/admin/users`
- **Purpose:** Returns comprehensive list of all registered users with metadata and active statuses.
- **Access:** Admin only (`withRoles('admin')`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "email": "user@example.com",
        "name": "Jane Doe",
        "avatar_url": null,
        "role": "user",
        "is_active": true,
        "created_at": "2026-10-11T08:00:00.000Z",
        "updated_at": "2026-10-11T08:00:00.000Z"
      }
    ]
  }
  ```

---

#### `PATCH /api/admin/users/{userEmail}/role`
- **Purpose:** Updates a user's role (`user` <-> `admin`).
- **Access:** Admin only.
- **Request Body:**
  ```json
  {
    "role": "admin"
  }
  ```
- **Response (200 OK):** Returns updated user object.
- **Errors:**
  - `400 VALIDATION_ERROR`: Invalid role value.
  - `404 NOT_FOUND`: User not found.

---

#### `PATCH /api/admin/users/{userEmail}/status`
- **Purpose:** Deactivates or reactivates a user account.
- **Access:** Admin only.
- **Request Body:**
  ```json
  {
    "is_active": false
  }
  ```
- **Response (200 OK):** Returns updated user object.
- **Notes:** Deactivating a user revokes all active refresh tokens for that user immediately.

---

#### `GET /api/admin/conversations`
- **Purpose:** Lists all direct and group conversations across the entire platform.
- **Access:** Admin only.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "direct_conversations": [
        {
          "user_a": "alice@example.com",
          "user_b": "bob@example.com",
          "total_messages": 42,
          "last_activity": "2026-10-11T09:45:00.000Z"
        }
      ],
      "groups": [
        {
          "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
          "name": "Design Sprint",
          "creator_email": "user@example.com",
          "member_count": 3,
          "last_activity": "2026-10-11T09:56:00.000Z"
        }
      ]
    }
  }
  ```

---

#### `GET /api/admin/conversations/direct/{userA}/{userB}/messages`
- **Purpose:** Inspects direct message history between any two users in **read-only mode**.
- **Access:** Admin only.
- **Audit:** Automatically logs an `ADMIN_VIEW_CONVERSATION` event in `activity_logs`.
- **Response (200 OK):** Paginated message list identical to participant endpoint.

---

#### `GET /api/admin/activity`
- **Purpose:** Retrieves project-wide audit event logs.
- **Access:** Admin only.
- **Query Parameters:** `limit` (default 50), `before` (cursor), `action` (optional filter).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "4b684cb3-07b9-47e2-a16f-1249fa6e5eb1",
        "actor_email": "admin@example.com",
        "action": "ROLE_CHANGE",
        "target_type": "user",
        "target_id": "bob@example.com",
        "details": { "old_role": "user", "new_role": "admin" },
        "created_at": "2026-10-11T10:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```

---

## 9. Practical Frontend Calling Examples

### 9.1 Authentication & Token Acquisition

#### cURL:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

#### Fetch (Client):
```typescript
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "jane@example.com",
    password: "Password123!"
  }),
});
const data = await response.json();
const accessToken = data.data.access_token;
```

---

### 9.2 Calling Protected Endpoint with JWT

#### cURL:
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

#### Fetch:
```typescript
const response = await fetch("/api/users/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
const profile = await response.json();
```

---

### 9.3 Refreshing Session

#### Fetch:
```typescript
const response = await fetch("/api/auth/refresh", {
  method: "POST",
  credentials: "include", // Transmits HTTP-only cookie
});
const data = await response.json();
const newAccessToken = data.data.access_token;
```

---

### 9.4 Sending a Direct Message

#### Fetch:
```typescript
const response = await fetch("/api/conversations/direct/bob@example.com/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    message: "Hey Bob, see you tomorrow morning!",
  }),
});
const result = await response.json();
```

---

### 9.5 Creating a Group and Sending Group Messages

#### Step A: Create Group
```typescript
const groupResponse = await fetch("/api/groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: "Design Sprint",
    participant_emails: ["bob@example.com", "alice@example.com"],
  }),
});
const { data: group } = await groupResponse.json();
const groupId = group.group_id;
```

#### Step B: Send Message in Group
```typescript
const messageResponse = await fetch(`/api/groups/${groupId}/messages`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    message: "Welcome to the group everyone!",
    receiver_email: "bob@example.com",
  }),
});
const messageResult = await messageResponse.json();
```

---

### 9.6 Initializing First Administrator

#### cURL:
```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: SuperSecureBootstrapSecret2026" \
  -d '{
    "email": "superadmin@example.com",
    "password": "MasterAdminSecretPassword123!",
    "name": "Head of Engineering"
  }'
```
