import postgres from "postgres";
const userId = process.argv[2];
if (!process.env.DATABASE_URL || !userId || !/^[0-9a-f-]{36}$/i.test(userId))
  throw new Error(
    "Usage: DATABASE_URL=... node --import tsx scripts/bootstrap-admin.mts <verified Supabase Auth user UUID>",
  );
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: "require",
});
try {
  await sql.begin(async (tx) => {
    const users =
      await tx`select id,email_confirmed_at from auth.users where id=${userId}::uuid`;
    if (!users[0]?.email_confirmed_at)
      throw new Error("A confirmed Supabase Auth user is required.");
    await tx`insert into ggc.actors(id,kind,role,nickname) values(${userId}::uuid,'user','ADMIN','관리자') on conflict(id) do update set role='ADMIN',kind='user'`;
  });
  console.log("Administrator assigned to the verified Auth user.");
} finally {
  await sql.end();
}
