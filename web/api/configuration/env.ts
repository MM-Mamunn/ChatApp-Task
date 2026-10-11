import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

let loaded = false;

function findEnvFile(): string | null {
  const candidates = [
    path.resolve(__dirname, "../../.."), // repo root from web/api/configuration
    path.resolve(process.cwd(), ".."),
    process.cwd(),
    path.resolve(__dirname, "../.."), // web
  ];
  for (const dir of candidates) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) return envPath;
  }
  return null;
}

function ensureEnvLoaded(): void {
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

export class MissingEnvError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Missing required environment variable(s): ${missingKeys.join(", ")}. ` +
        "Copy `.env.example` to `.env` at the repository root and set values.",
    );
    this.name = "MissingEnvError";
    this.missingKeys = missingKeys;
  }
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
