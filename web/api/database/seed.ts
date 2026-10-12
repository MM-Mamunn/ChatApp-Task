import { eq } from "drizzle-orm";
import { hashPassword } from "../authentication/password";
import { requireEnv } from "../configuration/env";
import { getDb } from "./client";
import {
  activityLogs,
  directMessages,
  groupChatMessages,
  groupMembers,
  groups,
  roles,
  users,
} from "./schema";

// Fixed UUIDs for idempotent seeding
const SEED_GROUP_ID = "00000000-0000-0000-0000-000000000001";
const SEED_DM_1_ID = "00000000-0000-0000-0000-000000000010";
const SEED_DM_2_ID = "00000000-0000-0000-0000-000000000011";
const SEED_ACTIVITY_ID = "00000000-0000-0000-0000-000000000100";

export async function runSeed(): Promise<void> {
  const dbUrl = requireEnv("DATABASE_URL");
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please configure it in .env before seeding.",
    );
  }

  const db = getDb();

  console.log("🌱 Starting idempotent database seed...");

  // 1. Roles
  console.log("  → Seeding roles...");
  await db
    .insert(roles)
    .values([
      {
        role: "user",
        description: "Standard application user with messaging access",
      },
      {
        role: "admin",
        description: "System administrator with platform oversight",
      },
    ])
    .onConflictDoNothing();

  // 2. Users (using actual bcrypt password hashing)
  console.log("  → Seeding users with bcrypt password hashes...");
  // Standard test accounts
  const adminHash = await hashPassword("AdminSecret123!");
  const aliceHash = await hashPassword("AliceSecret123!");
  const bobHash = await hashPassword("BobSecret123!");
  const carolHash = await hashPassword("CarolSecret123!");

  // Required assignment test accounts:
  const admin1Hash = await hashPassword("admin1@example.com");
  const user1Hash = await hashPassword("user1@example.com");
  const user2Hash = await hashPassword("user2@example.com");

  const seedUsers = [
    {
      email: "admin1@example.com",
      passwordHash: admin1Hash,
      name: "Admin User",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin1",
      role: "admin" as const,
      isActive: true,
    },
    {
      email: "user1@example.com",
      passwordHash: user1Hash,
      name: "User One",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1",
      role: "user" as const,
      isActive: true,
    },
    {
      email: "user2@example.com",
      passwordHash: user2Hash,
      name: "User Two",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2",
      role: "user" as const,
      isActive: true,
    },
    {
      email: "admin@chat.local",
      passwordHash: adminHash,
      name: "Admin User",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
      role: "admin" as const,
      isActive: true,
    },
    {
      email: "alice@chat.local",
      passwordHash: aliceHash,
      name: "Alice Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      role: "user" as const,
      isActive: true,
    },
    {
      email: "bob@chat.local",
      passwordHash: bobHash,
      name: "Bob Smith",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      role: "user" as const,
      isActive: true,
    },
    {
      email: "carol@chat.local",
      passwordHash: carolHash,
      name: "Carol Williams",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
      role: "user" as const,
      isActive: true,
    },
  ];

  for (const u of seedUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: u.passwordHash,
          role: u.role,
          isActive: u.isActive,
          name: u.name,
        },
      });
  }

  // 3. Groups
  console.log("  → Seeding groups...");
  await db
    .insert(groups)
    .values([
      {
        groupId: SEED_GROUP_ID,
        name: "Engineering Team",
        creatorEmail: "admin@chat.local",
      },
    ])
    .onConflictDoNothing({ target: groups.groupId });

  // 4. Group Members
  console.log("  → Seeding group members...");
  await db
    .insert(groupMembers)
    .values([
      { groupId: SEED_GROUP_ID, userEmail: "admin@chat.local" },
      { groupId: SEED_GROUP_ID, userEmail: "alice@chat.local" },
      { groupId: SEED_GROUP_ID, userEmail: "bob@chat.local" },
      { groupId: SEED_GROUP_ID, userEmail: "admin1@example.com" },
      { groupId: SEED_GROUP_ID, userEmail: "user1@example.com" },
      { groupId: SEED_GROUP_ID, userEmail: "user2@example.com" },
    ])
    .onConflictDoNothing();

  // 5. Direct Messages
  console.log("  → Seeding direct messages...");
  await db
    .insert(directMessages)
    .values([
      {
        id: SEED_DM_1_ID,
        senderEmail: "alice@chat.local",
        receiverEmail: "bob@chat.local",
        message: "Hey Bob! Welcome to the chat application.",
      },
      {
        id: SEED_DM_2_ID,
        senderEmail: "bob@chat.local",
        receiverEmail: "alice@chat.local",
        message: "Thanks Alice! Looking forward to testing realtime messages.",
      },
    ])
    .onConflictDoNothing({ target: directMessages.id });

  // 6. Group Chat Messages (idempotent check by group)
  console.log("  → Seeding group messages...");
  const existingGroupMsgs = await db
    .select({ count: groupChatMessages.message })
    .from(groupChatMessages)
    .where(eq(groupChatMessages.groupId, SEED_GROUP_ID))
    .limit(1);

  if (existingGroupMsgs.length === 0) {
    await db.insert(groupChatMessages).values([
      {
        groupId: SEED_GROUP_ID,
        senderEmail: "admin@chat.local",
        message: "Welcome everyone to the Engineering Team group channel!",
      },
      {
        groupId: SEED_GROUP_ID,
        senderEmail: "alice@chat.local",
        message: "Thanks! Happy to be here.",
      },
    ]);
  }

  // 7. Activity Logs
  console.log("  → Seeding initial audit activity log...");
  await db
    .insert(activityLogs)
    .values([
      {
        id: SEED_ACTIVITY_ID,
        actorEmail: "admin@chat.local",
        action: "SYSTEM_INIT",
        targetType: "system",
        targetId: "database",
        details: { note: "Database initialized with seed data" },
      },
    ])
    .onConflictDoNothing({ target: activityLogs.id });

  console.log("✅ Database seed completed successfully!");
}

// Execute directly if run via CLI
if (require.main === module) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
