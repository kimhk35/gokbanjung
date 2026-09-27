"use client";
import { displayLoginId } from "@/lib/login-id";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "../provider";
type Request = {
  user_id: string;
  email: string;
  nickname: string;
  status: string;
};
export function AccountApprovals() {
  const { t, error } = useApp();
  const [rows, setRows] = useState<Request[]>([]),
    [busy, setBusy] = useState(false);
  const load = () => api<Request[]>("account-requests").then(setRows);
  useEffect(() => {
    load().catch(error);
  }, []);
  return (
    <section>
      <h2>{t("기록 관리 로그인 승인", "Record-management access approval")}</h2>
      <p>
        {t(
          "승인·거절·정지는 관리자만 처리할 수 있습니다. 정지는 다음 요청부터 적용됩니다.",
          "Only administrators may approve, reject, or suspend access. Suspension applies on the next request.",
        )}
      </p>
      {!rows.length && <p>{t("신청 내역이 없습니다.", "No requests yet.")}</p>}
      {rows.map((r) => (
        <article className="panel" key={r.user_id}>
          <h3>{r.nickname}</h3>
          <p>
            {displayLoginId(r.email)} ·{" "}
            {t(
              (
                {
                  pending: "대기",
                  approved: "승인",
                  rejected: "거절",
                  suspended: "정지",
                } as Record<string, string>
              )[r.status],
              r.status,
            )}
          </p>
          <div className="actions">
            {(["approved", "rejected", "suspended"] as const).map((status) => (
              <button
                className="button secondary"
                key={status}
                disabled={busy || r.status === status}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("approve-account", {
                      user_id: r.user_id,
                      status,
                    });
                    await load();
                  } catch (e) {
                    error(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t(
                  { approved: "승인", rejected: "거절", suspended: "정지" }[
                    status
                  ],
                  status,
                )}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
