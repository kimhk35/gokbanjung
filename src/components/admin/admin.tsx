"use client";
import { MaterialLibrary } from "../teacher/material-library";
import { ClassMembers } from "../teacher/class-members";
import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useApp } from "../provider";
import { PageTitle, Empty } from "../learning/learn";
import { LoginForm } from "../teacher/teacher";
import { api } from "@/lib/client";
import { currentWeek } from "@/lib/curriculum";
import { AnnouncementManager } from "../announcement-manager";
import { AiResult } from "../teacher/ai-result";
import { parseAiContent } from "@/lib/ai-content";
import { PasswordManagement } from "./password-management";
import { displayLoginId } from "@/lib/login-id";
import { Confirm } from "../ui/dialog";
import { AccountApprovals } from "./account-approvals";
import { EventManagers } from "./event-managers";
type AdminData = {
  applications: {
    id: string;
    name: string;
    email: string;
    ward: string;
    message: string;
    status: string;
  }[];
  usage: {
    feature: string;
    calls: number;
    status: string;
    tokens_input: number;
    tokens_output: number;
  }[];
  resources: { id: string; name: string; status: string }[];
  settings: { key: string; value: unknown }[];
  versions: {
    id: string;
    kind: string;
    record_id: string;
    created_at: string;
  }[];
  ai: {
    id: string;
    week: number;
    feature: string;
    language: string;
    content: { questions?: string[] };
    status: "generated" | "edited" | "approved" | "published";
    created_at: string;
  }[];
};
export function AdminPage() {
  const { locale, t, lang, boot, error, notify, reload } = useApp();
  const [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [moderation, setModeration] = useState("automatic");
  const [upload, setUpload] = useState<File | null>(null);
  const [week, setWeek] = useState(currentWeek()?.number || 38);
  const [audience, setAudience] = useState("adult");
  const [questionType, setQuestionType] = useState("reflection");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [aiCheck, setAiCheck] = useState("");
  const allowed = boot?.actor.role === "ADMIN";
  const load = () =>
    api<AdminData>("admin").then((d) => {
      setData(d);
      setModeration(
        String(
          d.settings.find((s) => s.key === "moderation")?.value || "automatic",
        ),
      );
    });
  useEffect(() => {
    if (allowed) load().catch(error);
  }, [allowed]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
      notify(t("처리했습니다.", "Updated."));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    setBusy(true);
    try {
      await api("auth/logout", {});
      await reload();
      notify(t("관리자 로그아웃을 완료했습니다.", "You have signed out."));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow={t("관리자", "ADMINISTRATOR")}
        title={t("안심하고 배울 수 있는 공간", "A trusted place to learn")}
        description={t(
          "교사 승인, 교재 검토, 공개 설정을 관리합니다.",
          "Manage teacher approval, course materials, and publication settings.",
        )}
      />
      {!allowed ? (
        <>
          <LoginForm />
          {boot?.actor.kind === "user" && (
            <p className="notice">
              {t(
                "관리자 권한이 필요한 화면입니다.",
                "Administrator access is required.",
              )}
            </p>
          )}
        </>
      ) : (
        <Tabs.Root defaultValue="teachers">
          <div className="admin-session-actions">
            <span className="badge">
              {t("관리자 로그인 중", "Administrator signed in")}
            </span>
            <button className="text-button" disabled={busy} onClick={signOut}>
              {t("관리자 로그아웃", "Sign out")}
            </button>
          </div>
          <Tabs.List className="tabs">
            {[
              ["teachers", "교사 승인", "Teacher approval"],
              ["ward-managers", "일정 담당자", "Calendar managers"],
              ["members", "반원관리 · 학습 통계", "Members · Statistics"],
              ["lesson-library", "공과자료실", "Lesson library"],
              ["accounts", "로그인 승인", "Account approval"],
              ["materials", "교재 · 콘텐츠", "Materials"],
              ["ai", "AI 질문 생성", "AI questions"],
              ["usage", "AI 사용량", "AI usage"],
              ["settings", "설정", "Settings"],
              ["announcements", "공지 관리", "Announcements"],
            ].map(([id, ko, en]) => (
              <Tabs.Trigger key={id} value={id}>
                {t(ko, en)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="ward-managers">
            <EventManagers />
          </Tabs.Content>
          <Tabs.Content value="members">
            <ClassMembers />
          </Tabs.Content>
          <Tabs.Content value="lesson-library">
            <MaterialLibrary />
          </Tabs.Content>
          <Tabs.Content value="announcements">
            <AnnouncementManager />
          </Tabs.Content>
          <Tabs.Content value="accounts">
            <AccountApprovals />
            <PasswordManagement />
          </Tabs.Content>
          <Tabs.Content value="teachers">
            <section className="panel teacher-creator">
              <span className="overline">
                {t("교사 계정 생성", "CREATE TEACHER")}
              </span>
              <h2>
                {t(
                  "교사 계정을 만들고 바로 승인하기",
                  "Create and approve a teacher account",
                )}
              </h2>
              <p>
                {t(
                  "관리자가 만든 계정은 즉시 교사 권한을 받습니다. 설정한 임시 비밀번호는 안전한 방법으로 해당 교사에게 전달해 주세요.",
                  "Accounts created here receive teacher access immediately. Share the password with the teacher through a secure channel.",
                )}
              </p>
              <form
                className="teacher-create-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await api("admin/create-teacher", {
                      username: teacherEmail,
                      password: teacherPassword,
                    });
                    setTeacherEmail("");
                    setTeacherPassword("");
                  });
                }}
              >
                <label className="field">
                  {t("아이디", "User ID")}
                  <input
                    required
                    type="text"
                    minLength={4}
                    maxLength={24}
                    pattern="[A-Za-z0-9_]+"
                    autoComplete="off"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                  />
                </label>
                <label className="field">
                  {t("임시 비밀번호", "Temporary password")}
                  <input
                    required
                    type="password"
                    minLength={10}
                    autoComplete="new-password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                  />
                  <small
                    className={
                      teacherPassword.length > 0 && teacherPassword.length < 10
                        ? "field-help field-help-error"
                        : "field-help"
                    }
                  >
                    {teacherPassword.length > 0 && teacherPassword.length < 10
                      ? t(
                          `현재 ${teacherPassword.length}자 · 10자 이상 입력해 주세요.`,
                          `Currently ${teacherPassword.length} characters · use at least 10.`,
                        )
                      : t(
                          "10자 이상으로 설정해 교사에게 안전하게 전달해 주세요.",
                          "Use 10 or more characters and share it securely with the teacher.",
                        )}
                  </small>
                </label>
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    teacherEmail.trim().length < 4 ||
                    teacherPassword.length < 10
                  }
                >
                  {t("교사 생성 · 승인", "Create & approve teacher")}
                </button>
              </form>
            </section>
            {data?.applications.length ? (
              data.applications.map((a) => (
                <article className="panel" key={a.id}>
                  <div className="section-heading">
                    <h2>{a.name}</h2>
                    <span className="badge">
                      {t(
                        (
                          {
                            pending: "승인 대기",
                            approved: "승인",
                            rejected: "거절",
                            suspended: "정지",
                          } as Record<string, string>
                        )[a.status],
                        a.status,
                      )}
                    </span>
                  </div>
                  <p>
                    {t("아이디: ", "ID: ")}
                    {displayLoginId(a.email)} · {a.ward}
                  </p>
                  <p>{a.message}</p>
                  <div className="actions">
                    {[
                      ["approved", "승인", "Approve"],
                      ["rejected", "거절", "Reject"],
                      ["suspended", "권한 정지", "Suspend"],
                    ].map(([status, ko, en]) => (
                      <button
                        key={status}
                        className={`button ${status === "approved" ? "primary" : "secondary"}`}
                        disabled={busy || status === a.status}
                        onClick={() =>
                          run(() =>
                            api("approve-teacher", { id: a.id, status }),
                          )
                        }
                      >
                        {t(ko, en)}
                      </button>
                    ))}
                    <Confirm
                      trigger={
                        <button className="button danger" disabled={busy}>
                          {t("교사 제거", "Remove teacher")}
                        </button>
                      }
                      title={t(
                        `${a.name} 교사를 제거할까요?`,
                        `Remove ${a.name} as a teacher?`,
                      )}
                      description={t(
                        "교사 권한과 신청 목록에서 제거합니다. 개인 학습 기록과 기존 제출물은 보존됩니다.",
                        "Remove teaching access and the application. Personal learning records and existing submissions are preserved.",
                      )}
                      onConfirm={() =>
                        run(() =>
                          api("remove-teacher", {
                            id: a.id,
                            confirm: "REMOVE",
                          }),
                        )
                      }
                    />
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title={t(
                  "대기 중인 교사 신청이 없습니다.",
                  "No teacher applications yet.",
                )}
              />
            )}
          </Tabs.Content>
          <Tabs.Content value="materials">
            <section className="panel">
              <h2>{t("새 교재 업로드", "Upload new materials")}</h2>
              <p>
                {t(
                  "PDF · DOCX · PPTX · TXT · MD, 최대 4MB. 텍스트가 없는 스캔 PDF는 먼저 OCR 처리해 주세요.",
                  "PDF · DOCX · PPTX · TXT · MD, up to 4 MB. Scanned PDFs need OCR first.",
                )}
              </p>
              <label className="field">
                {t("파일 선택", "Select file")}
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={(e) => setUpload(e.target.files?.[0] || null)}
                />
              </label>
              <button
                disabled={!upload || busy}
                className="button primary"
                onClick={() =>
                  run(async () => {
                    const form = new FormData();
                    form.set("file", upload!);
                    const r = await fetch("/api/upload", {
                      method: "POST",
                      body: form,
                    });
                    if (!r.ok) throw new Error("upload_failed");
                    setUpload(null);
                  })
                }
              >
                {t("업로드 · 텍스트 추출", "Upload & extract text")}
              </button>
            </section>
            {data?.resources.map((r) => (
              <article className="panel" key={r.id}>
                <h3>{r.name}</h3>
                <span className="badge">
                  {t("검토 대기", "Awaiting review")}
                </span>
                <button
                  className="button secondary"
                  disabled={busy || !boot?.aiAvailable}
                  onClick={() =>
                    run(() =>
                      api("ai", {
                        feature: "curriculum",
                        week: currentWeek()?.number || 38,
                        language: lang,
                        resource_id: r.id,
                      }),
                    )
                  }
                >
                  {t("AI로 구조 분석", "Analyze structure with AI")}
                </button>
              </article>
            ))}
            <p className="notice">
              {t(
                "AI 분석 결과는 교사 화면의 AI 자료에서 검토합니다. 날짜와 경전 범위는 원문과 대조한 후 주차별 편집 화면에서 반영하세요.",
                "Review AI analysis in the teacher workspace. Compare dates and readings with the source before editing the course.",
              )}
            </p>
            <h2>{t("콘텐츠 수정 이력", "Content version history")}</h2>
            {data?.versions.map((v) => (
              <p key={v.id}>
                {v.kind} · {v.record_id} ·{" "}
                {new Date(v.created_at).toLocaleString(locale)}
              </p>
            ))}
            <a className="button secondary" href="/api/backup">
              {t("교육과정 백업 내려받기", "Download course backup")}
            </a>
          </Tabs.Content>
          <Tabs.Content value="ai">
            <section className="panel">
              <h2>{t("AI 연결 확인", "Check AI connection")}</h2>
              <p>
                {t(
                  "현재 배포에 저장된 키와 모델로 짧은 응답을 요청합니다. 소량의 API 사용료가 발생합니다.",
                  "Request a short response with this deployment’s key and model. A small API usage charge applies.",
                )}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setAiCheck("");
                  run(async () => {
                    const result = await api<{ model: string }>(
                      "admin/ai-check",
                      {},
                    );
                    setAiCheck(
                      t(
                        `연결 성공 · ${result.model}`,
                        `Connected · ${result.model}`,
                      ),
                    );
                    await reload();
                  });
                }}
              >
                {t("실제 AI 연결 확인", "Test live AI connection")}
              </button>
              {aiCheck && <p role="status">{aiCheck}</p>}
            </section>
            <section className="panel">
              <h2>
                {t(
                  "관리자용 AI 질문 생성",
                  "Administrator AI question generator",
                )}
              </h2>
              <p>
                {t(
                  "해당 주차의 교재 범위를 바탕으로 질문 초안을 만듭니다. 생성 결과는 검토 후에만 학습자에게 게시됩니다.",
                  "Create a question draft from the selected week. It is shown to learners only after review and publication.",
                )}
              </p>
              <div className="two-col">
                <label className="field">
                  {t("주차", "Week")}
                  <select
                    value={week}
                    onChange={(e) => setWeek(Number(e.target.value))}
                  >
                    {Array.from({ length: 52 }, (_, index) => index + 1).map(
                      (number) => (
                        <option key={number} value={number}>
                          {t(`${number}주차`, `Week ${number}`)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  {t("학습 대상", "Audience")}
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  >
                    <option value="adult">{t("성인", "Adults")}</option>
                    <option value="youth">{t("청소년", "Youth")}</option>
                    <option value="family">{t("가족", "Families")}</option>
                  </select>
                </label>
                <label className="field">
                  {t("질문 유형", "Question type")}
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                  >
                    <option value="understanding">
                      {t("이해", "Understanding")}
                    </option>
                    <option value="reflection">
                      {t("성찰", "Reflection")}
                    </option>
                    <option value="application">
                      {t("적용", "Application")}
                    </option>
                    <option value="discussion">
                      {t("토론", "Discussion")}
                    </option>
                  </select>
                </label>
              </div>
              <button
                className="button primary"
                disabled={busy || !boot?.aiAvailable}
                onClick={() =>
                  run(() =>
                    api("ai", {
                      feature: "questions",
                      week,
                      language: lang,
                      audience,
                      questionType,
                    }),
                  )
                }
              >
                {t("AI 질문 5개 생성", "Generate 5 AI questions")}
              </button>
              {!boot?.aiAvailable && (
                <p className="notice">
                  {t(
                    "AI 키를 현재 배포에서 찾지 못했습니다. Vercel의 OPENAI_API_KEY 또는 OPEN_API_KEY 값을 확인한 뒤 다시 배포해 주세요.",
                    "The current deployment cannot find OPENAI_API_KEY or OPEN_API_KEY. Check the Vercel value and redeploy.",
                  )}
                </p>
              )}
            </section>
            {data?.ai
              .filter((item) => item.feature === "questions")
              .map((item) => (
                <article className="panel" key={item.id}>
                  <div className="section-heading">
                    <h3>
                      {t(
                        `${item.week}주차 질문 초안`,
                        `Week ${item.week} question draft`,
                      )}
                    </h3>
                    <span className="badge">
                      {
                        {
                          generated: t("생성 완료", "Generated"),
                          edited: t("검토 완료", "Reviewed"),
                          approved: t("승인됨", "Approved"),
                          published: t("게시됨", "Published"),
                        }[item.status]
                      }
                    </span>
                  </div>
                  <AiResult feature={item.feature} content={item.content} />
                  <div className="actions">
                    {item.status === "generated" && (
                      <button
                        className="button secondary"
                        disabled={
                          busy || !parseAiContent(item.feature, item.content)
                        }
                        onClick={() =>
                          run(() =>
                            api("ai-review", { id: item.id, status: "edited" }),
                          )
                        }
                      >
                        {t("검토 완료", "Mark reviewed")}
                      </button>
                    )}
                    {item.status === "edited" && (
                      <button
                        className="button secondary"
                        disabled={
                          busy || !parseAiContent(item.feature, item.content)
                        }
                        onClick={() =>
                          run(() =>
                            api("ai-review", {
                              id: item.id,
                              status: "approved",
                            }),
                          )
                        }
                      >
                        {t("승인", "Approve")}
                      </button>
                    )}
                    {item.status === "approved" && (
                      <button
                        className="button primary"
                        disabled={
                          busy || !parseAiContent(item.feature, item.content)
                        }
                        onClick={() =>
                          run(() =>
                            api("ai-review", {
                              id: item.id,
                              status: "published",
                            }),
                          )
                        }
                      >
                        {t("학습자에게 게시", "Publish to learners")}
                      </button>
                    )}
                  </div>
                </article>
              ))}
          </Tabs.Content>
          <Tabs.Content value="usage">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      t("기능", "Feature"),
                      t("결과", "Status"),
                      t("호출 수", "Calls"),
                      t("입력 토큰", "Input tokens"),
                      t("출력 토큰", "Output tokens"),
                    ].map((s) => (
                      <th key={s}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.usage.map((u, i) => (
                    <tr key={i}>
                      <td>{u.feature}</td>
                      <td>{u.status}</td>
                      <td>{u.calls}</td>
                      <td>{u.tokens_input || 0}</td>
                      <td>{u.tokens_output || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              {t(
                "비용은 실제 사용 모델의 단가에 따라 달라집니다. 원문 묵상은 사용량 로그에 저장하지 않습니다.",
                "Costs depend on the configured model. Usage logs never store private reflection text.",
              )}
            </p>
          </Tabs.Content>
          <Tabs.Content value="settings">
            <section className="panel">
              <h2>{t("생각벽 공개 방식", "Thought wall publication")}</h2>
              <label className="field">
                {t("공개 방식", "Publication mode")}
                <select
                  value={moderation}
                  onChange={(e) => setModeration(e.target.value)}
                >
                  <option value="automatic">
                    {t("자동 공개", "Publish automatically")}
                  </option>
                  <option value="review">
                    {t("교사 승인 후 공개", "Require teacher approval")}
                  </option>
                </select>
              </label>
              <button
                className="button primary"
                onClick={() => run(() => api("settings", { moderation }))}
              >
                {t("설정 저장", "Save settings")}
              </button>
            </section>
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  );
}
