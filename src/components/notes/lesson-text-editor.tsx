"use client";
import { useState } from "react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { htmlToMarkdown } from "@/lib/clipboard-markdown";
import type { LessonText } from "@/lib/lesson-texts";
import { TextBlocks } from "./lesson-text-view";

type Form = {
  lang: "ko" | "en";
  title: string;
  body_markdown: string;
  source_url: string;
  rights_note: string;
  rights_confirmed: boolean;
};

// Teachers/admins upload lesson text. Posting rights must be confirmed and a
// source given; the text is saved as a draft until published.
export function LessonTextEditor({
  week,
  base,
  open,
  onOpenChange,
  onSaved,
}: {
  week: number;
  base: LessonText | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useApp();
  return (
    <Modal
      title={t("공과 본문 올리기", "Upload lesson text")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {open && (
        <EditorForm
          week={week}
          base={base}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function EditorForm({
  week,
  base,
  onOpenChange,
  onSaved,
}: {
  week: number;
  base: LessonText | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t, lang, notify, error } = useApp();
  const [form, setForm] = useState<Form>(() => ({
    lang: base?.lang || lang,
    title: base?.title || "",
    body_markdown: base?.body_markdown || "",
    source_url: base?.source_url || "",
    rights_note: base?.rights_note || "",
    rights_confirmed: false,
  }));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const ready =
    form.title.trim() &&
    form.body_markdown.trim() &&
    /^https:\/\//.test(form.source_url) &&
    form.rights_note.trim() &&
    form.rights_confirmed;
  const save = async (publish: boolean) => {
    setBusy(true);
    try {
      const saved = await api<LessonText>("notes/text-upload", {
        ...form,
        week,
      });
      if (publish)
        await api("notes/text-publish", { id: saved.id, status: "published" });
      notify(
        publish
          ? t("본문을 게시했습니다.", "Lesson text published.")
          : t(
              "임시 저장했습니다. 아직 공개되지 않았습니다.",
              "Saved as a private draft.",
            ),
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="event-form">
      <p className="guide-note">
        {t(
          "교회 자료는 저작권이 있습니다. 와드 사이트에 게시할 권한이 있는 본문만 올려 주세요. 본문 위에는 출처와 권한 메모가 항상 함께 표시됩니다.",
          "Church materials are copyrighted. Upload only text you have permission to post on the ward site. The source and rights note are always shown above the text.",
        )}
      </p>
      <div className="field-row">
        <label className="field">
          {t("언어", "Language")}
          <select
            value={form.lang}
            onChange={(e) => set("lang", e.target.value as Form["lang"])}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          {t("제목", "Title")}
          <input
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        {t("출처 주소 (https)", "Source link (https)")}
        <input
          type="url"
          inputMode="url"
          maxLength={4096}
          value={form.source_url}
          onChange={(e) => set("source_url", e.target.value)}
        />
      </label>
      <label className="field">
        {t(
          "권한 메모 (예: ○○의 허락을 받음)",
          "Rights note (e.g. permission from …)",
        )}
        <input
          maxLength={300}
          value={form.rights_note}
          onChange={(e) => set("rights_note", e.target.value)}
        />
      </label>
      {preview ? (
        <div className="lesson-text-preview">
          <TextBlocks markdown={form.body_markdown} marks={[]} />
        </div>
      ) : (
        <label className="field">
          {t(
            "본문 (웹 페이지에서 복사해 붙여 넣으면 제목·목록·굵게가 유지됩니다)",
            "Text (paste from a web page to keep headings, lists and bold)",
          )}
          <textarea
            rows={12}
            maxLength={204800}
            value={form.body_markdown}
            onChange={(e) => set("body_markdown", e.target.value)}
            onPaste={(e) => {
              const html = e.clipboardData.getData("text/html");
              if (!html) return;
              e.preventDefault();
              const md = htmlToMarkdown(html);
              const el = e.currentTarget;
              const next =
                el.value.slice(0, el.selectionStart) +
                md +
                el.value.slice(el.selectionEnd);
              set("body_markdown", next);
            }}
          />
        </label>
      )}
      <label className="present-toggle rights-check">
        <input
          type="checkbox"
          checked={form.rights_confirmed}
          onChange={(e) => set("rights_confirmed", e.target.checked)}
        />
        {t(
          "이 본문을 와드 사이트에 게시할 권한이 있음을 확인합니다",
          "I confirm I have permission to post this text on the ward site",
        )}
      </label>
      <div className="button-row editor-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => setPreview(!preview)}
        >
          {preview
            ? t("다시 수정", "Back to edit")
            : t("게시 전 미리 보기", "Preview")}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || !ready}
          onClick={() => save(false)}
        >
          {t("임시 저장", "Save draft")}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy || !ready}
          onClick={() => save(true)}
        >
          {t("게시하기", "Publish")}
        </button>
      </div>
    </div>
  );
}
