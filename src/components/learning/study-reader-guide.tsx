"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MousePointer2 } from "lucide-react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { layoutStudyGuide, type GuideRect } from "@/lib/study-guide-layout";
import { useApp } from "../provider";

const STORAGE_KEY = "ggc_study_reader_guide:v2";
const LABELS = [
  {
    target: "day",
    title: ["다른 날로 이동", "Choose a day"],
    body: ["오늘·내일을 골라요.", "Pick today or another day."],
  },
  {
    target: "progress",
    title: ["오늘의 남은 분량", "Today’s remaining materials"],
    body: ["진행률을 확인해요.", "Check your progress here."],
  },
  {
    target: "share",
    title: ["떠오른 생각이 있나요?", "A thought to share?"],
    body: ["여기서 바로 남겨요.", "Write it here as you read."],
  },
  {
    target: "next",
    title: ["하나 읽었으면", "Finished this material?"],
    body: ["다음 자료로 가요.", "Mark it read and continue."],
  },
] as const;

export type StudyReaderGuideHandle = { open: () => void };
type GuideView = {
  width: number;
  height: number;
  targets: { id: string; rect: GuideRect }[];
  labels: ReturnType<typeof layoutStudyGuide>;
};

// Keep this outside the keyed reader so guest bootstrap cannot reset the guide.
export function StudyReaderGuide({
  controllerRef,
  readerRef,
  contextKey,
}: {
  controllerRef: Ref<StudyReaderGuideHandle>;
  readerRef: RefObject<HTMLDivElement | null>;
  contextKey: string;
}) {
  const { t, uiLang } = useApp();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<GuideView | null>(null);
  const screen = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const id = useId().replace(/:/g, "");
  const maskId = `study-guide-mask-${id}`;
  const arrowId = `study-guide-arrow-${id}`;

  useImperativeHandle(
    controllerRef,
    () => ({
      open() {
        setView(null);
        setOpen(true);
      },
    }),
    [],
  );

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "seen";
    } catch {}
    if (seen) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = screen.current?.getBoundingClientRect();
        if (!bounds?.width || !bounds.height) return;
        const entries = LABELS.flatMap(({ target }) => {
          const control = readerRef.current?.querySelector<HTMLElement>(
            `[data-study-guide="${target}"]`,
          );
          const note = labelRefs.current.get(target);
          if (!control || !note) return [];
          const rect = control.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          return [
            {
              id: target,
              target: {
                left: rect.left - bounds.left,
                top: rect.top - bounds.top,
                width: rect.width,
                height: rect.height,
              },
              note: { width: note.offsetWidth, height: note.scrollHeight },
            },
          ];
        });
        const dismiss = closeButton.current?.getBoundingClientRect();
        const reserved = dismiss
          ? [
              {
                left: dismiss.left - bounds.left,
                top: dismiss.top - bounds.top,
                width: dismiss.width,
                height: dismiss.height,
              },
            ]
          : [];
        setView({
          width: bounds.width,
          height: bounds.height,
          targets: entries.map((entry) => ({
            id: entry.id,
            rect: entry.target,
          })),
          labels: layoutStudyGuide(
            { width: bounds.width, height: bounds.height },
            entries,
            reserved,
          ),
        });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (screen.current) observer.observe(screen.current);
    if (closeButton.current) observer.observe(closeButton.current);
    if (readerRef.current) observer.observe(readerRef.current);
    for (const { target } of LABELS) {
      const control = readerRef.current?.querySelector(
        `[data-study-guide="${target}"]`,
      );
      if (control) observer.observe(control);
      const note = labelRefs.current.get(target);
      if (note) observer.observe(note);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [open, readerRef, contextKey, uiLang]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "seen");
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => (value ? setOpen(true) : finish())}
    >
      <Dialog.Portal>
        <Dialog.Content
          ref={screen}
          className="study-guide-screen"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeButton.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            readerRef.current
              ?.querySelector<HTMLElement>('[data-study-guide="help"]')
              ?.focus({ preventScroll: true });
          }}
          onClick={(event) => {
            // Consume clicks above the iframe and highlighted controls. Opening
            // or closing the guide must never mark a material as read.
            event.stopPropagation();
            finish();
          }}
        >
          <Dialog.Title className="sr-only">
            {t("한눈에 보는 읽기 안내", "Reading guide at a glance")}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {t(
              "버튼 옆 설명을 확인하세요. 아무 곳이나 누르거나 Escape 키로 안내를 닫을 수 있습니다. 이 동작은 학습 진도를 바꾸지 않습니다.",
              "Read the labels beside each control. Click anywhere or press Escape to dismiss. Dismissing does not change your study progress.",
            )}
          </Dialog.Description>
          <svg
            className="study-guide-drawing"
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={view?.width || "100%"}
                height={view?.height || "100%"}
              >
                <rect width="100%" height="100%" fill="white" />
                {view?.targets.map(({ id, rect }) => (
                  <rect
                    key={id}
                    x={rect.left - 5}
                    y={rect.top - 5}
                    width={rect.width + 10}
                    height={rect.height + 10}
                    rx="12"
                    fill="black"
                  />
                ))}
              </mask>
              <marker
                id={arrowId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path
                  d="M 1 1 L 8 5 L 1 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </marker>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="#102128"
              fillOpacity=".72"
              mask={`url(#${maskId})`}
            />
            {view?.targets.map(({ id, rect }) => (
              <rect
                key={id}
                className="study-guide-outline"
                x={rect.left - 4}
                y={rect.top - 4}
                width={rect.width + 8}
                height={rect.height + 8}
                rx="11"
              />
            ))}
            {view?.labels.map(({ id, from, to }) => {
              const vertical =
                Math.abs(from.y - to.y) > Math.abs(from.x - to.x);
              const cx = vertical ? to.x : from.x;
              const cy = vertical ? from.y : to.y;
              return (
                <path
                  key={id}
                  className="study-guide-arrow"
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  markerEnd={`url(#${arrowId})`}
                />
              );
            })}
          </svg>
          {LABELS.map(({ target, title, body }) => {
            const placement = view?.labels.find(
              (item) => item.id === target,
            )?.label;
            return (
              <div
                key={target}
                ref={(element) => {
                  if (element) labelRefs.current.set(target, element);
                  else labelRefs.current.delete(target);
                }}
                className="study-guide-note"
                data-guide-label={target}
                style={{
                  visibility: placement ? "visible" : "hidden",
                  left: placement?.left,
                  top: placement?.top,
                  maxHeight: placement?.height,
                }}
              >
                <strong>{t(title[0], title[1])}</strong>
                <span>{t(body[0], body[1])}</span>
              </div>
            );
          })}
          <button
            ref={closeButton}
            className="study-guide-dismiss"
            type="button"
          >
            <MousePointer2 size={20} aria-hidden="true" />
            {t("아무 곳이나 눌러 학습 시작", "Click anywhere to start reading")}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
