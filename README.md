# Secure Realtime Chat Application (Part 1)

A production-minded, full-stack realtime chat application built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Drizzle ORM, Supabase PostgreSQL, and Supabase Realtime.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Repository Layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Database Setup & Migrations](#database-setup--migrations)
7. [Test Accounts](#test-accounts)
8. [Local Development](#local-development)
9. [Automated Testing & Verification](#automated-testing--verification)
10. [Deployment Configuration (Vercel)](#deployment-configuration-vercel)
11. [API Documentation](#api-documentation)

---

## Features

- **Authentication & Sessions**: Email/password authentication with bcrypt password hashing (cost factor 12) and JWT sessions using `jose`. Short-lived access tokens (15m) paired with secure HTTP-only refresh tokens (7d) stored as SHA-256 hashes with automatic rotation and revocation on logout.
- **Server-Side Authorization (RBAC)**: Strictly enforced server-side role-based access control with `user` and `admin` roles. No client-side self-promotion. Deactivated accounts have sessions revoked immediately.
- **Realtime Direct & Group Messaging**: 1-on-1 direct conversations (duplicate-safe initiation) and multi-member named group channels. Instant message delivery powered by Supabase Realtime over WebSockets—zero polling required.
- **Responsive & Accessible UI**: Clean desktop and mobile responsive interface built with Tailwind CSS v4, Framer Motion animations, accessible keyboard navigation, visible focus indicators, and ARIA attributes across all modals and inputs.
- **Admin Oversight Console**: Protected administrative dashboard (`/admin` and in-app modal) providing project-wide user management, role modification, account deactivation, cursor-paginated activity audit logs, and read-only inspection of conversations with full accountability logging.
- **Hardened Security Baseline**: Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`), explicit CORS origin allowlist, and server-side Zod validation on request bodies, query parameters, and route parameters.

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router, Turbopack) & React 19 |
| **Language** | TypeScript 5 (Strict mode) |
| **Styling & Motion** | Tailwind CSS v4 & Framer Motion |
| **Database & ORM** | Supabase PostgreSQL with Drizzle ORM & Drizzle Kit |
| **Realtime Transport** | Supabase Realtime (`@supabase/supabase-js`) |
| **Authentication** | JWT via `jose` (HS256) & bcryptjs (cost factor 12) |
| **Validation** | Zod v4 schemas for bodies, queries, and route params |
| **Code Quality** | ESLint 9 & Prettier |

---

## Repository Layout

All runnable application code resides in the `web/` directory:

```text
/
├── 01_api-and-chat/          # Part 1 specifications, API contract (API.md), and plan
├── 02_creative-landing-page/ # Part 2 creative landing page plan
├── 03-submission-and-write-up/# Part 3 submission and write-up plan
├── .agents/skills/           # Repository-specific agent skills
├── PROJECT.md                # Central product specification & source of truth
├── PROJECT_PROGRESS.md       # Factual record of completed implementation steps
├── implemented_api.md        # Reference of implemented REST endpoints
├── supabase_realtime.md      # Supabase Realtime configuration guide
├── .env.example              # Root environment variable template
└── web/                      # Full-stack Next.js application (npm cwd)
    ├── api/                  # Modular backend domain architecture
    │   ├── authentication/   # JWT config, token creation/verification, cookies
    │   ├── configuration/    # Centralized Zod environment validation & CORS
    │   ├── controllers/      # HTTP controllers (auth, users, chat, admin)
    │   ├── database/         # Drizzle client, table schemas, migrations, seed
    │   ├── errors/           # Standard error codes & AppError classes
    │   ├── middlewares/      # withSecurity, withAuth, withRoles
    │   ├── services/         # Business logic and database operations
    │   ├── utils/            # Standard response envelopes (apiSuccess, apiError)
    │   └── validation/       # Zod validation helpers
    ├── app/                  # Next.js App Router (pages, layouts, and HTTP routes)
    │   ├── api/              # HTTP Route Handlers
    │   ├── admin/            # Protected admin page
    │   ├── chat/             # Protected realtime chat page
    │   ├── login/            # Authentication page
    │   └── page.tsx          # Root entry point with session routing
    ├── components/           # UI components (chat, auth, admin, ui)
    ├── lib/                  # Shared clients (api-client, auth-context, supabase-client)
    └── vercel.json           # Vercel deployment configuration
```

---

## Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Supabase Project**: A PostgreSQL database instance with Supabase Realtime enabled

---

## Environment Variables

Copy `.env.example` to `web/.env` (or set in your deployment environment):

```bash
cp .env.example web/.env
```

### Configuration Keys:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string (transaction pooler recommended for serverless) |
| `JWT_ACCESS_SECRET` | Yes | 256-bit secret string used to sign short-lived access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | 256-bit secret string used to sign long-lived refresh tokens (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application origin URL (e.g. `http://localhost:3000` or deployment URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anonymous API key (safe for browser client) |
| `BOOTSTRAP_ADMIN_SECRET` | Optional | Shared secret key for `/api/auth/bootstrap-admin` endpoint |
| `GOOGLE_CLIENT_ID` | Optional | OAuth Client ID for Google authentication |
| `GOOGLE_CLIENT_SECRET` | Optional | OAuth Client Secret for Google authentication |

*Note: Server secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are never exposed to the client.*

---

## Database Setup & Migrations

From the `web/` directory:

1. **Apply Schema Migrations**:
   ```bash
   npm run db:migrate
   ```
   Applies Drizzle migrations to your Supabase PostgreSQL database to create tables (`users`, `roles`, `groups`, `group_members`, `direct_messages`, `group_chat_messages`, `refresh_tokens`, `activity_logs`).

2. **Seed Initial Test Data**:
   ```bash
   npm run db:seed
   ```
   Populates roles, default test accounts with bcrypt-hashed passwords, initial groups, and audit records idempotently.

3. **Supabase Realtime Configuration**:
   Ensure PostgreSQL Logical Replication is enabled for `direct_messages` and `group_chat_messages` tables. Refer to [`supabase_realtime.md`](./supabase_realtime.md) for full SQL instructions.

---

## Test Accounts

The seed script creates the following pre-configured test accounts (also available via **1-click quick-fill buttons** on the login screen):

| Name | Email | Password | Role | Purpose |
| --- | --- | --- | --- | --- |
| **Admin** | `admin@example.com` | `AdminSecret123!` | `admin` | Full administrative oversight, user management, audit logs |
| **Alex** | `alex@example.com` | `SecurePassword123!` | `user` | Standard chat participant |
| **Sam** | `sam@example.com` | `SecurePassword123!` | `user` | Standard chat participant |
| **Alice** | `alice@chat.local` | `AlicePass123!` | `user` | Additional test account |
| **Bob** | `bob@chat.local` | `BobPass123!` | `user` | Additional test account |
| **Charlie** | `charlie@chat.local` | `CharliePass123!` | `user` | Additional test account |

### Creating New Accounts:
Users can also register new accounts directly from the UI:
1. Navigate to `/login`.
2. Click **Create account**.
3. Fill in **Full name**, **Email address**, and **Password** (min 8 characters).
4. Click **Create account** to immediately enter the chat application.

---

## Local Development

From the `web/` directory:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Testing & Verification

Comprehensive automated test suites cover all security, authentication, RBAC, chat, and realtime functionality:

```bash
# Run all automated test suites
npm run test:all

# Run individual suites:
npm run test:security   # Zod validation, missing env, CORS, security headers, envelopes
npm run test:auth       # Bcrypt cost 12, JWT access tokens, refresh rotation, logout, bootstrap
npm run test:rbac       # RBAC permission matrix, user search masking, role changes, deactivation
npm run test:chat       # Direct chats, groups, message pagination, membership checks
npm run test:realtime   # Live Supabase Realtime WebSocket message push verification

# Run code style and build checks:
npm run lint            # ESLint static analysis
npm run format:check    # Prettier code formatting verification
npm run build           # Production Next.js Turbopack build
```

---

## Deployment Configuration (Vercel)

The repository includes a ready-to-deploy configuration:

1. **Vercel Project Setup**:
   - Link the repository on [Vercel](https://vercel.com).
   - Set **Root Directory** to `web` (or rely on `web/vercel.json`).
   - Framework preset: **Next.js**.

2. **Environment Variables on Vercel**:
   Add the variables listed in the [Environment Variables](#environment-variables) section to your Vercel Project Settings:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL, e.g. `https://your-app.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**:
   Trigger deployment via git push. The production build compiles clean static pages and dynamic API route handlers.

---

## API Documentation

The complete REST API specification is documented in [`01_api-and-chat/API.md`](./01_api-and-chat/API.md) and [`implemented_api.md`](./implemented_api.md), covering:
- Authentication (`/api/auth/*`)
- User Discovery & Profiles (`/api/users/*`)
- Direct Messaging (`/api/conversations/direct/*`)
- Group Channels (`/api/groups/*`)
- Admin Oversight & Audit Logs (`/api/admin/*`)
- System Health (`/api/hello`)
