"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import type { WardEvent } from "@/lib/ward-events";
import type { Prompt } from "@/lib/prompts";
import { EventCard } from "../ward/event-parts";

type Activity = {
  events: WardEvent[];
  prompts: Prompt[];
  replies: {
    id: string;
    author: string;
    body: string;
    prompt_slug: string;
    prompt_title: string;
  }[];
};
export function HomeCommunity() {
  const { t, boot } = useApp();
  const [data, setData] = useState<Activity | null>(null);
  useEffect(() => {
    if (boot)
      api<Activity>("home/activity")
        .then(setData)
        .catch(() => setData({ events: [], prompts: [], replies: [] }));
  }, [boot]);
  if (!data) return null;
  return (
    <div className="home-community">
      <section className="home-card">
        <header>
          <h2>{t("다가오는 와드 일정", "Upcoming ward events")}</h2>
          <Link href="/ward">
            {t("전체 보기", "See all")} <ArrowRight size={16} />
          </Link>
        </header>
        {data.events.length ? (
          data.events.map((e) => <EventCard key={e.id} event={e} />)
        ) : (
          <p className="muted">
            {t("예정된 일정이 없습니다.", "No upcoming events.")}
          </p>
        )}
      </section>
      <section className="home-card">
        <header>
          <h2>{t("최근 올라온 생각", "Recent thoughts")}</h2>
          <Link href="/think">
            {t("함께 생각하기", "Think together")} <ArrowRight size={16} />
          </Link>
        </header>
        {data.prompts.slice(0, 1).map((p) => (
          <Link key={p.id} className="prompt-card" href={`/p/${p.slug}`}>
            <span className="overline">{t("새 질문", "New question")}</span>
            <h3>{p.title}</h3>
          </Link>
        ))}
        {data.replies.map((r) => (
          <Link
            key={r.id}
            className="recent-reply"
            href={`/p/${r.prompt_slug}`}
          >
            <strong>{r.author}</strong> <span>{r.body}</span>
            <small className="muted">{r.prompt_title}</small>
          </Link>
        ))}
        {!data.prompts.length && !data.replies.length && (
          <p className="muted">
            {t("아직 나눈 생각이 없습니다.", "No thoughts shared yet.")}
          </p>
        )}
      </section>
    </div>
  );
}
