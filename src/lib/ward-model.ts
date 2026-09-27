// Calendar rules shared by the server and the browser (ported from
// comefollowme calendar-model.js). Korea has no daylight saving time.
export const ZONE = "Asia/Seoul";
export const ORGANIZATIONS = [
  ["all", "전 회원", "All members"],
  ["primary", "초등회", "Primary"],
  ["relief", "상호부조회", "Relief Society"],
  ["elders", "장로 정원회", "Elders quorum"],
  ["youth", "청소년", "Youth"],
  ["sunday-school", "주일학교", "Sunday School"],
] as const;
export const ORGANIZATION_IDS = [
  "all",
  "primary",
  "relief",
  "elders",
  "youth",
  "sunday-school",
] as const;
export type Organization = (typeof ORGANIZATION_IDS)[number];
const OFFSET = 9 * 3600000;
export function dayKey(value: string | Date) {
  return new Date(new Date(value).getTime() + OFFSET)
    .toISOString()
    .slice(0, 10);
}
export function timeKey(value: string | Date) {
  return new Date(new Date(value).getTime() + OFFSET)
    .toISOString()
    .slice(11, 16);
}
export function toISO(date: string, time: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("invalid_time");
  const d = new Date(`${date}T${time}:00+09:00`);
  if (!Number.isFinite(d.getTime()) || dayKey(d) !== date)
    throw new Error("invalid_time");
  return d.toISOString();
}
export function monthRange(year: number, month0: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month0) ||
    month0 < 0 ||
    month0 > 11
  )
    throw new Error("invalid_month");
  return {
    start: new Date(Date.UTC(year, month0, 1) - OFFSET).toISOString(),
    end: new Date(Date.UTC(year, month0 + 1, 1) - OFFSET).toISOString(),
  };
}
export function onDay(
  ev: { starts_at: string; ends_at: string },
  date: string,
) {
  const start = new Date(`${date}T00:00:00+09:00`).getTime();
  const end = start + 86400000;
  return (
    new Date(ev.starts_at).getTime() < end &&
    new Date(ev.ends_at).getTime() > start
  );
}
