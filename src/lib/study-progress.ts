import type { Week } from "./types";
export function lessonDate(start: string, day: number) {
  return new Date(Date.parse(start + "T00:00:00Z") + (day - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function studyProgress(
  weeks: Week[],
  progress: { week: number; day: number }[],
) {
  const scheduled = new Map<string, { week: number; day: number }>();
  for (const week of weeks)
    for (let day = 1; day <= 7; day++)
      scheduled.set(lessonDate(week.start, day), { week: week.number, day });
  const complete = new Set<string>();
  for (const entry of progress) {
    const week = weeks.find((w) => w.number === entry.week);
    if (week && Number.isInteger(entry.day) && entry.day >= 1 && entry.day <= 7)
      complete.add(lessonDate(week.start, entry.day));
  }
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `2026-${String(i + 1).padStart(2, "0")}`;
    const dates = [...scheduled.keys()].filter((date) =>
      date.startsWith(month),
    );
    return {
      month,
      total: dates.length,
      done: dates.filter((date) => complete.has(date)).length,
    };
  });
  return { scheduled, complete, months };
}
