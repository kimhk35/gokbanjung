// Shows why an administrator cannot sign in (read-only), then, only after a typed
// confirmation, replaces that administrator's password:
//   npm run admin:recover
// Passwords and the database address are typed hidden and never printed.
import { existsSync } from "node:fs";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { ask } from "./terminal-input.mjs";
import { parseDatabaseUrl } from "./database-url.mjs";
import { adminOverview, setAdminPassword } from "../src/lib/operator-admin";
import { displayLoginId } from "../src/lib/login-id";
import type { DB } from "../src/lib/db";

const stop = (message: string, code = "stopped") =>
  Object.assign(new Error(message), { code });

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const parsed = parseDatabaseUrl(
  process.env.DATABASE_URL || (await ask("DATABASE_URL (안 보이는 것이 정상): ", true)),
);
if (parsed.error || !parsed.url) {
  console.error(parsed.error);
  process.exit(1);
}
const url = parsed.url;
console.log("연결할 곳:", parsed.host);
const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: parsed.host === "localhost" ? false : "require",
});
const wrap = (tx: postgres.TransactionSql): DB => ({
  query: async (text, params = []) =>
    (await tx.unsafe(text, params as never[])) as never,
});
let createFirst = false;
try {
  const now = (await sql.begin("read only", (tx) =>
    adminOverview(wrap(tx)),
  )) as Awaited<ReturnType<typeof adminOverview>>;
  console.log("\n[점검 결과] 아직 아무것도 바꾸지 않았습니다.");
  console.log(`  주차 ${now.weeks}개 (52가 정상) / 사람 기록 ${now.people}개 / 교사 ${now.teachers}명`);
  console.log(`  로그인 계정 ${now.logins}개 / 가장 최근에 생긴 방문자 기록: ${now.last_visit || "없음"}`);
  console.log(`  관리자 ${now.admins.length}명`);
  now.admins.forEach((a, i) =>
    console.log(
      `  ${i + 1}. ${a.nickname || "(이름 없음)"}  로그인 아이디: ${a.login ? displayLoginId(a.login) : "없음"}  승인: ${a.status || "-"}  (${a.actor_id.slice(0, 8)})`,
    ),
  );
  if (now.weeks !== 52)
    throw stop("주차 수가 52가 아닙니다. 운영 DB가 아닐 수 있어 멈췄습니다.");
  if (!now.admins.length) {
    console.log("\n이 DB에는 관리자가 한 명도 없습니다.");
    console.log("가장 최근 방문자 기록이 오늘 사이트를 연 시각과 맞는지 먼저 보세요.");
    console.log("맞지 않으면 다른 DB일 수 있으니 그냥 Enter를 눌러 끝내세요.");
    createFirst = (await ask("최초 관리자를 만들려면 FIRST 입력: ")) === "FIRST";
    if (!createFirst) throw stop("취소했습니다. 바뀐 것은 없습니다.");
  } else {
    const person = now.admins[Number(await ask("\n본인 줄의 번호 (끝내려면 Enter): ")) - 1];
    if (!person) throw stop("끝냈습니다. 바뀐 것은 없습니다.");
    if (!person.has_login)
      throw stop("이 관리자는 로그인이 끊겨 있습니다. 계정재연결.cmd를 실행하세요. 바뀐 것은 없습니다.");
    if (person.status && person.status !== "approved")
      console.log(`주의: 승인 상태가 ${person.status}라서 비밀번호를 바꿔도 로그인이 막힐 수 있습니다.`);
    const login = displayLoginId(person.login!);
    console.log(`\n로그인 아이디 ${login} 의 비밀번호만 새로 정합니다. 역할과 기록은 그대로입니다.`);
    console.log("다른 사람의 계정이면 멈추고, 그 관리자에게 재설정을 부탁하세요.");
    if ((await ask("본인 계정이 맞으면 RESET 입력: ")) !== "RESET")
      throw stop("취소했습니다. 바뀐 것은 없습니다.");
    const password = await ask("새 비밀번호 (10~128자, 화면에 안 보임): ", true);
    if (password.length < 10 || password.length > 128)
      throw stop("비밀번호는 10~128자여야 합니다. 바뀐 것은 없습니다.");
    if ((await ask("비밀번호 다시 입력: ", true)) !== password)
      throw stop("두 비밀번호가 다릅니다. 바뀐 것은 없습니다.");
    const passwordHash = await hashPassword(password);
    await sql.begin((tx) =>
      setAdminPassword(wrap(tx), { actorId: person.actor_id, passwordHash }),
    );
    console.log(`\n완료: 아이디 ${login} 와 새 비밀번호로 로그인하세요.`);
  }
} catch (error) {
  const { code, message } = error as { code?: string; message: string };
  console.error(
    code === "stopped"
      ? message
      : `처리하지 못했습니다. 바뀐 것은 없습니다. (${message.split("\n")[0]})`,
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
if (createFirst) {
  // Same process and terminal, so the address is not pasted twice.
  process.env.DATABASE_URL = url;
  await import("./first-admin.mjs");
}
