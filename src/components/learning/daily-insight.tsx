"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Pencil, Sun } from "lucide-react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { cardBackgroundUrl, loadCardBackground } from "@/lib/card-backgrounds";
import { wrapLines } from "@/lib/card-text";
import { posterUrl } from "@/lib/poster";
import { uploadPoster } from "@/lib/image-compress";
import type { AutoInsight, InsightText } from "@/lib/daily-insight";
import type { CustomInsight } from "@/lib/daily-insight-service";

type Data = {
  date: string;
  auto: AutoInsight | null;
  custom: CustomInsight | null;
  canEdit: boolean;
};
const SEEN = "ggc_insight_seen";
const FONT = '"Noto Sans KR", "Malgun Gothic", sans-serif';

// Text shown on the card: the teacher's version if any, else automatic.
function cardText(d: Data, lang: "ko" | "en"): InsightText | null {
  const auto = d.auto?.[lang] || null;
  if (!d.custom) return auto;
  return {
    kicker: auto?.kicker || d.date,
    title: d.custom.title || auto?.title || "",
    question: d.custom.question,
    topic: d.custom.topic,
    message: d.custom.message,
  };
}

export function useDailyInsight() {
  const { boot, error } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(() => {
    api<Data>("insight/today").then(setData).catch(error);
  }, [error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  return { data, reload: load };
}

async function saveImage(d: Data, text: InsightText, lang: string) {
  const name = `gokbanjung-insight-${d.date}.png`;
  let blob: Blob | null = null;
  if (d.custom?.image_path) {
    blob = await (await fetch(posterUrl(d.custom.image_path)!)).blob();
  } else {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbf7f0";
    ctx.fillRect(0, 0, 1080, 1350);
    const art = d.auto
      ? await loadCardBackground(d.auto.background).catch(() => null)
      : null;
    if (art) {
      ctx.globalAlpha = 0.35;
      const s = Math.max(
        1080 / (art.naturalWidth || 1600),
        1350 / (art.naturalHeight || 1000),
      );
      ctx.drawImage(
        art,
        1080 - (art.naturalWidth || 1600) * s,
        1350 - (art.naturalHeight || 1000) * s,
        (art.naturalWidth || 1600) * s,
        (art.naturalHeight || 1000) * s,
      );
      ctx.globalAlpha = 1;
    }
    const measure = (s: string) => ctx.measureText(s).width;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = "#12706d";
    ctx.beginPath();
    ctx.roundRect(80, 80, measure(text.kicker) + 60, 76, 38);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text.kicker, 110, 132);
    ctx.fillStyle = "#233a3a";
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText(text.title.slice(0, 26), 80, 230);
    ctx.font = `800 64px ${FONT}`;
    let y = 340;
    for (const line of wrapLines(measure, `“${text.question}”`, 920, 6)) {
      ctx.fillText(line, 80, y);
      y += 92;
    }
    ctx.font = `500 34px ${FONT}`;
    for (const [label, value] of [
      [lang === "ko" ? "핵심 주제" : "Key topic", text.topic],
      [lang === "ko" ? "핵심 메시지" : "Key message", text.message],
    ]) {
      if (!value) continue;
      y += 30;
      ctx.fillStyle = "#12706d";
      ctx.fillRect(80, y - 34, 190, 48);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, 96, y);
      ctx.fillStyle = "#233a3a";
      for (const line of wrapLines(measure, value, 920, 3)) {
        y += 56;
        ctx.fillText(line, 80, y);
      }
    }
    ctx.fillStyle = "#9a5f12";
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(
      lang === "ko"
        ? "곡반정와드 · 오늘의 Insight"
        : "Gokbanjeong Ward · Today’s insight",
      80,
      1270,
    );
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  }
  if (!blob) return;
  const file = new File([blob], name, { type: blob.type || "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function DailyInsightCard({
  data,
  onEdit,
}: {
  data: Data;
  onEdit?: () => void;
}) {
  const { t, lang } = useApp();
  const text = cardText(data, lang);
  if (!text) return null;
  const image = data.custom?.image_path
    ? posterUrl(data.custom.image_path)
    : null;
  const art = data.auto ? cardBackgroundUrl(data.auto.background) : null;
  return (
    <article
      className="daily-insight"
      style={art ? { ["--insight-art" as string]: `url(${art})` } : undefined}
    >
      {image ? (
        <img className="daily-insight-image" src={image} alt={text.question} />
      ) : (
        <>
          <header>
            <span className="insight-kicker">{text.kicker}</span>
            <strong>{text.title}</strong>
          </header>
          <p className="insight-question">“{text.question}”</p>
          {text.topic && (
            <p className="insight-row">
              <span>{t("핵심 주제", "Key topic")}</span>
              {text.topic}
            </p>
          )}
          {text.message && (
            <p className="insight-row">
              <span>{t("핵심 메시지", "Key message")}</span>
              {text.message}
            </p>
          )}
        </>
      )}
      <div className="button-row insight-actions">
        {data.auto && (
          <Link
            className="button"
            href={`/week/${data.auto.week}/day/${data.auto.day}`}
          >
            <Sun size={18} /> {t("오늘 학습 시작", "Start today’s study")}
          </Link>
        )}
        <button
          type="button"
          className="button secondary"
          onClick={() => saveImage(data, text, lang)}
        >
          <Download size={18} />{" "}
          {t("이미지로 저장·공유", "Save or share image")}
        </button>
        {data.canEdit && onEdit && (
          <button type="button" className="button secondary" onClick={onEdit}>
            <Pencil size={18} /> {t("오늘 카드 수정", "Edit today’s card")}
          </button>
        )}
      </div>
    </article>
  );
}

function InsightEditor({
  data,
  open,
  onOpenChange,
  onSaved,
}: {
  data: Data;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useApp();
  return (
    <Modal
      title={t("오늘의 Insight 수정", "Edit today’s insight")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {open && (
        <InsightForm
          data={data}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
function InsightForm({
  data,
  onOpenChange,
  onSaved,
}: {
  data: Data;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t, lang, notify, error } = useApp();
  const base = cardText(data, lang);
  const [form, setForm] = useState({
    title: base?.title || "",
    question: base?.question || "",
    topic: base?.topic || "",
    message: base?.message || "",
    image_path: data.custom?.image_path || null,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string | null) =>
    setForm((f) => ({ ...f, [k]: v }));
  const run = async (action: "save" | "reset") => {
    setBusy(true);
    try {
      await api(
        `insight/${action}`,
        action === "save" ? { ...form, date: data.date } : { date: data.date },
      );
      notify(
        action === "save"
          ? t("오늘 카드를 저장했습니다.", "Today’s card saved.")
          : t("자동 카드로 되돌렸습니다.", "Back to the automatic card."),
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set("image_path", await uploadPoster(file, "insights"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="event-form">
      <p className="muted">
        {t(
          `${data.date} 하루만 바뀝니다. 비워 둔 칸은 표시하지 않아요.`,
          `Changes only ${data.date}. Empty fields are hidden.`,
        )}
      </p>
      <label className="field">
        {t("제목", "Title")}
        <input
          maxLength={120}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <label className="field">
        {t("오늘의 질문", "Today’s question")}
        <textarea
          rows={3}
          maxLength={500}
          value={form.question}
          onChange={(e) => set("question", e.target.value)}
        />
      </label>
      <label className="field">
        {t("핵심 주제", "Key topic")}
        <input
          maxLength={200}
          value={form.topic}
          onChange={(e) => set("topic", e.target.value)}
        />
      </label>
      <label className="field">
        {t("핵심 메시지", "Key message")}
        <textarea
          rows={3}
          maxLength={600}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </label>
      <div className="field">
        {t(
          "카드 그림 (선택, 넣으면 그림이 카드 전체로 보여요)",
          "Card picture (optional; shown as the whole card)",
        )}
        {form.image_path && (
          <img
            className="poster-preview"
            src={posterUrl(form.image_path) || ""}
            alt=""
          />
        )}
        <div className="button-row">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {form.image_path && (
            <button
              type="button"
              className="text-button"
              onClick={() => set("image_path", null)}
            >
              {t("그림 빼기", "Remove picture")}
            </button>
          )}
        </div>
      </div>
      <div className="button-row editor-actions">
        {data.custom && (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => run("reset")}
          >
            {t("자동 카드로 되돌리기", "Use the automatic card")}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={busy || !form.question.trim()}
          onClick={() => run("save")}
        >
          {t("저장", "Save")}
        </button>
      </div>
    </div>
  );
}

// Home: always-visible card with the teacher edit button.
export function DailyInsightHome() {
  const { data, reload } = useDailyInsight();
  const [editing, setEditing] = useState(false);
  if (!data || (!data.auto && !data.custom)) return null;
  return (
    <section className="daily-insight-home">
      <DailyInsightCard data={data} onEdit={() => setEditing(true)} />
      <InsightEditor
        data={data}
        open={editing}
        onOpenChange={setEditing}
        onSaved={reload}
      />
    </section>
  );
}

// Popup on the first visit of each day (Korea date).
export function DailyInsightPopup() {
  const { t } = useApp();
  const path = usePathname();
  const { data } = useDailyInsight();
  const [dismissed, setDismissed] = useState(false);
  const skip = path.startsWith("/presentation") || path.startsWith("/admin");
  let seen = true;
  if (data) {
    try {
      seen = localStorage.getItem(SEEN) === data.date;
    } catch {
      seen = true;
    }
  }
  const open =
    !!data && !skip && !dismissed && !seen && !!(data.auto || data.custom);
  const close = () => {
    try {
      if (data) localStorage.setItem(SEEN, data.date);
    } catch {}
    setDismissed(true);
  };
  return (
    <Modal
      title={t("오늘의 Insight", "Today’s insight")}
      open={open}
      onOpenChange={(v) => !v && close()}
    >
      {data && <DailyInsightCard data={data} />}
    </Modal>
  );
}
