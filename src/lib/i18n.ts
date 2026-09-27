// Four UI languages. Existing code calls t(ko, en); for es/fil the Korean
// source string is the dictionary key and English is the fallback, so a
// changed or new sentence never shows Korean or a blank to those readers.
import es from "@/i18n/es.json";
import fil from "@/i18n/fil.json";
import type { Lang } from "./types";

export type UiLang = "ko" | "en" | "es" | "fil";
export const UI_LANGS: { id: UiLang; label: string; short: string }[] = [
  { id: "ko", label: "한국어", short: "한국어" },
  { id: "en", label: "English", short: "EN" },
  { id: "es", label: "Español", short: "ES" },
  { id: "fil", label: "Filipino", short: "FIL" },
];
type Dicts = { es: Record<string, string>; fil: Record<string, string> };
export const DICTS: Dicts = { es, fil };

export function isUiLang(value: unknown): value is UiLang {
  return value === "ko" || value === "en" || value === "es" || value === "fil";
}
export function translate(ui: UiLang, ko: string, en: string, dicts: Dicts = DICTS) {
  if (ui === "ko") return ko;
  if (ui === "en") return en;
  return dicts[ui][ko] || en;
}
// Language used for server requests and ko/en-only data.
export function baseLang(ui: UiLang): Lang {
  return ui === "ko" ? "ko" : "en";
}
export function localeOf(ui: UiLang) {
  return { ko: "ko-KR", en: "en-US", es: "es-ES", fil: "fil-PH" }[ui];
}
export function churchLangCode(ui: UiLang | Lang) {
  return { ko: "kor", en: "eng", es: "spa", fil: "tgl" }[ui];
}
