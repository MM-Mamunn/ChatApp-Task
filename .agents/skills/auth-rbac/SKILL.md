---
name: auth-rbac
description: >-
  Google OAuth, email/password, JWT sessions, roles, deactivation, and
  deny-by-default RBAC for this repository. Use when implementing auth,
  middleware, or permission checks.
---

# Authentication and RBAC

## Requirements (from PROJECT.md)

- Google OAuth; on first sign-in create profile (name, email, avatar).
- Email/password sign-up and sign-in; **bcrypt** hash only; never store or log plain passwords.
- JWT access token (short-lived) + refresh mechanism; tokens carry identity and **role** (`user` | `admin`).
- Sign-out, expired/invalid tokens, refresh failure, role changes, and deactivation must take effect promptly.
- Users may view/update **own** profile only (except admin user-management flows).

## Enforcement

- **Deny by default** on the server for every protected Route Handler and server action.
- 401 if unauthenticated; 403 if authenticated but not allowed.
- UI hiding is not authorization — always re-check on the server (and RLS where applicable).
- **No self-promotion** to admin via normal user input.
- **Admin**: list all users/conversations/messages/activity; change roles and deactivate users.
- **Admin read-only** on conversations they are not in — cannot send/edit/delete as another user.

## Env placeholders (see `web/.env.example`)

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL` (bootstrap mechanism finalized in API contract / step 1.3+).

## Implementation layout

- **Google OAuth:** Mediated via Supabase Auth PKCE gateway. Initiated via `signInWithGoogle()` in `web/lib/supabase-client.ts`, code exchanged in Route Handler `GET /web/app/api/auth/callback/route.ts` via `web/lib/supabase-server.ts`.
- **Identity Resolution:** Atomic resolution in `web/api/services/auth.service.ts` (`resolveOAuthUser`):
  - Strictly requires `emailConfirmedAt`.
  - Non-destructive linking preserving existing bcrypt `password_hash` and `role`.
  - Blocks deactivated users with 403 Forbidden.
  - Provisions first-time users with `role: "user"`.
  - Issues native JWT access tokens (HS256, 15m) and HTTP-only refresh tokens (7d).
- **Session Validation:** Route Handlers protected via `withAuth` and `withRoles` in `web/api/middlewares/`.
- Deactivated users fail auth even with technically valid tokens via live database checks in `withAuth`.

## Security

- Refresh token rotation/storage design follows SHA-256 hashed storage in `public.refresh_tokens` and HTTP-only cookies (`Path=/api/auth`).
- Invalidate or reject sessions on role change and deactivation per live database verification.
