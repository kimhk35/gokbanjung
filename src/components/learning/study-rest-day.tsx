"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "../provider";
import { lessonDate } from "@/lib/study-progress";
import { api } from "@/lib/client";
import type { MaterialProgress } from "@/lib/study-material-progress";
import {
  dailyStudyHref,
  getStudyPlan,
  studyDayTitle,
  studyFamilyTitle,
  type StudyTrack,
} from "@/lib/cfm-study-plan";

export function StudyRestDay({
  week,
  track,
}: {
  week: number;
  track: StudyTrack;
}) {
  const { t, tl, locale, weeks, boot } = useApp();
  const curriculumWeek = weeks.find((item) => item.number === week);
  const plan = getStudyPlan(week)!;
  const actorId = boot?.actor.id;
  const [progress, setProgress] = useState<{
    actorId: string;
    week: number;
    read: Set<string>;
  } | null>(null);
  useEffect(() => {
    if (!actorId) return;
    let active = true;
    api<{ items: MaterialProgress[] }>(`notes/study-progress?week=${week}`)
      .then(({ items }) => {
        if (active)
          setProgress({
            actorId,
            week,
            read: new Set(items.map((item) => item.task_id)),
          });
      })
      .catch(() => {
        /* The links also work when progress is unavailable. */
      });
    return () => {
      active = false;
    };
  }, [actorId, week]);
  const read =
    progress && progress.actorId === actorId && progress.week === week
      ? progress.read
      : null;
  return (
    <div className="study-rest-day">
      <div className="page narrow">
        <Link className="back-link" href="/">
          ← {t("홈", "Home")}
        </Link>
        <header className="page-title">
          <p className="overline">
            {t("{week}주차", "Week {week}", { week })}
            {curriculumWeek && ` · ${tl(curriculumWeek.reference)}`}
          </p>
          <h1>{t("일요일은 쉬어 가세요", "Sunday is a day to rest")}</h1>
          <p>
            {t(
              "밀린 분량이 있다면 아래에서 요일을 골라 읽던 곳부터 이어 가세요.",
              "To catch up, choose a day below to return to your reading.",
            )}
          </p>
        </header>
        <nav
          className="stack"
          aria-label={t("이번 주 읽기", "This week’s readings")}
        >
          {plan.days
            .filter((day) => day.adultTasks.length > 0)
            .map((day) => {
              const family = track === "family" && day.familyTasks.length > 0;
              const tasks = family ? day.familyTasks : day.adultTasks;
              const title = family ? studyFamilyTitle : studyDayTitle;
              const done = read
                ? tasks.filter((task) => read.has(task.id)).length
                : null;
              return (
                <Link
                  className="day-row"
                  href={dailyStudyHref(
                    week,
                    day.day,
                    family ? "family" : "adult",
                  )}
                  key={day.day}
                >
                  <span>
                    {curriculumWeek
                      ? new Date(
                          lessonDate(curriculumWeek.start, day.day) +
                            "T00:00:00Z",
                        ).toLocaleDateString(locale, {
                          weekday: "short",
                          timeZone: "UTC",
                        })
                      : day.day}
                  </span>
                  <div>
                    <strong>
                      {t(title(day, week), title(day, week, true))}
                    </strong>
                    {done !== null && (
                      <small>
                        {done === tasks.length
                          ? t("읽기 완료", "Completed")
                          : t(
                              "{done}/{total}개 읽음",
                              "{done}/{total} materials read",
                              { done, total: tasks.length },
                            )}
                      </small>
                    )}
                  </div>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              );
            })}
        </nav>
      </div>
    </div>
  );
}
