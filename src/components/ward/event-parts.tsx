"use client";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { useApp } from "../provider";
import { ORGANIZATIONS, ZONE, dayKey, onDay } from "@/lib/ward-model";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import type { Lang } from "@/lib/types";

export function orgLabel(id: string, lang: Lang) {
  const o = ORGANIZATIONS.find((x) => x[0] === id);
  return o ? (lang === "ko" ? o[1] : o[2]) : id;
}
export function formatRange(e: Pick<WardEvent, "starts_at" | "ends_at">, lang: Lang) {
  const locale = lang === "ko" ? "ko-KR" : "en-US";
  const date = new Intl.DateTimeFormat(locale, { timeZone: ZONE, month: "long", day: "numeric", weekday: "short" });
  const time = new Intl.DateTimeFormat(locale, { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
  const sameDay = dayKey(e.starts_at) === dayKey(e.ends_at);
  return sameDay
    ? `${date.format(new Date(e.starts_at))} ${time.format(new Date(e.starts_at))} – ${time.format(new Date(e.ends_at))}`
    : `${date.format(new Date(e.starts_at))} ${time.format(new Date(e.starts_at))} – ${date.format(new Date(e.ends_at))} ${time.format(new Date(e.ends_at))}`;
}
export function StatusBadge({ status }: { status: WardEvent["status"] }) {
  const { t } = useApp();
  if (status === "published") return null;
  return (
    <span className={`event-status ${status}`}>
      {status === "draft" ? t("임시 저장", "Draft") : t("취소됨", "Cancelled")}
    </span>
  );
}
export function EventCard({ event, preview = false }: { event: WardEvent; preview?: boolean }) {
  const { lang } = useApp();
  const poster = posterUrl(event.poster_path);
  const body = (
    <>
      {poster && <img className="event-thumb" src={poster} alt="" loading="lazy" />}
      <div className="event-card-body">
        <div className="event-tags">
          {event.organizations.map((o) => (
            <span className="org-chip" key={o}>{orgLabel(o, lang)}</span>
          ))}
          <StatusBadge status={event.status} />
        </div>
        <h3>{event.title}</h3>
        <p className="event-meta"><CalendarDays size={16} aria-hidden /> {formatRange(event, lang)}</p>
        {event.location && <p className="event-meta"><MapPin size={16} aria-hidden /> {event.location}</p>}
      </div>
    </>
  );
  if (preview || !event.slug) return <article className="event-card">{body}</article>;
  return <Link className="event-card" href={`/e/${event.slug}`}>{body}</Link>;
}
export function MonthGrid({
  year, month0, events, selected, onSelect,
}: {
  year: number; month0: number; events: WardEvent[]; selected: string; onSelect: (day: string) => void;
}) {
  const { t, lang } = useApp();
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const today = dayKey(new Date());
  const names = lang === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="month-grid" role="grid" aria-label={t("월간 달력", "Month calendar")}>
      {names.map((n) => <div className="month-head" key={n} role="columnheader">{n}</div>)}
      {cells.map((d, i) => {
        if (!d) return <div key={"b" + i} className="month-cell blank" />;
        const key = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const count = events.filter((e) => onDay(e, key)).length;
        return (
          <button
            key={key}
            type="button"
            className="month-cell"
            aria-pressed={selected === key}
            aria-current={today === key ? "date" : undefined}
            aria-label={`${key} ${count ? t(`일정 ${count}개`, `${count} events`) : ""}`}
            onClick={() => onSelect(key)}
          >
            <span>{d}</span>
            {count > 0 && <i className="dot" aria-hidden>{count > 1 ? count : ""}</i>}
          </button>
        );
      })}
    </div>
  );
}
