"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from "lucide-react";
import { useApp } from "../provider";
import type { Prompt, Reply } from "@/lib/prompts";
import { move, resolve, slides, toggle } from "@/lib/present-queue";
import { authorLabel } from "@/lib/author-label";

const key = (actorId: string, promptId: string) =>
  `ggc_present:${actorId}:${promptId}`;

// Device-only queue of reply ids for one prompt.
export function usePresentQueue(actorId: string | undefined, promptId: string) {
  const storageKey = actorId ? key(actorId, promptId) : null;
  const [queue, setQueue] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });
  // Always derive from the latest queue so rapid taps don't overwrite each other.
  const update = useCallback(
    (change: (q: string[]) => string[]) =>
      setQueue((current) => {
        const next = change(current);
        if (storageKey)
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
        return next;
      }),
    [storageKey],
  );
  return {
    queue,
    toggle: (id: string) => update((q) => toggle(q, id)),
    move: (id: string, delta: -1 | 1) => update((q) => move(q, id, delta)),
  };
}

export function QueuePanel({
  replies,
  queue,
  onMove,
  onToggle,
  onStart,
}: {
  replies: Reply[];
  queue: string[];
  onMove: (id: string, delta: -1 | 1) => void;
  onToggle: (id: string) => void;
  onStart: () => void;
}) {
  const { t } = useApp();
  const queued = resolve(queue, replies);
  return (
    <aside
      className="present-panel"
      aria-label={t("발표 목록", "Presentation list")}
    >
      <header>
        <strong>
          {t(
            `발표 목록 ${queued.length}`,
            `Presentation list ${queued.length}`,
          )}
        </strong>
        <button type="button" className="button" onClick={onStart}>
          <Play size={18} /> {t("발표 시작", "Start")}
        </button>
      </header>
      {queued.length ? (
        <ol>
          {queued.map((r, i) => (
            <li key={r.id}>
              <span className="present-snippet">{r.body}</span>
              <span className="present-controls">
                <button
                  type="button"
                  aria-label={t("위로", "Move up")}
                  disabled={i === 0}
                  onClick={() => onMove(r.id, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={t("아래로", "Move down")}
                  disabled={i === queued.length - 1}
                  onClick={() => onMove(r.id, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label={t("빼기", "Remove")}
                  onClick={() => onToggle(r.id)}
                >
                  <X size={16} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">
          {t(
            "답글의 ☆ 담기를 눌러 발표할 답글을 고르세요. 질문만으로도 발표할 수 있어요.",
            "Tap ☆ on replies to add them. You can also present just the question.",
          )}
        </p>
      )}
    </aside>
  );
}

export function PresentMode({
  prompt,
  replies,
  queue,
  onClose,
}: {
  prompt: Prompt;
  replies: Reply[];
  queue: string[];
  onClose: () => void;
}) {
  const { t } = useApp();
  const deck = slides(resolve(queue, replies));
  const [index, setIndex] = useState(0);
  const [hideNames, setHideNames] = useState(false);
  const go = useCallback(
    (delta: number) =>
      setIndex((i) => Math.min(deck.length - 1, Math.max(0, i + delta))),
    [deck.length],
  );
  const close = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  }, [onClose]);
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close]);
  const slide = deck[Math.min(index, deck.length - 1)];
  return (
    <div
      className="present-mode"
      role="dialog"
      aria-modal="true"
      aria-label={t("발표 화면", "Presentation")}
    >
      <div className="present-top">
        <span>
          {index + 1} / {deck.length}
        </span>
        <label className="present-toggle">
          <input
            type="checkbox"
            checked={hideNames}
            onChange={(e) => setHideNames(e.target.checked)}
          />
          {t("이름 숨기기", "Hide names")}
        </label>
        <button
          type="button"
          className="present-close"
          aria-label={t("발표 끝내기", "End presentation")}
          onClick={close}
        >
          <X size={22} />
        </button>
      </div>
      <div
        className="present-stage"
        onClick={(e) => {
          const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
          go(e.clientX - box.left < box.width / 3 ? -1 : 1);
        }}
      >
        {slide.kind === "question" ? (
          <div className="present-slide question">
            <span className="present-kicker">
              {prompt.reference_label || t("함께 생각하기", "Think together")}
            </span>
            <h1>{prompt.title}</h1>
            <p className="preserve">{prompt.question}</p>
          </div>
        ) : (
          <div className="present-slide">
            <p className="preserve present-body">{slide.reply.body}</p>
            {!hideNames && (
              <p className="present-author">— {authorLabel(slide.reply.author, t)}</p>
            )}
          </div>
        )}
      </div>
      <div className="present-nav">
        <button
          type="button"
          aria-label={t("이전", "Previous")}
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          type="button"
          aria-label={t("다음", "Next")}
          disabled={index >= deck.length - 1}
          onClick={() => go(1)}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
