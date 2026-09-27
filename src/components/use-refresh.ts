"use client";
import { useEffect, useRef } from "react";
// Background refresh every `ms`, and when the window regains focus.
// Skipped while `paused` (e.g. the user is typing) or the tab is hidden.
export function useRefresh(fn: () => void, ms: number, paused: boolean) {
  const run = useRef(fn);
  const hold = useRef(paused);
  useEffect(() => {
    run.current = fn;
    hold.current = paused;
  });
  useEffect(() => {
    const tick = () => {
      if (!hold.current && document.visibilityState === "visible")
        run.current();
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [ms]);
}
