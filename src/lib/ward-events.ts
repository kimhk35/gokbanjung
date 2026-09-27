import { z } from "zod";
import { privileged, type DB } from "./db";
import { AppError, ensure } from "./errors";
import type { Actor } from "./types";
import { ORGANIZATION_IDS, monthRange, toISO } from "./ward-model";

export type WardEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  organizations: string[];
  status: "draft" | "published" | "cancelled";
  poster_path: string | null;
  updated_at: string;
  can_edit: boolean;
};
type Row = Omit<
  WardEvent,
  "can_edit" | "starts_at" | "ends_at" | "updated_at"
> & {
  starts_at: string | Date;
  ends_at: string | Date;
  updated_at: string | Date;
};
const COLUMNS =
  "id,slug,title,description,starts_at,ends_at,location,organizations,status,poster_path,updated_at";
const organization = z.enum(ORGANIZATION_IDS);
const iso = (v: string | Date) => new Date(v).toISOString();

export function canManage(managed: string[], orgs: string[]) {
  return (
    managed.includes("all") ||
    (orgs.length > 0 && orgs.every((o) => managed.includes(o)))
  );
}
export async function managedOrganizations(a: Actor | null, db: DB) {
  if (!a || a.kind !== "user") return [];
  if (a.role === "ADMIN") return ["all"];
  const rows = await db.query<{ organization: string }>(
    "select organization from ggc.event_managers where actor_id=$1",
    [a.id],
  );
  return rows.map((r) => r.organization);
}
export async function canCreateEvents(a: Actor) {
  return (await privileged((db) => managedOrganizations(a, db))).length > 0;
}
function shape(row: Row, managed: string[]): WardEvent {
  return {
    ...row,
    organizations: [...row.organizations],
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    updated_at: iso(row.updated_at),
    can_edit: canManage(managed, row.organizations),
  };
}
const visible = (e: WardEvent) => e.status !== "draft" || e.can_edit;

export async function listEvents(a: Actor | null, params: URLSearchParams) {
  const now = new Date(Date.now() + 9 * 3600000);
  const fallback = monthRange(now.getUTCFullYear(), now.getUTCMonth());
  const range = z
    .object({
      from: z.iso.datetime({ offset: true }),
      to: z.iso.datetime({ offset: true }),
    })
    .safeParse({
      from: params.get("from") || fallback.start,
      to: params.get("to") || fallback.end,
    });
  ensure(range.success, 400, "invalid_input");
  const from = new Date(range.data.from).getTime(),
    to = new Date(range.data.to).getTime();
  ensure(to > from && to - from <= 400 * 86400000, 400, "invalid_input");
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    const rows = await db.query<Row>(
      `select ${COLUMNS} from ggc.events where starts_at<$2 and ends_at>$1 order by starts_at limit 500`,
      [new Date(from).toISOString(), new Date(to).toISOString()],
    );
    return {
      items: rows.map((r) => shape(r, managed)).filter(visible),
      managed,
    };
  });
}
export async function getEvent(a: Actor | null, slug: string) {
  ensure(/^[a-f0-9]{12}$/.test(slug), 404, "not_found");
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    const row = (
      await db.query<Row>(`select ${COLUMNS} from ggc.events where slug=$1`, [
        slug,
      ])
    )[0];
    ensure(row, 404, "not_found");
    const event = shape(row, managed);
    ensure(visible(event), 404, "not_found");
    return event;
  });
}
const eventInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(5000).default(""),
  date: z.string(),
  start: z.string(),
  end_date: z.string(),
  end: z.string(),
  location: z.string().trim().max(300).default(""),
  organizations: z.array(organization).min(1).max(6),
  poster_path: z
    .string()
    .regex(/^events\/[a-f0-9-]{36}\.(webp|png|jpg)$/)
    .nullable()
    .optional(),
  status: z.enum(["draft", "published"]),
});
function times(v: z.infer<typeof eventInput>) {
  try {
    const starts = toISO(v.date, v.start),
      ends = toISO(v.end_date, v.end);
    ensure(new Date(ends) > new Date(starts), 400, "invalid_time");
    return [starts, ends];
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(400, "invalid_time");
  }
}
export async function saveEvent(a: Actor, input: unknown) {
  const v = eventInput.parse(input);
  const [starts, ends] = times(v);
  const organizations = [...new Set(v.organizations)];
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    ensure(canManage(managed, organizations), 403, "forbidden");
    const values = [
      v.title,
      v.description,
      starts,
      ends,
      v.location || null,
      organizations,
      v.poster_path || null,
      v.status,
    ];
    if (v.id) {
      const current = (
        await db.query<Row>(`select ${COLUMNS} from ggc.events where id=$1`, [
          v.id,
        ])
      )[0];
      ensure(current, 404, "not_found");
      ensure(canManage(managed, current.organizations), 403, "forbidden");
      const row = (
        await db.query<Row>(
          `update ggc.events set title=$1,description=$2,starts_at=$3,ends_at=$4,location=$5,organizations=$6,poster_path=$7,status=$8,updated_at=now() where id=$9 returning ${COLUMNS}`,
          [...values, v.id],
        )
      )[0];
      return shape(row, managed);
    }
    const row = (
      await db.query<Row>(
        `insert into ggc.events(title,description,starts_at,ends_at,location,organizations,poster_path,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning ${COLUMNS}`,
        [...values, a.id],
      )
    )[0];
    return shape(row, managed);
  });
}
async function editable(a: Actor, id: string, db: DB) {
  const managed = await managedOrganizations(a, db);
  const row = (
    await db.query<Row>(`select ${COLUMNS} from ggc.events where id=$1`, [id])
  )[0];
  ensure(row, 404, "not_found");
  ensure(canManage(managed, row.organizations), 403, "forbidden");
  return managed;
}
export async function setEventStatus(a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      status: z.enum(["draft", "published", "cancelled"]),
    })
    .parse(input);
  return privileged(async (db) => {
    const managed = await editable(a, v.id, db);
    const row = (
      await db.query<Row>(
        `update ggc.events set status=$1,updated_at=now() where id=$2 returning ${COLUMNS}`,
        [v.status, v.id],
      )
    )[0];
    return shape(row, managed);
  });
}
export async function deleteEvent(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await editable(a, v.id, db);
    await db.query("delete from ggc.events where id=$1", [v.id]);
    return { ok: true as const };
  });
}
function requireAdminActor(a: Actor) {
  ensure(a.kind === "user" && a.role === "ADMIN", 403, "forbidden");
}
export async function listEventManagers(a: Actor) {
  requireAdminActor(a);
  return privileged(async (db) => ({
    users: await db.query<{ id: string; nickname: string; role: string }>(
      "select id,nickname,role from ggc.actors where kind='user' and role in ('MEMBER','TEACHER','ADMIN') order by nickname",
    ),
    managers: await db.query<{ actor_id: string; organization: string }>(
      "select actor_id,organization from ggc.event_managers order by organization",
    ),
  }));
}
export async function setEventManager(a: Actor, input: unknown) {
  requireAdminActor(a);
  const v = z
    .object({ actor_id: z.uuid(), organization, enabled: z.boolean() })
    .parse(input);
  return privileged(async (db) => {
    const target = (
      await db.query<{ kind: string }>(
        "select kind from ggc.actors where id=$1",
        [v.actor_id],
      )
    )[0];
    ensure(target?.kind === "user", 400, "invalid_input");
    if (v.enabled)
      await db.query(
        "insert into ggc.event_managers(actor_id,organization,created_by) values($1,$2,$3) on conflict do nothing",
        [v.actor_id, v.organization, a.id],
      );
    else
      await db.query(
        "delete from ggc.event_managers where actor_id=$1 and organization=$2",
        [v.actor_id, v.organization],
      );
    return { ok: true as const };
  });
}
export async function upcomingEvents(limit: number) {
  return privileged(async (db) =>
    (
      await db.query<Row>(
        `select ${COLUMNS} from ggc.events where status='published' and ends_at>now() order by starts_at limit $1`,
        [Math.min(Math.max(limit, 1), 10)],
      )
    ).map((r) => shape(r, [])),
  );
}
