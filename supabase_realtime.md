# Supabase Realtime in Secure Realtime Chat Application

This document provides a comprehensive, project-specific explanation of how **Supabase Realtime** is implemented, secured, and operated in this application.

---

## A. What Supabase Realtime Does

In a traditional web application, when User A sends a message to User B, User B does not see the new message until they manually refresh their web page or the browser repeatedly polls the server on a timer (e.g., asking "any new messages?" every 3 seconds). Repeated polling wastes server resources, exhausts database connections, and creates unnecessary network traffic.

**Supabase Realtime** solves this by maintaining a lightweight, persistent WebSocket connection between the browser and the Supabase Realtime cluster. Whenever an authorized message is inserted into PostgreSQL, Supabase listens to the database's Write-Ahead Log (WAL) and instantly broadcasts the newly inserted message to listening clients over WebSockets in milliseconds.

In this project, Supabase Realtime delivers:
1. **Instant message delivery**: Incoming 1-on-1 direct messages and group channel messages appear immediately in the chat thread with smooth Framer Motion animations.
2. **Live sidebar updates**: When a message is sent or received, conversation previews and "last active" timestamps in the sidebar update immediately without manual page refreshes or background polling intervals.
3. **Zero polling overhead**: Eliminates periodic `setInterval` polling, conserving network bandwidth and database connections.

---

## B. How It Works in This Project

In this application, message writing and realtime event delivery are cleanly separated:

### End-to-End Data Flow

```text
[ User Types Message & Clicks Send ]
                │
                ▼
1. HTTP POST Request (Next.js Route Handler /api)
   - Validates JWT session (Authorization: Bearer <token>)
   - Checks membership & permissions (caller must be member/participant)
   - Validates message body (non-empty, non-whitespace, max 4000 chars)
                │
                ▼
2. PostgreSQL Database Insertion via Drizzle ORM
   - Backend service inserts row into `direct_messages` or `group_chat_messages`
   - Database commits transaction and writes to the Write-Ahead Log (WAL)
                │
                ▼
3. Supabase Realtime Engine (WAL Change Capture)
   - Supabase replication slot captures INSERT event from `supabase_realtime` publication
   - Formats payload containing the new row fields
                │
                ▼
4. WebSocket Broadcast to Connected Clients
   - Broadcasts event to subscribers listening on the relevant channel
                │
                ▼
5. Client-Side Idempotent Handling (React State Update)
   - Client verifies the message belongs to active conversation
   - Checks message ID to prevent duplicate rendering
   - Smoothly appends message to thread and auto-scrolls to latest message
```

> **Key Distinction:** Clients **never write directly to Supabase via the client library**. All creations and mutations flow through our protected Next.js App Router API (`/api`), ensuring strict authentication, input validation, and audit logging. Supabase Realtime is strictly used as a **downstream event transport**.

---

## C. Architecture and File Responsibilities

### File & Directory Map

```text
/
├── supabase_realtime.md                  # This documentation file
├── web/
│   ├── .env                              # Environment variables (DATABASE_URL, SUPABASE_URL, ANON_KEY)
│   ├── package.json                      # @supabase/supabase-js dependency & npm test:realtime script
│   ├── api/
│   │   ├── database/
│   │   │   ├── client.ts                 # PostgreSQL singleton (postgres + Drizzle ORM)
│   │   │   ├── schema/
│   │   │   │   └── messages.ts           # Drizzle schema (directMessages, groupChatMessages)
│   │   │   └── migrations/
│   │   │       └── 0002_realtime_setup.sql # Realtime publication & replica identity migration
│   │   ├── services/
│   │   │   └── chat.service.ts           # Inserts messages & returns IDs
│   │   └── test/
│   │       └── realtime.test.ts          # Automated verification script for Realtime subscriptions
│   ├── lib/
│   │   ├── env/
│   │   │   └── public.ts                 # Exposes NEXT_PUBLIC_SUPABASE_URL & ANON_KEY
│   │   └── supabase-client.ts           # Browser-side Supabase client singleton for Realtime
│   └── components/
│       └── chat/
│           ├── chat-pane.tsx             # Active thread subscription & message list appending
│           └── chat-shell.tsx            # Inbox subscription for live sidebar conversation previews
```

### Module Responsibilities

1. **[`web/lib/supabase-client.ts`](file:///c:/Users/USER/Desktop/Task/web/lib/supabase-client.ts)**
   - Exports `getSupabaseClient()` singleton.
   - Initializes `@supabase/supabase-js` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Configured with `persistSession: false` and `autoRefreshToken: false` because auth sessions are handled by our own JWT cookie engine.

2. **[`web/components/chat/chat-pane.tsx`](file:///c:/Users/USER/Desktop/Task/web/components/chat/chat-pane.tsx)**
   - Manages active conversation message display and composer.
   - When viewing a direct chat, subscribes to `direct_messages` filtered to the active conversation pair.
   - When viewing a group channel, subscribes to `group_chat_messages` with filter `group_id=eq.<activeGroupId>`.
   - Unsubscribes and cleans up channels automatically when switching targets or leaving the chat.
   - Performs idempotent deduplication by message `id`.

3. **[`web/components/chat/chat-shell.tsx`](file:///c:/Users/USER/Desktop/Task/web/components/chat/chat-shell.tsx)**
   - Manages global chat shell layout and conversation lists.
   - Subscribes to direct messages sent to the current user's email (`receiver_email=eq.<userEmail>`) and group messages.
   - When an event occurs, triggers `refreshConversations()` to update sidebar snippets, unread badges, and sorting without any timer polling.

4. **[`web/api/test/realtime.test.ts`](file:///c:/Users/USER/Desktop/Task/web/api/test/realtime.test.ts)**
   - Automated end-to-end integration test that connects via WebSocket, inserts records via SQL, and confirms delivery of both direct and group messages within 5 seconds.

---

## D. Database and Configuration Requirements

### 1. Database Publication & Table Setup
In Supabase PostgreSQL, tables must be explicitly published to `supabase_realtime` and have `REPLICA IDENTITY FULL` configured:

```sql
-- 1. Ensure primary key exists on group_chat_messages for logical replication
ALTER TABLE "group_chat_messages" ADD COLUMN IF NOT EXISTS "id" uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- 2. Configure full replica identity to publish full row payloads
ALTER TABLE "direct_messages" REPLICA IDENTITY FULL;
ALTER TABLE "group_chat_messages" REPLICA IDENTITY FULL;

-- 3. Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;
```

These statements are tracked in migration [`0002_realtime_setup.sql`](file:///c:/Users/USER/Desktop/Task/web/api/database/migrations/0002_realtime_setup.sql).

### 2. Environment Variables

| Variable | Scope | Description | Safe in Browser? |
|---|---|---|---|
| `DATABASE_URL` | Server-only (`.env`) | Transaction pooler connection string for Drizzle ORM | ❌ **NEVER** expose |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | The public Supabase project HTTPS URL (`https://<id>.supabase.co`) | ✅ Safe for client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | The public publishable/anon key used by `@supabase/supabase-js` | ✅ Safe for client bundle |
| `JWT_ACCESS_SECRET` | Server-only (`.env`) | Secret used to sign short-lived access tokens | ❌ **NEVER** expose |
| `JWT_REFRESH_SECRET` | Server-only (`.env`) | Secret used to sign refresh tokens | ❌ **NEVER** expose |

---

## E. Group and Direct Messaging Realtime Mechanics

### Direct Messaging (1-on-1)
1. **Channel Naming:** Deterministic pair-based name: `chat-direct-<email1>--<email2>`.
2. **Event Filter:** Listens to `INSERT` on table `direct_messages`.
3. **Client-Side Pair Verification:**
   ```ts
   const belongsToPair =
     (sender === otherEmail && receiver === currentEmail) ||
     (sender === currentEmail && receiver === otherEmail);
   ```
   Ensures that even if messages between other parties exist, the active thread only processes messages belonging to the current conversation.

### Group Messaging
1. **Channel Naming:** Group-scoped name: `chat-group-<groupId>`.
2. **Event Filter:** Subscribes with SQL filter `group_id=eq.<groupId>` on table `group_chat_messages`.
3. **Payload Inspection:**
   When an insert occurs, the Supabase server evaluates the filter and pushes the new row:
   ```json
   {
     "id": "c8f2ca72-33e3-41aa-8638-c7988d1e4c28",
     "group_id": "00000000-0000-0000-0000-000000000001",
     "sender_email": "alice@chat.local",
     "message": "Hello everyone!",
     "created_at": "2026-10-11T16:24:38.221Z"
   }
   ```

---

## F. Authentication and Security

### Why Publishable Anon Keys Alone Are Not Authorization
In Supabase, the publishable `anon` key is designed to be public in browser bundles. It identifies the client application to Supabase's API gateway. It does **not** grant administrative privileges.

### How Our App Protects Data
1. **All Writes Are Protected by Next.js Backend:**
   - Clients cannot insert directly to PostgreSQL via the anon key.
   - Any message creation requires an HTTP `POST` to `/api/conversations/direct/...` or `/api/groups/...`.
   - The route handler executes `withAuth` and verifies the caller's JWT token, validates that the caller is an active user, checks membership, and rejects unauthorized senders with `401 Unauthorized` or `403 Forbidden`.
2. **Access Scoping:**
   - Initial message histories are fetched through authenticated Next.js endpoints where group membership and conversation participant checks are strictly enforced before returning rows.
   - The browser Realtime listeners match against the current authenticated user's email and active group ID.

---

## G. Message Lifecycle and Error Handling

1. **Initial History Fetching:**
   - When a conversation is opened, `loadMessages()` fetches the initial history (up to 25 messages) via the Next.js API.
   - The Realtime subscription is established concurrently to capture any messages that arrive while the conversation is open.
2. **Idempotent Deduplication:**
   - When User A sends a message:
     - The HTTP `POST` succeeds, returning the created message object with its `id`.
     - User A's UI appends the message immediately to state.
     - Moments later, the Supabase Realtime `INSERT` event arrives.
     - The callback checks `prev.some(m => m.id === row.id)`. Since it already exists, the event is safely ignored without duplicate bubbles or UI jumps.
3. **Subscription Cleanup:**
   - In React's `useEffect` cleanup return function, `supabase.removeChannel(channel)` is always called when:
     - The user selects a different conversation.
     - The user navigates away or logs out.
     - The component unmounts.
   - This prevents memory leaks and stale event listeners.
4. **Auto-Scroll Behavior:**
   - If the user is reading earlier message history (scrolled up > 120px), incoming messages do not jerk the viewport.
   - A floating **"Latest messages"** button appears, letting the user scroll down when ready.
   - If the user is already near the bottom, the viewport scrolls smoothly to the new message.

---

## H. Setup and Testing

### Testing in the Terminal
Run the dedicated Realtime integration test script:
```bash
cd web
npm run test:realtime
```
This test:
1. Connects to `NEXT_PUBLIC_SUPABASE_URL` via `@supabase/supabase-js`.
2. Subscribes to `direct_messages` and `group_chat_messages` channels.
3. Inserts test messages into PostgreSQL using direct SQL.
4. Confirms that WebSocket events arrive with matching message contents.
5. Cleans up test records and closes channels.

### Manual Testing with Two Browser Windows
1. Open Window 1 (e.g. Chrome) and log in as `alice@chat.local` (password: `Password123!`).
2. Open Window 2 (e.g. Chrome Incognito or Firefox) and log in as `bob@chat.local` (password: `Password123!`).
3. In Window 1, select the direct conversation with `bob@chat.local` or join the **Frontend Team** group.
4. In Window 2, open the same conversation or group.
5. In Window 1, type a message and press **Enter**.
6. **Observation:** The message appears in Window 2 **immediately without refreshing the page**.
7. The sidebar conversation snippet and timestamp in Window 2 update live as well.

---

## I. Current Limitations

1. **Presence & Typing Indicators:** Typing indicators ("Alice is typing...") and online/offline presence tracking are not yet implemented (scheduled for future enhancement).
2. **Reconnection Backoff:** If the user experiences an extended network outage, `@supabase/supabase-js` attempts automatic reconnection; if reconnection occurs after a gap, messages sent during the offline period are retrieved when switching conversations or refreshing.
3. **Database Publication Requirement:** Newly created PostgreSQL tables require `ALTER PUBLICATION supabase_realtime ADD TABLE <tablename>;` in migrations for Realtime to monitor them.
