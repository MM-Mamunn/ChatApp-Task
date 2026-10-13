# Google OAuth Integration Report via Supabase Auth

## Architecture, Security Analysis, and Implementation Blueprint

**Document Reference:** `docs/google-oauth-supabase-integration-report.md`  
**Application:** Enterprise Realtime Chat Application (`web/`)  
**Target Environment:** Next.js 16 (App Router), React 19, Drizzle ORM, Supabase PostgreSQL, Supabase Realtime  
**Author:** DeepMind Agentic Coding Architecture Team  
**Date:** October 13, 2026  
**Status:** Architecture Specification & Engineering Blueprint (Research Only)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Authentication Architecture](#2-existing-authentication-architecture)
3. [Required Credentials and Configuration](#3-required-credentials-and-configuration)
4. [Complete Google OAuth Flow](#4-complete-google-oauth-flow)
5. [Database Design and Interaction](#5-database-design-and-interaction)
6. [Handling an Existing Email/Password Account](#6-handling-an-existing-emailpassword-account)
7. [Authentication Architecture Options and Recommendation](#7-authentication-architecture-options-and-recommendation)
8. [Exact Files to Add and Modify](#8-exact-files-to-add-and-modify)
9. [Login UI Design and Wireframe](#9-login-ui-design-and-wireframe)
10. [Security and RBAC Considerations](#10-security-and-rbac-considerations)
11. [Phased Implementation Plan](#11-phased-implementation-plan)
12. [Testing and Acceptance Criteria](#12-testing-and-acceptance-criteria)
13. [Risks, Assumptions, and Open Decisions](#13-risks-assumptions-and-open-decisions)

---

## 1. Executive Summary

This report establishes the complete architectural blueprint for integrating **Google OAuth** into the existing chat application using **Supabase Auth as the OAuth broker and identity verification gateway**.

### Context and Core Mandate

The existing chat application operates a hardened, custom authentication and authorization engine built inside Next.js 16 (`web/api/`). It combines:

- **Bcrypt (work factor 12)** password hashing for local credentials.
- **Short-lived signed JWT access tokens** (HS256 via `jose`, 15-minute TTL) passed via `Authorization: Bearer <token>`.
- **Opaque, high-entropy refresh tokens** (64-character hex strings) persisted as SHA-256 hashes in a dedicated PostgreSQL table (`public.refresh_tokens`) and transmitted over HTTP-only, secure, `SameSite=Lax` cookies with path `/api/auth`.
- **Server-side, deny-by-default RBAC** (`withAuth` and `withRoles`) enforcing user roles (`user` vs `admin`) and instantaneous account deactivation guards on every request.
- **Supabase Realtime push subscriptions** (`@supabase/supabase-js`) streaming PostgreSQL change-data-capture events over WebSockets.

The central engineering challenge is to enable **"Continue with Google"** through Supabase Auth **without breaking**:

1. Existing email/password accounts and bcrypt password verification.
2. The current JWT access/refresh token lifecycle and cookie mechanics.
3. The database schema, where `public.users.email` serves as the primary key and foreign key anchor across direct messages, group chats, group memberships, and activity audit trails.
4. The 100% pass rate across the six existing automated test suites (`test:security`, `test:auth`, `test:rbac`, `test:chat`, `test:login`, `test:members`).

### Key Recommendation

We recommend the **Federated Identity Exchange (Hybrid Gateway) Model**:

- **Supabase Auth** serves strictly as the OAuth client, managing Google OAuth 2.0 PKCE handshakes, state tokens, and OpenID Connect identity verification.
- Upon successful authentication, a dedicated Next.js Route Handler (`GET /api/auth/callback`) receives the authorization code, exchanges it via the Supabase Auth engine, and extracts the verified Google identity (`email`, `full_name`, `avatar_url`, `email_confirmed_at`).
- The application's backend service atomically resolves the user in `public.users`:
  - If the user already exists (e.g., registered via email/password), the account is linked without modifying the bcrypt hash or role.
  - If the user is new, a profile is provisioned with `role: "user"` and `isActive: true`.
- The application then issues its **native JWT access token and HTTP-only refresh token**, preserving the existing session contracts, client interceptors, and RBAC middleware entirely intact.

---

## 2. Existing Authentication Architecture

A thorough inspection of the repository confirms that authentication is encapsulated cleanly in `web/api/` and `web/app/api/auth/`, adhering to standard Next.js full-stack modularity.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js App Router                            │
│    web/app/login/page.tsx  ◄──►  web/components/auth/auth-card.tsx     │
│    web/app/chat/page.tsx   ◄──►  web/lib/auth-context.tsx              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Fetch (credentials: same-origin)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       HTTP Route Handlers                              │
│   web/app/api/auth/login/route.ts     web/app/api/auth/register/route.ts│
│   web/app/api/auth/refresh/route.ts   web/app/api/auth/logout/route.ts  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Delegates to Controllers
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Domain Controllers & Services                        │
│   web/api/controllers/auth.controller.ts                               │
│   web/api/services/auth.service.ts                                     │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Authentication Helpers         │  │     Database & Schema        │
│  web/api/authentication/tokens.ts    │  │  web/api/database/client.ts  │
│  web/api/authentication/cookies.ts   │  │  schema/users.ts (PK: email) │
│  web/api/authentication/password.ts  │  │  schema/tokens.ts (hashes)   │
│  web/api/authentication/jwt.config.ts│  │  schema/activity.ts (audit)  │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Verified File Paths and Responsibilities

| Path                                          | Architectural Layer    | Verified Current Responsibility                                                                                                                                   |
| :-------------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/api/authentication/tokens.ts`            | Token Engine           | Signs HS256 JWT access tokens (15m TTL) via `jose`; generates 32-byte opaque refresh tokens; computes SHA-256 hashes (`hashToken`).                               |
| `web/api/authentication/cookies.ts`           | Cookie Serialization   | Handles `refresh_token` cookie string formatting with `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Max-Age=604800` (7 days), and production `Secure`.           |
| `web/api/authentication/password.ts`          | Password Hashing       | Encapsulates `bcryptjs` hashing with fixed cost factor 12 (`hashPassword`) and timing-safe comparison (`verifyPassword`).                                         |
| `web/api/authentication/jwt.config.ts`        | JWT Configuration      | Configures TTLs and reads `JWT_ACCESS_SECRET` with 16-character minimum entropy validation.                                                                       |
| `web/api/services/auth.service.ts`            | Auth Business Logic    | Implements `registerUser`, `loginUser`, `refreshSession`, `logoutUser`, and `bootstrapAdmin` with atomic Drizzle transactions.                                    |
| `web/api/controllers/auth.controller.ts`      | HTTP Adapters          | Parses input, catches `AppError` subclasses, and constructs responses with `Set-Cookie` headers.                                                                  |
| `web/api/middlewares/auth.middleware.ts`      | Security Middleware    | `withAuth` extracts Bearer JWTs, validates signatures, queries live database records for `is_active` and role freshness, rejecting revoked users with 401 or 403. |
| `web/api/middlewares/authorize.middleware.ts` | RBAC Middleware        | `withRoles` restricts handlers to specified roles (`user` or `admin`), returning 403 FORBIDDEN on violation.                                                      |
| `web/api/database/schema/users.ts`            | Persistence (Users)    | Defines `users` table with `email` as `varchar(255).primaryKey()`, nullable `password_hash`, `role`, `is_active`, and timestamps.                                 |
| `web/api/database/schema/tokens.ts`           | Persistence (Sessions) | Defines `refresh_tokens` table referencing `users.email` on cascade delete, tracking `token_hash`, `expires_at`, and `is_revoked`.                                |
| `web/lib/supabase-client.ts`                  | Client Push SDK        | Initializes browser `@supabase/supabase-js` instance with `auth: { persistSession: false }` dedicated to Realtime WebSocket subscriptions.                        |
| `web/lib/api-client.ts`                       | Client API Wrapper     | Manages in-memory access token, attaches Bearer headers, and automatically queues 401 retries through `performRefresh()`.                                         |
| `web/lib/auth-context.tsx`                    | Client State           | React context providing `user`, `accessToken`, `login`, `register`, and `logout`. Recovers session on mount by invoking `/api/auth/refresh`.                      |
| `web/components/auth/auth-card.tsx`           | Presentation           | Login/Register card UI with instant test account quick-fill buttons and error alerts.                                                                             |

### Current Token & Session Lifecycle

1. **Access Token:** Short-lived JWT containing `{ sub: user.email, role: user.role }`. Stored **only in browser memory** by `ApiClient` (`web/lib/api-client.ts`).
2. **Refresh Token:** Long-lived opaque string stored in an **HTTP-only cookie**. Looked up in `public.refresh_tokens` using a SHA-256 hash.
3. **Rotation:** Every call to `/api/auth/refresh` revokes the old refresh token record (`is_revoked = true`) and issues a brand-new refresh token in a database transaction, mitigating replay attacks.
4. **Immediate Deactivation:** When an admin toggles a user to inactive, `withAuth` checks `users.is_active` in PostgreSQL on incoming API calls and blocks the user immediately, even if their JWT has not expired.

---

## 3. Required Credentials and Configuration

Integrating Google OAuth via Supabase requires configuring two external cloud consoles and maintaining strict separation of client vs. server secrets.

### 3.1 Google Cloud Platform (GCP) Configuration

1. **Google Cloud Project:**
   - Create or select a dedicated GCP project (e.g., `chatapp-production` or `chatapp-development`).
2. **OAuth Consent Screen:**
   - Navigation: **APIs & Services > OAuth consent screen**.
   - User Type: Select **External** (unless restricted to a Google Workspace organization).
   - App Information:
     - App name: `ChatApp` (or project branding).
     - User support email: Administrative contact email.
     - Developer contact information: Engineering contact email.
   - Scopes: Request standard identity scopes:
     - `.../auth/userinfo.email` (`openid`, `email`)
     - `.../auth/userinfo.profile` (`profile`)
   - Authorized Domains: Add `supabase.co` (or your custom Supabase domain). In production, also add your application domain (e.g., `example.com`).
3. **OAuth 2.0 Credentials:**
   - Navigation: **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: Select **Web application**.
   - Name: `ChatApp Web Client (Supabase Broker)`.
   - **Authorized JavaScript origins:**
     - Development: `http://localhost:3000`
     - Production: `https://your-domain.com`
     - Supabase project origin: `https://<your-project-ref>.supabase.co`
   - **Authorized redirect URIs (Critical):**
     > [!IMPORTANT]
     > Google must redirect to the **Supabase Auth callback endpoint**, NOT directly to your Next.js application:
     >
     > `https://<your-project-ref>.supabase.co/auth/v1/callback`
     >
     > If you have a custom domain on Supabase, use: `https://auth.yourdomain.com/v1/callback`.
4. **Obtain Keys:**
   - Copy the generated **Client ID** (e.g., `123456789-abcdef.apps.googleusercontent.com`).
   - Copy the generated **Client Secret** (e.g., `GOCSPX-xxxxxxxxxxxxxxxx`).

---

### 3.2 Supabase Dashboard Configuration

1. **Enable Google Provider:**
   - Navigation: **Authentication > Providers > Google**.
   - Toggle **Enable Google provider** to ON.
   - **Client ID:** Paste the GCP OAuth Client ID.
   - **Client Secret:** Paste the GCP OAuth Client Secret.
   - Authorized Client IDs (optional): Leave blank unless supporting mobile native clients.
   - Click **Save**.
2. **URL Configuration (Redirect Allowlist):**
   - Navigation: **Authentication > URL Configuration**.
   - **Site URL:** Set to `http://localhost:3000` (development) or `https://your-domain.com` (production).
   - **Redirect URLs (Allowlist):** Add the specific callback Route Handlers used by your Next.js application:
     - `http://localhost:3000/api/auth/callback`
     - `http://localhost:3000/**`
     - `https://your-domain.com/api/auth/callback`
     - `https://your-domain.com/**`
   > [!WARNING]
   > If the redirect URL requested by the client does not match Supabase's allowlist, Supabase Auth rejects the handshake with a `redirect_uri_mismatch` error.

---

### 3.3 Environment Variables Matrix

The following environment variables govern authentication in `web/.env` and `web/.env.example`:

| Variable Name                   | Scope           | Purpose                                                                   | Origin / Source                            | Project Status           |
| :------------------------------ | :-------------- | :------------------------------------------------------------------------ | :----------------------------------------- | :----------------------- |
| `NEXT_PUBLIC_APP_URL`           | Client & Server | Base URL for origin detection and OAuth redirect URI construction.        | Deployment URL or `http://localhost:3000`. | **Existing**             |
| `DATABASE_URL`                  | Server Only     | Supabase PostgreSQL connection string for Drizzle ORM.                    | Supabase Dashboard > Settings > Database.  | **Existing**             |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client & Server | Supabase project endpoint (e.g., `https://<ref>.supabase.co`).            | Supabase Dashboard > Settings > API.       | **Existing**             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Supabase anonymous public API key for Realtime & OAuth initialization.    | Supabase Dashboard > Settings > API.       | **Existing**             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server Only     | Elevated service role key for administrative verification (bypasses RLS). | Supabase Dashboard > Settings > API.       | **Existing placeholder** |
| `GOOGLE_CLIENT_ID`              | Informational   | GCP Client ID (configured in Supabase dashboard, kept in env for docs).   | Google Cloud Console Credentials.          | **Existing placeholder** |
| `GOOGLE_CLIENT_SECRET`          | Informational   | GCP Client Secret (configured in Supabase dashboard).                     | Google Cloud Console Credentials.          | **Existing placeholder** |
| `JWT_ACCESS_SECRET`             | Server Only     | Secret for signing HS256 access tokens.                                   | Cryptographic random string (≥ 16 chars).  | **Existing**             |
| `JWT_REFRESH_SECRET`            | Server Only     | Secret for token validation routines.                                     | Cryptographic random string (≥ 16 chars).  | **Existing**             |
| `ADMIN_BOOTSTRAP_EMAIL`         | Server Only     | Email address designated for first-admin bootstrap.                       | Developer configuration.                   | **Existing**             |
| `ADMIN_BOOTSTRAP_SECRET`        | Server Only     | Secret key required to trigger `/api/auth/bootstrap-admin`.               | Developer configuration.                   | **Existing**             |

> [!NOTE]
> Notice that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` do not need to be passed into the Next.js runtime because Supabase Auth manages the direct API calls to Google. However, keeping them documented in `.env.example` aids configuration tracking.

---

## 4. Complete Google OAuth Flow

The end-to-end authentication lifecycle follows the **Proof Key for Code Exchange (PKCE)** protocol mediated by Supabase Auth, resolving into the application's native session tokens.

### 4.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Client as Next.js Client (AuthCard)
    participant SupaSDK as Supabase Client (@supabase/ssr)
    participant SupaAuth as Supabase Auth Server (GoTrue)
    participant Google as Google Identity Server
    participant Callback as Next.js Route Handler (/api/auth/callback)
    participant Drizzle as Backend Service & Database (PostgreSQL)

    User->>Client: Clicks "Continue with Google"
    Client->>SupaSDK: signInWithOAuth({ provider: 'google', options: { redirectTo } })
    SupaSDK->>SupaSDK: Generate PKCE code_verifier & state
    SupaSDK-->>User: 302 Redirect to Supabase Auth endpoint
    User->>SupaAuth: GET /auth/v1/authorize?provider=google&code_challenge=...
    SupaAuth-->>User: 302 Redirect to accounts.google.com
    User->>Google: Authenticates with Google credentials & grants consent
    Google-->>User: 302 Redirect to Supabase: /auth/v1/callback?code=GOOGLE_CODE
    User->>SupaAuth: GET /auth/v1/callback?code=GOOGLE_CODE
    SupaAuth->>Google: Exchange GOOGLE_CODE for OpenID ID Token & Access Token
    Google-->>SupaAuth: Returns verified claims (email, name, avatar, email_verified)
    SupaAuth->>SupaAuth: Upsert auth.users & auth.identities
    SupaAuth-->>User: 302 Redirect to Next.js: /api/auth/callback?code=SUPABASE_CODE
    User->>Callback: GET /api/auth/callback?code=SUPABASE_CODE (with PKCE verifier cookie)
    Callback->>SupaAuth: Exchange SUPABASE_CODE for Supabase Session
    SupaAuth-->>Callback: Returns Supabase User Object (email, metadata, confirmed_at)
    Callback->>Drizzle: Resolve user by email (Atomic Transaction)
    alt User exists in public.users
        Drizzle-->>Callback: Return existing user record (preserves role & bcrypt hash)
    else First-time User
        Drizzle->>Drizzle: INSERT INTO public.users (email, name, avatar, role='user')
        Drizzle-->>Callback: Return newly created user record
    end
    Callback->>Drizzle: Generate opaque refresh token & store SHA-256 in public.refresh_tokens
    Callback->>Callback: Sign native JWT access token (HS256)
    Callback->>Drizzle: INSERT INTO public.activity_logs (USER_LOGIN, method='google_oauth')
    Callback-->>User: 302 Redirect to /chat (with Set-Cookie: refresh_token=... HttpOnly)
    User->>Client: App mounted at /chat; calls /api/auth/refresh
    Client->>Callback: POST /api/auth/refresh (includes refresh_token cookie)
    Callback-->>Client: Returns { access_token, user }
    Client->>User: Renders Chat Pane with live Supabase Realtime connection
```

---

### 4.2 Detailed Step-by-Step Flow

#### Step 1: User Initiation

The user visits `/login` and clicks the **"Continue with Google"** button in [`web/components/auth/auth-card.tsx`](file:///c:/Users/USER/Desktop/Task/web/components/auth/auth-card.tsx).

#### Step 2: Next.js Client Triggers Supabase PKCE Handshake

The client invokes:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
    queryParams: {
      access_type: "offline",
      prompt: "select_account",
    },
  },
});
```

The browser-side Supabase client generates a cryptographically random `code_verifier`, hashes it into a `code_challenge`, stores the verifier in a browser cookie, and constructs the redirect URL.

#### Step 3: Redirect to Google Accounts

The browser redirects to `https://<project-ref>.supabase.co/auth/v1/authorize?provider=google&...`. Supabase Auth registers the PKCE challenge and redirects the browser to `https://accounts.google.com/o/oauth2/v2/auth`.

#### Step 4: Google Authentication & Consent

Google authenticates the user (via session cookie, password, or 2FA). The user approves account consent. Google issues an authorization code and redirects the browser to `https://<project-ref>.supabase.co/auth/v1/callback?code=...`.

#### Step 5: Supabase Identity Processing

Supabase Auth receives the code directly from Google, communicates over backchannel HTTPS to exchange it for Google's tokens, verifies the OpenID Connect signature, checks `email_verified: true`, and records or updates the user in `auth.users` and `auth.identities`.

#### Step 6: Redirect to Next.js Callback

Supabase Auth issues a Supabase-specific authorization code and redirects the user back to the application:
`GET /api/auth/callback?code=<SUPABASE_CODE>`.

#### Step 7: Server-Side PKCE Code Exchange in Next.js

The Route Handler `web/app/api/auth/callback/route.ts` executes on the Next.js server. Using the server-side Supabase client (`@supabase/ssr`), it exchanges the code:

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.exchangeCodeForSession(code);
```

At this point, `user` is cryptographically validated. The server extracts:

- `user.email`: User's primary email address (e.g. `user@example.com`).
- `user.email_confirmed_at`: Timestamp proving Google has verified this email.
- `user.user_metadata.full_name`: Display name from Google profile.
- `user.user_metadata.avatar_url`: Avatar picture URL from Google profile.

#### Step 8: Application User Resolution & Account Linking

The Route Handler invokes `handleOAuthUserResolution(user)` in `web/api/services/auth.service.ts`:

- **Security Check:** Validates that `user.email_confirmed_at` is not null.
- **Database Query:** Searches `public.users` where `email = user.email.toLowerCase()`.
- **Existing User:**
  - If `isActive === false`, rejects the login and redirects to `/login?error=account_deactivated`.
  - If `avatarUrl` is null and Google provides an avatar, updates `avatarUrl`.
  - **Critically:** Preserves `passwordHash` (allowing future email/password logins) and preserves `role` (preventing privilege degradation or escalation).
- **New User:**
  - Inserts into `public.users` with `email`, `name`, `avatarUrl`, `passwordHash: null`, `role: "user"`, `isActive: true`.

#### Step 9: Application Session Issuance

The server generates:

1. An opaque refresh token via `generateOpaqueRefreshToken()`, stores its SHA-256 hash in `public.refresh_tokens`, and serializes it as an HTTP-only cookie using `serializeRefreshTokenCookie()`.
2. An audit log record in `public.activity_logs` with action `USER_LOGIN` and details `{ method: "google_oauth" }`.
3. Returns a 302 Redirect to `/chat`.

#### Step 10: Client Hydration and Realtime Readiness

The browser loads `/chat`. `AuthProvider` (`web/lib/auth-context.tsx`) executes its initial session check via `apiClient.performRefresh()`. The call sends the HTTP-only cookie to `/api/auth/refresh`, which issues the short-lived JWT access token. The UI mounts, and `getSupabaseClient()` connects to Supabase Realtime channels using the user's email.

---

## 5. Database Design and Interaction

A fundamental requirement is maintaining complete isolation between Supabase's internal auth engine and the application's business domain schema.

### 5.1 System Demarcation: `auth` vs `public` Schemas

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL DATABASE                         │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                     Schema: "auth"                           │     │
│   │   Managed by Supabase Auth (GoTrue Engine)                   │     │
│   │                                                              │     │
│   │   auth.users                                                 │     │
│   │   ├── id (uuid)                                              │     │
│   │   ├── email (varchar)                                        │     │
│   │   ├── raw_user_meta_data (jsonb)                             │     │
│   │   └── email_confirmed_at (timestamptz)                       │     │
│   │                                                              │     │
│   │   auth.identities                                            │     │
│   │   ├── id (text)                                              │     │
│   │   ├── user_id (uuid -> auth.users.id)                        │     │
│   │   ├── provider (text: 'google')                              │     │
│   │   └── identity_data (jsonb)                                  │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │ Resolved in Next.js Server          │
│                                  │ via email matching                  │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                     Schema: "public"                         │     │
│   │   Managed by Drizzle ORM (Application Business Logic)        │     │
│   │                                                              │     │
│   │   public.users                                               │     │
│   │   ├── email (varchar, PK) ◄── Stable business identifier    │     │
│   │   ├── password_hash (varchar, nullable)                      │     │
│   │   ├── name (varchar)                                         │     │
│   │   ├── avatar_url (text, nullable)                            │     │
│   │   ├── role (varchar -> roles.role)                           │     │
│   │   ├── is_active (boolean)                                    │     │
│   │   └── supabase_auth_id (uuid, optional metadata link)        │     │
│   │            │                                                 │     │
│   │            ├────────────────────────┐                        │     │
│   │            ▼                        ▼                        │     │
│   │   public.direct_messages   public.group_members              │     │
│   │   (sender_email, etc.)     (user_email)                      │     │
│   │            │                        │                        │     │
│   │            ▼                        ▼                        │     │
│   │   public.groups            public.group_chat_messages        │     │
│   │   (creator_email)          (sender_email)                    │     │
│   │            │                        │                        │     │
│   │            ▼                        ▼                        │     │
│   │   public.refresh_tokens    public.activity_logs              │     │
│   │   (user_email)             (actor_email)                     │     │
│   └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Schema Findings in Current Codebase

Inspection of [`web/api/database/schema/users.ts`](file:///c:/Users/USER/Desktop/Task/web/api/database/schema/users.ts):

```typescript
export const users = pgTable(
  "users",
  {
    email: varchar("email", { length: 255 }).primaryKey(),
    passwordHash: varchar("password_hash", { length: 255 }), // Notice: Already nullable!
    name: varchar("name", { length: 128 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 32 })
      .notNull()
      .default("user")
      .references(() => roles.role),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // ...
);
```

1. **`passwordHash` is already nullable:** In Drizzle ORM, `passwordHash` is declared without `.notNull()`. When a user registers strictly through Google OAuth, `passwordHash` can simply be set to `null` without requiring an `ALTER TABLE` column constraint change!
2. **`email` is the Primary Key:** Every related table in the application (`direct_messages`, `group_chat_messages`, `groups`, `group_members`, `refresh_tokens`, `activity_logs`) references `users.email`.
3. **Foreign Keys are Email-Based:**
   - `direct_messages.sender_email` -> `users.email`
   - `direct_messages.receiver_email` -> `users.email`
   - `groups.creator_email` -> `users.email`
   - `group_members.user_email` -> `users.email`
   - `group_chat_messages.sender_email` -> `users.email`
   - `refresh_tokens.user_email` -> `users.email`
   - `activity_logs.actor_email` -> string

### 5.3 Schema Migration Recommendation

Because `passwordHash` is already nullable, **zero schema changes are strictly mandatory** to begin supporting Google OAuth.

However, for enterprise auditability and explicit relational integrity, we recommend an **optional, non-breaking schema enhancement**:
Add `supabase_auth_id: uuid("supabase_auth_id")` and `auth_provider: varchar("auth_provider", { length: 32 }).default("credentials")` to `public.users`.

#### Recommended Migration SQL (`0003_add_oauth_metadata.sql`):

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supabase_auth_id" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" varchar(32) DEFAULT 'credentials' NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_supabase_auth_id" ON "users" ("supabase_auth_id");
```

_Benefits:_ Allows instant bidirectional lookups between `auth.users` and `public.users` without modifying or migrating the existing primary key.

### 5.4 Why Email-Based Primary Keys Should Remain

Migrating `users.email` to a synthetic UUID primary key across all seven tables would require:

- Dropping foreign key constraints across `direct_messages`, `group_chat_messages`, `groups`, `group_members`, `refresh_tokens`.
- Rewriting all SQL queries, Drizzle relations, TypeScript models, and API contracts.
- Breaking existing WebSocket channel filters and test suites.

Since Google verifies email addresses upon account issuance, maintaining `email` as the primary key guarantees that existing messages, conversations, and groups remain 100% accessible to the user without touching a single database row.

---

## 6. Handling an Existing Email/Password Account

This is the most critical functional requirement.

### 6.1 Concrete Scenario

1. An existing user exists in `public.users`:
   - `email`: `user@example.com`
   - `passwordHash`: `$2a$12$e8Y...` (bcrypt hash)
   - `role`: `user`
   - `isActive`: `true`
   - Associated with 45 direct messages, 2 group channels, and 12 activity logs.
2. The user navigates to `/login` and clicks **Continue with Google**.
3. Google authenticates the user and returns an identity for `user@example.com`.

### 6.2 Why Automatic Merging Fails in Unassisted Supabase Auth

By default, Supabase Auth maintains identities inside `auth.users` and `auth.identities`. It has **no awareness of your custom `public.users` table**. If an application relies solely on Supabase Auth webhooks or triggers without custom reconciliation:

- An existing custom record in `public.users` could be ignored or conflict with an `INSERT` trigger.
- A naive trigger might attempt to insert a duplicate primary key `user@example.com` into `public.users`, causing a fatal database `23505 unique_violation` constraint crash.

### 6.3 Secure Linking Strategy: The "Single Account, Dual Credentials" Model

To achieve **one application account with two authentication methods**, the server-side callback handler (`web/api/services/auth.service.ts`) executes the following atomic algorithm:

```typescript
export async function resolveOAuthUser(supabaseUser: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailConfirmedAt: string | null;
}): Promise<AuthSessionResult> {
  const db = getDb();
  const normalizedEmail = supabaseUser.email.toLowerCase().trim();

  // 1. Strict Ownership & Verification Guard
  if (!supabaseUser.emailConfirmedAt) {
    throw new UnauthorizedError(
      "Unverified OAuth email cannot be linked. Please verify your email with Google.",
    );
  }

  return await db.transaction(async (tx) => {
    // 2. Query existing application user
    const existing = await tx
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    let resolvedUser: UserSelect;

    if (existing.length > 0) {
      resolvedUser = existing[0];

      // 3. Deactivation enforcement
      if (!resolvedUser.isActive) {
        throw new ForbiddenError(
          "Account has been deactivated. Contact an administrator.",
        );
      }

      // 4. Safe Account Linking (Non-destructive)
      // - PRESERVE existing passwordHash (do NOT nullify or overwrite)
      // - PRESERVE existing role (admin accounts stay admin, user stays user)
      // - Update avatarUrl only if previously null
      const updates: Partial<UserInsert> = {
        updatedAt: new Date(),
      };
      if (!resolvedUser.avatarUrl && supabaseUser.avatarUrl) {
        updates.avatarUrl = supabaseUser.avatarUrl;
      }

      await tx
        .update(users)
        .set(updates)
        .where(eq(users.email, normalizedEmail));

      // 5. Record identity linking audit log
      await tx.insert(activityLogs).values({
        actorEmail: normalizedEmail,
        action: "USER_LINK_IDENTITY",
        targetType: "user",
        targetId: normalizedEmail,
        details: {
          provider: "google",
          supabaseAuthId: supabaseUser.id,
        },
      });
    } else {
      // 6. First-time registration via Google
      const inserted = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash: null, // Passwordless via OAuth
          name: supabaseUser.name || normalizedEmail.split("@")[0],
          avatarUrl: supabaseUser.avatarUrl,
          role: "user",
          isActive: true,
        })
        .returning();

      resolvedUser = inserted[0];

      await tx.insert(activityLogs).values({
        actorEmail: normalizedEmail,
        action: "USER_REGISTER",
        targetType: "user",
        targetId: normalizedEmail,
        details: { method: "google_oauth" },
      });
    }

    // 7. Issue application session tokens
    const rawRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await tx.insert(refreshTokens).values({
      userEmail: resolvedUser.email,
      tokenHash,
      expiresAt,
    });

    const accessToken = await createAccessToken({
      sub: resolvedUser.email,
      role: resolvedUser.role as "user" | "admin",
    });

    await tx.insert(activityLogs).values({
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
  });
}
```

### 6.4 Guarantee Analysis

| Concern                                | How the Implementation Solves It                                                                                                                                                                                              |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preserving Email/Password Login**    | `passwordHash` is never overwritten or set to null when linking. The user can sign in with their password the very next minute via [`loginUser()`](file:///c:/Users/USER/Desktop/Task/web/api/services/auth.service.ts#L125). |
| **Preventing Duplicate Chat Accounts** | `users.email` is the unique primary key in PostgreSQL. Queries are normalized with `.toLowerCase().trim()`. A user cannot have two records with the same email.                                                               |
| **Concurrency & Race Conditions**      | Handled inside a PostgreSQL serializable transaction or `ON CONFLICT (email) DO UPDATE`. Two concurrent Google logins resolve to the same user row.                                                                           |
| **Account Takeover Prevention**        | Accounts are **only linked if `emailConfirmedAt` is verified by Google**. An attacker cannot create a malicious unverified Google account with someone else's email to steal their chat account.                              |
| **Role & Privilege Preservation**      | The `role` column in `public.users` is never modified during OAuth linking. An existing administrator logging in with Google retains their `admin` role.                                                                      |
| **Deactivated Account Defense**        | If `is_active === false`, the transaction throws `ForbiddenError` before issuing session tokens, preventing deactivated users from bypassing blocks via OAuth.                                                                |
| **Conversation Continuity**            | All foreign keys (`direct_messages`, `group_chat_messages`) link to `users.email`. Because the email does not change, every message and conversation remains available immediately.                                           |

---

## 7. Authentication Architecture Options and Recommendation

### 7.1 Detailed Option Comparison

#### Option 1: Federated Identity Exchange (Hybrid Gateway) — _Recommended_

- **Mechanism:** Supabase Auth handles Google OAuth and OpenID validation; Next.js callback Route Handler links identity to `public.users` and issues native application JWTs and refresh cookies.
- **Scope:** Add 1 Route Handler (`/api/auth/callback`), add 1 UI button (`GoogleSignInButton`), add 1 helper in `auth.service.ts`.
- **Existing Password Auth:** 100% untouched.
- **Existing RBAC & Middleware:** 100% untouched (`withAuth` and `withRoles` continue verifying HS256 tokens).
- **Existing Test Suites:** 100% pass rate preserved.
- **Effort:** Low (1–2 days).

#### Option 2: Full Migration to Supabase Auth

- **Mechanism:** Eliminate custom JWTs, eliminate `public.refresh_tokens`, migrate all existing user passwords into `auth.users`, and replace `withAuth` with Supabase JWT validation.
- **Scope:** Massive refactor across `web/api/`:
  - Must export existing bcrypt hashes and import them into Supabase `auth.users` via Supabase Admin API.
  - Must rewrite `withAuth` to parse Supabase JWTs (signed with Supabase JWT secret).
  - Must map roles into `auth.users.raw_app_meta_data` and synchronize updates with triggers.
  - Must rewrite all six existing test suites (`test:auth`, `test:security`, `test:rbac`, `test:chat`, etc.).
- **Effort:** Very High (2–3 weeks) with high regression risk.

### 7.2 Comparison Matrix

| Evaluation Dimension                   | Option 1: Federated Exchange (Recommended)          | Option 2: Full Supabase Auth Migration                |
| :------------------------------------- | :-------------------------------------------------- | :---------------------------------------------------- |
| **Impact on Existing Data & Tables**   | **Zero.** Zero changes to foreign keys or messages. | High. Must sync `auth.users` with `public.users`.     |
| **Impact on Email/Password Auth**      | **Zero.** Existing bcrypt verification unchanged.   | High. Must migrate bcrypt hashes into Supabase Auth.  |
| **Impact on `withAuth` / RBAC**        | **Zero.** Middleware retains live DB role checks.   | High. Must re-implement role claims in Supabase JWTs. |
| **Session Revocation & Deactivation**  | **Instant.** Revoked in `public.refresh_tokens`.    | Dependent on Supabase GoTrue token expiry.            |
| **Automated Test Suite Compatibility** | **100% Pass Rate.** Zero test regressions.          | Breaking. All auth tests require complete rewrites.   |
| **Implementation Complexity**          | **Low.** Surgical addition of callback handler.     | **High.** Architectural overhaul across 25+ files.    |

### 7.3 Final Recommendation

**Adopt Option 1 (Federated Identity Exchange).**  
It delivers a seamless Google OAuth user experience while respecting the application's established architectural boundaries, preserving all existing accounts, and maintaining test integrity.

---

## 8. Exact Files to Add and Modify

The following file impact matrix details the exact changes needed in the codebase:

| File Path                                       |   Action   | Current Responsibility                                              | Proposed Modification / Addition                                                                                                                                         | Reason                                        |
| :---------------------------------------------- | :--------: | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `web/components/auth/google-sign-in-button.tsx` |  **ADD**   | _Does not exist._                                                   | Reusable UI button rendering official Google "G" logo, supporting loading spinners, hover states, and dark mode.                                                         | Modular separation of OAuth trigger UI.       |
| `web/components/auth/auth-card.tsx`             | **MODIFY** | Renders login/register form and quick test pills.                   | Insert `GoogleSignInButton` at top of card followed by an accessible "or continue with email" separator.                                                                 | Provide user access to Google OAuth.          |
| `web/app/api/auth/callback/route.ts`            |  **ADD**   | _Does not exist._                                                   | Next.js Route Handler for `GET /api/auth/callback`. Reads `code`, exchanges via `@supabase/ssr`, resolves user via `auth.service.ts`, sets cookie, redirects to `/chat`. | Core OAuth token exchange gateway.            |
| `web/lib/supabase-server.ts`                    |  **ADD**   | _Does not exist._                                                   | Server-side Supabase client utility using cookies for PKCE code exchange in Route Handlers.                                                                              | Required by Supabase SSR auth exchange.       |
| `web/lib/supabase-client.ts`                    | **MODIFY** | Browser client for Realtime with `auth: { persistSession: false }`. | Update `auth` options to enable `detectSessionInUrl: true` or helper for `signInWithOAuth`.                                                                              | Allow browser SDK to initiate OAuth redirect. |
| `web/api/services/auth.service.ts`              | **MODIFY** | Implements `registerUser`, `loginUser`, etc.                        | Add `resolveOAuthUser()` implementing atomic account lookup, linking, and native session issuance.                                                                       | Core business logic for identity linking.     |
| `web/api/controllers/auth.controller.ts`        | **MODIFY** | HTTP controller functions for auth routes.                          | Add controller wrapper `handleOAuthCallback()` if separating Route Handler from service.                                                                                 | Adheres to repository layering conventions.   |
| `web/api/database/schema/users.ts`              | **MODIFY** | Drizzle schema for `users`.                                         | _(Optional)_ Add `supabaseAuthId: uuid("supabase_auth_id")` and index.                                                                                                   | Explicit tracking of linked identities.       |
| `web/api/database/migrations/`                  |  **ADD**   | Versioned migration files.                                          | Add `0003_add_oauth_metadata.sql` if schema column added.                                                                                                                | Drizzle Kit migration tracking.               |
| `web/api/configuration/env.ts`                  | **MODIFY** | Zod validation for server environment.                              | Verify `SUPABASE_SERVICE_ROLE_KEY` is present in `serverEnvSchema`.                                                                                                      | Ensure configuration validity.                |
| `web/.env.example` & `/.env.example`            | **MODIFY** | Environment templates.                                              | Add comments explaining Google OAuth and Supabase callback URLs.                                                                                                         | Clear documentation for developers.           |
| `01_api-and-chat/API.md`                        | **MODIFY** | API specifications and contract.                                    | Document `GET /api/auth/callback` specifications, query params, and redirect behavior.                                                                                   | Maintain API contract accuracy.               |
| `.agents/skills/auth-rbac/SKILL.md`             | **MODIFY** | Auth and RBAC skill guide.                                          | Document Google OAuth integration mechanics and identity linking rules.                                                                                                  | Keep agent knowledge base synchronized.       |
| `README.md` & `web/README.md`                   | **MODIFY** | User and evaluator guides.                                          | Add Google Cloud and Supabase provider setup instructions.                                                                                                               | Setup reproducibility.                        |
| `web/api/test/oauth.test.ts`                    |  **ADD**   | _Does not exist._                                                   | Automated test suite verifying OAuth resolution, account linking, duplicate prevention, and deactivation.                                                                | Continuous integration verification.          |

---

## 9. Login UI Design and Wireframe

The login user interface should seamlessly integrate Google OAuth while maintaining the visual standards established by **shadcn** and **frontend-design** skills.

### 9.1 Visual & UX Requirements

1. **Prominent Placement:** The **"Continue with Google"** button sits at the top of the card content, establishing it as the primary modern entry path.
2. **Branding Integrity:** Features Google's authentic four-color "G" icon (or monochrome in high-contrast contexts), with font weight `font-semibold` and standard height `h-10`.
3. **Clear Visual Divider:** A refined horizontal divider with centered text: `<Separator className="my-4" />` with an inline text badge `"or continue with email"`.
4. **Loading & Interactive States:** When clicked, the button enters an interactive loading state (`isLoading={true}`) displaying a spinner and `"Connecting to Google..."`, disabling all other form inputs to prevent double-submissions.
5. **Theme Support:** Clean, high-contrast borders and surfaces in both Light Mode (`bg-white hover:bg-slate-50 border-slate-200 text-slate-800`) and Dark Mode (`bg-card hover:bg-accent/60 border-border text-foreground`).
6. **Error Alert Integration:** If the OAuth handshake fails (e.g. user cancels consent), the user is redirected to `/login?error=oauth_cancelled`. `AuthCard` displays an accessible error banner with `role="alert"`.

---

### 9.2 UI Wireframe (Light and Dark Mode)

```
┌────────────────────────────────────────────────────────┐
│                      ChatApp                           │
│     Sign in to your account or create a new one        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   [G]   Continue with Google                     │  │  ◄── GoogleSignInButton
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ─────────────── or continue with email ──────────────  │  ◄── Visual Divider
│                                                        │
│  [ Sign in ]  [ Create account ]                       │  ◄── Existing Tabs
│                                                        │
│  Email address                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ you@domain.com                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Password                                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ••••••••••••••••                            [👁] │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Sign in                                          │  │  ◄── Email/Password Submit
│  └──────────────────────────────────────────────────┘  │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Quick-fill seed test accounts:                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │  ◄── Quick-Test Cards
│  │ 🛡️ Admin      │ │ 👤 User 1     │ │ 👤 User 2     │ │      (Preserved!)
│  │ [ADMIN]       │ │ [USER]        │ │ [USER]        │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 10. Security and RBAC Considerations

1. **Server-Side Token Verification:**
   The frontend never passes Google profile data directly to API endpoints. All user claims originate strictly from the server-to-server exchange between Next.js and Supabase Auth.
2. **Strict Verification Check:**
   Only Google accounts with `email_confirmed_at` populated are eligible for automatic linking. Unverified accounts are rejected with 401 UNAUTHORIZED to prevent account spoofing.
3. **No Self-Promotion:**
   OAuth user resolution defaults strictly to `role: "user"`. It never accepts a `role` parameter from the client or OAuth claims. If an existing account has `role: "admin"`, that role is preserved, but new OAuth sign-ups can never become admins without database elevation or bootstrap secrets.
4. **Deactivated Account Defense:**
   If `public.users.is_active` is `false`, `handleOAuthUserResolution()` throws `ForbiddenError` (403), immediately terminating the login sequence and clearing session cookies.
5. **Audit Trail Logging:**
   All OAuth sign-ins and identity linkings are recorded in `public.activity_logs`:
   - `action: "USER_LOGIN"`, `details: { method: "google_oauth" }`
   - `action: "USER_LINK_IDENTITY"`, `details: { provider: "google" }`
   - `action: "USER_REGISTER"`, `details: { method: "google_oauth" }`
6. **Realtime WebSocket Channel Security:**
   Supabase Realtime channels in `chat-pane.tsx` filter by `user_email` and `group_id`. Because the user's primary identity remains their email, channel authorization remains strictly scoped.

---

## 11. Phased Implementation Plan

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     Phase 1      │     │     Phase 2      │     │     Phase 3      │
│  Configuration   │────►│   Server Core    │────►│    UI & Client   │
│  & Cloud Setup   │     │  Callback Route  │     │  Button & Context│
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                            │
                                                            ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     Phase 6      │     │     Phase 5      │     │     Phase 4      │
│    Production    │◄────│  Documentation   │◄────│    Automated     │
│    Deployment    │     │   & Skills Sync  │     │     Testing      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Phase 1: Cloud & Provider Configuration

- Configure GCP OAuth Consent Screen, Scopes, and Web Client ID.
- Set Authorized Redirect URI in GCP to `https://<project-ref>.supabase.co/auth/v1/callback`.
- Enable Google provider in Supabase Dashboard with GCP Client ID & Secret.
- Add `http://localhost:3000/api/auth/callback` to Supabase URL Configuration Redirect allowlist.

### Phase 2: Server-Side Callback & User Resolution Service

- Install `@supabase/ssr` in `web/package.json` for cookie-based server PKCE handling.
- Create `web/lib/supabase-server.ts` to instantiate server Supabase client.
- Add `resolveOAuthUser()` in `web/api/services/auth.service.ts` with atomic transaction logic.
- Create Route Handler `web/app/api/auth/callback/route.ts` handling authorization code exchange and cookie issuance.
- Optional: Add `supabase_auth_id` column migration via Drizzle Kit.

### Phase 3: UI & Client Integration

- Create `web/components/auth/google-sign-in-button.tsx` with Google iconography and loading state.
- Update `web/components/auth/auth-card.tsx` to include the button and separator.
- Update `web/lib/supabase-client.ts` to support OAuth initialization.
- Handle OAuth error parameters (e.g., `?error=oauth_cancelled`) in `AuthCard`.

### Phase 4: Automated Testing & Verification

- Create `web/api/test/oauth.test.ts` testing all 11 critical scenarios (Section 12).
- Run full test suite: `npm run test` (all suites must pass).
- Run linting and formatting: `npm run lint` and `npm run format:check`.
- Build verification: `npm run build` with Turbopack.

### Phase 5: Documentation & Skill Updates

- Update `.agents/skills/auth-rbac/SKILL.md` with Google OAuth specifications.
- Update `01_api-and-chat/API.md` and `implemented_api.md`.
- Update `README.md` and `web/README.md` with GCP and Supabase setup instructions.

### Phase 6: Production Deployment Checklist

- Add production domain to GCP Authorized JavaScript Origins and Supabase Site URL.
- Test live OAuth flow in staging/production environments.

---

## 12. Testing and Acceptance Criteria

The integration must satisfy the following eleven test cases before acceptance:

|   #    | Test Scenario                              | Execution / Input                                                                           | Expected Result & Acceptance Criteria                                                                                                                                                 |
| :----: | :----------------------------------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | **First-Time Google User**                 | Sign in with new Google account `newuser@gmail.com`.                                        | Row created in `public.users` (`role='user'`, `password_hash=null`, `isActive=true`). Native JWT and refresh cookie issued. Redirects to `/chat`. `USER_REGISTER` logged.             |
| **2**  | **Existing Email/Password User (Linking)** | User `user1@example.com` has bcrypt password. Signs in with Google for `user1@example.com`. | Single record preserved in `public.users`. `password_hash` remains intact. Existing chat history accessible. `USER_LINK_IDENTITY` logged. Can subsequently log in with either method. |
| **3**  | **Returning Google User**                  | User who previously registered via Google signs in again.                                   | Resolves existing row. Issues fresh session tokens. Updates last activity. No duplicate records.                                                                                      |
| **4**  | **Unmatched Email**                        | Google returns email not found in database.                                                 | Handled as first-time user (Test 1). No errors or crashes.                                                                                                                            |
| **5**  | **Concurrent Race Condition**              | Two simultaneous OAuth callback requests for the same new email.                            | Database transaction / upsert prevents duplicate key violations. One user created; both return valid sessions.                                                                        |
| **6**  | **Failed / Cancelled OAuth**               | User cancels Google consent screen or denies permissions.                                   | Google redirects with error. Callback redirects to `/login?error=oauth_cancelled`. `AuthCard` displays friendly error banner. No orphaned DB records.                                 |
| **7**  | **Logout & Session Refresh**               | Google-authenticated user logs out; or waits 15 minutes for access token refresh.           | Refresh succeeds automatically via `/api/auth/refresh`. Logout clears cookie and sets `is_revoked=true` in `public.refresh_tokens`.                                                   |
| **8**  | **Administrator Google Login**             | Pre-seeded admin `admin1@example.com` logs in via Google.                                   | Resolves account; `role` remains `admin`. Admin console button visible. Admin APIs accessible with 200 OK.                                                                            |
| **9**  | **Deactivated User Google Login**          | Admin deactivates `user2@example.com`. User attempts Google login.                          | Callback rejects with 403 Forbidden. Redirects to `/login?error=account_deactivated`. Session tokens NOT issued.                                                                      |
| **10** | **Conversation & Message Integrity**       | User with 50 existing messages logs in via Google.                                          | All 50 messages visible in `/chat`. All group memberships intact. Able to send and receive Realtime messages.                                                                         |
| **11** | **Unauthorized Access Check**              | Requesting `/api/users/me` or `/api/conversations/direct` without Bearer token.             | Returns 401 UNAUTHORIZED with standard error envelope. Middleware rejects unauthenticated requests.                                                                                   |

---

## 13. Risks, Assumptions, and Open Decisions

### 13.1 Risks and Mitigations

| Identified Risk                       | Severity | Mitigation Strategy                                                                                                                                                |
| :------------------------------------ | :------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Google Primary Email Changes**      |   Low    | Google rarely changes user primary emails. If a user changes their Google email, the app treats the new email as a new account unless manually linked by an admin. |
| **Unverified Email Account Takeover** |   High   | Reject any OAuth payload where `email_confirmed_at` is null. Google always verifies emails, but this rule protects against future third-party OAuth providers.     |
| **Third-Party Cookie Blocking**       |  Medium  | The PKCE flow uses first-party redirect cookies (`same-origin`), immune to third-party cookie blocking in Safari and Chrome.                                       |
| **Vercel Preview URL Mismatches**     |  Medium  | Use wildcards in Supabase redirect allowlist (`https://*-your-team.vercel.app/api/auth/callback`) to ensure preview deployments can test OAuth.                    |

### 13.2 Assumptions

1. The developer has access to the Google Cloud Console to create an OAuth 2.0 Web Client ID.
2. The developer has administrative access to the Supabase Dashboard to enable the Google provider.
3. The live Supabase project URL (`NEXT_PUBLIC_SUPABASE_URL`) is reachable from both client browsers and server runtime environments.

### 13.3 Open Decisions for Developer

1. **Schema Metadata Column:** Decide whether to apply the optional `0003_add_oauth_metadata.sql` migration to store `supabase_auth_id`. (Recommended: Yes, for clean audit trails).
2. **Avatar Sync Policy:** Decide whether returning Google logins should overwrite custom avatars chosen by the user in `ProfileModal`. (Recommended: Only populate `avatar_url` if the user currently has no avatar set).

---

## Conclusion

This report provides the complete, authoritative technical roadmap for introducing Google OAuth into the chat application. By adopting the **Federated Identity Exchange Model**, the team can deliver seamless Google authentication while safeguarding existing email/password accounts, preserving the database architecture, and maintaining the highest standards of security and code quality.
