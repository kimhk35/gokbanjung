"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { MaterialUpload } from "./material-upload";
import { Modal } from "../ui/dialog";
import { currentWeek } from "@/lib/curriculum";
import type { LessonMaterial } from "@/lib/lesson-materials";

export function MaterialLibrary() {
  const { tl, t, boot, weeks, error } = useApp();
  const [data, setData] = useState<LessonMaterial[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState(0),
    [selected, setSelected] = useState<LessonMaterial | null>(null),
    [index, setIndex] = useState(0);
  const allowed =
    boot?.actor.kind === "user" &&
    ["ADMIN", "TEACHER"].includes(boot.actor.role);
  const load = () => {
    setLoading(true);
    setFailed(false);
    return api<LessonMaterial[]>("lesson-materials")
      .then(setData)
      .catch((e) => {
        setFailed(true);
        error(e);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    api<LessonMaterial[]>("lesson-materials")
      .then((rows) => {
        if (active) {
          setData(rows);
          setFailed(false);
        }
      })
      .catch((e) => {
        if (active) {
          setFailed(true);
          error(e);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, error]);
  if (!allowed)
    return (
      <section className="panel">
        <h2>
          {t(
            "교사·관리자 전용 공과자료실",
            "Lesson library for teachers and administrators",
          )}
        </h2>
        <p>
          {t(
            "승인된 교사 또는 관리자로 로그인해 주세요.",
            "Sign in as an approved teacher or administrator.",
          )}
        </p>
        <Link href="/teacher" className="button primary">
          {t("로그인", "Sign in")}
        </Link>
      </section>
    );
  return (
    <section className="stack">
      <div className="panel">
        <h2>{t("공과자료실", "Lesson library")}</h2>
        <p>
          {t(
            "승인된 교사와 관리자만 자료를 등록하고 열람할 수 있습니다.",
            "Only approved teachers and administrators can upload and view these materials.",
          )}
        </p>
        <MaterialUpload
          week={filter || currentWeek()?.number || 38}
          onDone={() => void load()}
        />
        <label className="field">
          {t("공과별 보기", "Filter by lesson")}
          <select
            value={filter}
            onChange={(e) => setFilter(Number(e.target.value))}
          >
            <option value={0}>{t("전체 공과", "All lessons")}</option>
            {weeks.map((w) => (
              <option value={w.number} key={w.number}>
                {w.number}. {tl(w.title)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">{t("자료 불러오는 중…", "Loading materials…")}</p>
      ) : failed ? (
        <button className="button secondary" onClick={() => void load()}>
          {t("다시 불러오기", "Retry")}
        </button>
      ) : data.filter((m) => !filter || m.weeks.includes(filter)).length ? (
        data
          .filter((m) => !filter || m.weeks.includes(filter))
          .map((m) => (
            <article className="panel" key={m.id}>
              <h3>{m.title}</h3>
              <p>
                {t("{slide_count}장 · ", "{slide_count} slides · ", { slide_count: m.slide_count })}
                {m.weeks
                  .map(
                    (n) =>
                      `${n}. ${tl(weeks.find((w) => w.number === n)?.title) || ""}`,
                  )
                  .join(" / ")}
              </p>
              <button
                className="button primary"
                onClick={() => {
                  setSelected(m);
                  setIndex(0);
                }}
              >
                {t("자료 보기", "View slides")}
              </button>
              <Link
                className="button secondary"
                href={`/lesson-builder?week=${filter || m.weeks[0]}&material=${m.id}`}
              >
                {t("수업 구성으로 가져오기", "Use in lesson builder")}
              </Link>
            </article>
          ))
      ) : (
        <p>{t("등록된 공과자료가 없습니다.", "No lesson materials yet.")}</p>
      )}
      <Modal
        title={selected?.title || t("공과자료", "Lesson material")}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        description={t(
          "슬라이드 이미지를 순서대로 볼 수 있습니다.",
          "Browse the slide images in order.",
        )}
      >
        {selected && (
          <>
            <img
              className="material-preview"
              src={`/api/lesson-materials/${selected.id}/slides/${index}`}
              alt={t("{v}번 슬라이드", "Slide {v}", { v: index + 1 })}
            />
            <div className="actions">
              <button
                className="button secondary"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                {t("이전", "Previous")}
              </button>
              <span>
                {index + 1} / {selected.slide_count}
              </span>
              <button
                className="button secondary"
                disabled={index >= selected.slide_count - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                {t("다음", "Next")}
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
