"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { ORGANIZATIONS } from "@/lib/ward-model";

type Data = {
  users: { id: string; nickname: string; role: string }[];
  managers: { actor_id: string; organization: string }[];
};
export function EventManagers() {
  const { t, lang, error } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(
    () => api<Data>("ward/managers").then(setData).catch(error),
    [error],
  );
  useEffect(() => {
    load();
  }, [load]);
  const toggle = async (
    actor_id: string,
    organization: string,
    enabled: boolean,
  ) => {
    try {
      await api("ward/manager", { actor_id, organization, enabled });
      await load();
    } catch (e) {
      error(e);
    }
  };
  if (!data) return <div className="skeleton" />;
  return (
    <div className="event-managers">
      <p className="muted">
        {t(
          "체크한 조직의 와드 일정을 작성·게시할 수 있습니다. '전 회원'은 모든 조직을 관리합니다. 관리자는 항상 모든 일정을 관리합니다.",
          "Checked people can write and publish events for that organization. 'All members' covers every organization. Administrators can always manage all events.",
        )}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("이름", "Name")}</th>
              {ORGANIZATIONS.map(([id, ko, en]) => (
                <th key={id}>{t(ko, en)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users
              .filter((u) => u.role !== "ADMIN")
              .map((u) => (
                <tr key={u.id}>
                  <td>{u.nickname}</td>
                  {ORGANIZATIONS.map(([id]) => {
                    const on = data.managers.some(
                      (m) => m.actor_id === u.id && m.organization === id,
                    );
                    return (
                      <td key={id}>
                        <input
                          type="checkbox"
                          aria-label={`${u.nickname} ${id}`}
                          checked={on}
                          onChange={() => toggle(u.id, id, !on)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
