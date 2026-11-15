import type { StudyTask } from "./cfm-study-plan";
import week44 from "@/data/cfm-2026-week-44-english.json";
import week46 from "@/data/cfm-2026-week-46-english.json";
import week47 from "@/data/cfm-2026-week-47-english.json";

type OriginalRange = Pick<
  StudyTask,
  "path" | "sourceLang" | "anchor" | "endAnchor" | "selectedIds"
>;

/** A verified translation of an existing task, not a second completion task. */
export type EnglishStudyEdition = {
  original: OriginalRange;
  path: string;
  anchor: string;
  endAnchor: string;
  selectedIds: string[];
  noteLinks: { note: string; owner: string }[];
  label?: string;
  readingNote?: string;
};

const englishEditions: Readonly<Record<string, EnglishStudyEdition>> = {
  ...week44.tasks,
  ...week46.tasks,
  ...week47.tasks,
};

export function verifiedEnglishSource(
  task: Pick<StudyTask, "id"> & OriginalRange,
  edition: EnglishStudyEdition | undefined = englishEditions[task.id],
) {
  if (!edition) return undefined;
  const original = edition.original;
  // A future reallocation must be audited again. Reusing a task ID alone must
  // not silently open a translation of the old reading range.
  if (
    original.path !== task.path ||
    original.sourceLang !== task.sourceLang ||
    original.anchor !== task.anchor ||
    original.endAnchor !== task.endAnchor ||
    original.selectedIds.length !== task.selectedIds.length ||
    original.selectedIds.some(
      (anchor, index) => anchor !== task.selectedIds[index],
    )
  )
    return undefined;
  return edition;
}
