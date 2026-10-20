"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, MessageCircle, X } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import {
  cfmPlan,
  dayTitles,
  familyTitles,
  materialPercent,
  studySourceLanguage,
  studySourceUrl,
  studyTasks,
  type StudyTrack,
} from "@/lib/cfm-study-plan";
import type { MaterialProgress } from "@/lib/study-material-progress";
import type { Prompt } from "@/lib/prompts";
import { Modal } from "../ui/dialog";
import { StudyCommunityPanel } from "./study-community-panel";
import { useLocalDraft } from "../use-local-draft";

type Overview = {
  questions: (Prompt & { study_day: number | null })[];
  answeredDays: number[];
  canAuthor: boolean;
};
type ReaderProps = {
  day: number;
  initialTrack?: StudyTrack;
  initialSource?: string;
  initialAnchor?: string;
};

function StudySourceFrame({
  url,
  title,
  onRetry,
}: {
  url: string;
  title: string;
  onRetry: () => void;
}) {
  const { t } = useApp();
  const [waiting, setWaiting] = useState(true);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  const openLabel = t("새 창에서 원문 읽기 ↗", "Read source in a new tab ↗");
  return (
    <>
      <div className="study-source-tools">
        <div>
          <strong>{title}</strong>
          <span>
            {t(
              "본문이 보이지 않으면 새 창에서 같은 범위를 읽어 주세요.",
              "If the text is blank you can read the same range in a new tab.",
            )}
          </span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {openLabel}
        </a>
        <button type="button" onClick={onRetry}>
          {t("원문 다시 불러오기", "Reload source")}
        </button>
      </div>
      <div className="study-source-frames">
        <iframe
          src={url}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          // A cross-origin load event does not prove the source rendered.
          // Keep the source link and retry action visible after this event too.
          onLoad={() => setWaiting(false)}
        />
        {waiting && (
          <div className="study-source-loading">
            <div>
              <p role="status">
                {slow
                  ? t(
                      "원문 연결이 지연되고 있습니다.",
                      "The source is taking longer to load.",
                    )
                  : t(
                      "공식 원문을 불러오고 있습니다.",
                      "Loading the official source.",
                    )}
              </p>
              <strong>{title}</strong>
              <p>
                {t(
                  "잠시 기다리거나 새 창에서 읽을 수 있습니다. 돌아와서 생각을 나눠 주세요.",
                  "You can wait or read in a new tab then return to share a thought.",
                )}
              </p>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {openLabel}
              </a>
              {slow && (
                <button type="button" onClick={() => setWaiting(false)}>
                  {t("안내 닫기", "Dismiss notice")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function StudyReader(props: ReaderProps) {
  const { boot } = useApp();
  return (
    <Reader
      key={`${boot?.actor.id || "public"}:${props.day}:${props.initialTrack}:${props.initialSource}:${props.initialAnchor}`}
      {...props}
    />
  );
}
function Reader({
  day: selectedDay,
  initialTrack = "adult",
  initialSource,
  initialAnchor,
}: ReaderProps) {
  const { uiLang, setLang, t, boot, ready, reload, error } = useApp();
  const router = useRouter();
  const [track, setTrack] = useState<StudyTrack>(initialTrack);
  const [step, setStep] = useState(() =>
    Math.max(
      0,
      studyTasks(selectedDay, initialTrack).findIndex(
        (item) =>
          item.path === initialSource &&
          ((item.anchor || "main") === initialAnchor ||
            item.selectedIds.includes(initialAnchor || "")),
      ),
    ),
  );
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [panel, setPanel] = useState<
    "question" | "range" | "collection" | null
  >(null);
  const [progress, setProgress] = useState<MaterialProgress[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rangeData, setRangeData] = useState({ key: "", count: 0 });
  const [busy, setBusy] = useState(false);
  const [saveUnavailable, setSaveUnavailable] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [invite, setInvite] = useState(false);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  const [boundary, setBoundary] = useState<"start" | "end">("start");
  const [jump, setJump] = useState(0);
  const alive = useRef(true);
  const communityRequest = useRef(0);
  const rangeRequest = useRef(0);
  const progressRequest = useRef(0);
  const day = cfmPlan.days[selectedDay - 1];
  const tasks = studyTasks(selectedDay, track);
  const task = tasks[Math.min(step, tasks.length - 1)];
  const completed = progress
    .filter((p) => p.day === selectedDay && p.track === track)
    .map((p) => p.task_id);
  const stats = materialPercent(selectedDay, track, completed);
  const source = {
    path: task.path,
    anchor:
      task.selectedIds.find((id) => /^p\d+$/.test(id)) ||
      task.selectedIds[0] ||
      task.anchor ||
      "main",
    label: task.label,
  };
  const sourcePath = source.path,
    sourceAnchor = source.anchor;
  const rangeKey = sourcePath + "#" + sourceAnchor;
  const rangeCount = rangeData.key === rangeKey ? rangeData.count : 0;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const notes = useLocalDraft(
    boot ? `${boot.actor.id}:cfm:43:${selectedDay}:${track}` : null,
    { body: "" },
  );
  const connectionOK = !!boot && progressLoaded && !saveUnavailable;
  const refreshCommunity = useCallback(() => {
    const token = ++communityRequest.current;
    api<Overview>("think/study-overview?week=43")
      .then((d) => {
        if (alive.current && token === communityRequest.current) setOverview(d);
      })
      .catch(() => {
        if (alive.current && token === communityRequest.current)
          setOverview(null);
      });
  }, []);
  const refreshRange = useCallback(() => {
    const params = new URLSearchParams({
      week: "43",
      path: sourcePath,
      anchor: sourceAnchor,
    });
    const token = ++rangeRequest.current;
    const key = sourcePath + "#" + sourceAnchor;
    api<{ publicCount: number }>("think/study-thoughts?" + params)
      .then((d) => {
        if (alive.current && token === rangeRequest.current)
          setRangeData({ key, count: d.publicCount });
      })
      .catch(() => {
        if (alive.current && token === rangeRequest.current)
          setRangeData({ key, count: 0 });
      });
  }, [sourcePath, sourceAnchor]);
  useEffect(() => {
    let current = true;
    if (!boot) return;
    const token = ++progressRequest.current;
    api<{ items: MaterialProgress[] }>("notes/study-progress?week=43")
      .then((d) => {
        if (current && token === progressRequest.current) {
          setProgress(d.items);
          setSaveUnavailable(false);
          setProgressLoaded(true);
        }
      })
      .catch(() => {
        if (current && token === progressRequest.current)
          setSaveUnavailable(true);
      });
    return () => {
      current = false;
    };
  }, [boot]);
  useEffect(() => {
    refreshCommunity();
  }, [boot, refreshCommunity]);
  useEffect(() => {
    refreshRange();
  }, [boot, refreshRange]);
  const onCommunityChanged = () => {
    refreshCommunity();
    refreshRange();
  };
  const currentAnswered = overview?.answeredDays.includes(selectedDay) || false;
  const dismissInvite = () => {
    const next = [...new Set([...dismissed, selectedDay])];
    setDismissed(next);
    setInvite(false);
    if (boot)
      try {
        localStorage.setItem(
          `ggc_cfm_invite:${boot.actor.id}:43`,
          JSON.stringify(next),
        );
      } catch {}
  };
  async function mark(
    taskId: string,
    dayNo = selectedDay,
    course = track,
    complete = true,
  ) {
    if (!connectionOK || busy) return false;
    setBusy(true);
    setStatus("");
    ++progressRequest.current;
    try {
      await api("notes/study-progress-save", {
        week: 43,
        day: dayNo,
        track: course,
        task_id: taskId,
        complete,
      });
      if (!alive.current) return false;
      const next = progress.filter(
        (p) => !(p.day === dayNo && p.track === course && p.task_id === taskId),
      );
      if (complete) next.push({ day: dayNo, track: course, task_id: taskId });
      setProgress((prior) => [
        ...prior.filter(
          (p) =>
            !(p.day === dayNo && p.track === course && p.task_id === taskId),
        ),
        ...(complete ? [{ day: dayNo, track: course, task_id: taskId }] : []),
      ]);
      const result = materialPercent(
        dayNo,
        course,
        next
          .filter((p) => p.day === dayNo && p.track === course)
          .map((p) => p.task_id),
      );
      let priorDismissed: number[] = [];
      try {
        priorDismissed = JSON.parse(
          localStorage.getItem(`ggc_cfm_invite:${boot!.actor.id}:43`) || "[]",
        );
      } catch {}
      if (
        dayNo === selectedDay &&
        result.percent === 100 &&
        overview?.questions.some((q) => q.study_day === dayNo) &&
        !currentAnswered &&
        !dismissed.includes(dayNo) &&
        !priorDismissed.includes(dayNo)
      )
        setInvite(true);
      if (!complete) setInvite(false);
      setStatus(t("학습 기록을 저장했습니다.", "Learning progress saved."));
      return true;
    } catch (e) {
      if (alive.current) {
        error(e);
        setStatus(
          t(
            "저장하지 못했습니다. 다시 시도해 주세요.",
            "Could not save. Please retry.",
          ),
        );
      }
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function next() {
    if (!(await mark(task.id))) return;
    if (step < tasks.length - 1) {
      setStep(step + 1);
      setBoundary("start");
    } else if (
      stats.count + (!completed.includes(task.id) ? 1 : 0) <
      stats.total
    )
      setProgressOpen(true);
  }
  const sourceUrl = studySourceUrl(task, uiLang, boundary === "end");
  return (
    <div className={`study-reader ${panel ? "has-community" : ""}`}>
      <header className="study-reader-top">
        <Link
          href="/week/43"
          className="study-brand"
          aria-label={t("주간 학습으로", "Back to week")}
        >
          <BookOpen size={20} />
          <span>{t("곡반정와드", "Ward study")}</span>
        </Link>
        <label className="sr-only" htmlFor="study-day">
          {t("학습 일차", "Study day")}
        </label>
        <select
          id="study-day"
          value={selectedDay}
          disabled={busy}
          onChange={(e) =>
            router.replace(`/week/43/day/${e.target.value}?track=${track}`, {
              scroll: false,
            })
          }
        >
          {cfmPlan.days.map((d) => (
            <option key={d.day} value={d.day}>
              {t("{day}일차", "Day {day}", { day: d.day })} ·{" "}
              {t(d.shortTitle, dayTitles[d.day - 1])}
              {materialPercent(
                d.day,
                "adult",
                progress
                  .filter((p) => p.day === d.day && p.track === "adult")
                  .map((p) => p.task_id),
              ).percent === 100
                ? " ✓"
                : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="study-question-button"
          aria-expanded={panel === "question"}
          onClick={() => setPanel(panel === "question" ? null : "question")}
        >
          {t("오늘의 질문", "Today’s question")}
        </button>
        <a
          className="study-official"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("원본·개인 주석 ↗", "Source · personal notes ↗")}
        </a>
        <button type="button" onClick={() => setMaterialsOpen(true)}>
          {t("자료", "Materials")}
        </button>
        <Link
          className="study-exit"
          href="/learn"
          aria-label={t("학습 목록으로", "Back to learning list")}
        >
          <X size={20} />
        </Link>
      </header>
      <nav
        className="study-reader-scopes"
        aria-label={t("오늘의 학습 범위", "Today’s study ranges")}
      >
        <div className="study-range-chips">
          {(["adult", "family"] as const).map((course) => (
            <button
              key={course}
              type="button"
              disabled={busy}
              aria-pressed={track === course}
              onClick={() => {
                setTrack(course);
                setStep(0);
                setBoundary("start");
              }}
              title={course === "adult" ? day.question : day.familyActivity}
            >
              {course === "adult"
                ? t("기본", "Basic")
                : t("어린이·가족", "Children · family")}{" "}
              ·{" "}
              {course === "adult"
                ? t(day.shortTitle, dayTitles[selectedDay - 1])
                : t(
                    familyTitles[selectedDay - 1][0],
                    familyTitles[selectedDay - 1][1],
                  )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="study-progress-chip"
          onClick={() => setProgressOpen(true)}
          aria-label={t(
            "학습 진행률 {percent}퍼센트 보기",
            "View learning progress {percent} percent",
            { percent: stats.percent },
          )}
        >
          {t("오늘 {percent}%", "Today {percent}%", { percent: stats.percent })}
        </button>
        <span className="study-position">
          {step + 1}/{tasks.length} · {t("파란 선 범위", "Blue-line range")}
        </span>
        <button
          type="button"
          onClick={() => {
            setBoundary("start");
            setJump((n) => n + 1);
          }}
          title={task.selectedIds[0] || task.anchor}
        >
          {t("시작 보기 ↑", "Start ↑")}
        </button>
        <button
          type="button"
          onClick={() => {
            setBoundary("end");
            setJump((n) => n + 1);
          }}
          title={task.selectedIds.at(-1) || task.endAnchor}
        >
          {t("끝 보기 ↓", "End ↓")}
        </button>
      </nav>
      {ready && !boot && (
        <div className="study-connection" role="status">
          {t(
            "읽기는 가능합니다. 기록·댓글 연결을 다시 시도해 주세요.",
            "Reading is available. Reconnect to save progress or post.",
          )}{" "}
          <button type="button" onClick={() => reload().catch(error)}>
            {t("다시 연결", "Reconnect")}
          </button>
        </div>
      )}
      {saveUnavailable && (
        <div className="study-connection" role="status">
          {t(
            "학습 기록을 불러오지 못했습니다. 읽기를 계속할 수 있습니다.",
            "Progress is unavailable. You can keep reading.",
          )}{" "}
          <button type="button" onClick={() => reload().catch(error)}>
            {t("다시 시도", "Retry")}
          </button>
        </div>
      )}
      <div className="study-reader-workspace">
        <section
          className="study-reader-source"
          aria-label={t("공식 원문 읽기", "Read official source")}
        >
          {uiLang !== "ko" && studySourceLanguage(task, uiLang) === "kor" && (
            <p className="study-language-note">
              {t(
                "이 자료의 범위는 확인된 한국어 원문으로 표시합니다.",
                "This material uses the audited Korean source to preserve its marked range.",
              )}
            </p>
          )}
          {task.kind === "activity" && (
            <div className="study-activity">
              <strong>{task.label}</strong>
              <p>{track === "adult" ? day.question : day.familyQuestion}</p>
              <button type="button" onClick={() => setNotesOpen(true)}>
                {t("나만의 학습 메모", "Private learning notes")}
              </button>
            </div>
          )}
          <StudySourceFrame
            key={`${task.id}:${uiLang}:${sourceUrl}:${jump}`}
            url={sourceUrl}
            title={task.label}
            onRetry={() => setJump((n) => n + 1)}
          />
          {rangeCount > 0 && (
            <button
              type="button"
              className="study-thought-bubble"
              aria-label={t(
                "이 범위의 공개된 생각 {count}개 보기",
                "See {count} public thoughts on this range",
                { count: rangeCount },
              )}
              onClick={() => setPanel("range")}
            >
              <MessageCircle size={18} />
              {t("이 범위의 생각", "Thoughts here")}{" "}
              <strong>{rangeCount}</strong>
            </button>
          )}
        </section>
        {panel && (
          <StudyCommunityPanel
            week={43}
            day={selectedDay}
            track={track}
            source={source}
            mode={panel}
            onClose={() => setPanel(null)}
            onChanged={onCommunityChanged}
          />
        )}
      </div>
      {invite && !currentAnswered && (
        <div className="study-gentle" role="status">
          <span>
            {t(
              "오늘 학습을 마쳤어요. 질문에도 생각을 나눠 볼까요? 참여는 자유예요.",
              "You finished today’s study. Would you like to share a thought? It’s optional.",
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setPanel("question");
              setInvite(false);
            }}
          >
            {t("질문 보기", "View question")}
          </button>
          <button type="button" onClick={dismissInvite}>
            {t("나중에", "Later")}
          </button>
        </div>
      )}
      <footer className="study-reader-bottom">
        <button
          type="button"
          className="study-primary"
          onClick={() => setPanel("range")}
        >
          {t("생각 나누기", "Share a thought")}
        </button>
        <span>
          {track === "adult"
            ? t(day.question, dayTitles[selectedDay - 1])
            : t(day.familyQuestion, "What did your family notice?")}
        </span>
        <button type="button" onClick={next} disabled={!connectionOK || busy}>
          {step === tasks.length - 1
            ? t("오늘 학습 완료 확인", "Review today’s completion")
            : t(
                "읽었어요 · 다음 {next}/{total}",
                "Read · Next {next}/{total}",
                { next: step + 2, total: tasks.length },
              )}
        </button>
        <span className="sr-only" role="status">
          {status}
        </span>
      </footer>
      <Modal
        title={t("오늘의 자료", "Today’s materials")}
        open={materialsOpen}
        onOpenChange={setMaterialsOpen}
      >
        <label className="field">
          {t("표시 언어", "Display language")}
          <select
            aria-label={t("표시 언어", "Display language")}
            value={uiLang}
            onChange={(e) => setLang(e.target.value as typeof uiLang)}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fil">Filipino</option>
          </select>
        </label>
        <p>
          {t(
            "파란 선은 현재 자료의 읽을 범위입니다. 경전과 연결 말씀은 각각의 원문 전체 또는 지정 범위로 이어집니다.",
            "Blue lines mark the current material’s range. Scriptures and linked messages open their complete text or assigned portion.",
          )}
        </p>
        <ol className="study-materials-list">
          {tasks.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => {
                  setStep(i);
                  setBoundary("start");
                  setMaterialsOpen(false);
                }}
              >
                {completed.includes(item.id) ? "✓ " : ""}
                {item.label}
              </button>
              {item.noteLinks.length > 0 && (
                <details>
                  <summary>
                    {t("각주 {count}개", "{count} notes", {
                      count: item.noteLinks.length,
                    })}
                  </summary>
                  {item.noteLinks.map((note) => (
                    <a
                      key={note.note}
                      href={studySourceUrl(
                        {
                          ...item,
                          anchor: note.owner,
                          selectedIds: [note.owner],
                        },
                        uiLang,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {note.note} ↗{" "}
                    </a>
                  ))}
                </details>
              )}
            </li>
          ))}
        </ol>
        <p className="muted">
          {t(
            "공식 사이트가 표시되지 않으면 상단 원본 링크를 이용해 주세요. 교회 계정의 개인 주석은 공식 사이트에서 관리합니다.",
            "If embedding is unavailable, use the source link above. Church Account annotations are managed on the official site.",
          )}
        </p>
        <Link href={`/week/43/day/${selectedDay}?view=notes`}>
          {t(
            "기존 학습 화면·개인 기록 열기",
            "Open existing lesson and personal records",
          )}
        </Link>
      </Modal>
      <Modal
        title={t("나의 학습 진행", "My learning progress")}
        open={progressOpen}
        onOpenChange={setProgressOpen}
      >
        <p>
          {t(
            "직접 확인한 자료 수를 기준으로 합니다. 질문 답변은 완료 조건이 아닙니다.",
            "Based on materials you confirm. Answering questions is optional.",
          )}
        </p>
        <table className="study-progress-table">
          <thead>
            <tr>
              <th>{t("일차", "Day")}</th>
              <th>{t("기본", "Basic")}</th>
              <th>{t("가족", "Family")}</th>
              <th>{t("질문 · 선택", "Question · optional")}</th>
            </tr>
          </thead>
          <tbody>
            {cfmPlan.days.map((d) => (
              <tr key={d.day}>
                <th>
                  <button
                    type="button"
                    onClick={() => {
                      router.replace(`/week/43/day/${d.day}?track=${track}`, {
                        scroll: false,
                      });
                      setProgressOpen(false);
                    }}
                  >
                    {d.day}
                  </button>
                </th>
                {(["adult", "family"] as const).map((course) => {
                  const s = materialPercent(
                    d.day,
                    course,
                    progress
                      .filter((p) => p.day === d.day && p.track === course)
                      .map((p) => p.task_id),
                  );
                  return (
                    <td key={course}>
                      {s.percent === 100 ? (
                        <>
                          <Check size={15} />
                          {t("완료", "Done")}
                        </>
                      ) : (
                        `${s.percent}%`
                      )}
                    </td>
                  );
                })}
                <td>
                  {overview?.answeredDays.includes(d.day)
                    ? t("생각 남김 ✓", "Answered ✓")
                    : t("선택 참여", "Optional")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>
          {t("오늘의 자료 확인", "Check today’s materials")} · {stats.count}/
          {stats.total}
        </h3>
        <div className="study-progress-checks">
          {tasks.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={completed.includes(item.id)}
                disabled={busy || !connectionOK}
                onChange={(e) =>
                  void mark(item.id, selectedDay, track, e.target.checked)
                }
              />
              {item.label}
            </label>
          ))}
        </div>
        <p className="muted">
          {t(
            "기록은 현재 앱 계정에 저장됩니다. 교회 계정 주석과는 별개입니다.",
            "Progress is saved to your app identity, separately from Church Account annotations.",
          )}
        </p>
      </Modal>
      <Modal
        title={t("나만의 학습 메모", "Private learning notes")}
        open={notesOpen}
        onOpenChange={setNotesOpen}
      >
        <p>
          {t(
            "이 메모는 이 기기에만 보관되며 공개 댓글에 나타나지 않습니다.",
            "These notes stay on this device and never appear in public comments.",
          )}
        </p>
        <textarea
          aria-label={t("학습 메모", "Learning notes")}
          value={notes.value.body}
          rows={7}
          disabled={!boot}
          onChange={(e) => notes.setField("body", e.target.value)}
        />
        <Link href={`/week/43/day/${selectedDay}?view=notes`}>
          {t("기존 개인 기록 열기", "Open existing personal records")}
        </Link>
      </Modal>
    </div>
  );
}
