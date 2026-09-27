import { actor } from "@/lib/auth";
import { requireAdmin } from "@/lib/service";
import { asActor } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const a = await actor();
    await requireAdmin(a);
    const data = await asActor(a, async (db) => ({
      createdAt: new Date().toISOString(),
      scope:
        "Course content only; excludes private records, sessions, and submissions.",
      weeks: await db.query("select * from ggc.weeks"),
      worksheets: await db.query("select * from ggc.worksheets"),
      versions: await db.query("select * from ggc.content_versions"),
      announcements: await db.query("select * from ggc.announcements"),
      settings: await db.query("select * from ggc.site_settings"),
    }));
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="gospel-course-backup.json"',
        "Cache-Control": "private,no-store",
      },
    });
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
}
