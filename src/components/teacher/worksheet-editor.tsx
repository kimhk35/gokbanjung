"use client";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Eye, RotateCcw } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { Modal } from "../ui/dialog";
import type { Localized } from "@/lib/types";
type Sheet = { items: Localized[]; version: number };
export function WorksheetEditor({ week }: { week: number }) {
  const { tl, t, lang, error, notify } = useApp();
  const [saved, setSaved] = useState<Sheet | null>(null);
  const [items, setItems] = useState<Localized[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [remove, setRemove] = useState<number | null>(null);
  const [reset, setReset] = useState(false);
  const dirty =
    !!saved && JSON.stringify(items) !== JSON.stringify(saved.items);
  useEffect(() => {
    let active = true;
    api<{ worksheet: Sheet }>(`worksheet?week=${week}`)
      .then((d) => {
        if (active) {
          setSaved(d.worksheet);
          setItems(d.worksheet.items);
        }
      })
      .catch(error);
    return () => {
      active = false;
    };
  }, [week]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  async function save() {
    if (!saved) return;
    setBusy(true);
    try {
      const [sheet] = await api<Sheet[]>("edit-worksheet", {
        week,
        items,
        expected_version: saved.version,
      });
      setSaved(sheet);
      setItems(sheet.items);
      notify(
        t(
          "새 학습지 버전을 게시했습니다.",
          "Published a new worksheet version.",
        ),
      );
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{t("학습지 수정", "Edit worksheet")}</h2>
        <span>
          {saved
            ? t(`버전 ${saved.version}`, `Version ${saved.version}`)
            : t("불러오는 중…", "Loading…")}
        </span>
      </div>
      <p className="muted">
        {t(
          "한국어와 영어 문항을 함께 편집하세요. 저장하면 새 버전이 게시됩니다. 이미 제출된 문항과 답안은 그대로 보존됩니다.",
          "Edit Korean and English prompts together. Saving publishes a new version. Earlier submissions keep their original prompts and answers.",
        )}
      </p>
      <fieldset
        disabled={busy || !saved}
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        {items.map((item, i) => (
          <div key={i} className="worksheet-edit-item">
            <div className="section-heading">
              <strong>{t(`문항 ${i + 1}`, `Question ${i + 1}`)}</strong>
              <div className="actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={i === 0}
                  aria-label={t(
                    `${i + 1}번 문항 위로`,
                    `Move question ${i + 1} up`,
                  )}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={i === items.length - 1}
                  aria-label={t(
                    `${i + 1}번 문항 아래로`,
                    `Move question ${i + 1} down`,
                  )}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={18} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={items.length === 1}
                  aria-label={t(
                    `${i + 1}번 문항 삭제`,
                    `Delete question ${i + 1}`,
                  )}
                  onClick={() => setRemove(i)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="two-col">
              {(["ko", "en"] as const).map((locale) => (
                <label key={locale} className="field">
                  {locale === "ko" ? "한국어" : "English"}
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={item[locale]}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, j) =>
                          j === i ? { ...p, [locale]: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="actions" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className="button secondary"
            disabled={items.length >= 20}
            onClick={() => setItems((prev) => [...prev, { ko: "", en: "" }])}
          >
            <Plus size={17} />
            {t("문항 추가", "Add question")} ({items.length}/20)
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => setPreview(true)}
          >
            <Eye size={17} />
            {t("미리보기", "Preview")}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={!dirty}
            onClick={() => setReset(true)}
          >
            <RotateCcw size={17} />
            {t("수정 취소", "Discard changes")}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!dirty || items.some((p) => !p.ko.trim() || !p.en.trim())}
            onClick={save}
          >
            {busy
              ? t("저장 중…", "Saving…")
              : t("새 버전 저장 · 게시", "Save & publish version")}
          </button>
        </div>
      </fieldset>
      <p role="status" className="save-status">
        {dirty
          ? t(
              "아직 저장하지 않은 수정 사항이 있습니다.",
              "You have unsaved changes.",
            )
          : t("게시된 학습지와 같습니다.", "Matches the published worksheet.")}
      </p>
      <Modal
        title={t("학습지 미리보기", "Worksheet preview")}
        open={preview}
        onOpenChange={setPreview}
      >
        <div className="worksheet-paper">
          {items.map((p, i) => (
            <div className="field" key={i}>
              <strong>
                {i + 1}. {tl(p) || t("문항을 입력하세요", "Enter a prompt")}
              </strong>
              <textarea
                rows={3}
                readOnly
                aria-label={t(
                  `${i + 1}번 답안 미리보기`,
                  `Answer ${i + 1} preview`,
                )}
              />
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        title={t("문항을 삭제할까요?", "Delete this question?")}
        open={remove !== null}
        onOpenChange={(v) => !v && setRemove(null)}
      >
        <p>
          {t(
            "저장하기 전까지 수정 취소로 되돌릴 수 있습니다.",
            "You can discard changes to undo this before saving.",
          )}
        </p>
        <button
          className="button primary"
          onClick={() => {
            setItems((prev) => prev.filter((_, i) => i !== remove));
            setRemove(null);
          }}
        >
          {t("삭제", "Delete")}
        </button>
      </Modal>
      <Modal
        title={t("수정 사항을 취소할까요?", "Discard your changes?")}
        open={reset}
        onOpenChange={setReset}
      >
        <button
          className="button primary"
          onClick={() => {
            if (saved) setItems(saved.items);
            setReset(false);
          }}
        >
          {t("게시된 버전으로 되돌리기", "Restore published version")}
        </button>
      </Modal>
    </section>
  );
}
