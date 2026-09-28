"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/client";
import { currentWeek } from "@/lib/curriculum";
import type { LessonConfig, LessonItem } from "@/lib/lesson-config";
import { useApp } from "../provider";
import { PageTitle } from "../learning/learn";
import { LoginForm } from "./teacher";
import { lessonImage } from "@/lib/lesson-import";
import { aiContentSchemas } from "@/lib/ai-content";
import { defaultLessonItems, resizeLesson } from "@/lib/lesson-slides";
import { BackgroundPicker } from "../background-picker";
import { cardBackgrounds } from "@/lib/card-backgrounds";
import { useSearchParams } from "next/navigation";
import { decodeJsonContainer } from "@/lib/json-data";
import { MaterialUpload } from "./material-upload";
import type { LessonMaterial } from "@/lib/lesson-materials";
const blank: LessonConfig = {
  items: [],
  theme: "midnight",
  size: "large",
  activeId: null,
};
export function LessonBuilder() {
  const { tl, t, lang, uiLang, weeks, boot, error, notify } = useApp();
  const params = useSearchParams();
  const requestedWeek = Number(params.get("week"));
  const [week, setWeek] = useState(
    weeks.some((w) => w.number === requestedWeek)
      ? requestedWeek
      : currentWeek()?.number || 38,
  );
  const [config, setConfig] = useState<LessonConfig>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "failed">(
    "idle",
  );
  const [slideCount, setSlideCount] = useState<string | null>(null);
  const visibleCount = config.items.length
    ? config.items.filter((item) => item.enabled).length
    : 6;
  const allowed =
    boot?.actor.role === "ADMIN" || boot?.actor.role === "TEACHER";
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setSlideCount(null);
    api<LessonConfig | null>(`lesson/config?week=${week}`)
      .then((value) => {
        if (active) setConfig(value || blank);
      })
      .catch(error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [week, allowed, error]);
  const save = async (value = config) => {
    if (
      new TextEncoder().encode(JSON.stringify({ week, config: value }))
        .length >= 3500000
    )
      throw new RequestError("lesson_too_large");
    await api("lesson/config", { week, config: value });
    setConfig(value);
    notify(t("수업 구성을 저장했습니다.", "Lesson saved."));
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const patch = (id: string, value: Partial<LessonItem>) =>
    setConfig((old) => ({
      ...old,
      activeId:
        value.enabled === false && old.activeId === id ? null : old.activeId,
      items: old.items.map((x) => (x.id === id ? { ...x, ...value } : x)),
    }));
  const move = (index: number, delta: number) =>
    setConfig((old) => {
      const items = [...old.items];
      [items[index], items[index + delta]] = [
        items[index + delta],
        items[index],
      ];
      return { ...old, items };
    });
  const addImage = async (id: string, file: Blob) => {
    setBusy(true);
    try {
      patch(id, { image: await lessonImage(file) });
    } catch (e) {
      notify(e instanceof Error ? e.message : t("이미지 오류", "Image error"));
    } finally {
      setBusy(false);
    }
  };
  if (!allowed)
    return (
      <div className="page narrow">
        <LoginForm />
        <p>
          {t(
            "수업 구성은 관리자와 승인된 교사가 사용할 수 있습니다.",
            "Lesson planning is available to administrators and approved teachers.",
          )}
        </p>
      </div>
    );
  return (
    <div className="page">
      <PageTitle
        eyebrow={t("수업 구성", "LESSON BUILDER")}
        title={t(
          "질문으로 열어 가는 수업",
          "Build a lesson around good questions",
        )}
        description={t(
          "질문과 활동을 추가하고 순서·표시 여부를 조정하세요. 저장한 구성은 수업 화면에 반영됩니다.",
          "Add questions and activities, reorder or hide them, then save to update your presentation.",
        )}
      />
      <section className="panel">
        <div className="two-col">
          <label className="field">
            {t("주차", "Week")}
            <select
              value={week}
              disabled={busy}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {weeks.map((w) => (
                <option value={w.number} key={w.number}>
                  {w.number} · {tl(w.title)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("수업 화면 배경", "Presentation background")}
            <select
              disabled={loading || busy}
              value={config.theme}
              onChange={(e) =>
                setConfig({
                  ...config,
                  theme: e.target.value as LessonConfig["theme"],
                })
              }
            >
              <option value="midnight">
                {t("밤하늘 · 남색", "Midnight blue")}
              </option>
              <option value="paper">
                {t("밝은 경전 책장", "Light paper")}
              </option>
              {cardBackgrounds.map((bg) => (
                <option value={bg.id} key={bg.id}>
                  {tl(bg)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("화면 글자 크기", "Presentation text size")}
            <select
              disabled={loading || busy}
              value={config.size}
              onChange={(e) =>
                setConfig({
                  ...config,
                  size: e.target.value as LessonConfig["size"],
                })
              }
            >
              <option value="normal">{t("기본", "Normal")}</option>
              <option value="large">{t("크게", "Large")}</option>
              <option value="extra">{t("아주 크게", "Extra large")}</option>
            </select>
          </label>
        </div>
        <BackgroundPicker
          value={config.theme}
          onChange={(theme) => setConfig({ ...config, theme })}
          disabled={loading || busy}
        />
        <div className="lesson-count-control">
          <label className="field">
            {t("수업 장수 (1~40장)", "Slide count (1–40)")}
            <input
              type="number"
              min={1}
              max={40}
              step={1}
              value={slideCount ?? visibleCount}
              disabled={loading || busy}
              onChange={(e) => setSlideCount(e.target.value)}
            />
          </label>
          <button
            className="button secondary"
            disabled={
              loading ||
              busy ||
              !Number.isInteger(Number(slideCount ?? visibleCount)) ||
              Number(slideCount ?? visibleCount) < 1 ||
              Number(slideCount ?? visibleCount) > 40
            }
            onClick={() =>
              run(async () => {
                const w = weeks.find((w) => w.number === week)!;
                await save(
                  resizeLesson(
                    config,
                    Number(slideCount ?? visibleCount),
                    defaultLessonItems(w, uiLang),
                    () => crypto.randomUUID(),
                    uiLang,
                  ),
                );
                setSlideCount(null);
              })
            }
          >
            {t("장수 적용 · 저장", "Apply & save count")}
          </button>
          <p className="muted">
            {t("현재 {visibleCount}장 표시 · {length}장 보관", "{visibleCount} visible · {length} hidden", { visibleCount, length: config.items.filter((item) => !item.enabled).length })}
          </p>
        </div>
        <p className="muted">
          {t(
            "장수를 줄이면 뒤쪽 화면을 숨기고 내용을 보관합니다. 다시 늘리면 보관된 화면부터 복원합니다. 각 장의 내용과 순서는 아래에서 편집할 수 있습니다.",
            "Reducing the count hides later slides and preserves their contents. Increasing restores hidden slides first. Edit content and order below.",
          )}
        </p>
        <div className="actions">
          <button
            className="button primary"
            disabled={loading || busy}
            onClick={() => run(() => save())}
          >
            {t("수업 구성 저장", "Save lesson")}
          </button>
          <Link
            className="button secondary"
            target="_blank"
            href={`/presentation?week=${week}`}
          >
            {t("수업 화면 열기 ↗", "Open presentation ↗")}
          </Link>
          <button
            className="button secondary"
            disabled={loading || busy || config.items.length >= 40}
            onClick={() =>
              setConfig({
                ...config,
                items: [
                  ...config.items,
                  {
                    id: crypto.randomUUID(),
                    kind: "question",
                    title: t("함께 생각해요", "Think together"),
                    text: "",
                    enabled: true,
                  },
                ],
              })
            }
          >
            {t("질문 · 활동 추가", "Add question / activity")}
          </button>
          <button
            className="button secondary"
            disabled={
              loading || busy || !boot?.aiAvailable || config.items.length > 35
            }
            onClick={() =>
              run(async () => {
                setAiStatus("loading");
                try {
                  const result = await api<{ content: unknown }>("ai", {
                    feature: "questions",
                    week,
                    language: lang,
                  });
                  // Validate before the React updater: exceptions inside an updater
                  // happen during rendering and cannot be caught by run().
                  const parsed = aiContentSchemas.questions.safeParse(
                    decodeJsonContainer(result?.content),
                  );
                  if (!parsed.success)
                    throw new RequestError("ai_invalid_response");
                  const items: LessonItem[] = parsed.data.questions.map(
                    (text) => ({
                      id: crypto.randomUUID(),
                      kind: "question",
                      title: t("함께 생각해요", "Think together"),
                      text,
                      enabled: true,
                    }),
                  );
                  setConfig((old) => ({
                    ...old,
                    items: [
                      ...old.items,
                      ...items.slice(0, Math.max(0, 40 - old.items.length)),
                    ],
                  }));
                  setAiStatus("idle");
                  notify(
                    t(
                      "추천 질문을 추가했습니다. 내용을 확인한 뒤 수업 구성을 저장해 주세요.",
                      "Questions added. Review them and save your lesson.",
                    ),
                  );
                } catch (e) {
                  setAiStatus("failed");
                  throw e;
                }
              })
            }
          >
            {aiStatus === "loading"
              ? t("추천 질문 만드는 중…", "Generating questions…")
              : t("AI 추천 질문 가져오기", "Add AI question drafts")}
          </button>
        </div>
        {aiStatus === "failed" && (
          <p className="notice" role="alert">
            {t(
              "추천 질문을 가져오지 못했습니다. 작성 중인 수업은 유지됩니다. 오류 안내를 확인한 뒤 다시 눌러 주세요.",
              "Questions could not be loaded. Your lesson is preserved. Check the error message and try again.",
            )}
          </p>
        )}
        <MaterialUpload
          week={week}
          remaining={40 - config.items.length}
          disabled={busy || loading}
          onDone={(items) =>
            setConfig((old) => ({ ...old, items: [...old.items, ...items] }))
          }
          onSkip={(items) =>
            setConfig((old) => ({ ...old, items: [...old.items, ...items] }))
          }
        />
        <small>
          {t(
            "변경 후 저장해 주세요. 항목이 없으면 기본 수업 화면을 사용합니다. AI 질문은 내용을 확인한 뒤 보여주세요.",
            "Save after editing. An empty list uses the default presentation. Review AI questions before presenting.",
          )}
        </small>
      </section>
      {params.get("material") && (
        <section className="panel">
          <p>
            {t(
              "선택한 자료실 슬라이드를 현재 수업 뒤에 추가할까요?",
              "Append the selected library slides to this lesson?",
            )}
          </p>
          <button
            className="button primary"
            disabled={loading || busy}
            onClick={() =>
              run(async () => {
                const rows = await api<LessonMaterial[]>(
                  `lesson-materials/${params.get("material")}`,
                );
                const material = rows[0];
                if (!material) throw new RequestError("not_found");
                if (config.items.length + material.slide_count > 40)
                  throw new RequestError("lesson_too_large");
                const items: LessonItem[] = Array.from(
                  { length: material.slide_count },
                  (_, i) => ({
                    id: crypto.randomUUID(),
                    kind: "image",
                    title: `${material.title.slice(0, 90)} · ${i + 1}`,
                    text: "",
                    image: `/api/lesson-materials/${material.id}/slides/${i}`,
                    enabled: true,
                  }),
                );
                setConfig((old) => ({
                  ...old,
                  items: [...old.items, ...items],
                }));
                notify(
                  t(
                    "추가했습니다. 수업 구성을 저장해 주세요.",
                    "Added. Save the lesson when ready.",
                  ),
                );
              })
            }
          >
            {t("현재 수업에 추가", "Add to current lesson")}
          </button>
        </section>
      )}
      {loading ? (
        <p role="status">{t("불러오는 중…", "Loading…")}</p>
      ) : (
        config.items.map((item, index) => (
          <section
            className="panel lesson-item"
            key={item.id}
            onPaste={(e) => {
              if (busy) return;
              const file = Array.from(e.clipboardData.files).find((f) =>
                f.type.startsWith("image/"),
              );
              if (file) {
                e.preventDefault();
                void addImage(item.id, file);
              }
            }}
          >
            <div className="section-heading">
              <h2>
                {index + 1}. {item.title || t("수업 항목", "Lesson item")}
              </h2>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) =>
                    patch(item.id, { enabled: e.target.checked })
                  }
                />
                {t("수업에 표시", "Show in lesson")}
              </label>
            </div>
            <div className="two-col">
              <label className="field">
                {t("유형", "Type")}
                <select
                  value={item.kind}
                  onChange={(e) =>
                    patch(item.id, {
                      kind: e.target.value as LessonItem["kind"],
                    })
                  }
                >
                  <option value="start">{t("시작 화면", "Opening")}</option>
                  <option value="question">{t("질문", "Question")}</option>
                  <option value="reading">{t("경전 읽기", "Reading")}</option>
                  <option value="activity">{t("활동", "Activity")}</option>
                  <option value="explanation">
                    {t("설명", "Explanation")}
                  </option>
                  <option value="image">{t("이미지", "Image")}</option>
                  <option value="wall">{t("생각벽", "Thought wall")}</option>
                </select>
              </label>
              <label className="field">
                {t("제목", "Title")}
                <input
                  maxLength={120}
                  value={item.title}
                  onChange={(e) => patch(item.id, { title: e.target.value })}
                />
              </label>
            </div>
            {item.kind !== "wall" && (
              <label className="field">
                {t("질문 · 안내 내용", "Question / instructions")}
                <textarea
                  maxLength={6000}
                  value={item.text}
                  onChange={(e) => patch(item.id, { text: e.target.value })}
                />
              </label>
            )}
            {item.kind !== "wall" && (
              <div className="lesson-image-editor">
                <label className="field">
                  {t(
                    "캡처 이미지 붙여넣기 (Ctrl+V) 또는 파일 선택",
                    "Paste screenshot (Ctrl+V) or choose an image",
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void addImage(item.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {item.image && (
                  <>
                    <img
                      src={item.image}
                      alt={item.title || t("수업 이미지", "Lesson image")}
                    />
                    <button
                      className="text-button"
                      onClick={() => patch(item.id, { image: undefined })}
                    >
                      {t("이미지 제거", "Remove image")}
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="actions">
              <button
                className="button secondary"
                disabled={index === 0 || busy}
                onClick={() => move(index, -1)}
              >
                {t("위로", "Move up")}
              </button>
              <button
                className="button secondary"
                disabled={index === config.items.length - 1 || busy}
                onClick={() => move(index, 1)}
              >
                {t("아래로", "Move down")}
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !item.enabled ||
                  (item.kind !== "wall" &&
                    !item.text.trim() &&
                    !item.title.trim() &&
                    !item.image)
                }
                onClick={() =>
                  run(() =>
                    save({
                      ...config,
                      activeId: item.id,
                      presentedAt: Date.now(),
                    }),
                  )
                }
              >
                {t("이 화면 보여주기", "Present this item")}
              </button>
              {item.kind === "question" && (
                <button
                  className="button secondary"
                  disabled={busy || !item.text.trim()}
                  onClick={() =>
                    run(async () => {
                      await api("create-room", {
                        week,
                        title: item.text.slice(0, 150),
                        mode: "OPEN",
                      });
                      notify(
                        t(
                          "토론방에 질문을 게시했습니다.",
                          "Question posted to discussions.",
                        ),
                      );
                    })
                  }
                >
                  {t("토론방에 질문 던지기", "Post question to discussions")}
                </button>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  setConfig({
                    ...config,
                    activeId:
                      config.activeId === item.id ? null : config.activeId,
                    items: config.items.filter((x) => x.id !== item.id),
                  })
                }
              >
                {t("삭제", "Remove")}
              </button>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
