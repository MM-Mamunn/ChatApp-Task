# Implemented API Documentation & Postman Testing Guide

Complete reference manual for all APIs implemented in the Chat Application across Steps 1.1–1.8. This document contains setup instructions, Postman environment configurations, request execution workflows, endpoint specifications, request/response examples, failure scenarios, and database impacts.

---

## Table of Contents

1. [Environment & Postman Setup](#1-environment--postman-setup)
2. [Test Accounts & Credentials](#2-test-accounts--credentials)
3. [Recommended Postman Execution Flow](#3-recommended-postman-execution-flow)
4. [System & Health Check](#4-system--health-check)
   - [GET /api/hello](#41-get-apihello)
5. [Authentication & Session Management](#5-authentication--session-management)
   - [POST /api/auth/register](#51-post-apiauthregister)
   - [POST /api/auth/login](#52-post-apiauthlogin)
   - [POST /api/auth/refresh](#53-post-apiauthrefresh)
   - [POST /api/auth/logout](#54-post-apiauthlogout)
   - [POST /api/auth/bootstrap-admin](#55-post-apiauthbootstrap-admin)
6. [User Discovery & Profile Management](#6-user-discovery--profile-management)
   - [GET /api/users/me](#61-get-apiusersme)
   - [PATCH /api/users/me](#62-patch-apiusersme)
   - [GET /api/users](#63-get-apiusers)
7. [Direct Conversations & Messages](#7-direct-conversations--messages)
   - [GET /api/conversations/direct](#71-get-apiconversationsdirect)
   - [POST /api/conversations/direct](#72-post-apiconversationsdirect)
   - [GET /api/conversations/direct/:userEmail/messages](#73-get-apiconversationsdirectuseremailmessages)
   - [POST /api/conversations/direct/:userEmail/messages](#74-post-apiconversationsdirectuseremailmessages)
8. [Group Channels & Messages](#8-group-channels--messages)
   - [GET /api/groups](#81-get-apigroups)
   - [POST /api/groups](#82-post-apigroups)
   - [GET /api/groups/:groupId/messages](#83-get-apigroupsgroupidmessages)
   - [POST /api/groups/:groupId/messages](#84-post-apigroupsgroupidmessages)
9. [Admin Oversight & Management](#9-admin-oversight--management)
   - [GET /api/admin/users](#91-get-apiadminusers)
   - [PATCH /api/admin/users/:userEmail/role](#92-patch-apiadminusersuseremailrole)
   - [PATCH /api/admin/users/:userEmail/status](#93-patch-apiadminusersuseremailstatus)
   - [GET /api/admin/activity](#94-get-apiadminactivity)
   - [GET /api/admin/conversations](#95-get-apiadminconversations)
   - [GET /api/admin/conversations/direct/:userA/:userB/messages](#96-get-apiadminconversationsdirectuserauserbmessages)

---

## 1. Environment & Postman Setup

### 1.1 Start the Local Server
From the project workspace:
```powershell
cd web
npm run dev
```
The server will boot at `http://localhost:3000`.

### 1.2 Create Postman Environment
In Postman, create an Environment named **`Chat App Dev`** and define these variables:

| Variable | Initial Value | Description |
|---|---|---|
| `baseUrl` | `http://localhost:3000` | Base URL for all endpoints |
| `accessToken` | *(leave empty)* | JWT token for standard user (Alex) |
| `adminAccessToken` | *(leave empty)* | JWT token for system admin |
| `groupId` | *(leave empty)* | UUID of created group channel |

### 1.3 Automatic Token Capture in Postman
Under the **Tests** tab of your Login requests in Postman, add this snippet to automatically update your environment variables:

**For User Login:**
```javascript
const res = pm.response.json();
if (res.data && res.data.access_token) {
    pm.environment.set("accessToken", res.data.access_token);
}
```

**For Admin Login:**
```javascript
const res = pm.response.json();
if (res.data && res.data.access_token) {
    pm.environment.set("adminAccessToken", res.data.access_token);
}
```

---

## 2. Test Accounts & Credentials

The seed script (`npm run db:seed`) provides authentic test accounts:

| Email | Password | Role | Description |
|---|---|---|---|
| `admin@example.com` | `AdminSecret123!` | `admin` | System Administrator |
| `alex@example.com` | `SecurePassword123!` | `user` | Regular User Alpha |
| `sam@example.com` | `SecurePassword123!` | `user` | Regular User Beta |

---

## 3. Recommended Postman Execution Flow

```text
 1. GET  /api/hello                                     (Verify backend connectivity)
 2. POST /api/auth/login [User Alex]                   (Saves {{accessToken}})
 3. POST /api/auth/login [Admin]                       (Saves {{adminAccessToken}})
 4. GET  /api/users/me                                 (Verify Alex's profile)
 5. PATCH /api/users/me                                (Update display name)
 6. GET  /api/users?query=sam                          (Search user with masked fields)
 7. POST /api/conversations/direct                     (Start 1-on-1 with Sam)
 8. POST /api/conversations/direct/sam@example.com/messages (Send direct message)
 9. GET  /api/conversations/direct/sam@example.com/messages  (Get message history)
10. GET  /api/conversations/direct                     (View direct conversations list)
11. POST /api/groups                                   (Create group; saves {{groupId}})
12. GET  /api/groups                                   (List joined groups)
13. POST /api/groups/{{groupId}}/messages              (Send message to group)
14. GET  /api/groups/{{groupId}}/messages              (Get group message history)
15. GET  /api/admin/users                              (Admin lists all users)
16. PATCH /api/admin/users/sam@example.com/role        (Admin changes user role)
17. PATCH /api/admin/users/sam@example.com/status      (Admin deactivates/reactivates)
18. GET  /api/admin/activity                           (Admin inspects audit logs)
19. GET  /api/admin/conversations                      (Admin global conversation overview)
20. GET  /api/admin/conversations/direct/.../messages  (Admin inspects DM history)
```

---

## 4. System & Health Check

### 4.1. `GET /api/hello`
- **Purpose:** Verifies backend connectivity and middleware pipeline.
- **Authentication:** Public.
- **Headers:** None.
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Hello World"
  }
  ```
- **Database Impact:** None (stateless).

---

## 5. Authentication & Session Management

### 5.1. `POST /api/auth/register`
- **Purpose:** Registers a new user account with bcrypt password hashing (cost 12).
- **Authentication:** Public.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "New User"
  }
  ```
- **Expected Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "newuser@example.com",
        "name": "New User",
        "avatar_url": null,
        "role": "user"
      },
      "access_token": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```
  *Sets HTTP-only cookie: `refresh_token` (Max-Age 7d, Path: `/api/auth`).*
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Password < 8 chars or invalid email format.
  - `409 CONFLICT`: Email address already registered.
- **Database Impact:**
  - Inserts 1 row into `users`.
  - Inserts 1 row into `refresh_tokens`.

---

### 5.2. `POST /api/auth/login`
- **Purpose:** Authenticates user and issues access token + refresh cookie.
- **Authentication:** Public.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "alex@example.com",
        "name": "Alex Morgan",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "user"
      },
      "access_token": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```
  *Sets HTTP-only cookie: `refresh_token`.*
- **Failure Cases:**
  - `401 UNAUTHORIZED`: Invalid email or password.
  - `403 FORBIDDEN`: Account deactivated by administrator.
- **Database Impact:**
  - Reads `users`.
  - Inserts 1 row into `refresh_tokens`.

---

### 5.3. `POST /api/auth/refresh`
- **Purpose:** Rotates refresh token and issues a new 15-minute access token.
- **Authentication:** HTTP-only cookie `refresh_token`.
- **Headers:** Handled automatically by Postman cookies.
- **Request Body:** None.
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```
- **Failure Cases:**
  - `401 UNAUTHORIZED`: Missing, revoked, or expired refresh token.
- **Database Impact:**
  - Reads & marks previous token `is_revoked = true` in `refresh_tokens`.
  - Inserts new rotated token into `refresh_tokens`.

---

### 5.4. `POST /api/auth/logout`
- **Purpose:** Revokes active refresh token and clears cookie.
- **Authentication:** Public / Authenticated with refresh cookie.
- **Headers:** None.
- **Request Body:** None.
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
  *Clears `refresh_token` cookie (`Max-Age=0`).*
- **Database Impact:**
  - Updates matching token in `refresh_tokens` to `is_revoked = true`.

---

### 5.5. `POST /api/auth/bootstrap-admin`
- **Purpose:** One-time initial system admin creation. Blocked once an admin exists.
- **Authentication:** Protected by header secret.
- **Headers:**
  - `Content-Type: application/json`
  - `X-Bootstrap-Secret: Boot$trapSecret123!`
- **Request Body:**
  ```json
  {
    "email": "master_admin@example.com",
    "password": "MasterAdminPass123!",
    "name": "Master Admin"
  }
  ```
- **Expected Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "master_admin@example.com",
        "name": "Master Admin",
        "role": "admin"
      }
    }
  }
  ```
- **Failure Cases:**
  - `401 UNAUTHORIZED`: Missing or incorrect `X-Bootstrap-Secret`.
  - `403 FORBIDDEN`: An administrator already exists in the system.
- **Database Impact:**
  - Inserts 1 row into `users` with `role: "admin"`.

---

## 6. User Discovery & Profile Management

### 6.1. `GET /api/users/me`
- **Purpose:** Retrieves authenticated caller's own profile and role.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "alex@example.com",
        "name": "Alex Morgan",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "user",
        "is_active": true,
        "created_at": "2026-10-11T12:00:00.000Z"
      }
    }
  }
  ```
- **Failure Cases:**
  - `401 UNAUTHORIZED`: Missing or expired access token.
- **Database Impact:** Reads `users`.

---

### 6.2. `PATCH /api/users/me`
- **Purpose:** Updates current user's display name or avatar URL. Self-promotion (`role`) is ignored.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Alex M. Updated",
    "avatar_url": "https://images.example.com/alex-avatar.png"
  }
  ```
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "alex@example.com",
        "name": "Alex M. Updated",
        "avatar_url": "https://images.example.com/alex-avatar.png",
        "role": "user",
        "is_active": true,
        "created_at": "2026-10-11T12:00:00.000Z"
      }
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Empty name or invalid avatar URL format.
- **Database Impact:** Updates `users` row matching caller's email.

---

### 6.3. `GET /api/users`
- **Purpose:** Searches users by name or email. Returns privacy-masked fields for standard users.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Query Parameters:**
  - `query`: `sam` (min 1 char)
  - `limit`: `10` (optional, default 10, max 20)
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Expected Success for Regular User (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "email": "sam@example.com",
        "name": "Sam Rivera",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      }
    ]
  }
  ```
  *(Note: `role`, `is_active`, and `created_at` are stripped for standard users).*
- **Database Impact:** Reads `users`.

---

## 7. Direct Conversations & Messages

### 7.1. `GET /api/conversations/direct`
- **Purpose:** Lists all 1-on-1 conversations for the authenticated user, sorted by most recent message.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "other_user": {
          "email": "sam@example.com",
          "name": "Sam Rivera",
          "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
        },
        "last_message": {
          "message": "Hey Sam, reviewing the designs now!",
          "created_at": "2026-10-11T13:30:00.000Z",
          "sender_email": "alex@example.com"
        }
      }
    ]
  }
  ```
- **Database Impact:** Reads `direct_messages` and `users`.

---

### 7.2. `POST /api/conversations/direct`
- **Purpose:** Initiates a direct conversation with a recipient. Returns existing conversation if already active. Duplicate-safe.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "recipient_email": "sam@example.com"
  }
  ```
- **Expected Success (200 OK or 201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "other_user": {
        "email": "sam@example.com",
        "name": "Sam Rivera",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      },
      "is_new": false
    }
  }
  ```
- **Failure Cases:**
  - `400 BAD_REQUEST`: Recipient email matches caller's email (cannot chat with self).
  - `404 NOT_FOUND`: Recipient email does not exist in `users`.
- **Database Impact:** Reads `users` and `direct_messages`.

---

### 7.3. `GET /api/conversations/direct/:userEmail/messages`
- **Purpose:** Retrieves paginated message history with a recipient (newest first).
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Query Parameters:**
  - `limit`: `20` (default 20, max 50)
  - `before`: `2026-10-11T13:30:00.000Z` (optional cursor timestamp)
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "3b29c9df-8b20-410a-9e5c-cb3c9e6bb078",
        "sender_email": "alex@example.com",
        "receiver_email": "sam@example.com",
        "message": "Hey Sam, reviewing the designs now!",
        "created_at": "2026-10-11T13:30:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```
- **Failure Cases:**
  - `404 NOT_FOUND`: Recipient email does not exist.
- **Database Impact:** Reads `direct_messages`.

---

### 7.4. `POST /api/conversations/direct/:userEmail/messages`
- **Purpose:** Sends a direct message to the specified recipient.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "message": "Hey Sam, reviewing the designs now!"
  }
  ```
- **Expected Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "3b29c9df-8b20-410a-9e5c-cb3c9e6bb078",
      "sender_email": "alex@example.com",
      "receiver_email": "sam@example.com",
      "message": "Hey Sam, reviewing the designs now!",
      "created_at": "2026-10-11T13:30:00.000Z"
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Empty or whitespace-only message string.
  - `400 BAD_REQUEST`: Cannot send message to oneself.
  - `403 FORBIDDEN`: Recipient account is deactivated.
  - `404 NOT_FOUND`: Recipient does not exist.
- **Database Impact:**
  - Inserts 1 row into `direct_messages`.

---

## 8. Group Channels & Messages

### 8.1. `GET /api/groups`
- **Purpose:** Lists all group channels the authenticated user is currently a member of.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
        "name": "Product Launch Team",
        "creator_email": "alex@example.com",
        "member_count": 2,
        "created_at": "2026-10-11T13:35:00.000Z"
      }
    ]
  }
  ```
- **Database Impact:** Reads `group_members` and `groups`.

---

### 8.2. `POST /api/groups`
- **Purpose:** Creates a named group conversation. Creator is automatically enrolled as a member.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Product Launch Team",
    "participant_emails": ["sam@example.com"]
  }
  ```
- **Expected Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
      "name": "Product Launch Team",
      "creator_email": "alex@example.com",
      "participants": ["alex@example.com", "sam@example.com"],
      "created_at": "2026-10-11T13:35:00.000Z"
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Empty group name or non-existent participant email.
- **Database Impact:**
  - Inserts 1 row into `groups`.
  - Inserts $N$ rows into `group_members` (creator + participants).
  - Inserts 1 row into `activity_logs` (`action: "GROUP_CREATE"`).

---

### 8.3. `GET /api/groups/:groupId/messages`
- **Purpose:** Retrieves paginated group message history. Caller must be an active group member (or admin).
- **Authentication:** Bearer token required (`{{accessToken}}` or `{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
- **Query Parameters:**
  - `limit`: `20` (default 20, max 50)
  - `before`: `2026-10-11T13:36:00.000Z` (optional cursor timestamp)
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
        "sender_email": "alex@example.com",
        "message": "Welcome team to the launch channel!",
        "created_at": "2026-10-11T13:36:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```
- **Failure Cases:**
  - `403 FORBIDDEN`: Non-member regular user attempts to read messages.
  - `404 NOT_FOUND`: Group ID does not exist.
- **Database Impact:** Reads `groups`, `group_members`, and `group_chat_messages`.

---

### 8.4. `POST /api/groups/:groupId/messages`
- **Purpose:** Sends a message to a group channel. Caller must be a member of the group.
- **Authentication:** Bearer token required (`{{accessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "message": "Welcome team to the launch channel!"
  }
  ```
- **Expected Success (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
      "sender_email": "alex@example.com",
      "message": "Welcome team to the launch channel!",
      "created_at": "2026-10-11T13:36:00.000Z"
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Empty or whitespace-only message string.
  - `403 FORBIDDEN`: Caller is not a member of the group.
  - `404 NOT_FOUND`: Group does not exist.
- **Database Impact:**
  - Inserts 1 row into `group_chat_messages`.

---

## 9. Admin Oversight & Management

All endpoints in this section require `role: "admin"` and write an audit event to `activity_logs`.

### 9.1. `GET /api/admin/users`
- **Purpose:** Lists all registered users with complete administrative metadata and active states.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "email": "admin@example.com",
        "name": "System Administrator",
        "avatar_url": null,
        "role": "admin",
        "is_active": true,
        "created_at": "2026-10-11T12:00:00.000Z"
      },
      {
        "email": "alex@example.com",
        "name": "Alex Morgan",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "user",
        "is_active": true,
        "created_at": "2026-10-11T12:00:00.000Z"
      }
    ]
  }
  ```
- **Failure Cases:**
  - `403 FORBIDDEN`: Standard user token (`{{accessToken}}`) used $\rightarrow$ `"Admin privileges required"`.
- **Database Impact:** Reads `users`.

---

### 9.2. `PATCH /api/admin/users/:userEmail/role`
- **Purpose:** Promotes or demotes a user's role. Changes take effect immediately.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "role": "admin"
  }
  ```
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "sam@example.com",
        "role": "admin"
      }
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: Role must be either `"user"` or `"admin"`.
  - `404 NOT_FOUND`: Target user does not exist.
- **Database Impact:**
  - Updates `role` in `users`.
  - Inserts 1 row into `activity_logs` (`action: "ROLE_CHANGE"`).

---

### 9.3. `PATCH /api/admin/users/:userEmail/status`
- **Purpose:** Activates or deactivates a user account. Deactivation immediately revokes all active refresh tokens.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "is_active": false
  }
  ```
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "email": "sam@example.com",
        "is_active": false
      }
    }
  }
  ```
- **Failure Cases:**
  - `400 VALIDATION_ERROR`: `is_active` must be boolean.
  - `404 NOT_FOUND`: Target user does not exist.
- **Database Impact:**
  - Updates `is_active` in `users`.
  - Updates matching rows in `refresh_tokens` to `is_revoked = true`.
  - Inserts 1 row into `activity_logs` (`action: "USER_STATUS_CHANGE"`).

---

### 9.4. `GET /api/admin/activity`
- **Purpose:** Fetches cursor-paginated audit trail of all administrative actions.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
- **Query Parameters:**
  - `limit`: `20` (default 50, max 100)
  - `before`: `2026-10-11T13:40:00.000Z` (optional cursor timestamp)
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "activities": [
        {
          "id": "7864f1bc-8ec3-44b2-9657-4180436cefa1",
          "actor_email": "admin@example.com",
          "action": "USER_STATUS_CHANGE",
          "target_type": "user",
          "target_id": "sam@example.com",
          "details": {
            "previous_status": true,
            "new_status": false
          },
          "created_at": "2026-10-11T13:40:00.000Z"
        }
      ],
      "pagination": {
        "limit": 20,
        "has_more": false,
        "next_cursor": null
      }
    }
  }
  ```
- **Database Impact:** Reads `activity_logs`.

---

### 9.5. `GET /api/admin/conversations`
- **Purpose:** Aggregates a platform-wide overview of all active direct conversations and group channels.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "direct_conversations": [
        {
          "user_a": "alex@example.com",
          "user_b": "sam@example.com",
          "total_messages": 3,
          "last_activity": "2026-10-11T13:30:00.000Z"
        }
      ],
      "groups": [
        {
          "group_id": "84c8a291-7f89-498c-b03a-330fe53f7f50",
          "name": "Product Launch Team",
          "creator_email": "alex@example.com",
          "member_count": 2,
          "last_activity": "2026-10-11T13:36:00.000Z"
        }
      ]
    }
  }
  ```
- **Database Impact:** Reads `direct_messages`, `groups`, `group_members`, and `group_chat_messages`.

---

### 9.6. `GET /api/admin/conversations/direct/:userA/:userB/messages`
- **Purpose:** Read-only inspection of message history between any two users for moderation purposes. Automatically generates an audit trail event.
- **Authentication:** Bearer token with admin role required (`{{adminAccessToken}}`).
- **Headers:**
  - `Authorization: Bearer {{adminAccessToken}}`
- **Query Parameters:**
  - `limit`: `20` (default 20, max 50)
  - `before`: `2026-10-11T13:30:00.000Z` (optional cursor timestamp)
- **Expected Success (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "3b29c9df-8b20-410a-9e5c-cb3c9e6bb078",
        "sender_email": "alex@example.com",
        "receiver_email": "sam@example.com",
        "message": "Hey Sam, reviewing the designs now!",
        "created_at": "2026-10-11T13:30:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "has_more": false,
      "next_cursor": null
    }
  }
  ```
- **Database Impact:**
  - Reads `direct_messages`.
  - Inserts 1 row into `activity_logs` (`action: "ADMIN_VIEW_CONVERSATION"`).
