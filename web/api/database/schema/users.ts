import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { roles } from "./roles";

export const users = pgTable(
  "users",
  {
    email: varchar("email", { length: 255 }).primaryKey(),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("name", { length: 128 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 32 })
      .notNull()
      .default("user")
      .references(() => roles.role),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
    index("idx_users_is_active").on(table.isActive),
  ],
);

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
