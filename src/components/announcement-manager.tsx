"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { currentWeek } from "@/lib/curriculum";
import { useApp } from "./provider";
import { Confirm } from "./ui/dialog";
type Item = { id: string; content: { ko: string; en: string } };
export function AnnouncementManager() {
  const { tl, t, lang, error, notify } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");
  const [id, setId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const load = () => api<Item[]>("announcements").then(setItems);
  useEffect(() => {
    load().catch(error);
  }, [error]);
  const translate = async (text: string, language: "ko" | "en") => {
    const result = await api<{ content: { translation: string } }>("ai", {
      feature: "translate",
      week: currentWeek()?.number || 1,
      language,
      text,
    });
    return result.content.translation.trim();
  };
  const reset = () => {
    setId(undefined);
    setKo("");
    setEn("");
  };
  const update = () => {
    window.dispatchEvent(new Event("ggc-announcements-updated"));
    return load();
  };
  return (
    <>
      <section className="panel">
        <span className="overline">{t("공지 관리", "ANNOUNCEMENTS")}</span>
        <h2>
          {id
            ? t("공지 수정", "Edit announcement")
            : t("새 공지 작성", "New announcement")}
        </h2>
        <p>
          {t(
            "한 언어만 작성하면 빈 언어를 자동 번역해 게시합니다. 새 공지와 수정된 공지는 학습자에게 팝업으로 안내됩니다.",
            "Write in one language to translate the other when publishing. New and updated announcements appear in a learner popup.",
          )}
        </p>
        <label className="field">
          한국어
          <textarea
            value={ko}
            maxLength={6000}
            onChange={(e) => setKo(e.target.value)}
          />
        </label>
        <label className="field">
          English
          <textarea
            value={en}
            maxLength={6000}
            onChange={(e) => setEn(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="button secondary"
            disabled={busy || !ko.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                setEn(await translate(ko, "en"));
              } catch (e) {
                error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            한국어 → English
          </button>
          <button
            className="button secondary"
            disabled={busy || !en.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                setKo(await translate(en, "ko"));
              } catch (e) {
                error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            English → 한국어
          </button>
          <button
            className="button primary"
            disabled={busy || (!ko.trim() && !en.trim())}
            onClick={async () => {
              setBusy(true);
              try {
                const content = { ko: ko.trim(), en: en.trim() };
                if (!content.ko) content.ko = await translate(content.en, "ko");
                if (!content.en) content.en = await translate(content.ko, "en");
                await api("announcement/manage", {
                  action: "save",
                  id,
                  content,
                });
                reset();
                await update();
                notify(t("공지를 게시했습니다.", "Announcement published."));
              } catch (e) {
                error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? t("처리 중…", "Working…")
              : id
                ? t("수정 저장", "Save changes")
                : t("공지 게시 · 자동 번역", "Publish · auto-translate")}
          </button>
          {id && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={reset}
            >
              {t("수정 취소", "Cancel editing")}
            </button>
          )}
        </div>
      </section>
      <h2>
        {t("게시된 공지", "Published announcements")} · {items.length}
      </h2>
      {!items.length && (
        <p className="muted">
          {t("아직 공지가 없습니다.", "No announcements yet.")}
        </p>
      )}
      {items.map((item) => (
        <article className="panel" key={item.id}>
          <p className="preserve">{tl(item.content)}</p>
          <details>
            <summary>{t("다른 언어 보기", "View other language")}</summary>
            <p className="preserve">
              {item.content[lang === "ko" ? "en" : "ko"]}
            </p>
          </details>
          <div className="actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setId(item.id);
                setKo(item.content.ko);
                setEn(item.content.en);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {t("수정", "Edit")}
            </button>
            <Confirm
              title={t("공지 삭제", "Delete announcement")}
              description={t(
                "이 공지를 목록과 팝업에서 삭제합니다.",
                "Remove this announcement from the list and popup.",
              )}
              trigger={
                <button className="button danger" disabled={busy}>
                  {t("삭제", "Delete")}
                </button>
              }
              onConfirm={async () => {
                setBusy(true);
                try {
                  await api("announcement/manage", {
                    action: "delete",
                    id: item.id,
                  });
                  if (id === item.id) reset();
                  await update();
                } catch (e) {
                  error(e);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        </article>
      ))}
    </>
  );
}
