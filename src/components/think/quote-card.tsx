"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { BackgroundPicker } from "../background-picker";
import { loadCardBackground } from "@/lib/card-backgrounds";
import { CARD_SIZES, type CardSize, wrapLines } from "@/lib/card-text";
import type { Prompt, Reply } from "@/lib/prompts";
import { when } from "./reply-item";

const FONT = '"Noto Sans KR", "Malgun Gothic", sans-serif';

type CardContent = {
  image: HTMLImageElement | null;
  size: CardSize;
  title: string;
  body: string;
  meta: string;
  footer: string;
};
// Paints one card onto the given canvas (1080–1920px, set by size).
function paintCard(canvas: HTMLCanvasElement, card: CardContent) {
  const [w, h] = CARD_SIZES[card.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#12302d";
  ctx.fillRect(0, 0, w, h);
  const { image, size } = card;
  if (image) {
    const iw = image.naturalWidth || 1600,
      ih = image.naturalHeight || 1000;
    const scale = Math.max(w / iw, h / ih);
    ctx.drawImage(
      image,
      (w - iw * scale) / 2,
      (h - ih * scale) / 2,
      iw * scale,
      ih * scale,
    );
  }
  // Teal veil keeps the text readable on any artwork.
  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, "#0c2826b8");
  veil.addColorStop(1, "#0c2826e6");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, h);

  const pad = Math.round(w * 0.09);
  const textWidth = w - pad * 2;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f6c983";
  ctx.font = `600 ${Math.round(w * 0.028)}px ${FONT}`;
  const titleLines = wrapLines(
    (s) => ctx.measureText(s).width,
    card.title,
    textWidth,
    2,
  );
  let y = pad + Math.round(w * 0.03);
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += Math.round(w * 0.042);
  }
  ctx.fillStyle = "#f0b35a";
  ctx.fillRect(pad, y, Math.round(w * 0.08), 4);

  const footer = Math.round(h * 0.16);
  const bodySize = Math.round(
    (size === "story" ? 0.066 : size === "wide" ? 0.034 : 0.056) * w,
  );
  const lineHeight = Math.round(bodySize * 1.5);
  const available = h - y - footer - pad * 0.6;
  const maxLines = Math.max(2, Math.floor(available / lineHeight));
  ctx.font = `500 ${bodySize}px ${FONT}`;
  ctx.fillStyle = "#fffdf9";
  const bodyLines = wrapLines(
    (s) => ctx.measureText(s).width,
    card.body,
    textWidth,
    maxLines,
  );
  let by =
    y + (available - bodyLines.length * lineHeight) / 2 + bodySize + pad * 0.3;
  for (const line of bodyLines) {
    ctx.fillText(line, pad, by);
    by += lineHeight;
  }

  ctx.font = `${Math.round(w * 0.026)}px ${FONT}`;
  ctx.fillStyle = "#e7f2ee";
  ctx.fillText(card.meta, pad, h - pad - Math.round(w * 0.045));
  ctx.fillStyle = "#f6c983";
  ctx.fillText(card.footer, pad, h - pad);
}

// Draws a shareable image of one reply entirely on this device.
export function QuoteCard({
  reply,
  prompt,
  open,
  onOpenChange,
}: {
  reply: Reply;
  prompt: Prompt;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { locale, t, lang, error } = useApp();
  // State (not a ref) so drawing starts once the dialog has mounted the canvas.
  const [el, setEl] = useState<HTMLCanvasElement | null>(null);
  const version = useRef(0);
  const [size, setSize] = useState<CardSize>("square");
  const [background, setBackground] = useState("scriptures");
  const [showAuthor, setShowAuthor] = useState(true);
  // Mounted only while open, so checking once is enough.
  const [canShare] = useState(() => {
    try {
      return !!navigator.canShare?.({
        files: [new File([""], "x.png", { type: "image/png" })],
      });
    } catch {
      return false;
    }
  });

  const draw = useCallback(async () => {
    if (!el) return;
    const mine = ++version.current;
    await document.fonts.ready;
    const image = await loadCardBackground(background).catch(() => null);
    if (mine !== version.current) return;
    paintCard(el, {
      image,
      size,
      title: prompt.title,
      body: reply.body,
      meta: [showAuthor ? reply.author : null, when(reply.created_at, locale)]
        .filter(Boolean)
        .join(" · "),
      footer: t(
        "곡반정와드 · 함께 생각하기",
        "Gokbanjeong Ward · Think together",
      ),
    });
  }, [el, background, size, showAuthor, reply, prompt, locale, t]);

  useEffect(() => {
    if (open) void draw().catch(error);
  }, [open, draw, error]);

  const save = async (share: boolean) => {
    await draw();
    el?.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File(
        [blob],
        `gokbanjung-${prompt.slug}-${reply.id.slice(0, 6)}.png`,
        { type: "image/png" },
      );
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: prompt.title });
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
    <Modal
      title={t("카드로 저장", "Save as a card")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="quote-card">
        <div
          className="segmented"
          role="group"
          aria-label={t("카드 크기", "Card size")}
        >
          {(
            [
              ["square", t("정사각형", "Square")],
              ["story", t("세로", "Portrait")],
              ["wide", t("가로", "Landscape")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={size === id}
              onClick={() => setSize(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`quote-card-preview ${size}`}>
          <canvas ref={setEl} aria-label={t("카드 미리보기", "Card preview")} />
        </div>
        <label className="present-toggle">
          <input
            type="checkbox"
            checked={showAuthor}
            onChange={(e) => setShowAuthor(e.target.checked)}
          />
          {t("작성자 이름 표시", "Show author name")}
        </label>
        <BackgroundPicker value={background} onChange={setBackground} />
        <div className="button-row editor-actions">
          {canShare && (
            <button
              type="button"
              className="button secondary"
              onClick={() => save(true)}
            >
              <Share2 size={18} /> {t("공유", "Share")}
            </button>
          )}
          <button type="button" className="button" onClick={() => save(false)}>
            <Download size={18} /> {t("이미지 저장", "Save image")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
