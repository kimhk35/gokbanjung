import { z } from "zod";
import { asActor, privileged, type DB } from "./db";
import { ensure, AppError } from "./errors";
import type { Actor } from "./types";
import { curriculum, COURSE } from "./curriculum";
import { canManageRecords } from "./access";
export const weekSchema = z.coerce.number().int().min(1).max(52);
const text = z.string().trim().min(1).max(6000);
export async function rateLimit(key: string, limit: number, seconds = 3600) {
  await privileged(async (db) => {
    const row = (
      await db.query(
        `insert into ggc.rate_limits(key,hits,reset_at) values($1,1,now()+$2*interval '1 second') on conflict(key) do update set hits=case when ggc.rate_limits.reset_at<now() then 1 else ggc.rate_limits.hits+1 end,reset_at=case when ggc.rate_limits.reset_at<now() then excluded.reset_at else ggc.rate_limits.reset_at end returning hits`,
        [key, seconds],
      )
    )[0];
    ensure(Number(row.hits) <= limit, 429, "rate_limited");
  });
}
export async function requireTeacher(a: Actor, db: DB) {
  const r = await db.query("select ggc.teaches($1) as ok", [a.course_id]);
  ensure(r[0].ok);
}
export async function requireAdmin(a: Actor) {
  ensure(a.role === "ADMIN" && a.kind === "user");
}
export async function teachers(course: string) {
  return privileged((db) =>
    db.query(
      "select a.id,a.nickname from ggc.actors a join ggc.course_teachers t on t.teacher_id=a.id where t.course_id=$1 and a.role='TEACHER' order by a.nickname",
      [course],
    ),
  );
}
export async function readData(
  a: Actor,
  path: string,
  params: URLSearchParams,
) {
  if (path === "class-members") {
    const { classMembers } = await import("./class-members");
    return classMembers(a, params);
  }
  if (["journey", "my-posts"].includes(path))
    ensure(canManageRecords(a), 403, "approval_required");
  if (path === "account-requests") {
    await requireAdmin(a);
    return privileged((db) =>
      db.query(
        "select r.user_id,r.email,r.status,r.created_at,a.nickname from ggc.account_requests r join ggc.actors a on a.id=r.actor_id order by r.created_at desc",
      ),
    );
  }
  const availableTeachers =
    path === "bootstrap" ? await teachers(a.course_id) : [];
  return asActor(a, async (db) => {
    const week = weekSchema.parse(params.get("week") || 38);
    switch (path) {
      case "my-posts":
        return db.query(
          "select id,week,content,created_at,'note' as kind from ggc.sticky_notes where owner_id=$1 union all select p.id,r.week,p.content,p.created_at,'discussion' as kind from ggc.discussion_posts p join ggc.discussion_rooms r on r.id=p.room_id where p.owner_id=$1 union all select id,week,content,created_at,'question' as kind from ggc.questions where owner_id=$1 order by created_at desc",
          [a.id],
        );
      case "bootstrap":
        return {
          actor: a,
          weeks: await db.query(
            "select data from ggc.weeks where course_id=$1 order by id",
            [a.course_id],
          ),
          teachers: availableTeachers,
          notifications: await db.query(
            "select id,message,read_at,created_at from ggc.notifications order by created_at desc limit 20",
          ),
          // Route handlers call connection() before this code so this is read
          // from the active Vercel runtime environment rather than a build-time
          // client bundle.
          aiAvailable: !!(
            process.env.OPENAI_API_KEY?.trim() ||
            process.env.OPEN_API_KEY?.trim()
          ),
          authAvailable: !!(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
          ),
          persistent: !!process.env.DATABASE_URL,
        };
      case "reflection":
        return (
          (
            await db.query(
              "select content,updated_at from ggc.reflections where week=$1 and day=$2",
              [
                week,
                z.coerce
                  .number()
                  .min(1)
                  .max(7)
                  .parse(params.get("day") || 1),
              ],
            )
          )[0] || null
        );
      case "rewards":
        return {
          events: await db.query(
            "select id,kind,period,earned_at from ggc.reward_events order by earned_at desc",
          ),
          month: (
            await db.query(
              "select to_char(now() at time zone 'Asia/Seoul','YYYY-MM') as month",
            )
          )[0].month,
        };
      case "journey":
        return {
          reflections: await db.query(
            "select week,day,content,updated_at from ggc.reflections order by week desc,day desc",
          ),
          progress: await db.query(
            "select week,day from ggc.lesson_progress order by week,day",
          ),
          bookmarks: await db.query("select id,week from ggc.bookmarks"),
          questions: await db.query(
            "select week,content from ggc.personal_questions order by week desc",
          ),
          insights: await db.query(
            "select id,week,feature,content,created_at from ggc.ai_content where owner_id=$1 and feature in ('insight','weekly') order by created_at desc",
            [a.id],
          ),
        };
      case "notes":
        return db.query(
          "select id,week,content,display_name,is_anonymous,is_pinned,status,created_at,(owner_id=ggc.uid()) as mine from ggc.sticky_notes where week=$1 order by is_pinned desc,created_at desc",
          [week],
        );
      case "note-comments":
        return db.query(
          "select id,content,display_name,created_at from ggc.sticky_comments where note_id=$1 order by created_at",
          [z.uuid().parse(params.get("id"))],
        );
      case "rooms":
        return db.query(
          "select id,week,title,mode,status,closes_at from ggc.discussion_rooms where week=$1 order by created_at",
          [week],
        );
      case "posts": {
        const id = z.uuid().parse(params.get("id"));
        return {
          posts: await db.query(
            "select id,content,display_name,status,created_at,(owner_id=ggc.uid()) as mine from ggc.discussion_posts where room_id=$1 order by created_at",
            [id],
          ),
          canView: (
            await db.query("select ggc.can_read_room($1) as ok", [id])
          )[0].ok,
          canWrite: (
            await db.query("select ggc.can_write_room($1) as ok", [id])
          )[0].ok,
        };
      }
      case "post-comments":
        return db.query(
          "select id,content,parent_id,display_name,created_at from ggc.discussion_comments where post_id=$1 order by created_at",
          [z.uuid().parse(params.get("id"))],
        );
      case "worksheet":
        return {
          worksheet: (
            await db.query(
              "select id,items,version from ggc.worksheets where week=$1",
              [week],
            )
          )[0],
          draft: (
            await db.query(
              "select id,answers,worksheet_snapshot from ggc.worksheet_submissions where owner_id=$1 and week=$2 and status='DRAFT'",
              [a.id, week],
            )
          )[0],
          submissions: await db.query(
            "select s.id,s.week,s.status,s.answers,s.worksheet_snapshot,s.teacher_id,s.created_at,coalesce((select jsonb_agg(jsonb_build_object('content',f.content,'created_at',f.created_at)) from ggc.teacher_feedback f where f.submission_id=s.id),'[]'::jsonb) as feedback from ggc.worksheet_submissions s where s.owner_id=$1 and s.week=$2 and s.status<>'DRAFT' order by s.created_at desc",
            [a.id, week],
          ),
        };
      case "questions":
        return db.query(
          "select id,week,content,visibility,response,created_at,(owner_id=ggc.uid()) as mine from ggc.questions where week=$1 order by created_at desc",
          [week],
        );
      case "teacher":
        await requireTeacher(a, db);
        return {
          submissions: await db.query(
            "select id,week,answers,worksheet_snapshot,teacher_id,status,created_at from ggc.worksheet_submissions where teacher_id=$1 and status<>'DRAFT' order by created_at desc",
            [a.id],
          ),
          questions: await db.query(
            "select id,week,content,response from ggc.questions where teacher_id=$1 order by created_at desc",
            [a.id],
          ),
          reports: await db.query(
            "select id,reason,content_type,content_id,status from ggc.moderation_reports where course_id=$1",
            [a.course_id],
          ),
          ai: await db.query(
            "select id,week,feature,language,content,status from ggc.ai_content where owner_id=$1 order by created_at desc",
            [a.id],
          ),
          notes: await db.query(
            "select id,week,content,display_name,status,is_pinned from ggc.sticky_notes where course_id=$1 order by created_at desc limit 100",
            [a.course_id],
          ),
        };
      case "admin":
        await requireAdmin(a);
        return {
          applications: await db.query(
            "select * from ggc.teacher_applications order by created_at desc",
          ),
          usage: await db.query(
            "select feature,status,count(*)::int as calls,sum(tokens_input)::int as tokens_input,sum(tokens_output)::int as tokens_output from ggc.ai_generations group by feature,status",
          ),
          resources: await db.query(
            "select id,name,status,created_at from ggc.resources order by created_at desc",
          ),
          settings: await db.query("select * from ggc.site_settings"),
          versions: await db.query(
            "select id,kind,record_id,created_at from ggc.content_versions order by created_at desc limit 30",
          ),
          ai: await db.query(
            "select id,week,feature,language,content,status,created_at from ggc.ai_content where owner_id=$1 order by created_at desc limit 30",
            [a.id],
          ),
        };
      case "published-ai":
        return db.query(
          "select id,feature,language,content from ggc.ai_content where week=$1 and status='published' and feature in ('questions','class_brief') order by created_at desc",
          [week],
        );
      case "announcements":
        return db.query(
          "select id,content from ggc.announcements where course_id=$1 order by created_at desc",
          [a.course_id],
        );
      default:
        throw new AppError(404, "not_found");
    }
  });
}
export async function writeData(a: Actor, path: string, input: unknown) {
  if (!["profile", "delete-records"].includes(path))
    ensure(a.nickname.trim(), 400, "nickname_required");
  const base = z
    .object({ week: weekSchema.optional() })
    .passthrough()
    .parse(input);
  const week = base.week || 38;
  await rateLimit("write:" + a.id, 180, 60);
  if (path === "approve-account") {
    await requireAdmin(a);
    const v = z
      .object({
        user_id: z.uuid(),
        status: z.enum(["approved", "rejected", "suspended"]),
      })
      .parse(input);
    return privileged(async (db) => {
      const row = (
        await db.query(
          "update ggc.account_requests set status=$1,reviewed_by=$2 where user_id=$3 returning actor_id",
          [v.status, a.id, v.user_id],
        )
      )[0];
      ensure(row, 404, "not_found");
      await db.query(
        "update ggc.actors set kind='user',role=$1 where id=$2 and role in ('GUEST','MEMBER')",
        [v.status === "approved" ? "MEMBER" : "GUEST", String(row.actor_id)],
      );
      // A pre-approval browser cookie must never become a member credential.
      await db.query("delete from ggc.guest_sessions where actor_id=$1", [
        String(row.actor_id),
      ]);
      return { ok: true };
    });
  }
  if (path === "profile") {
    const v = z
      .object({
        nickname: z.string().trim().min(2).max(40),
        teacher_id: z.uuid().nullable().optional(),
      })
      .parse(input);
    if (v.teacher_id)
      ensure(
        (await teachers(a.course_id)).some((t) => t.id === v.teacher_id),
        400,
        "invalid_teacher",
      );
    return privileged((db) =>
      db.query(
        "update ggc.actors set nickname=$1,teacher_id=case when $4::boolean then $2::uuid else teacher_id end where id=$3 returning id,nickname,teacher_id",
        [v.nickname, v.teacher_id || null, a.id, v.teacher_id !== undefined],
      ),
    );
  }
  if (path === "teacher-apply") {
    throw new AppError(400, "teacher_request_required");
  }
  if (path === "remove-teacher") {
    const { removeTeacher } = await import("./teacher-accounts");
    return removeTeacher(a, input);
  }
  if (path === "approve-teacher") {
    await requireAdmin(a);
    const v = z
      .object({
        id: z.uuid(),
        status: z.enum(["approved", "rejected", "suspended"]),
      })
      .parse(input);
    return privileged(async (db) => {
      const app = (
        await db.query(
          "update ggc.teacher_applications t set status=$1,reviewed_by=$2 from ggc.actors target where t.id=$3 and target.id=t.user_id and target.course_id=$4 and target.role<>'ADMIN' returning t.user_id,t.name",
          [v.status, a.id, v.id, a.course_id],
        )
      )[0];
      ensure(app, 404, "not_found");
      await db.query("update ggc.actors set role=$1,nickname=$2 where id=$3", [
        v.status === "approved" ? "TEACHER" : "TEACHER_PENDING",
        String(app.name),
        String(app.user_id),
      ]);
      if (v.status === "approved") {
        // Teacher approval also grants personal record access; no second application is required.
        await db.query(
          "update ggc.account_requests set status='approved',reviewed_by=$1 where actor_id=$2",
          [a.id, String(app.user_id)],
        );
        await db.query("update ggc.actors set kind='user' where id=$1", [
          String(app.user_id),
        ]);
        await db.query("delete from ggc.guest_sessions where actor_id=$1", [
          String(app.user_id),
        ]);
        await db.query(
          "insert into ggc.course_teachers(course_id,teacher_id) values($1,$2) on conflict do nothing",
          [a.course_id, String(app.user_id)],
        );
      } else
        await db.query("delete from ggc.course_teachers where teacher_id=$1", [
          String(app.user_id),
        ]);
      await db.query(
        "insert into ggc.notifications(owner_id,message) values($1,$2)",
        [
          String(app.user_id),
          JSON.stringify({
            ko:
              v.status === "approved"
                ? "교사 승인이 완료되었습니다."
                : "교사 신청 상태가 변경되었습니다.",
            en:
              v.status === "approved"
                ? "Your teacher application was approved."
                : "Your teacher application status changed.",
          }),
        ],
      );
      return { ok: true };
    });
  }
  if (path === "delete-records") {
    ensure(z.object({ confirm: z.literal("DELETE") }).parse(input));
    ensure(a.kind === "guest", 400, "guest_only");
    return privileged(async (db) => {
      await db.query("delete from ggc.actors where id=$1 and kind='guest'", [
        a.id,
      ]);
      return { ok: true };
    });
  }
  return asActor(a, async (db) => {
    switch (path) {
      case "reflection": {
        const v = z
          .object({
            day: z.number().int().min(1).max(7),
            content: z.record(z.string(), z.string().max(10000)),
          })
          .parse(input);
        return db.query(
          "insert into ggc.reflections(owner_id,week,day,content) values($1,$2,$3,$4) on conflict(owner_id,week,day) do update set content=excluded.content,updated_at=now() returning updated_at",
          [a.id, week, v.day, JSON.stringify(v.content)],
        );
      }
      case "complete": {
        const v = z
          .object({ day: z.number().int().min(1).max(7) })
          .parse(input);
        return db.query(
          "insert into ggc.lesson_progress(owner_id,week,day) values($1,$2,$3) on conflict do nothing",
          [a.id, week, v.day],
        );
      }
      case "bookmark":
        return db.query(
          "insert into ggc.bookmarks(owner_id,week) values($1,$2) on conflict do nothing",
          [a.id, week],
        );
      case "personal-question":
        return db.query(
          "insert into ggc.personal_questions(owner_id,week,content) values($1,$2,$3) on conflict(owner_id,week) do update set content=excluded.content",
          [a.id, week, text.parse(base.content)],
        );
      case "note": {
        const v = z
          .object({
            content: z.string().trim().min(1).max(1200),
            anonymous: z.boolean().default(false),
          })
          .parse(input);
        const setting = (
          await db.query(
            "select value from ggc.site_settings where key='moderation'",
          )
        )[0];
        return db.query(
          "insert into ggc.sticky_notes(owner_id,course_id,week,content,display_name,is_anonymous,status) values($1,$2,$3,$4,$5,$6,$7) returning id",
          [
            a.id,
            a.course_id,
            week,
            v.content,
            v.anonymous ? "" : a.nickname,
            v.anonymous,
            setting?.value === "review" ? "pending" : "published",
          ],
        );
      }
      case "edit-note": {
        const v = z
          .object({ id: z.uuid(), content: z.string().trim().min(1).max(1200) })
          .parse(input);
        return db.query(
          "update ggc.sticky_notes set content=$1 where id=$2 and owner_id=$3 returning id",
          [v.content, v.id, a.id],
        );
      }
      case "delete-note":
        return db.query(
          "delete from ggc.sticky_notes where id=$1 returning id",
          [z.uuid().parse(base.id)],
        );
      case "react-note":
        return db.query(
          "insert into ggc.sticky_reactions(owner_id,note_id) values($1,$2) on conflict do nothing",
          [a.id, z.uuid().parse(base.id)],
        );
      case "note-comment":
        return db.query(
          "insert into ggc.sticky_comments(owner_id,note_id,content,display_name) values($1,$2,$3,$4)",
          [a.id, z.uuid().parse(base.id), text.parse(base.content), a.nickname],
        );
      case "report":
        return db.query(
          "insert into ggc.moderation_reports(owner_id,course_id,content_type,content_id,reason) values($1,$2,$3,$4,$5)",
          [
            a.id,
            a.course_id,
            z.enum(["note", "post"]).parse(base.type),
            z.uuid().parse(base.id),
            text.parse(base.reason),
          ],
        );
      case "post": {
        const v = z.object({ id: z.uuid(), content: text }).parse(input);
        const room = (
          await db.query("select mode from ggc.discussion_rooms where id=$1", [
            v.id,
          ])
        )[0];
        ensure(room, 404, "not_found");
        return db.query(
          "insert into ggc.discussion_posts(owner_id,room_id,content,display_name,status) values($1,$2,$3,$4,$5) returning id",
          [
            a.id,
            v.id,
            v.content,
            room.mode === "ANONYMOUS" ? "" : a.nickname,
            room.mode === "TEACHER_MODERATED" ? "pending" : "published",
          ],
        );
      }
      case "post-comment": {
        const v = z
          .object({
            id: z.uuid(),
            content: text,
            parent_id: z.uuid().nullable().optional(),
          })
          .parse(input);
        if (v.parent_id)
          ensure(
            (
              await db.query(
                "select id from ggc.discussion_comments where id=$1 and post_id=$2",
                [v.parent_id, v.id],
              )
            )[0],
            400,
            "invalid_input",
          );
        return db.query(
          "insert into ggc.discussion_comments(owner_id,post_id,parent_id,content,display_name) values($1,$2,$3,$4,$5)",
          [a.id, v.id, v.parent_id || null, v.content, a.nickname],
        );
      }
      case "question": {
        const v = z
          .object({
            teacher_id: z.uuid(),
            content: text,
            visibility: z.enum(["TEACHER", "CLASS", "ANONYMOUS"]),
          })
          .parse(input);
        return db.query(
          "insert into ggc.questions(owner_id,course_id,teacher_id,week,content,visibility) values($1,$2,$3,$4,$5,$6)",
          [a.id, a.course_id, v.teacher_id, week, v.content, v.visibility],
        );
      }
      case "draft": {
        await db.query("select pg_advisory_xact_lock(hashtext($1))", [
          `worksheet:${a.course_id}:${week}`,
        ]);
        const v = z
          .object({ answers: z.record(z.string(), z.string().max(10000)) })
          .parse(input);
        const sheet = (
          await db.query(
            "select items,version from ggc.worksheets where week=$1",
            [week],
          )
        )[0];
        ensure(sheet, 404, "not_found");
        if (base.worksheet_version !== undefined)
          ensure(
            z.number().int().parse(base.worksheet_version) === sheet.version,
            409,
            "worksheet_changed",
          );
        return db.query(
          "insert into ggc.worksheet_submissions(owner_id,course_id,week,answers,worksheet_snapshot,status) values($1,$2,$3,$4,$5,'DRAFT') on conflict(owner_id,week) where status='DRAFT' do update set answers=excluded.answers,worksheet_snapshot=excluded.worksheet_snapshot returning id",
          [
            a.id,
            a.course_id,
            week,
            JSON.stringify(v.answers),
            JSON.stringify(sheet),
          ],
        );
      }
      case "submit": {
        await db.query("select pg_advisory_xact_lock(hashtext($1))", [
          `worksheet:${a.course_id}:${week}`,
        ]);
        const v = z
          .object({
            teacher_id: z.uuid(),
            answers: z.record(z.string(), z.string().max(10000)),
          })
          .parse(input);
        ensure(
          Object.values(v.answers).some((s) => s.trim()),
          400,
          "empty_answers",
        );
        const w = (
          await db.query(
            "select items,version from ggc.worksheets where week=$1 and status='published'",
            [week],
          )
        )[0];
        ensure(w, 404, "not_found");
        if (base.worksheet_version !== undefined)
          ensure(
            z.number().int().parse(base.worksheet_version) === w.version,
            409,
            "worksheet_changed",
          );
        return db.query(
          "insert into ggc.worksheet_submissions(owner_id,course_id,week,teacher_id,answers,worksheet_snapshot,status,submitted_at) values($1,$2,$3,$4,$5,$6,'SUBMITTED',now()) returning id,status",
          [
            a.id,
            a.course_id,
            week,
            v.teacher_id,
            JSON.stringify(v.answers),
            JSON.stringify(w),
          ],
        );
      }
      case "feedback": {
        await requireTeacher(a, db);
        const v = z
          .object({
            id: z.uuid(),
            content: text,
            status: z.enum(["FEEDBACK", "RETURNED"]).default("FEEDBACK"),
          })
          .parse(input);
        await db.query(
          "insert into ggc.teacher_feedback(submission_id,teacher_id,content) values($1,$2,$3)",
          [v.id, a.id, v.content],
        );
        return db.query(
          "update ggc.worksheet_submissions set status=$1 where id=$2 and teacher_id=$3 returning owner_id",
          [v.status, v.id, a.id],
        );
      }
      case "view-submission":
        await requireTeacher(a, db);
        return db.query(
          "update ggc.worksheet_submissions set status='VIEWED' where id=$1 and teacher_id=$2 and status='SUBMITTED'",
          [z.uuid().parse(base.id), a.id],
        );
      case "create-room": {
        await requireTeacher(a, db);
        const v = z
          .object({
            title: text,
            mode: z.enum([
              "OPEN",
              "POST_BEFORE_VIEW",
              "ANONYMOUS",
              "TEACHER_MODERATED",
              "READ_ONLY_AFTER_CLOSE",
            ]),
            closes_at: z.iso.datetime().nullable().optional(),
          })
          .parse(input);
        return db.query(
          "insert into ggc.discussion_rooms(course_id,teacher_id,week,title,mode,closes_at) values($1,$2,$3,$4,$5,$6) returning id",
          [a.course_id, a.id, week, v.title, v.mode, v.closes_at || null],
        );
      }
      case "close-room":
        await requireTeacher(a, db);
        return db.query(
          "update ggc.discussion_rooms set status='closed' where id=$1",
          [z.uuid().parse(base.id)],
        );
      case "moderate": {
        await requireTeacher(a, db);
        const v = z
          .object({
            type: z.enum(["note", "post", "report"]),
            id: z.uuid(),
            status: z.enum(["published", "hidden", "resolved"]),
            pinned: z.boolean().optional(),
          })
          .parse(input);
        if (v.type === "report")
          return db.query(
            "update ggc.moderation_reports set status='resolved' where id=$1",
            [v.id],
          );
        ensure(v.status !== "resolved", 400, "invalid_input");
        if (v.type === "note")
          return db.query(
            "update ggc.sticky_notes set status=$1,is_pinned=$2 where id=$3",
            [v.status, v.pinned || false, v.id],
          );
        return db.query(
          "update ggc.discussion_posts set status=$1 where id=$2",
          [v.status, v.id],
        );
      }
      case "answer-question":
        await requireTeacher(a, db);
        return db.query(
          "update ggc.questions set response=$1 where id=$2 and teacher_id=$3",
          [text.parse(base.content), z.uuid().parse(base.id), a.id],
        );
      case "edit-worksheet": {
        await db.query("select pg_advisory_xact_lock(hashtext($1))", [
          `worksheet:${a.course_id}:${week}`,
        ]);
        await requireTeacher(a, db);
        const items = z
          .array(z.object({ ko: text, en: text }))
          .min(1)
          .max(20)
          .parse(base.items);
        const old = (
          await db.query(
            "select * from ggc.worksheets where week=$1 for update",
            [week],
          )
        )[0];
        ensure(old, 404, "not_found");
        if (base.expected_version !== undefined)
          ensure(
            z.number().int().parse(base.expected_version) === old.version,
            409,
            "worksheet_changed",
          );
        await db.query(
          "insert into ggc.content_versions(course_id,kind,record_id,snapshot,created_by) values($1,'worksheet',$2,$3,$4)",
          [a.course_id, String(old.id), JSON.stringify(old), a.id],
        );
        return db.query(
          "update ggc.worksheets set items=$1,version=version+1 where week=$2 returning items,version",
          [JSON.stringify(items), week],
        );
      }
      case "edit-week": {
        await requireTeacher(a, db);
        const value = z
          .object({
            title: z.object({ ko: text, en: text }),
            status: z.enum(["draft", "published"]),
          })
          .parse(input);
        const old = (
          await db.query("select data,version from ggc.weeks where id=$1", [
            week,
          ])
        )[0];
        ensure(old, 404, "not_found");
        await db.query(
          "insert into ggc.content_versions(course_id,kind,record_id,snapshot,created_by) values($1,'week',$2,$3,$4)",
          [a.course_id, String(week), JSON.stringify(old), a.id],
        );
        return db.query(
          "update ggc.weeks set data=$1,status=$2,version=version+1 where id=$3",
          [
            JSON.stringify({
              ...(old.data as object),
              title: value.title,
              status: value.status,
            }),
            value.status,
            week,
          ],
        );
      }
      case "settings":
        await requireAdmin(a);
        return db.query(
          "update ggc.site_settings set value=$1 where key='moderation'",
          [
            JSON.stringify(
              z.enum(["automatic", "review"]).parse(base.moderation),
            ),
          ],
        );
      case "announcement":
        await requireAdmin(a);
        return db.query(
          "insert into ggc.announcements(course_id,content) values($1,$2)",
          [
            a.course_id,
            JSON.stringify(
              z.object({ ko: text, en: text }).parse(base.content),
            ),
          ],
        );
      default:
        throw new AppError(404, "not_found");
    }
  });
}
