-- ============================================================================
-- Supabase Database Seed Script (Idempotent)
-- Run this in the Supabase Dashboard SQL Editor or via psql.
-- All passwords are pre-hashed with bcrypt (cost factor 12).
-- ============================================================================

-- 1. Roles
INSERT INTO "roles" ("role", "description")
VALUES 
  ('user', 'Standard application user with messaging access'),
  ('admin', 'System administrator with platform oversight')
ON CONFLICT ("role") DO NOTHING;

-- 2. Users (Test Credentials)
-- admin@chat.local -> AdminSecret123!
-- alice@chat.local -> AliceSecret123!
-- bob@chat.local   -> BobSecret123!
-- carol@chat.local -> CarolSecret123!
INSERT INTO "users" ("email", "password_hash", "name", "avatar_url", "role", "is_active")
VALUES
  (
    'admin@chat.local',
    '$2b$12$HVaRrUmRkTuMDf9e8vfOvOqSbrfmbDYttp7OE6X0eaprbFZMC/VwS',
    'Admin User',
    'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    'admin',
    true
  ),
  (
    'alice@chat.local',
    '$2b$12$H7hJf5U004q8R0IuLHhpXOAU5hrqYBnrxjf.cWTNtqp0NXb2QoSeK',
    'Alice Johnson',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    'user',
    true
  ),
  (
    'bob@chat.local',
    '$2b$12$.fQUlDPDOb8cD9TfAJvf8ea4zMJ7c/O7IMQ9/cajHXbomi6oD36le',
    'Bob Smith',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    'user',
    true
  ),
  (
    'carol@chat.local',
    '$2b$12$JE/Gn7JDSCpFTefQAtCunuNRb81RItIserLSsgkLjgUQaSsSoqFHW',
    'Carol Williams',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    'user',
    true
  )
ON CONFLICT ("email") DO NOTHING;

-- 3. Groups
INSERT INTO "groups" ("group_id", "name", "creator_email")
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Engineering Team',
    'admin@chat.local'
  )
ON CONFLICT ("group_id") DO NOTHING;

-- 4. Group Members
INSERT INTO "group_members" ("group_id", "user_email")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@chat.local'),
  ('00000000-0000-0000-0000-000000000001', 'alice@chat.local'),
  ('00000000-0000-0000-0000-000000000001', 'bob@chat.local')
ON CONFLICT ("group_id", "user_email") DO NOTHING;

-- 5. Direct Messages
INSERT INTO "direct_messages" ("id", "sender_email", "receiver_email", "message")
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    'alice@chat.local',
    'bob@chat.local',
    'Hey Bob! Welcome to the chat application.'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'bob@chat.local',
    'alice@chat.local',
    'Thanks Alice! Looking forward to testing realtime messages.'
  )
ON CONFLICT ("id") DO NOTHING;

-- 6. Group Chat Messages (Conditional insertion for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "group_chat_messages" 
    WHERE "group_id" = '00000000-0000-0000-0000-000000000001'
  ) THEN
    INSERT INTO "group_chat_messages" ("group_id", "sender_email", "message")
    VALUES
      (
        '00000000-0000-0000-0000-000000000001',
        'admin@chat.local',
        'Welcome everyone to the Engineering Team group channel!'
      ),
      (
        '00000000-0000-0000-0000-000000000001',
        'alice@chat.local',
        'Thanks! Happy to be here.'
      );
  END IF;
END $$;

-- 7. Activity Logs
INSERT INTO "activity_logs" ("id", "actor_email", "action", "target_type", "target_id", "details")
VALUES
  (
    '00000000-0000-0000-0000-000000000100',
    'admin@chat.local',
    'SYSTEM_INIT',
    'system',
    'database',
    '{"note": "Database initialized with seed data"}'::jsonb
  )
ON CONFLICT ("id") DO NOTHING;
