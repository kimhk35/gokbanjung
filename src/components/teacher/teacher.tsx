"use client";
import { MaterialLibrary } from "./material-library";
import { ClassMembers } from "./class-members";

import { AiResult } from "./ai-result";
import { decodeJsonContainer } from "@/lib/json-data";
import { AnnouncementManager } from "../announcement-manager";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { PageTitle, WeekPicker, Empty } from "../learning/learn";
import { Modal } from "../ui/dialog";
import { currentWeek, fields } from "@/lib/curriculum";
import type { Submission, Localized } from "@/lib/types";
import { WorksheetEditor } from "./worksheet-editor";
import { Translated } from "../community/wall";
export function LoginForm() {
  const { t, boot, error, reload, notify } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await api("auth/login", { username: email, password });
      await reload();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel login">
      <h2>{t("승인된 계정 로그인", "Approved account sign-in")}</h2>
      <p>
        {t(
          "일반 참여자는 로그인 없이 학습할 수 있습니다. 기존 이메일 계정은 이메일로 로그인하세요.",
          "Participants can learn without signing in. Existing email accounts can still sign in with their email.",
        )}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="field">
          {t("아이디", "User ID")}
          <input
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          {t("비밀번호", "Password")}
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="button primary"
            disabled={busy || !boot?.authAvailable}
          >
            {t("로그인", "Sign in")}
          </button>
          <Link
            className="button secondary"
            href="/account#account-application"
          >
            {t("계정 가입 · 승인 신청", "Register · request approval")}
          </Link>
        </div>
      </form>
      {!boot?.authAvailable && (
        <p className="notice">
          {t(
            "교사 로그인 연결이 아직 설정되지 않았습니다.",
            "Teacher sign-in is not configured yet.",
          )}
        </p>
      )}
      <p>
        {t(
          "비밀번호를 잊으셨다면 관리자에게 초기화를 요청해 주세요.",
          "Ask the administrator to reset a forgotten password.",
        )}
      </p>
      <Link className="button secondary" href="/teacher/apply">
        {t("교사 아이디 신청", "Apply for a teacher ID")}
      </Link>
    </section>
  );
}
export { TeacherApply } from "./teacher-application";

type AIRecord = {
  id: string;
  week: number;
  feature: string;
  content: Record<string, unknown>;
  status: string;
  language: string;
};
type TeacherData = {
  submissions: Submission[];
  questions: { id: string; week: number; content: string; response: string }[];
  reports: {
    id: string;
    reason: string;
    content_id: string;
    content_type: string;
    status: string;
  }[];
  notes: {
    id: string;
    content: string;
    status: string;
    is_pinned: boolean;
    week: number;
  }[];
  ai: AIRecord[];
};
export function TeacherPage() {
  const { t, lang, boot, error, notify, reload, weeks } = useApp();
  const [week, setWeek] = useState(currentWeek()?.number || 38);
  const [data, setData] = useState<TeacherData | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [mode, setMode] = useState("POST_BEFORE_VIEW");
  const [deadline, setDeadline] = useState("");
  const [audience, setAudience] = useState("adult");
  const [questionType, setQuestionType] = useState("reflection");
  const [busy, setBusy] = useState(false);
  const [editAI, setEditAI] = useState<AIRecord | null>(null);
  const [json, setJson] = useState("");
  const [weekKo, setWeekKo] = useState("");
  const [weekEn, setWeekEn] = useState("");
  const allowed =
    boot?.actor.role === "TEACHER" || boot?.actor.role === "ADMIN";
  const load = () => api<TeacherData>("teacher").then(setData);
  useEffect(() => {
    if (allowed) load().catch(error);
  }, [boot]);
  useEffect(() => {
    const w = weeks.find((w) => w.number === week);
    setWeekKo(w?.title.ko || "");
    setWeekEn(w?.title.en || "");
  }, [week, allowed, weeks]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
      notify(t("저장했습니다.", "Saved."));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow={t("교사 학습관리", "TEACHER WORKSPACE")}
        title={t(
          "함께 배우는 한 주를 준비합니다",
          "Prepare a week of shared learning",
        )}
        description={t(
          "제출한 활동지와 공개한 생각을 바탕으로 수업을 준비하세요. 개인 묵상은 표시되지 않습니다.",
          "Prepare with submitted worksheets and shared thoughts. Private reflections are never shown.",
        )}
      />
      {!allowed ? (
        <>
          <LoginForm />
          {boot?.actor.kind === "user" && (
            <Link className="button secondary" href="/teacher/apply">
              {t("교사 신청 / 승인 대기", "Apply / awaiting approval")}
            </Link>
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <WeekPicker week={week} onChange={setWeek} />
            <div className="actions">
              <Link
                className="button secondary"
                href={`/presentation?week=${week}`}
              >
                {t("수업 화면 · 참여 QR", "Presentation & QR")}
              </Link>
              <button
                className="text-button"
                onClick={() => api("auth/logout", {}).then(reload).catch(error)}
              >
                {t("로그아웃", "Sign out")}
              </button>
            </div>
          </div>
          <div className="stats">
            <div>
              <strong>
                {data?.submissions.filter((s) => s.status === "SUBMITTED")
                  .length || 0}
              </strong>
              <span>{t("새 활동지", "New worksheets")}</span>
            </div>
            <div>
              <strong>
                {data?.questions.filter((q) => !q.response).length || 0}
              </strong>
              <span>{t("기다리는 질문", "Unanswered questions")}</span>
            </div>
            <div>
              <strong>
                {data?.notes.filter((n) => n.status === "pending").length || 0}
              </strong>
              <span>{t("공개 검토", "Awaiting moderation")}</span>
            </div>
          </div>
          <Tabs.Root defaultValue="submissions">
            <Tabs.List className="tabs">
              {[
                ["submissions", t("제출물 · 피드백", "Submissions")],
                ["members", t("내 반원관리", "My class members")],
                ["lesson-library", t("공과자료실", "Lesson library")],
                ["prepare", t("수업 준비", "Lesson preparation")],
                ["questions", t("학생 질문", "Questions")],
                ["moderation", t("토론 · 생각 관리", "Moderation")],
                ["ai", t("AI 질문 · 자료", "AI learning aids")],
                ["announcements", t("공지 관리", "Announcements")],
              ].map(([id, label]) => (
                <Tabs.Trigger key={id} value={id}>
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="members">
              <ClassMembers />
            </Tabs.Content>
            <Tabs.Content value="lesson-library">
              <MaterialLibrary />
            </Tabs.Content>
            <Tabs.Content value="announcements">
              <AnnouncementManager />
            </Tabs.Content>
            <Tabs.Content value="submissions">
              <div className="stack">
                {data?.submissions.length ? (
                  data.submissions.map((s) => (
                    <button
                      className="room-card"
                      key={s.id}
                      onClick={() => {
                        setSelected(s);
                        setFeedback("");
                        api("view-submission", { id: s.id })
                          .then(load)
                          .catch(error);
                      }}
                    >
                      <div>
                        <strong>
                          {t(
                            `${s.week}주차 활동지`,
                            `Week ${s.week} worksheet`,
                          )}
                        </strong>
                        <p>
                          {new Date(s.created_at).toLocaleDateString(
                            lang === "ko" ? "ko-KR" : "en-US",
                          )}
                        </p>
                      </div>
                      <span className="badge">
                        {t(
                          (
                            {
                              SUBMITTED: "새 제출",
                              VIEWED: "확인",
                              FEEDBACK: "피드백 완료",
                              RETURNED: "반환",
                            } as Record<string, string>
                          )[s.status] || s.status,
                          s.status,
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <Empty
                    title={t(
                      "새로운 제출물이 없습니다.",
                      "No submissions yet.",
                    )}
                  />
                )}
              </div>
            </Tabs.Content>
            <Tabs.Content value="prepare">
              <div className="two-col">
                <section className="panel">
                  <h2>{t("주차 제목 편집", "Edit week title")}</h2>
                  <label className="field">
                    한국어
                    <input
                      value={weekKo}
                      onChange={(e) => setWeekKo(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    English
                    <input
                      value={weekEn}
                      onChange={(e) => setWeekEn(e.target.value)}
                    />
                  </label>
                  <button
                    className="button primary"
                    onClick={() =>
                      run(() =>
                        api("edit-week", {
                          week,
                          title: { ko: weekKo, en: weekEn },
                          status: "published",
                        }).then(reload),
                      )
                    }
                  >
                    {t("저장 · 게시", "Save & publish")}
                  </button>
                </section>
                <section className="panel">
                  <h2>{t("토론 만들기", "Create a discussion")}</h2>
                  <label className="field">
                    {t("토론 질문", "Discussion question")}
                    <textarea
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t("토론 방식", "Discussion mode")}
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      {[
                        ["OPEN", "자유 토론", "Open"],
                        [
                          "POST_BEFORE_VIEW",
                          "먼저 작성 후 열람",
                          "Post before view",
                        ],
                        ["ANONYMOUS", "익명 토론", "Anonymous"],
                        [
                          "TEACHER_MODERATED",
                          "교사 승인 후 공개",
                          "Teacher moderated",
                        ],
                        [
                          "READ_ONLY_AFTER_CLOSE",
                          "마감 후 읽기 전용",
                          "Read only after close",
                        ],
                      ].map(([v, ko, en]) => (
                        <option key={v} value={v}>
                          {t(ko, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {t("마감 (선택)", "Deadline (optional)")}
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </label>
                  <button
                    className="button primary"
                    disabled={!roomTitle.trim() || busy}
                    onClick={() =>
                      run(() =>
                        api("create-room", {
                          week,
                          title: roomTitle,
                          mode,
                          closes_at: deadline
                            ? new Date(deadline).toISOString()
                            : null,
                        }).then(() => setRoomTitle("")),
                      )
                    }
                  >
                    {t("토론 열기", "Open discussion")}
                  </button>
                </section>
              </div>
              <WorksheetEditor key={week} week={week} />
            </Tabs.Content>
            <Tabs.Content value="questions">
              {data?.questions.map((q) => (
                <QuestionReply key={q.id} question={q} onSaved={load} />
              ))}
            </Tabs.Content>
            <Tabs.Content value="moderation">
              <section className="panel">
                <h2>{t("생각벽 검토", "Thought wall review")}</h2>
                {data?.notes.map((n) => (
                  <div className="moderation-row" key={n.id}>
                    <p>
                      <Translated text={n.content} week={n.week} />
                    </p>
                    <div className="actions">
                      <button
                        className="button secondary"
                        onClick={() =>
                          run(() =>
                            api("moderate", {
                              type: "note",
                              id: n.id,
                              status: "published",
                              pinned: !n.is_pinned,
                            }),
                          )
                        }
                      >
                        {n.is_pinned
                          ? t("고정 해제", "Unpin")
                          : t("공개 · 고정", "Publish & pin")}
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          run(() =>
                            api("moderate", {
                              type: "note",
                              id: n.id,
                              status: "hidden",
                            }),
                          )
                        }
                      >
                        {t("숨기기", "Hide")}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>{t("신고 내역", "Review requests")}</h2>
                {data?.reports
                  .filter((r) => r.status === "pending")
                  .map((r) => (
                    <div key={r.id}>
                      <p>{r.reason}</p>
                      <button
                        className="button secondary"
                        onClick={() =>
                          run(() =>
                            api("moderate", {
                              type: "report",
                              id: r.id,
                              status: "resolved",
                            }),
                          )
                        }
                      >
                        {t("처리 완료", "Mark resolved")}
                      </button>
                    </div>
                  ))}
              </section>
            </Tabs.Content>
            <Tabs.Content value="ai">
              <section className="panel">
                <h2>{t("AI 질문 생성", "Generate questions with AI")}</h2>
                <div className="two-col">
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
                      {[
                        ["understanding", "이해", "Understanding"],
                        ["reflection", "성찰", "Reflection"],
                        ["application", "적용", "Application"],
                        ["experience", "경험", "Experience"],
                        ["discussion", "토론", "Discussion"],
                        [
                          "critical thinking",
                          "비판적 사고",
                          "Critical thinking",
                        ],
                        ["life connection", "삶과 연결", "Connection to life"],
                      ].map(([v, ko, en]) => (
                        <option key={v} value={v}>
                          {t(ko, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="actions">
                  {[
                    ["questions", "질문 초안", "Question draft"],
                    ["worksheet", "활동지 초안", "Worksheet draft"],
                    [
                      "class_brief",
                      "공개 생각 요약",
                      "Summarize shared thoughts",
                    ],
                  ].map(([feature, ko, en]) => (
                    <button
                      className="button secondary"
                      disabled={busy || !boot?.aiAvailable}
                      key={feature}
                      onClick={() =>
                        run(() =>
                          api("ai", {
                            feature,
                            week,
                            language: lang,
                            audience,
                            questionType,
                          }),
                        )
                      }
                    >
                      {t(ko, en)}
                    </button>
                  ))}
                </div>
                {!boot?.aiAvailable && (
                  <p className="notice">
                    {t(
                      "AI 연결이 아직 설정되지 않았습니다.",
                      "AI has not been configured yet.",
                    )}
                  </p>
                )}
                <small>
                  {t(
                    "AI 학습 보조자료는 편집 → 승인 → 게시 과정을 거칩니다.",
                    "AI learning aids follow an edit → approve → publish workflow.",
                  )}
                </small>
              </section>
              {data?.ai
                .filter((a) =>
                  [
                    "questions",
                    "worksheet",
                    "class_brief",
                    "curriculum",
                  ].includes(a.feature),
                )
                .map((a) => (
                  <article className="panel" key={a.id}>
                    <span className="badge">
                      {(
                        {
                          questions: t("질문 초안", "Question draft"),
                          worksheet: t("활동지 초안", "Worksheet draft"),
                          class_brief: t(
                            "공개 생각 요약",
                            "Shared thoughts summary",
                          ),
                          curriculum: t("교재 구성 초안", "Curriculum draft"),
                        } as Record<string, string>
                      )[a.feature] || a.feature}{" "}
                      ·{" "}
                      {(
                        {
                          generated: t("생성 완료", "Generated"),
                          edited: t("검토 중", "In review"),
                          approved: t("승인됨", "Approved"),
                          published: t("게시됨", "Published"),
                        } as Record<string, string>
                      )[a.status] || a.status}
                    </span>
                    <AiResult feature={a.feature} content={a.content} />
                    <div className="actions">
                      <button
                        className="button secondary"
                        onClick={() => {
                          setEditAI(a);
                          setJson(
                            JSON.stringify(
                              decodeJsonContainer(a.content),
                              null,
                              2,
                            ),
                          );
                        }}
                      >
                        {t("편집", "Edit")}
                      </button>
                      {a.status === "edited" && (
                        <button
                          className="button secondary"
                          onClick={() =>
                            run(() =>
                              api("ai-review", {
                                id: a.id,
                                status: "approved",
                              }),
                            )
                          }
                        >
                          {t("승인", "Approve")}
                        </button>
                      )}
                      {a.status === "approved" && (
                        <button
                          className="button primary"
                          onClick={() =>
                            run(() =>
                              api("ai-review", {
                                id: a.id,
                                status: "published",
                              }),
                            )
                          }
                        >
                          {t("게시", "Publish")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
      <Modal
        title={t("활동지와 피드백", "Worksheet & feedback")}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      >
        {selected && (
          <>
            {Object.entries(selected.answers).map(([k, v]) => (
              <div key={k}>
                <strong>
                  {selected.worksheet_snapshot?.items[Number(k)]?.[lang] ||
                    fields[Number(k)]?.[lang] ||
                    k}
                </strong>
                <p>{v}</p>
              </div>
            ))}
            <label className="field">
              {t("선생님의 생각", "Your feedback")}
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </label>
            <div className="actions">
              <button
                className="button primary"
                disabled={!feedback.trim() || busy}
                onClick={() =>
                  run(() =>
                    api("feedback", {
                      id: selected.id,
                      content: feedback,
                    }).then(() => setSelected(null)),
                  )
                }
              >
                {t("피드백 보내기", "Send feedback")}
              </button>
              <button
                className="button secondary"
                disabled={!feedback.trim() || busy}
                onClick={() =>
                  run(() =>
                    api("feedback", {
                      id: selected.id,
                      content: feedback,
                      status: "RETURNED",
                    }).then(() => setSelected(null)),
                  )
                }
              >
                {t("수정 요청", "Return for revision")}
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title={t("AI 초안 검토·편집", "Review and edit AI draft")}
        open={!!editAI}
        onOpenChange={(v) => !v && setEditAI(null)}
      >
        <label className="field">
          {t("구조화된 초안", "Structured draft")}
          <textarea
            className="code-input"
            rows={14}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          onClick={() =>
            run(async () => {
              await api("ai-review", {
                id: editAI?.id,
                status: "edited",
                content: JSON.parse(json),
              });
              setEditAI(null);
            })
          }
        >
          {t("편집 저장", "Save edits")}
        </button>
      </Modal>
    </div>
  );
}
function QuestionReply({
  question: q,
  onSaved,
}: {
  question: { id: string; content: string; week: number; response: string };
  onSaved: () => Promise<unknown>;
}) {
  const { t, error } = useApp();
  const [value, setValue] = useState(q.response || "");
  return (
    <article className="panel">
      <p>
        <Translated text={q.content} week={q.week} />
      </p>
      <label className="field">
        {t("답변", "Response")}
        <textarea value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <button
        className="button primary"
        disabled={!value.trim()}
        onClick={() =>
          api("answer-question", { id: q.id, content: value })
            .then(onSaved)
            .catch(error)
        }
      >
        {t("답변 저장", "Save response")}
      </button>
    </article>
  );
}
