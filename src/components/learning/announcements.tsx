"use client";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "../provider";
type Announcement = { id: string; content: { ko: string; en: string } };
export function Announcements() {
  const { lang, t, boot } = useApp();
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => {
    let active = true;
    api<Announcement[]>("announcements")
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [boot?.actor.id]);
  if (!items.length) return null;
  return (
    <section
      className="panel announcement-board"
      aria-label={t("와드 소식", "Ward announcements")}
    >
      <h2>
        <Megaphone size={22} /> {t("함께 알아두어요", "News for our class")}
      </h2>
      {items.slice(0, 5).map((item) => (
        <p className="preserve" key={item.id}>
          {item.content[lang] || item.content.ko || item.content.en}
        </p>
      ))}
    </section>
  );
}
