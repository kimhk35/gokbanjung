"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "./provider";
export function useDraft(
  key: string,
  endpoint: string,
  metadata: Record<string, unknown>,
  initial?: Record<string, string>,
) {
  const { boot, t } = useApp();
  const [value, setValue] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(false);
  const latest = useRef(value);
  const seq = useRef(0);
  const fullKey = `ggc_draft:${boot?.actor.id || "pending"}:${key}`;
  useEffect(() => {
    if (!boot) return;
    setLoaded(false);
    const raw = localStorage.getItem(fullKey);
    dirty.current = Boolean(raw);
    try {
      setValue(raw ? JSON.parse(raw) : initial || {});
    } catch {
      setValue(initial || {});
    }
    setLoaded(true);
  }, [fullKey, boot?.actor.id]);
  useEffect(() => {
    if (!loaded || dirty.current || !initial) return;
    if (!localStorage.getItem(fullKey)) setValue(initial);
  }, [initial, loaded, fullKey]);
  latest.current = value;
  const change = (field: string, text: string) => {
    seq.current++;
    dirty.current = true;
    setValue((prev) => {
      const next = { ...prev, [field]: text };
      localStorage.setItem(fullKey, JSON.stringify(next));
      return next;
    });
  };
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    const current = ++seq.current;
    const save = async () => {
      setStatus(t("저장 중…", "Saving…"));
      try {
        await api(endpoint, {
          ...metadata,
          [endpoint === "reflection" ? "content" : "answers"]: latest.current,
        });
        if (current === seq.current) {
          setStatus(t("저장되었습니다.", "Saved."));
          localStorage.removeItem(fullKey);
          dirty.current = false;
        }
      } catch {
        setStatus(
          t(
            "이 기기에 임시 저장 · 연결되면 다시 저장합니다.",
            "Saved on this device · Will sync when connected.",
          ),
        );
      }
    };
    const timer = setTimeout(save, 1000);
    const onOnline = () => void save();
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [value, loaded, endpoint, fullKey, t]);
  return { value, change, status, loaded };
}
