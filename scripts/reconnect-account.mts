// Reconnects a former (Supabase-era) account to its existing records with a new
// ID and password. Run by the database operator after confirming the owner:
//   npm run account:reconnect
// The password is typed hidden and never printed or passed as an argument.
import { existsSync } from "node:fs";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { ask } from "./terminal-input.mjs";
import { parseDatabaseUrl } from "./database-url.mjs";
import {
  reconnectAccount,
  reconnectCandidates,
} from "../src/lib/account-reconnect";
import type { DB } from "../src/lib/db";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const parsed = parseDatabaseUrl(
  process.env.DATABASE_URL || (await ask("DATABASE_URL (hidden): ", true)),
);
if (parsed.error || !parsed.url) throw new Error(parsed.error || "DATABASE_URL");
const url = parsed.url;
console.log("연결할 곳 / Database host:", parsed.host);
const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: parsed.host === "localhost" ? false : "require",
});
const wrap = (tx: postgres.TransactionSql): DB => ({
  query: async (text, params = []) =>
    (await tx.unsafe(text, params as never[])) as never,
});
try {
  const people = (await sql.begin((tx) =>
    reconnectCandidates(wrap(tx)),
  )) as Awaited<ReturnType<typeof reconnectCandidates>>;
  if (!people.length) {
    console.log("다시 연결할 계정이 없습니다. / No accounts need reconnecting.");
    process.exit(0);
  }
  console.log("\n로그인이 끊긴 기존 계정 / Former accounts without a sign-in:");
  people.forEach((p, i) =>
    console.log(
      `${String(i + 1).padStart(3)}. ${p.nickname || "(이름 없음)"}  ${p.role}  상태:${p.status || "-"}  예전 아이디:${p.former_login?.split("@")[0] || "-"}  (${p.actor_id.slice(0, 8)})`,
    ),
  );
  const choice = Number(await ask("\n연결할 번호 / Number: "));
  const person = people[choice - 1];
  if (!person) throw new Error("번호가 올바르지 않습니다.");
  const suggested = person.former_login?.endsWith("@accounts.gokbanjeong.invalid")
    ? person.former_login.split("@")[0]
    : "";
  const login =
    (await ask(
      `새 아이디 (영문·숫자·밑줄 4~24자)${suggested ? ` [Enter = ${suggested}]` : ""}: `,
    )) || suggested;
  console.log(
    `\n${person.nickname} (${person.role}) → 아이디 ${login.toLowerCase()}\n기존 기록·역할·승인 상태는 그대로 두고 로그인만 새로 연결합니다.`,
  );
  if ((await ask("계정 주인을 확인했으면 RECONNECT 입력: ")) !== "RECONNECT")
    throw Object.assign(new Error("cancelled"), { code: "cancelled" });
  const password = await ask("새 비밀번호 (10~128자, 화면에 안 보임): ", true);
  if (password.length < 10 || password.length > 128)
    throw new Error("비밀번호는 10~128자여야 합니다.");
  if ((await ask("비밀번호 다시 입력: ", true)) !== password)
    throw new Error("두 비밀번호가 다릅니다.");
  const passwordHash = await hashPassword(password);
  const done = await sql.begin((tx) =>
    reconnectAccount(wrap(tx), {
      actorId: person.actor_id,
      login,
      passwordHash,
    }),
  );
  console.log(
    `완료: ${person.nickname}님은 아이디 ${done.email.split("@")[0]}로 로그인할 수 있습니다. 임시 비밀번호라면 로그인 후 바로 변경하도록 안내하세요.`,
  );
} catch (error) {
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    already_connected: "이미 로그인할 수 있는 계정입니다. 바꾸지 않았습니다.",
    username_taken: "이미 사용 중인 아이디입니다. 다른 아이디로 다시 실행하세요.",
    invalid_transition: "게스트 기록은 재연결 대상이 아닙니다.",
    cancelled: "취소했습니다. 바뀐 것은 없습니다.",
  };
  console.error(
    (code && messages[code]) ||
      `재연결하지 못했습니다. 바뀐 것은 없습니다. (${(error as Error).message.split("\n")[0]})`,
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
