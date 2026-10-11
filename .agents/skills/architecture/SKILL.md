---
name: architecture
description: >-
  Repository layout, architectural layers, data flow, and stack boundaries for
  this Next.js application. Use when onboarding, adding features, choosing file
  locations, or extending the architecture.
---

# Project Structure and Architecture

## Authority & Planning

- **Product scope & requirements:** `PROJECT.md`
- **Part 1 execution plan:** `01_api-and-chat/IMPLEMENTATION_PLAN.md`
- **Part 2 landing page plan:** `02_creative-landing-page/IMPLEMENTATION_PLAN.md`
- **Part 3 submission plan:** `03-submission-and-write-up/IMPLEMENTATION_PLAN.md`
- **Factual record of completed work:** `PROJECT_PROGRESS.md`

## Technology Stack

- **Framework:** Next.js 16 (App Router) with TypeScript inside `web/`.
- **Backend & API Architecture:** Integrated entirely within the Next.js application under `web/api/` and `web/app/api/` (no separate backend process or root `api/` directory).
- **Styling & Animation:** Tailwind CSS v4 and Framer Motion.
- **Database & ORM:** Drizzle ORM with Supabase PostgreSQL (`postgres` driver); schema and migrations managed via Drizzle Kit.
- **Authentication & Security:** Google OAuth, email/password (bcrypt), JWT sessions via `jose`, server-side RBAC, and centralized environment validation.
- **Realtime:** Supabase Realtime for instant messaging updates scoped to conversation members.

---

## Repository Map

The repository root houses project specifications, implementation roadmaps, agent skills, and shared configuration templates. All runnable application code lives inside `web/`.

```
/
├── PROJECT.md                      # Source of truth for product scope and constraints
├── PROJECT_PROGRESS.md             # Record of verified completed work
├── .env.example                    # Template for root-level environment variables
├── .gitignore                      # Excludes root secrets (.env*) and temporary files
├── 01_api-and-chat/                # Part 1 implementation plans and specifications
│   └── IMPLEMENTATION_PLAN.md      # Dependency-ordered Part 1 implementation steps
├── 02_creative-landing-page/       # Part 2 implementation plans
│   └── IMPLEMENTATION_PLAN.md      # Part 2 marketing landing page plan
├── 03-submission-and-write-up/     # Part 3 verification and write-up plans
│   └── IMPLEMENTATION_PLAN.md      # Part 3 documentation and submission plan
├── .agents/skills/                 # Repository-specific agent instructions
│   ├── architecture/SKILL.md       # Project layout, layering, and data flow (this skill)
│   ├── api-data-layer/SKILL.md     # Route Handlers, Drizzle data access, contracts
│   ├── auth-rbac/SKILL.md          # Authentication, token lifecycle, RBAC enforcement
│   ├── coding-standards/SKILL.md   # TypeScript, ESLint, and Prettier standards
│   ├── environment-secrets/SKILL.md# Secrets handling, .env files, validation
│   ├── follow-relevent-skill/SKILL.md # Skill invocation workflow
│   ├── git-workflow/SKILL.md       # Commit conventions and progress tracking
│   ├── realtime-state/SKILL.md     # Supabase Realtime subscription guidelines
│   ├── ui-design-system/SKILL.md   # Tailwind, motion, and UX design guidelines
│   └── verification/SKILL.md       # Verification checks and quality gates
└── web/                            # Full-stack Next.js application (npm cwd)
    ├── package.json                # App dependencies, build, lint, and db scripts
    ├── tsconfig.json               # TypeScript path mappings (@/* -> ./, @api/* -> ./api)
    ├── next.config.ts              # Next.js configuration and root env loader
    ├── eslint.config.mjs           # ESLint flat configuration (Next.js + Prettier)
    ├── .prettierrc                 # Prettier code formatting rules
    ├── .prettierignore             # Prettier ignore patterns
    ├── .gitignore                  # Web-level gitignore
    ├── .env.example                # Web-level environment variable template
    ├── .env                        # Local development secrets (gitignored)
    ├── app/                        # Next.js App Router pages, layouts, and HTTP routes
    │   ├── layout.tsx              # Root HTML and body layout
    │   ├── page.tsx                # Home landing/scaffold page
    │   ├── globals.css             # Tailwind stylesheet
    │   ├── favicon.ico             # App icon
    │   └── api/                    # Route Handlers serving as single route layer
    │       ├── auth/               # Endpoints: register, login, refresh, logout, bootstrap-admin
    │       └── hello/              # GET /api/hello entry point delegating to web/api
    ├── api/                        # Modular backend API architecture inside web/
    │   ├── index.ts                # Central barrel export for the API layers
    │   ├── authentication/         # JWT secret retrieval, access/refresh tokens, cookies, bcrypt
    │   ├── configuration/          # Centralized environment validation and CORS allowlist
    │   ├── controllers/            # HTTP request/response handlers and orchestration
    │   ├── database/               # Drizzle ORM client, schemas, migrations, and seed scripts
    │   ├── errors/                 # Standard error codes, custom error hierarchy (AppError)
    │   ├── middlewares/            # Reusable HTTP middlewares (withSecurity, withAuth, withRoles)
    │   ├── services/               # Core business logic and database operations
    │   ├── utils/                  # Standard response envelopes and safe request parsers
    │   └── validation/             # Zod validation utilities for body, query, and params
    ├── components/                 # Reusable React UI components
    │   └── foundation-status.tsx   # Visual status card for verification
    ├── lib/                        # Shared client and server helper utilities
    │   └── env/
    │       └── public.ts           # Client-safe environment variable helpers
    └── public/                     # Static public assets (images, icons)
```

---

## Folder Purposes (Quick Reference)

| Folder | One-Line Purpose |
| --- | --- |
| `/.agents/skills/` | Repository-tailored agent skills providing operational instructions and guidelines. |
| `/01_api-and-chat/` | Step-by-step implementation plan for Part 1 (API, auth, chat, admin). |
| `/02_creative-landing-page/` | Implementation plan for Part 2 creative marketing landing page. |
| `/03-submission-and-write-up/` | Plan for Part 3 end-to-end verification, documentation, and write-up. |
| `/web/` | Root of the Next.js full-stack application and npm workspace cwd. |
| `/web/app/` | Next.js App Router containing React page layouts and HTTP API route handlers. |
| `/web/app/api/` | HTTP Route handlers (`route.ts`) serving as the route layer, applying middlewares and invoking controllers. |
| `/web/api/` | Backend API architecture containing modular domain layers. |
| `/web/api/authentication/` | JWT configuration and reusable token creation/verification logic. |
| `/web/api/configuration/` | Centralized environment variable reading with explicit missing-variable errors. |
| `/web/api/controllers/` | Request parsing, controller orchestration, and HTTP response assembly. |
| `/web/api/database/` | Drizzle ORM singleton client, Drizzle Kit configuration, schemas, and migrations. |
| `/web/api/errors/` | Standard error codes, custom error hierarchy (`AppError`), and error formatting. |
| `/web/api/middlewares/` | Reusable HTTP middlewares for security (`withSecurity`), JWT authentication (`withAuth`), and RBAC (`withRoles`). |
| `/web/api/services/` | Pure business logic and database interactions independent of HTTP transport. |
| `/web/api/utils/` | Shared utilities: standard response envelopes (`apiSuccess`, `apiError`) and safe request parsers. |
| `/web/api/validation/` | Zod validation utilities for request bodies, query parameters, and route params. |
| `/web/components/` | Reusable React UI components (Tailwind CSS + Framer Motion). |
| `/web/lib/` | Cross-cutting client/server utilities and client environment helpers. |
| `/web/public/` | Unprocessed static files served by Next.js directly. |

---

## Architectural Layers & Responsibilities

The application follows a clean, decoupled layered architecture inside Next.js:

```
[ Browser / Client ]
         │  HTTP Request
         ▼
[ Route Layer (Next.js App Router) ] ──>  web/app/api/**/route.ts
         │
         ├─── [ Middlewares Layer ]  ──>  web/api/middlewares/ (withSecurity, withAuth, withRoles)
         │           │
         │           ▼
         │      [ Authentication ]   ──>  web/api/authentication/ (jose, JWT)
         ▼
[ Controllers Layer ]   ──>  web/api/controllers/*.ts (validates inputs, formats responses)
         │
         ▼
[ Services Layer ]      ──>  web/api/services/*.ts (core domain logic)
         │
         ▼
[ Database Layer ]      ──>  web/api/database/ (getDb via Drizzle ORM)
         │
         ▼
[ Supabase PostgreSQL ] ──>  Persistent storage
```

### 1. Route Handlers (`web/app/api/`)
- Pure Next.js App Router handlers (`export const GET/POST/PATCH/DELETE`).
- Serves as the single **Route Layer**: applies middleware wrappers (`withSecurity`, `withAuth`, `withRoles`) and delegates directly to controllers in `web/api/controllers/`.
- Eliminates duplicate routing boilerplate while keeping business logic decoupled and testable.

### 3. Middlewares (`web/api/middlewares/`)
- Request processing pipelines:
  - `withAuth`: Extracts the Bearer access token, validates it using `verifyAccessToken`, and attaches `userId` and `role` to `ApiContext`.
  - `withRoles`: Denies access with 403 Forbidden if the authenticated user lacks the necessary role (`user` | `admin`).

### 4. Controllers (`web/api/controllers/`)
- Handle request-level concerns: read body/query/params, trigger service methods, catch errors, and format standard HTTP JSON responses (`Response.json(...)`).

### 5. Services (`web/api/services/`)
- Encapsulate business logic, validations, calculations, and database queries.
- Must not manipulate raw HTTP request or response streams directly.

### 6. Database (`web/api/database/`)
- Provides `getDb()` singleton instance powered by Drizzle ORM and `postgres-js`.
- Maintains declarative table schemas in `web/api/database/schema/`.
- Configured for Drizzle Kit schema migrations via `web/api/database/drizzle.config.ts`.

### 7. Authentication (`web/api/authentication/`)
- Centralizes JWT secret resolution and TTL configuration (`jwt.config.ts`).
- Provides `createAccessToken` and `verifyAccessToken` using standard `jose` HS256 web crypto.

### 8. Configuration (`web/api/configuration/`)
- Centralizes reading of `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc.
- Throws descriptive `MissingEnvError` when a required variable is missing, instructing the user to configure `.env`.

---

## Data Flow & Direction of Dependencies

1. **Inward Dependencies:** Outer transport layers (`app/api`) depend on inner API layers (`controllers` -> `services` -> `database`).
2. **Never Upward:** Services never import controllers or Next.js route handlers.
3. **Database Isolation:** Database queries occur strictly in services or database helpers, never directly inside UI components or Next.js route handlers.
4. **Secrets Isolation:** Server secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are accessed strictly through server modules (`web/api/configuration/env.ts`) and must NEVER be imported into React client components or exposed with `NEXT_PUBLIC_`.

---

## Conventions for Extending the Architecture

When adding new features (e.g. Conversations, Messages, Profiles):

1. **Add Drizzle Schema:** Define tables in `web/api/database/schema/` and export from `web/api/database/schema/index.ts`.
2. **Implement Service:** Add business logic and Drizzle queries in `web/api/services/<resource>.service.ts`.
3. **Implement Controller:** Add HTTP request/response handler in `web/api/controllers/<resource>.controller.ts`.
4. **Implement App Router Endpoint:** Create `web/app/api/<resource>/route.ts` wrapping controllers with required middlewares (`withSecurity`, `withAuth`, `withRoles`).
5. **Run Verification:** Run `npm run lint`, `npm run format:check`, and `npm run build` from `web/`.
