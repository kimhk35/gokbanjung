"use client";
import { useState } from "react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { ORGANIZATIONS, dayKey, timeKey } from "@/lib/ward-model";
import { uploadPoster } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import { EventCard } from "./event-parts";

type Form = { title: string; description: string; date: string; start: string; end_date: string; end: string; location: string; organizations: string[]; poster_path: string | null };
function toForm(e: WardEvent | null, day: string): Form {
  if (!e) return { title: "", description: "", date: day, start: "10:00", end_date: day, end: "11:00", location: "", organizations: ["all"], poster_path: null };
  return { title: e.title, description: e.description, date: dayKey(e.starts_at), start: timeKey(e.starts_at), end_date: dayKey(e.ends_at), end: timeKey(e.ends_at), location: e.location || "", organizations: e.organizations, poster_path: e.poster_path };
}
type EditorProps = {
  open: boolean; onOpenChange: (v: boolean) => void; event: WardEvent | null; day: string; managed: string[]; onSaved: (e: WardEvent) => void;
};
// The form is mounted only while the dialog is open, so every opening starts
// from the event's current values.
export function EventEditor(props: EditorProps) {
  const { t } = useApp();
  return (
    <Modal title={props.event ? t("일정 수정", "Edit event") : t("새 일정", "New event")} open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <EditorForm {...props} />}
    </Modal>
  );
}
function EditorForm({ onOpenChange, event, day, managed, onSaved }: EditorProps) {
  const { t, lang, error, notify } = useApp();
  const [form, setForm] = useState<Form>(() => toForm(event, day));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const allowed = ORGANIZATIONS.filter(([id]) => managed.includes("all") || managed.includes(id));
  const toggleOrg = (id: string) =>
    set("organizations", form.organizations.includes(id) ? form.organizations.filter((x) => x !== id) : [...form.organizations, id]);
  const save = async (status: "draft" | "published") => {
    setBusy(true);
    try {
      const saved = await api<WardEvent>("ward/save", { ...form, id: event?.id, status });
      notify(status === "draft" ? t("임시 저장했습니다. 아직 공개되지 않았습니다.", "Saved as a private draft.") : t("게시했습니다.", "Published."));
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
      set("poster_path", await uploadPoster(file, "events"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const draft: WardEvent = {
    id: event?.id || "", slug: "", title: form.title || t("(제목 없음)", "(Untitled)"), description: form.description,
    starts_at: `${form.date}T${form.start}:00+09:00`, ends_at: `${form.end_date}T${form.end}:00+09:00`,
    location: form.location || null, organizations: form.organizations, status: "draft", poster_path: form.poster_path,
    updated_at: "", can_edit: true,
  };
  return (
    <>
      {preview ? (
        <div className="event-preview">
          <EventCard event={draft} preview />
          {form.description && <p className="preserve">{form.description}</p>}
        </div>
      ) : (
        <form className="event-form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">{t("제목", "Title")}
            <input required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <div className="field-row">
            <label className="field">{t("시작 날짜", "Start date")}
              <input type="date" value={form.date} onChange={(e) => { set("date", e.target.value); if (form.end_date < e.target.value) set("end_date", e.target.value); }} />
            </label>
            <label className="field">{t("시작 시간", "Start time")}
              <input type="time" value={form.start} onChange={(e) => set("start", e.target.value)} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">{t("끝 날짜", "End date")}
              <input type="date" value={form.end_date} min={form.date} onChange={(e) => set("end_date", e.target.value)} />
            </label>
            <label className="field">{t("끝 시간", "End time")}
              <input type="time" value={form.end} onChange={(e) => set("end", e.target.value)} />
            </label>
          </div>
          <label className="field">{t("장소", "Location")}
            <input maxLength={300} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </label>
          <fieldset className="org-picker">
            <legend>{t("대상 조직", "Organizations")}</legend>
            {allowed.map(([id, ko, en]) => (
              <label key={id} className="org-option">
                <input type="checkbox" checked={form.organizations.includes(id)} onChange={() => toggleOrg(id)} />
                {lang === "ko" ? ko : en}
              </label>
            ))}
          </fieldset>
          <label className="field">{t("설명", "Description")}
            <textarea rows={5} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="field">
            {t("포스터 (선택, 5MB 이하 PNG·JPG·WebP)", "Poster (optional, PNG/JPG/WebP ≤ 5 MB)")}
            {form.poster_path && <img className="poster-preview" src={posterUrl(form.poster_path) || ""} alt="" />}
            <div className="button-row">
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => pickPoster(e.target.files?.[0])} />
              {form.poster_path && <button type="button" className="text-button" onClick={() => set("poster_path", null)}>{t("포스터 빼기", "Remove poster")}</button>}
            </div>
          </div>
        </form>
      )}
      <div className="button-row editor-actions">
        <button type="button" className="button secondary" onClick={() => setPreview(!preview)}>
          {preview ? t("다시 수정", "Back to edit") : t("게시 전 미리 보기", "Preview")}
        </button>
        <button type="button" className="button secondary" disabled={busy || !form.title.trim() || !form.organizations.length} onClick={() => save("draft")}>
          {t("임시 저장", "Save draft")}
        </button>
        <button type="button" className="button" disabled={busy || !form.title.trim() || !form.organizations.length} onClick={() => save("published")}>
          {t("게시하기", "Publish")}
        </button>
      </div>
    </>
  );
}
