import { canManageRecords } from "./access";
import { translate, type UiLang } from "./i18n";
import type { Actor } from "./types";

export function loginStatus(actor: Actor | null | undefined, ui: UiLang) {
  const role = canManageRecords(actor) ? actor!.role : "GUEST";
  const labels = {
    ADMIN: ["관리자", "Administrator"],
    TEACHER: ["교사", "Teacher"],
    MEMBER: ["승인회원", "Approved member"],
    GUEST: ["게스트", "Guest"],
    TEACHER_PENDING: ["게스트", "Guest"],
  } as const;
  const [ko, en] = labels[role];
  const name =
    actor?.nickname.trim() || translate(ui, "이름 미입력", "unnamed");
  // Korean writes the name right after the role; the others add a space.
  return `${translate(ui, ko, en)}${ui === "ko" ? "" : " "}(${name})`;
}
