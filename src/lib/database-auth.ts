import { randomBytes, randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { isAPIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { privileged, type DB } from "./db";
import { AppError, ensure } from "./errors";

export type AuthUser = { id: string; email?: string; is_anonymous?: boolean };
type UserResult = { error: unknown; data: { user: AuthUser | null } };
export type AccountAuthClient = {
  auth: {
    getUser(): Promise<UserResult>;
    signInWithPassword(value: {
      email: string;
      password: string;
    }): Promise<UserResult>;
    signOut(): Promise<{ error: unknown }>;
    updateUser(value: { password: string }): Promise<{ error: unknown }>;
    resetPasswordForEmail(
      email: string,
      options: { redirectTo: string },
    ): Promise<{ error: unknown }>;
    setSession(value: {
      access_token: string;
      refresh_token: string;
    }): Promise<UserResult>;
    exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
    admin: {
      createUser(value: {
        email: string;
        password: string;
        email_confirm: boolean;
      }): Promise<UserResult>;
      deleteUser(id: string): Promise<{ error: unknown }>;
      updateUserById(
        id: string,
        value: { password?: string; email_confirm?: boolean },
      ): Promise<{ error: unknown }>;
      getUserById(id: string): Promise<UserResult>;
    };
  };
};

// Kept separate from Next.js so the actual provider can be exercised against SQL in tests.
export function configureDatabaseAuth(
  database: Pool,
  secret: string,
  baseURL: string,
) {
  ensure(secret.length >= 32, 503, "auth_unavailable");
  return betterAuth({
    database,
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    user: { modelName: "ggc_auth_user" },
    account: { modelName: "ggc_auth_account" },
    verification: { modelName: "ggc_auth_verification" },
    session: {
      modelName: "ggc_auth_session",
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: () => randomUUID() },
      cookiePrefix: "ggc_auth",
      useSecureCookies: new URL(baseURL).protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    logger: { disabled: true },
  });
}
export async function resolveSessionSecret(db: DB, override?: string) {
  if (override?.trim()) {
    ensure(override.length >= 32, 503, "auth_unavailable");
    return override;
  }
  const [row] = await db.query<{ value: string }>(
    "insert into public.ggc_auth_config(id,value) values('session_secret',$1) on conflict(id) do update set id=excluded.id returning value",
    [randomBytes(48).toString("base64url")],
  );
  ensure(row?.value.length >= 32, 503, "auth_unavailable");
  return row.value;
}
// Accounts live in the application database; Supabase settings are no longer used.
export function authConfigured() {
  return !!process.env.DATABASE_URL?.trim();
}
let instance: Promise<ReturnType<typeof configureDatabaseAuth>> | undefined;
export function databaseAuth() {
  if (!instance)
    instance = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      ensure(databaseUrl, 503, "auth_unavailable");
      const secret = await privileged((db) =>
        resolveSessionSecret(db, process.env.BETTER_AUTH_SECRET),
      );
      const origin =
        process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://localhost:3000");
      return configureDatabaseAuth(
        new Pool({ connectionString: databaseUrl, max: 5 }),
        secret,
        origin,
      );
    })();
  return instance;
}

// Report a provider rejection by cause. Only a provider duplicate means the ID is taken.
export function authFailure(error: unknown, fallback: string) {
  if (error instanceof AppError) return error;
  if (isAPIError(error)) {
    const code = String((error.body as { code?: string } | undefined)?.code || "");
    if (code.startsWith("USER_ALREADY_EXISTS"))
      return new AppError(409, "username_taken");
    if (code.startsWith("PASSWORD_") || code.startsWith("INVALID_EMAIL"))
      return new AppError(400, "invalid_input");
    if (error.statusCode === 429) return new AppError(429, "rate_limited");
  }
  return new AppError(400, fallback);
}
async function userResult(
  fn: () => Promise<AuthUser | null>,
): Promise<UserResult> {
  try {
    return { error: null, data: { user: await fn() } };
  } catch (error) {
    if (!isAPIError(error)) throw error;
    return { error, data: { user: null } };
  }
}

// Only server routes import this administrative adapter. There is no public provider handler.
// The application routes enforce approval, same-origin requests and shared DB rate limits.
export function databaseAuthClient(session?: {
  headers(): Promise<Headers>;
  apply(headers: Headers): Promise<void>;
}): AccountAuthClient {
  const current = async () => {
    if (!session) return null;
    const headers = await session.headers();
    if (!headers.get("cookie")?.includes("ggc_auth.session_token="))
      return null;
    return (
      (await (await databaseAuth()).api.getSession({ headers }))?.user || null
    );
  };
  return {
    auth: {
      getUser: () => userResult(current),
      signInWithPassword: (value) =>
        userResult(async () => {
          ensure(session, 503, "auth_unavailable");
          const result = await (
            await databaseAuth()
          ).api.signInEmail({ body: value, returnHeaders: true });
          await session.apply(result.headers);
          return result.response.user;
        }),
      signOut: async () => {
        if (
          session &&
          (await session.headers())
            .get("cookie")
            ?.includes("ggc_auth.session_token=")
        ) {
          const result = await (
            await databaseAuth()
          ).api.signOut({
            headers: await session.headers(),
            returnHeaders: true,
          });
          await session.apply(result.headers);
        }
        return { error: null };
      },
      updateUser: async ({ password }) => {
        const user = await current();
        ensure(user, 401, "session_required");
        return updatePassword(user.id, password);
      },
      resetPasswordForEmail: async () => ({
        error: new AppError(400, "admin_reset_required"),
      }),
      setSession: async () => ({
        error: new AppError(400, "recovery_expired"),
        data: { user: null },
      }),
      exchangeCodeForSession: async () => ({
        error: new AppError(400, "recovery_expired"),
      }),
      admin: {
        createUser: ({ email, password }) =>
          userResult(async () => {
            const result = await (
              await databaseAuth()
            ).api.signUpEmail({
              body: { email, password, name: email.split("@")[0] },
            });
            // With auto-sign-in disabled Better Auth intentionally returns a synthetic
            // user for duplicate emails. Never link an application actor to that ID.
            await privileged((db) => verifyCreatedAuthUser(db, result.user));
            return result.user;
          }),
        deleteUser: async (id) => {
          await privileged((db) =>
            db.query("delete from public.ggc_auth_user where id=$1", [id]),
          );
          return { error: null };
        },
        updateUserById: async (id, value) => {
          if (value.password !== undefined)
            return updatePassword(id, value.password);
          const rows = await privileged((db) =>
            db.query(
              'update public.ggc_auth_user set "emailVerified"=true,"updatedAt"=now() where id=$1 returning id',
              [id],
            ),
          );
          return { error: rows.length ? null : new AppError(404, "not_found") };
        },
        getUserById: (id) =>
          userResult(async () => {
            const rows = await privileged((db) =>
              db.query(
                "select id,email from public.ggc_auth_user where id=$1",
                [id],
              ),
            );
            return (rows[0] as AuthUser) || null;
          }),
      },
    },
  };
}
export async function updatePassword(id: string, password: string) {
  ensure(password.length >= 10 && password.length <= 128, 400, "invalid_input");
  return privileged((db) => updateDatabasePassword(db, id, password));
}
export async function verifyCreatedAuthUser(db: DB, user: AuthUser) {
  const rows = await db.query(
    "select id from public.ggc_auth_user where id=$1 and email=$2",
    [user.id, user.email!],
  );
  ensure(rows.length === 1, 409, "username_taken");
}
export async function updateDatabasePassword(
  db: DB,
  id: string,
  password: string,
) {
  ensure(password.length >= 10 && password.length <= 128, 400, "invalid_input");
  const encoded = await hashPassword(password);
  const rows = await db.query(
    'update public.ggc_auth_account set password=$2,"updatedAt"=now() where "userId"=$1 and "providerId"=\'credential\' returning id',
    [id, encoded],
  );
  ensure(rows.length === 1, 404, "not_found");
  await db.query('delete from public.ggc_auth_session where "userId"=$1', [id]);
  return { error: null };
}
