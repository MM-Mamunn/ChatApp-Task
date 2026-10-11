import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });

async function testRealtime() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const dbUrl = process.env.DATABASE_URL!;

  console.log("Connecting to Supabase Realtime at:", url);
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const sql = postgres(dbUrl, { prepare: false });

  let directMessageReceived = false;
  let groupMessageReceived = false;

  const testId = `test-rt-${Date.now()}`;
  const testGroupId = "00000000-0000-0000-0000-000000000001"; // seeded group

  // 1. Subscribe to direct_messages
  const dmChannel = supabase
    .channel("test-dm-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages" },
      (payload) => {
        console.log(" Received realtime direct_message payload:", payload.new);
        if (payload.new && payload.new.message === testId) {
          directMessageReceived = true;
        }
      },
    );

  // 2. Subscribe to group_chat_messages
  const groupChannel = supabase.channel("test-group-channel").on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "group_chat_messages",
      filter: `group_id=eq.${testGroupId}`,
    },
    (payload) => {
      console.log(" Received realtime group_message payload:", payload.new);
      if (payload.new && payload.new.message === testId) {
        groupMessageReceived = true;
      }
    },
  );

  await new Promise<void>((resolve, reject) => {
    let dmSubbed = false;
    let grpSubbed = false;

    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for channels to subscribe"));
    }, 10000);

    dmChannel.subscribe((status) => {
      console.log("DM Channel status:", status);
      if (status === "SUBSCRIBED") {
        dmSubbed = true;
        if (grpSubbed) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });

    groupChannel.subscribe((status) => {
      console.log("Group Channel status:", status);
      if (status === "SUBSCRIBED") {
        grpSubbed = true;
        if (dmSubbed) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  console.log(
    " Channels SUBSCRIBED successfully. Now inserting test records into DB...",
  );

  // Insert test records using direct SQL
  await sql`
    INSERT INTO direct_messages (sender_email, receiver_email, message)
    VALUES ('alice@chat.local', 'bob@chat.local', ${testId})
    RETURNING id;
  `;

  await sql`
    INSERT INTO group_chat_messages (group_id, sender_email, message)
    VALUES (${testGroupId}, 'alice@chat.local', ${testId});
  `;

  console.log(" Waiting up to 5 seconds for Realtime events...");
  for (let i = 0; i < 50; i++) {
    if (directMessageReceived && groupMessageReceived) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Cleanup test records
  await sql`DELETE FROM direct_messages WHERE message = ${testId}`;
  await sql`DELETE FROM group_chat_messages WHERE message = ${testId}`;
  await sql.end();
  await supabase.removeChannel(dmChannel);
  await supabase.removeChannel(groupChannel);

  console.log("Results:");
  console.log("Direct message received via Realtime:", directMessageReceived);
  console.log("Group message received via Realtime:", groupMessageReceived);

  if (!directMessageReceived || !groupMessageReceived) {
    throw new Error("Did not receive all Realtime events!");
  }

  console.log("🎉 Supabase Realtime test PASSED!");
}

testRealtime().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
