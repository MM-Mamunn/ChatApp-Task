# Project Reference: Secure Realtime Chat Application

## Status and authority

This file is the central reference for what this project must build. Consult it before starting any implementation-plan step. The three numbered plan files describe **how** to build it incrementally; `PROJECT_PROGRESS.md` records only verified work that has actually been completed.

Update this file only when the project requirements change. Do not use it to record implementation progress.

## Purpose and expected outcome

Build and host a production-minded realtime chat application with a secure API, a user-facing chat experience, and an admin oversight experience. Also build a separate, original landing page that presents the completed product. The final repository must be reproducible, documented, and accompanied by a concise explanation of the technical and design decisions made.

The expected submission includes a working Part 1 application and Part 2 landing-page URL, source code, repository-specific agent skills, API documentation, setup instructions, environment-variable guidance, and a Part 3 thought-process write-up.

## Required technology and delivery constraints

| Area | Requirement |
| --- | --- |
| Frontend | Next.js with TypeScript, Tailwind CSS, and Framer Motion. |
| Server | Next.js Route Handlers/server code in TypeScript; no separate backend framework. |
| Data and realtime | Supabase PostgreSQL for persistence and Supabase Realtime for live updates. A custom WebSocket server is not required. |
| Authentication | Google OAuth, JWT, and bcrypt. Email/password authentication is a required secondary option. |
| Authorization | Server-enforced role-based access control (RBAC) with `user` and `admin` roles. |
| Security | Security headers, explicit CORS configuration, server-side input validation using Zod or class-validator, and no committed secrets. |
| Hosting | Deploy to Vercel, Netlify, or a similar hosted service. Provide working hosted URLs for both Part 1 and Part 2. |
| Repository guidance | Create and maintain `.agents/skills/` with repository-specific skills covering architecture, coding standards, API/data, authentication/RBAC, state/realtime, UI/design, environment/secrets, Git workflow, and verification. |

## Functional requirements

### Accounts, sessions, and profiles

- Users can sign in with Google. On first Google sign-in, create a user record containing at least name, email, and avatar.
- Users can also sign up and sign in with email/password; passwords must be hashed with bcrypt and never stored or logged as plain text.
- The API issues JWT-based sessions with a short-lived access token and a refresh mechanism. Tokens must carry user identity and role.
- Sign-out, invalid/expired tokens, refresh failure, role changes, and account deactivation must take effect promptly.
- Signed-in users can view and update their own profile.

### Conversations and messages

- Users can search for other users by name or email. A normal user's search result must expose limited fields; the exact field set is not specified.
- Users can create one-to-one conversations. Creating one with a user who is already in a direct conversation must return the existing conversation rather than create a duplicate.
- Users can create named group conversations with multiple participants.
- Users can view their conversation list, ordered with the most recent activity first.
- Members can retrieve an ordered, sensibly paginated conversation history and send messages in conversations they belong to.
- The server must reject empty or whitespace-only messages.
- Messages must persist across restarts and redeployments.
- Incoming messages must appear without a manual refresh through Supabase Realtime. Users must receive realtime updates only for conversations they belong to.

### Activity logging and administration

- Record important activity events, including sign-ins, user creation, conversation/group creation, messages sent, role changes, and deactivations.
- Provide an admin-only dashboard where admins can browse all users, all conversations and messages, and the project-wide activity log; admins can change roles and deactivate users.
- Admin access to conversations outside the admin's membership is read-only. An admin cannot send, edit, or delete messages as another user and cannot impersonate a user.
- Bootstrap the first admin using a documented safe mechanism, such as a configured admin email or seed script.
- Log admin actions such as role changes and viewing another user's conversation.

### Chat and public interfaces

- Provide a login interface with Google and secondary email/password options; handle loading, cancelled, and failed sign-in states.
- Protect pages that require authentication.
- Provide chat interfaces for direct and group conversation creation, message history with clearly distinguished senders and timestamps, message sending, loading/empty/error states, and sensible auto-scroll that does not interrupt a user reading older messages.
- Use Framer Motion for meaningful interface motion, such as message-arrival or panel transitions.
- Build a protected admin dashboard that exposes the required admin capabilities and is unreachable by non-admin users.
- Build an original, responsive public landing page using Next.js, Tailwind CSS, and Framer Motion that clearly communicates the actual Part 1 product and links to it. The landing page must have its own hosted URL.

## Roles and permission model

| Action | `user` | `admin` |
| --- | --- | --- |
| Sign in; view/update own profile | Allowed | Allowed |
| Search users | Allowed with limited fields | Allowed |
| Create direct or group conversations | Allowed | Allowed |
| Read/send messages in own conversations | Allowed | Allowed |
| Read conversations they do not belong to | Denied | Allowed, read-only |
| List/view all users | Denied | Allowed |
| Change a user's role or deactivate a user | Denied | Allowed |
| View project-wide activity | Denied | Allowed |
| Send, edit, or delete messages as another user | Denied | Denied |

Role and membership checks are server-side requirements. Hiding a user-interface control is not authorization. Use deny-by-default behavior, return 401 for unauthenticated requests and 403 for authenticated but forbidden requests, and prevent self-promotion through normal user input.

## Primary workflows

### 1. Authenticate and enter the chat

1. A visitor chooses Google or email/password sign-in.
2. The server validates the request, completes authentication, provisions a first-time Google profile when applicable, and establishes a JWT session.
3. The application loads the authenticated chat experience, or presents a clear failure/cancellation state.
4. A deactivated user or invalid/expired session cannot continue to protected features.

### 2. Start and use a conversation

1. An authenticated user searches for people by name or email.
2. The user starts a direct conversation or creates a named group with multiple participants.
3. The server validates identity, membership, and input; it reuses an existing direct conversation instead of duplicating it.
4. Participants view ordered, paginated history and send non-empty messages.
5. Persistence stores the message and the activity log; Supabase Realtime delivers the new message to authorized participants.
6. The client renders message state and auto-scrolls only when appropriate.

### 3. Admin oversight

1. An admin opens the protected dashboard.
2. The server confirms the admin role before returning project-wide users, conversations/messages, or activity data.
3. The admin can inspect non-member conversations read-only, manage roles/status, and review events.
4. The system records accountable admin actions; it never grants the admin another user's messaging identity.

### 4. Discover the product

1. A visitor opens the responsive public landing page.
2. The page explains the implemented chat product and provides clear calls to action to the live Part 1 application.
3. Motion and any original interaction improve comprehension without blocking access or misrepresenting features.

## Data, API, and security expectations

- Persist user/profile data, roles/status, conversations, membership, messages, and activity events in Supabase PostgreSQL.
- Document the API before building it: endpoints, methods, request/response formats, parameters, authentication, access rules, error format, and status codes.
- Validate request bodies, query parameters, and route parameters on the server; reject invalid requests with a clear 400 response and use a consistent error shape.
- Apply security headers equivalent to Helmet protections, including content-security, X-Content-Type-Options, strict transport security, and frame protections, through Next.js configuration or middleware.
- Configure CORS only for the project frontend origin(s); do not use credentialed wildcard CORS.
- Keep OAuth, Supabase, JWT, and related secrets in environment variables; provide `.env.example` placeholders and never commit real credentials.

## Quality, documentation, and submission requirements

- Keep the code clean, maintainable, reasonably organized, and written in TypeScript.
- Verify features before calling them complete. Prioritize correct chat-panel behavior, authentication, and authorization.
- Include setup/run instructions, Supabase setup and schema/migration guidance, OAuth configuration, environment-variable documentation, the technology stack, API documentation (or a link), and test-account instructions or clear account-creation steps in the README.
- Write a concise Part 3 explanation covering architecture and library choices, Supabase trade-offs, security decisions, landing-page design reasoning, AI-tool use (if any), human verification, known issues, and improvements with more time.
- Submit the repository, the required `.agents/skills/` content, and both working live demo links. Do not expose secrets.

## Requirement details needing confirmation

The following are intentionally not specified by the assignment and must be decided and documented during implementation, or confirmed with the requester if a fixed answer is needed:

- Exact API route names, request/response field shapes, pagination format, and error-object schema.
- Database table/column names, migration strategy, Supabase Row Level Security policy design, and the exact mechanism for restricting Realtime subscriptions.
- JWT lifetime, refresh-token storage/rotation design, OAuth callback details, and the precise deactivation/role-change invalidation mechanism.
- The limited fields visible to a normal user in search results.
- The exact first-admin bootstrap method and the identity of the first admin.
- Landing-page visual design, copy, original interaction, and the final hosting provider/domain.
- Whether the two required hosted URLs use one deployment with distinct routes or separate deployments; the requirement is that both Part 1 and Part 2 have working live URLs.

## Relationship to the implementation workflow

| Source | Use |
| --- | --- |
| `PROJECT.md` | Source of truth for product scope, behavior, roles, constraints, and open requirement details. Consult before every implementation step. |
| `01_api-and-chat/IMPLEMENTATION_PLAN.md` | Ordered Part 1 implementation plan. |
| `02_creative-landing-page/IMPLEMENTATION_PLAN.md` | Ordered Part 2 plan, dependent on verified Part 1 behavior. |
| `03-submission-and-write-up/IMPLEMENTATION_PLAN.md` | Ordered Part 3 verification and submission plan. |
| `PROJECT_PROGRESS.md` | Factual record of steps that were implemented and verified; update immediately after each completed step. |

If a plan step conflicts with this file, update the plan before implementation. If this file conflicts with a changed external requirement, update this file first and record the requirement change in the progress tracker.
