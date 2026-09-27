"use client";
import { useState } from "react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { uploadPoster } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { Prompt } from "@/lib/prompts";

type Form = {
  title: string;
  question: string;
  reading_text: string;
  source_url: string;
  reference_label: string;
  week: number | null;
  poster_path: string | null;
};
const blank: Form = {
  title: "",
  question: "",
  reading_text: "",
  source_url: "",
  reference_label: "",
  week: null,
  poster_path: null,
};
type EditorProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prompt: Prompt | null;
  onSaved: (p: Prompt) => void;
};
// Mounted only while open, so each opening starts from the prompt's values.
export function PromptEditor(props: EditorProps) {
  const { t } = useApp();
  return (
    <Modal
      title={
        props.prompt
          ? t("질문 수정", "Edit question")
          : t("새 질문", "New question")
      }
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      {props.open && <PromptForm {...props} />}
    </Modal>
  );
}
function PromptForm({ onOpenChange, prompt, onSaved }: EditorProps) {
  const { tl, t, lang, weeks, error, notify } = useApp();
  const [form, setForm] = useState<Form>(() =>
    prompt
      ? {
          title: prompt.title,
          question: prompt.question,
          reading_text: prompt.reading_text,
          source_url: prompt.source_url || "",
          reference_label: prompt.reference_label || "",
          week: prompt.week,
          poster_path: prompt.poster_path,
        }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const chooseWeek = (value: string) => {
    const w = weeks.find((x) => x.number === Number(value));
    setForm((f) => ({
      ...f,
      week: w ? w.number : null,
      source_url: w?.sourceUrl || f.source_url,
      reference_label: w ? tl(w.reference) : f.reference_label,
    }));
  };
  const save = async () => {
    setBusy(true);
    try {
      const saved = await api<Prompt>("think/save", {
        ...form,
        id: prompt?.id,
        source_url: form.source_url.trim() || null,
      });
      notify(t("질문을 게시했습니다.", "Question published."));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const pickPoster = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set("poster_path", await uploadPoster(file, "prompts"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="event-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="field">
        {t("함께 읽을 공과", "Lesson to read together")}
        <select
          value={form.week ?? ""}
          onChange={(e) => chooseWeek(e.target.value)}
        >
          <option value="">{t("선택 안 함", "None")}</option>
          {weeks.map((w) => (
            <option key={w.number} value={w.number}>
              {w.number}. {tl(w.title)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t("제목", "Title")}
        <input
          required
          maxLength={160}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <label className="field">
        {t("질문", "Question")}
        <textarea
          required
          rows={4}
          maxLength={3000}
          value={form.question}
          onChange={(e) => set("question", e.target.value)}
        />
      </label>
      <label className="field">
        {t("읽기 자료 (선택)", "Reading (optional)")}
        <textarea
          rows={5}
          maxLength={10000}
          value={form.reading_text}
          onChange={(e) => set("reading_text", e.target.value)}
        />
      </label>
      <label className="field">
        {t("원문 주소 (https)", "Source link (https)")}
        <input
          type="url"
          inputMode="url"
          maxLength={4096}
          value={form.source_url}
          onChange={(e) => set("source_url", e.target.value)}
        />
      </label>
      <label className="field">
        {t("성구·자료 표시 (선택)", "Reference label (optional)")}
        <input
          maxLength={200}
          value={form.reference_label}
          onChange={(e) => set("reference_label", e.target.value)}
        />
      </label>
      <div className="field">
        {t(
          "질문 포스터 (선택, 5MB 이하 PNG·JPG·WebP)",
          "Poster (optional, PNG/JPG/WebP ≤ 5 MB)",
        )}
        {form.poster_path && (
          <img
            className="poster-preview"
            src={posterUrl(form.poster_path) || ""}
            alt=""
          />
        )}
        <div className="button-row">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => pickPoster(e.target.files?.[0])}
          />
          {form.poster_path && (
            <button
              type="button"
              className="text-button"
              onClick={() => set("poster_path", null)}
            >
              {t("포스터 빼기", "Remove poster")}
            </button>
          )}
        </div>
      </div>
      <div className="button-row editor-actions">
        <button
          type="submit"
          className="button"
          disabled={busy || !form.title.trim() || !form.question.trim()}
        >
          {t("게시하기", "Publish")}
        </button>
      </div>
    </form>
  );
}
