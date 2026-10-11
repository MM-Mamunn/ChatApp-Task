import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireEnv } from "../configuration/env";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a singleton Drizzle client. Requires DATABASE_URL.
 * Not used by the hello endpoint; call only from services that need the database.
 */
export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = requireEnv("DATABASE_URL");
  const client = postgres(connectionString, { prepare: false });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
