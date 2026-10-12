import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { createAccessToken } from "../authentication/tokens";
import { getDb } from "../database/client";
import { activityLogs } from "../database/schema/activity";
import { groupMembers, groups } from "../database/schema/groups";
import { users } from "../database/schema/users";
import {
  addGroupMemberController,
  createGroupController,
  getGroupMembersController,
} from "../controllers/chat.controller";
import { searchUsersController } from "../controllers/users.controller";
import { withAuth } from "../middlewares/auth.middleware";

async function runGroupMembersTests() {
  console.log("🧪 Starting Group Members Management API Tests...\n");

  const db = getDb();
  const timestamp = Date.now();
  const creatorEmail = `creator_${timestamp}@test.local`;
  const memberEmail = `member_${timestamp}@test.local`;
  const candidateEmail = `candidate_${timestamp}@test.local`;
  const outsiderEmail = `outsider_${timestamp}@test.local`;
  const deactivatedEmail = `deactivated_${timestamp}@test.local`;
  const adminEmail = `admin_gm_${timestamp}@test.local`;

  // 1. Setup test users
  await db.insert(users).values([
    {
      email: creatorEmail,
      name: "Group Creator",
      role: "user",
      isActive: true,
    },
    {
      email: memberEmail,
      name: "Original Member",
      role: "user",
      isActive: true,
    },
    {
      email: candidateEmail,
      name: "New Candidate",
      role: "user",
      isActive: true,
    },
    {
      email: outsiderEmail,
      name: "Outsider User",
      role: "user",
      isActive: true,
    },
    {
      email: deactivatedEmail,
      name: "Deactivated User",
      role: "user",
      isActive: false,
    },
    {
      email: adminEmail,
      name: "Platform Admin",
      role: "admin",
      isActive: true,
    },
  ]);

  const creatorToken = await createAccessToken({
    email: creatorEmail,
    role: "user",
    sub: creatorEmail,
  });

  const memberToken = await createAccessToken({
    email: memberEmail,
    role: "user",
    sub: memberEmail,
  });

  const outsiderToken = await createAccessToken({
    email: outsiderEmail,
    role: "user",
    sub: outsiderEmail,
  });

  const adminToken = await createAccessToken({
    email: adminEmail,
    role: "admin",
    sub: adminEmail,
  });

  const wrappedCreateGroup = withAuth(createGroupController);
  const wrappedGetMembers = withAuth(getGroupMembersController);
  const wrappedAddMember = withAuth(addGroupMemberController);
  const wrappedSearchUsers = withAuth(searchUsersController);

  let createdGroupId = "";

  try {
    // ========================================================
    // 1. Create test group with creator & member
    // ========================================================
    console.log("1. Creating test group with initial participants...");
    const createRes = await wrappedCreateGroup(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Project Alpha Team",
          participant_emails: [memberEmail],
        }),
      }),
      {},
    );

    assert.equal(createRes.status, 201, "Group creation should return 201");
    const createJson = await createRes.json();
    assert.equal(createJson.success, true);
    createdGroupId = createJson.data.group_id;
    assert.ok(createdGroupId, "Group ID must be returned");
    console.log("  ✓ Group created successfully with ID:", createdGroupId);

    // ========================================================
    // 2. View Group Members
    // ========================================================
    console.log("\n2. Testing View Group Members API...");

    // 2.1 Unauthenticated request -> 401
    const unauthRes = await getGroupMembersController(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      unauthRes.status,
      401,
      "Unauthenticated request should return 401",
    );
    console.log("  ✓ Unauthenticated access rejected with 401");

    // 2.2 Invalid UUID -> 400
    const invalidIdRes = await wrappedGetMembers(
      new Request("http://localhost/api/groups/not-a-uuid/members", {
        headers: { Authorization: `Bearer ${creatorToken}` },
      }),
      { params: Promise.resolve({ groupId: "not-a-uuid" }) },
    );
    assert.equal(invalidIdRes.status, 400, "Invalid UUID must return 400");
    console.log("  ✓ Invalid groupId rejected with 400");

    // 2.3 Nonexistent group -> 404
    const nonexistentIdRes = await wrappedGetMembers(
      new Request(
        "http://localhost/api/groups/00000000-0000-0000-0000-000000000000/members",
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        },
      ),
      {
        params: Promise.resolve({
          groupId: "00000000-0000-0000-0000-000000000000",
        }),
      },
    );
    assert.equal(
      nonexistentIdRes.status,
      404,
      "Nonexistent group must return 404",
    );
    console.log("  ✓ Nonexistent group returns 404");

    // 2.4 Non-member user access -> 403
    const nonMemberRes = await wrappedGetMembers(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      nonMemberRes.status,
      403,
      "Non-member must be rejected with 403",
    );
    console.log("  ✓ Non-member user rejected with 403 Forbidden");

    // 2.5 Group member access -> 200
    const memberViewRes = await wrappedGetMembers(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      memberViewRes.status,
      200,
      "Member viewing members must return 200",
    );
    const memberViewJson = await memberViewRes.json();
    assert.equal(memberViewJson.success, true);
    assert.equal(Array.isArray(memberViewJson.data), true);
    assert.equal(memberViewJson.data.length, 2);

    const creatorEntry = memberViewJson.data.find(
      (m: { email: string }) =>
        m.email.toLowerCase() === creatorEmail.toLowerCase(),
    );
    assert.ok(creatorEntry, "Creator must be present in member list");
    assert.equal(
      creatorEntry.is_creator,
      true,
      "Creator entry must have is_creator: true",
    );
    assert.equal(creatorEntry.name, "Group Creator");

    const normalMemberEntry = memberViewJson.data.find(
      (m: { email: string }) =>
        m.email.toLowerCase() === memberEmail.toLowerCase(),
    );
    assert.ok(normalMemberEntry, "Normal member must be present");
    assert.equal(normalMemberEntry.is_creator, false);
    console.log(
      "  ✓ Group member can view member list with names and creator attribution",
    );

    // 2.6 Admin oversight -> 200
    const adminViewRes = await wrappedGetMembers(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      adminViewRes.status,
      200,
      "Admin oversight viewing members must return 200",
    );
    console.log("  ✓ Admin oversight can view group members");

    // ========================================================
    // 3. User Search for Adding Members
    // ========================================================
    console.log("\n3. Testing User Search for Group Candidates...");

    const searchRes = await wrappedSearchUsers(
      new Request(`http://localhost/api/users?query=candidate_${timestamp}`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      }),
      {},
    );
    assert.equal(searchRes.status, 200, "User search must return 200");
    const searchJson = await searchRes.json();
    assert.equal(searchJson.success, true);
    assert.ok(searchJson.data.length > 0, "Should find candidate user");
    const foundUser = searchJson.data.find(
      (u: { email: string }) =>
        u.email.toLowerCase() === candidateEmail.toLowerCase(),
    );
    assert.ok(foundUser, "Candidate user found in search");
    assert.equal(foundUser.name, "New Candidate");
    assert.equal(
      foundUser.password,
      undefined,
      "Password must never be exposed",
    );
    console.log(
      "  ✓ Creator can search candidate users cleanly without sensitive data exposure",
    );

    // ========================================================
    // 4. Add Group Member (Authorization & Validation)
    // ========================================================
    console.log("\n4. Testing Add Group Member API...");

    // 4.1 Non-creator member cannot add members -> 403
    const nonCreatorAddRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${memberToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: candidateEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      nonCreatorAddRes.status,
      403,
      "Non-creator member must be rejected with 403",
    );
    const nonCreatorAddJson = await nonCreatorAddRes.json();
    assert.equal(nonCreatorAddJson.error.code, "FORBIDDEN");
    console.log("  ✓ Non-creator member rejected with 403 Forbidden");

    // 4.2 Non-member outsider cannot add members -> 403
    const outsiderAddRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${outsiderToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: candidateEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      outsiderAddRes.status,
      403,
      "Outsider must be rejected with 403",
    );
    console.log("  ✓ Outsider user rejected with 403 Forbidden");

    // 4.3 Admin (not creator) cannot add members -> 403 (strict creator check)
    const adminAddRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: candidateEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      adminAddRes.status,
      403,
      "Admin non-creator must be rejected with 403",
    );
    console.log(
      "  ✓ Admin non-creator rejected with 403 (strictly creator_email === loggedInUser.email)",
    );

    // 4.4 Nonexistent target user -> 404
    const nonexistentTargetRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: "nonexistent_target_999@test.local",
        }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      nonexistentTargetRes.status,
      404,
      "Nonexistent target user must return 404",
    );
    console.log("  ✓ Nonexistent user rejected with 404 Not Found");

    // 4.5 Deactivated target user -> 400
    const deactivatedTargetRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: deactivatedEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      deactivatedTargetRes.status,
      400,
      "Deactivated user must return 400",
    );
    console.log("  ✓ Deactivated user rejected with 400 Bad Request");

    // 4.6 Target user already a member -> 409 Conflict
    const alreadyMemberRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: memberEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      alreadyMemberRes.status,
      409,
      "Adding existing member must return 409 Conflict",
    );
    const alreadyMemberJson = await alreadyMemberRes.json();
    assert.equal(alreadyMemberJson.error.code, "CONFLICT");
    console.log(
      "  ✓ Adding already-existing member rejected with 409 Conflict",
    );

    // 4.7 Creator successfully adds candidate -> 201 Created
    const addSuccessRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: candidateEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      addSuccessRes.status,
      201,
      "Successful member addition must return 201",
    );
    const addSuccessJson = await addSuccessRes.json();
    assert.equal(addSuccessJson.success, true);
    assert.equal(addSuccessJson.data.group_id, createdGroupId);
    assert.equal(addSuccessJson.data.user_email, candidateEmail.toLowerCase());
    assert.equal(addSuccessJson.data.name, "New Candidate");
    assert.equal(addSuccessJson.data.member_count, 3);
    console.log(
      "  ✓ Creator successfully added candidate (201 Created, member_count: 3)",
    );

    // 4.8 Verify re-adding candidate now triggers 409 Conflict
    const repeatAddRes = await wrappedAddMember(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: candidateEmail }),
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    assert.equal(
      repeatAddRes.status,
      409,
      "Duplicate addition must return 409",
    );
    console.log(
      "  ✓ Immediate duplicate addition attempt returns 409 Conflict",
    );

    // 4.9 Verify member list now includes 3 members
    const updatedMembersRes = await wrappedGetMembers(
      new Request(`http://localhost/api/groups/${createdGroupId}/members`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      }),
      { params: Promise.resolve({ groupId: createdGroupId }) },
    );
    const updatedMembersJson = await updatedMembersRes.json();
    assert.equal(
      updatedMembersJson.data.length,
      3,
      "Member list must now contain 3 members",
    );
    const newlyAdded = updatedMembersJson.data.find(
      (m: { email: string }) =>
        m.email.toLowerCase() === candidateEmail.toLowerCase(),
    );
    assert.ok(newlyAdded, "Newly added user must appear in members list");
    assert.equal(newlyAdded.name, "New Candidate");
    console.log("  ✓ Group member list accurately reflects updated membership");

    // 4.10 Verify audit log recorded
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.targetId, createdGroupId));
    const addLog = logs.find((l) => l.action === "GROUP_ADD_MEMBER");
    assert.ok(addLog, "Activity log for GROUP_ADD_MEMBER must exist");
    assert.equal(addLog.actorEmail, creatorEmail);
    console.log("  ✓ Activity log recorded: GROUP_ADD_MEMBER by creator");

    console.log(
      "\n🎉 All Group Members Management API tests PASSED successfully!",
    );
  } finally {
    // Cleanup test data
    console.log("\n🧹 Cleaning up test group & users...");
    if (createdGroupId) {
      await db
        .delete(groupMembers)
        .where(eq(groupMembers.groupId, createdGroupId));
      await db.delete(groups).where(eq(groups.groupId, createdGroupId));
      await db
        .delete(activityLogs)
        .where(eq(activityLogs.targetId, createdGroupId));
    }
    await db
      .delete(users)
      .where(
        inArray(users.email, [
          creatorEmail,
          memberEmail,
          candidateEmail,
          outsiderEmail,
          deactivatedEmail,
          adminEmail,
        ]),
      );
    console.log("  ✓ Cleanup complete.");
  }
}

runGroupMembersTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
