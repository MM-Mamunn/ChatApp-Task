import assert from "node:assert/strict";
import { eq, inArray, or } from "drizzle-orm";
import { createAccessToken } from "../authentication/tokens";
import { getDb } from "../database/client";
import { activityLogs } from "../database/schema/activity";
import { groupMembers, groups } from "../database/schema/groups";
import { directMessages, groupChatMessages } from "../database/schema/messages";
import { users } from "../database/schema/users";
import {
  createGroupController,
  getDirectMessagesController,
  getGroupMessagesController,
  listDirectConversationsController,
  listGroupsController,
  sendDirectMessageController,
  sendGroupMessageController,
  startDirectConversationController,
} from "../controllers/chat.controller";
import { withAuth } from "../middlewares/auth.middleware";

async function runChatTests() {
  console.log("🧪 Starting Step 1.8 Conversation & Message API Tests...\n");

  const db = getDb();
  const timestamp = Date.now();
  const userAEmail = `chata_${timestamp}@test.local`;
  const userBEmail = `chatb_${timestamp}@test.local`;
  const userCEmail = `chatc_${timestamp}@test.local`;
  const adminEmail = `admin_chat_${timestamp}@test.local`;

  // 1. Setup test users
  await db.insert(users).values([
    {
      email: userAEmail,
      name: "User Alpha",
      role: "user",
      isActive: true,
    },
    {
      email: userBEmail,
      name: "User Beta",
      role: "user",
      isActive: true,
    },
    {
      email: userCEmail,
      name: "User Gamma",
      role: "user",
      isActive: true,
    },
    {
      email: adminEmail,
      name: "Admin Overseer",
      role: "admin",
      isActive: true,
    },
  ]);

  const tokenA = await createAccessToken({ sub: userAEmail, role: "user" });
  const tokenB = await createAccessToken({ sub: userBEmail, role: "user" });
  const tokenC = await createAccessToken({ sub: userCEmail, role: "user" });
  const tokenAdmin = await createAccessToken({
    sub: adminEmail,
    role: "admin",
  });

  const authListDirect = withAuth(listDirectConversationsController);
  const authStartDirect = withAuth(startDirectConversationController);
  const authGetDirectMessages = withAuth(getDirectMessagesController);
  const authSendDirectMessage = withAuth(sendDirectMessageController);

  const authListGroups = withAuth(listGroupsController);
  const authCreateGroup = withAuth(createGroupController);
  const authGetGroupMessages = withAuth(getGroupMessagesController);
  const authSendGroupMessage = withAuth(sendGroupMessageController);

  let testGroupId = "";

  try {
    // =========================================================================
    // 1. Direct Conversation Initiation & Self-Chat Prevention
    // =========================================================================
    console.log("1. Testing Direct Conversation Initiation...");

    // 1.1 Self-chat prevention
    const selfReq = new Request(
      "http://localhost:3000/api/conversations/direct",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ recipient_email: userAEmail }),
      },
    );
    const selfRes = await authStartDirect(selfReq, {});
    assert.strictEqual(selfRes.status, 400);
    const selfBody = await selfRes.json();
    assert.strictEqual(selfBody.error.code, "BAD_REQUEST");

    // 1.2 Non-existent recipient
    const nonExistentReq = new Request(
      "http://localhost:3000/api/conversations/direct",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ recipient_email: "does_not_exist@test.local" }),
      },
    );
    const nonExistentRes = await authStartDirect(nonExistentReq, {});
    assert.strictEqual(nonExistentRes.status, 404);

    // 1.3 Successful initiation (is_new: true)
    const initReq = new Request(
      "http://localhost:3000/api/conversations/direct",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ recipient_email: userBEmail }),
      },
    );
    const initRes = await authStartDirect(initReq, {});
    assert.strictEqual(initRes.status, 201);
    const initBody = await initRes.json();
    assert.strictEqual(initBody.success, true);
    assert.strictEqual(initBody.data.other_user.email, userBEmail);
    assert.strictEqual(initBody.data.is_new, true);
    console.log("  ✓ Direct conversation initiation passed.");

    // =========================================================================
    // 2. Direct Message Sending & Validation
    // =========================================================================
    console.log("2. Testing Direct Message Sending...");

    // 2.1 Empty message rejected
    const emptyMsgReq = new Request(
      `http://localhost:3000/api/conversations/direct/${userBEmail}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "   " }),
      },
    );
    const emptyMsgRes = await authSendDirectMessage(emptyMsgReq, {
      params: { userEmail: userBEmail },
    });
    assert.strictEqual(emptyMsgRes.status, 400);
    const emptyMsgBody = await emptyMsgRes.json();
    assert.strictEqual(emptyMsgBody.error.code, "VALIDATION_ERROR");

    // 2.2 Send first message from A to B
    const send1Req = new Request(
      `http://localhost:3000/api/conversations/direct/${userBEmail}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Hello Beta from Alpha!" }),
      },
    );
    const send1Res = await authSendDirectMessage(send1Req, {
      params: { userEmail: userBEmail },
    });
    assert.strictEqual(send1Res.status, 201);
    const send1Body = await send1Res.json();
    assert.strictEqual(send1Body.success, true);
    assert.strictEqual(send1Body.data.sender_email, userAEmail);
    assert.strictEqual(send1Body.data.receiver_email, userBEmail);
    assert.strictEqual(send1Body.data.message, "Hello Beta from Alpha!");

    // 2.3 Send reply from B to A
    const send2Req = new Request(
      `http://localhost:3000/api/conversations/direct/${userAEmail}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenB}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "Hey Alpha, received loud and clear!",
        }),
      },
    );
    const send2Res = await authSendDirectMessage(send2Req, {
      params: { userEmail: userAEmail },
    });
    assert.strictEqual(send2Res.status, 201);

    // 2.4 Verify is_new becomes false after messages exist
    const reInitReq = new Request(
      "http://localhost:3000/api/conversations/direct",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ recipient_email: userBEmail }),
      },
    );
    const reInitRes = await authStartDirect(reInitReq, {});
    assert.strictEqual(reInitRes.status, 200);
    const reInitBody = await reInitRes.json();
    assert.strictEqual(reInitBody.data.is_new, false);
    console.log("  ✓ Direct message sending and duplicate-safety passed.");

    // =========================================================================
    // 3. Direct Message History & Pagination
    // =========================================================================
    console.log("3. Testing Direct Message History & Pagination...");

    const getMsgsReq = new Request(
      `http://localhost:3000/api/conversations/direct/${userBEmail}/messages?limit=10`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      },
    );
    const getMsgsRes = await authGetDirectMessages(getMsgsReq, {
      params: { userEmail: userBEmail },
    });
    assert.strictEqual(getMsgsRes.status, 200);
    const getMsgsBody = await getMsgsRes.json();
    assert.strictEqual(getMsgsBody.success, true);
    assert.strictEqual(getMsgsBody.data.length, 2);
    // Newest first
    assert.strictEqual(
      getMsgsBody.data[0].message,
      "Hey Alpha, received loud and clear!",
    );
    assert.strictEqual(getMsgsBody.data[1].message, "Hello Beta from Alpha!");

    // Test cursor pagination
    const cursorReq = new Request(
      `http://localhost:3000/api/conversations/direct/${userBEmail}/messages?limit=1`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      },
    );
    const cursorRes = await authGetDirectMessages(cursorReq, {
      params: { userEmail: userBEmail },
    });
    const cursorBody = await cursorRes.json();
    assert.strictEqual(cursorBody.data.length, 1);
    assert.strictEqual(cursorBody.pagination.has_more, true);
    assert.ok(cursorBody.pagination.next_cursor);
    console.log("  ✓ Direct message history and cursor pagination passed.");

    // =========================================================================
    // 4. Direct Conversations Overview
    // =========================================================================
    console.log("4. Testing Direct Conversations List...");

    const listDirectReq = new Request(
      "http://localhost:3000/api/conversations/direct",
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      },
    );
    const listDirectRes = await authListDirect(listDirectReq, {});
    assert.strictEqual(listDirectRes.status, 200);
    const listDirectBody = await listDirectRes.json();
    assert.strictEqual(listDirectBody.success, true);
    assert.strictEqual(listDirectBody.data.length, 1);
    assert.strictEqual(listDirectBody.data[0].other_user.email, userBEmail);
    assert.strictEqual(
      listDirectBody.data[0].last_message.message,
      "Hey Alpha, received loud and clear!",
    );
    console.log("  ✓ Direct conversations list passed.");

    // =========================================================================
    // 5. Group Creation & Membership
    // =========================================================================
    console.log("5. Testing Group Creation...");

    // 5.1 Empty group name rejected
    const badGroupReq = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "", participant_emails: [userBEmail] }),
    });
    const badGroupRes = await authCreateGroup(badGroupReq, {});
    assert.strictEqual(badGroupRes.status, 400);

    // 5.2 Valid group creation with User A (creator) and User B
    const createGrpReq = new Request("http://localhost:3000/api/groups", {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Engineering Core",
        participant_emails: [userBEmail],
      }),
    });
    const createGrpRes = await authCreateGroup(createGrpReq, {});
    assert.strictEqual(createGrpRes.status, 201);
    const createGrpBody = await createGrpRes.json();
    assert.strictEqual(createGrpBody.success, true);
    assert.strictEqual(createGrpBody.data.name, "Engineering Core");
    assert.strictEqual(createGrpBody.data.creator_email, userAEmail);
    assert.ok(createGrpBody.data.participants.includes(userAEmail));
    assert.ok(createGrpBody.data.participants.includes(userBEmail));

    testGroupId = createGrpBody.data.group_id;

    // Verify activity log was created
    const grpLogs = await db
      .select()
      .from(activityLogs)
      .where(
        or(
          eq(activityLogs.targetId, testGroupId),
          eq(activityLogs.action, "GROUP_CREATE"),
        ),
      );
    assert.ok(grpLogs.length > 0);
    console.log(
      "  ✓ Group creation, auto-membership, and activity logging passed.",
    );

    // =========================================================================
    // 6. Group Listing
    // =========================================================================
    console.log("6. Testing Group Listing...");

    // User A should see the group
    const listGrpAReq = new Request("http://localhost:3000/api/groups", {
      method: "GET",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const listGrpARes = await authListGroups(listGrpAReq, {});
    assert.strictEqual(listGrpARes.status, 200);
    const listGrpABody = await listGrpARes.json();
    assert.strictEqual(listGrpABody.data.length, 1);
    assert.strictEqual(listGrpABody.data[0].group_id, testGroupId);
    assert.strictEqual(listGrpABody.data[0].member_count, 2);

    // User C is NOT a member of the group, should see 0 groups
    const listGrpCReq = new Request("http://localhost:3000/api/groups", {
      method: "GET",
      headers: { authorization: `Bearer ${tokenC}` },
    });
    const listGrpCRes = await authListGroups(listGrpCReq, {});
    assert.strictEqual(listGrpCRes.status, 200);
    const listGrpCBody = await listGrpCRes.json();
    assert.strictEqual(listGrpCBody.data.length, 0);
    console.log("  ✓ Group listing and membership scoping passed.");

    // =========================================================================
    // 7. Group Message Sending & Member Enforcement
    // =========================================================================
    console.log("7. Testing Group Message Sending & Member Enforcement...");

    // 7.1 Non-member User C tries to send message -> 403 Forbidden
    const nonMemberSendReq = new Request(
      `http://localhost:3000/api/groups/${testGroupId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenC}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Sneaking into group chat!" }),
      },
    );
    const nonMemberSendRes = await authSendGroupMessage(nonMemberSendReq, {
      params: { groupId: testGroupId },
    });
    assert.strictEqual(nonMemberSendRes.status, 403);
    const nonMemberSendBody = await nonMemberSendRes.json();
    assert.strictEqual(nonMemberSendBody.error.code, "FORBIDDEN");

    // 7.2 Member User A sends valid group message -> 201 Created
    const memberSendReq = new Request(
      `http://localhost:3000/api/groups/${testGroupId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "Welcome team to the new project group!",
          receiver_email: userBEmail,
        }),
      },
    );
    const memberSendRes = await authSendGroupMessage(memberSendReq, {
      params: { groupId: testGroupId },
    });
    assert.strictEqual(memberSendRes.status, 201);
    const memberSendBody = await memberSendRes.json();
    assert.strictEqual(memberSendBody.success, true);
    assert.strictEqual(memberSendBody.data.group_id, testGroupId);
    assert.strictEqual(memberSendBody.data.sender_email, userAEmail);
    assert.strictEqual(
      memberSendBody.data.message,
      "Welcome team to the new project group!",
    );
    console.log(
      "  ✓ Non-member sending restriction and member message delivery passed.",
    );

    // =========================================================================
    // 8. Group Message History & Read Restrictions
    // =========================================================================
    console.log("8. Testing Group Message History & Read Restrictions...");

    // 8.1 Non-member User C tries to read messages -> 403 Forbidden
    const nonMemberReadReq = new Request(
      `http://localhost:3000/api/groups/${testGroupId}/messages`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenC}` },
      },
    );
    const nonMemberReadRes = await authGetGroupMessages(nonMemberReadReq, {
      params: { groupId: testGroupId },
    });
    assert.strictEqual(nonMemberReadRes.status, 403);

    // 8.2 Member User B can read messages -> 200 OK
    const memberReadReq = new Request(
      `http://localhost:3000/api/groups/${testGroupId}/messages`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenB}` },
      },
    );
    const memberReadRes = await authGetGroupMessages(memberReadReq, {
      params: { groupId: testGroupId },
    });
    assert.strictEqual(memberReadRes.status, 200);
    const memberReadBody = await memberReadRes.json();
    assert.strictEqual(memberReadBody.success, true);
    assert.strictEqual(memberReadBody.data.length, 1);
    assert.strictEqual(
      memberReadBody.data[0].message,
      "Welcome team to the new project group!",
    );

    // 8.3 Admin can read group messages even if not a member -> 200 OK
    const adminReadReq = new Request(
      `http://localhost:3000/api/groups/${testGroupId}/messages`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${tokenAdmin}` },
      },
    );
    const adminReadRes = await authGetGroupMessages(adminReadReq, {
      params: { groupId: testGroupId },
    });
    assert.strictEqual(adminReadRes.status, 200);
    const adminReadBody = await adminReadRes.json();
    assert.strictEqual(adminReadBody.success, true);
    assert.strictEqual(adminReadBody.data.length, 1);
    console.log(
      "  ✓ Group message read restrictions and admin oversight passed.",
    );

    console.log(
      "\n🎉 All Step 1.8 Conversation & Message tests passed successfully!\n",
    );
  } finally {
    // Cleanup test data
    console.log("🧹 Cleaning up test chat data...");
    const testUsers = [userAEmail, userBEmail, userCEmail, adminEmail];

    if (testGroupId) {
      await db
        .delete(groupChatMessages)
        .where(eq(groupChatMessages.groupId, testGroupId));
      await db
        .delete(groupMembers)
        .where(eq(groupMembers.groupId, testGroupId));
      await db.delete(groups).where(eq(groups.groupId, testGroupId));
      await db
        .delete(activityLogs)
        .where(eq(activityLogs.targetId, testGroupId));
    }

    await db
      .delete(directMessages)
      .where(
        or(
          inArray(directMessages.senderEmail, testUsers),
          inArray(directMessages.receiverEmail, testUsers),
        ),
      );

    await db.delete(users).where(inArray(users.email, testUsers));
    console.log("  ✓ Cleanup complete.");
  }
}

runChatTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
