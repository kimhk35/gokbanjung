"use client";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  Check,
  CircleHelp,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import {
  getStudyPlan,
  getStudyDay,
  dailyStudyHref,
  studyDayTitle,
  studyFamilyTitle,
  materialPercent,
  studySourceLanguage,
  studySourceUrl,
  studyTasks,
  type StudyTrack,
  type StudyDay,
} from "@/lib/cfm-study-plan";
import type { MaterialProgress } from "@/lib/study-material-progress";
import type { Prompt } from "@/lib/prompts";
import { Modal } from "../ui/dialog";
import { StudyCommunityPanel } from "./study-community-panel";
import { useLocalDraft } from "../use-local-draft";
import {
  StudyReaderGuide,
  type StudyReaderGuideHandle,
} from "./study-reader-guide";

type Overview = {
  questions: (Prompt & { study_day: number | null })[];
  answeredDays: number[];
  canAuthor: boolean;
};
type ReaderProps = {
  week: number;
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
          // Source and retry actions remain available in mobile reading tools.
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
  const { boot, t } = useApp();
  const guide = useRef<StudyReaderGuideHandle>(null);
  const reader = useRef<HTMLDivElement>(null);
  const day = getStudyDay(props.week, props.day);
  if (!day)
    return (
      <div className="page">
        <p>
          {t(
            "이 날짜의 새 배분은 아직 준비되지 않았습니다.",
            "The new allocation for this day is not ready yet.",
          )}
        </p>
        <Link
          className="button"
          href={`/week/${props.week}/day/${props.day}?view=notes`}
        >
          {t("기존 학습 범위 열기", "Open the existing study range")}
        </Link>
      </div>
    );
  const initialTrack =
    props.initialTrack === "family" && day.familyTasks.length
      ? "family"
      : "adult";
  return (
    <>
      <Reader
        key={`${boot?.actor.id || "public"}:${props.week}:${props.day}:${initialTrack}:${props.initialSource}:${props.initialAnchor}`}
        {...props}
        initialTrack={initialTrack}
        studyDay={day}
        readerRef={reader}
        onGuide={() => guide.current?.open()}
      />
      <StudyReaderGuide
        controllerRef={guide}
        readerRef={reader}
        contextKey={`${boot?.actor.id || "public"}:${props.week}:${props.day}`}
      />
    </>
  );
}
function Reader({
  week,
  day: selectedDay,
  initialTrack = "adult",
  initialSource,
  initialAnchor,
  studyDay: day,
  readerRef,
  onGuide,
}: ReaderProps & {
  studyDay: StudyDay;
  readerRef: Ref<HTMLDivElement>;
  onGuide: () => void;
}) {
  const { uiLang, setLang, t, boot, ready, reload, error } = useApp();
  const router = useRouter();
  const [track, setTrack] = useState<StudyTrack>(initialTrack);
  const [step, setStep] = useState(() =>
    Math.max(
      0,
      studyTasks(selectedDay, initialTrack, week).findIndex(
        (item) =>
          item.path === initialSource &&
          ((item.anchor || "main") === initialAnchor ||
            item.selectedIds.includes(initialAnchor || "")),
      ),
    ),
  );
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [readingFocus, setReadingFocus] = useState(false);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const daySelect = useRef<HTMLSelectElement>(null);
  const pendingToolAction = useRef<(() => void) | null>(null);
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
  const plan = getStudyPlan(week)!;
  const tasks = studyTasks(selectedDay, track, week);
  const task = tasks[Math.min(step, tasks.length - 1)];
  const completed = progress
    .filter((p) => p.day === selectedDay && p.track === track)
    .map((p) => p.task_id);
  const stats = materialPercent(selectedDay, track, completed, week);
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
    boot ? `${boot.actor.id}:cfm:${week}:${selectedDay}:${track}` : null,
    { body: "" },
  );
  const connectionOK = !!boot && progressLoaded && !saveUnavailable;
  const refreshCommunity = useCallback(() => {
    const token = ++communityRequest.current;
    api<Overview>(`think/study-overview?week=${week}`)
      .then((d) => {
        if (alive.current && token === communityRequest.current) setOverview(d);
      })
      .catch(() => {
        if (alive.current && token === communityRequest.current)
          setOverview(null);
      });
  }, [week]);
  const refreshRange = useCallback(() => {
    const params = new URLSearchParams({
      week: String(week),
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
  }, [week, sourcePath, sourceAnchor]);
  useEffect(() => {
    let current = true;
    if (!boot) return;
    const token = ++progressRequest.current;
    api<{ items: MaterialProgress[] }>(`notes/study-progress?week=${week}`)
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
  }, [boot, week]);
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
          `ggc_cfm_invite:${boot.actor.id}:${week}`,
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
        week,
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
        week,
      );
      let priorDismissed: number[] = [];
      try {
        priorDismissed = JSON.parse(
          localStorage.getItem(`ggc_cfm_invite:${boot!.actor.id}:${week}`) ||
            "[]",
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
  const sourceUrl = studySourceUrl(task, uiLang, boundary === "end", week);
  function toolAction(action: () => void) {
    // Open the next panel after this dialog releases its focus trap.
    pendingToolAction.current = action;
    setToolsOpen(false);
  }
  function showGuide() {
    setReadingFocus(false);
    onGuide();
  }
  function returnToReader(event: Event) {
    event.preventDefault();
    if (toolsTrigger.current?.getClientRects().length)
      toolsTrigger.current.focus({ preventScroll: true });
    else daySelect.current?.focus({ preventScroll: true });
  }
  return (
    <div
      ref={readerRef}
      className={`study-reader ${panel ? "has-community" : ""} ${readingFocus ? "is-reading-focused" : ""}`}
    >
      <header className="study-reader-top">
        <Link
          href={`/week/${week}`}
          className="study-brand"
          aria-label={t("{week}주차 학습으로", "Back to week {week}", { week })}
        >
          <BookOpen size={20} />
          <span>{t("곡반정와드", "Ward study")}</span>
        </Link>
        <label className="sr-only" htmlFor="study-day">
          {t("학습 일차", "Study day")}
        </label>
        <select
          ref={daySelect}
          id="study-day"
          data-study-guide="day"
          value={selectedDay}
          disabled={busy}
          onChange={(e) =>
            router.replace(
              getStudyDay(week, Number(e.target.value))
                ? `/week/${week}/day/${e.target.value}?track=${track}`
                : dailyStudyHref(week, Number(e.target.value)),
              {
                scroll: false,
              },
            )
          }
        >
          {Array.from({ length: 7 }, (_, index) => index + 1).map(
            (dayNumber) => {
              const d = getStudyDay(week, dayNumber);
              return (
                <option key={dayNumber} value={dayNumber}>
                  {t("{week}주 · {day}일차", "Week {week} · Day {day}", {
                    week,
                    day: dayNumber,
                  })}{" "}
                  ·{" "}
                  {d
                    ? t(studyDayTitle(d, week), studyDayTitle(d, week, true))
                    : t("기존 학습", "Existing study")}
                  {materialPercent(
                    dayNumber,
                    "adult",
                    progress
                      .filter((p) => p.day === dayNumber && p.track === "adult")
                      .map((p) => p.task_id),
                    week,
                  ).percent === 100
                    ? " ✓"
                    : ""}
                </option>
              );
            },
          )}
        </select>
        <span className="study-focus-title study-mobile-control">
          <span>{task.label}</span>
          <small>
            {step + 1}/{tasks.length}
          </small>
        </span>
        <button
          type="button"
          className="study-focus-toggle study-mobile-control"
          data-study-guide="focus"
          aria-pressed={readingFocus}
          aria-label={
            readingFocus
              ? t("도구 펼치기", "Show reading tools")
              : t("넓게 읽기", "Expand reading space")
          }
          onClick={() => setReadingFocus((value) => !value)}
        >
          {readingFocus ? (
            <Minimize2 size={20} aria-hidden="true" />
          ) : (
            <Maximize2 size={20} aria-hidden="true" />
          )}
          <span>{t("도구 펼치기", "Show tools")}</span>
        </button>
        <button
          ref={toolsTrigger}
          type="button"
          className="study-tools-toggle study-mobile-control"
          data-study-guide="tools"
          aria-label={t("읽기 도구 더보기", "More reading tools")}
          aria-expanded={toolsOpen}
          aria-haspopup="dialog"
          onClick={() => setToolsOpen(true)}
        >
          <MoreHorizontal size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="study-question-button"
          aria-expanded={panel === "question"}
          onClick={() => setPanel(panel === "question" ? null : "question")}
        >
          <span className="study-question-label-long">
            {t("오늘의 질문", "Today’s question")}
          </span>
          <span className="study-question-label-short">
            {t("질문", "Question")}
          </span>
        </button>
        <a
          className="study-official"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("원문·주석 ↗", "Source · notes ↗")}
        </a>
        <button
          type="button"
          className="study-materials-toggle"
          onClick={() => setMaterialsOpen(true)}
        >
          {t("자료", "Materials")}
        </button>
        <button
          type="button"
          className="study-guide-launch"
          data-study-guide="help"
          onClick={showGuide}
          aria-label={t("읽기 안내 다시 보기", "Replay the reading guide")}
          title={t("읽기 안내", "Reading guide")}
        >
          <CircleHelp size={21} aria-hidden="true" />
          <span>{t("사용 안내", "Guide")}</span>
        </button>
        <Link
          className="study-exit"
          href="/learn"
          aria-label={t("학습 목록으로", "Back to learning list")}
        >
          <X size={20} />
        </Link>
      </header>
      <div className="study-mobile-context study-mobile-control">
        <span>{task.label}</span>
        <small>
          {step + 1}/{tasks.length}
        </small>
      </div>
      <nav
        className="study-reader-scopes"
        aria-label={t("오늘의 학습 범위", "Today’s study ranges")}
      >
        <div className="study-range-chips">
          {(["adult", "family"] as const)
            .filter(
              (course) => course === "adult" || day.familyTasks.length > 0,
            )
            .map((course) => (
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
                  ? t(studyDayTitle(day, week), studyDayTitle(day, week, true))
                  : t(
                      studyFamilyTitle(day, week),
                      studyFamilyTitle(day, week, true),
                    )}
              </button>
            ))}
        </div>
        <button
          type="button"
          className="study-progress-chip"
          data-study-guide="progress"
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
          {step + 1}/{tasks.length}
          <span className="study-position-detail">
            {" "}
            · {t("파란 선 범위", "Blue-line range")}
          </span>
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
            week={week}
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
          data-study-guide="share"
          onClick={() => setPanel("range")}
        >
          {t("생각 나누기", "Share a thought")}
        </button>
        <span>
          {track === "adult"
            ? t(day.question, studyDayTitle(day, week, true))
            : t(day.familyQuestion, "What did your family notice?")}
        </span>
        <button
          type="button"
          data-study-guide="next"
          onClick={next}
          disabled={!connectionOK || busy}
        >
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
      <Dialog.Root open={toolsOpen} onOpenChange={setToolsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay study-tools-overlay" />
          <Dialog.Content
            className="study-tools-sheet"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const action = pendingToolAction.current;
              pendingToolAction.current = null;
              if (action)
                requestAnimationFrame(() => {
                  // The next dialog should return focus to a mounted control.
                  if (toolsTrigger.current?.getClientRects().length)
                    toolsTrigger.current.focus({ preventScroll: true });
                  else daySelect.current?.focus({ preventScroll: true });
                  action();
                });
              else if (toolsTrigger.current?.getClientRects().length)
                toolsTrigger.current.focus();
              else daySelect.current?.focus();
            }}
          >
            <Dialog.Title>{t("읽기 도구", "Reading tools")}</Dialog.Title>
            <Dialog.Description>
              {task.label} · {step + 1}/{tasks.length}
            </Dialog.Description>
            <Dialog.Close
              className="study-tools-close"
              aria-label={t("닫기", "Close")}
            >
              <X size={22} aria-hidden="true" />
            </Dialog.Close>
            {day.familyTasks.length > 0 && (
              <div
                className="study-tools-tracks"
                role="group"
                aria-label={t("학습 과정", "Study track")}
              >
                {(["adult", "family"] as const).map((course) => (
                  <button
                    key={course}
                    type="button"
                    disabled={busy}
                    aria-pressed={track === course}
                    onClick={() =>
                      toolAction(() => {
                        setTrack(course);
                        setStep(0);
                        setBoundary("start");
                      })
                    }
                  >
                    {course === "adult"
                      ? t("기본", "Basic")
                      : t("어린이·가족", "Children · family")}
                  </button>
                ))}
              </div>
            )}
            <div className="study-tools-actions">
              <button
                type="button"
                onClick={() => toolAction(() => setMaterialsOpen(true))}
              >
                {t("오늘의 자료", "Today’s materials")}{" "}
                <span>{tasks.length}</span>
              </button>
              <button
                type="button"
                onClick={() => toolAction(() => setPanel("question"))}
              >
                {t("오늘의 질문", "Today’s question")}
              </button>
              <button
                type="button"
                onClick={() => toolAction(() => setProgressOpen(true))}
              >
                {t("오늘의 진행률", "Today’s progress")}{" "}
                <span>{stats.percent}%</span>
              </button>
              <div className="study-tools-boundaries">
                <button
                  type="button"
                  onClick={() =>
                    toolAction(() => {
                      setBoundary("start");
                      setJump((n) => n + 1);
                    })
                  }
                >
                  {t("시작 보기 ↑", "Start ↑")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toolAction(() => {
                      setBoundary("end");
                      setJump((n) => n + 1);
                    })
                  }
                >
                  {t("끝 보기 ↓", "End ↓")}
                </button>
              </div>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {t("새 창에서 원문 읽기 ↗", "Read source in a new tab ↗")}
              </a>
              <button
                type="button"
                onClick={() => toolAction(() => setJump((n) => n + 1))}
              >
                {t("원문 다시 불러오기", "Reload source")}
              </button>
              <button
                type="button"
                data-study-guide="help"
                onClick={() => toolAction(showGuide)}
              >
                {t("사용 안내", "Reading guide")}
              </button>
              <Link href={`/week/${week}`}>
                {t("이번 주 학습으로", "Back to this week")}
              </Link>
            </div>
            <button
              type="button"
              className="study-tools-focus"
              onClick={() =>
                toolAction(() => setReadingFocus((value) => !value))
              }
            >
              {readingFocus
                ? t("도구 펼치기", "Show reading tools")
                : t("넓게 읽기", "Expand reading space")}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Modal
        title={t("오늘의 자료", "Today’s materials")}
        open={materialsOpen}
        onOpenChange={setMaterialsOpen}
        onCloseAutoFocus={returnToReader}
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
                        false,
                        week,
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
        <Link href={`/week/${week}/day/${selectedDay}?view=notes`}>
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
        onCloseAutoFocus={returnToReader}
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
            {plan.days.map((d) => (
              <tr key={d.day}>
                <th>
                  <button
                    type="button"
                    onClick={() => {
                      router.replace(
                        `/week/${week}/day/${d.day}?track=${track}`,
                        {
                          scroll: false,
                        },
                      );
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
                    week,
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
        onCloseAutoFocus={returnToReader}
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
        <Link href={`/week/${week}/day/${selectedDay}?view=notes`}>
          {t("기존 개인 기록 열기", "Open existing personal records")}
        </Link>
      </Modal>
    </div>
  );
}
