import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorEmail: varchar("actor_email", { length: 255 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 255 }),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_activity_logs_actor").on(table.actorEmail),
    index("idx_activity_logs_created_action").on(table.createdAt, table.action),
  ],
);

export type ActivityLogSelect = typeof activityLogs.$inferSelect;
export type ActivityLogInsert = typeof activityLogs.$inferInsert;
