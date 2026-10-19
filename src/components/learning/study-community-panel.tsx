"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import type { Prompt } from "@/lib/prompts";
import type {
  StudyFeedItem,
  StudyOverview,
  StudyThought,
} from "@/lib/study-community";
import { useApp } from "../provider";
import { useLocalDraft } from "../use-local-draft";
import { PromptEditor } from "../think/prompt-editor";
import { PromptView } from "../think/prompt-view";
import { rememberAuthor, useAuthorDefault } from "../think/reply-item";

type Mode = "question" | "range" | "collection";
type Source = { path: string; anchor: string; label: string };
type Props = {
  week: number;
  day: number;
  track?: "adult" | "family";
  source: Source;
  mode: Mode;
  onClose: () => void;
  onChanged: () => void;
};

export function StudyCommunityPanel(props: Props) {
  return (
    <StudyCommunity
      key={`${props.week}:${props.day}:${props.mode}`}
      {...props}
    />
  );
}
function StudyCommunity({
  week,
  day,
  track = "adult",
  source,
  mode,
  onClose,
  onChanged,
}: Props) {
  const { t, boot } = useApp();
  const [view, setView] = useState<Mode>(mode);
  const [overview, setOverview] = useState<StudyOverview | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const load = useCallback(() => {
    api<StudyOverview>(`think/study-overview?week=${week}`)
      .then((data) => {
        setOverview(data);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [week]);
  useEffect(() => {
    load();
  }, [boot, load]);
  useEffect(() => {
    const query = matchMedia("(max-width: 900px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const background = [
      ...document.querySelectorAll<HTMLElement>(
        ".study-reader-top,.study-reader-scopes,.study-reader-source,.study-reader-bottom",
      ),
    ].filter((el) => !el.contains(panel.current));
    const previous = background.map((el) => el.inert);
    background.forEach((el) => {
      el.inert = true;
    });
    return () =>
      background.forEach((el, i) => {
        el.inert = previous[i];
      });
  }, [mobile]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const handle = (e: KeyboardEvent) => {
      // Radix editor/poster dialogs manage their own keyboard and focus.
      if (
        document.querySelector(
          "[data-radix-popper-content-wrapper], [role=dialog][data-state=open]",
        )
      )
        return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key !== "Tab" || !matchMedia("(max-width: 900px)").matches) return;
      const nodes = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex='0']",
        ) || []),
      ].filter((el) => el.getClientRects().length);
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  const changed = () => {
    load();
    onChanged();
  };
  const question =
    overview?.questions.find((q) => q.slug === selected) ||
    overview?.questions.find((q) => q.study_day === day);
  return (
    <aside
      ref={panel}
      className="study-community-panel"
      data-mobile={mobile}
      role={mobile ? "dialog" : "complementary"}
      aria-modal={mobile || undefined}
      aria-label={t("질문과 생각 나누기", "Questions and shared thoughts")}
    >
      <header className="study-community-header">
        <h2>
          {view === "collection"
            ? t("질문과 생각 모아보기", "Questions and thoughts")
            : view === "range"
              ? t("이 범위의 생각", "Thoughts on this passage")
              : t("오늘의 질문", "Today's question")}
        </h2>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label={t("닫기", "Close")}
        >
          <X size={22} />
        </button>
      </header>
      <nav
        className="study-community-tabs"
        aria-label={t("나눔 보기", "Sharing views")}
      >
        {(
          [
            ["question", t("오늘의 질문", "Today's question")],
            ["range", t("범위의 생각", "Passage thoughts")],
            ["collection", t("전체 모아보기", "View all")],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className="button secondary"
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="study-community-body">
        {failed && (
          <p role="alert">
            {t("질문을 불러오지 못했습니다.", "Unable to load questions.")}{" "}
            <button type="button" className="text-button" onClick={load}>
              {t("다시 시도", "Retry")}
            </button>
          </p>
        )}
        {!overview && !failed && (
          <p role="status">{t("불러오는 중…", "Loading…")}</p>
        )}
        {view === "question" && overview && (
          <>
            <div className="study-community-question-select">
              <label>
                {t("질문 선택", "Choose a question")}
                <select
                  value={question?.slug || ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">
                    {t("오늘의 질문", "Today's question")}
                  </option>
                  {overview.questions.map((q) => (
                    <option key={q.id} value={q.slug}>
                      {q.study_day ? `${q.study_day} · ` : ""}
                      {q.title}
                    </option>
                  ))}
                </select>
              </label>
              {overview.canAuthor && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setEditor(true)}
                >
                  {t("질문 올리기", "New question")}
                </button>
              )}
            </div>
            {question ? (
              <PromptView
                key={question.slug}
                slug={question.slug}
                embedded
                onChanged={changed}
              />
            ) : (
              <p className="muted">
                {t(
                  "이 일차에 등록된 교사의 질문이 없습니다. 질문을 선택하거나 범위의 생각을 자유롭게 남겨 주세요.",
                  "No teacher question is assigned to this day. Choose another question or share a passage thought.",
                )}
              </p>
            )}
          </>
        )}
        {view === "range" && (
          <RangeThoughts
            key={`${week}:${source.path}:${source.anchor}`}
            week={week}
            day={day}
            track={track}
            source={source}
            onChanged={onChanged}
          />
        )}
        {view === "collection" && (
          <Collection
            week={week}
            questions={overview?.questions || []}
            onQuestion={(slug) => {
              setSelected(slug);
              setView("question");
            }}
          />
        )}
      </div>
      <PromptEditor
        open={editor}
        onOpenChange={setEditor}
        prompt={null}
        initialWeek={week}
        initialDay={day}
        onSaved={(p) => {
          setSelected(p.slug);
          setView("question");
          changed();
        }}
      />
    </aside>
  );
}

function RangeThoughts({
  week,
  day,
  track,
  source,
  onChanged,
}: Omit<Props, "mode" | "onClose">) {
  const { t, boot, error } = useApp();
  const author = useAuthorDefault();
  const draft = useLocalDraft(
    boot
      ? `${boot.actor.id}:study-range:${week}:${source.path}:${source.anchor}`
      : null,
    { author, body: "", visibility: "public" },
  );
  const [items, setItems] = useState<StudyThought[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [publicCount, setPublicCount] = useState(0);
  const load = useCallback(() => {
    api<{ items: StudyThought[]; publicCount: number }>(
      `think/study-thoughts?${new URLSearchParams({ week: String(week), path: source.path, anchor: source.anchor })}`,
    )
      .then((d) => {
        setFailed(false);
        setItems(d.items);
        setPublicCount(d.publicCount);
      })
      .catch(() => setFailed(true));
  }, [week, source.path, source.anchor]);
  useEffect(() => {
    load();
  }, [boot, load]);
  const submit = async () => {
    if (!boot) return;
    setBusy(true);
    try {
      const thought = await api<StudyThought>("think/study-thought", {
        id: newId(),
        week,
        day,
        track: track ?? "adult",
        ...source,
        body: draft.value.body,
        author: draft.value.author,
        visibility: draft.value.visibility,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      setItems((list) => [...list, thought]);
      if (thought.visibility === "public") setPublicCount((n) => n + 1);
      onChanged();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await api("think/study-thought-delete", { id });
      load();
      onChanged();
    } catch (e) {
      error(e);
    }
  };
  return (
    <div className="study-range-view">
      <p className="study-community-context">
        {source.label}
        <small>
          {t(
            "공개된 생각 {n}개 · 개인 메모는 나에게만 보입니다.",
            "{n} public thoughts · private notes are visible only to you.",
            { n: publicCount },
          )}
        </small>
      </p>
      <section
        className="study-range-items"
        aria-label={t("사람들의 생각", "Shared thoughts")}
        aria-live="polite"
      >
        {failed && (
          <p role="alert">
            {t("생각을 불러오지 못했습니다.", "Unable to load thoughts.")}{" "}
            <button className="text-button" onClick={load}>
              {t("다시 시도", "Retry")}
            </button>
          </p>
        )}
        {!items.length && !failed && (
          <p className="muted">
            {t(
              "이 범위에서 느낀 점을 처음으로 나눠 보세요.",
              "Be the first to share a thought on this passage.",
            )}
          </p>
        )}
        {items.map((item) => (
          <article key={item.id} className="study-thought-card">
            <div>
              <strong>{item.author}</strong>
              {item.visibility === "private" && (
                <small> · {t("나만 보기", "Private")}</small>
              )}
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleDateString()}
              </time>
            </div>
            <p className="preserve">{item.body}</p>
            {item.mine && (
              <button
                className="text-button"
                type="button"
                onClick={() => remove(item.id)}
              >
                {t("삭제", "Delete")}
              </button>
            )}
          </article>
        ))}
      </section>
      <form
        className="study-community-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="study-range-author">
          {t("이름 (비우면 익명)", "Name (blank = anonymous)")}
        </label>
        <input
          id="study-range-author"
          disabled={!boot}
          maxLength={50}
          placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
          value={draft.value.author}
          onChange={(e) => draft.setField("author", e.target.value)}
        />
        <label className="sr-only" htmlFor="study-range-body">
          {t("나의 생각", "Your thought")}
        </label>
        <textarea
          id="study-range-body"
          disabled={!boot}
          rows={3}
          maxLength={3000}
          placeholder={t("짧은 생각도 좋아요.", "A short thought is welcome.")}
          required
          value={draft.value.body}
          onChange={(e) => draft.setField("body", e.target.value)}
        />
        <div className="button-row">
          <label>
            {t("공개 범위", "Visibility")}
            <select
              value={draft.value.visibility}
              onChange={(e) => draft.setField("visibility", e.target.value)}
            >
              <option value="public">
                {t("함께 나누기", "Share publicly")}
              </option>
              <option value="private">{t("나만 보기", "Only me")}</option>
            </select>
          </label>
          <button
            type="submit"
            className="button"
            disabled={!boot || busy || !draft.value.body.trim()}
          >
            {draft.value.visibility === "private"
              ? t("개인 메모 저장", "Save private note")
              : t("생각 나누기", "Share thought")}
          </button>
        </div>
        {!boot && (
          <small role="status">
            {t(
              "연결이 복구되면 생각을 등록할 수 있습니다. 작성 중인 내용은 유지됩니다.",
              "Posting becomes available when your connection is restored. Your text stays here.",
            )}
          </small>
        )}
        <small className="muted">
          {draft.saved
            ? t(
                "이 기기에 임시 저장됨 · 게시 전에는 공개되지 않아요",
                "Draft saved on this device · not public until posted",
              )
            : t(
                "교회 계정의 주석과는 별도로 이 앱에 저장됩니다.",
                "Saved in this app, separately from Church account annotations.",
              )}
        </small>
      </form>
    </div>
  );
}

function Collection({
  week,
  questions,
  onQuestion,
}: {
  week: number;
  questions: Prompt[];
  onQuestion: (slug: string) => void;
}) {
  const { t } = useApp();
  const [tab, setTab] = useState<"questions" | "thoughts">("questions");
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(0);
  const [feed, setFeed] = useState<StudyFeedItem[]>([]);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    api<{ items: StudyFeedItem[] }>(`think/study-feed?week=${week}`)
      .then((d) => {
        setFeed(d.items);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [week]);
  useEffect(() => {
    load();
  }, [load]);
  const matches = (text: string, d: number | null | undefined) =>
    (!day || d === day) &&
    text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  return (
    <section className="study-community-collection">
      <div className="button-row">
        <button
          className="button secondary"
          aria-pressed={tab === "questions"}
          onClick={() => setTab("questions")}
        >
          {t("전체 질문", "All questions")}
        </button>
        <button
          className="button secondary"
          aria-pressed={tab === "thoughts"}
          onClick={() => setTab("thoughts")}
        >
          {t("사람들의 생각", "Shared thoughts")}
        </button>
      </div>
      <div className="study-community-filters">
        <input
          aria-label={t("질문과 생각 검색", "Search questions and thoughts")}
          placeholder={t("검색", "Search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t("일차 필터", "Filter by day")}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          <option value={0}>{t("모든 일차", "All days")}</option>
          {Array.from({ length: 7 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {t("{day}일차", "Day {day}", { day: i + 1 })}
            </option>
          ))}
        </select>
      </div>
      {tab === "questions" ? (
        <>
          <p className="muted">
            {t(
              "질문을 열면 포스터와 댓글을 함께 보고 바로 답할 수 있습니다.",
              "Open a question to see its poster and replies, and respond.",
            )}
          </p>
          {questions
            .filter((q) => matches(`${q.title} ${q.question}`, q.study_day))
            .map((q) => (
              <article key={q.id} className="study-thought-card">
                <button
                  className="text-button"
                  onClick={() => onQuestion(q.slug)}
                >
                  {q.title}
                </button>
                <p>{q.question}</p>
                <small>
                  {q.study_day
                    ? t("{day}일차", "Day {day}", { day: q.study_day })
                    : t("주간 질문", "Weekly question")}{" "}
                  · {q.reply_count} {t("생각", "replies")}
                </small>
                <Link
                  href={`/p/${q.slug}`}
                  target="_blank"
                  className="text-button"
                >
                  {t("질문 링크 ↗", "Question link ↗")}
                </Link>
              </article>
            ))}
          {!questions.length && (
            <p className="muted">
              {t(
                "이번 주에 등록된 질문이 없습니다.",
                "No questions have been posted for this week.",
              )}
            </p>
          )}
        </>
      ) : (
        <>
          {failed && (
            <p role="alert">
              {t("생각을 불러오지 못했습니다.", "Unable to load thoughts.")}
              <button className="text-button" onClick={load}>
                {t("다시 시도", "Retry")}
              </button>
            </p>
          )}
          {feed
            .filter((item) =>
              matches(`${item.body} ${item.author} ${item.label}`, item.day),
            )
            .map((item) => (
              <article
                key={`${item.kind}:${item.id}`}
                className="study-thought-card"
              >
                <small>{item.label}</small>
                <p className="preserve">{item.body}</p>
                <strong>{item.author}</strong>
                {item.kind === "question" ? (
                  <button
                    className="text-button"
                    onClick={() => onQuestion(item.href.split("/").pop()!)}
                  >
                    {t("질문과 답글 보기", "View question and replies")}
                  </button>
                ) : (
                  <Link href={item.href} className="text-button">
                    {t("해당 일차로 이동", "Go to study day")}
                  </Link>
                )}
              </article>
            ))}
          {!feed.length && !failed && (
            <p className="muted">
              {t("아직 공개된 생각이 없습니다.", "No public thoughts yet.")}
            </p>
          )}
          <small className="muted">
            {t(
              "나만 보기 메모는 이 모음에 표시되지 않습니다.",
              "Private notes do not appear in this collection.",
            )}
          </small>
        </>
      )}
    </section>
  );
}
