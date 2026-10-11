import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const groups = pgTable(
  "groups",
  {
    groupId: uuid("group_id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    creatorEmail: varchar("creator_email", { length: 255 })
      .notNull()
      .references(() => users.email),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_groups_creator").on(table.creatorEmail)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.groupId, { onDelete: "cascade" }),
    userEmail: varchar("user_email", { length: 255 })
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userEmail] }),
    index("idx_group_members_user").on(table.userEmail),
  ],
);

export type GroupSelect = typeof groups.$inferSelect;
export type GroupInsert = typeof groups.$inferInsert;
export type GroupMemberSelect = typeof groupMembers.$inferSelect;
export type GroupMemberInsert = typeof groupMembers.$inferInsert;
