import type { Actor } from "./types";
export function canManageRecords(a: Actor | null | undefined) {
  return (
    !!a &&
    a.kind === "user" &&
    ["MEMBER", "TEACHER", "ADMIN"].includes(a.role) &&
    (!a.account_status || a.account_status === "approved")
  );
}
