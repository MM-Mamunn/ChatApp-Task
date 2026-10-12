# Secure Realtime Chat Web Application

Runnable Next.js 16 application for the Secure Realtime Chat assignment. Complete project architecture, specifications, and deployment guides can be found in the [root README.md](../README.md).

## Quick Start

### 1. Setup Environment

```bash
cp ../.env.example .env
```

Populate `.env` with your Supabase database URL, JWT secrets, and Supabase public client keys.

### 2. Install & Migrate Database

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command                 | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run dev`           | Starts Next.js development server with Turbopack                      |
| `npm run build`         | Compiles production build                                             |
| `npm run start`         | Starts Next.js production server                                      |
| `npm run lint`          | Runs ESLint analysis                                                  |
| `npm run format:check`  | Verifies Prettier code style                                          |
| `npm run format`        | Automatically formats files using Prettier                            |
| `npm run test:all`      | Runs all automated test suites (security, auth, rbac, chat, realtime) |
| `npm run test:security` | Tests Zod validations, error envelopes, and CORS baseline             |
| `npm run test:auth`     | Tests bcrypt hashing, JWT access tokens, and refresh token rotation   |
| `npm run test:rbac`     | Tests role-based authorization matrix and admin oversight             |
| `npm run test:chat`     | Tests direct and group chat endpoints and message pagination          |
| `npm run test:realtime` | Tests Supabase Realtime WebSocket message push delivery               |
| `npm run db:generate`   | Generates Drizzle Kit schema migrations                               |
| `npm run db:migrate`    | Applies migrations to PostgreSQL database                             |
| `npm run db:seed`       | Seeds test accounts and initial data                                  |

## Test Accounts

Seed accounts available on login (or via 1-click quick-fill buttons):

- **Admin**: `admin@example.com` / `AdminSecret123!`
- **Alex (User)**: `alex@example.com` / `SecurePassword123!`
- **Sam (User)**: `sam@example.com` / `SecurePassword123!`
