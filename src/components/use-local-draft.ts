"use client";
import { useCallback, useEffect, useRef, useState } from "react";
// Device-only drafts for replies/comments (comefollowme behaviour): saved
// 800 ms after typing stops and on page hide; never sent to the server.
export function useLocalDraft<T extends Record<string, string>>(
  key: string | null,
  empty: T,
) {
  const storageKey = key ? "ggc_local_draft:" + key : null;
  const [value, setValue] = useState<T>(empty);
  const [saved, setSaved] = useState(false);
  const [typing, setTyping] = useState(false);
  const latest = useRef(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emptyRef = useRef(empty);
  useEffect(() => {
    if (!storageKey) return;
    let next = emptyRef.current;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) next = { ...emptyRef.current, ...JSON.parse(raw) };
    } catch {}
    latest.current = next;
    dirty.current = false;
    setValue(next);
    setSaved(false);
  }, [storageKey]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    setTyping(false);
    if (!storageKey || !dirty.current) return;
    dirty.current = false;
    try {
      const v = latest.current;
      if (Object.values(v).some((x) => x.trim()))
        localStorage.setItem(storageKey, JSON.stringify(v));
      else localStorage.removeItem(storageKey);
      setSaved(true);
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);
  const setField = (field: keyof T, text: string) => {
    const next = { ...latest.current, [field]: text } as T;
    latest.current = next;
    setValue(next);
    dirty.current = true;
    setSaved(false);
    setTyping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };
  const clear = () => {
    clearTimeout(timer.current);
    dirty.current = false;
    setTyping(false);
    if (storageKey)
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    latest.current = emptyRef.current;
    setValue(emptyRef.current);
    setSaved(false);
  };
  return { value, setField, clear, saved, typing };
}
