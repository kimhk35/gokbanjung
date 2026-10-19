import approved from "@/data/cfm-2026-week-43.json";
import type { UiLang } from "./i18n";
import { churchLangCode } from "./i18n";

export type StudyTrack = "adult" | "family";
export type StudyTask = {
  id: string;
  sourceId: string;
  kind: string;
  label: string;
  path: string;
  sourceLang: string;
  anchor: string;
  endAnchor: string;
  units: string[];
  sourceIds: string[];
  selectedIds: string[];
  noteLinks: { note: string; owner: string }[];
};
export type StudyDay = {
  day: number;
  shortTitle: string;
  question: string;
  familyQuestion: string;
  familyActivity: string;
  adultTasks: StudyTask[];
  familyTasks: StudyTask[];
};
export const cfmPlan = approved as typeof approved & { days: StudyDay[] };
export const hasStudyPlan = (week: number) => week === cfmPlan.week;
export const studyTasks = (day: number, track: StudyTrack): StudyTask[] =>
  cfmPlan.days.find((d) => d.day === day)?.[
    track === "adult" ? "adultTasks" : "familyTasks"
  ] || [];
export const dayTitles = [
  "A prophet’s calling",
  "Known by God",
  "Living our identity",
  "Living water",
  "Sincere worship",
  "Gathering Israel",
  "The Lord’s guidance",
];
export const familyTitles = [
  ["선지자 사진", "Prophet pictures"],
  ["아기 사진·노래", "Baby pictures · song"],
  ["전세 찾기", "Premortal life"],
  ["생수 실물 공과", "Living water activity"],
  ["선지자의 역할", "Prophets’ work"],
  ["집합 놀이·영상", "Gathering · video"],
  ["진흙 빚기", "Shaping clay"],
];

// Uses the Church reader's own paragraph selection (blue lines). No source text
// is copied or rewritten, and a start/end jump retains the entire selected range.
export function studySourceLanguage(task: StudyTask, uiLang: UiLang) {
  // Generated paragraph IDs differ by translation. Do not point an English
  // reader at Korean random IDs and pretend the blue range is still verified.
  if (task.sourceLang === "eng") return "eng";
  if (
    task.selectedIds.some((id) => /^p_[A-Za-z]/.test(id)) ||
    /^p_[A-Za-z]/.test(task.anchor)
  )
    return task.sourceLang;
  return churchLangCode(uiLang);
}
export function studySourceUrl(task: StudyTask, uiLang: UiLang, end = false) {
  const lang = studySourceLanguage(task, uiLang);
  let anchor = end ? task.selectedIds.at(-1) || task.endAnchor : task.anchor;
  if (anchor === "p_qvIof")
    anchor =
      (
        {
          kor: "p_pLmhI",
          eng: "p_qvIof",
          spa: "p_xmfaa",
          tgl: "p_t7eEo",
        } as Record<string, string>
      )[lang] || anchor;
  const manual = task.path.endsWith("old-testament-2026/43");
  const context: Record<string, string> = {
    sec2: "scripture_title1",
    sec3: "scripture_title2",
    sec5: "scripture_title4",
    sec7: "scripture_title5",
    sec8: "scripture_title6",
    sec9: "scripture_title7",
    sec10: "scripture_title8",
    figure1_p1: "figure1",
    figure2_p1: "figure2",
    figure6_figure1_p1: "figure6_figure1",
    figure8: "figure8",
    figure9: "figure9",
    p6: "p5",
    p16: "p15",
    p21: "p20",
    p23: "p22",
    p10: "p9",
    figure3_p1: "p16",
    scripture_title2: "scripture_title2",
    scripture_title4: "scripture_title4",
  };
  let hash = manual ? context[anchor] || anchor : anchor;
  if (!manual && /^p\d+$/.test(anchor) && Number(anchor.slice(1)) > 1)
    hash = "p" + Math.max(1, Number(anchor.slice(1)) - 2);
  if (
    task.path.includes("/2018/06/hope-of-israel") &&
    ["p57", "p90"].includes(anchor)
  )
    hash = anchor === "p57" ? "p56" : "p89";
  const url = new URL("https://www.churchofjesuschrist.org" + task.path);
  url.searchParams.set("lang", lang);
  if (task.selectedIds.length)
    url.searchParams.set("id", task.selectedIds.join(","));
  if (hash) url.hash = hash;
  return url.toString();
}

export function materialPercent(
  day: number,
  track: StudyTrack,
  completed: readonly string[],
) {
  const ids = studyTasks(day, track).map((t) => t.id);
  const count = ids.filter((id) => completed.includes(id)).length;
  return {
    count,
    total: ids.length,
    percent: ids.length ? Math.round((100 * count) / ids.length) : 0,
  };
}
