// Credits, feedback contact, copyright and the build ("last updated") date,
// shown in the site footer, the guide and the manuals.
import type { Localized } from "./types";

export function kstDate(now: Date) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
export const SITE_INFO = {
  creators: {
    ko: "김홍겸 형제 · 박녹형 형제",
    en: "Brother Honggyeom Kim · Brother Nokhyeong Park",
  } satisfies Localized,
  feedbackEmail: "kimhk35@ajou.ac.kr",
  copyright: {
    ko: "본 사이트의 모든 자료(경전·교재·그림 등)의 저작권은 예수 그리스도 후기 성도 교회(The Church of Jesus Christ of Latter-day Saints)에 있습니다.",
    en: "All materials on this site (scriptures, manuals, images and more) are © The Church of Jesus Christ of Latter-day Saints.",
  } satisfies Localized,
  // Set at build time in next.config.ts; "" when running tests or scripts.
  updated: process.env.NEXT_PUBLIC_BUILD_DATE || "",
};
