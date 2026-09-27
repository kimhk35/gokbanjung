import type { UiLang } from "./i18n";
// A saved choice wins. Otherwise the device's preferred languages decide:
// the first Korean, English, Spanish or Filipino/Tagalog entry; any other
// language gets English; no information gets Korean.
export function initialLang(
  saved: string | null,
  preferred: readonly string[],
): UiLang {
  if (saved === "ko" || saved === "en" || saved === "es" || saved === "fil")
    return saved;
  if (!preferred.length) return "ko";
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "ko" || base === "en" || base === "es") return base;
    if (base === "fil" || base === "tl") return "fil";
  }
  return "en";
}
