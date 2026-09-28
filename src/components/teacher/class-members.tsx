"use client";
import { useEffect, useState } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { currentWeek } from "@/lib/curriculum";
import { loginStatus } from "@/lib/login-status";
import type { Actor } from "@/lib/types";
import { WeekPicker } from "../learning/learn";

type Member = Actor & {
  teacher_name: string | null;
  completed_days: number;
  week_days: number;
  completed_weeks: number;
  submissions: number;
  week_submissions: number;
  quiz_attempts: number;
  quiz_accuracy: number | null;
  last_completed_at: string | null;
  progress: { week: number; days: number }[];
};
type Data = { members: Member[]; teachers: { id: string; nickname: string }[] };
export function ClassMembers() {
  const { locale, boot, t, uiLang, error } = useApp();
  const [week, setWeek] = useState(currentWeek()?.number || 38);
  const [teacher, setTeacher] = useState("all");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{
    key: string;
    data: Data | null;
    failed: boolean;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const admin = boot?.actor.role === "ADMIN";
  const allowed =
    boot?.actor.kind === "user" &&
    ["TEACHER", "ADMIN"].includes(boot.actor.role);
  const requestKey = `${boot?.actor.id}:${boot?.actor.role}:${week}:${teacher}:${refresh}`;
  const data = result?.key === requestKey ? result.data : null;
  const failed = result?.key === requestKey && result.failed;
  useEffect(() => {
    let active = true;
    if (allowed)
      api<Data>(`class-members?week=${week}&teacher=${admin ? teacher : "all"}`)
        .then((value) => {
          if (active)
            setResult({ key: requestKey, data: value, failed: false });
        })
        .catch((cause) => {
          if (active) {
            setResult({ key: requestKey, data: null, failed: true });
            error(cause);
          }
        });
    return () => {
      active = false;
    };
  }, [allowed, admin, requestKey, week, teacher, error]);
  if (!allowed) return null;
  const members =
    data?.members.filter((m) =>
      m.nickname
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    ) || [];
  const all = data?.members || [];
  const days = all.reduce((sum, m) => sum + m.week_days, 0);
  return (
    <section className="panel">
      <h2>
        {admin
          ? t("전체 반원관리 · 학습 통계", "All members · Learning statistics")
          : t("내 반원관리", "My class members")}
      </h2>
      <p>
        {t(
          "담당 교사로 선택한 반원의 학습 완료와 제출 현황을 확인합니다. 개인 묵상 내용은 표시되지 않습니다.",
          "View learning completion and submissions for assigned members. Private reflection text is not shown.",
        )}
      </p>
      <div className="actions">
        <WeekPicker week={week} onChange={setWeek} />
        <button
          className="button secondary"
          onClick={() => setRefresh((v) => v + 1)}
        >
          {t("새로고침", "Refresh")}
        </button>
      </div>
      {admin && (
        <label className="field">
          {t("담당 교사", "Assigned teacher")}
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="all">{t("전체 반원", "All members")}</option>
            <option value="unassigned">{t("교사 미선택", "Unassigned")}</option>
            {boot?.teachers.map((v) => (
              <option value={v.id} key={v.id}>
                {v.nickname}
              </option>
            ))}
          </select>
        </label>
      )}
      {!data ? (
        <p role="status">
          {failed
            ? t(
                "불러오지 못했습니다. 새로고침을 눌러 주세요.",
                "Unable to load. Please refresh.",
              )
            : t("반원 정보를 불러오는 중…", "Loading members…")}
        </p>
      ) : (
        <>
          <div className="stats">
            <div>
              <strong>{all.length}</strong>
              <span>{t("반원", "Members")}</span>
            </div>
            <div>
              <strong>{all.filter((m) => m.week_days > 0).length}</strong>
              <span>
                {t(
                  "선택 주차 학습 완료 기록이 있는 반원",
                  "Members with completions this week",
                )}
              </span>
            </div>
            <div>
              <strong>
                {all.length ? Math.round((days / (all.length * 7)) * 100) : 0}%
              </strong>
              <span>
                {t(
                  "선택 주차 평균 완료율 (7일 기준)",
                  "Average week completion (7 days)",
                )}
              </span>
            </div>
            <div>
              <strong>
                {all.reduce((sum, m) => sum + m.week_submissions, 0)}
              </strong>
              <span>
                {t("선택 주차 제출 활동지", "Worksheets submitted this week")}
              </span>
            </div>
          </div>
          <label className="field">
            {t("닉네임 검색", "Search nickname")}
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {!members.length ? (
            <p>
              {t(
                "표시할 반원이 없습니다. 반원은 내 기록 관리의 담당 교사에서 교사를 선택할 수 있습니다.",
                "No matching members. Members can choose their teacher in Manage my records.",
              )}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      t("반원", "Member"),
                      ...(admin ? [t("담당 교사", "Teacher")] : []),
                      t("선택 주차 완료", "Week completion"),
                      t("누적 학습 완료", "Total completed days"),
                      t("누적 활동지 제출", "Total submissions"),
                      t("누적 퀴즈", "All quiz attempts"),
                      t("최근 학습 완료일", "Last completion"),
                      t("주차별 보기", "By week"),
                    ].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">{loginStatus(m, uiLang)}</th>
                      {admin && (
                        <td>{m.teacher_name || t("미선택", "Unassigned")}</td>
                      )}
                      <td>
                        <progress
                          max={7}
                          value={m.week_days}
                          aria-label={t("{nickname} 선택 주차 학습 완료", "{nickname}: selected week completion", { nickname: m.nickname })}
                        />
                        <br />
                        {m.week_days}/7
                      </td>
                      <td>
                        {m.completed_days}
                        {t("일", " days")}
                        <br />
                        <small>
                          {m.completed_weeks}
                          {t("주 전체 완료", " fully completed weeks")}
                        </small>
                      </td>
                      <td>{m.submissions}</td>
                      <td>
                        {m.quiz_attempts}
                        {t("회", " attempts")}
                        <br />
                        <small>
                          {t("정답률 ", "Accuracy ")}
                          {m.quiz_accuracy === null
                            ? "—"
                            : `${m.quiz_accuracy}%`}
                        </small>
                      </td>
                      <td>
                        {m.last_completed_at
                          ? new Date(m.last_completed_at).toLocaleDateString(
                              locale,
                              { timeZone: "Asia/Seoul" },
                            )
                          : "—"}
                      </td>
                      <td>
                        <details>
                          <summary>
                            {t("주차별 현황", "Weekly progress")}
                          </summary>
                          <div className="member-week-progress">
                            {Array.from({ length: 52 }, (_, i) => i + 1).map(
                              (w) => (
                                <span key={w}>
                                  {t("{w}주", "W{w}", { w })} ·{" "}
                                  {m.progress.find((p) => p.week === w)?.days ||
                                    0}
                                  /7
                                </span>
                              ),
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted">
            {t(
              "학습 완료는 ‘학습 완료’로 저장한 기록을 기준으로 합니다. 퀴즈 정답률은 누적 정답 수 ÷ 누적 문항 수이며, 응시 기록이 없으면 —로 표시됩니다.",
              "Completion counts saved learning completions. Quiz accuracy is total correct answers divided by total questions; — means no attempts.",
            )}
          </p>
        </>
      )}
    </section>
  );
}
