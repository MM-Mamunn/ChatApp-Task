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

## Implementation layout (when built)

- OAuth callbacks and token issuance: server modules under `web/lib/` + Route Handlers under `web/app/api/auth/` (exact tree per contract).
- Session validation helper used by Route Handlers before domain logic.
- Deactivated users must fail auth even with technically valid tokens once deactivation is implemented.

## Security

- Refresh token rotation/storage design follows step 1.3 contract.
- Invalidate or reject sessions on role change and deactivation per chosen mechanism (document in API contract).
