"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  CalendarDays,
} from "lucide-react";
import { useApp } from "../provider";
import { PageTitle, Empty } from "../learning/learn";
import { api } from "@/lib/client";
import { ORGANIZATIONS, dayKey, monthRange, onDay } from "@/lib/ward-model";
import type { WardEvent } from "@/lib/ward-events";
import { useRefresh } from "../use-refresh";
import { EventCard, MonthGrid } from "./event-parts";
import { EventEditor } from "./event-editor";

const PHONE = "(max-width: 767px)";
function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isPhone = () => window.matchMedia(PHONE).matches;
export function WardPage() {
  const { t, lang, boot, error } = useApp();
  const today = dayKey(new Date());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month0, setMonth0] = useState(Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(today);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const [chosen, setLayout] = useState<"list" | "month" | null>(null);
  const layout = chosen ?? (phone ? "list" : "month");
  const [org, setOrg] = useState("everyone");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{
    items: WardEvent[];
    managed: string[];
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    const r = monthRange(year, month0);
    api<{ items: WardEvent[]; managed: string[] }>(
      `ward/events?from=${encodeURIComponent(r.start)}&to=${encodeURIComponent(r.end)}`,
    )
      .then(setData)
      .catch(error);
  }, [year, month0, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, editing);
  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month0 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth0(d.getUTCMonth());
    setSelected(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`,
    );
  };
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items || []).filter(
      (e) =>
        (org === "everyone" ||
          e.organizations.includes(org) ||
          e.organizations.includes("all")) &&
        (!q ||
          `${e.title} ${e.location || ""} ${e.description}`
            .toLowerCase()
            .includes(q)),
    );
  }, [data, org, query]);
  const dayItems = items.filter((e) => onDay(e, selected));
  const monthLabel = new Intl.DateTimeFormat(
    lang === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long", timeZone: "UTC" },
  ).format(new Date(Date.UTC(year, month0, 1)));
  return (
    <div className="page ward-page">
      <PageTitle
        eyebrow="WARD · CALENDAR"
        title={t("와드 일정", "Ward calendar")}
        description={t(
          "모든 시간은 한국 시간입니다. 조직을 골라 필요한 일정만 볼 수 있어요.",
          "All times are Korea time. Filter by organization.",
        )}
      />
      <div className="ward-toolbar">
        <div className="month-switch">
          <button
            type="button"
            className="icon-button"
            aria-label={t("이전 달", "Previous month")}
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            className="icon-button"
            aria-label={t("다음 달", "Next month")}
            onClick={() => move(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label={t("보기 방식", "View")}
        >
          <button
            type="button"
            aria-pressed={layout === "month"}
            onClick={() => setLayout("month")}
          >
            <CalendarDays size={18} /> {t("달력", "Month")}
          </button>
          <button
            type="button"
            aria-pressed={layout === "list"}
            onClick={() => setLayout("list")}
          >
            <List size={18} /> {t("목록", "List")}
          </button>
        </div>
        {!!data?.managed.length && (
          <button
            type="button"
            className="button"
            onClick={() => setEditing(true)}
          >
            <Plus size={18} /> {t("새 일정", "New event")}
          </button>
        )}
      </div>
      <div className="ward-filters">
        <div
          className="chip-row"
          role="group"
          aria-label={t("조직 필터", "Organization filter")}
        >
          <button
            type="button"
            className="chip"
            aria-pressed={org === "everyone"}
            onClick={() => setOrg("everyone")}
          >
            {t("전체", "All")}
          </button>
          {ORGANIZATIONS.filter(([id]) => id !== "all").map(([id, ko, en]) => (
            <button
              type="button"
              key={id}
              className="chip"
              aria-pressed={org === id}
              onClick={() => setOrg(id)}
            >
              {lang === "ko" ? ko : en}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          value={query}
          placeholder={t("일정 검색", "Search events")}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!data ? (
        <div className="skeleton" />
      ) : layout === "month" ? (
        <div className="ward-split">
          <MonthGrid
            year={year}
            month0={month0}
            events={items}
            selected={selected}
            onSelect={setSelected}
          />
          <section className="day-list" aria-live="polite">
            <h2>
              {new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
                month: "long",
                day: "numeric",
                weekday: "long",
                timeZone: "UTC",
              }).format(new Date(selected + "T00:00:00Z"))}
            </h2>
            {dayItems.length ? (
              dayItems.map((e) => <EventCard key={e.id} event={e} />)
            ) : (
              <p className="muted">
                {t("이날은 일정이 없습니다.", "No events on this day.")}
              </p>
            )}
          </section>
        </div>
      ) : items.length ? (
        <div className="event-list">
          {items.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <Empty title={t("이번 달 일정이 없습니다.", "No events this month.")} />
      )}
      <EventEditor
        open={editing}
        onOpenChange={setEditing}
        event={null}
        day={selected}
        managed={data?.managed || []}
        onSaved={load}
      />
    </div>
  );
}
