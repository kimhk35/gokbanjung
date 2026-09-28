"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Maximize, QrCode } from "lucide-react";
import { useApp } from "../provider";
import { currentWeek } from "@/lib/curriculum";
import { ThoughtWall } from "../community/wall";
import { LoginForm } from "./teacher";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { cardBackgroundUrl } from "@/lib/card-backgrounds";
import { defaultLessonItems } from "@/lib/lesson-slides";
import type { LessonConfig } from "@/lib/lesson-config";
export function PresentationPage() {
  const { t, uiLang, weeks, boot, error } = useApp();
  const params = useSearchParams();
  const requestedWeek =
    Number(params.get("week")) || currentWeek()?.number || 38;
  const w = weeks.find((w) => w.number === requestedWeek) || weeks[0];
  const week = w.number;
  const [index, setIndex] = useState(0);
  const [qr, setQr] = useState("");
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<LessonConfig | null>(null);
  const lastPresented = useRef("");
  const allowed =
    boot?.actor.role === "TEACHER" || boot?.actor.role === "ADMIN";
  const defaults = defaultLessonItems(w, uiLang);
  const custom = config?.items.filter((item) => item.enabled) || [];
  const slides = custom.length
    ? custom.map((item) => ({
        label: item.title,
        text: item.text,
        image: item.image,
        wall: item.kind === "wall",
      }))
    : config?.items.length
      ? [
          {
            label: t("표시할 항목이 없습니다", "No visible items"),
            text: t(
              "수업 구성에서 표시할 항목을 켜 주세요.",
              "Enable an item in lesson settings.",
            ),
            image: undefined,
            wall: false,
          },
        ]
      : defaults.map((item) => ({
          label: item.title,
          text: item.text,
          image: undefined,
          wall: item.kind === "wall",
        }));
  const slide = slides[Math.min(index, slides.length - 1)];
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    let revision = "";
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const latest = await api<{ revision: string }>(
          `lesson/revision?week=${week}`,
        );
        if (!active || latest.revision === revision) return;
        const value = await api<LessonConfig | null>(
          `lesson/config?week=${week}`,
        );
        if (!active) return;
        revision = latest.revision;
        setConfig(value);
        const visible = value?.items.filter((x) => x.enabled) || [];
        const marker = `${week}:${value?.activeId}:${value?.presentedAt}`;
        if (marker !== lastPresented.current) {
          lastPresented.current = marker;
          const selected = visible.findIndex((x) => x.id === value?.activeId);
          setIndex(selected >= 0 ? selected : 0);
        }
      } catch (e) {
        if (active) error(e);
      } finally {
        inFlight = false;
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [week, allowed, error]);
  useEffect(
    () => setIndex((i) => Math.min(i, slides.length - 1)),
    [slides.length],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (["ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [slides.length]);
  useEffect(() => {
    import("qrcode")
      .then((q) =>
        q.toDataURL(`${window.location.origin}/week/${week}`, {
          width: 320,
          margin: 2,
        }),
      )
      .then(setQr)
      .catch(error);
  }, [week]);
  if (!allowed)
    return (
      <div className="page narrow">
        <LoginForm />
      </div>
    );
  return (
    <div
      className="presentation lesson-presentation"
      data-lesson-theme={config?.theme || "midnight"}
      data-lesson-size={config?.size || "large"}
    >
      <div className="presentation-top">
        <Link href="/teacher">← {t("교사 화면", "Teacher workspace")}</Link>
        <Link href={`/lesson-builder?week=${week}`}>
          {t("수업 구성 · 장수 조절", "Lesson builder · slide count")}
        </Link>
        <span>WEEK {week}</span>
        <button
          className="icon-button"
          aria-label={t("전체 화면", "Full screen")}
          onClick={() =>
            document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()
          }
        >
          <Maximize size={22} />
        </button>
      </div>
      <section
        className="slide"
        style={
          cardBackgroundUrl(config?.theme || "")
            ? {
                backgroundImage: `linear-gradient(#08172c55,#08172c88),url("${cardBackgroundUrl(config!.theme)}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="overline">{slide.label}</span>
        {slide.wall ? (
          <ThoughtWall week={week} live />
        ) : (
          <div
            className={
              slide.image
                ? slide.text
                  ? "lesson-slide-content with-image"
                  : "lesson-slide-content image-only"
                : "lesson-slide-content"
            }
          >
            {slide.text && <h1>{slide.text}</h1>}
            {slide.image && (
              <img
                src={slide.image}
                alt={slide.label || t("수업 이미지", "Lesson image")}
              />
            )}
          </div>
        )}
      </section>
      <div className="presentation-controls">
        <button
          className="icon-button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          aria-label={t("이전", "Previous")}
        >
          <ChevronLeft />
        </button>
        <span>
          {Math.min(index + 1, slides.length)} / {slides.length}
        </span>
        <button
          className="icon-button"
          disabled={index >= slides.length - 1}
          onClick={() => setIndex(Math.min(index + 1, slides.length - 1))}
          aria-label={t("다음", "Next")}
        >
          <ChevronRight />
        </button>
        <button className="button secondary" onClick={() => setOpen(true)}>
          <QrCode size={18} />
          {t("참여 QR", "Join by QR")}
        </button>
      </div>
      <Modal
        title={t("이번 주 학습에 참여하세요", "Join this week’s learning")}
        open={open}
        onOpenChange={setOpen}
      >
        {qr && (
          <img
            className="qr"
            src={qr}
            alt={t("학습 참여 QR 코드", "QR code for joining the lesson")}
          />
        )}
        <p className="class-code">GOKBAN{week}</p>
        <p>
          {t(
            "홈페이지의 주차 검색에서 숫자를 입력해도 찾을 수 있습니다.",
            "You can also find this week by entering its number in the learning search.",
          )}
        </p>
      </Modal>
    </div>
  );
}
