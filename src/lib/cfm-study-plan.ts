import approved from "@/data/cfm-2026-week-43.json";
import week44 from "@/data/cfm-2026-week-44.json";
import week46 from "@/data/cfm-2026-week-46.json";
import week47 from "@/data/cfm-2026-week-47.json";
import week48 from "@/data/cfm-2026-week-48.json";
import type { UiLang } from "./i18n";
import { churchLangCode } from "./i18n";
import { verifiedEnglishSource } from "./study-source-editions";

export type StudyTrack = "adult" | "family";
export type StudyTask = {
  id: string;
  sourceId: string;
  kind: string;
  label: string;
  path: string;
  sourceLang: string;
  sourceLanguageLocked?: boolean;
  anchor: string;
  endAnchor: string;
  units: string[];
  sourceIds: string[];
  selectedIds: string[];
  noteLinks: { note: string; owner: string }[];
  readingNote?: string;
  printEdition?: { pages: string; ko: string; en: string };
  relatedTaskIds?: string[];
};
export type StudyDay = {
  day: number;
  restDay?: boolean;
  shortTitle: string;
  shortTitleEn?: string;
  familyTitle?: string;
  familyTitleEn?: string;
  question: string;
  familyQuestion: string;
  familyActivity: string;
  adultTasks: StudyTask[];
  familyTasks: StudyTask[];
};
export type StudyPlan = {
  version: number;
  week: number;
  dates: string;
  days: StudyDay[];
};
// Preserve the original export and task IDs for existing week 43 records.
export const cfmPlan: StudyPlan = approved;
const plans: Readonly<Record<number, StudyPlan>> = {
  43: cfmPlan,
  44: week44,
  46: week46,
  47: week47,
  48: week48,
};
export const getStudyPlan = (week: number): StudyPlan | undefined =>
  plans[week];
export const hasStudyPlan = (week: number) => !!getStudyPlan(week);
// A registered week may still be partly allocated. The basic course is the
// entry point; optional family materials do not determine day availability.
export function findStudyDay(plan: StudyPlan | undefined, day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 7) return undefined;
  const allocated = plan?.days.find((entry) => entry.day === day);
  return allocated?.adultTasks.length ? allocated : undefined;
}
export const getStudyDay = (week: number, day: number) =>
  findStudyDay(getStudyPlan(week), day);
export function isStudyRestDay(week: number, day: number) {
  return (
    getStudyPlan(week)?.days.some((d) => d.day === day && d.restDay) === true
  );
}
export function dailyStudyHref(
  week: number,
  day: number,
  track: StudyTrack = "adult",
) {
  const reader = getStudyDay(week, day) || isStudyRestDay(week, day);
  return `/week/${week}/day/${day}?${reader ? `track=${track}` : "view=notes"}`;
}
export function isStudyReaderPath(path: string) {
  const route = path.match(/^\/week\/(\d+)\/day\/([1-7])$/);
  if (!route) return false;
  const week = Number(route[1]);
  const day = Number(route[2]);
  return !!getStudyDay(week, day) || isStudyRestDay(week, day);
}
export const studyTasks = (
  day: number,
  track: StudyTrack,
  week = cfmPlan.week,
): StudyTask[] =>
  getStudyPlan(week)?.days.find((d) => d.day === day)?.[
    track === "adult" ? "adultTasks" : "familyTasks"
  ] || [];

export function studyThoughtAnchor(task: StudyTask) {
  return (
    task.selectedIds.find((id) => /^p\d+$/.test(id)) ||
    task.selectedIds[0] ||
    task.anchor ||
    "main"
  );
}

// Optional references navigate to a passage's existing allocation. They are
// not extra reading tasks and never contribute to the completion denominator.
export function studyRelatedTasks(task: StudyTask, week: number) {
  const wanted = [...new Set(task.relatedTaskIds || [])].filter(
    (id) => id !== task.id,
  );
  const plan = getStudyPlan(week);
  if (!plan) return [];
  const locations = plan.days.flatMap((day) =>
    (["adult", "family"] as const).flatMap((track) =>
      day[track === "adult" ? "adultTasks" : "familyTasks"].map((item) => ({
        day: day.day,
        track,
        task: item,
      })),
    ),
  );
  return wanted.flatMap((id) => {
    const target = locations.find((location) => location.task.id === id);
    if (!target) return [];
    const query = new URLSearchParams({
      track: target.track,
      source: target.task.path,
      anchor: target.task.anchor || "main",
    });
    return [{ ...target, href: `/week/${week}/day/${target.day}?${query}` }];
  });
}
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

export function studyDayTitle(day: StudyDay, week: number, english = false) {
  return english
    ? day.shortTitleEn ||
        (week === 43 ? dayTitles[day.day - 1] : day.shortTitle)
    : day.shortTitle;
}
export function studyFamilyTitle(day: StudyDay, week: number, english = false) {
  return english
    ? day.familyTitleEn ||
        (week === 43
          ? familyTitles[day.day - 1][1]
          : `Family activity · Day ${day.day}`)
    : day.familyTitle ||
        (week === 43
          ? familyTitles[day.day - 1][0]
          : `가족 활동 · ${day.day}일차`);
}

// Uses the Church reader's own paragraph selection (blue lines). No source text
// is copied or rewritten, and a start/end jump retains the entire selected range.
export function studySourceLanguage(task: StudyTask, uiLang: UiLang) {
  if (uiLang === "en" && verifiedEnglishSource(task)) return "eng";
  // A new allocation may have verified only one translation's paragraph IDs.
  if (task.sourceLanguageLocked) return task.sourceLang;
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

// Translation changes only the displayed source. Allocation IDs, saved reading
// positions, discussion anchors and completion requirements remain canonical.
export function studySourceEdition(task: StudyTask, uiLang: UiLang): StudyTask {
  const translation = uiLang === "en" ? verifiedEnglishSource(task) : undefined;
  return translation ? { ...task, ...translation, sourceLang: "eng" } : task;
}

export function studySourceUrl(
  task: StudyTask,
  uiLang: UiLang,
  end = false,
  week = Number(task.path.match(/old-testament-2026\/(\d+)$/)?.[1]) ||
    cfmPlan.week,
) {
  const lang = studySourceLanguage(task, uiLang);
  const edition = studySourceEdition(task, uiLang);
  let anchor = end
    ? edition.selectedIds.at(-1) || edition.endAnchor
    : edition.anchor;
  if (week === 43 && anchor === "p_qvIof")
    anchor =
      (
        {
          kor: "p_pLmhI",
          eng: "p_qvIof",
          spa: "p_xmfaa",
          tgl: "p_t7eEo",
        } as Record<string, string>
      )[lang] || anchor;
  const manual = /old-testament-2026\/\d+$/.test(edition.path);
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
  let hash = week === 43 && manual ? context[anchor] || anchor : anchor;
  if (
    week === 43 &&
    !manual &&
    /^p\d+$/.test(anchor) &&
    Number(anchor.slice(1)) > 1
  )
    hash = "p" + Math.max(1, Number(anchor.slice(1)) - 2);
  if (
    week === 43 &&
    edition.path.includes("/2018/06/hope-of-israel") &&
    ["p57", "p90"].includes(anchor)
  )
    hash = anchor === "p57" ? "p56" : "p89";
  const url = new URL("https://www.churchofjesuschrist.org" + edition.path);
  url.searchParams.set("lang", lang);
  if (edition.selectedIds.length)
    url.searchParams.set("id", edition.selectedIds.join(","));
  if (hash) url.hash = hash;
  return url.toString();
}

export function studySourceNoteUrl(
  task: StudyTask,
  note: { note: string; owner: string },
  uiLang: UiLang,
  week?: number,
) {
  const edition = studySourceEdition(task, uiLang);
  const url = new URL(studySourceUrl(task, uiLang, false, week));
  if (
    edition.noteLinks.some(
      (item) => item.note === note.note && item.owner === note.owner,
    )
  ) {
    url.searchParams.set("id", note.owner);
    url.hash = note.owner;
  }
  return url.toString();
}

export function materialPercent(
  day: number,
  track: StudyTrack,
  completed: readonly string[],
  week = cfmPlan.week,
) {
  const ids = studyTasks(day, track, week).map((t) => t.id);
  const count = ids.filter((id) => completed.includes(id)).length;
  return {
    count,
    total: ids.length,
    percent: ids.length ? Math.round((100 * count) / ids.length) : 0,
  };
}
