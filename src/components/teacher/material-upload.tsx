"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Modal } from "../ui/dialog";
import { useApp } from "../provider";
import { importPowerPoint } from "@/lib/lesson-import";
import type { LessonItem } from "@/lib/lesson-config";
import { api } from "@/lib/client";

export function MaterialUpload({
  week,
  remaining = 40,
  disabled = false,
  onDone,
  onSkip,
}: {
  week: number;
  remaining?: number;
  disabled?: boolean;
  onDone: (items: LessonItem[]) => void;
  onSkip?: (items: LessonItem[]) => void;
}) {
  const { tl, t, weeks, error, notify } = useApp();
  const [items, setItems] = useState<LessonItem[]>([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<number[]>([week]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState("preview");
  const save = async () => {
    setBusy(true);
    let id = "";
    try {
      const created = await api<{ id: string }>("lesson-materials/create", {
        title,
        weeks: selected,
        slide_count: items.length,
      });
      id = created.id;
      for (let i = 0; i < items.length; i++) {
        setProgress(
          t("{v}/{length}장 저장 중…", "Saving slide {v}/{length}…", { v: i + 1, length: items.length }),
        );
        await api("lesson-materials/slide", {
          id,
          index: i,
          image: items[i].image,
        });
      }
      await api("lesson-materials/finalize", { id });
      const saved = items.map((item, i) => ({
        ...item,
        image: `/api/lesson-materials/${id}/slides/${i}`,
      }));
      setItems([]);
      onDone(saved);
      notify(
        t(
          "선택한 공과의 자료실에 저장했습니다.",
          "Saved to the selected lessons.",
        ),
      );
    } catch (e) {
      if (id) await api("lesson-materials/abort", { id }).catch(() => {});
      error(e);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  return (
    <>
      <label className="field lesson-import">
        {t("PPT를 슬라이드 이미지로 가져오기", "Import PPT as slide images")}
        <input
          type="file"
          accept=".pptx"
          disabled={disabled || busy || remaining < 1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setProgress(t("슬라이드 변환 중…", "Converting slides…"));
            try {
              const result = await importPowerPoint(
                file,
                remaining,
                (done, total) =>
                  setProgress(
                    t("{done}/{total}장 이미지 변환 중…", "Converting slide {done}/{total}…", { done, total }),
                  ),
              );
              setTitle(file.name.replace(/\.pptx$/i, "").slice(0, 120));
              setSelected([week]);
              setIndex(0);
              setTab("preview");
              setItems(result);
            } catch (e) {
              notify(
                e instanceof Error
                  ? e.message
                  : t("PPT 변환 오류", "PPT conversion failed"),
              );
            } finally {
              setBusy(false);
              setProgress("");
            }
          }}
        />
        <small>
          {t(
            "PPTX 20MB 이하 · 최대 40장. 슬라이드 전체를 이미지로 변환합니다. 글꼴·일부 효과는 원본과 다를 수 있으며 애니메이션과 동영상은 정지 화면으로 표시됩니다. 구형 PPT는 PPTX로 저장해 주세요.",
            "PPTX up to 20MB and 40 slides. Each slide becomes an image. Fonts and some effects may differ; animation and video become still images. Save legacy PPT as PPTX first.",
          )}
        </small>
      </label>
      {progress && <p role="status">{progress}</p>}
      <Modal
        title={t("공과자료실에 저장할까요?", "Save to the lesson library?")}
        description={t(
          "변환된 슬라이드를 확인하고 연동할 공과를 선택해 주세요.",
          "Review the slide images and choose the linked lessons.",
        )}
        open={items.length > 0}
        onOpenChange={(open) => {
          if (!open && !busy) setItems([]);
        }}
      >
        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className="tabs">
            <Tabs.Trigger value="preview">
              {t("슬라이드 확인", "Preview slides")}
            </Tabs.Trigger>
            <Tabs.Trigger value="lessons">
              {t("공과 연동", "Link lessons")}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="preview">
            {items[index] && (
              <img
                className="material-preview"
                src={items[index].image}
                alt={t("{v}번 슬라이드", "Slide {v}", { v: index + 1 })}
              />
            )}
            <div className="actions">
              <button
                className="button secondary"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                {t("이전", "Previous")}
              </button>
              <span>
                {index + 1} / {items.length}
              </span>
              <button
                className="button secondary"
                disabled={index >= items.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                {t("다음", "Next")}
              </button>
            </div>
            <button
              className="button primary"
              onClick={() => setTab("lessons")}
            >
              {t("연동할 공과 선택", "Choose linked lessons")}
            </button>
          </Tabs.Content>
          <Tabs.Content value="lessons">
            <label className="field">
              {t("자료 제목", "Material title")}
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <p>
              {t(
                "전체 52개 공과 중 하나 이상 선택해 주세요. 여러 공과에 연결할 수 있습니다.",
                "Choose one or more lessons from the full 52-lesson course.",
              )}
            </p>
            <div className="material-weeks">
              {weeks.map((w) => (
                <label key={w.number}>
                  <input
                    type="checkbox"
                    checked={selected.includes(w.number)}
                    onChange={(e) =>
                      setSelected((old) =>
                        e.target.checked
                          ? [...old, w.number]
                          : old.filter((n) => n !== w.number),
                      )
                    }
                  />
                  <span>
                    {w.number}. {tl(w.title)}
                  </span>
                </label>
              ))}
            </div>
            <button
              className="button primary"
              disabled={busy || !title.trim() || !selected.length}
              onClick={save}
            >
              {t(
                busy ? "저장 중…" : "자료실에 저장",
                busy ? "Saving…" : "Save to library",
              )}
            </button>
          </Tabs.Content>
        </Tabs.Root>
        {progress && <p role="status">{progress}</p>}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            onSkip?.(items);
            setItems([]);
          }}
        >
          {t(
            onSkip
              ? "자료실에 저장하지 않고 수업에만 추가"
              : "저장하지 않고 닫기",
            onSkip
              ? "Add to lesson without saving to library"
              : "Close without saving",
          )}
        </button>
      </Modal>
    </>
  );
}
