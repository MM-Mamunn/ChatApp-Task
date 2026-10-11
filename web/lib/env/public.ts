/**
 * Public environment values (safe for client bundles).
 * Full server-side validation is added in a later implementation step.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
