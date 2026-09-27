"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";
import { useApp } from "./provider";
import { Modal } from "./ui/dialog";
type Item = { id: string; content: { ko: string; en: string } };
const version = (item: Item) => item.id + ":" + JSON.stringify(item.content);
export function AnnouncementPopup() {
  const { boot, lang, t } = useApp();
  const path = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const storageKey = "ggc-announcements-seen:" + (boot?.actor.id || "guest");
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {
      setDismissed([]);
    }
  }, [storageKey]);
  useEffect(() => {
    if (!boot?.actor.nickname) return;
    let active = true;
    const refresh = () =>
      api<Item[]>("announcements")
        .then((data) => {
          if (active) setItems(data);
        })
        .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("ggc-announcements-updated", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ggc-announcements-updated", refresh);
    };
  }, [boot?.actor.id, boot?.actor.nickname]);
  const unread = items.filter((item) => !dismissed.includes(version(item)));
  const close = () => {
    const next = [...new Set([...dismissed, ...unread.map(version)])].slice(
      -200,
    );
    setDismissed(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Keep dismissed for this visit. */
    }
  };
  const managing =
    path.startsWith("/admin") ||
    path.startsWith("/teacher") ||
    path.startsWith("/lesson-builder") ||
    path.startsWith("/presentation");
  return (
    <Modal
      title={t("곡반정와드 새 소식", "News from Gokbanjeong Ward")}
      description={t(
        "함께 알아두면 좋은 공지입니다.",
        "Announcements for our learning community.",
      )}
      open={!managing && unread.length > 0}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div className="announcement-popup-list">
        {unread.map((item) => (
          <p className="preserve" key={item.id}>
            {item.content[lang] || item.content.ko}
          </p>
        ))}
      </div>
      <button className="button primary" onClick={close}>
        {t("확인했어요", "Got it")}
      </button>
      <small>
        {t(
          "확인한 공지는 이 기기에서 다시 열리지 않습니다. 홈에서 언제든 다시 읽을 수 있습니다.",
          "Read announcements stay dismissed on this device. You can read them again on the home page.",
        )}
      </small>
    </Modal>
  );
}
