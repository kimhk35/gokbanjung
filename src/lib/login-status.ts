import { canManageRecords } from "./access";
import type { Actor, Lang } from "./types";

export function loginStatus(actor: Actor | null | undefined, lang: Lang) {
  const role = canManageRecords(actor) ? actor!.role : "GUEST";
  const labels = {
    ADMIN: { ko: "관리자", en: "Administrator" },
    TEACHER: { ko: "교사", en: "Teacher" },
    MEMBER: { ko: "승인회원", en: "Approved member" },
    GUEST: { ko: "게스트", en: "Guest" },
    TEACHER_PENDING: { ko: "게스트", en: "Guest" },
  };
  const name =
    actor?.nickname.trim() || (lang === "ko" ? "이름 미입력" : "unnamed");
  return `${labels[role][lang]}${lang === "ko" ? "" : " "}(${name})`;
}
