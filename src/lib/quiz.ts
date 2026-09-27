import { z } from "zod";
import {
  curriculum,
  currentWeek,
  localDate,
  dayIndex,
  reading,
  referenceChapters,
} from "./curriculum";
import { parseScripture, findBook } from "./scriptures";
export const quizKind = z.enum(["daily", "weekly", "monthly"]);
export type QuizKind = z.infer<typeof quizKind>;
export const quizCounts = { daily: 3, weekly: 10, monthly: 20 } as const;
export const quizPoints = { daily: 10, weekly: 40, monthly: 100 } as const;
export function quizScope(kind: QuizKind, date = localDate()) {
  const w = currentWeek(date);
  if (!w) throw new Error("quiz_expired");
  const month = date.slice(0, 7);
  const weeks =
    kind === "monthly"
      ? curriculum.filter((v) => v.start <= date && v.end >= month + "-01")
      : [w];
  const references = weeks.flatMap((v) =>
    kind === "daily"
      ? reading(v, dayIndex(v, date), "en").split("; ")
      : referenceChapters(v),
  );
  const refs = references.flatMap((text) => {
    const parsed = parseScripture(text);
    if (parsed) return [parsed];
    const book = findBook(text);
    if (book)
      return Array.from({ length: book.chapters }, (_, i) => ({
        book,
        chapter: i + 1,
        verse: undefined,
        endVerse: undefined,
      }));
    // Special manual units have no sequential Old Testament chapter range.
    const special: Record<string, string> = {
      "Introduction to the Old Testament": "Moses 1",
      Easter: "Matthew 28",
      Christmas: "Luke 2",
    };
    const ref = special[text] && parseScripture(special[text]);
    return ref ? [ref] : [];
  });
  const chapters = [
    ...new Map(
      refs.map((r) => [
        r.book.id + "/" + r.chapter,
        { bookId: r.book.id, chapter: r.chapter },
      ]),
    ).values(),
  ];
  return {
    kind,
    period: kind === "daily" ? date : kind === "weekly" ? w.start : month,
    count: quizCounts[kind],
    week: w.number,
    day: dayIndex(w, date),
    references,
    chapters,
  };
}
export const questionSchema = z.object({
  question: z.string().trim().min(8).max(500),
  options: z.array(z.string().trim().min(1).max(240)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(8).max(700),
  hint: z.string().max(240),
  sourceIndex: z.number().int().min(0),
  verse: z.number().int().min(1).max(176),
});
export type QuizQuestion = z.infer<typeof questionSchema> & {
  sourceUrl: string;
  reference: string;
};
export function gradeQuiz(
  questions: Pick<QuizQuestion, "answer">[],
  answers: number[],
) {
  if (
    questions.length !== answers.length ||
    ![3, 10, 20].includes(questions.length) ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
  )
    throw new Error("invalid_input");
  const correct = questions.reduce(
    (n, q, i) => n + Number(q.answer === answers[i]),
    0,
  );
  return {
    correct,
    total: questions.length,
    percent: Math.round((correct / questions.length) * 100),
    passed: correct * 5 >= questions.length * 4,
  };
}
export function extractVerses(html: string) {
  const out: { verse: number; text: string }[] = [];
  for (const m of html.matchAll(
    /<p\b[^>]*\bid=["']p(\d+)["'][^>]*>([\s\S]*?)<\/p>/g,
  )) {
    const text = m[2]
      .replace(/<sup\b[\s\S]*?<\/sup>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 5) out.push({ verse: Number(m[1]), text });
  }
  return [...new Map(out.map((v) => [v.verse, v])).values()];
}
