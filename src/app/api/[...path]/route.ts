import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { actor, createGuest, authClient } from "@/lib/auth";
import { readData, writeData, rateLimit, requireAdmin } from "@/lib/service";
import { generate, reviewAi } from "@/lib/ai";
import { AppError, ensure } from "@/lib/errors";
import { privileged } from "@/lib/db";
import { checkAiConnection } from "@/lib/openai-config";
import { sameOrigin, siteOrigin } from "@/lib/site-url";
import {
  isCommunityPath,
  communityRead,
  communityWrite,
} from "@/lib/community-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    // Keep environment variables dynamic on Vercel. This matters for values
    // entered in the dashboard after the code was initially linked.
    await connection();
    const path = (await context.params).path.join("/");
    if (request.method === "GET" && path.startsWith("lesson-materials")) {
      const { readMaterials, readMaterialSlide } =
        await import("@/lib/lesson-materials");
      const a = await actor();
      const parts = path.split("/");
      if (parts.length === 4 && parts[2] === "slides") {
        const image = await readMaterialSlide(a, parts[1], parts[3]);
        const [header, data] = image.split(",");
        return new NextResponse(Buffer.from(data, "base64"), {
          headers: {
            "Content-Type": header.slice(5, header.indexOf(";")),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      ensure(parts.length <= 2, 404, "not_found");
      return json(await readMaterials(a, parts[1]));
    }
    if (request.method === "GET" && path === "scripture/chapter") {
      const { scriptureBooks } = await import("@/lib/scriptures");
      const { fetchChapter } = await import("@/lib/scripture-text");
      const { isUiLang } = await import("@/lib/i18n");
      const params = request.nextUrl.searchParams;
      const book = scriptureBooks.find((b) => b.id === params.get("book"));
      ensure(book, 400, "invalid_input");
      const chapter = z.coerce
        .number()
        .int()
        .min(1)
        .max(book.chapters)
        .parse(params.get("chapter"));
      const ui = params.get("lang");
      const text = await fetchChapter(book, chapter, isUiLang(ui) ? ui : "ko");
      ensure(text, 503, "source_unavailable");
      return NextResponse.json(text, {
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
      });
    }
    if (request.method === "GET" && path === "scripture/verses") {
      const { scriptureBooks, scriptureUrl } = await import("@/lib/scriptures");
      const { extractVerses } = await import("@/lib/quiz");
      const book = scriptureBooks.find(
        (b) => b.id === request.nextUrl.searchParams.get("book"),
      );
      const chapter = z.coerce
        .number()
        .int()
        .min(1)
        .max(book?.chapters || 1)
        .parse(request.nextUrl.searchParams.get("chapter"));
      const language = z
        .enum(["ko", "en"])
        .parse(request.nextUrl.searchParams.get("language") || "ko");
      ensure(book, 400, "invalid_input");
      const response = await fetch(scriptureUrl(book, chapter, language), {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(12000),
      });
      ensure(response.ok, 503, "source_unavailable");
      const verses = extractVerses(await response.text()).map((v) => v.verse);
      ensure(verses.length, 503, "source_unavailable");
      return json(verses);
    }
    if (request.method === "GET" && path === "lesson/revision") {
      const { lessonRevision } = await import("@/lib/lesson-service");
      return json(
        await lessonRevision(
          await actor(),
          request.nextUrl.searchParams.get("week"),
        ),
      );
    }
    if (request.method === "GET" && path === "lesson/config") {
      const { lessonConfig } = await import("@/lib/lesson-service");
      return json(
        await lessonConfig(
          await actor(),
          request.nextUrl.searchParams.get("week"),
        ),
      );
    }
    if (request.method === "GET" && path === "admin/accounts") {
      const { accountSecurityList } = await import("@/lib/account-security");
      return json(await accountSecurityList(await actor()));
    }
    if (request.method === "GET" && path === "teacher/application") {
      const a = await actor();
      return json(
        await privileged(
          async (db) =>
            (
              await db.query(
                "select name,email,status from ggc.teacher_applications where user_id=$1",
                [a.id],
              )
            )[0] || null,
        ),
      );
    }
    if (request.method === "GET" && isCommunityPath(path)) {
      let viewer = null;
      try {
        viewer = await actor();
      } catch (e) {
        if (!(e instanceof AppError && e.status === 401)) throw e;
      }
      return json(
        await communityRead(viewer, path, request.nextUrl.searchParams),
      );
    }
    if (request.method === "GET")
      return json(
        await readData(await actor(), path, request.nextUrl.searchParams),
      );
    const expected = siteOrigin(request.headers, request.url);
    ensure(sameOrigin(request.headers, request.url), 403, "origin_rejected");
    const bodyLimit =
      path === "lesson/config"
        ? 3500000
        : path === "lesson-materials/slide"
          ? 800000
          : 250000;
    ensure(
      Number(request.headers.get("content-length") || 0) < bodyLimit,
      413,
      "too_large",
    );
    const body = await request.text();
    ensure(Buffer.byteLength(body, "utf8") < bodyLimit, 413, "too_large");
    const input = body ? JSON.parse(body) : {};
    if (isCommunityPath(path))
      return json(await communityWrite(await actor(), path, input));
    if (path === "session") return json(await createGuest());
    if (path === "teacher/request") {
      const { requestTeacher } = await import("@/lib/teacher-accounts");
      const { hash } = await import("@/lib/auth");
      await rateLimit(
        "teacher-sender:" +
          hash(request.headers.get("x-forwarded-for") || "unknown"),
        10,
        3600,
      );
      return json(
        await requestTeacher(await createGuest(), input, await authClient()),
      );
    }
    if (path === "account/request") {
      const { requestAccount } = await import("@/lib/account-security");
      return json(
        await requestAccount(
          await createGuest(),
          input,
          await authClient(),
          expected,
        ),
      );
    }
    if (path === "auth/reset-email")
      throw new AppError(400, "admin_reset_required");
    if (path === "auth/recovery-session") {
      const tokens = z
        .object({
          access_token: z.string().min(20).max(12000),
          refresh_token: z.string().min(10).max(12000),
        })
        .parse(input);
      const client = await authClient();
      const result = await client.auth.setSession(tokens);
      ensure(!result.error && result.data.user, 400, "recovery_expired");
      return json({ ok: true });
    }
    if (path === "auth/change-password") {
      const { passwordSchema } = await import("@/lib/account-security");
      const password = passwordSchema.parse(input.password);
      const client = await authClient();
      const user = await client.auth.getUser();
      ensure(!user.error && user.data.user, 401, "recovery_expired");
      await rateLimit("change-password:" + user.data.user.id, 6, 3600);
      const result = await client.auth.updateUser({ password });
      ensure(!result.error, 400, "password_update_failed");
      await client.auth.signOut();
      return json({ ok: true });
    }
    if (path === "admin/reset-password") {
      const { adminResetPassword } = await import("@/lib/account-security");
      return json(await adminResetPassword(await actor(), input, expected));
    }
    if (path === "auth/login") {
      const { passwordLoginEmail } = await import("@/lib/login-id");
      const value = {
        email: passwordLoginEmail(input.username || input.email),
        password: z.string().min(8).max(128).parse(input.password),
      };
      // Rate limit hashed email, never log credentials or raw addresses.
      const { hash } = await import("@/lib/auth");
      await rateLimit("auth:" + hash(value.email), 10, 900);
      const auth = await authClient();
      const result = await auth.auth.signInWithPassword(value);
      ensure(!result.error, 400, "auth_failed");
      const signed = await actor();
      if (
        signed.kind !== "user" ||
        !["ADMIN", "TEACHER", "MEMBER"].includes(signed.role)
      ) {
        await auth.auth.signOut();
        throw new AppError(403, "approval_required");
      }
      return json({ ok: true });
    }

    if (path === "auth/logout") {
      const client = await authClient();
      await client.auth.signOut();
      return json({ ok: true });
    }
    if (path === "admin/ai-check") {
      const a = await actor();
      await requireAdmin(a);
      await rateLimit("ai-check:" + a.id, 10, 3600);
      return json(await checkAiConnection());
    }
    if (path === "admin/create-teacher") {
      const a = await actor();
      await requireAdmin(a);
      const serviceKey =
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;
      ensure(
        process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey,
        503,
        "admin_auth_unavailable",
      );
      const { usernameSchema, usernameEmail } = await import("@/lib/login-id");
      const { passwordSchema } = await import("@/lib/account-security");
      const submitted = z
        .object({ username: usernameSchema, password: passwordSchema })
        .parse(input);
      const value = {
        name: submitted.username,
        email: usernameEmail(submitted.username),
        password: submitted.password,
        ward: "곡반정와드",
        message: "관리자가 직접 생성한 교사 계정입니다.",
      };
      await rateLimit("admin-create-teacher:" + a.id, 20, 3600);
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const created = await supabase.auth.admin.createUser({
        email: value.email,
        password: value.password,
        email_confirm: true,
      });
      ensure(
        !created.error && created.data.user,
        400,
        "teacher_creation_failed",
      );
      const teacherId = created.data.user.id;
      try {
        await privileged(async (db) => {
          await db.query(
            "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,'user','TEACHER',$2,$3)",
            [teacherId, value.name, a.course_id],
          );
          await db.query(
            "insert into ggc.course_teachers(course_id,teacher_id) values($1,$2) on conflict do nothing",
            [a.course_id, teacherId],
          );
          await db.query(
            "insert into ggc.teacher_applications(user_id,name,email,ward,message,status,reviewed_by) values($1,$2,$3,$4,$5,'approved',$6)",
            [
              teacherId,
              value.name,
              value.email.toLowerCase(),
              value.ward || "관리자 생성 계정",
              value.message || "관리자가 직접 생성한 교사 계정입니다.",
              a.id,
            ],
          );
          await db.query(
            "insert into ggc.notifications(owner_id,message) values($1,$2)",
            [
              teacherId,
              JSON.stringify({
                ko: "관리자가 교사 계정을 만들고 권한을 승인했습니다.",
                en: "An administrator created and approved your teacher account.",
              }),
            ],
          );
        });
      } catch (error) {
        // Keep Auth and application roles in sync if database setup fails.
        await supabase.auth.admin.deleteUser(teacherId);
        throw error;
      }
      return json({ id: teacherId, name: value.name, email: value.email });
    }
    const a = await actor();
    if (path.startsWith("lesson-materials/")) {
      const { writeMaterial } = await import("@/lib/lesson-materials");
      await rateLimit("materials:" + a.id, 180, 3600);
      return json(await writeMaterial(a, path.split("/")[1], input));
    }
    if (path === "lesson/config") {
      const { lessonConfig } = await import("@/lib/lesson-service");
      return json(await lessonConfig(a, input.week, input.config));
    }
    if (path === "announcement/manage") {
      const { manageAnnouncement } = await import("@/lib/announcements");
      return json(await manageAnnouncement(a, input));
    }
    if (path === "quiz/start" || path === "quiz/submit") {
      ensure(a.nickname.trim(), 400, "nickname_required");
      const { startQuiz, submitQuiz } = await import("@/lib/quiz-service");
      return json(
        path === "quiz/start"
          ? await startQuiz(a, input)
          : await submitQuiz(a, input),
      );
    }
    if (path === "ai") return json(await generate(a, input));
    if (path === "ai-review") return json(await reviewAi(a, input));
    if (
      ["approve-teacher", "approve-account"].includes(path) &&
      input.status === "approved"
    ) {
      const { confirmForApproval } = await import("@/lib/account-security");
      await confirmForApproval(a, path, input);
    }
    const result = await writeData(a, path, input);
    if (path === "delete-records") (await cookies()).delete("ggc_guest");
    if (path === "feedback" && Array.isArray(result) && result[0]?.owner_id) {
      const { privileged } = await import("@/lib/db");
      await privileged((db) =>
        db.query(
          "insert into ggc.notifications(owner_id,message) values($1,$2)",
          [
            String(result[0].owner_id),
            JSON.stringify({
              ko: "선생님의 피드백이 도착했습니다.",
              en: "Your teacher has sent feedback.",
            }),
          ],
        ),
      );
    }
    return json(result);
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.code }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json({ error: "invalid_input" }, 400);
    const dbCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (["42501", "23503", "23514", "P0001"].includes(dbCode))
      return json({ error: "forbidden" }, 403);
    // Do not log SQL parameters, private reflections, credentials, or uploads.
    console.error("request_failed", { category: dbCode || "internal" });
    return json({ error: "server_error" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
