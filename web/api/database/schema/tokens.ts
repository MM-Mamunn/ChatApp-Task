import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userEmail: varchar("user_email", { length: 255 })
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_refresh_tokens_user").on(table.userEmail, table.isRevoked),
    index("idx_refresh_tokens_hash").on(table.tokenHash),
  ],
);

export type RefreshTokenSelect = typeof refreshTokens.$inferSelect;
export type RefreshTokenInsert = typeof refreshTokens.$inferInsert;
