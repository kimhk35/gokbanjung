// Posts without a name are stored as "익명" (comefollowme's convention, also in
// existing data). Show that one stored word in the reader's language.
export const ANONYMOUS = "익명";

export function authorLabel(
  name: string,
  t: (ko: string, en: string) => string,
) {
  return name === ANONYMOUS ? t("익명", "Anonymous") : name;
}
