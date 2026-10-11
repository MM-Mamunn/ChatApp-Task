import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const repoRoot = path.resolve(__dirname, "../../..");
loadDotenv({ path: path.join(repoRoot, ".env") });
loadDotenv({ path: path.join(repoRoot, ".env.local") });
loadDotenv({ path: path.resolve(__dirname, "../..", ".env") });
loadDotenv({ path: path.resolve(__dirname, "../..", ".env.local") });

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: "./api/database/schema/index.ts",
  out: "./api/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "",
  },
});
