"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { canManageRecords } from "@/lib/access";

export function ContinueLearning() {
  const { boot, t, weeks } = useApp();
  const [last, setLast] = useState<{ week: number; day: number } | null>(null);
  useEffect(() => {
    let active = true;
    setLast(null);
    if (canManageRecords(boot?.actor))
      api<{ reflections: { week: number; day: number; updated_at: string }[] }>(
        "journey",
      )
        .then(({ reflections }) => {
          const sorted = [...reflections].sort(
            (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
          );
          if (active) setLast(sorted[0] || null);
        })
        .catch(() => {
          /* Optional shortcut: do not interrupt normal learning. */
        });
    return () => {
      active = false;
    };
  }, [boot?.actor.id]);
  if (!last || !weeks.some((w) => w.number === last.week)) return null;
  return (
    <div className="continue-learning">
      <span>
        {t("마지막 기록: {week}주차 · {day}일차", "Last reflection: Week {week} · Day {day}", { week: last.week, day: last.day })}
      </span>
      <Link
        className="button secondary"
        href={`/week/${last.week}/day/${last.day}`}
      >
        {t("이어서 학습하기", "Continue learning")} →
      </Link>
    </div>
  );
}
