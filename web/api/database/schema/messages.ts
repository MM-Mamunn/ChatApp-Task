import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderEmail: varchar("sender_email", { length: 255 })
      .notNull()
      .references(() => users.email),
    receiverEmail: varchar("receiver_email", { length: 255 })
      .notNull()
      .references(() => users.email),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_direct_messages_pair").on(
      table.senderEmail,
      table.receiverEmail,
      table.createdAt,
    ),
    index("idx_direct_messages_receiver").on(
      table.receiverEmail,
      table.createdAt,
    ),
  ],
);

/**
 * Group chat messages table.
 * Preserved with NO PRIMARY KEY as specified in API.md and project requirements.
 */
export const groupChatMessages = pgTable(
  "group_chat_messages",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.groupId),
    senderEmail: varchar("sender_email", { length: 255 })
      .notNull()
      .references(() => users.email),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_group_chat_messages_group_created").on(
      table.groupId,
      table.createdAt,
    ),
    index("idx_group_chat_messages_sender").on(table.senderEmail),
  ],
);

export type DirectMessageSelect = typeof directMessages.$inferSelect;
export type DirectMessageInsert = typeof directMessages.$inferInsert;
export type GroupChatMessageSelect = typeof groupChatMessages.$inferSelect;
export type GroupChatMessageInsert = typeof groupChatMessages.$inferInsert;
