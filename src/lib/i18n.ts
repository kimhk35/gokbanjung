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
export type Vars = Record<string, string | number>;
// Sentences with changing parts use named blanks: t("문항 {n}개", "{n} items",
// { n }). The pattern is the dictionary key; blanks are filled afterwards in
// one pass, so a value containing braces is never filled again.
export function translate(
  ui: UiLang,
  ko: string,
  en: string,
  dicts: Dicts = DICTS,
  vars?: Vars,
) {
  const text = ui === "ko" ? ko : ui === "en" ? en : dicts[ui][ko] || en;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (blank, name: string) =>
    name in vars ? String(vars[name]) : blank,
  );
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
