"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Share2, ArrowLeft } from "lucide-react";
import { useApp } from "../provider";
import { Empty } from "../learning/learn";
import { Confirm } from "../ui/dialog";
import { api, RequestError } from "@/lib/client";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import { EventCard } from "./event-parts";
import { EventEditor } from "./event-editor";
import { dayKey } from "@/lib/ward-model";

export async function share(
  title: string,
  t: (ko: string, en: string) => string,
  notify: (m: string) => void,
) {
  const url = location.href;
  try {
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      notify(t("링크를 복사했습니다.", "Link copied."));
    }
  } catch {}
}
export function EventDetail({ slug }: { slug: string }) {
  const { t, boot, error, notify } = useApp();
  const router = useRouter();
  const [event, setEvent] = useState<WardEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [managed, setManaged] = useState<string[]>([]);
  const load = useCallback(() => {
    api<WardEvent>(`ward/event?slug=${slug}`)
      .then(setEvent)
      .catch((e) =>
        e instanceof RequestError && e.code === "not_found"
          ? setMissing(true)
          : error(e),
      );
  }, [slug, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useEffect(() => {
    if (event?.can_edit)
      api<{ managed: string[] }>(
        `ward/events?from=${encodeURIComponent(event.starts_at)}&to=${encodeURIComponent(event.ends_at)}`,
      )
        .then((d) => setManaged(d.managed))
        .catch(() => {});
  }, [event]);
  const status = async (next: WardEvent["status"]) => {
    try {
      setEvent(
        await api<WardEvent>("ward/status", { id: event!.id, status: next }),
      );
    } catch (e) {
      error(e);
    }
  };
  const remove = async () => {
    try {
      await api("ward/delete", { id: event!.id });
      router.push("/ward");
    } catch (e) {
      error(e);
    }
  };
  if (missing)
    return (
      <div className="page">
        <Empty
          title={t("일정을 찾을 수 없습니다.", "Event not found.")}
          body={t(
            "삭제되었거나 아직 공개되지 않았습니다.",
            "It was removed or is not published yet.",
          )}
        />
      </div>
    );
  if (!event)
    return (
      <div className="page">
        <div className="skeleton" />
      </div>
    );
  const poster = posterUrl(event.poster_path);
  return (
    <div className="page event-detail">
      <Link className="text-button back-link" href="/ward">
        <ArrowLeft size={18} /> {t("와드 일정", "Ward calendar")}
      </Link>
      {poster && (
        <img
          className="event-poster"
          src={poster}
          alt={t("일정 포스터", "Event poster")}
        />
      )}
      <EventCard event={{ ...event, slug: "" }} preview />
      {event.description && (
        <p className="preserve event-description">{event.description}</p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => share(event.title, t, notify)}
        >
          <Share2 size={18} /> {t("공유", "Share")}
        </button>
      </div>
      {event.can_edit && (
        <div className="manager-bar">
          <button
            type="button"
            className="button secondary"
            onClick={() => setEditing(true)}
          >
            {t("수정", "Edit")}
          </button>
          {event.status !== "published" && (
            <button
              type="button"
              className="button"
              onClick={() => status("published")}
            >
              {t("게시하기", "Publish")}
            </button>
          )}
          {event.status === "published" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => status("draft")}
            >
              {t("비공개로 되돌리기", "Unpublish")}
            </button>
          )}
          {event.status !== "cancelled" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => status("cancelled")}
            >
              {t("일정 취소", "Cancel event")}
            </button>
          )}
          <Confirm
            trigger={
              <button type="button" className="button danger">
                {t("삭제", "Delete")}
              </button>
            }
            title={t("이 일정을 삭제할까요?", "Delete this event?")}
            description={t(
              "삭제하면 되돌릴 수 없습니다.",
              "This cannot be undone.",
            )}
            onConfirm={remove}
          />
        </div>
      )}
      <EventEditor
        open={editing}
        onOpenChange={setEditing}
        event={event}
        day={dayKey(event.starts_at)}
        managed={managed}
        onSaved={(e) => setEvent(e)}
      />
    </div>
  );
}
