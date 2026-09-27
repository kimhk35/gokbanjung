"use client";
import { useEffect, useState } from "react";
import { localDate } from "@/lib/curriculum";

// Avoid embedding a stale build date in the statically rendered home page.
// Also refresh across Korean midnight and after returning to an open tab.
export function useStudyDate() {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setDate(localDate());
    update();
    const timer = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return date;
}
