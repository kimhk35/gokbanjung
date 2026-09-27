import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { privileged } from "./db";
import type { Actor } from "./types";
import { AppError } from "./errors";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
export function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function authClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError(503, "auth_unavailable");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) =>
        items.forEach(({ name, value, options }) =>
          store.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          }),
        ),
    },
  });
}
export async function actor(): Promise<Actor> {
  const store = await cookies();
  if (store.getAll().some((c) => c.name.startsWith("sb-"))) {
    const supabase = await authClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !user.is_anonymous) {
      return privileged(async (db) => {
        const linked = (
          await db.query(
            "select a.id,a.kind,a.role,a.nickname,a.course_id,a.teacher_id,r.status as account_status from ggc.account_requests r join ggc.actors a on a.id=r.actor_id where r.user_id=$1",
            [user.id],
          )
        )[0];
        if (linked) {
          // Re-evaluate approval on every request; never trust editable metadata.
          if (linked.account_status !== "approved")
            return { ...linked, kind: "guest", role: "GUEST" } as Actor;
          return linked as Actor;
        }
        await db.query(
          "insert into ggc.actors(id,kind,role,nickname) values($1,'user','TEACHER_PENDING',$2) on conflict(id) do nothing",
          [user.id, user.email?.split("@")[0] || "Teacher"],
        );
        return (
          await db.query(
            "select id,kind,role,nickname,course_id,teacher_id from ggc.actors where id=$1",
            [user.id],
          )
        )[0] as Actor;
      });
    }
  }
  const token = store.get("ggc_guest")?.value;
  if (token) {
    const found = await privileged((db) =>
      db.query(
        "select a.id,a.kind,a.role,a.nickname,a.course_id,a.teacher_id,r.status as account_status from ggc.guest_sessions s join ggc.actors a on a.id=s.actor_id left join ggc.account_requests r on r.actor_id=a.id where token_hash=$1 and expires_at>now() and a.kind='guest'",
        [hash(token)],
      ),
    );
    if (found[0]) return found[0] as Actor;
  }
  throw new AppError(401, "session_required");
}
export async function createGuest() {
  try {
    return await actor();
  } catch (e) {
    if (!(e instanceof AppError && e.status === 401)) throw e;
  }
  const token = randomBytes(32).toString("base64url");
  const a = await privileged(async (db) => {
    const row = (
      await db.query(
        "insert into ggc.actors(kind,role,nickname) values('guest','GUEST','') returning id,kind,role,nickname,course_id",
      )
    )[0];
    await db.query(
      "insert into ggc.guest_sessions(actor_id,token_hash,expires_at) values($1,$2,now()+interval '365 days')",
      [String(row.id), hash(token)],
    );
    return row as Actor;
  });
  (await cookies()).set("ggc_guest", token, cookieOptions);
  return a;
}
