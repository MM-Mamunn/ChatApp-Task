import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

let loaded = false;

function findEnvFile(): string | null {
  if (process.env.DATABASE_URL && process.env.JWT_ACCESS_SECRET) {
    return null;
  }
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, "../../.."),
    path.resolve(__dirname, "../.."),
  ];
  for (const dir of candidates) {
    const envLocal = path.join(dir, ".env.local");
    if (fs.existsSync(envLocal)) return envLocal;
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) return envPath;
  }
  return null;
}

export function ensureEnvLoaded(): void {
  if (loaded) return;
  const envFile = findEnvFile();
  if (envFile) {
    loadDotenv({ path: envFile, quiet: true });
    const local = envFile + ".local";
    if (fs.existsSync(local)) {
      loadDotenv({ path: local, quiet: true });
    }
  }
  loaded = true;
}

/**
 * Zod schema for server-side environment variables.
 * Sensitive values are never logged or exposed.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DATABASE_URL must be a valid PostgreSQL connection URI",
    )
    .optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 characters for security")
    .optional(),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters for security")
    .optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z
    .string()
    .email("ADMIN_BOOTSTRAP_EMAIL must be a valid email address")
    .optional(),
  ADMIN_BOOTSTRAP_SECRET: z
    .string()
    .min(8, "ADMIN_BOOTSTRAP_SECRET must be at least 8 characters")
    .optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class MissingEnvError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Missing required environment variable(s): ${missingKeys.join(", ")}. ` +
        "Ensure variables are defined in .env or .env.local without committing secrets.",
    );
    this.name = "MissingEnvError";
    this.missingKeys = missingKeys;
  }
}

export class ConfigValidationError extends Error {
  readonly issues: { key: string; issue: string }[];

  constructor(issues: { key: string; issue: string }[]) {
    const formatted = issues.map((i) => `${i.key}: ${i.issue}`).join("; ");
    super(`Environment configuration validation failed: ${formatted}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

/**
 * Validates the current environment variables against serverEnvSchema.
 * If specific keys are required for the calling context, verifies their presence.
 * Never prints secret values to error messages or logs.
 */
export function validateServerEnv(
  requiredKeys: (keyof ServerEnv)[] = [],
): ServerEnv {
  ensureEnvLoaded();

  // 1. Check for presence of required keys
  const missing = requiredKeys.filter((key) => {
    const val = process.env[key as string]?.trim();
    return !val;
  });

  if (missing.length > 0) {
    throw new MissingEnvError(missing as string[]);
  }

  // 2. Validate format using Zod
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      key: issue.path.join(".") || "unknown",
      issue: issue.message,
    }));
    throw new ConfigValidationError(issues);
  }

  return result.data;
}

export function requireEnv(key: string): string {
  ensureEnvLoaded();
  const value = process.env[key]?.trim();
  if (!value) {
    throw new MissingEnvError([key]);
  }
  return value;
}

export function optionalEnv(key: string): string | undefined {
  ensureEnvLoaded();
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function getPublicAppUrl(): string {
  ensureEnvLoaded();
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}
