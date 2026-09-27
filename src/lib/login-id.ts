import { z } from "zod";
export const usernameSchema = z
  .string()
  .trim()
  .min(4)
  .max(24)
  .regex(/^[A-Za-z0-9_]+$/)
  .transform((v) => v.toLowerCase());
const accountDomain = "accounts.gokbanjeong.invalid";
// Supabase's password provider uses an internal email-shaped identifier. No email is sent.
export const usernameEmail = (username: unknown) =>
  `${usernameSchema.parse(username)}@${accountDomain}`;
export const displayLoginId = (email: string) =>
  email.endsWith(`@${accountDomain}`) ? email.split("@")[0] : email;
export const passwordLoginEmail = (input: unknown) =>
  typeof input === "string" && input.includes("@")
    ? z.email().parse(input.trim().toLowerCase())
    : usernameEmail(input);
