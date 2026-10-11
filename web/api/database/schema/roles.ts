import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  role: varchar("role", { length: 32 }).primaryKey(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type RoleSelect = typeof roles.$inferSelect;
export type RoleInsert = typeof roles.$inferInsert;
