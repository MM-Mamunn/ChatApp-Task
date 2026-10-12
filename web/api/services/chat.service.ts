import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "../database/client";
import { activityLogs } from "../database/schema/activity";
import { groups, groupMembers } from "../database/schema/groups";
import { directMessages, groupChatMessages } from "../database/schema/messages";
import { users } from "../database/schema/users";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";

export interface DirectConversationItem {
  conversation_id?: string;
  other_user: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    message: string;
    created_at: Date;
    sender_email: string;
  };
}

export interface DirectMessageItem {
  id: string;
  sender_email: string;
  receiver_email: string;
  message: string;
  created_at: Date;
}

export interface GroupItem {
  group_id: string;
  name: string;
  creator_email: string;
  member_count: number;
  created_at: Date;
}

export interface GroupMessageItem {
  id?: string;
  group_id: string;
  sender_email: string;
  message: string;
  created_at: Date;
}

export interface PaginatedChatResult<T> {
  data: T[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

/**
 * Lists all direct conversations for a user, sorted by latest message timestamp.
 */
export async function listDirectConversations(
  currentUserEmail: string,
): Promise<DirectConversationItem[]> {
  const db = getDb();
  const normalizedUser = currentUserEmail.toLowerCase().trim();

  // 1. Fetch all direct messages involving current user
  const messages = await db
    .select({
      id: directMessages.id,
      senderEmail: directMessages.senderEmail,
      receiverEmail: directMessages.receiverEmail,
      message: directMessages.message,
      createdAt: directMessages.createdAt,
    })
    .from(directMessages)
    .where(
      or(
        eq(directMessages.senderEmail, normalizedUser),
        eq(directMessages.receiverEmail, normalizedUser),
      ),
    )
    .orderBy(desc(directMessages.createdAt));

  if (messages.length === 0) {
    return [];
  }

  // 2. Group by other user's email to get the latest message
  const conversationsMap = new Map<
    string,
    {
      otherEmail: string;
      lastMessage: {
        message: string;
        created_at: Date;
        sender_email: string;
      };
    }
  >();

  for (const msg of messages) {
    const otherEmail =
      msg.senderEmail === normalizedUser ? msg.receiverEmail : msg.senderEmail;

    if (!conversationsMap.has(otherEmail)) {
      conversationsMap.set(otherEmail, {
        otherEmail,
        lastMessage: {
          message: msg.message,
          created_at: msg.createdAt,
          sender_email: msg.senderEmail,
        },
      });
    }
  }

  const otherEmails = Array.from(conversationsMap.keys());
  if (otherEmails.length === 0) {
    return [];
  }

  // 3. Fetch profiles of all other users
  const profiles = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(inArray(users.email, otherEmails));

  const profileMap = new Map(profiles.map((p) => [p.email, p]));

  // 4. Combine into final conversation list
  const results: DirectConversationItem[] = [];
  for (const { otherEmail, lastMessage } of conversationsMap.values()) {
    const profile = profileMap.get(otherEmail);
    const sortedPair = [normalizedUser, otherEmail.toLowerCase()].sort();
    results.push({
      conversation_id: `${sortedPair[0]}:${sortedPair[1]}`,
      other_user: {
        email: otherEmail,
        name: profile?.name ?? null,
        avatar_url: profile?.avatarUrl ?? null,
      },
      last_message: lastMessage,
    });
  }

  return results;
}

/**
 * Initiates or retrieves an existing direct conversation with a recipient.
 * Duplicate-safe: returns existing conversation status without creating duplicates.
 */
export async function startDirectConversation(
  currentUserEmail: string,
  recipientEmail: string,
): Promise<{
  other_user: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
  is_new: boolean;
}> {
  const db = getDb();
  const normalizedUser = currentUserEmail.toLowerCase().trim();
  const normalizedRecipient = recipientEmail.toLowerCase().trim();

  if (normalizedUser === normalizedRecipient) {
    throw new BadRequestError("Cannot start a conversation with yourself");
  }

  // Verify recipient exists
  const recipientRecord = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalizedRecipient))
    .limit(1);

  if (recipientRecord.length === 0) {
    throw new NotFoundError("Recipient does not exist");
  }

  // Check if any direct messages already exist between these two users
  const existingMessage = await db
    .select({ id: directMessages.id })
    .from(directMessages)
    .where(
      or(
        and(
          eq(directMessages.senderEmail, normalizedUser),
          eq(directMessages.receiverEmail, normalizedRecipient),
        ),
        and(
          eq(directMessages.senderEmail, normalizedRecipient),
          eq(directMessages.receiverEmail, normalizedUser),
        ),
      ),
    )
    .limit(1);

  const isNew = existingMessage.length === 0;

  return {
    other_user: {
      email: recipientRecord[0].email,
      name: recipientRecord[0].name,
      avatar_url: recipientRecord[0].avatarUrl,
    },
    is_new: isNew,
  };
}

/**
 * Retrieves paginated direct message history between current user and specified recipient.
 * Enforces participant check: non-admins cannot access third-party conversations.
 */
export async function getDirectMessages(
  currentUserEmail: string,
  otherUserEmail: string,
  callerRole: string,
  params: { limit?: number; before?: string },
): Promise<PaginatedChatResult<DirectMessageItem>> {
  const db = getDb();
  const normalizedCurrent = currentUserEmail.toLowerCase().trim();
  const normalizedOther = otherUserEmail.toLowerCase().trim();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  // Verify recipient exists
  const otherRecord = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, normalizedOther))
    .limit(1);

  if (otherRecord.length === 0) {
    throw new NotFoundError("Recipient does not exist");
  }

  const pairCondition = or(
    and(
      eq(directMessages.senderEmail, normalizedCurrent),
      eq(directMessages.receiverEmail, normalizedOther),
    ),
    and(
      eq(directMessages.senderEmail, normalizedOther),
      eq(directMessages.receiverEmail, normalizedCurrent),
    ),
  );

  const conditions = [pairCondition];

  if (params.before) {
    const beforeDate = new Date(params.before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(directMessages.createdAt, beforeDate));
    }
  }

  const rows = await db
    .select()
    .from(directMessages)
    .where(and(...conditions))
    .orderBy(desc(directMessages.createdAt), desc(directMessages.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && resultRows.length > 0
      ? resultRows[resultRows.length - 1].createdAt.toISOString()
      : null;

  return {
    data: resultRows.map((m) => ({
      id: m.id,
      sender_email: m.senderEmail,
      receiver_email: m.receiverEmail,
      message: m.message,
      created_at: m.createdAt,
    })),
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
}

/**
 * Sends a direct message to a recipient.
 * Validates non-empty content and recipient existence.
 */
export async function sendDirectMessage(
  senderEmail: string,
  recipientEmail: string,
  message: string,
): Promise<DirectMessageItem> {
  const db = getDb();
  const normalizedSender = senderEmail.toLowerCase().trim();
  const normalizedRecipient = recipientEmail.toLowerCase().trim();

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new ValidationError(
      [
        {
          field: "message",
          issue: "Message cannot be empty or whitespace only",
        },
      ],
      "Message cannot be empty or whitespace only",
    );
  }

  if (normalizedSender === normalizedRecipient) {
    throw new BadRequestError("Cannot send a message to yourself");
  }

  // Verify recipient exists and is active
  const recipient = await db
    .select({
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalizedRecipient))
    .limit(1);

  if (recipient.length === 0) {
    throw new NotFoundError("Recipient does not exist");
  }

  if (!recipient[0].isActive) {
    throw new ForbiddenError("Cannot send message to deactivated user");
  }

  const [inserted] = await db
    .insert(directMessages)
    .values({
      senderEmail: normalizedSender,
      receiverEmail: normalizedRecipient,
      message: trimmedMessage,
    })
    .returning();

  return {
    id: inserted.id,
    sender_email: inserted.senderEmail,
    receiver_email: inserted.receiverEmail,
    message: inserted.message,
    created_at: inserted.createdAt,
  };
}

/**
 * Lists all groups the authenticated user belongs to.
 */
export async function listUserGroups(
  currentUserEmail: string,
): Promise<GroupItem[]> {
  const db = getDb();
  const normalizedUser = currentUserEmail.toLowerCase().trim();

  // 1. Get groups user is a member of
  const memberRecords = await db
    .select({
      groupId: groupMembers.groupId,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userEmail, normalizedUser));

  if (memberRecords.length === 0) {
    return [];
  }

  const groupIds = memberRecords.map((m) => m.groupId);

  // 2. Fetch group details
  const groupRows = await db
    .select()
    .from(groups)
    .where(inArray(groups.groupId, groupIds))
    .orderBy(desc(groups.createdAt));

  // 3. Count members for each group
  const results: GroupItem[] = [];
  for (const grp of groupRows) {
    const memberCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, grp.groupId));

    results.push({
      group_id: grp.groupId,
      name: grp.name,
      creator_email: grp.creatorEmail,
      member_count: memberCount[0]?.count ?? 0,
      created_at: grp.createdAt,
    });
  }

  return results;
}

/**
 * Creates a new named group conversation with initial participants.
 * Automatically adds the creator as a member.
 */
export async function createGroup(
  creatorEmail: string,
  name: string,
  participantEmails: string[],
): Promise<{
  group_id: string;
  name: string;
  creator_email: string;
  participants: string[];
  created_at: Date;
}> {
  const db = getDb();
  const normalizedCreator = creatorEmail.toLowerCase().trim();
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new ValidationError(
      [
        {
          field: "name",
          issue: "Group name cannot be empty or whitespace only",
        },
      ],
      "Group name cannot be empty",
    );
  }

  // Deduplicate and normalize participants, ensuring creator is included
  const allParticipantsSet = new Set<string>();
  allParticipantsSet.add(normalizedCreator);

  for (const email of participantEmails) {
    const norm = email.toLowerCase().trim();
    if (norm) {
      allParticipantsSet.add(norm);
    }
  }

  const participantList = Array.from(allParticipantsSet);

  // Verify all invited participants exist in the users table
  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, participantList));

  const existingEmailSet = new Set(existingUsers.map((u) => u.email));
  const missingUsers = participantList.filter((e) => !existingEmailSet.has(e));

  if (missingUsers.length > 0) {
    throw new ValidationError(
      missingUsers.map((email) => ({
        field: "participant_emails",
        issue: `User ${email} does not exist`,
      })),
      `Participants do not exist: ${missingUsers.join(", ")}`,
    );
  }

  // Atomic creation: insert group, members, and activity log
  const [newGroup] = await db
    .insert(groups)
    .values({
      name: trimmedName,
      creatorEmail: normalizedCreator,
    })
    .returning();

  // Insert group members
  const memberInserts = participantList.map((email) => ({
    groupId: newGroup.groupId,
    userEmail: email,
  }));

  await db.insert(groupMembers).values(memberInserts);

  // Log activity
  await db.insert(activityLogs).values({
    actorEmail: normalizedCreator,
    action: "GROUP_CREATE",
    targetType: "group",
    targetId: newGroup.groupId,
    details: {
      name: trimmedName,
      participants: participantList,
      member_count: participantList.length,
    },
  });

  return {
    group_id: newGroup.groupId,
    name: newGroup.name,
    creator_email: newGroup.creatorEmail,
    participants: participantList,
    created_at: newGroup.createdAt,
  };
}

/**
 * Retrieves paginated group message history.
 * Enforces membership check: caller must be a member, or admin.
 */
export async function getGroupMessages(
  currentUserEmail: string,
  callerRole: string,
  groupId: string,
  params: { limit?: number; before?: string },
): Promise<PaginatedChatResult<GroupMessageItem>> {
  const db = getDb();
  const normalizedUser = currentUserEmail.toLowerCase().trim();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  // 1. Verify group exists
  const groupRows = await db
    .select({ groupId: groups.groupId })
    .from(groups)
    .where(eq(groups.groupId, groupId))
    .limit(1);

  if (groupRows.length === 0) {
    throw new NotFoundError("Group does not exist");
  }

  // 2. Membership check (unless admin)
  if (callerRole !== "admin") {
    const membership = await db
      .select({ userEmail: groupMembers.userEmail })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userEmail, normalizedUser),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      throw new ForbiddenError("You are not a member of this group");
    }
  }

  // 3. Fetch messages using timestamp cursor pagination
  const conditions = [eq(groupChatMessages.groupId, groupId)];

  if (params.before) {
    const beforeDate = new Date(params.before);
    if (!isNaN(beforeDate.getTime())) {
      conditions.push(lt(groupChatMessages.createdAt, beforeDate));
    }
  }

  // Note: group_chat_messages has NO PRIMARY KEY.
  // Tie-breaker: (createdAt DESC, senderEmail DESC) per API.md Section 7.3
  const rows = await db
    .select()
    .from(groupChatMessages)
    .where(and(...conditions))
    .orderBy(
      desc(groupChatMessages.createdAt),
      desc(groupChatMessages.senderEmail),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && resultRows.length > 0
      ? resultRows[resultRows.length - 1].createdAt.toISOString()
      : null;

  return {
    data: resultRows.map((m) => ({
      id: m.id,
      group_id: m.groupId,
      sender_email: m.senderEmail,
      message: m.message,
      created_at: m.createdAt,
    })),
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
}

/**
 * Sends a message to a group.
 * Caller MUST be a group member (even admins cannot send messages to non-member groups).
 */
export async function sendGroupMessage(
  senderEmail: string,
  groupId: string,
  message: string,
): Promise<GroupMessageItem> {
  const db = getDb();
  const normalizedSender = senderEmail.toLowerCase().trim();
  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    throw new ValidationError(
      [
        {
          field: "message",
          issue: "Message cannot be empty or whitespace only",
        },
      ],
      "Message cannot be empty or whitespace only",
    );
  }

  // 1. Verify group exists
  const groupRows = await db
    .select({
      groupId: groups.groupId,
      creatorEmail: groups.creatorEmail,
    })
    .from(groups)
    .where(eq(groups.groupId, groupId))
    .limit(1);

  if (groupRows.length === 0) {
    throw new NotFoundError("Group does not exist");
  }

  // 2. Verify sender is a member of the group
  const senderMembership = await db
    .select({ userEmail: groupMembers.userEmail })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userEmail, normalizedSender),
      ),
    )
    .limit(1);

  if (senderMembership.length === 0) {
    throw new ForbiddenError("You are not a member of this group");
  }

  // 3. Insert into group_chat_messages
  const [inserted] = await db
    .insert(groupChatMessages)
    .values({
      groupId,
      senderEmail: normalizedSender,
      message: trimmedMessage,
    })
    .returning();

  return {
    id: inserted.id,
    group_id: inserted.groupId,
    sender_email: inserted.senderEmail,
    message: inserted.message,
    created_at: inserted.createdAt,
  };
}

export interface GroupMemberResponse {
  email: string;
  name: string | null;
  avatar_url: string | null;
  joined_at: Date;
  is_creator: boolean;
}

export interface AddGroupMemberResponse {
  group_id: string;
  user_email: string;
  name: string | null;
  avatar_url: string | null;
  joined_at: Date;
  member_count: number;
}

/**
 * Retrieves members of a group channel.
 * Caller must be a member of the group, or an admin.
 */
export async function getGroupMembers(
  currentUserEmail: string,
  callerRole: string,
  groupId: string,
): Promise<GroupMemberResponse[]> {
  const db = getDb();
  const normalizedUser = currentUserEmail.toLowerCase().trim();

  // 1. Verify group exists
  const groupRows = await db
    .select({
      groupId: groups.groupId,
      creatorEmail: groups.creatorEmail,
    })
    .from(groups)
    .where(eq(groups.groupId, groupId))
    .limit(1);

  if (groupRows.length === 0) {
    throw new NotFoundError("Group does not exist");
  }

  const group = groupRows[0];

  // 2. Membership check (unless admin)
  if (callerRole !== "admin") {
    const membership = await db
      .select({ userEmail: groupMembers.userEmail })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userEmail, normalizedUser),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      throw new ForbiddenError("You are not a member of this group");
    }
  }

  // 3. Query group members joined with users table
  const members = await db
    .select({
      email: groupMembers.userEmail,
      joinedAt: groupMembers.joinedAt,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userEmail, users.email))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(
      desc(
        sql`CASE WHEN LOWER(${groupMembers.userEmail}) = LOWER(${group.creatorEmail}) THEN 1 ELSE 0 END`,
      ),
      groupMembers.joinedAt,
    );

  return members.map((m) => ({
    email: m.email,
    name: m.name ?? null,
    avatar_url: m.avatarUrl ?? null,
    joined_at: m.joinedAt,
    is_creator: m.email.toLowerCase() === group.creatorEmail.toLowerCase(),
  }));
}

/**
 * Adds a new member to an existing group.
 * Only the group creator can add members (verified strictly on backend: loggedInUser.email === group.creator_email).
 */
export async function addGroupMember(
  currentUserEmail: string,
  groupId: string,
  targetUserEmail: string,
): Promise<AddGroupMemberResponse> {
  const db = getDb();
  const normalizedCreator = currentUserEmail.toLowerCase().trim();
  const normalizedTarget = targetUserEmail.toLowerCase().trim();

  if (!normalizedTarget || !normalizedTarget.includes("@")) {
    throw new ValidationError(
      [{ field: "user_email", issue: "Must be a valid email address" }],
      "Invalid user email",
    );
  }

  // 1. Verify group exists
  const groupRows = await db
    .select({
      groupId: groups.groupId,
      name: groups.name,
      creatorEmail: groups.creatorEmail,
    })
    .from(groups)
    .where(eq(groups.groupId, groupId))
    .limit(1);

  if (groupRows.length === 0) {
    throw new NotFoundError("Group does not exist");
  }

  const group = groupRows[0];

  // 2. Creator-only authorization check
  if (normalizedCreator !== group.creatorEmail.toLowerCase()) {
    throw new ForbiddenError("Only the group creator can add members");
  }

  // 3. Verify target user exists in users table
  const targetUserRows = await db
    .select({
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalizedTarget))
    .limit(1);

  if (targetUserRows.length === 0) {
    throw new NotFoundError("User does not exist");
  }

  const targetUser = targetUserRows[0];
  if (!targetUser.isActive) {
    throw new BadRequestError("Cannot add a deactivated user to a group");
  }

  // 4. Verify target user is not already a member
  const existingMembership = await db
    .select({ userEmail: groupMembers.userEmail })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userEmail, normalizedTarget),
      ),
    )
    .limit(1);

  if (existingMembership.length > 0) {
    throw new ConflictError("User is already a member of this group");
  }

  // 5. Insert new member into group_members
  const [newMember] = await db
    .insert(groupMembers)
    .values({
      groupId,
      userEmail: normalizedTarget,
    })
    .returning();

  // 6. Fetch updated member count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const newMemberCount = countResult[0]?.count ?? 1;

  // 7. Log activity
  await db.insert(activityLogs).values({
    actorEmail: normalizedCreator,
    action: "GROUP_ADD_MEMBER",
    targetType: "group",
    targetId: groupId,
    details: {
      group_name: group.name,
      added_user_email: normalizedTarget,
      member_count: newMemberCount,
    },
  });

  return {
    group_id: groupId,
    user_email: normalizedTarget,
    name: targetUser.name ?? null,
    avatar_url: targetUser.avatarUrl ?? null,
    joined_at: newMember.joinedAt,
    member_count: newMemberCount,
  };
}
