import type { Lang } from "./types";
// A saved choice wins. Otherwise the device's preferred languages decide:
// the first Korean or English entry, and any other language gets English.
export function initialLang(
  saved: string | null,
  preferred: readonly string[],
): Lang {
  if (saved === "ko" || saved === "en") return saved;
  if (!preferred.length) return "ko";
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "ko" || base === "en") return base;
  }
  return "en";
}
