"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BackgroundPicker } from "../background-picker";
import {
  cardBackgrounds,
  cardBackgroundUrl,
  loadCardBackground,
} from "@/lib/card-backgrounds";
import { Download, Sparkles, Share2 } from "lucide-react";
import { useApp } from "../provider";
import { api, RequestError } from "@/lib/client";
import { aiContentSchemas } from "@/lib/ai-content";
import { decodeJsonContainer } from "@/lib/json-data";
import { currentWeek } from "@/lib/curriculum";
import { PageTitle, WeekPicker } from "./learn";
type Insight = { headline: string; question: string; action: string };
export function InsightPage() {
  const { t, lang, weeks, boot, error, notify } = useApp();
  const params = useSearchParams();
  const [week, setWeek] = useState(
    Number(params.get("week")) || currentWeek()?.number || 38,
  );
  const [insight, setInsight] = useState<Insight>({
    headline: "",
    question: "",
    action: "",
  });
  const [ai, setAi] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState("1:1");
  const [summary, setSummary] = useState("");
  const [theme, setTheme] = useState("scriptures");
  const drawVersion = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const w = weeks.find((w) => w.number === week)!;
  useEffect(() => {
    const raw = localStorage.getItem(
      `ggc_insight:${boot?.actor.id}:${week}:${lang}`,
    );
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const restored = aiContentSchemas.insight.safeParse(
          decodeJsonContainer(data.insight),
        );
        if (restored.success) {
          setInsight(restored.data);
          setAi(Boolean(data.ai));
        } else {
          setInsight({ headline: "", question: "", action: "" });
          setAi(false);
        }
      } catch {}
    } else {
      setInsight({ headline: "", question: "", action: "" });
      setAi(false);
    }
    setSummary("");
  }, [week, lang, boot?.actor.id]);
  useEffect(() => {
    localStorage.setItem(
      `ggc_insight:${boot?.actor.id}:${week}:${lang}`,
      JSON.stringify({ insight, ai }),
    );
  }, [insight, ai]);
  const generate = async (feature: "insight" | "weekly") => {
    setBusy(true);
    try {
      const d = await api<{
        content: Insight & {
          summary: string;
          themes: string[];
          nextQuestion: string;
          sentence: string;
        };
      }>("ai", { feature, week, language: lang, consent });
      if (feature === "insight") {
        const parsed = aiContentSchemas.insight.safeParse(
          decodeJsonContainer(d.content),
        );
        if (!parsed.success) throw new RequestError("ai_invalid_response");
        setInsight(parsed.data);
        setAi(true);
      } else {
        const parsed = aiContentSchemas.weekly.safeParse(
          decodeJsonContainer(d.content),
        );
        if (!parsed.success) throw new RequestError("ai_invalid_response");
        setSummary(
          [
            parsed.data.summary,
            ...parsed.data.themes,
            parsed.data.nextQuestion,
            parsed.data.sentence,
          ].join("\n\n"),
        );
      }
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  async function draw() {
    const el = canvas.current;
    if (!el) return;
    const version = ++drawVersion.current;
    await document.fonts.ready;
    const background = cardBackgroundUrl(theme)
      ? await loadCardBackground(theme)
      : null;
    if (version !== drawVersion.current) return;
    el.width = 1080;
    el.height = ratio === "1:1" ? 1080 : ratio === "4:5" ? 1350 : 1920;
    const ctx = el.getContext("2d")!;
    ctx.fillStyle =
      theme === "navy" ? "#20364a" : theme === "sage" ? "#405b50" : "#ece7db";
    ctx.fillRect(0, 0, el.width, el.height);
    if (background) {
      const width = background.naturalWidth || 1600,
        height = background.naturalHeight || 1000;
      const scale = Math.max(el.width / width, el.height / height);
      // Anchor artwork on the right; keep the text region shaded and readable.
      ctx.drawImage(
        background,
        el.width - width * scale,
        el.height - height * scale,
        width * scale,
        height * scale,
      );
      ctx.fillStyle = "#06142666";
      ctx.fillRect(0, 0, el.width, el.height);
    }
    ctx.fillStyle = theme === "sand" ? "#20364a" : "#ffffff";
    ctx.font = '28px "Noto Sans KR"';
    ctx.fillText(lang === "ko" ? "오늘의 발견" : "TODAY’S INSIGHT", 100, 140);
    const wrap = (str: string, font: number) => {
      ctx.font = `${font}px "Noto Sans KR"`;
      const lines: string[] = [];
      let row = "";
      for (const char of Array.from(str)) {
        if (ctx.measureText(row + char).width > 880 || char === "\n") {
          lines.push(row);
          row = char === "\n" ? "" : char;
        } else row += char;
      }
      if (row) lines.push(row);
      return lines;
    };
    const groups = [
      { text: insight.headline, size: 56, gap: 35 },
      { text: w.reference[lang], size: 26, gap: 45 },
      { text: insight.question, size: 30, gap: 25 },
      { text: insight.action, size: 30, gap: 0 },
    ];
    let scale = 1;
    for (let i = 0; i < 20; i++) {
      const height = groups.reduce(
        (sum, g) =>
          sum +
          wrap(g.text, g.size * scale).length * g.size * scale * 1.6 +
          g.gap,
        0,
      );
      if (height <= el.height - 440) break;
      scale *= 0.91;
    }
    let y = 260;
    for (const g of groups) {
      const size = g.size * scale;
      ctx.font = `${size}px "Noto Sans KR"`;
      for (const line of wrap(g.text, size)) {
        ctx.fillText(line, 100, y);
        y += size * 1.6;
      }
      y += g.gap;
    }
    ctx.font = '22px "Noto Sans KR"';
    ctx.fillText(
      ai
        ? t("AI 학습 보조자료", "AI learning aid")
        : t("나의 학습 기록", "My learning record"),
      100,
      el.height - 105,
    );
    ctx.fillText(
      t("곡반정와드 복음교리반", "Gokbanjeong Ward Gospel Doctrine"),
      100,
      el.height - 60,
    );
  }

  useEffect(() => {
    void draw().catch(error);
  }, [insight, ratio, theme, lang, ai]);
  const download = async (share = false) => {
    await draw();
    const el = canvas.current!;
    el.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `insight-week-${week}.png`, {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch {}
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  return (
    <div className="page">
      <PageTitle
        eyebrow={t("오늘의 발견", "TODAY’S INSIGHT")}
        title={t("오늘의 한 문장을 간직하세요", "Keep a sentence from today")}
        description={t(
          "나의 생각을 직접 담거나, AI의 도움으로 정리할 수 있습니다.",
          "Write your own insight or use AI to reflect on your learning.",
        )}
      />
      <WeekPicker week={week} onChange={setWeek} />
      <div className="insight-layout">
        <div>
          <div className="panel">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t(
                "이번 주 내 묵상 기록을 AI 요약에 사용하는 데 동의합니다.",
                "I agree to use my reflections from this week for AI summarization.",
              )}
            </label>
            <p className="muted">
              {t(
                "선택한 기록은 OpenAI로 전송되어 요약됩니다. 교사에게 공개되지 않습니다.",
                "Selected records are sent to OpenAI for summarization. They are not shared with your teacher.",
              )}
            </p>
            <button
              className="button primary"
              disabled={!consent || busy || !boot?.aiAvailable}
              onClick={() => generate("insight")}
            >
              <Sparkles size={18} />
              {t("AI로 오늘의 발견 정리하기", "Summarize my insight with AI")}
            </button>
            {!boot?.aiAvailable && (
              <p className="notice">
                {t(
                  "관리자가 Vercel에 OpenAI API 키를 설정하고 재배포해야 AI 요약을 사용할 수 있습니다. 지금은 직접 문장을 적어 이미지 카드로 저장할 수 있습니다.",
                  "The administrator must configure the OpenAI API key in Vercel and redeploy. You can write and save your own insight card now.",
                )}
              </p>
            )}
          </div>
          <label className="field">
            {t("오늘의 한 문장", "Today’s sentence")}
            <textarea
              maxLength={180}
              value={insight.headline}
              onChange={(e) => {
                setAi(false);
                setInsight({ ...insight, headline: e.target.value });
              }}
            />
          </label>
          <label className="field">
            {t("오늘의 질문", "Today’s question")}
            <textarea
              maxLength={180}
              value={insight.question}
              onChange={(e) =>
                setInsight({ ...insight, question: e.target.value })
              }
            />
          </label>
          <label className="field">
            {t("오늘의 실천", "Today’s practice")}
            <textarea
              maxLength={180}
              value={insight.action}
              onChange={(e) =>
                setInsight({ ...insight, action: e.target.value })
              }
            />
          </label>
          <div className="two-col">
            <label className="field">
              {t("카드 비율", "Aspect ratio")}
              <select
                aria-label={t("카드 비율", "Aspect ratio")}
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
              >
                <option>1:1</option>
                <option>4:5</option>
                <option>9:16</option>
              </select>
            </label>
            <label className="field">
              {t("카드 배경", "Card background")}
              <select
                aria-label={t("카드 배경", "Card background")}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {cardBackgrounds.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg[lang]}
                  </option>
                ))}
                <option value="navy">{t("밤하늘", "Night sky")}</option>
                <option value="sage">{t("숲", "Forest")}</option>
                <option value="sand">{t("모래빛", "Sand")}</option>
              </select>
            </label>
          </div>
          <BackgroundPicker value={theme} onChange={setTheme} />
          <div className="actions">
            <button
              disabled={!insight.headline.trim()}
              className="button primary"
              onClick={() => download().catch(error)}
            >
              <Download size={17} />
              {t("이미지 저장", "Save image")}
            </button>
            <button
              disabled={!insight.headline.trim()}
              className="button secondary"
              onClick={() => download(true).catch(error)}
            >
              <Share2 size={17} />
              {t("공유", "Share")}
            </button>
          </div>
        </div>
        <div className="canvas-wrap">
          <canvas
            ref={canvas}
            aria-label={t(
              "오늘의 발견 이미지 카드 미리보기",
              "Insight image preview",
            )}
          />
        </div>
      </div>
      <section className="panel">
        <h2>{t("AI 주간 회고", "AI weekly reflection")}</h2>
        <button
          disabled={!consent || busy || !boot?.aiAvailable}
          className="button secondary"
          onClick={() => generate("weekly")}
        >
          {t("이번 주 돌아보기", "Reflect on this week")}
        </button>
        {summary && <p className="preserve">{summary}</p>}
        <small>
          {t(
            "AI가 사용자의 학습 기록을 바탕으로 만드는 개인용 참고 요약입니다.",
            "A personal reference summary created by AI from your learning records.",
          )}
        </small>
      </section>
    </div>
  );
}
