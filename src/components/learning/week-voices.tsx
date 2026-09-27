"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpenText, MessageCircle } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import type { Prompt } from "@/lib/prompts";
import { ThoughtWall } from "../community/wall";
import { VerseNotes } from "../notes/verse-notes";

export function WeekVoices({ week }: { week: number }) {
  const { t, boot } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  useEffect(() => {
    if (boot)
      api<{ items: Prompt[] }>(`think/prompts?week=${week}`)
        .then((d) => setPrompts(d.items))
        .catch(() => setPrompts([]));
  }, [boot, week]);
  return (
    <section className="week-voices" aria-labelledby="week-voices-title">
      <h2 id="week-voices-title">
        {t("이번 주 다른 사람들의 생각", "What others are thinking this week")}
      </h2>
      {prompts.length > 0 && (
        <div className="prompt-list">
          {prompts.map((p) => (
            <Link key={p.id} href={`/p/${p.slug}`} className="prompt-card">
              <span className="overline">
                {t("함께 생각하기", "Think together")}
              </span>
              <h3>{p.title}</h3>
              <small className="muted">
                <MessageCircle size={14} /> {p.reply_count}
              </small>
            </Link>
          ))}
        </div>
      )}
      <Link
        className="button secondary lesson-text-link"
        href={`/week/${week}/text`}
      >
        <BookOpenText size={18} />{" "}
        {t(
          "공과 본문 읽고 문장에 의견 달기",
          "Read the lesson text and add notes",
        )}
      </Link>
      <details className="verse-notes-toggle">
        <summary>
          {t(
            "절에 의견 달기 · 다른 사람들의 절 의견 보기",
            "Verse notes · see others' notes on verses",
          )}
        </summary>
        <VerseNotes week={week} />
      </details>
      <ThoughtWall week={week} />
    </section>
  );
}
