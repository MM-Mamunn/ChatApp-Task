# Part 1: API, Security, and Chat Application

## Scope

Build the required Next.js/TypeScript application foundation, the documented API, Supabase-backed data model and realtime chat experience. This is the dependency for every later part.

## Completion rule

Complete a step only after its stated verification succeeds and record the evidence in `../PROJECT_PROGRESS.md`.

| Step | Implement | Depends on | Expected outcome | Verify |
| --- | --- | --- | --- | --- |
| 1.1 | Initialize the Next.js + TypeScript project and configure Tailwind CSS, Framer Motion, linting, formatting, and environment loading. | None | A local app can start without committed secrets. | Run the documented local checks and inspect `.env.example`. |
| 1.2 | Create repository-specific `.agents/skills/*/SKILL.md` files for architecture, coding standards, API/data layer, auth/RBAC, realtime/state, UI/design system, environment/secrets, Git workflow, and verification. Include an accurate folder map. | 1.1 | Agents have enforceable, real-path instructions tailored to this repository. | Review every skill against the actual tree; no invented paths. |
| 1.3 | Design and document the API before implementation: resources, endpoints, request/response schemas, status/error format, access rules, pagination, token refresh/sign-out, and first-admin bootstrap. | 1.1 | A standalone API contract that covers all required user, conversation, message, admin, and activity-log workflows. | Cross-check every required assignment behavior and role rule. |
| 1.4 | Configure Supabase and write versioned schema/migrations for profiles, roles/status, conversations, participants, messages, and activity events; define Row Level Security/realtime policies. | 1.1, 1.3 | Persistent PostgreSQL data with policies that match the contract. | Apply migrations to a test project and inspect policies/schema. |
| 1.5 | Implement configuration validation and security baseline: secret handling, security headers, explicit CORS origins, Zod validation, consistent errors, and request utilities. | 1.1 | Invalid or unsafe requests fail predictably before feature routes rely on them. | Exercise representative missing-env, invalid-input, 400, 401, and 403 cases. |
| 1.6 | Implement authentication: Google OAuth, secondary email/password with bcrypt, short-lived JWT access tokens, refresh rotation/expiry, sign-out, profile provisioning, and deactivation checks. | 1.3, 1.4, 1.5 | Sign-in and session lifecycle work without exposing passwords or secrets. | Test success, cancellation/failure handling, expired/invalid token, refresh, and deactivated user cases. |
| 1.7 | Implement server-side authorization and admin controls: deny-by-default RBAC, protected routes, user search/listing, role/status changes, first-admin bootstrap, and admin audit events. | 1.4, 1.5, 1.6 | Users cannot access admin or non-member data; admins have required read-only visibility without impersonation. | Test each row of the assignment permission matrix, including no self-promotion. |
| 1.8 | Implement conversation and message APIs: user search, duplicate-safe one-to-one creation, group creation, membership checks, ordered paginated history, send-message validation, and activity logging. | 1.3, 1.4, 1.5, 1.7 | The complete chat domain is available through the documented API. | Run route-level tests for duplicates, non-members, empty/whitespace messages, pagination, and persistence. |
| 1.9 | Build the authenticated chat UI: login, protected app shell, profile state, conversation creation, group flow, readable message list, timestamps, loading/empty/error states, safe auto-scroll, and message sending. | 1.6, 1.8 | A user can complete all normal chat flows through the UI. | Manual end-to-end test with at least two accounts. |
| 1.10 | Add Supabase Realtime subscriptions with membership-safe delivery and UI motion; build the protected admin dashboard for users, conversations/messages, activity, role updates, and deactivation. | 1.4, 1.7, 1.9 | New messages appear live only for authorized participants, and admins can perform required oversight. | Two-browser realtime test plus user/admin authorization regression checks. |
| 1.11 | Harden and prepare the Part 1 deliverable: accessibility/responsive review, focused tests, README setup/run instructions, test accounts or account-creation steps, and deployment configuration. | 1.2-1.10 | A hosted, reproducible Part 1 application with documented verification. | Run production build, test deployed user and admin flows, and record deployed URL/issues. |

## Guardrails

- Use the prescribed stack: Next.js, TypeScript, Tailwind CSS, Framer Motion, Supabase, Google OAuth, JWT, bcrypt, RBAC, and Zod (or class-validator).
- Never rely on hidden UI controls for authorization; enforce role and membership rules in server code and database policies.
- Do not build the landing page or write-up features in this folder's implementation sequence until Part 1 is verified.
